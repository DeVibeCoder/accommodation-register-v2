import { apiRequest } from './apiClient';

function extractList(payload, fallbackKey) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.[fallbackKey])) return payload[fallbackKey];
  return [];
}

export function normalizeStayHistoryRecord(row = {}) {
  return {
    id: row.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: row.type || row.action || 'Edit',
    name: row.name || row.occupant_name || '',
    roomId: row.roomId || row.room_id || '',
    bedNo: row.bedNo ?? null,
    details: row.details || '',
    timestamp: row.timestamp || row.created_at || new Date().toISOString(),
    user: row.user || '',
  };
}

export async function fetchStayHistory() {
  try {
    const data = await apiRequest('/api/stay-history');
    return extractList(data, 'history').map(normalizeStayHistoryRecord);
  } catch (error) {
    console.error('[API] Unable to fetch stay history.', error.message || error);
    return [];
  }
}

export async function addStayHistory(entry) {
  try {
    const data = await apiRequest('/api/stay-history', {
      method: 'POST',
      body: entry,
    });

    const record = data?.entry ?? data?.data ?? data;
    return record ? normalizeStayHistoryRecord(record) : null;
  } catch (error) {
    console.error('[API] Unable to save stay history.', error.message || error);
    return null;
  }
}
