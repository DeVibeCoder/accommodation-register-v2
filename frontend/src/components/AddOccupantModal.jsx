import React, { useState, useEffect } from 'react';

const DEPARTMENT_OPTIONS = [
  'THILAFUSHI INDUSTRIAL COMPLEX',
  'QMARINE',
  'VILLA TRADE CENTER 2',
  'VILLA MARINE TRANSPORT',
  'VILLA TRADING',
  'LOGISTICS',
  'MAXX ROYAL',
  'OTHER',
];

function toDepartmentValue(selected, otherValue) {
  if (selected !== 'OTHER') return selected;
  const custom = String(otherValue || '').trim();
  return custom ? `OTHER - ${custom}` : 'OTHER';
}

function parseDepartmentValue(value) {
  const raw = String(value || '').trim();
  if (!raw) return { selected: '', other: '' };
  if (!/^other(\b|\s|[-_/(:])/i.test(raw)) return { selected: raw, other: '' };
  const other = raw.replace(/^other\s*[-:/()]*\s*/i, '').trim();
  return { selected: 'OTHER', other };
}

/* Detect viewport width for responsive behaviour */
function useViewportWidth() {
  const [w, setW] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1200));
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return w;
}

function AddOccupantModal({ open, onClose, rooms, onAdd }) {
  const vw = useViewportWidth();
  const isMobile = vw < 768;
  const isTablet = vw >= 768 && vw < 1024;

  const [form, setForm] = useState({
    personType: '', staffId: '', fullName: '', section: '',
    department: '', otherDepartment: '', nationality: '',
    roomId: '', bedId: '', fasting: '', checkin: '',
  });
  const [errors, setErrors] = useState({});

  const selectedRoom = rooms.find(r => r.id === form.roomId);
  const availableBeds = selectedRoom ? selectedRoom.beds.filter(b => !b.occupied) : [];

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value, ...(name === 'roomId' ? { bedId: '' } : {}) }));
    setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.personType)  e.personType  = 'Required';
    if (!form.staffId)     e.staffId     = 'Required';
    if (!form.fullName)    e.fullName    = 'Required';
    if (!form.department)  e.department  = 'Required';
    if (form.department === 'OTHER' && !String(form.otherDepartment || '').trim()) e.otherDepartment = 'Required';
    if (!form.nationality) e.nationality = 'Required';
    if (!form.roomId)      e.roomId      = 'Required';
    if (!form.bedId)       e.bedId       = 'Required';
    if (!form.checkin)     e.checkin     = 'Required';
    if (selectedRoom?.beds.find(b => b.bedId === form.bedId && b.occupied)) e.bedId = 'Bed already occupied';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (!validate()) return;
    onAdd({ ...form, department: toDepartmentValue(form.department, form.otherDepartment) });
    onClose();
    setForm({ personType: '', staffId: '', fullName: '', section: '', department: '', otherDepartment: '', nationality: '', roomId: '', bedId: '', fasting: '', checkin: '' });
    setErrors({});
  };

  if (!open) return null;

  /* ── Input font-size ≥ 16px on mobile to prevent iOS zoom ── */
  const inpFontSize = isMobile ? 16 : 13;

  const lbl = { display: 'flex', flexDirection: 'column', fontWeight: 600, fontSize: isMobile ? 13 : 12, color: '#475569', gap: 4 };
  const inp = {
    width: '100%', boxSizing: 'border-box',
    padding: isMobile ? '11px 12px' : '7px 10px',
    borderRadius: 9, border: '1.5px solid #e2e8f0',
    fontSize: inpFontSize, fontWeight: 500,
    color: '#1e293b', background: '#f8fafc', outline: 'none',
    minHeight: isMobile ? 44 : 'auto',   /* 44px touch target on mobile */
  };
  const errStyle = { color: '#dc2626', fontSize: 11, marginTop: 2 };

  /* ── Layout variants ── */
  const overlayStyle = isMobile
    ? {
        /* Mobile: dim backdrop, modal slides up from bottom */
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 3000,
        background: 'rgba(15,23,42,0.55)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'fadeIn 0.18s ease both',
      }
    : {
        /* Tablet / Desktop: below the 62px header, scrollable */
        position: 'fixed', top: 62, left: 0, right: 0, bottom: 0,
        zIndex: 3000,
        background: 'rgba(15,23,42,0.5)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        overflowY: 'auto', padding: '12px',
        animation: 'fadeIn 0.18s ease both',
      };

  const modalStyle = isMobile
    ? {
        /* Mobile bottom sheet — takes up to 88% of screen height */
        background: '#fff',
        borderRadius: '18px 18px 0 0',
        width: '100%',
        maxHeight: '88vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 -8px 40px rgba(15,23,42,0.22)',
        animation: 'slideUpSheet 0.28s cubic-bezier(0.22,1,0.36,1) both',
      }
    : {
        /* Tablet / Desktop — centred card */
        background: '#fff',
        borderRadius: 14,
        width: '100%',
        maxWidth: isTablet ? 520 : 660,
        margin: 'auto 0',
        maxHeight: 'calc(100vh - 94px)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(15,23,42,0.22)',
        animation: 'scaleIn 0.22s cubic-bezier(0.22,1,0.36,1) both',
      };

  const gridCols = isMobile
    ? '1fr'                          /* Mobile: always single column     */
    : 'repeat(auto-fit, minmax(200px, 1fr))'; /* Tablet+: 1 or 2 col     */

  return (
    <div onClick={onClose} style={overlayStyle}>
      {/* Drag handle pill on mobile */}
      {isMobile && (
        <div style={{ position: 'absolute', bottom: '88vh', left: '50%', transform: 'translateX(-50%)', width: 40, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.5)' }} />
      )}

      <div onClick={e => e.stopPropagation()} style={modalStyle}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: isMobile ? '16px 20px' : '13px 18px',
          borderBottom: '1px solid #f1f5f9',
          background: 'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)',
          flexShrink: 0,
        }}>
          <h2 style={{ margin: 0, fontWeight: 800, fontSize: isMobile ? '1.05rem' : '1rem', color: '#1e293b' }}>
            Add Occupant
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 14, fontWeight: 700 }}
          >✕</button>
        </div>

        {/* ── Scrollable form body ── */}
        <div style={{ overflowY: 'auto', padding: isMobile ? '16px' : '14px 18px', flex: 1, minHeight: 0, WebkitOverflowScrolling: 'touch' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: isMobile ? '12px' : '10px 16px', marginBottom: 14 }}>

              <label style={lbl}>Person Type*
                <select name="personType" value={form.personType} onChange={handleChange} style={inp}>
                  <option value="">Select</option>
                  <option value="Permanent">Permanent</option>
                  <option value="Temporary">Temporary</option>
                  <option value="Project">Project</option>
                </select>
                {errors.personType && <span style={errStyle}>{errors.personType}</span>}
              </label>

              <label style={lbl}>Staff ID*
                <input name="staffId" value={form.staffId} onChange={handleChange} style={inp} />
                {errors.staffId && <span style={errStyle}>{errors.staffId}</span>}
              </label>

              <label style={{ ...lbl, gridColumn: '1 / -1' }}>Full Name*
                <input name="fullName" value={form.fullName} onChange={handleChange} style={inp} />
                {errors.fullName && <span style={errStyle}>{errors.fullName}</span>}
              </label>

              <label style={lbl}>Section
                <input name="section" value={form.section} onChange={handleChange} style={inp} />
              </label>

              <label style={lbl}>Department*
                <select name="department" value={form.department} onChange={handleChange} style={inp}>
                  <option value="">Select</option>
                  {DEPARTMENT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                {errors.department && <span style={errStyle}>{errors.department}</span>}
              </label>

              {form.department === 'OTHER' && (
                <label style={{ ...lbl, gridColumn: '1 / -1' }}>Other Department*
                  <input name="otherDepartment" value={form.otherDepartment} onChange={handleChange} style={inp} placeholder="Type custom department" />
                  {errors.otherDepartment && <span style={errStyle}>{errors.otherDepartment}</span>}
                </label>
              )}

              <label style={lbl}>Nationality*
                <input name="nationality" value={form.nationality} onChange={handleChange} style={inp} />
                {errors.nationality && <span style={errStyle}>{errors.nationality}</span>}
              </label>

              <label style={lbl}>Room*
                <select name="roomId" value={form.roomId} onChange={handleChange} style={inp}>
                  <option value="">Select</option>
                  {rooms.filter(r => r.beds.some(b => !b.occupied)).map(r => (
                    <option key={r.id} value={r.id}>{r.id}</option>
                  ))}
                </select>
                {errors.roomId && <span style={errStyle}>{errors.roomId}</span>}
              </label>

              <label style={lbl}>Bed*
                <select name="bedId" value={form.bedId} onChange={handleChange} style={inp}>
                  <option value="">Select</option>
                  {availableBeds.map(b => <option key={b.bedId} value={b.bedId}>{b.bedId}</option>)}
                </select>
                {errors.bedId && <span style={errStyle}>{errors.bedId}</span>}
              </label>

              <label style={lbl}>Fasting
                <select name="fasting" value={form.fasting} onChange={handleChange} style={inp}>
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </label>

              <label style={lbl}>Check-in Date*
                <input name="checkin" type="date" value={form.checkin} onChange={handleChange} style={inp} />
                {errors.checkin && <span style={errStyle}>{errors.checkin}</span>}
              </label>
            </div>

            {/* ── Buttons ── */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column-reverse' : 'row',
              justifyContent: 'flex-end',
              gap: 10,
              paddingBottom: isMobile ? 8 : 0,
            }}>
              <button type="button" onClick={onClose} style={{ padding: isMobile ? '13px 22px' : '9px 22px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 700, fontSize: isMobile ? 15 : 13, cursor: 'pointer', width: isMobile ? '100%' : 'auto' }}>
                Cancel
              </button>
              <button type="submit" style={{ padding: isMobile ? '13px 22px' : '9px 22px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#4f46e5 0%,#6366f1 100%)', color: '#fff', fontWeight: 700, fontSize: isMobile ? 15 : 13, cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.3)', width: isMobile ? '100%' : 'auto' }}>
                Save Occupant
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddOccupantModal;
