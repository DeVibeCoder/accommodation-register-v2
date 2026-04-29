import { apiRequest } from './apiClient';

export async function fetchMealExclusions() {
  const data = await apiRequest('/api/occupancy?mode=meal-exclusions');
  return {
    active: Array.isArray(data?.active) ? data.active : [],
    upcoming: Array.isArray(data?.upcoming) ? data.upcoming : [],
    mealExcludedCount: Number(data?.mealExcludedCount || 0),
  };
}

export async function fetchMealHistory() {
  const data = await apiRequest('/api/occupancy?mode=meal-history');
  return Array.isArray(data?.history) ? data.history : [];
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
