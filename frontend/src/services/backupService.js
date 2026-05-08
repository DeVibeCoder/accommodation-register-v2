import { apiRequest } from './apiClient';

export async function fetchBackups(limit = 30) {
  try {
    const data = await apiRequest(`/api/backups?limit=${encodeURIComponent(limit)}`);
    return Array.isArray(data?.backups) ? data.backups : [];
  } catch (error) {
    return {
      error: error?.message || 'Unable to load backups.',
      backups: [],
    };
  }
}

export async function createManualBackup(note = '') {
  const payload = {
    action: 'create',
    note: String(note || '').trim(),
  };

  return await apiRequest('/api/backups', {
    method: 'POST',
    body: payload,
  });
}

export async function restoreBackup(backupId) {
  return await apiRequest('/api/backups', {
    method: 'POST',
    body: {
      action: 'restore',
      backupId,
    },
  });
}
