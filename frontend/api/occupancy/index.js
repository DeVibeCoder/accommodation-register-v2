import { allowMethods, formatOccupantForClient, json, readBody, supabaseRequest, toOccupancyRow } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET', 'POST'])) return;

  try {
    if (req.method === 'GET') {
      const rows = await supabaseRequest('/rest/v1/occupancy?select=*&order=created_at.desc', {
        service: true,
      });

      const occupants = Array.isArray(rows) ? rows.map(formatOccupantForClient) : [];
      return json(res, 200, { occupants });
    }

    const payload = await readBody(req);
    const inserted = await supabaseRequest('/rest/v1/occupancy', {
      method: 'POST',
      service: true,
      body: [toOccupancyRow(payload)],
      prefer: 'return=representation',
    });

    const occupant = Array.isArray(inserted) && inserted[0] ? formatOccupantForClient(inserted[0]) : null;
    return json(res, 200, { occupant });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Unable to process occupancy request.' });
  }
}
