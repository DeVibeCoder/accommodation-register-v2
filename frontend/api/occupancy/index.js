import { allowMethods, formatOccupantForClient, json, readBody, requireRole, supabaseRequest, toOccupancyRow, toStayHistoryRow } from '../_lib/supabase.js';

function isActiveStatus(value) {
  return String(value || 'Active').trim().toLowerCase() === 'active';
}

function keyFor(row = {}) {
  return `${row.room_id || ''}::${row.bed_no ?? ''}`;
}

const MEAL_REASONS = new Set(['Off Site', 'Vacation', 'Restaurant', 'Exit']);

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeMealReason(value = '') {
  const input = String(value || '').trim().toLowerCase();
  if (input === 'off site' || input === 'offsite') return 'Off Site';
  if (input === 'vacation' || input === 'leave') return 'Vacation';
  if (input === 'restaurant') return 'Restaurant';
  if (input === 'exit' || input === 'resignation' || input === 'termination' || input === 'resignation/termination') return 'Exit';
  return '';
}

function classifyMealExclusion(row = {}, today = todayIsoDate()) {
  const fromDate = String(row?.from_date || '').slice(0, 10);
  const toDate = String(row?.to_date || '').slice(0, 10);
  const reason = normalizeMealReason(row?.reason);
  const autoCheckedOut = Boolean(row?.auto_checked_out_at);

  if (!fromDate || !reason) return 'invalid';
  if (reason === 'Exit' && autoCheckedOut) return 'completed';
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
    `/rest/v1/meal_exclusions?select=*&reason=eq.${encodeURIComponent('Exit')}&auto_checked_out_at=is.null&from_date=lte.${encodeURIComponent(today)}&limit=500`,
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
              details: 'Auto checkout completed from Meal Exclusion (Exit).',
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

function normalizeDeptCounts(source = {}) {
  const counts = {};
  for (const [k, v] of Object.entries(source)) {
    const n = Number(v);
    counts[String(k)] = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }
  return counts;
}

function normalizeDepartmentForMeals(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return 'OTHER';
  if (/^other(\b|\s|[-_/(:])/i.test(raw)) return 'OTHER';
  return raw;
}

function toIsoDateOrEmpty(value) {
  const dateText = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(dateText) ? dateText : '';
}

function formatMealHistoryRow(row = {}) {
  const counts = normalizeDeptCounts(row.department_counts || row.departmentCounts || {});
  const total = Number(row.total_meals ?? row.totalMeals ?? row.total ?? 0);
  return {
    date: toIsoDateOrEmpty(row.snapshot_date || row.date),
    total: Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0,
    counts,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function mealExclusionKey(roomId = '', bedNo = null) {
  return `${String(roomId || '').trim()}::${String(bedNo ?? '').trim()}`;
}

function buildActiveMealExclusionIndex(rows = [], date = todayIsoDate()) {
  const byOccupantId = new Set();
  const byStaffId = new Set();
  const byRoomBed = new Set();

  for (const row of rows) {
    if (classifyMealExclusion(row, date) !== 'active') continue;
    if (row.occupant_id) byOccupantId.add(String(row.occupant_id));
    if (row.staff_id) byStaffId.add(String(row.staff_id).trim().toLowerCase());
    if (row.room_id && row.bed_no != null) byRoomBed.add(mealExclusionKey(row.room_id, row.bed_no));
  }

  return { byOccupantId, byStaffId, byRoomBed };
}

function isExcludedFromMeals(occupant = {}, exclusionIndex = {}) {
  if (!occupant) return false;
  const id = occupant.id ? String(occupant.id) : '';
  const staffId = String(occupant.staff_id || '').trim().toLowerCase();
  const roomBed = mealExclusionKey(occupant.room_id, occupant.bed_no);

  return Boolean(
    (id && exclusionIndex.byOccupantId?.has(id))
    || (staffId && exclusionIndex.byStaffId?.has(staffId))
    || (occupant.room_id && occupant.bed_no != null && exclusionIndex.byRoomBed?.has(roomBed))
  );
}

async function computeMealSnapshotForDate(date = todayIsoDate()) {
  const [occupancyRows, exclusionRows] = await Promise.all([
    supabaseRequest('/rest/v1/occupancy?select=id,staff_id,department,room_id,bed_no,status&status=eq.Active&limit=5000', {
      service: true,
    }),
    fetchMealExclusionRows(),
  ]);

  const occupants = Array.isArray(occupancyRows) ? occupancyRows : [];
  const exclusionIndex = buildActiveMealExclusionIndex(exclusionRows, date);
  const counts = {};

  for (const row of occupants) {
    if (isExcludedFromMeals(row, exclusionIndex)) continue;
    const dept = normalizeDepartmentForMeals(row.department);
    counts[dept] = (counts[dept] || 0) + 1;
  }

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  return {
    date,
    total,
    counts,
    sourceUpdatedAt: new Date().toISOString(),
  };
}

async function upsertMealSnapshot(snapshot = {}) {
  if (!snapshot?.date) return null;

  const inserted = await supabaseRequest('/rest/v1/meal_history_daily', {
    method: 'POST',
    service: true,
    body: [{
      snapshot_date: snapshot.date,
      total_meals: snapshot.total || 0,
      department_counts: normalizeDeptCounts(snapshot.counts || {}),
      source_updated_at: snapshot.sourceUpdatedAt || new Date().toISOString(),
    }],
    prefer: 'resolution=merge-duplicates,return=representation',
  });

  return Array.isArray(inserted) ? inserted[0] : inserted;
}

async function fetchMealSnapshots(filters = {}) {
  const queryParts = [
    'select=snapshot_date,total_meals,department_counts,created_at,updated_at',
    'order=snapshot_date.desc',
    'limit=3650',
  ];

  const fromDate = toIsoDateOrEmpty(filters.fromDate);
  const toDate = toIsoDateOrEmpty(filters.toDate);
  if (fromDate) queryParts.push(`snapshot_date=gte.${encodeURIComponent(fromDate)}`);
  if (toDate) queryParts.push(`snapshot_date=lte.${encodeURIComponent(toDate)}`);

  const rows = await supabaseRequest(`/rest/v1/meal_history_daily?${queryParts.join('&')}`, {
    service: true,
  });

  return Array.isArray(rows) ? rows.map(formatMealHistoryRow).filter(item => item.date) : [];
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

async function findActiveConflict(row = {}, excludeId = null, allowConflictWithId = null) {
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

  return rows.find(item => {
    const currentId = String(item?.id || '');
    if (currentId === String(excludeId || '')) return false;
    if (allowConflictWithId && currentId === String(allowConflictWithId)) return false;
    return true;
  }) || null;
}

async function writeHistoryIfProvided(payload = {}, user = {}) {
  const history = payload?.__history;
  if (!history || typeof history !== 'object') return null;

  const inserted = await supabaseRequest('/rest/v1/stay_history', {
    method: 'POST',
    service: true,
    body: [{
      ...toStayHistoryRow({ ...history, user: user?.role || null }),
      created_by: user?.id || null,
    }],
    prefer: 'return=representation',
  });

  return Array.isArray(inserted) && inserted[0] ? {
    id: inserted[0].id,
    type: inserted[0].action || history.type || 'Edit',
    name: inserted[0].occupant_name || history.name || '',
    roomId: inserted[0].room_id || history.roomId || '',
    bedNo: inserted[0]?.details?.bedNo ?? history.bedNo ?? null,
    details: inserted[0]?.details?.details || history.details || '',
    timestamp: inserted[0].created_at || new Date().toISOString(),
    user: inserted[0]?.details?.user || user?.role || '',
  } : null;
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET', 'POST', 'DELETE'])) return;

  try {
    if (req.method === 'GET') {
      const user = await requireRole(req, res, []);
      if (!user) return;

      const mode = String(req.query?.mode || '').trim().toLowerCase();
      if (mode === 'meal-exclusions' || mode === 'meal-exclusion-history') {
        await runMealExclusionAutomations(user);
        const rows = await fetchMealExclusionRows();
        const grouped = splitMealExclusions(rows);
        res.setHeader('Cache-Control', 'no-store');

        if (mode === 'meal-exclusion-history') {
          return json(res, 200, { history: grouped.history });
        }

        return json(res, 200, {
          active: grouped.active,
          upcoming: grouped.upcoming,
          mealExcludedCount: grouped.active.length,
        });
      }

      if (mode === 'meal-history') {
        await runMealExclusionAutomations(user);
        const fromDate = toIsoDateOrEmpty(req.query?.fromDate || req.query?.from || '');
        const toDate = toIsoDateOrEmpty(req.query?.toDate || req.query?.to || '');

        const today = todayIsoDate();
        const liveSnapshot = await computeMealSnapshotForDate(today);

        let history = [];
        let persistenceWarning = '';

        try {
          await upsertMealSnapshot(liveSnapshot);
          history = await fetchMealSnapshots({ fromDate, toDate });
        } catch (error) {
          persistenceWarning = error?.message || 'Meal history table not available.';
          const includeLive = (!fromDate || today >= fromDate) && (!toDate || today <= toDate);
          history = includeLive ? [liveSnapshot] : [];
        }

        if (!history.some(item => item.date === liveSnapshot.date)) {
          history = [liveSnapshot, ...history].sort((a, b) => String(b.date).localeCompare(String(a.date)));
        }

        const allDepts = new Set();
        for (const item of history) {
          for (const k of Object.keys(item.counts || {})) allDepts.add(k);
        }
        const departments = [...allDepts].sort((a, b) => a.localeCompare(b));

        res.setHeader('Cache-Control', 'no-store');
        return json(res, 200, {
          history,
          departments,
          generatedAt: new Date().toISOString(),
          warning: persistenceWarning || null,
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

    const user = await requireRole(req, res, ['Admin', 'Accommodation', 'Supervisor']);
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

      if (reason === 'Exit' && fromDate <= today) {
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
      if (reason === 'Exit' && fromDate <= today) {
        await runMealExclusionAutomations(user);
      }

      const record = Array.isArray(updated) && updated[0] ? formatMealExclusionForClient(updated[0], today) : null;
      return json(res, 200, { entry: record });
    }

    if (payload?.__operation === 'meal-exclusion-batch-add') {
      const entries = Array.isArray(payload.entries) ? payload.entries : [];
      if (entries.length === 0) return json(res, 400, { error: 'No entries provided.' });

      const today = todayIsoDate();
      const rows = [];
      const errors = [];

      for (const entry of entries) {
        const reason = normalizeMealReason(entry.reason);
        const fromDate = String(entry.fromDate || '').slice(0, 10);
        const toDate = entry.toDate ? String(entry.toDate).slice(0, 10) : null;
        if (!reason || !MEAL_REASONS.has(reason) || !fromDate) {
          errors.push({ name: entry.name || entry.staffId || '?', error: 'Invalid reason or missing from date' });
          continue;
        }
        rows.push({
          occupant_id: entry.occupantId || null,
          occupant_name: entry.name || null,
          staff_id: entry.staffId || null,
          room_id: entry.roomId || null,
          bed_no: entry.bedNo ?? null,
          reason,
          from_date: fromDate,
          to_date: toDate,
          notes: entry.notes || null,
          created_by: user?.id || null,
          auto_checked_out_at: null,
        });
      }

      let insertedCount = 0;
      if (rows.length > 0) {
        const inserted = await supabaseRequest('/rest/v1/meal_exclusions', {
          method: 'POST',
          service: true,
          body: rows,
          prefer: 'return=representation',
        });
        insertedCount = Array.isArray(inserted) ? inserted.length : 0;
      }

      return json(res, 200, { inserted: insertedCount, errors, total: entries.length });
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
          const historyEntry = await writeHistoryIfProvided(payload, user);
          return json(res, 200, { success: true, historyEntry });
        }

        return json(res, 500, { error: 'Occupancy action could not remove the target row.' });
      }

      const nextRow = toOccupancyRow(payload);
      const conflict = await findActiveConflict(nextRow, target.row?.id, payload.__allowConflictOccupantId);
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
        const historyEntry = await writeHistoryIfProvided(payload, user);
        return json(res, 200, { occupant: formatOccupantForClient(updated[0]), historyEntry });
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
    let historyEntry = null;
    if (occupant) {
      historyEntry = await writeHistoryIfProvided(payload, user);
    }
    return json(res, 200, { occupant, historyEntry });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Unable to process occupancy request.' });
  }
}
