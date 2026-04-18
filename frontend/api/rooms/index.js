import { allowMethods, formatRoomForClient, json, readBody, requireRole, supabaseRequest, toRoomRow } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET', 'POST'])) return;

  try {
    if (req.method === 'GET') {
      const user = await requireRole(req, res, []);
      if (!user) return;

      const rows = await supabaseRequest('/rest/v1/rooms?select=*&order=room_id.asc', {
        service: true,
      });

      const rooms = Array.isArray(rows) ? rows.map(formatRoomForClient) : [];
      return json(res, 200, { rooms });
    }

    const user = await requireRole(req, res, ['Admin']);
    if (!user) return;

    const payload = await readBody(req);
    const inserted = await supabaseRequest('/rest/v1/rooms', {
      method: 'POST',
      service: true,
      body: [toRoomRow(payload)],
      prefer: 'resolution=merge-duplicates,return=representation',
    });

    const room = Array.isArray(inserted) && inserted[0] ? formatRoomForClient(inserted[0]) : null;
    return json(res, 200, { room });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Unable to process room request.' });
  }
}
