import React from 'react';

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  background: 'rgba(30,40,60,0.55)',
  zIndex: 2000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
const modalStyle = {
  // Use .modal class for styling
};
const closeBtnStyle = {
  position: 'absolute',
  top: 18,
  right: 22,
  fontSize: 22,
  fontWeight: 700,
  color: '#1e315f',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  zIndex: 10,
};
const leftCol = {
  width: 270,
  background: '#f5f7fa',
  borderRight: '1px solid #e3eafc',
  overflowY: 'auto',
  maxHeight: 520,
  padding: '0 0 0 0',
};
const rightCol = {
  flex: 1,
  padding: '32px 32px 32px 32px',
  overflowY: 'auto',
  maxHeight: 520,
};
const roomListItem = (active) => ({
  padding: '18px 20px 12px 20px',
  borderBottom: '1px solid #e3eafc',
  background: active ? '#e3eafc' : 'none',
  cursor: 'pointer',
  fontWeight: active ? 700 : 500,
  color: active ? '#1e315f' : '#1a2330',
  transition: 'background 0.15s',
});
const occupantCard = {
  background: '#f5f7fa',
  borderRadius: 10,
  padding: '12px 18px',
  marginBottom: 12,
  display: 'flex',
  alignItems: 'center',
  gap: 18,
  fontSize: '1.01rem',
};




function RoomModal({ open, onClose, room }) {
  if (!open || !room) return null;
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div className="modal" style={modalStyle} onClick={e => e.stopPropagation()}>
        {/* TOP: Room ID and Close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e3eafc', padding: '18px 32px 12px 32px', width: '100%' }}>
          <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#1e315f', letterSpacing: 0.2 }}>Room {room.id}</div>
          <button style={closeBtnStyle} onClick={onClose} aria-label="Close">×</button>
        </div>
        {/* BODY: Two columns */}
        <div style={{ display: 'flex', width: '100%' }}>
          {/* LEFT: Room summary */}
          <div style={{ ...leftCol, padding: '32px 18px 18px 18px' }}>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', margin: '0 0 18px 0', color: '#1e315f' }}>Room Summary</div>
            <div style={{ marginBottom: 10, fontSize: 15 }}>Building: <b>{room.building}</b></div>
            <div style={{ marginBottom: 10, fontSize: 15 }}>Floor: <b>{room.floor}</b></div>
            <div style={{ marginBottom: 10, fontSize: 15 }}>Beds: <b>{room.totalBeds}</b></div>
            <div style={{ marginBottom: 10, fontSize: 15 }}>Occupied: <b>{room.occupiedBeds}</b></div>
            <div style={{ marginBottom: 10, fontSize: 15 }}>Available: <b>{room.availableBeds}</b></div>
            <div style={{ marginBottom: 10, fontSize: 15 }}>Status: <b>{room.status}</b></div>
          </div>
          {/* RIGHT: Occupants list */}
          <div style={{ ...rightCol, padding: '32px 32px 32px 32px' }}>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', margin: '0 0 18px 0', color: '#1e315f' }}>Occupants</div>
            <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {room.beds.filter(b => b.occupied).length === 0 && (
                <div style={{ color: '#7a869a', fontStyle: 'italic', fontSize: 15 }}>No occupants</div>
              )}
              {room.beds.map((bed, idx) => (
                bed.occupied && bed.occupant ? (
                  <div key={idx} style={{ ...occupantCard, background: '#fff', border: '1.5px solid #e3eafc', borderRadius: 10, boxShadow: '0 2px 8px #d0d7e2', gap: 14, fontSize: 15 }}>
                    <div style={{ fontWeight: 700, color: '#1e315f', minWidth: 90 }}>{bed.occupant.name}</div>
                    <div style={{ background: '#e3eafc', color: '#1e315f', borderRadius: 8, padding: '2px 10px', fontWeight: 600 }}>{bed.occupant.type}</div>
                    <div style={{ color: '#7a869a', fontWeight: 600 }}>Bed {bed.bedId}</div>
                    <div style={{ color: '#7a869a' }}>Dept: <b>{bed.occupant.department}</b></div>
                    <div style={{ color: '#7a869a' }}>Nationality: <b>{bed.occupant.nationality}</b></div>
                    <div style={{ color: '#3ec97a', fontWeight: 700 }}>{bed.occupant.status}</div>
                  </div>
                ) : null
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoomModal;
