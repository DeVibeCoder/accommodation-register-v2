import { allowMethods, json, requireRole, supabaseRequest } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['DELETE'])) return;

  try {
    const admin = await requireRole(req, res, ['Admin']);
    if (!admin) return;

    const userId = req.query.id;
    if (!userId) {
      return json(res, 400, { error: 'User ID is required.' });
    }

    if (admin.id === userId) {
      return json(res, 400, { error: 'You cannot delete the account you are currently using.' });
    }

    const profiles = await supabaseRequest('/rest/v1/profiles?select=id,role', { service: true });
    const adminCount = Array.isArray(profiles) ? profiles.filter(item => item.role === 'Admin').length : 0;
    const targetProfile = Array.isArray(profiles) ? profiles.find(item => item.id === userId) : null;

    if (targetProfile?.role === 'Admin' && adminCount <= 1) {
      return json(res, 400, { error: 'At least one Admin account must remain.' });
    }

    await supabaseRequest(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      service: true,
    });

    await supabaseRequest(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      service: true,
    });

    return json(res, 200, { success: true });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Unable to delete user.' });
  }
}
