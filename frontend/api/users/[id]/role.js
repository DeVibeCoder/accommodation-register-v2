import { allowMethods, formatUserForClient, json, readBody, requireRole, supabaseRequest } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['PUT', 'POST'])) return;

  try {
    const admin = await requireRole(req, res, ['Admin']);
    if (!admin) return;

    const rawId = req.query.id;
    const userId = Array.isArray(rawId) ? rawId[0] : rawId;
    const { email, role } = await readBody(req);
    const nextRole = ['Viewer', 'Accommodation', 'Admin'].includes(role) ? role : null;

    if (!userId || !nextRole) {
      return json(res, 400, { error: 'User ID and role are required.' });
    }

    const targetUserId = userId === 'me' ? admin.id : userId;
    if (!targetUserId) {
      return json(res, 400, { error: 'Invalid target user.' });
    }

    // Patch first so role updates work even when profile schema has additional constraints.
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

    // If profile row is missing, create it with safe defaults.
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
  } catch (error) {
    return json(res, 500, { error: error.message || 'Unable to update role.' });
  }
}
