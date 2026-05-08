import { supabaseRequest } from './supabase.js';

const BACKUP_TABLE = 'system_backups';
const SCHEMA_VERSION = 1;

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function isMissingTableError(error, tableName) {
  const message = String(error?.message || '').toLowerCase();
  const target = String(tableName || '').toLowerCase();
  return message.includes('does not exist') && message.includes(target);
}

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function fetchAllRows(basePath, pageSize = 1000, maxRows = 50000) {
  const rows = [];
  let offset = 0;

  while (offset < maxRows) {
    const page = await supabaseRequest(`${basePath}${basePath.includes('?') ? '&' : '?'}limit=${pageSize}&offset=${offset}`, {
      service: true,
    });

    const list = Array.isArray(page) ? page : [];
    if (list.length === 0) break;

    rows.push(...list);
    if (list.length < pageSize) break;

    offset += pageSize;
  }

  if (rows.length >= maxRows) {
    throw new Error(`Backup row limit reached (${maxRows}). Increase maxRows before continuing.`);
  }

  return rows;
}

async function insertInBatches(path, rows, batchSize = 500) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await supabaseRequest(path, {
      method: 'POST',
      service: true,
      body: batch,
      prefer: 'return=minimal',
    });
  }
}

export async function ensureBackupTableAvailable() {
  try {
    await supabaseRequest(`/rest/v1/${BACKUP_TABLE}?select=id&limit=1`, { service: true });
    return true;
  } catch (error) {
    if (isMissingTableError(error, BACKUP_TABLE)) {
      throw new Error(
        'Backup table is missing. Run scripts/sql/system_backups.sql in Supabase SQL editor first.'
      );
    }
    throw error;
  }
}

function summarizeSnapshot(snapshot = {}) {
  const occupancy = Array.isArray(snapshot?.tables?.occupancy) ? snapshot.tables.occupancy.length : 0;
  const stayHistory = Array.isArray(snapshot?.tables?.stay_history) ? snapshot.tables.stay_history.length : 0;
  const mealExclusions = Array.isArray(snapshot?.tables?.meal_exclusions) ? snapshot.tables.meal_exclusions.length : 0;
  const mealHistoryDaily = Array.isArray(snapshot?.tables?.meal_history_daily) ? snapshot.tables.meal_history_daily.length : 0;
  const totalRows = occupancy + stayHistory + mealExclusions + mealHistoryDaily;

  return {
    occupancy,
    stayHistory,
    mealExclusions,
    mealHistoryDaily,
    totalRows,
  };
}

export async function listBackups(limit = 30) {
  await ensureBackupTableAvailable();

  const safeLimit = Math.min(Math.max(toInt(limit, 30), 1), 200);
  const rows = await supabaseRequest(
    `/rest/v1/${BACKUP_TABLE}?select=id,backup_key,backup_type,backup_day,note,row_count,summary,created_by,created_at&order=created_at.desc&limit=${safeLimit}`,
    { service: true }
  );

  return Array.isArray(rows)
    ? rows.map(row => ({
      id: row.id,
      key: row.backup_key,
      type: row.backup_type,
      day: row.backup_day,
      note: row.note || '',
      rowCount: Number(row.row_count || 0),
      summary: row.summary || {},
      createdBy: row.created_by || null,
      createdAt: row.created_at || null,
    }))
    : [];
}

function manualBackupKey() {
  const iso = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8);
  return `manual-${iso}-${rand}`;
}

