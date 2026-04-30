import { allowMethods, formatUserForClient, json, readBody, requireRole, supabaseRequest } from '../_lib/supabase.js';

function normalizeManagedUser(authUser = {}, profile = {}) {
  return {
    id: authUser.id || profile.id || '',
    email: authUser.email || profile.email || '',
    role: profile.role || 'Viewer',
    active: profile.active !== false,
    createdAt: authUser.created_at || null,
    lastSignInAt: authUser.last_sign_in_at || null,
    emailConfirmed: Boolean(authUser.email_confirmed_at || authUser.confirmed_at),
  };
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET', 'POST'])) return;

  try {
    const admin = await requireRole(req, res, ['Admin']);
    if (!admin) return;

    if (req.method === 'POST') {
      const payload = await readBody(req);
      const rawId = payload?.userId || payload?.id || 'me';
      const targetUserId = rawId === 'me' ? admin.id : rawId;
      const nextRole = payload?.role;
      const email = payload?.email || null;

      if (!targetUserId || !['Viewer', 'Accommodation', 'Supervisor', 'Admin'].includes(nextRole)) {
        return json(res, 400, { error: 'Valid user ID and role are required.' });
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

      let resolvedEmail = email;
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

    const [authPayload, profiles] = await Promise.all([
      supabaseRequest('/auth/v1/admin/users?page=1&per_page=200', { service: true }),
      supabaseRequest('/rest/v1/profiles?select=id,email,role,active', { service: true }),
    ]);

    const authUsers = Array.isArray(authPayload?.users) ? authPayload.users : [];
    const profileMap = new Map((Array.isArray(profiles) ? profiles : []).map(profile => [profile.id, profile]));

    const users = authUsers
      .map(authUser => normalizeManagedUser(authUser, profileMap.get(authUser.id) || {}))
      .sort((a, b) => String(a.email || '').localeCompare(String(b.email || '')));

    res.setHeader('Cache-Control', 'no-store');
    return json(res, 200, { users });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Unable to load users.' });
  }
}
