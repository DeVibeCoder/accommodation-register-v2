import { allowMethods, formatUserForClient, json, readBody, requireRole, supabaseRequest } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['PUT'])) return;

  try {
    const admin = await requireRole(req, res, ['Admin']);
    if (!admin) return;

    const userId = req.query.id;
    const { email, role } = await readBody(req);

    if (!userId || !role) {
      return json(res, 400, { error: 'User ID and role are required.' });
    }

    const updated = await supabaseRequest('/rest/v1/profiles', {
      method: 'POST',
      service: true,
      body: [{ id: userId, email: email || null, role, active: true }],
      prefer: 'resolution=merge-duplicates,return=representation',
    });

    const user = Array.isArray(updated) && updated[0] ? formatUserForClient(updated[0]) : null;
    return json(res, 200, { user });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Unable to update role.' });
  }
}
