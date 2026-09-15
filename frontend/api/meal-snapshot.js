import { allowMethods, json, supabaseRequest } from './_lib/supabase.js';

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeDeptCounts(source = {}) {
  const counts = {};
  for (const [k, v] of Object.entries(source)) {
    const n = Number(v);
    counts[String(k)] = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }
  return counts;
}

function normalizeDepartmentForMeals(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return 'OTHER';
  return raw;
}

function mealExclusionKey(roomId = '', bedNo = null) {
  return `${String(roomId || '').trim()}::${String(bedNo ?? '').trim()}`;
}

function classifyMealExclusion(row = {}, today = todayIsoDate()) {
  const fromDate = String(row?.from_date || '').slice(0, 10);
  const toDate = String(row?.to_date || '').slice(0, 10);
  const autoCheckedOut = Boolean(row?.auto_checked_out_at);

  if (!fromDate || !row?.reason) return 'invalid';
  if (row.reason === 'Exit' && autoCheckedOut) return 'completed';
  if (toDate && toDate <= today) return 'completed';
  if (fromDate > today) return 'upcoming';
  return 'active';
}

function buildActiveMealExclusionIndex(rows = [], date = todayIsoDate()) {
  const byOccupantId = new Set();
  const byStaffId = new Set();
  const byRoomBed = new Set();

  for (const row of rows) {
    if (classifyMealExclusion(row, date) !== 'active') continue;
    if (row.occupant_id) byOccupantId.add(String(row.occupant_id));
    if (row.staff_id) byStaffId.add(String(row.staff_id).trim().toLowerCase());
    if (row.room_id && row.bed_no != null) byRoomBed.add(mealExclusionKey(row.room_id, row.bed_no));
  }

  return { byOccupantId, byStaffId, byRoomBed };
}

function isExcludedFromMeals(occupant = {}, exclusionIndex = {}) {
  if (!occupant) return false;
  const id = occupant.id ? String(occupant.id) : '';
  const staffId = String(occupant.staff_id || '').trim().toLowerCase();
  const roomBed = mealExclusionKey(occupant.room_id, occupant.bed_no);

  return Boolean(
    (id && exclusionIndex.byOccupantId?.has(id))
    || (staffId && exclusionIndex.byStaffId?.has(staffId))
    || (occupant.room_id && occupant.bed_no != null && exclusionIndex.byRoomBed?.has(roomBed))
  );
}

async function fetchMealExclusionRows() {
  const rows = await supabaseRequest(
    '/rest/v1/meal_exclusions?select=*&order=from_date.desc&order=created_at.desc&limit=5000',
    { service: true }
  );
  return Array.isArray(rows) ? rows : [];
}

async function computeMealSnapshotForDate(date) {
  const [occupancyRows, exclusionRows] = await Promise.all([
    supabaseRequest(
      '/rest/v1/occupancy?select=id,staff_id,department,room_id,bed_no,status&status=eq.Active&limit=5000',
      { service: true }
    ),
    fetchMealExclusionRows(),
  ]);

  const occupants = Array.isArray(occupancyRows) ? occupancyRows : [];
  const exclusionIndex = buildActiveMealExclusionIndex(exclusionRows, date);
  const counts = {};

  for (const row of occupants) {
    if (isExcludedFromMeals(row, exclusionIndex)) continue;
    const dept = normalizeDepartmentForMeals(row.department);
    counts[dept] = (counts[dept] || 0) + 1;
  }

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  return { date, total, counts, sourceUpdatedAt: new Date().toISOString() };
}

async function upsertMealSnapshot(snapshot = {}) {
  if (!snapshot?.date) return null;

  const inserted = await supabaseRequest('/rest/v1/meal_history_daily', {
    method: 'POST',
    service: true,
    body: [{
      snapshot_date: snapshot.date,
      total_meals: snapshot.total || 0,
      department_counts: normalizeDeptCounts(snapshot.counts || {}),
      source_updated_at: snapshot.sourceUpdatedAt || new Date().toISOString(),
    }],
    prefer: 'resolution=merge-duplicates,return=representation',
  });

  return Array.isArray(inserted) ? inserted[0] : inserted;
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET', 'POST'])) return;

  // Validate cron secret — accepts CRON_SECRET (Vercel built-in) or BACKUP_CRON_SECRET (legacy)
  const cronSecret = process.env.CRON_SECRET || process.env.BACKUP_CRON_SECRET || '';
  if (cronSecret) {
    const authHeader = req.headers.authorization || '';
    if (authHeader !== `Bearer ${cronSecret}`) {
      return json(res, 401, { error: 'Unauthorized.' });
    }
  }

  try {
    const today = todayIsoDate();
    const snapshot = await computeMealSnapshotForDate(today);
    await upsertMealSnapshot(snapshot);

    return json(res, 200, {
      ok: true,
      date: today,
      total: snapshot.total,
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Snapshot failed.' });
  }
}
