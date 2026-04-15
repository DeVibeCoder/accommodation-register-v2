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
  width: 36,
  height: 36,
  borderRadius: 999,
  fontSize: 22,
  fontWeight: 700,
  color: '#1e315f',
  background: '#f8fbff',
  border: '1px solid #d7e3f3',
  cursor: 'pointer',
  zIndex: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
  flexShrink: 0,
};
const summaryGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
  gap: 6,
};
const tableHeaderStyle = {
  display: 'grid',
  gridTemplateColumns: '56px 100px 1.35fr 1.25fr 0.95fr 0.95fr',
  gap: 12,
  alignItems: 'center',
  padding: '12px 16px',
  background: 'linear-gradient(180deg, #f8fbff 0%, #f3f7fd 100%)',
  borderBottom: '1px solid #dfe6f1',
  position: 'sticky',
  top: 0,
  zIndex: 2,
};
const tableRowStyle = (index) => ({
  display: 'grid',
  gridTemplateColumns: '56px 100px 1.35fr 1.25fr 0.95fr 0.95fr',
  gap: 12,
  alignItems: 'center',
  padding: '12px 16px',
  background: index % 2 === 0 ? '#ffffff' : '#f8fbff',
  borderBottom: '1px solid #ebf0f6',
  fontSize: 13.5,
});




function RoomModal({ open, onClose, room }) {
  if (!open || !room) return null;

  const statusLabel = room.occupiedBeds === 0 ? 'Vacant' : room.occupiedBeds === room.totalBeds ? 'Full' : 'Partial';
  const activeOccupants = room.beds.filter(b => b.occupied && b.occupant);
  const summaryItems = [
    ['Building', room.building],
    ['Floor', room.floor],
    ['Beds', room.totalBeds],
    ['Occupied', room.occupiedBeds],
    ['Available', room.availableBeds],
    ['Status', statusLabel],
  ];

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div
        className="modal"
        style={{
          ...modalStyle,
          background: '#fff',
          borderRadius: 18,
          width: 'min(1100px, 94vw)',
          height: 'min(680px, 88vh)',
          boxShadow: '0 20px 60px rgba(15,23,42,.28)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid #e3eafc', padding: '16px 20px', width: '100%', boxSizing: 'border-box', background: '#fff' }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: '1.45rem', color: '#1e315f', letterSpacing: 0.2 }}>{room.id}</div>
            <div style={{ fontSize: 12.5, color: '#6b7a94', marginTop: 4 }}>{room.building} | FLOOR {room.floor}</div>
          </div>
          <button style={closeBtnStyle} onClick={onClose} aria-label="Close">×</button>
        </div>

        <div style={{ padding: '16px 20px 10px', background: '#fff', flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontWeight: 800, fontSize: '1.02rem', color: '#1e315f' }}>Occupants</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', background: '#f8fafc', border: '1px solid #dbe4f0', padding: '6px 10px', borderRadius: 999 }}>
              {activeOccupants.length} active
            </div>
          </div>

          <div style={{ border: '1px solid #dfe6f1', borderRadius: 14, overflow: 'hidden', background: '#fff', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={tableHeaderStyle}>
              {['#', 'ID', 'Name', 'Department', 'Type', 'Nationality'].map(label => (
                <div key={label} style={{ fontSize: 10.5, fontWeight: 800, color: '#7f93b3', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  {label}
                </div>
              ))}
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {activeOccupants.length === 0 ? (
                <div style={{ padding: '22px 16px', color: '#7a869a', fontStyle: 'italic', fontSize: 14.5 }}>No occupants in this room.</div>
              ) : (
                activeOccupants.map((bed, idx) => (
                  <div key={idx} style={tableRowStyle(idx)}>
                    <div style={{ fontWeight: 800, color: '#1e315f' }}>{idx + 1}</div>
                    <div style={{ color: '#64748b', fontWeight: 700 }}>{bed.occupant.staffId || '-'}</div>
                    <div style={{ color: '#1e293b', fontWeight: 800, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bed.occupant.name}</div>
                    <div style={{ color: '#475569', fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bed.occupant.department || '-'}</div>
                    <div>
                      <span style={{ background: '#e3eafc', color: '#1e315f', borderRadius: 999, padding: '4px 10px', fontWeight: 700, fontSize: 12 }}>
                        {bed.occupant.personType || 'Occupant'}
                      </span>
                    </div>
                    <div style={{ color: '#475569', fontWeight: 600 }}>{bed.occupant.nationality || '-'}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: '0 20px 16px', background: '#fff', flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '0.92rem', marginBottom: 6, color: '#1e315f' }}>Room Summary</div>
          <div style={summaryGrid}>
            {summaryItems.map(([label, value]) => (
              <div key={label} style={{ background: '#f8fbff', border: '1px solid #dde7f3', borderRadius: 8, padding: '6px 8px', minWidth: 0 }}>
                <div style={{ fontSize: 9, color: '#7f93b3', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
                <div style={{ marginTop: 1, fontSize: 12.5, fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoomModal;
