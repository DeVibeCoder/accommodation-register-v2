import { allowMethods, formatOccupantForClient, json, readBody, requireRole, supabaseRequest, toOccupancyRow, toStayHistoryRow } from '../_lib/supabase.js';

function isActiveStatus(value) {
  return String(value || 'Active').trim().toLowerCase() === 'active';
}

function keyFor(row = {}) {
  return `${row.room_id || ''}::${row.bed_no ?? ''}`;
}

const MEAL_REASONS = new Set(['Off Site', 'Vacation', 'Restaurant', 'Resignation/Termination']);

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeMealReason(value = '') {
  const input = String(value || '').trim().toLowerCase();
  if (input === 'off site' || input === 'offsite') return 'Off Site';
  if (input === 'vacation' || input === 'leave') return 'Vacation';
  if (input === 'restaurant') return 'Restaurant';
  if (input === 'resignation' || input === 'termination' || input === 'resignation/termination') return 'Resignation/Termination';
  return '';
}

function classifyMealExclusion(row = {}, today = todayIsoDate()) {
  const fromDate = String(row?.from_date || '').slice(0, 10);
  const toDate = String(row?.to_date || '').slice(0, 10);
  const reason = normalizeMealReason(row?.reason);
  const autoCheckedOut = Boolean(row?.auto_checked_out_at);

  if (!fromDate || !reason) return 'invalid';
  if (reason === 'Resignation/Termination' && autoCheckedOut) return 'completed';
  if (toDate && toDate < today) return 'completed';
  if (fromDate > today) return 'upcoming';
  return 'active';
}

function formatMealExclusionForClient(row = {}, today = todayIsoDate()) {
  const status = classifyMealExclusion(row, today);
  return {
    id: row.id,
    occupantId: row.occupant_id || null,
    name: row.occupant_name || '',
    staffId: row.staff_id || '',
    roomId: row.room_id || '',
    bedNo: row.bed_no ?? null,
    reason: normalizeMealReason(row.reason) || row.reason || '',
    fromDate: row.from_date || null,
    toDate: row.to_date || null,
    notes: row.notes || '',
    status,
    autoCheckedOutAt: row.auto_checked_out_at || null,
    createdAt: row.created_at || null,
  };
}

async function fetchMealExclusionRows() {
  const rows = await supabaseRequest('/rest/v1/meal_exclusions?select=*&order=from_date.desc&order=created_at.desc&limit=5000', {
    service: true,
  });
  return Array.isArray(rows) ? rows : [];
}

async function runMealExclusionAutomations(user = {}) {
  const today = todayIsoDate();

  const dueResignations = await supabaseRequest(
    `/rest/v1/meal_exclusions?select=*&reason=eq.${encodeURIComponent('Resignation/Termination')}&auto_checked_out_at=is.null&from_date=lte.${encodeURIComponent(today)}&limit=500`,
    { service: true }
  );

  for (const item of (Array.isArray(dueResignations) ? dueResignations : [])) {
    let targetFilter = '';
    if (item.occupant_id) {
      targetFilter = `id=eq.${encodeURIComponent(item.occupant_id)}`;
    } else if (item.room_id && item.bed_no != null) {
      targetFilter = `room_id=eq.${encodeURIComponent(item.room_id)}&bed_no=eq.${encodeURIComponent(item.bed_no)}&status=eq.Active`;
    }

    if (targetFilter) {
      const removed = await supabaseRequest(`/rest/v1/occupancy?${targetFilter}`, {
        method: 'DELETE',
        service: true,
        prefer: 'return=representation',
      });

      if (Array.isArray(removed) && removed[0]) {
        await supabaseRequest('/rest/v1/stay_history', {
          method: 'POST',
          service: true,
          body: [{
            ...toStayHistoryRow({
              type: 'Check Out',
              name: removed[0].full_name || item.occupant_name || 'Unknown',
              roomId: removed[0].room_id || item.room_id || '',
              bedNo: removed[0].bed_no ?? item.bed_no ?? null,
              details: 'Auto checkout completed from Meal Exclusion (Resignation/Termination).',
              user: user?.role || null,
            }),
            created_by: user?.id || null,
          }],
          prefer: 'return=minimal',
        });
      }
    }

    await supabaseRequest(`/rest/v1/meal_exclusions?id=eq.${encodeURIComponent(item.id)}`, {
      method: 'PATCH',
      service: true,
      body: {
        auto_checked_out_at: new Date().toISOString(),
      },
      prefer: 'return=minimal',
    });
  }
}

