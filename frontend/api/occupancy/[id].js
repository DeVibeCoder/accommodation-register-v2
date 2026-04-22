import { allowMethods, formatOccupantForClient, json, readBody, requireRole, supabaseRequest, toOccupancyRow } from '../_lib/supabase.js';

function buildFilter(routeId, payload = {}) {
  if (payload.id) {
    return `id=eq.${encodeURIComponent(payload.id)}`;
  }

  const roomId = payload.roomId || routeId;
  const parts = [];

  if (roomId) parts.push(`room_id=eq.${encodeURIComponent(roomId)}`);
  if (payload.bedNo != null) parts.push(`bed_no=eq.${encodeURIComponent(payload.bedNo)}`);
  if (payload.name) parts.push(`full_name=eq.${encodeURIComponent(payload.name)}`);

  return parts.join('&');
  // routeId was set by the client to payload.id when available,
  // so if it doesn't look like a room code, treat it as the record's DB id
  if (routeId && !isRoomIdPattern(routeId)) {
    return `id=eq.${encodeURIComponent(routeId)}`;
  }

  const roomId = payload.roomId || routeId;
  const parts = [];

  if (roomId) parts.push(`room_id=eq.${encodeURIComponent(roomId)}`);
  if (payload.bedNo != null) parts.push(`bed_no=eq.${encodeURIComponent(payload.bedNo)}`);
  if (payload.name) parts.push(`full_name=eq.${encodeURIComponent(payload.name)}`);

  return parts.join('&');
}

function isRoomIdPattern(value) {
  return /^(OB|FB|VTV)-/i.test(String(value || ''));
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['PUT', 'DELETE'])) return;

  try {
    const allowedRoles = req.method === 'DELETE' ? ['Admin', 'Accommodation'] : ['Admin', 'Accommodation'];
    const user = await requireRole(req, res, allowedRoles);
    if (!user) return;

    const routeId = req.query.id;
    const payload = await readBody(req);
    const filter = buildFilter(routeId, payload);

    if (!filter) {
      return json(res, 400, { error: 'Occupancy identifier is required.' });
    }

    if (req.method === 'PUT') {
      const updated = await supabaseRequest(`/rest/v1/occupancy?${filter}`, {
        method: 'PATCH',
        service: true,
        body: toOccupancyRow(payload),
        prefer: 'return=representation',
      });

      const occupant = Array.isArray(updated) && updated[0] ? formatOccupantForClient(updated[0]) : null;
      return json(res, 200, { occupant });
    }

    await supabaseRequest(`/rest/v1/occupancy?${filter}`, {
      method: 'DELETE',
      service: true,
      prefer: 'return=minimal',
    });

    return json(res, 200, { success: true });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Unable to update occupancy.' });
  }
}
