import { apiRequest } from './apiClient';

function firstDefined(...values) {
  return values.find(value => value !== undefined && value !== null);
}

function toBool(value) {
  if (value === true || value === false) return value;
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === 'true' || normalized === 'yes' || normalized === '1' || normalized === 'ac' || normalized === 'attached';
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

function extractList(payload, fallbackKey) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.[fallbackKey])) return payload[fallbackKey];
  return [];
}

function toApiPayload(room = {}) {
  const normalized = normalizeRoomRecord(room);

  return {
    id: normalized.id,
    building: normalized.building,
    buildingCode: normalized.buildingCode,
    floor: normalized.floor,
    roomNo: normalized.roomNo || normalized.id,
    roomType: normalized.roomType,
    ac: Boolean(normalized.ac),
    attached: Boolean(normalized.attached),
    roomActive: normalized.roomActive || 'Yes',
    totalBeds: normalized.totalBeds,
    usedBeds: normalized.beds.filter(bed => bed.occupied).length,
    availableBeds: Math.max(0, normalized.totalBeds - normalized.beds.filter(bed => bed.occupied).length),
  };
}

export async function fetchRooms() {
  try {
    const data = await apiRequest('/api/rooms');
    return extractList(data, 'rooms').map(normalizeRoomRecord);
  } catch (error) {
    console.error('[API] Unable to fetch rooms. Falling back to local room master.', error.message || error);
    return [];
  }
}

export async function updateRoom(roomId, updates) {
  if (!roomId) return null;

  try {
    await apiRequest(`/api/rooms/${encodeURIComponent(roomId)}`, {
      method: 'PUT',
      body: toApiPayload({ id: roomId, ...updates }),
    });

    return true;
  } catch (error) {
    console.error('[API] Unable to update room on backend. Local UI state was preserved.', error.message || error);
    return null;
  }
}
