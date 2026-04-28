import { allowMethods, json, readBody, requireRole, supabaseRequest, toOccupancyRow } from '../_lib/supabase.js';

function chunk(items = [], size = 100) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function keyFor(row = {}) {
  return `${row.room_id || ''}::${row.bed_no ?? ''}`;
}

function toActiveOccupancyRow(item = {}) {
  const row = toOccupancyRow(item);
  return {
    ...row,
    check_out: null,
    status: 'Active',
  };
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;

  try {
    const user = await requireRole(req, res, ['Admin', 'Accommodation']);
    if (!user) return;

    const payload = await readBody(req);
    const items = Array.isArray(payload?.occupants) ? payload.occupants : [];

    if (items.length === 0) {
      return json(res, 400, { error: 'No occupants were provided for import.' });
    }

    const rows = items
      .map(item => toActiveOccupancyRow(item))
      .filter(row => row.room_id && row.bed_no != null);

    if (rows.length === 0) {
      return json(res, 400, { error: 'No valid occupant rows were provided for import.' });
    }

    const existingRows = await supabaseRequest(
      '/rest/v1/occupancy?select=id,room_id,bed_no,status&limit=5000',
      { service: true }
    );

    const existingByKey = new Map();
    for (const row of (Array.isArray(existingRows) ? existingRows : [])) {
      const key = keyFor(row);
      const current = existingByKey.get(key);
      const rowIsActive = String(row?.status || '').trim().toLowerCase() === 'active';
      const currentIsActive = String(current?.status || '').trim().toLowerCase() === 'active';
      if (!current || (rowIsActive && !currentIsActive)) {
        existingByKey.set(key, row);
      }
    }

    const latestByKey = new Map();
    for (const row of rows) {
      latestByKey.set(keyFor(row), row);
    }

    const rowsToInsert = [];
    const rowsToUpdate = [];

    for (const row of latestByKey.values()) {
      const existing = existingByKey.get(keyFor(row));
      if (existing?.id) {
        rowsToUpdate.push({ id: existing.id, row });
      } else {
        rowsToInsert.push(row);
      }
    }

    let updatedCount = 0;
    let insertedCount = 0;

    for (const item of rowsToUpdate) {
      const updated = await supabaseRequest(`/rest/v1/occupancy?id=eq.${encodeURIComponent(item.id)}`, {
        method: 'PATCH',
        service: true,
        body: item.row,
        prefer: 'return=minimal',
      });

      updatedCount += Array.isArray(updated) ? updated.length : 1;
    }

    for (const batch of chunk(rowsToInsert, 100)) {
      await supabaseRequest('/rest/v1/occupancy', {
        method: 'POST',
        service: true,
        body: batch,
        prefer: 'return=minimal',
      });
      insertedCount += batch.length;
    }

    return json(res, 200, {
      success: true,
      imported: updatedCount + insertedCount,
      updated: updatedCount,
      inserted: insertedCount,
      skipped: items.length - latestByKey.size,
    });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Unable to import occupancy data.' });
  }
}