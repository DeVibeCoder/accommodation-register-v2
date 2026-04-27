import { allowMethods, formatOccupantForClient, json, readBody, requireRole, supabaseRequest, toOccupancyRow, toStayHistoryRow } from '../_lib/supabase.js';

function isActiveStatus(value) {
  return String(value || 'Active').trim().toLowerCase() === 'active';
}

function isActiveStatus(value) {
  return String(value || 'Active').trim().toLowerCase() === 'active';
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

  return rows.find(item => {
    if (!excludeId) return true;
    return String(item?.id || '') !== String(excludeId);
  }) || null;
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET', 'POST', 'DELETE'])) return;

  try {
    if (req.method === 'GET') {
      const user = await requireRole(req, res, []);
      if (!user) return;

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

    const row = toOccupancyRow(payload);
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
