import { allowMethods, formatRoomForClient, json, supabaseRequest } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return;

  try {
    const rows = await supabaseRequest('/rest/v1/rooms?select=*&order=room_id.asc', {
      service: true,
    });

    const rooms = Array.isArray(rows) ? rows.map(formatRoomForClient) : [];
    return json(res, 200, { rooms });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Unable to fetch rooms.' });
  }
}
