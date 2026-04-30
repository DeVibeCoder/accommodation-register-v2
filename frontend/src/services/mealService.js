import { apiRequest } from './apiClient';

export async function fetchMealExclusions() {
  const data = await apiRequest('/api/occupancy?mode=meal-exclusions');
  return {
    active: Array.isArray(data?.active) ? data.active : [],
    upcoming: Array.isArray(data?.upcoming) ? data.upcoming : [],
    mealExcludedCount: Number(data?.mealExcludedCount || 0),
  };
}

export async function fetchMealExclusionHistory() {
  const data = await apiRequest('/api/occupancy?mode=meal-exclusion-history');
  return Array.isArray(data?.history) ? data.history : [];
}

export async function fetchMealHistory(filters = {}) {
  const params = new URLSearchParams({ mode: 'meal-history' });
  if (filters?.fromDate) params.set('fromDate', filters.fromDate);
  if (filters?.toDate) params.set('toDate', filters.toDate);

  const data = await apiRequest(`/api/occupancy?${params.toString()}`);
  return {
    history: Array.isArray(data?.history) ? data.history : [],
    departments: Array.isArray(data?.departments) ? data.departments : [],
    warning: data?.warning || '',
  };
}

export async function addMealExclusion(payload = {}) {
  const data = await apiRequest('/api/occupancy', {
    method: 'POST',
    body: {
      __operation: 'meal-exclusion-add',
      ...payload,
    },
  });

  return data?.entry || null;
}

export async function closeMealExclusion(id) {
  if (!id) return null;

  const data = await apiRequest('/api/occupancy', {
    method: 'POST',
    body: {
      __operation: 'meal-exclusion-close',
      id,
    },
  });

  return data?.entry || null;
}

export async function updateMealExclusion(id, payload = {}) {
  if (!id) return null;

  const data = await apiRequest('/api/occupancy', {
    method: 'POST',
    body: {
      __operation: 'meal-exclusion-update',
      id,
      ...payload,
    },
  });

  return data?.entry || null;
}

export async function batchAddMealExclusions(entries = []) {
  const data = await apiRequest('/api/occupancy', {
    method: 'POST',
    body: {
      __operation: 'meal-exclusion-batch-add',
      entries,
    },
  });
  return data || { inserted: 0, errors: [], total: 0 };
}

export async function dedupeMealExclusions() {
  const data = await apiRequest('/api/occupancy', {
    method: 'POST',
    body: {
      __operation: 'meal-exclusion-dedupe',
    },
  });

  return {
    removed: Number(data?.removed || 0),
    groups: Number(data?.groups || 0),
  };
}
