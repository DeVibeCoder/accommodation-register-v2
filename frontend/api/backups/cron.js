import { allowMethods, json } from '../_lib/supabase.js';
import { createBackup } from '../_lib/backups.js';

function isAuthorizedCronRequest(req) {
  // Vercel Cron sends this header on scheduled invocations.
  if (req.headers['x-vercel-cron']) return true;

  const configuredSecret = String(process.env.BACKUP_CRON_SECRET || '').trim();
  if (!configuredSecret) return false;

  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  return token === configuredSecret;
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return;

  if (!isAuthorizedCronRequest(req)) {
    return json(res, 401, { error: 'Unauthorized cron request.' });
  }

  try {
    const day = new Date().toISOString().slice(0, 10);
    const result = await createBackup({
      type: 'daily',
      backupDay: day,
      key: `daily-${day}`,
      note: 'Automatic daily backup',
      createdBy: null,
    });

    return json(res, 200, {
      success: true,
      created: !result.alreadyExisted,
      backup: result,
    });
  } catch (error) {
    return json(res, 500, { error: error?.message || 'Daily backup failed.' });
  }
}
