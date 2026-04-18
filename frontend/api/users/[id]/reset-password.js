import { allowMethods, json, readBody, requireRole, supabaseRequest } from '../../_lib/supabase.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;

  try {
    const admin = await requireRole(req, res, ['Admin']);
    if (!admin) return;

    const userId = req.query.id;
    const { email } = await readBody(req);

    if (!userId || !email) {
      return json(res, 400, { error: 'User ID and email are required.' });
    }

    await supabaseRequest('/auth/v1/recover', {
      method: 'POST',
      body: { email },
    });

    return json(res, 200, {
      success: true,
      message: `Password reset email sent to ${email}.`,
    });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Unable to send password reset email.' });
  }
}
