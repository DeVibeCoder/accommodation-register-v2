import React, { useState } from 'react';
import { updateProfileRole } from '../services/authService';

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

function Settings({ user, setUser }) {
  const [selectedRole, setSelectedRole] = useState(user?.role || 'Admin');

  const handleRoleChange = async (e) => {
    const nextRole = e.target.value;
    setSelectedRole(nextRole);

    const result = await updateProfileRole(user?.id, user?.email, nextRole);
    if (result.user) {
      setUser(result.user);
    } else {
      console.error('[Supabase Roles] Role update failed and was not persisted.');
    }
  };

  return (
    <div className="page-container" style={{ width: '100%', maxWidth: '100%', margin: 0, padding: '32px 32px 0 32px', background: 'none', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', boxSizing: 'border-box' }}>
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #d0d7e2', padding: '32px 40px', minHeight: 180, marginBottom: 32 }}>
        <h2 style={{ fontWeight: 800, fontSize: '1.3rem', color: '#1e315f', marginBottom: 18 }}>Role Management</h2>
        <div style={{ marginBottom: 18 }}>
          <label htmlFor="role-select" style={{ fontWeight: 700, fontSize: 16, marginRight: 16 }}>Select Role:</label>
          <select id="role-select" value={selectedRole} onChange={handleRoleChange} style={{ fontSize: 16, padding: '8px 18px', borderRadius: 8, border: '1.5px solid #d0d7e2', fontWeight: 600 }}>
            {roleDescriptions.map(r => (
              <option key={r.role} value={r.role}>{r.role}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 18 }}>
          {roleDescriptions.map(r => (
            <div key={r.role} style={{ background: selectedRole === r.role ? '#e3eafc' : '#f5f7fa', color: '#1e315f', borderRadius: 10, padding: '18px 24px', fontWeight: 700, fontSize: 16, flex: 1, textAlign: 'center', border: selectedRole === r.role ? '2px solid #1e315f' : '1.5px solid #d0d7e2' }}>
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>{r.role}</div>
              <div>{r.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Settings;
