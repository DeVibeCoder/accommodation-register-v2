import { apiRequest } from './apiClient';

function firstDefined(...values) {
  return values.find(value => value !== undefined && value !== null);
}

function normalizeOccupancyStatus(status, checkOut = '') {
  const normalized = String(status ?? '').trim().toLowerCase();
  if (!normalized) return checkOut ? 'Checked Out' : 'Active';
  if (normalized === 'active') return 'Active';
  if (normalized.includes('check') && normalized.includes('out')) return 'Checked Out';
  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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

export function normalizeOccupantRecord(row = {}) {
  const roomId = String(firstDefined(row.roomId, row.room_id, row.Room_ID, row['Room_ID'], '') || '');
  const bedValue = firstDefined(row.bedNo, row.bed_no, row.Bed, row['Bed'], 1);
  const staffId = String(firstDefined(row.staffId, row.staff_id, row['Staff ID'], '') || '');
  const name = firstDefined(row.name, row.fullName, row.full_name, row['Staff Name'], row['Full Name'], '');
  const checkOut = String(firstDefined(row.checkOut, row.check_out, row['Check-out'], '') || '');

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
    checkOut,
    status: normalizeOccupancyStatus(firstDefined(row.status, row['Status'], 'Active'), checkOut),
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

function toApiPayload(occupant = {}) {
  const normalized = normalizeOccupantRecord(occupant);
  const match = occupant?.__match && typeof occupant.__match === 'object'
    ? occupant.__match
    : normalized.__match;

  return {
    id: normalized.id ?? undefined,
    personType: normalized.personType,
    staffId: normalized.staffId || null,
    name: normalized.name || null,
    section: normalized.section || null,
    department: normalized.department || null,
    nationality: normalized.nationality || null,
    roomId: normalized.roomId || null,
    bedNo: normalized.bedNo || null,
    fasting: Boolean(normalized.fasting),
    checkIn: normalized.checkIn || null,
    checkOut: normalized.checkOut || null,
    status: normalizeOccupancyStatus(normalized.status, normalized.checkOut),
    building: normalized.building || null,
    buildingCode: normalized.buildingCode || null,
    match: {
      id: match?.id ?? undefined,
      roomId: match?.roomId ?? undefined,
      bedNo: match?.bedNo ?? undefined,
      staffId: match?.staffId ?? undefined,
      name: match?.name ?? undefined,
    },
  };
}

function extractList(payload, fallbackKey) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.[fallbackKey])) return payload[fallbackKey];
  return [];
}

export async function fetchOccupants() {
  try {
    const data = await apiRequest('/api/occupancy');
    return extractList(data, 'occupants').map(normalizeOccupantRecord);
  } catch (error) {
    console.error('[API] Unable to fetch occupants. Falling back to local data.', error.message || error);
    return [];
  }
}

export async function addOccupant(occupant) {
  const payload = toApiPayload(occupant);
  if (occupant?.__history) payload.__history = occupant.__history;

  try {
    const data = await apiRequest('/api/occupancy', {
      method: 'POST',
      body: payload,
    });

    const record = data?.occupant ?? data?.data ?? data;
    if (!record) return null;
    const normalized = normalizeOccupantRecord(record);
    if (data?.historyEntry) normalized.historyEntry = data.historyEntry;
    return normalized;
  } catch (error) {
    console.error('[API] Unable to add occupant. Kept local UI state.', error.message || error);
    return null;
  }
}

export async function importOccupants(occupants = [], options = {}) {
  const payload = {
    occupants: Array.isArray(occupants)
      ? occupants.map(item => toApiPayload(item))
      : [],
    replace: options?.replace !== false,
  };

  const data = await apiRequest('/api/occupancy/import', {
    method: 'POST',
    body: payload,
  });

  return {
    imported: Number(data?.imported || 0),
    updated: Number(data?.updated || 0),
    inserted: Number(data?.inserted || 0),
    skipped: Number(data?.skipped || 0),
  };
}

export async function updateOccupant(id, updates) {
  const payloadSource = id == null ? updates : { ...updates, id };
  const payload = toApiPayload(payloadSource);
  payload.__operation = 'mutate';

  if (updates?.__action) {
    payload.__action = updates.__action;
  }
  if (updates?.__method) {
    payload.__method = updates.__method;
  }
  if (updates?.__history) {
    payload.__history = updates.__history;
  }
  if (updates?.__allowConflictOccupantId) {
    payload.__allowConflictOccupantId = updates.__allowConflictOccupantId;
  }

  try {
    const data = await apiRequest('/api/occupancy', {
      method: 'POST',
      body: payload,
    });

    if (data?.success) {
      return { success: true, historyEntry: data?.historyEntry || null };
    }

    const record = data?.occupant ?? data?.data ?? data;
    if (!record) return null;
    const normalized = normalizeOccupantRecord(record);
    if (data?.historyEntry) normalized.historyEntry = data.historyEntry;
    return normalized;
  } catch (error) {
    const message = error?.message || 'Unable to update occupant.';
    console.error('[API] Unable to update occupant. UI changes were preserved locally.', message);
    return { success: false, error: message };
  }
}

export async function deleteOccupant(idOrOccupant) {
  const target = typeof idOrOccupant === 'object' ? idOrOccupant : { id: idOrOccupant };
  const payload = {
    ...toApiPayload(target),
    __operation: 'mutate',
    __method: 'DELETE',
    __action: target?.__action === 'checkout' ? 'checkout' : 'delete',
  };
  if (target?.__history) {
    payload.__history = target.__history;
  }

  try {
    await apiRequest('/api/occupancy', {
      method: 'POST',
      body: payload,
    });

    return true;
  } catch (error) {
    const message = error?.message || 'Unable to delete occupant from backend.';
    console.error('[API] Unable to delete occupant from backend. Record was removed only from local UI.', message);
    return { success: false, error: message };
  }
}

export async function clearAllOccupancyData() {
  try {
    await apiRequest('/api/occupancy', {
      method: 'DELETE',
    });

    return true;
  } catch (error) {
    console.error('[API] Unable to clear live occupancy data.', error.message || error);
    return null;
  }
}
