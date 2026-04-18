import { allowMethods, clearSessionCookies, ensureProfileForUser, getUserFromSession, json } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return;

  try {
    const authUser = await getUserFromSession(req, res);

    if (!authUser) {
      clearSessionCookies(res);
      return json(res, 200, { user: null });
    }

    const user = await ensureProfileForUser(authUser);

    if (user?.active === false) {
      clearSessionCookies(res);
      return json(res, 200, { user: null });
    }

    return json(res, 200, { user });
  } catch {
    clearSessionCookies(res);
    return json(res, 200, { user: null });
  }
}