async function readBackupByKey(key) {
  const rows = await supabaseRequest(
    `/rest/v1/${BACKUP_TABLE}?select=*&backup_key=eq.${encodeURIComponent(key)}&limit=1`,
    { service: true }
  );
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

export async function createBackup(options = {}) {
  await ensureBackupTableAvailable();

  const type = options.type === 'daily' ? 'daily' : 'manual';
  const day = String(options.backupDay || todayIsoDate()).slice(0, 10);
  const key = options.key || (type === 'daily' ? `daily-${day}` : manualBackupKey());
  const note = String(options.note || '').slice(0, 300);

  const existing = await readBackupByKey(key);
  if (existing) {
    return {
      id: existing.id,
      key: existing.backup_key,
      type: existing.backup_type,
      day: existing.backup_day,
      rowCount: Number(existing.row_count || 0),
      summary: existing.summary || {},
      createdAt: existing.created_at,
      createdBy: existing.created_by || null,
      note: existing.note || '',
      alreadyExisted: true,
    };
  }

  const [occupancy, stayHistory, mealExclusions] = await Promise.all([
    fetchAllRows('/rest/v1/occupancy?select=*'),
    fetchAllRows('/rest/v1/stay_history?select=*'),
    fetchAllRows('/rest/v1/meal_exclusions?select=*'),
  ]);

  let mealHistoryDaily = [];
  try {
    mealHistoryDaily = await fetchAllRows('/rest/v1/meal_history_daily?select=*');
  } catch (error) {
    if (!isMissingTableError(error, 'meal_history_daily')) {
      throw error;
    }
  }

  const snapshot = {
    schemaVersion: SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    source: type,
    tables: {
      occupancy,
      stay_history: stayHistory,
      meal_exclusions: mealExclusions,
      meal_history_daily: mealHistoryDaily,
    },
  };

  const summary = summarizeSnapshot(snapshot);

  const inserted = await supabaseRequest(`/rest/v1/${BACKUP_TABLE}`, {
    method: 'POST',
    service: true,
    body: [{
      backup_key: key,
      backup_type: type,
      backup_day: day,
      note: note || null,
      snapshot,
      summary,
      row_count: summary.totalRows,
      created_by: options.createdBy || null,
    }],
    prefer: 'return=representation',
  });

  const row = Array.isArray(inserted) ? inserted[0] : inserted;
  return {
    id: row?.id || null,
    key,
    type,
    day,
    note,
    rowCount: summary.totalRows,
    summary,
    createdAt: row?.created_at || snapshot.createdAt,
    createdBy: options.createdBy || null,
    alreadyExisted: false,
  };
}

async function readBackupById(id) {
  const rows = await supabaseRequest(
    `/rest/v1/${BACKUP_TABLE}?select=*&id=eq.${encodeURIComponent(id)}&limit=1`,
    { service: true }
  );
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

function normalizeSnapshot(row = {}) {
  const snapshot = row?.snapshot;
  if (!snapshot || typeof snapshot !== 'object') {
    throw new Error('Backup payload is invalid.');
  }

  const tables = snapshot.tables && typeof snapshot.tables === 'object' ? snapshot.tables : {};

  return {
    occupancy: Array.isArray(tables.occupancy) ? tables.occupancy : [],
    stayHistory: Array.isArray(tables.stay_history) ? tables.stay_history : [],
    mealExclusions: Array.isArray(tables.meal_exclusions) ? tables.meal_exclusions : [],
    mealHistoryDaily: Array.isArray(tables.meal_history_daily) ? tables.meal_history_daily : [],
  };
}

export async function restoreBackupById(backupId) {
  await ensureBackupTableAvailable();

  const backup = await readBackupById(backupId);
  if (!backup) {
    throw new Error('Backup not found.');
  }

  const snapshot = normalizeSnapshot(backup);

  await supabaseRequest('/rest/v1/occupancy?room_id=not.is.null', {
    method: 'DELETE',
    service: true,
    prefer: 'return=minimal',
  });

  await supabaseRequest('/rest/v1/stay_history?action=not.is.null', {
    method: 'DELETE',
    service: true,
    prefer: 'return=minimal',
  });

  await supabaseRequest('/rest/v1/meal_exclusions?id=not.is.null', {
    method: 'DELETE',
    service: true,
    prefer: 'return=minimal',
  });

  if (snapshot.occupancy.length > 0) {
    await insertInBatches('/rest/v1/occupancy', snapshot.occupancy, 400);
  }
  if (snapshot.stayHistory.length > 0) {
    await insertInBatches('/rest/v1/stay_history', snapshot.stayHistory, 400);
  }
  if (snapshot.mealExclusions.length > 0) {
    await insertInBatches('/rest/v1/meal_exclusions', snapshot.mealExclusions, 400);
  }

  let mealHistoryRestored = 0;
  if (snapshot.mealHistoryDaily.length > 0) {
    try {
      await supabaseRequest('/rest/v1/meal_history_daily?snapshot_date=not.is.null', {
        method: 'DELETE',
        service: true,
        prefer: 'return=minimal',
      });
      await insertInBatches('/rest/v1/meal_history_daily', snapshot.mealHistoryDaily, 400);
      mealHistoryRestored = snapshot.mealHistoryDaily.length;
    } catch (error) {
      if (!isMissingTableError(error, 'meal_history_daily')) {
        throw error;
      }
    }
  }

  return {
    backupId: backup.id,
    backupKey: backup.backup_key,
    restored: {
      occupancy: snapshot.occupancy.length,
      stayHistory: snapshot.stayHistory.length,
      mealExclusions: snapshot.mealExclusions.length,
      mealHistoryDaily: mealHistoryRestored,
    },
    restoredAt: new Date().toISOString(),
  };
}
