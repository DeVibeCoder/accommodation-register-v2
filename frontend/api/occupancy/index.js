import { allowMethods, formatOccupantForClient, json, readBody, requireRole, supabaseRequest, toOccupancyRow } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET', 'POST', 'DELETE'])) return;

  try {
    if (req.method === 'GET') {
      const user = await requireRole(req, res, []);
      if (!user) return;

      const rows = await supabaseRequest('/rest/v1/occupancy?select=*&order=created_at.desc', {
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
    const row = toOccupancyRow(payload);
    let inserted = null;

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
    return json(res, 200, { occupant });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Unable to process occupancy request.' });
  }
}
