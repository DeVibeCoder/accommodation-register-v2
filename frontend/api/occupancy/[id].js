import { allowMethods, formatOccupantForClient, json, readBody, requireRole, supabaseRequest, toOccupancyRow } from '../_lib/supabase.js';

function isRoomIdPattern(value) {
  return /^(OB|FB|VTV)-/i.test(String(value || ''));
}

function buildRecordFilter(source = {}) {
  if (source.id) {
    return `id=eq.${encodeURIComponent(source.id)}`;
  }

  // Room + bed is the most stable natural key in this app when DB id is absent.
  if (source.roomId && source.bedNo != null) {
    return `room_id=eq.${encodeURIComponent(source.roomId)}&bed_no=eq.${encodeURIComponent(source.bedNo)}`;
  }

  if (source.roomId) {
    return `room_id=eq.${encodeURIComponent(source.roomId)}`;
  }

  const parts = [];
  if (source.staffId) parts.push(`staff_id=eq.${encodeURIComponent(source.staffId)}`);
  if (source.name) parts.push(`full_name=eq.${encodeURIComponent(source.name)}`);
  return parts.join('&');
}

function buildFilter(routeId, payload = {}) {
  // For delete, target the currently selected row values first.
  if (payload.__method === 'DELETE') {
    const payloadFilterForDelete = buildRecordFilter(payload);
    if (payloadFilterForDelete) return payloadFilterForDelete;
  }

  const matchFilter = buildRecordFilter(payload.match || payload.__match || {});
  if (matchFilter) return matchFilter;

  const payloadFilter = buildRecordFilter(payload);
  if (payloadFilter) return payloadFilter;

  if (routeId && !isRoomIdPattern(routeId)) {
    return `id=eq.${encodeURIComponent(routeId)}`;
  }

  return routeId && isRoomIdPattern(routeId)
    ? `room_id=eq.${encodeURIComponent(routeId)}`
    : '';
}

function uniqueFilters(filters = []) {
  const seen = new Set();
  const list = [];

  for (const item of filters) {
    const value = String(item || '').trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    list.push(value);
  }

  return list;
}

function buildFilterCandidates(routeId, payload = {}) {
  const candidates = [];
  const match = payload.match || payload.__match || {};

  const primary = buildFilter(routeId, payload);
  if (primary) candidates.push(primary);

  if (payload.roomId && payload.name) {
    candidates.push(`room_id=eq.${encodeURIComponent(payload.roomId)}&full_name=eq.${encodeURIComponent(payload.name)}`);
  }
  if (payload.roomId && payload.staffId) {
    candidates.push(`room_id=eq.${encodeURIComponent(payload.roomId)}&staff_id=eq.${encodeURIComponent(payload.staffId)}`);
  }

  if (match.roomId && match.name) {
    candidates.push(`room_id=eq.${encodeURIComponent(match.roomId)}&full_name=eq.${encodeURIComponent(match.name)}`);
  }
  if (match.roomId && match.staffId) {
    candidates.push(`room_id=eq.${encodeURIComponent(match.roomId)}&staff_id=eq.${encodeURIComponent(match.staffId)}`);
  }

  if (routeId && !isRoomIdPattern(routeId)) {
    candidates.push(`id=eq.${encodeURIComponent(routeId)}`);
  }

  return uniqueFilters(candidates);
}

