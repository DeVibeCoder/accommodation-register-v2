import React, { useMemo, useState } from 'react';
import RoomModal from '../components/RoomModal';
import { useOutletContext } from 'react-router-dom';
import { updateRoom as updateRoomRecord } from '../services/roomsService';

const STATUS_OPTIONS = ['All', 'Partial', 'Vacant', 'Full'];
const ROOM_TYPE_OPTIONS = ['Internal', 'Project', 'Quarantine'];
const BUILDING_ORDER = ['OFFICE BUILDING', 'F&B BUILDING', 'VTV BUILDING'];

function normalizeType(totalBeds) {
  return totalBeds === 1 ? 'Single' : `${totalBeds} Share`;
}

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

function compareRoomIds(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
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
  const { sidebarCollapsed, roomsState, setRoomsState } = useOutletContext();

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
    setEditRoomId(room.id);
    setEditBeds(String(room.totalBeds));
    setEditRoomType(room.roomType || 'Internal');
    setEditAcType(room.ac ? 'AC' : 'Non-AC');
    setIsEditOpen(true);
  }

  function closeEditModal() {
    setIsEditOpen(false);
    setEditRoomId('');
  }

  async function saveRoomEdits() {
    const nextTotalBeds = Math.max(1, parseInt(editBeds, 10) || 1);

    setRoomsState(prev => prev.map(room => {
      if (room.id !== editRoomId) return room;
      return {
        ...room,
        totalBeds: nextTotalBeds,
        type: normalizeType(nextTotalBeds),
        roomType: editRoomType,
        ac: editAcType === 'AC',
        beds: createBeds(nextTotalBeds, room.beds),
      };
    }));

    closeEditModal();

    await updateRoomRecord(editRoomId, {
      totalBeds: nextTotalBeds,
      type: normalizeType(nextTotalBeds),
      roomType: editRoomType,
      ac: editAcType === 'AC',
    });
  }

  return (
    <div
      className="page-container"
      style={{ width: '100%', maxWidth: '100%', margin: 0, padding: '24px 32px 0 32px', background: 'none', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', boxSizing: 'border-box' }}
    >
      {/* Filters */}
      <div style={{ marginBottom: 24, width: '100%' }}>
        <h1 style={{ fontWeight: 900, fontSize: '2rem', margin: '0 0 16px 0', color: '#1e315f', letterSpacing: 0.5 }}>
          Rooms <span style={{ fontWeight: 400, fontSize: '1.1rem', opacity: 0.7 }}>(Room Master)</span>
        </h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
          <select value={building} onChange={e => setBuilding(e.target.value)} style={{ padding: '10px 14px', borderRadius: 12, border: '1.5px solid #d0d7e2', fontWeight: 600, fontSize: 15, background: '#fff', minWidth: 150 }}>
            {buildingOptions.map(opt => (
              <option key={opt} value={opt}>{opt === 'All Buildings' ? 'Buildings: All' : opt}</option>
            ))}
          </select>
          <select value={acType} onChange={e => setAcType(e.target.value)} style={{ padding: '10px 14px', borderRadius: 12, border: '1.5px solid #d0d7e2', fontWeight: 600, fontSize: 15, background: '#fff', minWidth: 110 }}>
            {['All', 'AC', 'Non-AC'].map(opt => (
              <option key={opt} value={opt}>{opt === 'All' ? 'AC: All' : opt}</option>
            ))}
          </select>
          <select value={shareType} onChange={e => setShareType(e.target.value)} style={{ padding: '10px 14px', borderRadius: 12, border: '1.5px solid #d0d7e2', fontWeight: 600, fontSize: 15, background: '#fff', minWidth: 130 }}>
            {shareTypeOptions.map(opt => (
              <option key={opt} value={opt}>{opt === 'All' ? 'Share: All' : opt}</option>
            ))}
          </select>
          <select value={status} onChange={e => setStatus(e.target.value)} style={{ padding: '10px 14px', borderRadius: 12, border: '1.5px solid #d0d7e2', fontWeight: 600, fontSize: 15, background: '#fff', minWidth: 120 }}>
            {STATUS_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt === 'All' ? 'Status: All' : opt}</option>
            ))}
          </select>
          <button
            onClick={() => { setBuilding('All Buildings'); setAcType('All'); setShareType('All'); setStatus('All'); setSearch(''); }}
            style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: '#e3eafc', color: '#1e315f', fontWeight: 700, marginLeft: 6, fontSize: 15, cursor: 'pointer' }}
          >
            Clear Filters
          </button>
          <input
            className="search-bar"
            type="text"
            placeholder="Search Room ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginLeft: 'auto', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #d0d7e2', minWidth: 200, fontSize: 15, background: '#fff' }}
          />
        </div>
      </div>

      {/* Rooms Grid */}
      <div
        className="rooms-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, minmax(${sidebarCollapsed ? 230 : 250}px, 290px))`,
          gap: 16,
          justifyContent: 'start',
        }}
      >
        {sortedFilteredRooms.map(room => {
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
          let cardText = '#1e315f';
          let mutedText = '#6b7a94';
          let floorText = '#6b7a94';
          let statusColor = '#3b82f6';

          if (!isSpecialType) {
            if (occupied === 0) {
              statusColor = '#22c55e';
            } else if (occupied === room.totalBeds) {
              statusColor = '#94a3b8';
            }
            if (available > 0) {
              cardBg = '#fff8d9';
              cardBorder = '#d8ad1f';
              cardShadow = '0 0 0 2px #d8ad1f55, 0 10px 24px rgba(184,136,8,0.24)';
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
                padding: '12px 12px 12px 12px',
                outline: 'none',
                transition: 'box-shadow 0.18s, transform 0.14s',
                boxSizing: 'border-box',
              }}
              tabIndex={0}
              onClick={() => { setSelectedRoom(room); setIsModalOpen(true); }}
              onKeyPress={e => { if (e.key === 'Enter') { setSelectedRoom(room); setIsModalOpen(true); } }}
            >
              {/* Edit button - absolutely positioned, never shifts layout */}
              <button
                type="button"
                aria-label={`Edit ${room.id}`}
                onClick={event => openEditModal(room, event)}
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  width: 26,
                  height: 26,
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
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 20H8L18.5 9.5C19.3 8.7 19.3 7.4 18.5 6.6L17.4 5.5C16.6 4.7 15.3 4.7 14.5 5.5L4 16V20Z" stroke="#ffffff" strokeWidth="2.2" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Row 1: Room ID + Status badge (padded right to clear the absolute edit button) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7, paddingRight: 34 }}>
                <div style={{ fontWeight: 900, fontSize: '1rem', color: cardText, letterSpacing: 0.2, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {room.id}
                </div>
                <span style={{
                  background: isSpecialType ? 'rgba(255,255,255,0.20)' : `${statusColor}22`,
                  color: isSpecialType ? '#ffffff' : statusColor,
                  borderRadius: 999,
                  padding: '3px 8px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  {cardStatus}
                </span>
              </div>

              {/* Chips row - equal 3-column grid so all bubbles are same width */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5, marginBottom: 8 }}>
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
                      padding: '3px 2px',
                      fontSize: '0.71rem',
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
              <div style={{ marginBottom: 8 }}>
                <div style={{ textTransform: 'uppercase', color: mutedText, fontWeight: 700, fontSize: '0.76rem', letterSpacing: 0.32, lineHeight: 1.3 }}>
                  {`${room.building} | FLOOR ${room.floor}`}
                </div>
              </div>

              {/* Occupied / Available tiles */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 6 }}>
                <div style={{ borderRadius: 9, padding: '9px 8px', background: isSpecialType ? 'rgba(255,255,255,0.9)' : '#fff7ed', border: isSpecialType ? '1px solid rgba(255,255,255,0.6)' : '1px solid #ffbd78', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 78 }}>
                  <div style={{ color: '#cc7a00', fontSize: '1.72rem', fontWeight: 900, lineHeight: 1 }}>{occupied}</div>
                  <div style={{ color: '#ff9800', fontSize: '0.7rem', fontWeight: 700 }}>Occupied</div>
                </div>
                <div style={{ borderRadius: 9, padding: '9px 8px', background: isSpecialType ? 'rgba(255,255,255,0.9)' : '#edfff7', border: isSpecialType ? '1px solid rgba(255,255,255,0.6)' : '1px solid #8fe3ba', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 78 }}>
                  <div style={{ color: '#1d8f54', fontSize: '1.72rem', fontWeight: 900, lineHeight: 1 }}>{available}</div>
                  <div style={{ color: '#2aa464', fontSize: '0.7rem', fontWeight: 700 }}>Available</div>
                </div>
              </div>

              {/* Occupancy bar */}
              <div style={{ marginTop: 'auto' }}>
                <div style={{ height: 50, borderRadius: 9, background: isSpecialType ? 'rgba(255,255,255,0.15)' : '#fff1f1', overflow: 'hidden', border: `1px solid ${isSpecialType ? '#ffffff44' : '#efb3b3'}`, position: 'relative' }}>
                  <div style={{
                    height: '100%',
                    width: `${percent}%`,
                    background: occupancyBarFill,
                    borderRadius: 9,
                    transition: 'width 0.35s ease',
                  }} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 900, color: isSpecialType ? '#ffffff' : occupancyTextColor, lineHeight: 1, textShadow: percent >= 55 ? '0 1px 1px rgba(0,0,0,0.18)' : 'none' }}>{percent}%</span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: isSpecialType ? '#e0eaff' : occupancyLabelColor, marginTop: 2, textShadow: percent >= 55 ? '0 1px 1px rgba(0,0,0,0.15)' : 'none' }}>Occupied</span>
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
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.38)', display: 'grid', placeItems: 'center', zIndex: 1200, padding: 16 }}
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
              <button type="button" onClick={saveRoomEdits} style={{ padding: '8px 14px', borderRadius: 9, border: 'none', background: '#315fcf', color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: 14 }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Room Details Modal */}
      <RoomModal open={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedRoom(null); }} room={selectedRoom} />
    </div>
  );
}

export default Rooms;
