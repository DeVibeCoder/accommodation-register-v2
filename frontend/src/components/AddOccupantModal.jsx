import React, { useState } from 'react';

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

function AddOccupantModal({ open, onClose, rooms, onAdd }) {
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

  /* ── compact shared styles ── */
  const lbl = { display: 'flex', flexDirection: 'column', fontWeight: 600, fontSize: 12, color: '#475569', gap: 4 };
  const inp = {
    width: '100%', boxSizing: 'border-box',
    padding: '7px 10px', borderRadius: 8,
    border: '1.5px solid #e2e8f0', fontSize: 13,
    fontWeight: 500, color: '#1e293b', background: '#f8fafc', outline: 'none',
  };
  const errStyle = { color: '#dc2626', fontSize: 10, marginTop: 2 };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 62, left: 0, right: 0, bottom: 0,
        zIndex: 3000,
        background: 'rgba(15,23,42,0.5)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        overflowY: 'auto',
        padding: '12px',
        animation: 'fadeIn 0.18s ease both',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 14,
          width: '100%',
          maxWidth: 660,           /* wide enough for 2-col on big screens */
          margin: 'auto 0',        /* vertical centering when space allows  */
          maxHeight: 'calc(100vh - 94px)', /* never taller than visible area */
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',      /* clip children, inner body scrolls     */
          boxShadow: '0 20px 60px rgba(15,23,42,0.22)',
          animation: 'scaleIn 0.22s cubic-bezier(0.22,1,0.36,1) both',
        }}
      >
        {/* ── Sticky header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '13px 18px',
          borderBottom: '1px solid #f1f5f9',
          background: 'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)',
          flexShrink: 0,
        }}>
          <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>
            Add Occupant
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 14, fontWeight: 700 }}
          >✕</button>
        </div>

        {/* ── Scrollable form body ── */}
        <div style={{ overflowY: 'auto', padding: '14px 18px', flex: 1, minHeight: 0 }}>
          <form onSubmit={handleSubmit}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '10px 16px',
              marginBottom: 14,
            }}>
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

            {/* ── Footer buttons ── */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={onClose} style={{ padding: '9px 22px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#4f46e5 0%,#6366f1 100%)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
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