function toInt(value) {
  const parsed = Number.parseInt(String(value ?? '').replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

async function resolveLegacyCandidate(payload = {}) {
  const match = payload.match || payload.__match || {};
  const roomId = payload.roomId || match.roomId;
  if (!roomId) return null;

  const bedNo = toInt(payload.bedNo ?? match.bedNo);
  const name = String(payload.name || match.name || '').trim().toLowerCase();
  const staffId = String(payload.staffId || match.staffId || '').trim().toLowerCase();

  const rows = await supabaseRequest(
    `/rest/v1/occupancy?select=*&room_id=eq.${encodeURIComponent(roomId)}&limit=100`,
    { service: true }
  );

  if (!Array.isArray(rows) || rows.length === 0) return null;

  const scored = rows.map(row => {
    let score = 0;
    if (bedNo != null && toInt(row.bed_no) === bedNo) score += 4;
    if (name && String(row.full_name || '').trim().toLowerCase() === name) score += 3;
    if (staffId && String(row.staff_id || '').trim().toLowerCase() === staffId) score += 3;
    return { row, score };
  }).sort((a, b) => b.score - a.score);

  return scored[0]?.score > 0 ? scored[0].row : null;
}

function filterFromLegacyRow(row = {}) {
  if (row.id) return `id=eq.${encodeURIComponent(row.id)}`;
  if (row.room_id && row.bed_no != null) {
    return `room_id=eq.${encodeURIComponent(row.room_id)}&bed_no=eq.${encodeURIComponent(row.bed_no)}`;
  }
  if (row.room_id && row.full_name) {
    return `room_id=eq.${encodeURIComponent(row.room_id)}&full_name=eq.${encodeURIComponent(row.full_name)}`;
  }
  if (row.room_id && row.staff_id) {
    return `room_id=eq.${encodeURIComponent(row.room_id)}&staff_id=eq.${encodeURIComponent(row.staff_id)}`;
  }
  return '';
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['PUT', 'DELETE'])) return;

  try {
    const allowedRoles = req.method === 'DELETE' ? ['Admin', 'Accommodation'] : ['Admin', 'Accommodation'];
    const user = await requireRole(req, res, allowedRoles);
    if (!user) return;

    const routeId = req.query.id;
    const payload = await readBody(req);
    const candidates = buildFilterCandidates(routeId, payload);

    if (candidates.length === 0) {
      return json(res, 400, { error: 'Occupancy identifier is required.' });
    }

    if (req.method === 'PUT') {
      const body = toOccupancyRow(payload);
      for (const filter of candidates) {
        const updated = await supabaseRequest(`/rest/v1/occupancy?${filter}`, {
          method: 'PATCH',
          service: true,
          body,
          prefer: 'return=representation',
        });

        if (Array.isArray(updated) && updated.length > 0) {
          const occupant = formatOccupantForClient(updated[0]);
          return json(res, 200, { occupant });
        }
      }

      const legacy = await resolveLegacyCandidate(payload);
      if (legacy) {
        const legacyFilter = filterFromLegacyRow(legacy);
        if (legacyFilter) {
          const updated = await supabaseRequest(`/rest/v1/occupancy?${legacyFilter}`, {
          method: 'PATCH',
          service: true,
          body,
          prefer: 'return=representation',
        });

          if (Array.isArray(updated) && updated.length > 0) {
            const occupant = formatOccupantForClient(updated[0]);
            return json(res, 200, { occupant });
          }
        }
      }

      return json(res, 404, { error: 'Occupancy record not found for update.' });
    }

    const nextStatus = payload.__action === 'checkout' ? 'Checked Out' : 'Deleted';

    for (const filter of candidates) {
      const deleted = await supabaseRequest(`/rest/v1/occupancy?${filter}`, {
        method: 'PATCH',
        service: true,
        body: {
          status: nextStatus,
          check_out: payload.__action === 'checkout' ? (payload.checkOut || new Date().toISOString()) : (payload.checkOut || null),
        },
        prefer: 'return=representation',
      });

      if (Array.isArray(deleted) && deleted.length > 0) {
        return json(res, 200, { success: true });
      }
    }

    const legacy = await resolveLegacyCandidate(payload);
    if (legacy) {
      const legacyFilter = filterFromLegacyRow(legacy);
      if (legacyFilter) {
        const deleted = await supabaseRequest(`/rest/v1/occupancy?${legacyFilter}`, {
        method: 'PATCH',
        service: true,
        body: {
          status: nextStatus,
          check_out: payload.__action === 'checkout' ? (payload.checkOut || new Date().toISOString()) : (payload.checkOut || null),
        },
        prefer: 'return=representation',
      });

        if (Array.isArray(deleted) && deleted.length > 0) {
          return json(res, 200, { success: true });
        }
      }
    }

    return json(res, 404, { error: 'Occupancy record not found for delete.' });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Unable to update occupancy.' });
  }
}
