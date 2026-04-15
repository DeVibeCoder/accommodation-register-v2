import { supabase } from './supabaseClient';

const ROOM_TABLE_CANDIDATES = ['rooms', 'room_master', 'accommodation_rooms'];
let resolvedRoomTable = null;

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

function normalizeType(totalBeds) {
  return totalBeds === 1 ? 'Single' : `${totalBeds} Share`;
}

export function normalizeRoomRecord(row = {}) {
  const id = String(firstDefined(row.id, row.roomId, row.room_id, row.Room_ID, row['Room_ID'], '') || '');
  const totalBeds = Math.max(1, Number.parseInt(firstDefined(row.totalBeds, row.total_beds, row.capacity, row.Total_Beds, 1), 10) || 1);

  return {
    ...row,
    id,
    building: firstDefined(row.building, row.building_name, row.Building, buildingFrom(id)),
    buildingCode: firstDefined(row.buildingCode, row.building_code, row.Building_Code, row['Building_Code'], buildingCodeFrom(id)),
    floor: String(firstDefined(row.floor, row.level, row.Floor, '') || ''),
    roomNo: String(firstDefined(row.roomNo, row.room_no, row.Room_No, '') || ''),
    type: firstDefined(row.type, normalizeType(totalBeds)),
    roomType: firstDefined(row.roomType, row.room_type, row.Room_Type, 'Internal'),
    ac: toBool(firstDefined(row.ac, row.is_ac, row['AC/Non-AC'], false)),
    attached: toBool(firstDefined(row.attached, row.has_attached, row.Toilet_Type, true)),
    roomActive: firstDefined(row.roomActive, row.Room_Active, 'Yes'),
    totalBeds,
    beds: Array.from({ length: totalBeds }, (_, index) => ({
      bedId: `Bed ${index + 1}`,
      occupied: Boolean(row.beds?.[index]?.occupied),
      occupant: row.beds?.[index]?.occupant ?? null,
    })),
  };
}

function toDatabasePayload(room = {}, tableName) {
  const normalized = normalizeRoomRecord(room);

  if (tableName === 'rooms') {
    return {
      Room_ID: normalized.id,
      Building: normalized.building,
      Building_Code: normalized.buildingCode,
      Floor: normalized.floor,
      Room_No: normalized.roomNo || normalized.id,
      Room_Type: normalized.roomType,
      'AC/Non-AC': normalized.ac ? 'AC' : 'Non-AC',
      Toilet_Type: normalized.attached ? 'Attached' : 'Common',
      Room_Active: normalized.roomActive || 'Yes',
      Total_Beds: normalized.totalBeds,
      Used_Beds: normalized.beds.filter(b => b.occupied).length,
      Available_Beds: Math.max(0, normalized.totalBeds - normalized.beds.filter(b => b.occupied).length),
      Room_Status: normalized.totalBeds === 0 ? 'Vacant' : undefined,
    };
  }

  return {
    room_id: normalized.id,
    building: normalized.building,
    building_code: normalized.buildingCode,
    floor: normalized.floor,
    room_type: normalized.roomType,
    ac: Boolean(normalized.ac),
    attached: Boolean(normalized.attached),
    total_beds: normalized.totalBeds,
  };
}

async function runAcrossRoomTables(executor) {
  const tables = resolvedRoomTable
    ? [resolvedRoomTable, ...ROOM_TABLE_CANDIDATES.filter(name => name !== resolvedRoomTable)]
    : ROOM_TABLE_CANDIDATES;

  let lastError = null;

  for (const tableName of tables) {
    try {
      const result = await executor(tableName);
      if (!result?.error) {
        resolvedRoomTable = tableName;
        return result;
      }
      lastError = result.error;
      console.warn(`[Supabase] ${tableName} room request failed:`, result.error.message);
    } catch (error) {
      lastError = error;
      console.warn(`[Supabase] ${tableName} room request threw an exception:`, error.message || error);
    }
  }

  return { data: null, error: lastError };
}

export async function fetchRooms() {
  const { data, error } = await runAcrossRoomTables(tableName =>
    supabase.from(tableName).select('*').limit(1000)
  );

  if (error) {
    console.error('[Supabase] Unable to fetch rooms. Falling back to local room master.', error.message || error);
    return [];
  }

  return Array.isArray(data) ? data.map(normalizeRoomRecord) : [];
}

export async function updateRoom(roomId, updates) {
  if (!roomId) return null;

  const { error } = await runAcrossRoomTables(tableName => {
    const payload = toDatabasePayload({ id: roomId, ...updates }, tableName);
    const query = supabase.from(tableName).update(payload);
    return tableName === 'rooms' ? query.eq('Room_ID', roomId) : query.eq('room_id', roomId);
  });

  if (error) {
    console.error('[Supabase] Unable to update room on backend. Local UI state was preserved.', error.message || error);
    return null;
  }

  return true;
}
