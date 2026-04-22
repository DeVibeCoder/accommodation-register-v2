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

      return json(res, 404, { error: 'Occupancy record not found for update.' });
    }

    for (const filter of candidates) {
      const deleted = await supabaseRequest(`/rest/v1/occupancy?${filter}`, {
        method: 'DELETE',
        service: true,
        prefer: 'return=representation',
      });

      if (Array.isArray(deleted) && deleted.length > 0) {
        return json(res, 200, { success: true });
      }
    }

    return json(res, 404, { error: 'Occupancy record not found for delete.' });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Unable to update occupancy.' });
  }
}
