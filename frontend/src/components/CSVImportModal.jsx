import React, { useRef, useState } from 'react';

function CSVImportModal({ open, onClose, onImport }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState('');
  const inputRef = useRef();

  // Simulate CSV preview (replace with real parsing in production)
  const handleFile = f => {
    setFile(f);
    setError('');
    // Simulate preview rows
    setPreview([
      ['Name', 'ID', 'Room', 'Bed', 'Type', 'Dept', 'Nationality'],
      ['John Doe', 'EMP001', '101', 'A', 'Permanent', 'HR', 'IN'],
      ['Jane Smith', 'EMP002', '102', 'B', 'Project', 'ENG', 'PH'],
      ['Ali Hassan', 'EMP003', '201', 'A', 'Temporary', 'F&B', 'IN'],
      ['...']
    ]);
  };

  const handleDrop = e => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = e => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  if (!open) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(30,40,60,0.55)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div className="modal" style={{ width: 540, maxWidth: '96vw', minHeight: 320 }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 18, right: 22, fontSize: 22, fontWeight: 700, color: '#1e315f', background: 'none', border: 'none', cursor: 'pointer', zIndex: 10 }}>×</button>
        <h2 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: 10 }}>Import Occupancy CSV</h2>
        <div style={{ fontSize: 15, color: '#7a869a', marginBottom: 18 }}>Drag and drop your CSV file below, or click to select. Preview the first few rows before importing.</div>
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current && inputRef.current.click()}
          style={{ border: '2px dashed #3b82f6', borderRadius: 12, padding: '32px 0', textAlign: 'center', color: '#1e315f', fontWeight: 700, fontSize: 16, marginBottom: 18, cursor: 'pointer', background: '#f5f7fa' }}
        >
          {file ? file.name : 'Drop CSV file here or click to select'}
          <input ref={inputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleChange} />
        </div>
        {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}
        {preview.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #d0d7e2', padding: '12px 18px', marginBottom: 18, overflowX: 'auto' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Preview (first 5 rows):</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} style={{ padding: '4px 10px', borderBottom: i === 0 ? '2px solid #e3eafc' : '1px solid #e3eafc', fontWeight: i === 0 ? 700 : 500 }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 18 }}>
          <button onClick={onClose} style={{ padding: '8px 22px', borderRadius: 8, border: 'none', background: '#e3eafc', color: '#1e315f', fontWeight: 700 }}>Cancel</button>
          <button disabled={!file} style={{ padding: '8px 22px', borderRadius: 8, border: 'none', background: file ? '#3ec97a' : '#d0d7e2', color: '#fff', fontWeight: 800 }} onClick={() => onImport && onImport('append')}>Append Valid Records</button>
          <button disabled={!file} style={{ padding: '8px 22px', borderRadius: 8, border: 'none', background: file ? '#3b82f6' : '#d0d7e2', color: '#fff', fontWeight: 800 }} onClick={() => onImport && onImport('replace')}>Replace Active Occupancy</button>
        </div>
        <div style={{ fontSize: 13, color: '#7a869a', marginTop: 10 }}>
          <b>Append Valid Records</b>: Add new records to current occupancy. <br />
          <b>Replace Active Occupancy</b>: Remove all current and import only from this file.
        </div>
      </div>
    </div>
  );
}

export default CSVImportModal;
