import React, { useState } from 'react';

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  background: 'rgba(30,40,60,0.55)',
  zIndex: 3000,
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

function AddOccupantModal({ open, onClose, rooms, onAdd }) {
  const [form, setForm] = useState({
    personType: '',
    staffId: '',
    fullName: '',
    section: '',
    department: '',
    nationality: '',
    roomId: '',
    bedId: '',
    fasting: '',
    checkin: '',
    projectMeals: '',
  });
  const [errors, setErrors] = useState({});

  const selectedRoom = rooms.find(r => r.id === form.roomId);
  const availableBeds = selectedRoom ? selectedRoom.beds.filter(b => !b.occupied) : [];

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    setErrors(e => ({ ...e, [name]: undefined }));
    if (name === 'roomId') setForm(f => ({ ...f, bedId: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.personType) newErrors.personType = 'Required';
    if (!form.staffId) newErrors.staffId = 'Required';
    if (!form.fullName) newErrors.fullName = 'Required';
    if (!form.department) newErrors.department = 'Required';
    if (!form.nationality) newErrors.nationality = 'Required';
    if (!form.roomId) newErrors.roomId = 'Required';
    if (!form.bedId) newErrors.bedId = 'Required';
    if (!form.checkin) newErrors.checkin = 'Required';
    if (selectedRoom && selectedRoom.beds.find(b => b.bedId === form.bedId && b.occupied)) newErrors.bedId = 'Bed already occupied';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (!validate()) return;
    onAdd(form);
    onClose();
    setForm({
      personType: '', staffId: '', fullName: '', section: '', department: '', nationality: '', roomId: '', bedId: '', fasting: '', checkin: '', projectMeals: ''
    });
  };

  if (!open) return null;
  const lbl = { display:'flex', flexDirection:'column', fontWeight:600, fontSize:13, color:'#475569', gap:6 };
  const inp = { width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #d0d7e2', fontSize:13, fontWeight:500, color:'#1e293b', background:'#fff' };
  const err = { color:'#dc2626', fontSize:11, marginTop:2 };
  
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div className="modal" style={{...modalStyle, background:'#fff', borderRadius:18, padding:'40px', maxWidth:680, width:'95%', boxShadow:'0 8px 40px rgba(30,50,120,.18)', position:'relative'}} onClick={e => e.stopPropagation()}>
        <button style={{...closeBtnStyle, top:16, right:20, fontSize:24, color:'#94a3b8'}} onClick={onClose} aria-label="Close">×</button>
        <h2 style={{ fontWeight:800, fontSize:'1.3rem', marginBottom:32, color:'#1e315f', letterSpacing:'-0.3px' }}>Add Occupant</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'18px 24px', marginBottom:32 }}>
            <label style={lbl}>Person Type*
              <select name="personType" value={form.personType} onChange={handleChange} style={inp}>
                <option value="">Select</option>
                <option value="Permanent">Permanent</option>
                <option value="Temporary">Temporary</option>
                <option value="Project">Project</option>
              </select>
              {errors.personType && <span style={err}>{errors.personType}</span>}
            </label>
            <label style={lbl}>Staff ID*
              <input name="staffId" value={form.staffId} onChange={handleChange} style={inp} />
              {errors.staffId && <span style={err}>{errors.staffId}</span>}
            </label>
            <label style={{...lbl,gridColumn:'1/3'}}>Full Name*
              <input name="fullName" value={form.fullName} onChange={handleChange} style={inp} />
              {errors.fullName && <span style={err}>{errors.fullName}</span>}
            </label>
            <label style={lbl}>Section
              <input name="section" value={form.section} onChange={handleChange} style={inp} />
            </label>
            <label style={lbl}>Department*
              <input name="department" value={form.department} onChange={handleChange} style={inp} />
              {errors.department && <span style={err}>{errors.department}</span>}
            </label>
            <label style={lbl}>Nationality*
              <input name="nationality" value={form.nationality} onChange={handleChange} style={inp} />
              {errors.nationality && <span style={err}>{errors.nationality}</span>}
            </label>
            <label style={lbl}>Room*
              <select name="roomId" value={form.roomId} onChange={handleChange} style={inp}>
                <option value="">Select</option>
                {rooms.filter(r => r.beds.some(b => !b.occupied)).map(r => <option key={r.id} value={r.id}>{r.id}</option>)}
              </select>
              {errors.roomId && <span style={err}>{errors.roomId}</span>}
            </label>
            <label style={lbl}>Bed*
              <select name="bedId" value={form.bedId} onChange={handleChange} style={inp}>
                <option value="">Select</option>
                {availableBeds.map(b => <option key={b.bedId} value={b.bedId}>{b.bedId}</option>)}
              </select>
              {errors.bedId && <span style={err}>{errors.bedId}</span>}
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
              {errors.checkin && <span style={err}>{errors.checkin}</span>}
            </label>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:12 }}>
            <button type="button" onClick={onClose} style={{ padding:'10px 32px', borderRadius:10, border:'none', background:'#e3eafc', color:'#1e315f', fontWeight:700, fontSize:14, cursor:'pointer' }}>Cancel</button>
            <button type="submit" style={{ padding:'10px 32px', borderRadius:10, border:'none', background:'#3b82f6', color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer' }}>Save Occupant</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddOccupantModal;
