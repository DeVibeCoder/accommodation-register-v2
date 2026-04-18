import { allowMethods, formatStayHistoryForClient, json, readBody, requireRole, supabaseRequest, toStayHistoryRow } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET', 'POST', 'DELETE'])) return;

  try {
    if (req.method === 'GET') {
      const user = await requireRole(req, res, []);
      if (!user) return;

      const rows = await supabaseRequest('/rest/v1/stay_history?select=*&order=created_at.desc&limit=500', {
        service: true,
      });

      const history = Array.isArray(rows) ? rows.map(formatStayHistoryForClient) : [];
      return json(res, 200, { history });
    }

    if (req.method === 'DELETE') {
      const user = await requireRole(req, res, ['Admin']);
      if (!user) return;

      await supabaseRequest('/rest/v1/stay_history?id=not.is.null', {
        method: 'DELETE',
        service: true,
        prefer: 'return=minimal',
      });

      return json(res, 200, { success: true });
    }

    const user = await requireRole(req, res, ['Admin', 'Accommodation']);
    if (!user) return;

    const payload = await readBody(req);
    const inserted = await supabaseRequest('/rest/v1/stay_history', {
      method: 'POST',
      service: true,
      body: [{
        ...toStayHistoryRow({ ...payload, user: user.role }),
        created_by: user.id || null,
      }],
      prefer: 'return=representation',
    });

    const entry = Array.isArray(inserted) && inserted[0] ? formatStayHistoryForClient(inserted[0]) : null;
    return json(res, 200, { entry });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Unable to process stay history.' });
  }
}
