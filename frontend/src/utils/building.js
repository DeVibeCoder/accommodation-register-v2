/**
 * Shared building / room utility helpers.
 *
 * Import from here instead of duplicating across services and pages.
 * All functions are pure and side-effect-free.
 */

/** Ordered list of known buildings (used for sorting and display). */
export const BUILDING_ORDER = ['OFFICE BUILDING', 'F&B BUILDING', 'VTV BUILDING'];

/** Human-readable label for each building name. */
export const BUILDING_LABELS = {
  'OFFICE BUILDING': 'Office Building',
  'F&B BUILDING': 'F&B Building',
  'VTV BUILDING': 'VTV Building',
};

/**
 * Derive the full building name from a room ID.
 * @example buildingFrom('OB-1-101') // → 'OFFICE BUILDING'
 */
export function buildingFrom(roomId = '') {
  if (roomId.startsWith('OB-'))  return 'OFFICE BUILDING';
  if (roomId.startsWith('FB-'))  return 'F&B BUILDING';
  if (roomId.startsWith('VTV-')) return 'VTV BUILDING';
  return 'UNKNOWN';
}

/**
 * Derive the 2-3 letter building code from a room ID.
 * @example buildingCodeFrom('FB-2-201') // → 'FB'
 */
export function buildingCodeFrom(roomId = '') {
  if (roomId.startsWith('OB-'))  return 'OB';
  if (roomId.startsWith('FB-'))  return 'FB';
  if (roomId.startsWith('VTV-')) return 'VTV';
  return '??';
}

/**
 * Returns true if the room ID belongs to a known building prefix.
 * @example isCurrentRoomId('OB-1-101') // → true
 */
export function isCurrentRoomId(roomId = '') {
  return /^(OB|FB|VTV)-/i.test(String(roomId));
}

/**
 * Natural-order comparison for room IDs so that
 * OB-1-2 sorts before OB-1-10.
 */
export function compareRoomIds(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Derive a room type label from bed count.
 * @example normalizeRoomType(1)  // → 'Single'
 * @example normalizeRoomType(4)  // → '4 Share'
 */
export function normalizeRoomType(totalBeds) {
  return totalBeds === 1 ? 'Single' : `${totalBeds} Share`;
}
