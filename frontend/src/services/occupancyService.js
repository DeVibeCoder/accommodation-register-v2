import { supabase } from './supabaseClient';

const OCCUPANT_TABLE_CANDIDATES = ['occupants', 'occupancy', 'accommodation_occupants'];
let resolvedOccupantTable = null;

function firstDefined(...values) {
  return values.find(value => value !== undefined && value !== null);
}

function toBool(value) {
  if (value === true || value === false) return value;
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === 'true' || normalized === 'yes' || normalized === '1';
}

function buildingFrom(roomId = '') {
  if (roomId.startsWith('OB-')) return 'OFFICE BUILDING';
  if (roomId.startsWith('FB-')) return 'F&B BUILDING';
  if (roomId.startsWith('VTV-')) return 'VTV BUILDING';
  return 'UNKNOWN';
}

function buildingCodeFrom(roomId = '') {
  if (roomId.startsWith('OB-')) return 'OB';
  if (roomId.startsWith('FB-')) return 'FB';
  if (roomId.startsWith('VTV-')) return 'VTV';
  return '??';
}

export function normalizeOccupantRecord(row = {}) {
  const roomId = String(firstDefined(row.roomId, row.room_id, row.Room_ID, row['Room_ID'], '') || '');
  const bedValue = firstDefined(row.bedNo, row.bed_no, row.Bed, row['Bed'], 1);
  const staffId = String(firstDefined(row.staffId, row.staff_id, row['Staff ID'], '') || '');
  const name = firstDefined(row.name, row.fullName, row.full_name, row['Staff Name'], row['Full Name'], '');

  return {
    ...row,
    id: firstDefined(row.id, row.record_id, row.occupant_id, null),
    personType: firstDefined(row.personType, row.person_type, row['Person Type'], 'Permanent'),
    staffId,
    name,
    section: firstDefined(row.section, row['Section'], ''),
    department: firstDefined(row.department, row['Department'], ''),
    nationality: firstDefined(row.nationality, row['Nationality'], ''),
    roomId,
    bedNo: Number.parseInt(bedValue, 10) || 1,
    fasting: toBool(firstDefined(row.fasting, row['Fasting'], false)),
    checkIn: String(firstDefined(row.checkIn, row.check_in, row['Check-in'], '') || ''),
    checkOut: String(firstDefined(row.checkOut, row.check_out, row['Check-out'], '') || ''),
    status: firstDefined(row.status, row['Status'], 'Active'),
    building: firstDefined(row.building, row.building_name, row['Building'], buildingFrom(roomId)),
    buildingCode: firstDefined(row.buildingCode, row.building_code, row['Building_Code'], buildingCodeFrom(roomId)),
    __match: {
      id: firstDefined(row.id, row.record_id, row.occupant_id, null),
      roomId,
      bedNo: Number.parseInt(bedValue, 10) || 1,
      staffId,
      name,
    },
  };
}

function toDatabasePayload(occupant = {}, tableName) {
  const normalized = normalizeOccupantRecord(occupant);

  if (tableName === 'occupancy') {
    return {
      'Staff Name': normalized.name || null,
      Department: normalized.department || null,
      Nationality: normalized.nationality || null,
      Room_ID: normalized.roomId || null,
      Bed: String(normalized.bedNo || ''),
      Status: normalized.status || 'Active',
    };
  }

  return {
    person_type: normalized.personType,
    staff_id: normalized.staffId || null,
    full_name: normalized.name || null,
    section: normalized.section || null,
    department: normalized.department || null,
    nationality: normalized.nationality || null,
    room_id: normalized.roomId || null,
    bed_no: normalized.bedNo || null,
    fasting: Boolean(normalized.fasting),
    check_in: normalized.checkIn || null,
    check_out: normalized.checkOut || null,
    status: normalized.status || 'Active',
    building: normalized.building || null,
    building_code: normalized.buildingCode || null,
  };
}

async function runAcrossOccupantTables(executor) {
  const tables = resolvedOccupantTable
    ? [resolvedOccupantTable, ...OCCUPANT_TABLE_CANDIDATES.filter(name => name !== resolvedOccupantTable)]
    : OCCUPANT_TABLE_CANDIDATES;

  let lastError = null;

  for (const tableName of tables) {
    try {
      const result = await executor(tableName);
      if (!result?.error) {
        resolvedOccupantTable = tableName;
        return result;
      }
      lastError = result.error;
      console.warn(`[Supabase] ${tableName} request failed:`, result.error.message);
    } catch (error) {
      lastError = error;
      console.warn(`[Supabase] ${tableName} request threw an exception:`, error.message || error);
    }
  }

  return { data: null, error: lastError };
}

export async function fetchOccupants() {
  const { data, error } = await runAcrossOccupantTables(tableName =>
    supabase.from(tableName).select('*').limit(2000)
  );

  if (error) {
    console.error('[Supabase] Unable to fetch occupants. Falling back to local data.', error.message || error);
    return [];
  }

  return Array.isArray(data) ? data.map(normalizeOccupantRecord) : [];
}

function applyOccupantMatch(query, occupant = {}, tableName) {
  const match = occupant.__match || occupant;

  if (tableName === 'occupancy') {
    let nextQuery = query;
    if (match.roomId != null) nextQuery = nextQuery.eq('Room_ID', match.roomId);
    if (match.bedNo != null) nextQuery = nextQuery.eq('Bed', String(match.bedNo));
    if (match.name) nextQuery = nextQuery.eq('Staff Name', match.name);
    return nextQuery;
  }

  if (match.id != null) return query.eq('id', match.id);

  let nextQuery = query;
  if (match.roomId != null) nextQuery = nextQuery.eq('room_id', match.roomId);
  if (match.bedNo != null) nextQuery = nextQuery.eq('bed_no', match.bedNo);
  return nextQuery;
}

export async function addOccupant(occupant) {
  const { data, error } = await runAcrossOccupantTables(tableName => {
    const payload = toDatabasePayload(occupant, tableName);
    return supabase.from(tableName).insert(payload).select().maybeSingle();
  });

  if (error) {
    console.error('[Supabase] Unable to add occupant. Kept local UI state.', error.message || error);
    return null;
  }

  return data ? normalizeOccupantRecord(data) : null;
}

export async function updateOccupant(id, updates) {
  const payloadSource = id == null ? updates : { ...updates, id };

  const { data, error } = await runAcrossOccupantTables(tableName => {
    const payload = toDatabasePayload(payloadSource, tableName);
    const query = supabase.from(tableName).update(payload);
    return applyOccupantMatch(query, payloadSource, tableName).select().maybeSingle();
  });

  if (error) {
    console.error('[Supabase] Unable to update occupant. UI changes were preserved locally.', error.message || error);
    return null;
  }

  return data ? normalizeOccupantRecord(data) : null;
}

export async function deleteOccupant(idOrOccupant) {
  const target = typeof idOrOccupant === 'object' ? idOrOccupant : { id: idOrOccupant };

  const { error } = await runAcrossOccupantTables(tableName => {
    const query = supabase.from(tableName).delete();
    return applyOccupantMatch(query, target, tableName);
  });

  if (error) {
    console.error('[Supabase] Unable to delete occupant from backend. Record was removed only from local UI.', error.message || error);
    return null;
  }

  return true;
}
