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
  width: 300,
  background: 'linear-gradient(180deg, #f8fbff 0%, #f2f6fc 100%)',
  borderRight: '1px solid #e3eafc',
  overflowY: 'auto',
  maxHeight: 520,
  padding: '24px 20px',
  boxSizing: 'border-box',
};
const rightCol = {
  flex: 1,
  padding: '24px',
  overflowY: 'auto',
  maxHeight: 520,
  background: '#ffffff',
  boxSizing: 'border-box',
};
const occupantCard = {
  background: '#ffffff',
  borderRadius: 14,
  padding: '14px 16px',
  marginBottom: 0,
  display: 'grid',
  gridTemplateColumns: '1.2fr 0.8fr 1.2fr auto',
  alignItems: 'center',
  gap: 12,
  fontSize: '0.97rem',
  border: '1px solid #dfe7f3',
  boxShadow: '0 4px 12px rgba(30,49,95,.06)',
};




function RoomModal({ open, onClose, room }) {
  if (!open || !room) return null;

  const statusLabel = room.occupiedBeds === 0 ? 'Vacant' : room.occupiedBeds === room.totalBeds ? 'Full' : 'Partial';
  const activeOccupants = room.beds.filter(b => b.occupied && b.occupant);

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div className="modal" style={{ ...modalStyle, background: '#fff', borderRadius: 18, width: 'min(1100px, 95vw)', boxShadow: '0 20px 60px rgba(15,23,42,.28)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e3eafc', padding: '18px 24px', width: '100%', boxSizing: 'border-box', background: '#fff' }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: '1.4rem', color: '#1e315f', letterSpacing: 0.2 }}>{room.id}</div>
            <div style={{ fontSize: 12.5, color: '#6b7a94', marginTop: 4 }}>{room.building} • Floor {room.floor}</div>
          </div>
          <button style={closeBtnStyle} onClick={onClose} aria-label="Close">×</button>
        </div>

        <div style={{ display: 'flex', width: '100%', minHeight: 460 }}>
          <div style={leftCol}>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', margin: '0 0 16px 0', color: '#1e315f' }}>Room Summary</div>

            <div style={{ display: 'grid', gap: 10 }}>
              {[
                ['Building', room.building],
                ['Floor', room.floor],
                ['Beds', room.totalBeds],
                ['Occupied', room.occupiedBeds],
                ['Available', room.availableBeds],
                ['Status', statusLabel],
              ].map(([label, value]) => (
                <div key={label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, color: '#7f93b3', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.6 }}>{label}</div>
                  <div style={{ marginTop: 4, fontSize: 15, fontWeight: 800, color: '#1e293b' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={rightCol}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1e315f' }}>Occupants</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', background: '#f8fafc', border: '1px solid #dbe4f0', padding: '6px 10px', borderRadius: 999 }}>
                {activeOccupants.length} active
              </div>
            </div>

            <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activeOccupants.length === 0 && (
                <div style={{ color: '#7a869a', fontStyle: 'italic', fontSize: 15, padding: '20px 4px' }}>No occupants in this room.</div>
              )}

              {activeOccupants.map((bed, idx) => (
                <div key={idx} style={occupantCard}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, color: '#1e315f', fontSize: 15 }}>{bed.occupant.name}</div>
                    <div style={{ color: '#64748b', fontSize: 12, marginTop: 3 }}>Staff ID: {bed.occupant.staffId || '-'}</div>
                  </div>

                  <div>
                    <span style={{ background: '#e3eafc', color: '#1e315f', borderRadius: 999, padding: '4px 10px', fontWeight: 700, fontSize: 12 }}>
                      {bed.occupant.personType || 'Occupant'}
                    </span>
                  </div>

                  <div style={{ color: '#475569', fontSize: 13, lineHeight: 1.45 }}>
                    <div><strong>Bed:</strong> {bed.bedId}</div>
                    <div><strong>Dept:</strong> {bed.occupant.department || '-'}</div>
                    <div><strong>Nationality:</strong> {bed.occupant.nationality || '-'}</div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: '#16a34a', fontWeight: 800, fontSize: 13, background: '#dcfce7', borderRadius: 999, padding: '4px 10px' }}>
                      {bed.occupant.status || 'Active'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoomModal;
