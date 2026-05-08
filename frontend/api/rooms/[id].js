import { allowMethods, json, readBody, requireRole, supabaseRequest, toRoomRow } from '../_lib/supabase.js';

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj || {}, key);
}

function toRoomPatchRow(payload = {}) {
  const patch = {};

  if (hasOwn(payload, 'building')) patch.building = payload.building || null;
  if (hasOwn(payload, 'buildingCode')) patch.building_code = payload.buildingCode || null;
  if (hasOwn(payload, 'floor')) patch.floor = payload.floor || null;
  if (hasOwn(payload, 'roomNo')) patch.room_no = payload.roomNo || null;
  if (hasOwn(payload, 'roomType')) patch.room_type = payload.roomType || 'Internal';
  if (hasOwn(payload, 'ac')) patch.ac = Boolean(payload.ac);
  if (hasOwn(payload, 'attached')) patch.attached = Boolean(payload.attached);
  if (hasOwn(payload, 'roomActive')) patch.room_active = payload.roomActive || 'Yes';
  if (hasOwn(payload, 'totalBeds')) patch.total_beds = Number.parseInt(payload.totalBeds, 10) || 1;
  if (hasOwn(payload, 'usedBeds')) patch.used_beds = Math.max(0, Number.parseInt(payload.usedBeds, 10) || 0);
  if (hasOwn(payload, 'availableBeds')) patch.available_beds = Math.max(0, Number.parseInt(payload.availableBeds, 10) || 0);

  return patch;
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['PUT'])) return;

  try {
    const user = await requireRole(req, res, ['Admin', 'Accommodation', 'Supervisor']);
    if (!user) return;

    const roomId = req.query.id;
    const payload = await readBody(req);

    if (!roomId) {
      return json(res, 400, { error: 'Room ID is required.' });
    }

    const patch = toRoomPatchRow(payload);
    if (Object.keys(patch).length === 0) {
      return json(res, 400, { error: 'No room fields were provided to update.' });
    }

    const saved = await supabaseRequest(`/rest/v1/rooms?room_id=eq.${encodeURIComponent(roomId)}&select=*`, {
      method: 'PATCH',
      service: true,
      body: patch,
      prefer: 'return=representation',
    });

    return json(res, 200, { success: true, room: Array.isArray(saved) ? saved[0] : saved });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Unable to update room.' });
  }
}
