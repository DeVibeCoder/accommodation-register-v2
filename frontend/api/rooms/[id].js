import { allowMethods, json, readBody, supabaseRequest, toRoomRow } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['PUT'])) return;

  try {
    const roomId = req.query.id;
    const payload = await readBody(req);

    if (!roomId) {
      return json(res, 400, { error: 'Room ID is required.' });
    }

    await supabaseRequest(`/rest/v1/rooms?room_id=eq.${encodeURIComponent(roomId)}`, {
      method: 'PATCH',
      service: true,
      body: toRoomRow({ ...payload, id: roomId }),
      prefer: 'return=minimal',
    });

    return json(res, 200, { success: true });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Unable to update room.' });
  }
}