function splitMealExclusions(rows = []) {
  const today = todayIsoDate();
  const active = [];
  const upcoming = [];
  const history = [];

  for (const row of rows) {
    const item = formatMealExclusionForClient(row, today);
    if (item.status === 'active') active.push(item);
    else if (item.status === 'upcoming') upcoming.push(item);
    else if (item.status === 'completed') history.push(item);
  }

  return { active, upcoming, history };
}

function toInt(value) {
  const parsed = Number.parseInt(String(value ?? '').replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function uniqueFilters(filters = []) {
  const seen = new Set();
  const list = [];
  for (const filter of filters) {
    const value = String(filter || '').trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    list.push(value);
  }
  return list;
}

function buildRecordFilters(source = {}) {
  const filters = [];
  if (source.id) {
    filters.push(`id=eq.${encodeURIComponent(source.id)}`);
  }
  if (source.roomId && source.bedNo != null) {
    filters.push(`room_id=eq.${encodeURIComponent(source.roomId)}&bed_no=eq.${encodeURIComponent(source.bedNo)}`);
  }
  if (source.roomId && source.staffId) {
    filters.push(`room_id=eq.${encodeURIComponent(source.roomId)}&staff_id=eq.${encodeURIComponent(source.staffId)}`);
  }
  if (source.roomId && source.name) {
    filters.push(`room_id=eq.${encodeURIComponent(source.roomId)}&full_name=eq.${encodeURIComponent(source.name)}`);
  }
  if (source.roomId) {
    filters.push(`room_id=eq.${encodeURIComponent(source.roomId)}`);
  }
  return filters;
}

async function resolveTargetFilter(payload = {}) {
  const match = payload.match || payload.__match || {};
  const filters = uniqueFilters([
    ...buildRecordFilters(match),
    ...buildRecordFilters(payload),
  ]);

  for (const filter of filters) {
    const rows = await supabaseRequest(`/rest/v1/occupancy?select=*&${filter}&limit=1`, {
      service: true,
    });
    if (Array.isArray(rows) && rows.length > 0) {
      return { filter, row: rows[0] };
    }
  }

  // Legacy fallback: room-based scoring by bed/name/staff
  const roomId = payload.roomId || match.roomId;
  if (!roomId) return { filter: '', row: null };

  const bedNo = toInt(payload.bedNo ?? match.bedNo);
  const name = String(payload.name || match.name || '').trim().toLowerCase();
  const staffId = String(payload.staffId || match.staffId || '').trim().toLowerCase();

  const rows = await supabaseRequest(`/rest/v1/occupancy?select=*&room_id=eq.${encodeURIComponent(roomId)}&limit=100`, {
    service: true,
  });

  if (!Array.isArray(rows) || rows.length === 0) {
    return { filter: '', row: null };
  }

  const scored = rows.map(row => {
    let score = 0;
    if (bedNo != null && toInt(row.bed_no) === bedNo) score += 4;
    if (name && String(row.full_name || '').trim().toLowerCase() === name) score += 3;
    if (staffId && String(row.staff_id || '').trim().toLowerCase() === staffId) score += 3;
    return { row, score };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best || best.score <= 0) return { filter: '', row: null };

  const fallbackFilter = best.row?.id
    ? `id=eq.${encodeURIComponent(best.row.id)}`
    : `room_id=eq.${encodeURIComponent(best.row.room_id)}&bed_no=eq.${encodeURIComponent(best.row.bed_no)}`;

  return { filter: fallbackFilter, row: best.row };
}

async function findActiveConflict(row = {}, excludeId = null) {
  if (!row?.room_id || row?.bed_no == null || !isActiveStatus(row.status)) {
    return null;
  }

  const rows = await supabaseRequest(
    `/rest/v1/occupancy?select=*&status=eq.Active&room_id=eq.${encodeURIComponent(row.room_id)}&bed_no=eq.${encodeURIComponent(row.bed_no)}&limit=10`,
    { service: true }
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  return rows.find(item => String(item?.id || '') !== String(excludeId || '')) || null;
}

async function writeHistoryIfProvided(payload = {}, user = {}) {
  const history = payload?.__history;
  if (!history || typeof history !== 'object') return;

  await supabaseRequest('/rest/v1/stay_history', {
    method: 'POST',
    service: true,
    body: [{
      ...toStayHistoryRow({ ...history, user: user?.role || null }),
      created_by: user?.id || null,
    }],
    prefer: 'return=minimal',
  });
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET', 'POST', 'DELETE'])) return;

  try {
    if (req.method === 'GET') {
      const user = await requireRole(req, res, []);
      if (!user) return;

      const mode = String(req.query?.mode || '').trim().toLowerCase();
      if (mode === 'meal-exclusions' || mode === 'meal-history') {
        await runMealExclusionAutomations(user);
        const rows = await fetchMealExclusionRows();
        const grouped = splitMealExclusions(rows);
        res.setHeader('Cache-Control', 'no-store');

        if (mode === 'meal-history') {
          return json(res, 200, { history: grouped.history });
        }

        return json(res, 200, {
          active: grouped.active,
          upcoming: grouped.upcoming,
          mealExcludedCount: grouped.active.length,
        });
      }

      if (mode === 'health') {
        const [activeRows, allRows, historyRows] = await Promise.all([
          supabaseRequest('/rest/v1/occupancy?select=room_id,bed_no,full_name,status&status=eq.Active&limit=5000', { service: true }),
          supabaseRequest('/rest/v1/occupancy?select=room_id,bed_no,full_name,status&limit=5000', { service: true }),
          supabaseRequest('/rest/v1/stay_history?select=id&limit=500', { service: true }),
        ]);

        const active = Array.isArray(activeRows) ? activeRows : [];
        const all = Array.isArray(allRows) ? allRows : [];
        const history = Array.isArray(historyRows) ? historyRows : [];

        const duplicateMap = new Map();
        for (const row of active) {
          const key = keyFor(row);
          duplicateMap.set(key, [...(duplicateMap.get(key) || []), row.full_name || 'Unknown']);
        }

        const duplicateActiveBeds = [...duplicateMap.entries()]
          .filter(([, names]) => names.length > 1)
          .map(([key, names]) => ({ key, occupants: names }));

        return json(res, 200, {
          ok: duplicateActiveBeds.length === 0,
          activeOccupants: active.length,
          totalRows: all.length,
          stayHistoryEntries: history.length,
          duplicateActiveBeds,
          checkedAt: new Date().toISOString(),
        });
      }

      const rows = await supabaseRequest('/rest/v1/occupancy?select=*&status=eq.Active&order=room_id.asc&order=bed_no.asc', {
        service: true,
      });

      const occupants = Array.isArray(rows) ? rows.map(formatOccupantForClient) : [];
      res.setHeader('Cache-Control', 'no-store');
      return json(res, 200, { occupants });
    }

    if (req.method === 'DELETE') {
      const user = await requireRole(req, res, ['Admin']);
      if (!user) return;

      await supabaseRequest('/rest/v1/occupancy?room_id=not.is.null', {
        method: 'DELETE',
        service: true,
        prefer: 'return=minimal',
      });

      await supabaseRequest('/rest/v1/stay_history?action=not.is.null', {
        method: 'DELETE',
        service: true,
        prefer: 'return=minimal',
      });

      return json(res, 200, { success: true });
    }

    const user = await requireRole(req, res, ['Admin', 'Accommodation']);
    if (!user) return;

    const payload = await readBody(req);

    if (payload?.__operation === 'meal-exclusion-add') {
      const reason = normalizeMealReason(payload.reason);
      const fromDate = String(payload.fromDate || '').slice(0, 10);
      const toDate = payload.toDate ? String(payload.toDate).slice(0, 10) : null;

      if (!reason || !MEAL_REASONS.has(reason) || !fromDate) {
        return json(res, 400, { error: 'Reason and from date are required for meal exclusion.' });
      }

      const today = todayIsoDate();
      const inserted = await supabaseRequest('/rest/v1/meal_exclusions', {
        method: 'POST',
        service: true,
        body: [{
          occupant_id: payload.occupantId || null,
          occupant_name: payload.name || null,
          staff_id: payload.staffId || null,
          room_id: payload.roomId || null,
          bed_no: payload.bedNo ?? null,
          reason,
          from_date: fromDate,
          to_date: toDate,
          notes: payload.notes || null,
          created_by: user?.id || null,
          auto_checked_out_at: null,
        }],
        prefer: 'return=representation',
      });

      if (reason === 'Resignation/Termination' && fromDate <= today) {
        await runMealExclusionAutomations(user);
      }

      const record = Array.isArray(inserted) && inserted[0] ? formatMealExclusionForClient(inserted[0], today) : null;
      return json(res, 200, { entry: record });
    }

    if (payload?.__operation === 'meal-exclusion-close') {
      const targetId = payload.id;
      if (!targetId) {
        return json(res, 400, { error: 'Exclusion ID is required.' });
      }

      const updated = await supabaseRequest(`/rest/v1/meal_exclusions?id=eq.${encodeURIComponent(targetId)}`, {
        method: 'PATCH',
        service: true,
        body: {
          to_date: todayIsoDate(),
        },
        prefer: 'return=representation',
      });

      const record = Array.isArray(updated) && updated[0] ? formatMealExclusionForClient(updated[0]) : null;
      return json(res, 200, { entry: record });
    }

    if (payload?.__operation === 'meal-exclusion-update') {
      const targetId = payload.id;
      const reason = normalizeMealReason(payload.reason);
      const fromDate = String(payload.fromDate || '').slice(0, 10);
      const toDate = payload.toDate ? String(payload.toDate).slice(0, 10) : null;

      if (!targetId) {
        return json(res, 400, { error: 'Exclusion ID is required.' });
      }
      if (!reason || !MEAL_REASONS.has(reason) || !fromDate) {
        return json(res, 400, { error: 'Reason and from date are required for meal exclusion.' });
      }

      const updated = await supabaseRequest(`/rest/v1/meal_exclusions?id=eq.${encodeURIComponent(targetId)}`, {
        method: 'PATCH',
        service: true,
        body: {
          occupant_id: payload.occupantId || null,
          occupant_name: payload.name || null,
          staff_id: payload.staffId || null,
          room_id: payload.roomId || null,
          bed_no: payload.bedNo ?? null,
          reason,
          from_date: fromDate,
          to_date: toDate,
          notes: payload.notes || null,
          auto_checked_out_at: null,
        },
        prefer: 'return=representation',
      });

      const today = todayIsoDate();
      if (reason === 'Resignation/Termination' && fromDate <= today) {
        await runMealExclusionAutomations(user);
      }

      const record = Array.isArray(updated) && updated[0] ? formatMealExclusionForClient(updated[0], today) : null;
      return json(res, 200, { entry: record });
    }

    if (payload?.__operation === 'mutate') {
      const target = await resolveTargetFilter(payload);
      if (!target.filter) {
        return json(res, 404, { error: 'Occupancy target not found for action.' });
      }

      const action = payload.__action;
      if (action === 'delete' || action === 'checkout') {
        const removed = await supabaseRequest(`/rest/v1/occupancy?${target.filter}`, {
          method: 'DELETE',
          service: true,
          prefer: 'return=representation',
        });

        if (Array.isArray(removed) && removed.length > 0) {
          await writeHistoryIfProvided(payload, user);
          return json(res, 200, { success: true });
        }

        return json(res, 500, { error: 'Occupancy action could not remove the target row.' });
      }

      const nextRow = toOccupancyRow(payload);
      const conflict = await findActiveConflict(nextRow, target.row?.id);
      if (conflict) {
        return json(res, 409, {
          error: `Bed ${nextRow.bed_no} in ${nextRow.room_id} is already assigned to ${conflict.full_name || 'another active occupant'}.`,
        });
      }

      const updated = await supabaseRequest(`/rest/v1/occupancy?${target.filter}`, {
        method: 'PATCH',
        service: true,
        body: nextRow,
        prefer: 'return=representation',
      });

      if (Array.isArray(updated) && updated[0]) {
        await writeHistoryIfProvided(payload, user);
        return json(res, 200, { occupant: formatOccupantForClient(updated[0]) });
      }

      return json(res, 500, { error: 'Occupancy update could not persist changes.' });
    }

    const row = {
      ...toOccupancyRow(payload),
      status: 'Active',
      check_out: null,
    };
    const conflict = await findActiveConflict(row);
    let inserted = null;

    if (conflict && !(row.room_id && row.bed_no != null)) {
      return json(res, 409, {
        error: `Bed ${row.bed_no} in ${row.room_id} is already assigned to ${conflict.full_name || 'another active occupant'}.`,
      });
    }

    if (row.room_id && row.bed_no != null) {
      const updated = await supabaseRequest(`/rest/v1/occupancy?room_id=eq.${encodeURIComponent(row.room_id)}&bed_no=eq.${encodeURIComponent(row.bed_no)}`, {
        method: 'PATCH',
        service: true,
        body: row,
        prefer: 'return=representation',
      });

      if (Array.isArray(updated) && updated.length > 0) {
        inserted = updated;
      }
    }

    if (!inserted) {
      inserted = await supabaseRequest('/rest/v1/occupancy', {
        method: 'POST',
        service: true,
        body: [row],
        prefer: 'return=representation',
      });
    }

    const occupant = Array.isArray(inserted) && inserted[0] ? formatOccupantForClient(inserted[0]) : null;
    if (occupant) {
      await writeHistoryIfProvided(payload, user);
    }
    return json(res, 200, { occupant });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Unable to process occupancy request.' });
  }
}
