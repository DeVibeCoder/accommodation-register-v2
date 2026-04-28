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

async function insertInBatches(rows = []) {
  for (const batch of chunk(rows, 100)) {
    await supabaseRequest('/rest/v1/occupancy', {
      method: 'POST',
      service: true,
      body: batch,
      prefer: 'return=minimal',
    });
  }
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;

  try {
    const user = await requireRole(req, res, ['Admin', 'Accommodation']);
    if (!user) return;

    const payload = await readBody(req);
    const items = Array.isArray(payload?.occupants) ? payload.occupants : [];
    const replaceExisting = payload?.replace !== false;

    if (items.length === 0) {
      return json(res, 400, { error: 'No occupants were provided for import.' });
    }

    const rows = items
      .map(item => toActiveOccupancyRow(item))
      .filter(row => row.room_id && row.bed_no != null);

    if (rows.length === 0) {
      return json(res, 400, { error: 'No valid occupant rows were provided for import.' });
    }

    const latestByKey = new Map();
    for (const row of rows) {
      latestByKey.set(keyFor(row), row);
    }

    const uniqueRows = [...latestByKey.values()];

    if (replaceExisting) {
      await supabaseRequest('/rest/v1/occupancy?room_id=not.is.null', {
        method: 'DELETE',
        service: true,
        prefer: 'return=minimal',
      });

      await insertInBatches(uniqueRows);

      return json(res, 200, {
        success: true,
        mode: 'replace',
        imported: uniqueRows.length,
        updated: 0,
        inserted: uniqueRows.length,
        skipped: items.length - uniqueRows.length,
      });
    }

    const existingRows = await supabaseRequest(
      '/rest/v1/occupancy?select=id,room_id,bed_no,status&limit=5000',
      { service: true }
    );

    const existingByKey = new Map();
    for (const row of (Array.isArray(existingRows) ? existingRows : [])) {
      const key = keyFor(row);
      if (!existingByKey.has(key)) {
        existingByKey.set(key, row);
      }
    }

    const rowsToInsert = [];
    const rowsToUpdate = [];

    for (const row of uniqueRows) {
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
      await supabaseRequest(`/rest/v1/occupancy?id=eq.${encodeURIComponent(item.id)}`, {
        method: 'PATCH',
        service: true,
        body: item.row,
        prefer: 'return=minimal',
      });

      updatedCount += 1;
    }

    await insertInBatches(rowsToInsert);
    insertedCount = rowsToInsert.length;

    return json(res, 200, {
      success: true,
      mode: 'merge',
      imported: updatedCount + insertedCount,
      updated: updatedCount,
      inserted: insertedCount,
      skipped: items.length - uniqueRows.length,
    });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Unable to import occupancy data.' });
  }
}