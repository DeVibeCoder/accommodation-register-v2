import { apiRequest } from './apiClient';

export async function fetchOccupancyHealth() {
  try {
    return await apiRequest('/api/occupancy?mode=health');
  } catch (error) {
    return {
      ok: false,
      error: error?.message || 'Unable to load occupancy health.',
      duplicateActiveBeds: [],
      activeOccupants: 0,
      totalRows: 0,
      stayHistoryEntries: 0,
      checkedAt: new Date().toISOString(),
    };
  }
}