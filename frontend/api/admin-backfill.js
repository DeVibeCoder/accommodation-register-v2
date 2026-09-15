import { allowMethods, json, supabaseRequest, requireRole } from './_lib/supabase.js';

// Specific dates that must be backfilled — each will copy data from its nearest available neighbour.
const REQUIRED_DATES = [
  '2026-05-01',
  '2026-07-10',
  '2026-07-11',
  '2026-08-21',
  '2026-09-11',
  '2026-09-13',
];

async function fetchAllSnapshots() {
  const rows = await supabaseRequest(
    '/rest/v1/meal_history_daily?select=snapshot_date,total_meals,department_counts&order=snapshot_date.asc&limit=3650',
    { service: true }
  );
  return Array.isArray(rows) ? rows : [];
}

async function insertSnapshot(date, totalMeals, departmentCounts) {
  await supabaseRequest('/rest/v1/meal_history_daily', {
    method: 'POST',
    service: true,
    body: [{
      snapshot_date: date,
      total_meals: totalMeals,
      department_counts: departmentCounts,
      source_updated_at: new Date().toISOString(),
    }],
    prefer: 'resolution=ignore-duplicates,return=minimal',
  });
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET', 'POST'])) return;

  // Require any authenticated user
  const user = await requireRole(req, res, []);
  if (!user) return;

  try {
    const allRows = await fetchAllSnapshots();
    const byDate = new Map(allRows.map(r => [r.snapshot_date, r]));
    const sortedDates = allRows.map(r => r.snapshot_date);

    const report = [];

    for (const targetDate of REQUIRED_DATES) {
      if (byDate.has(targetDate)) {
        report.push({ date: targetDate, status: 'already_exists' });
        continue;
      }

      // Find nearest previous date
      let sourceDate = null;
      for (let i = sortedDates.length - 1; i >= 0; i--) {
        if (sortedDates[i] < targetDate) { sourceDate = sortedDates[i]; break; }
      }
      // Fallback: nearest next date
      if (!sourceDate) {
        for (let i = 0; i < sortedDates.length; i++) {
          if (sortedDates[i] > targetDate) { sourceDate = sortedDates[i]; break; }
        }
      }

      if (!sourceDate) {
        report.push({ date: targetDate, status: 'no_source_found' });
        continue;
      }

      const sourceRow = byDate.get(sourceDate);
      await insertSnapshot(targetDate, sourceRow.total_meals, sourceRow.department_counts || {});

      // Add to our in-memory map so chained dates (e.g. Jul 10 → Jul 11) find each other
      byDate.set(targetDate, { snapshot_date: targetDate, total_meals: sourceRow.total_meals, department_counts: sourceRow.department_counts });
      const pos = sortedDates.findIndex(d => d > targetDate);
      if (pos === -1) sortedDates.push(targetDate);
      else sortedDates.splice(pos, 0, targetDate);

      report.push({ date: targetDate, status: 'inserted', copiedFrom: sourceDate, total: sourceRow.total_meals });
    }

    return json(res, 200, { ok: true, report, doneAt: new Date().toISOString() });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Backfill failed.' });
  }
}
