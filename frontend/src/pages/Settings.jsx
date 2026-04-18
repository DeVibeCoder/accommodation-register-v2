import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { updateProfileRole } from '../services/authService';
import { clearAllOccupancyData } from '../services/occupancyService';
import { createRoom } from '../services/roomsService';

const roleDescriptions = [
  {
    role: 'Viewer',
    desc: 'Can only view everything. Cannot edit any data.'
  },
  {
    role: 'Accommodation',
    desc: 'Can view and edit Dashboard, Rooms, Occupancy, Stay History. Meals sections are hidden.'
  },
  {
    role: 'Admin',
    desc: 'Can do everything.'
  }
];

const defaultRoomForm = {
  building: 'OFFICE BUILDING',
  buildingCode: 'OB',
  floor: '1',
  roomNo: '',
  roomType: 'Internal',
  acType: 'AC',
  toiletType: 'Attached',
  roomActive: 'Yes',
  totalBeds: '1',
};

function normalizeType(totalBeds) {
  return totalBeds === 1 ? 'Single' : `${totalBeds} Share`;
}

function compareRoomIds(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function Settings({ user, setUser }) {
  const { roomsState = [], setRoomsState, setOccupants, setStayHistory } = useOutletContext();
  const [selectedRole, setSelectedRole] = useState(user?.role || 'Admin');
  const [roomForm, setRoomForm] = useState(defaultRoomForm);
  const [isResetting, setIsResetting] = useState(false);
  const [isSavingRoom, setIsSavingRoom] = useState(false);
  const [notice, setNotice] = useState('');
  const isAdmin = (user?.role || 'Admin') === 'Admin';

  const existingRoomIds = useMemo(() => new Set(roomsState.map(room => String(room.id || '').toUpperCase())), [roomsState]);

  const handleRoleChange = async (e) => {
    const nextRole = e.target.value;
    setSelectedRole(nextRole);

    const result = await updateProfileRole(user?.id, user?.email, nextRole);
    if (result.user) {
      setUser(result.user);
      setNotice(`Role updated to ${nextRole}.`);
    } else {
      console.error('[API Roles] Role update failed and was not persisted.');
      setNotice('Role update failed.');
    }
  };

  const handleResetData = async () => {
    if (!isAdmin || isResetting) return;

    const confirmed = window.confirm('This will remove all live occupancy and stay history data while keeping the room master. Continue?');
    if (!confirmed) return;

    setIsResetting(true);
    setNotice('');

    const result = await clearAllOccupancyData();
    if (result) {
      setOccupants([]);
      setStayHistory([]);
      localStorage.removeItem('tic_stay_history');
      setNotice('Occupancy and stay history were cleared. Rooms were kept.');
    } else {
      setNotice('Unable to clear the live data.');
    }

    setIsResetting(false);
  };

  const handleRoomInput = (e) => {
    const { name, value } = e.target;
    setRoomForm(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'building' && value === 'OFFICE BUILDING' ? { buildingCode: 'OB' } : {}),
      ...(name === 'building' && value === 'F&B BUILDING' ? { buildingCode: 'FB' } : {}),
      ...(name === 'building' && value === 'VTV BUILDING' ? { buildingCode: 'VTV' } : {}),
    }));
  };

  const handleAddRoom = async (e) => {
    e.preventDefault();
    if (!isAdmin || isSavingRoom) return;

    const roomId = `${roomForm.buildingCode}-${roomForm.floor}-${roomForm.roomNo}`.toUpperCase().trim();
    const totalBeds = Math.max(1, Number.parseInt(roomForm.totalBeds, 10) || 1);

    if (!roomForm.roomNo.trim()) {
      setNotice('Please enter a room number.');
      return;
    }

    if (existingRoomIds.has(roomId)) {
      setNotice(`Room ${roomId} already exists.`);
      return;
    }

    setIsSavingRoom(true);
    setNotice('');

    const saved = await createRoom({
      id: roomId,
      roomId,
      building: roomForm.building,
      buildingCode: roomForm.buildingCode,
      floor: roomForm.floor,
      roomNo: roomForm.roomNo.trim(),
      roomType: roomForm.roomType,
      ac: roomForm.acType === 'AC',
      attached: roomForm.toiletType === 'Attached',
      roomActive: roomForm.roomActive,
      totalBeds,
      usedBeds: 0,
      availableBeds: totalBeds,
    });

    if (saved) {
      setRoomsState(prev => [...prev, saved].sort((a, b) => compareRoomIds(a.id, b.id)));
      setRoomForm(defaultRoomForm);
      setNotice(`Room ${roomId} was added successfully.`);
    } else {
      setNotice('Unable to add the room.');
    }

    setIsSavingRoom(false);
  };

  const cardStyle = { background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #d0d7e2', padding: '24px 28px', marginBottom: 24 };
  const labelStyle = { display: 'flex', flexDirection: 'column', gap: 6, color: '#334155', fontWeight: 700, fontSize: 13 };
  const inputStyle = { fontSize: 14, padding: '10px 12px', borderRadius: 8, border: '1.5px solid #d0d7e2', fontWeight: 600, background: '#fff' };

  return (
    <div className="page-container" style={{ width: '100%', maxWidth: '100%', margin: 0, padding: '32px 32px 24px 32px', background: 'none', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', boxSizing: 'border-box' }}>
      {notice ? (
        <div style={{ marginBottom: 16, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 14px', fontWeight: 700 }}>
          {notice}
        </div>
      ) : null}

      <div style={cardStyle}>
        <h2 style={{ fontWeight: 800, fontSize: '1.3rem', color: '#1e315f', marginBottom: 18 }}>Role Management</h2>
        <div style={{ marginBottom: 18 }}>
          <label htmlFor="role-select" style={{ fontWeight: 700, fontSize: 16, marginRight: 16 }}>Select Role:</label>
          <select id="role-select" value={selectedRole} onChange={handleRoleChange} style={{ fontSize: 16, padding: '8px 18px', borderRadius: 8, border: '1.5px solid #d0d7e2', fontWeight: 600 }}>
            {roleDescriptions.map(r => (
              <option key={r.role} value={r.role}>{r.role}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          {roleDescriptions.map(r => (
            <div key={r.role} style={{ background: selectedRole === r.role ? '#e3eafc' : '#f5f7fa', color: '#1e315f', borderRadius: 10, padding: '18px 24px', fontWeight: 700, fontSize: 16, flex: '1 1 220px', textAlign: 'center', border: selectedRole === r.role ? '2px solid #1e315f' : '1.5px solid #d0d7e2' }}>
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>{r.role}</div>
              <div>{r.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1e315f', marginBottom: 10 }}>Test Data Reset</h2>
        <p style={{ color: '#64748b', fontWeight: 600, margin: '0 0 16px' }}>
          Clear live occupancy and stay history while keeping all room cards and room master data untouched.
        </p>
        <button
          onClick={handleResetData}
          disabled={!isAdmin || isResetting}
          style={{ padding: '11px 18px', borderRadius: 10, border: 'none', background: !isAdmin || isResetting ? '#cbd5e1' : '#dc2626', color: '#fff', fontWeight: 800, cursor: !isAdmin || isResetting ? 'not-allowed' : 'pointer' }}
        >
          {isResetting ? 'Clearing Data...' : 'Clear Occupancy Data'}
        </button>
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1e315f', marginBottom: 10 }}>Add Room</h2>
        <p style={{ color: '#64748b', fontWeight: 600, margin: '0 0 18px' }}>
          Add a new room to the live room master so it appears in the Rooms section for future use.
        </p>

        <form onSubmit={handleAddRoom} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <label style={labelStyle}>Building
            <select name="building" value={roomForm.building} onChange={handleRoomInput} style={inputStyle}>
              <option value="OFFICE BUILDING">Office Building</option>
              <option value="F&B BUILDING">F&B Building</option>
              <option value="VTV BUILDING">VTV Building</option>
            </select>
          </label>

          <label style={labelStyle}>Building Code
            <select name="buildingCode" value={roomForm.buildingCode} onChange={handleRoomInput} style={inputStyle}>
              <option value="OB">OB</option>
              <option value="FB">FB</option>
              <option value="VTV">VTV</option>
            </select>
          </label>

          <label style={labelStyle}>Floor
            <input name="floor" value={roomForm.floor} onChange={handleRoomInput} style={inputStyle} />
          </label>

          <label style={labelStyle}>Room No
            <input name="roomNo" value={roomForm.roomNo} onChange={handleRoomInput} style={inputStyle} placeholder="108" />
          </label>

          <label style={labelStyle}>Room Type
            <select name="roomType" value={roomForm.roomType} onChange={handleRoomInput} style={inputStyle}>
              <option value="Internal">Internal</option>
              <option value="Project">Project</option>
              <option value="Quarantine">Quarantine</option>
            </select>
          </label>

          <label style={labelStyle}>AC / Non-AC
            <select name="acType" value={roomForm.acType} onChange={handleRoomInput} style={inputStyle}>
              <option value="AC">AC</option>
              <option value="Non-AC">Non-AC</option>
            </select>
          </label>

          <label style={labelStyle}>Toilet Type
            <select name="toiletType" value={roomForm.toiletType} onChange={handleRoomInput} style={inputStyle}>
              <option value="Attached">Attached</option>
              <option value="Common">Common</option>
            </select>
          </label>

          <label style={labelStyle}>Room Active
            <select name="roomActive" value={roomForm.roomActive} onChange={handleRoomInput} style={inputStyle}>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </label>

          <label style={labelStyle}>Total Beds
            <input name="totalBeds" type="number" min="1" value={roomForm.totalBeds} onChange={handleRoomInput} style={inputStyle} />
          </label>

          <div style={{ display: 'flex', alignItems: 'end' }}>
            <button
              type="submit"
              disabled={!isAdmin || isSavingRoom}
              style={{ width: '100%', padding: '11px 18px', borderRadius: 10, border: 'none', background: !isAdmin || isSavingRoom ? '#cbd5e1' : '#2563eb', color: '#fff', fontWeight: 800, cursor: !isAdmin || isSavingRoom ? 'not-allowed' : 'pointer' }}
            >
              {isSavingRoom ? 'Adding Room...' : 'Add Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Settings;
