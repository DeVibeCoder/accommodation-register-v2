import React, { useMemo, useState } from 'react';
import RoomModal from '../components/RoomModal';
import { useOutletContext } from 'react-router-dom';
import { fetchRooms as fetchRoomsFromApi, updateRoom as updateRoomRecord } from '../services/roomsService';
import { BUILDING_ORDER, compareRoomIds, isCurrentRoomId, normalizeRoomType } from '../utils/building';

const STATUS_OPTIONS = ['All', 'Partial', 'Vacant', 'Full'];
const ROOM_TYPE_OPTIONS = ['Internal', 'Project', 'Quarantine'];

function createBeds(totalBeds, existingBeds = []) {
  return Array.from({ length: totalBeds }, (_, index) => {
    const existingBed = existingBeds[index];
    return {
      bedId: `Bed ${index + 1}`,
      occupied: Boolean(existingBed?.occupied),
      occupant: existingBed?.occupant ?? null,
    };
  });
}

function deriveRooms(rooms) {
  return rooms.map(room => {
    const occupiedBeds = room.beds.filter(b => b.occupied).length;
    const availableBeds = room.totalBeds - occupiedBeds;
    let occupancyStatus = 'Partial';
    if (occupiedBeds === 0) occupancyStatus = 'Vacant';
    else if (occupiedBeds === room.totalBeds) occupancyStatus = 'Full';
    return { ...room, occupiedBeds, availableBeds, occupancyStatus };
  });
}

function escapeCsvValue(value) {
  const str = value == null ? '' : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function downloadCsv(filename, headers, rows) {
  const csv = [headers.join(',')]
    .concat(rows.map(row => headers.map(header => escapeCsvValue(row[header])).join(',')))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function SaveToast({ notice, onClose }) {
  React.useEffect(() => {
    if (!notice?.open) return undefined;
    const timer = window.setTimeout(onClose, 2800);
    return () => window.clearTimeout(timer);
  }, [notice, onClose]);

  if (!notice?.open) return null;
  const isError = notice.type === 'error';

  return (
    <div style={{ position: 'fixed', right: 18, bottom: 18, zIndex: 3200 }}>
      <div
        style={{
          minWidth: 260,
          maxWidth: 420,
          background: isError
            ? 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)'
            : 'linear-gradient(135deg, #1d4ed8 0%, #0f766e 100%)',
          color: '#fff',
          borderRadius: 14,
          boxShadow: '0 16px 40px rgba(15,23,42,.28)',
          padding: '12px 14px',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: 13 }}>{notice.title || (isError ? 'Save Failed' : 'Changes Saved')}</div>
          <div style={{ marginTop: 2, fontSize: 12.5, lineHeight: 1.45 }}>{notice.message || ''}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{ border: 'none', background: 'rgba(255,255,255,.18)', color: '#fff', width: 24, height: 24, borderRadius: 999, cursor: 'pointer', fontWeight: 800 }}
        >
          X
        </button>
      </div>
    </div>
  );
}

