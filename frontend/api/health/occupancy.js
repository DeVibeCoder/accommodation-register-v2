import { allowMethods, json, requireRole, supabaseRequest } from '../_lib/supabase.js';

function keyFor(row = {}) {
  return `${row.room_id || ''}::${row.bed_no ?? ''}`;
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return;

  try {
    const user = await requireRole(req, res, ['Admin', 'Accommodation']);
    if (!user) return;

    const [activeRows, allRows, historyRows] = await Promise.all([
      supabaseRequest('/rest/v1/occupancy?select=room_id,bed_no,full_name,status&status=eq.Active&limit=5000', { service: true }),
      supabaseRequest('/rest/v1/occupancy?select=room_id,bed_no,full_name,status&limit=5000', { service: true }),
      supabaseRequest('/rest/v1/stay_history?select=id&limit=500', { service: true }),
    ]);

    const active = Array.isArray(activeRows) ? activeRows : [];
    const all = Array.isArray(allRows) ? allRows : [];
    const history = Array.isArray(historyRows) ? historyRows : [];

    const duplicateMap = new Map();
    for (const row of active) {
      const key = keyFor(row);
      duplicateMap.set(key, [...(duplicateMap.get(key) || []), row.full_name || 'Unknown']);
    }

    const duplicateActiveBeds = [...duplicateMap.entries()]
      .filter(([, names]) => names.length > 1)
      .map(([key, names]) => ({ key, occupants: names }));

    return json(res, 200, {
      ok: duplicateActiveBeds.length === 0,
      activeOccupants: active.length,
      totalRows: all.length,
      stayHistoryEntries: history.length,
      duplicateActiveBeds,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Unable to compute occupancy health.' });
  }
}
