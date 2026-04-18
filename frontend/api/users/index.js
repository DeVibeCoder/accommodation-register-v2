import { allowMethods, json, requireRole, supabaseRequest } from '../_lib/supabase.js';

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
  if (!allowMethods(req, res, ['GET'])) return;

  try {
    const admin = await requireRole(req, res, ['Admin']);
    if (!admin) return;

    const [authPayload, profiles] = await Promise.all([
      supabaseRequest('/auth/v1/admin/users?page=1&per_page=200', { service: true }),
      supabaseRequest('/rest/v1/profiles?select=id,email,role,active', { service: true }),
    ]);

    const authUsers = Array.isArray(authPayload?.users) ? authPayload.users : [];
    const profileMap = new Map((Array.isArray(profiles) ? profiles : []).map(profile => [profile.id, profile]));

    const users = authUsers
      .map(authUser => normalizeManagedUser(authUser, profileMap.get(authUser.id) || {}))
      .sort((a, b) => String(a.email || '').localeCompare(String(b.email || '')));

    return json(res, 200, { users });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Unable to load users.' });
  }
}
