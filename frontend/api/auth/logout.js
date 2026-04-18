import { allowMethods, clearSessionCookies, json } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;

  clearSessionCookies(res);
  return json(res, 200, { success: true });
}
