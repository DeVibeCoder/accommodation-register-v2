import { allowMethods, formatOccupantForClient, json, readBody, requireRole, supabaseRequest, toOccupancyRow } from '../_lib/supabase.js';

function isRoomIdPattern(value) {
  return /^(OB|FB|VTV)-/i.test(String(value || ''));
}

function buildRecordFilter(source = {}) {
  if (source.id) {
    return `id=eq.${encodeURIComponent(source.id)}`;
  }

  const parts = [];
  if (source.roomId) parts.push(`room_id=eq.${encodeURIComponent(source.roomId)}`);
  if (source.bedNo != null) parts.push(`bed_no=eq.${encodeURIComponent(source.bedNo)}`);
  if (source.staffId) parts.push(`staff_id=eq.${encodeURIComponent(source.staffId)}`);
  if (source.name) parts.push(`full_name=eq.${encodeURIComponent(source.name)}`);
  return parts.join('&');
}

function buildFilter(routeId, payload = {}) {
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

      if (!Array.isArray(updated) || updated.length === 0) {
        return json(res, 404, { error: 'Occupancy record not found for update.' });
      }

      const occupant = Array.isArray(updated) && updated[0] ? formatOccupantForClient(updated[0]) : null;
      return json(res, 200, { occupant });
    }

    const deleted = await supabaseRequest(`/rest/v1/occupancy?${filter}`, {
      method: 'DELETE',
      service: true,
      prefer: 'return=representation',
    });

    if (!Array.isArray(deleted) || deleted.length === 0) {
      return json(res, 404, { error: 'Occupancy record not found for delete.' });
    }

    return json(res, 200, { success: true });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Unable to update occupancy.' });
  }
}