function Rooms() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [building, setBuilding] = useState('All Buildings');
  const [acType, setAcType] = useState('All');
  const [shareType, setShareType] = useState('All');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editRoomId, setEditRoomId] = useState('');
  const [editBeds, setEditBeds] = useState('1');
  const [editRoomType, setEditRoomType] = useState('Internal');
  const [editAcType, setEditAcType] = useState('Non-AC');
  const [saveNotice, setSaveNotice] = useState({ open: false, type: 'success', title: '', message: '' });
  const { sidebarCollapsed, roomsState, occupants = [], setRoomsState, canEditAccommodation = true, canExportRooms = true, isMobile = false } = useOutletContext();

  const rooms = useMemo(() => deriveRooms(roomsState), [roomsState]);

  const buildingOptions = useMemo(() => {
    const existing = new Set(rooms.map(room => room.building));
    const ordered = BUILDING_ORDER.filter(b => existing.has(b));
    const others = [...existing].filter(b => !BUILDING_ORDER.includes(b)).sort();
    return ['All Buildings', ...ordered, ...others];
  }, [rooms]);

  const shareTypeOptions = useMemo(() => {
    const unique = [...new Set(rooms.map(room => room.type))];
    unique.sort((a, b) => {
      const aNum = a === 'Single' ? 1 : parseInt(a, 10);
      const bNum = b === 'Single' ? 1 : parseInt(b, 10);
      return aNum - bNum;
    });
    return ['All', ...unique];
  }, [rooms]);

  const filteredRooms = rooms.filter(room => {
    return (
      (building === 'All Buildings' || room.building === building) &&
      (acType === 'All' || (room.ac ? 'AC' : 'Non-AC') === acType) &&
      (shareType === 'All' || room.type === shareType) &&
      (status === 'All' || room.occupancyStatus === status) &&
      (search === '' || room.id.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const sortedFilteredRooms = useMemo(() => {
    const rank = BUILDING_ORDER.reduce((acc, name, index) => {
      acc[name] = index;
      return acc;
    }, {});

    return [...filteredRooms].sort((a, b) => {
      const rankA = rank[a.building] ?? 999;
      const rankB = rank[b.building] ?? 999;
      if (rankA !== rankB) return rankA - rankB;
      return compareRoomIds(a.id, b.id);
    });
  }, [filteredRooms]);

  function openEditModal(room, event) {
    event.stopPropagation();
    if (!canEditAccommodation) return;
    setEditRoomId(room.id);
    setEditBeds(String(room.totalBeds));
    setEditRoomType(room.roomType || 'Internal');
    setEditAcType(room.ac ? 'AC' : 'Non-AC');
    setIsEditOpen(true);
  }

  function exportRoomsCsv() {
    const headers = [
      'Building',
      'Building Code',
      'Floor',
      'Room No',
      'Room ID',
      'Room Type',
      'AC / Non-AC',
      'Toilet Type',
      'Room Active',
      'Total Beds',
      'Used Beds',
      'Available Beds',
      'Room Status',
      'Remarks',
    ];

    const rows = sortedFilteredRooms.map(room => ({
      'Building': room.building || '',
      'Building Code': room.buildingCode || '',
      'Floor': room.floor || '',
      'Room No': room.roomNo && room.roomNo !== room.id ? room.roomNo : String(room.id || '').split('-').slice(-1)[0],
      'Room ID': room.id || '',
      'Room Type': String(room.type || normalizeRoomType(room.totalBeds)).replace(/\s+Share$/i, '-Share'),
      'AC / Non-AC': room.ac ? 'AC' : 'Non-AC',
      'Toilet Type': room.attached ? 'Attached' : 'Common',
      'Room Active': /^(yes|y)$/i.test(String(room.roomActive || 'Yes')) ? 'Y' : 'N',
      'Total Beds': room.totalBeds || 0,
      'Used Beds': room.occupiedBeds || 0,
      'Available Beds': room.availableBeds || 0,
      'Room Status': String(room.occupancyStatus || '').toUpperCase(),
      'Remarks': '',
    }));

    downloadCsv('room-summary.csv', headers, rows);
  }

  function closeEditModal() {
    setIsEditOpen(false);
    setEditRoomId('');
  }

  async function saveRoomEdits() {
    const nextTotalBeds = Math.max(1, parseInt(editBeds, 10) || 1);
    const current = roomsState.find(room => room.id === editRoomId);
    if (!current) {
      closeEditModal();
      return;
    }

    const highestOccupiedBed = occupants
      .filter(o => o.roomId === editRoomId)
      .reduce((max, o) => Math.max(max, Number.parseInt(o?.bedNo, 10) || 1), 0);

    if (nextTotalBeds < highestOccupiedBed) {
      setSaveNotice({
        open: true,
        type: 'error',
        title: 'Cannot Reduce Bed Count',
        message: `Bed ${highestOccupiedBed} is currently occupied in ${editRoomId}. Move/check out occupants first.`,
      });
      return;
    }

    const occupiedCount = occupants.filter(o => o.roomId === editRoomId).length;

    const updatedRoom = {
      ...current,
      totalBeds: nextTotalBeds,
      type: normalizeRoomType(nextTotalBeds),
      roomType: editRoomType,
      ac: editAcType === 'AC',
      usedBeds: occupiedCount,
      availableBeds: Math.max(0, nextTotalBeds - occupiedCount),
      beds: createBeds(nextTotalBeds, current.beds),
    };

    const saved = await updateRoomRecord(editRoomId, {
      totalBeds: nextTotalBeds,
      roomType: editRoomType,
      ac: editAcType === 'AC',
    });
    if (!saved || saved?.success === false) {
      setSaveNotice({
        open: true,
        type: 'error',
        title: 'Save Failed',
        message: saved?.error || 'Unable to save room changes to backend. Please try again.',
      });
      return;
    }

    const refreshed = await fetchRoomsFromApi();
    const liveRooms = Array.isArray(refreshed) ? refreshed.filter(room => isCurrentRoomId(room?.id)) : [];

    if (liveRooms.length > 0) {
      setRoomsState(liveRooms.sort((a, b) => compareRoomIds(a.id, b.id)));
    } else {
      setRoomsState(prev => prev.map(room => (room.id === editRoomId ? updatedRoom : room)));
    }

    setSaveNotice({
      open: true,
      type: 'success',
      title: 'Changes Saved',
      message: `${editRoomId} updated to ${nextTotalBeds} bed${nextTotalBeds > 1 ? 's' : ''}.`,
    });
    closeEditModal();
  }

  return (
    <div
      className="page-container"
      style={{ width: '100%', maxWidth: '100%', margin: 0, padding: '16px 24px 0 24px', background: 'none', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', boxSizing: 'border-box' }}
    >
      {/* Filters */}
      <div style={{ marginBottom: 12, width: '100%' }}>
        <div style={{
          display: 'flex',
          gap: isMobile ? 4 : 10,
          alignItems: 'center',
          flexWrap: 'nowrap',
          width: '100%',
          overflowX: isMobile ? 'auto' : 'visible',
          paddingBottom: isMobile ? 4 : 0,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}>
          <select value={building} onChange={e => setBuilding(e.target.value)} style={{ padding: isMobile ? '5px 5px' : '10px 14px', borderRadius: isMobile ? 8 : 12, border: '1.5px solid #d0d7e2', fontWeight: 600, fontSize: isMobile ? 11 : 15, background: '#fff', minWidth: isMobile ? 90 : 150, flexShrink: 0 }}>
            {buildingOptions.map(opt => (
              <option key={opt} value={opt}>{opt === 'All Buildings' ? 'Bldg: All' : opt}</option>
            ))}
          </select>
          <select value={acType} onChange={e => setAcType(e.target.value)} style={{ padding: isMobile ? '5px 5px' : '10px 14px', borderRadius: isMobile ? 8 : 12, border: '1.5px solid #d0d7e2', fontWeight: 600, fontSize: isMobile ? 11 : 15, background: '#fff', minWidth: isMobile ? 60 : 110, flexShrink: 0 }}>
            {['All', 'AC', 'Non-AC'].map(opt => (
              <option key={opt} value={opt}>{opt === 'All' ? 'AC: All' : opt}</option>
            ))}
          </select>
          <select value={shareType} onChange={e => setShareType(e.target.value)} style={{ padding: isMobile ? '5px 5px' : '10px 14px', borderRadius: isMobile ? 8 : 12, border: '1.5px solid #d0d7e2', fontWeight: 600, fontSize: isMobile ? 11 : 15, background: '#fff', minWidth: isMobile ? 70 : 130, flexShrink: 0 }}>
            {shareTypeOptions.map(opt => (
              <option key={opt} value={opt}>{opt === 'All' ? 'Share: All' : opt}</option>
            ))}
          </select>
          <select value={status} onChange={e => setStatus(e.target.value)} style={{ padding: isMobile ? '5px 5px' : '10px 14px', borderRadius: isMobile ? 8 : 12, border: '1.5px solid #d0d7e2', fontWeight: 600, fontSize: isMobile ? 11 : 15, background: '#fff', minWidth: isMobile ? 70 : 120, flexShrink: 0 }}>
            {STATUS_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt === 'All' ? 'Status: All' : opt}</option>
            ))}
          </select>
          <button
            onClick={() => { setBuilding('All Buildings'); setAcType('All'); setShareType('All'); setStatus('All'); setSearch(''); }}
            style={{ padding: isMobile ? '5px 8px' : '10px 20px', borderRadius: isMobile ? 8 : 12, border: 'none', background: '#e3eafc', color: '#1e293b', fontWeight: 700, marginLeft: isMobile ? 0 : 6, fontSize: isMobile ? 11 : 15, cursor: 'pointer', flexShrink: 0 }}
          >
            {isMobile ? '✕' : 'Clear Filters'}
          </button>
          {canExportRooms ? (
            <button
              onClick={exportRoomsCsv}
              style={{ padding: isMobile ? '5px 8px' : '10px 20px', borderRadius: isMobile ? 8 : 12, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: isMobile ? 11 : 15, cursor: 'pointer', flexShrink: 0 }}
            >
              {isMobile ? 'CSV' : 'Export CSV'}
            </button>
          ) : null}
          <input
            className="search-bar"
            type="text"
            placeholder={isMobile ? 'Room ID…' : 'Search Room ID...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginLeft: 'auto', padding: isMobile ? '5px 8px' : '10px 14px', borderRadius: isMobile ? 8 : 12, border: '1.5px solid #d0d7e2', minWidth: isMobile ? 80 : 200, maxWidth: isMobile ? 120 : 260, width: '100%', flex: '1 1 80px', fontSize: isMobile ? 11 : 15, background: '#fff' }}
          />
        </div>
      </div>

      {/* Rooms Grid */}
      <div
        className="rooms-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : `repeat(auto-fit, minmax(${sidebarCollapsed ? 230 : 250}px, 290px))`,
          gap: isMobile ? 10 : 16,
          justifyContent: 'start',
        }}
      >
        {sortedFilteredRooms.map((room, roomIndex) => {
          const occupied = room.occupiedBeds;
          const available = room.availableBeds;
          const percent = Math.round((occupied / room.totalBeds) * 100);
          const redStart = Math.max(90 - Math.round(percent * 0.14), 72);
          const redEnd = Math.max(84 - Math.round(percent * 0.16), 64);
          const occupancyBarFill = `linear-gradient(90deg, hsl(8 80% ${redStart}%), hsl(2 76% ${redEnd}%))`;
          const occupancyTextColor = percent >= 55 ? '#ffffff' : '#9f1239';
          const occupancyLabelColor = percent >= 55 ? '#ffe4e6' : '#7c2d12';
          const isProject = room.roomType === 'Project';
          const isQuarantine = room.roomType === 'Quarantine';
          const isSpecialType = isProject || isQuarantine;

          let cardBg = '#ffffff';
          let cardBorder = '#0000002e';
          let cardShadow = '0 2px 10px rgba(30,40,90,0.06)';
          let cardText = '#1e293b';
          let mutedText = '#6b7a94';
          let floorText = '#6b7a94';
          let statusColor = '#3b82f6';

          if (!isSpecialType) {
            if (occupied === 0) {
              // Vacant — white card, green status badge
              statusColor = '#16a34a';
            } else if (occupied === room.totalBeds) {
              // Full — red card: immediately flags no-availability
              statusColor = '#dc2626';
              cardBg = '#fff1f2';
              cardBorder = '#fca5a5';
              cardShadow = '0 0 0 1.5px #fca5a555, 0 8px 20px rgba(239,68,68,0.13)';
            } else {
              // Partial — white card, amber status badge
              statusColor = '#d97706';
            }
          }

          if (isProject) {
            cardBg = 'linear-gradient(155deg, #16a34a 0%, #15803d 100%)';
            cardBorder = '#22c55e';
            cardShadow = '0 8px 24px rgba(34,197,94,0.30)';
            cardText = '#f0fdf4';
            mutedText = '#bbf7d0';
            floorText = '#dcfce7';
            statusColor = '#86efac';
          } else if (isQuarantine) {
            cardBg = 'linear-gradient(155deg, #c0392b 0%, #7b1010 100%)';
            cardBorder = '#e74c3c';
            cardShadow = '0 8px 24px rgba(160,40,40,0.32)';
            cardText = '#fff0f0';
            mutedText = '#ffbcbd';
            floorText = '#ffd4d4';
            statusColor = '#ffaaaa';
          }

          const cardStatus = occupied === 0 ? 'Vacant' : occupied === room.totalBeds ? 'Full' : 'Partial';

          return (
            <div
              key={room.id}
              style={{
                background: cardBg,
                borderRadius: 14,
                boxShadow: cardShadow,
                border: `1.5px solid ${cardBorder}`,
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
                cursor: 'pointer',
                position: 'relative',
                padding: isMobile ? '8px 8px' : '12px 12px',
                outline: 'none',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                boxSizing: 'border-box',
                animation: 'fadeUp 0.38s cubic-bezier(0.22,1,0.36,1) both',
                animationDelay: `${Math.min(roomIndex, 18) * 38}ms`,
              }}
              tabIndex={0}
              onClick={() => { setSelectedRoom(room); setIsModalOpen(true); }}
              onKeyPress={e => { if (e.key === 'Enter') { setSelectedRoom(room); setIsModalOpen(true); } }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(15,23,42,0.14)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = cardShadow; }}
            >
              {/* Edit button - absolutely positioned, never shifts layout */}
              {canEditAccommodation && (
                <button
                  type="button"
                  aria-label={`Edit ${room.id}`}
                  onClick={event => openEditModal(room, event)}
                  style={{
                    position: 'absolute',
                    top: isMobile ? 5 : 10,
                    right: isMobile ? 5 : 10,
                    width: isMobile ? 18 : 26,
                    height: isMobile ? 18 : 26,
                    borderRadius: 999,
                    border: isSpecialType ? '1px solid rgba(255,255,255,0.38)' : '1px solid #9db4ec',
                    background: isSpecialType ? 'rgba(255,255,255,0.22)' : '#93b2ff',
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer',
                    zIndex: 2,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  }}
                >
                  <svg width={isMobile ? 8 : 11} height={isMobile ? 8 : 11} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 20H8L18.5 9.5C19.3 8.7 19.3 7.4 18.5 6.6L17.4 5.5C16.6 4.7 15.3 4.7 14.5 5.5L4 16V20Z" stroke="#ffffff" strokeWidth="2.2" strokeLinejoin="round" />
                  </svg>
                </button>
              )}

              {/* Row 1: Room ID + Status badge (padded right to clear the absolute edit button) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: isMobile ? 4 : 7, paddingRight: 30 }}>
                <div style={{ fontWeight: 900, fontSize: isMobile ? '0.74rem' : '1rem', color: cardText, letterSpacing: 0.2, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {room.id}
                </div>
                <span style={{
                  background: isSpecialType ? 'rgba(255,255,255,0.20)' : `${statusColor}22`,
                  color: isSpecialType ? '#ffffff' : statusColor,
                  borderRadius: 999,
                  padding: isMobile ? '2px 6px' : '3px 8px',
                  fontSize: isMobile ? '0.60rem' : '0.72rem',
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  {cardStatus}
                </span>
              </div>

              {/* Chips row - equal 3-column grid so all bubbles are same width */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: isMobile ? 3 : 5, marginBottom: isMobile ? 4 : 8 }}>
                {[
                  { label: room.type, bg: isSpecialType ? 'rgba(255,255,255,0.18)' : '#e3eafc', color: isSpecialType ? '#f0f7ff' : '#40527b' },
                  { label: room.ac ? 'AC' : 'Non-AC', bg: isSpecialType ? 'rgba(255,255,255,0.14)' : '#f3e3fa', color: isSpecialType ? '#f0f7ff' : '#6c3a7c' },
                  { label: room.roomType || 'Internal', bg: isSpecialType ? 'rgba(255,255,255,0.14)' : '#eaf0ff', color: isSpecialType ? '#f0f7ff' : '#385183' },
                ].map((chip, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: chip.bg,
                      color: chip.color,
                      borderRadius: 999,
                      padding: isMobile ? '2px 1px' : '3px 2px',
                      fontSize: isMobile ? '0.60rem' : '0.71rem',
                      fontWeight: 700,
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'block',
                    }}
                  >
                    {chip.label}
                  </span>
                ))}
              </div>

              {/* Building + Floor */}
              <div style={{ marginBottom: isMobile ? 4 : 8 }}>
                <div style={{ textTransform: 'uppercase', color: mutedText, fontWeight: 700, fontSize: isMobile ? '0.60rem' : '0.76rem', letterSpacing: 0.32, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {`${room.building} | FL ${room.floor}`}
                </div>
              </div>

              {/* Occupied / Available tiles */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isMobile ? 4 : 7, marginBottom: isMobile ? 4 : 6 }}>
                <div style={{ borderRadius: 9, padding: isMobile ? '4px 4px' : '9px 8px', background: isSpecialType ? 'rgba(255,255,255,0.9)' : '#fff7ed', border: isSpecialType ? '1px solid rgba(255,255,255,0.6)' : '1px solid #ffbd78', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, minHeight: isMobile ? 44 : 78 }}>
                  <div style={{ color: '#cc7a00', fontSize: isMobile ? '1.05rem' : '1.72rem', fontWeight: 900, lineHeight: 1 }}>{occupied}</div>
                  <div style={{ color: '#ff9800', fontSize: isMobile ? '0.56rem' : '0.65rem', fontWeight: 700 }}>Occupied</div>
                </div>
                <div style={{ borderRadius: 9, padding: isMobile ? '4px 4px' : '9px 8px', background: isSpecialType ? 'rgba(255,255,255,0.9)' : '#edfff7', border: isSpecialType ? '1px solid rgba(255,255,255,0.6)' : '1px solid #8fe3ba', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, minHeight: isMobile ? 44 : 78 }}>
                  <div style={{ color: '#1d8f54', fontSize: isMobile ? '1.05rem' : '1.72rem', fontWeight: 900, lineHeight: 1 }}>{available}</div>
                  <div style={{ color: '#2aa464', fontSize: isMobile ? '0.56rem' : '0.65rem', fontWeight: 700 }}>Available</div>
                </div>
              </div>

              {/* Occupancy bar */}
              <div style={{ marginTop: 'auto' }}>
                <div style={{ height: isMobile ? 30 : 50, borderRadius: 9, background: isSpecialType ? 'rgba(255,255,255,0.15)' : '#fff1f1', overflow: 'hidden', border: `1px solid ${isSpecialType ? '#ffffff44' : '#efb3b3'}`, position: 'relative' }}>
                  <div style={{
                    height: '100%',
                    width: `${percent}%`,
                    background: occupancyBarFill,
                    borderRadius: 9,
                    transition: 'width 0.35s ease',
                  }} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ fontSize: isMobile ? '0.9rem' : '1.2rem', fontWeight: 900, color: isSpecialType ? '#ffffff' : occupancyTextColor, lineHeight: 1, textShadow: percent >= 55 ? '0 1px 1px rgba(0,0,0,0.18)' : 'none' }}>{percent}%</span>
                    <span style={{ fontSize: isMobile ? '0.56rem' : '0.68rem', fontWeight: 700, color: isSpecialType ? '#e0eaff' : occupancyLabelColor, marginTop: 2, textShadow: percent >= 55 ? '0 1px 1px rgba(0,0,0,0.15)' : 'none' }}>Occupied</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Room Modal */}
      {isEditOpen && (
        <div
          style={{ position: 'fixed', top: isMobile ? 50 : 62, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.38)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1200, padding: 16, overflowY: 'auto' }}
          onClick={closeEditModal}
        >
          <div
            style={{ width: '100%', maxWidth: 360, background: '#ffffff', borderRadius: 14, border: '1px solid #d6dfef', boxShadow: '0 20px 44px rgba(21,35,71,0.22)', padding: 20 }}
            onClick={event => event.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 14px 0', color: '#1f3263', fontSize: '1rem', fontWeight: 800 }}>Edit Room</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              <label style={{ display: 'grid', gap: 4, fontSize: 13, color: '#55658b', fontWeight: 700 }}>
                Room ID
                <input value={editRoomId} readOnly style={{ padding: '9px 10px', borderRadius: 9, border: '1px solid #d4dceb', background: '#f6f8fc', color: '#4a5a80', fontWeight: 700, fontSize: 14 }} />
              </label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13, color: '#55658b', fontWeight: 700 }}>
                Beds
                <input type="number" min={1} value={editBeds} onChange={event => setEditBeds(event.target.value)} style={{ padding: '9px 10px', borderRadius: 9, border: '1px solid #cfd8ea', background: '#fff', color: '#1f315e', fontWeight: 700, fontSize: 14 }} />
              </label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13, color: '#55658b', fontWeight: 700 }}>
                Room Type
                <select value={editRoomType} onChange={event => setEditRoomType(event.target.value)} style={{ padding: '9px 10px', borderRadius: 9, border: '1px solid #cfd8ea', background: '#fff', color: '#1f315e', fontWeight: 700, fontSize: 14 }}>
                  {ROOM_TYPE_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label style={{ display: 'grid', gap: 4, fontSize: 13, color: '#55658b', fontWeight: 700 }}>
                AC / Non-AC
                <select value={editAcType} onChange={event => setEditAcType(event.target.value)} style={{ padding: '9px 10px', borderRadius: 9, border: '1px solid #cfd8ea', background: '#fff', color: '#1f315e', fontWeight: 700, fontSize: 14 }}>
                  <option value="AC">AC</option>
                  <option value="Non-AC">Non-AC</option>
                </select>
              </label>
            </div>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={closeEditModal} style={{ padding: '8px 14px', borderRadius: 9, border: '1px solid #d4dded', background: '#f8faff', color: '#40527a', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button type="button" onClick={saveRoomEdits} style={{ padding: '8px 14px', borderRadius: 9, border: 'none', background: '#6366f1', color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: 14 }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Room Details Modal */}
      <RoomModal open={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedRoom(null); }} room={selectedRoom} />

      <SaveToast
        notice={saveNotice}
        onClose={() => setSaveNotice({ open: false, type: 'success', title: '', message: '' })}
      />
    </div>
  );
}

export default Rooms;
