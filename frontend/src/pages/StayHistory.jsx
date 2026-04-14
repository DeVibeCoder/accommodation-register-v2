import React, { useState } from 'react';

const historyData = [
  { name: 'John Doe', room: '101', action: 'Check-in', date: '2026-04-01' },
  { name: 'Jane Smith', room: '102', action: 'Edit', date: '2026-04-02' },
  { name: 'Ali Hassan', room: '201', action: 'Check-out', date: '2026-04-03' },
];

function StayHistory() {
  const [search, setSearch] = useState('');
  const filtered = historyData.filter(h =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.room.toLowerCase().includes(search.toLowerCase()) ||
    h.action.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="page-container" style={{ width: '100%', maxWidth: '100%', margin: 0, padding: '32px 32px 0 32px', background: 'none', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <h2 style={{ fontWeight: 800, fontSize: '1.3rem', color: '#1e315f', margin: 0, marginRight: 18 }}>Stay History</h2>
        <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '7px 14px', borderRadius: 10, border: '1.5px solid #d0d7e2', minWidth: 220, fontSize: 15, background: '#fff' }} />
      </div>
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #d0d7e2', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f7fa', fontWeight: 700, color: '#1e315f', fontSize: 15 }}>
              <th style={{ padding: '12px 8px', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '12px 8px', textAlign: 'left' }}>Room</th>
              <th style={{ padding: '12px 8px', textAlign: 'left' }}>Action</th>
              <th style={{ padding: '12px 8px', textAlign: 'left' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((h, idx) => (
              <tr key={idx} style={{ borderBottom: idx < filtered.length - 1 ? '1px solid #e3eafc' : 'none', fontSize: 15 }}>
                <td style={{ padding: '10px 8px' }}>{h.name}</td>
                <td style={{ padding: '10px 8px' }}>{h.room}</td>
                <td style={{ padding: '10px 8px', color: h.action === 'Check-in' ? '#3ec97a' : h.action === 'Check-out' ? '#e74c3c' : '#3b82f6', fontWeight: 700 }}>{h.action}</td>
                <td style={{ padding: '10px 8px' }}>{h.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default StayHistory;
