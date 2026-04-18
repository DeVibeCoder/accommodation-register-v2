import { allowMethods, clearSessionCookies, ensureProfileForUser, json, readBody, setSessionCookies, supabaseRequest } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;

  try {
    const { email, password } = await readBody(req);

    if (!email || !password) {
      return json(res, 400, { error: 'Email and password are required.' });
    }

    const session = await supabaseRequest('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: { email, password },
    });

    const user = await ensureProfileForUser(session.user);

    if (user?.active === false) {
      clearSessionCookies(res);
      return json(res, 403, { error: 'This user account is inactive.' });
    }

    setSessionCookies(res, session);
    return json(res, 200, { user });
  } catch (error) {
    clearSessionCookies(res);
    return json(res, 401, { error: error.message || 'Login failed.' });
  }
}
