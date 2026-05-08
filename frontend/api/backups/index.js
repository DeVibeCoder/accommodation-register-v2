import { allowMethods, json, readBody, requireRole } from '../_lib/supabase.js';
import { createBackup, listBackups, restoreBackupById } from '../_lib/backups.js';

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET', 'POST'])) return;

  try {
    const user = await requireRole(req, res, ['Admin']);
    if (!user) return;

    if (req.method === 'GET') {
      const limit = Number.parseInt(String(req.query?.limit || '30'), 10) || 30;
      const backups = await listBackups(limit);
      res.setHeader('Cache-Control', 'no-store');
      return json(res, 200, { backups });
    }

    const payload = await readBody(req);
    const action = String(payload?.action || 'create').trim().toLowerCase();

    if (action === 'restore') {
      const backupId = String(payload?.backupId || '').trim();
      if (!backupId) return json(res, 400, { error: 'backupId is required.' });

      const result = await restoreBackupById(backupId);
      return json(res, 200, { success: true, result });
    }

    const note = String(payload?.note || '').trim();
    const result = await createBackup({
      type: 'manual',
      note,
      createdBy: user.id,
    });

    return json(res, 200, { success: true, backup: result });
  } catch (error) {
    return json(res, 500, { error: error?.message || 'Backup operation failed.' });
  }
}
