import { allowMethods, formatUserForClient, json, readBody, requireRole, supabaseRequest } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['DELETE', 'POST', 'PUT'])) return;

  try {
    const admin = await requireRole(req, res, ['Admin']);
    if (!admin) return;

    const userId = req.query.id;
    if (!userId) {
      return json(res, 400, { error: 'User ID is required.' });
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const { email, role } = await readBody(req);
      const nextRole = ['Viewer', 'Accommodation', 'Supervisor', 'Admin'].includes(role) ? role : null;
      if (!nextRole) {
        return json(res, 400, { error: 'Valid role is required.' });
      }

      const targetUserId = userId === 'me' ? admin.id : userId;
      if (!targetUserId) {
        return json(res, 400, { error: 'Invalid target user.' });
      }

      const patched = await supabaseRequest(`/rest/v1/profiles?id=eq.${encodeURIComponent(targetUserId)}`, {
        method: 'PATCH',
        service: true,
        body: { role: nextRole, active: true },
        prefer: 'return=representation',
      });

      if (Array.isArray(patched) && patched[0]) {
        res.setHeader('Cache-Control', 'no-store');
        return json(res, 200, { user: formatUserForClient(patched[0]) });
      }

      let resolvedEmail = email || null;
      if (!resolvedEmail) {
        try {
          const authUser = await supabaseRequest(`/auth/v1/admin/users/${encodeURIComponent(targetUserId)}`, {
            service: true,
          });
          resolvedEmail = authUser?.user?.email || authUser?.email || null;
        } catch {
          resolvedEmail = null;
        }
      }

      const inserted = await supabaseRequest('/rest/v1/profiles', {
        method: 'POST',
        service: true,
        body: [{
          id: targetUserId,
          email: resolvedEmail,
          role: nextRole,
          active: true,
        }],
        prefer: 'return=representation',
      });

      const user = Array.isArray(inserted) && inserted[0] ? formatUserForClient(inserted[0]) : null;
      if (!user) {
        return json(res, 500, { error: 'Role update completed but user record was not returned.' });
      }

      res.setHeader('Cache-Control', 'no-store');
      return json(res, 200, { user });
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
