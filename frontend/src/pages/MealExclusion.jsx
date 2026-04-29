import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { addMealExclusion, closeMealExclusion, fetchMealExclusionHistory, updateMealExclusion, batchAddMealExclusions } from '../services/mealService';
import { formatDisplayDate } from '../utils/date';

const REASONS = ['Off Site', 'Vacation', 'Restaurant', 'Exit'];
const CSV_TEMPLATE_HEADER = 'name,staff_id,reason,from_date,to_date,notes';
const CSV_TEMPLATE_EXAMPLE = 'JOHN DOE,12345,Vacation,2026-05-01,2026-05-10,Annual leave\nJANE SMITH,67890,Off Site,2026-05-03,,Off site training';

function reasonColor(reason) {
  if (reason === 'Exit') return { bg: '#fee2e2', text: '#991b1b' };
  if (reason === 'Vacation') return { bg: '#e0e7ff', text: '#3730a3' };
  if (reason === 'Restaurant') return { bg: '#fef3c7', text: '#92400e' };
  return { bg: '#dcfce7', text: '#166534' };
}

function asDate(value) {
  return formatDisplayDate(value);
}

const thStyle = {
  padding: '10px 14px', fontSize: 11, fontWeight: 800, color: '#64748b',
  textTransform: 'uppercase', letterSpacing: '0.06em',
  borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
  textAlign: 'left', whiteSpace: 'nowrap',
};
const tdStyle = { padding: '12px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle', fontSize: 13 };
const modalFieldStyle = {
  height: 40, padding: '9px 10px', borderRadius: 8, border: '1px solid #cbd5e1',
  fontSize: 13, boxSizing: 'border-box', width: '100%', background: '#ffffff',
};

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

// --- Add / Edit Modal -------------------------------------------------------
function ExclusionModal({ open, onClose, occupants, canEdit, onSaved, editEntry = null }) {
  const isEditing = Boolean(editEntry?.id);
  const [selectedOccupantId, setSelectedOccupantId] = useState('');
  const [occupantQuery, setOccupantQuery] = useState('');
  const [showMatches, setShowMatches] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (!editEntry) {
      setSelectedOccupantId(''); setOccupantQuery(''); setReason(REASONS[0]);
      setFromDate(''); setToDate(''); setNotes(''); setError(''); setShowMatches(false);
      return;
    }
    const match = occupants.find(item => String(item.id) === String(editEntry.occupantId))
      || occupants.find(item => normalizeText(item.staffId) === normalizeText(editEntry.staffId))
      || occupants.find(item => normalizeText(item.name) === normalizeText(editEntry.name));
    setSelectedOccupantId(match ? String(match.id) : '');
    setOccupantQuery(match ? `${match.name || ''}${match.staffId ? ` (${match.staffId})` : ''}` : `${editEntry.name || ''}${editEntry.staffId ? ` (${editEntry.staffId})` : ''}`.trim());
    setReason(editEntry.reason || REASONS[0]);
    setFromDate(String(editEntry.fromDate || '').slice(0, 10));
    setToDate(String(editEntry.toDate || '').slice(0, 10));
    setNotes(editEntry.notes || '');
    setError(''); setShowMatches(false);
  }, [open, editEntry, occupants]);

  const selectedOccupant = useMemo(
    () => occupants.find(item => String(item.id) === String(selectedOccupantId)),
    [occupants, selectedOccupantId]
  );
  const filteredOccupants = useMemo(() => {
    const query = normalizeText(occupantQuery);
    if (query === '' && !showMatches) return [];
    return occupants.filter(item => !query || normalizeText(item.name).includes(query) || normalizeText(item.staffId).includes(query)).slice(0, 12);
  }, [occupantQuery, occupants, showMatches]);

  const reset = () => {
    setSelectedOccupantId(''); setOccupantQuery(''); setReason(REASONS[0]);
    setFromDate(''); setToDate(''); setNotes(''); setError(''); setShowMatches(false);
  };
  const handlePickOccupant = (item) => {
    setSelectedOccupantId(String(item.id));
    setOccupantQuery(`${item.name || ''}${item.staffId ? ` (${item.staffId})` : ''}`.trim());
    setShowMatches(false);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit || saving) return;
    const nq = normalizeText(occupantQuery);
    const resolved = selectedOccupant || occupants.find(item => normalizeText(item.name) === nq || normalizeText(item.staffId) === nq);
    if (!resolved) { setError('Please select a valid occupant from the list.'); return; }
    if (!reason) { setError('Please select a reason.'); return; }
    if (!fromDate) { setError('Please select a from date.'); return; }
    setSaving(true); setError('');
    try {
      const payload = { occupantId: resolved.id, name: resolved.name, staffId: resolved.staffId, roomId: resolved.roomId, bedNo: resolved.bedNo, reason, fromDate, toDate: toDate || null, notes };
      if (isEditing) await updateMealExclusion(editEntry.id, payload);
      else await addMealExclusion(payload);
      await onSaved(isEditing ? 'Exclusion updated.' : 'Meal exclusion added.');
      reset(); onClose();
    } catch (err) {
      setError(err?.message || `Unable to ${isEditing ? 'update' : 'save'} meal exclusion.`);
    } finally { setSaving(false); }
  };
  const handleClose = () => { reset(); onClose(); };

  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'linear-gradient(180deg,#ffffff 0%,#f8fbff 100%)', borderRadius: 16, width: '100%', maxWidth: 560, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', border: '1px solid #dbeafe', fontFamily: 'Inter,Segoe UI,Arial,sans-serif' }}>
        <div style={{ padding: '18px 24px 15px', borderBottom: '1px solid #dbeafe', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(130deg,#eff6ff 0%,#f8fbff 100%)', borderRadius: '16px 16px 0 0' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1e315f' }}>{isEditing ? 'Edit Meal Exclusion' : 'Add Meal Exclusion'}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{isEditing ? 'Update exclusion details for selected occupant' : 'Exclude a staff member from meals for a date range'}</div>
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>X</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '18px 24px 20px' }}>
          {error ? <div style={{ marginBottom: 12, padding: '9px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13, fontWeight: 600 }}>{error}</div> : null}
          <div style={{ display: 'grid', gap: 14, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
            <div style={{ display: 'grid', gap: 5, fontWeight: 700, color: '#334155', fontSize: 12, position: 'relative', zIndex: 10 }}>
              Occupant (search by Name or Staff ID)
              <input value={occupantQuery} onChange={e => { setOccupantQuery(e.target.value); setSelectedOccupantId(''); setShowMatches(true); }} onFocus={() => setShowMatches(true)} onBlur={() => setTimeout(() => setShowMatches(false), 150)} placeholder="Click to see all, or type to search" disabled={!canEdit || saving} style={modalFieldStyle} />
              {showMatches && (filteredOccupants.length > 0 || occupants.length === 0) ? (
                <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 2, background: '#fff', border: '2px solid #2563eb', borderRadius: 8, boxShadow: '0 12px 32px rgba(15,23,42,0.18)', zIndex: 30, maxHeight: 240, overflowY: 'auto' }}>
                  {filteredOccupants.length === 0
                    ? <div style={{ padding: '12px 10px', color: '#64748b', fontSize: 12, textAlign: 'center' }}>{occupants.length === 0 ? 'No occupants available' : 'No matches found'}</div>
                    : filteredOccupants.map(item => (
                      <button key={item.id || item._id} type="button" onMouseDown={() => handlePickOccupant(item)}
                        style={{ width: '100%', textAlign: 'left', border: 'none', background: '#fff', padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #e2e8f0', fontSize: 12 }}
                        onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                        <div style={{ fontWeight: 700, color: '#1f2937', fontSize: 13 }}>{item.name || 'Unknown'}</div>
                        <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>ID: {item.staffId || '-'} | {item.roomId || '-'} / Bed {item.bedNo ?? '-'}</div>
                      </button>
                    ))}
                </div>
              ) : null}
            </div>
            <label style={{ display: 'grid', gap: 5, fontWeight: 700, color: '#334155', fontSize: 12 }}>
              Reason
              <select value={reason} onChange={e => setReason(e.target.value)} disabled={!canEdit || saving} style={modalFieldStyle}>
                {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'end' }}>
              <label style={{ display: 'grid', gap: 5, fontWeight: 700, color: '#334155', fontSize: 12 }}>
                <span>From Date</span><span style={{ fontWeight: 500, color: '#94a3b8', fontSize: 11 }}>required</span>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} disabled={!canEdit || saving} required style={modalFieldStyle} />
              </label>
              <label style={{ display: 'grid', gap: 5, fontWeight: 700, color: '#334155', fontSize: 12 }}>
                <span>To Date</span><span style={{ fontWeight: 500, color: '#94a3b8', fontSize: 11 }}>optional</span>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} disabled={!canEdit || saving} style={modalFieldStyle} />
              </label>
            </div>
            <label style={{ display: 'grid', gap: 5, fontWeight: 700, color: '#334155', fontSize: 12 }}>
              Notes <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span>
              <input value={notes} onChange={e => setNotes(e.target.value)} disabled={!canEdit || saving} placeholder="Any additional notes..." style={modalFieldStyle} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button type="button" onClick={handleClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
            <button type="submit" disabled={!canEdit || saving} style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: saving ? '#93c5fd' : '#2563eb', color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13 }}>
              {saving ? 'Saving...' : isEditing ? 'Update Exclusion' : 'Save Exclusion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- CSV Import Modal -------------------------------------------------------
function parseCsvLine(line) {
  const cells = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuote = !inQuote; }
    else if (ch === ',' && !inQuote) { cells.push(cur.trim()); cur = ''; }
    else { cur += ch; }
  }
  cells.push(cur.trim());
  return cells;
}

function parseMealExclusionCsv(text, occupants) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { rows: [], error: 'File is empty or has no data rows.' };
  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));
  const idxOf = key => headers.indexOf(key);
  const iName = idxOf('name'), iStaff = idxOf('staff_id'), iReason = idxOf('reason');
  const iFrom = idxOf('from_date'), iTo = idxOf('to_date'), iNotes = idxOf('notes');
  if (iFrom === -1 || iReason === -1) return { rows: [], error: 'CSV must have at least: reason, from_date columns.' };

  const VALID_REASONS = new Set(['off site', 'vacation', 'restaurant', 'exit']);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const name = iName >= 0 ? (cells[iName] || '').trim() : '';
    const staffId = iStaff >= 0 ? (cells[iStaff] || '').trim() : '';
    const reason = iReason >= 0 ? (cells[iReason] || '').trim() : '';
    const fromDate = iFrom >= 0 ? (cells[iFrom] || '').trim() : '';
    const toDate = iTo >= 0 ? (cells[iTo] || '').trim() : '';
    const notes = iNotes >= 0 ? (cells[iNotes] || '').trim() : '';

    const errors = [];
    if (!reason) errors.push('missing reason');
    else if (!VALID_REASONS.has(reason.toLowerCase())) errors.push(`invalid reason "${reason}"`);
    if (!fromDate) errors.push('missing from_date');
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) errors.push('from_date must be YYYY-MM-DD');
    if (toDate && !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) errors.push('to_date must be YYYY-MM-DD');

    const match = occupants.find(o => staffId && normalizeText(o.staffId) === normalizeText(staffId))
      || occupants.find(o => name && normalizeText(o.name) === normalizeText(name));

    rows.push({
      rowNum: i,
      name: name || match?.name || '',
      staffId: staffId || match?.staffId || '',
      reason,
      fromDate,
      toDate: toDate || '',
      notes,
      occupantId: match?.id || null,
      roomId: match?.roomId || null,
      bedNo: match?.bedNo ?? null,
      matchedOccupant: match ? `${match.name} (${match.staffId})` : null,
      errors,
      valid: errors.length === 0,
    });
  }
  return { rows, error: null };
}

function ImportModal({ open, onClose, occupants, onImported }) {
  const fileRef = useRef(null);
  const [parsed, setParsed] = useState(null);
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const reset = () => { setParsed(null); setParseError(''); setResult(null); if (fileRef.current) fileRef.current.value = ''; };
  const handleClose = () => { reset(); onClose(); };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE_HEADER + '\n' + CSV_TEMPLATE_EXAMPLE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'meal_exclusion_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(''); setParsed(null); setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { rows, error } = parseMealExclusionCsv(ev.target.result, occupants);
      if (error) { setParseError(error); return; }
      setParsed(rows);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!parsed) return;
    const valid = parsed.filter(r => r.valid);
    if (valid.length === 0) { setParseError('No valid rows to import.'); return; }
    setImporting(true);
    try {
      const entries = valid.map(r => ({
        occupantId: r.occupantId, name: r.name, staffId: r.staffId,
        roomId: r.roomId, bedNo: r.bedNo,
        reason: r.reason, fromDate: r.fromDate, toDate: r.toDate || null, notes: r.notes,
      }));
      const res = await batchAddMealExclusions(entries);
      setResult(res);
      await onImported();
    } catch (err) {
      setParseError(err?.message || 'Import failed.');
    } finally { setImporting(false); }
  };

  if (!open) return null;
  const validCount = parsed ? parsed.filter(r => r.valid).length : 0;
  const invalidCount = parsed ? parsed.filter(r => !r.valid).length : 0;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 860, maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', fontFamily: 'Inter,Segoe UI,Arial,sans-serif' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(130deg,#f0fdf4 0%,#f8fbff 100%)', borderRadius: '16px 16px 0 0' }}>
          <div>
            <div style={{ fontWeight: 800, color: '#1e315f', fontSize: '1.05rem' }}>Bulk Import Meal Exclusions</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Upload a CSV to add multiple exclusions at once - existing data is never overwritten</div>
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>X</button>
        </div>

        <div style={{ padding: '16px 22px', overflowY: 'auto', flex: 1 }}>
          {/* Template + upload row */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={downloadTemplate} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #16a34a', background: '#f0fdf4', color: '#15803d', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              Download Template
            </button>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>then fill it in and upload below</span>
          </div>
          <div style={{ background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: 10, padding: '16px', marginBottom: 14, textAlign: 'center' }}>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display: 'none' }} id="csv-upload" />
            <label htmlFor="csv-upload" style={{ cursor: 'pointer', display: 'inline-block' }}>
              <div style={{ fontSize: 13, color: '#2563eb', fontWeight: 700 }}>Click to select CSV file</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Columns: name, staff_id, reason, from_date, to_date, notes</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Reasons accepted: Off Site, Vacation, Restaurant, Exit | Dates: YYYY-MM-DD</div>
            </label>
          </div>

          {parseError ? <div style={{ marginBottom: 12, padding: '9px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13, fontWeight: 600 }}>{parseError}</div> : null}

          {result ? (
            <div style={{ marginBottom: 12, padding: '12px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8 }}>
              <div style={{ fontWeight: 800, color: '#166534', fontSize: 14 }}>Import Complete</div>
              <div style={{ color: '#15803d', fontSize: 13, marginTop: 4 }}>{result.inserted} exclusions added successfully.</div>
              {result.errors?.length > 0 ? <div style={{ color: '#92400e', fontSize: 12, marginTop: 4 }}>{result.errors.length} rows had errors and were skipped.</div> : null}
            </div>
          ) : null}

          {parsed && !result ? (
            <>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                <span style={{ background: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: 12, padding: '3px 10px', borderRadius: 999 }}>{validCount} valid</span>
                {invalidCount > 0 ? <span style={{ background: '#fee2e2', color: '#991b1b', fontWeight: 700, fontSize: 12, padding: '3px 10px', borderRadius: 999 }}>{invalidCount} with errors (will be skipped)</span> : null}
              </div>
              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10, maxHeight: 320, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                  <thead>
                    <tr>
                      {['#', 'Name', 'Staff ID', 'Reason', 'From', 'To', 'Notes', 'Match', 'Status'].map(h => (
                        <th key={h} style={{ ...thStyle, padding: '8px 10px', fontSize: 10 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map(row => (
                      <tr key={row.rowNum} style={{ background: row.valid ? '#fff' : '#fff5f5' }}>
                        <td style={{ ...tdStyle, padding: '8px 10px', color: '#64748b', fontSize: 11 }}>{row.rowNum}</td>
                        <td style={{ ...tdStyle, padding: '8px 10px', fontWeight: 600, fontSize: 12 }}>{row.name || '-'}</td>
                        <td style={{ ...tdStyle, padding: '8px 10px', fontSize: 12 }}>{row.staffId || '-'}</td>
                        <td style={{ ...tdStyle, padding: '8px 10px', fontSize: 12 }}>
                          {row.reason ? <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: reasonColor(row.reason.charAt(0).toUpperCase() + row.reason.slice(1)).bg, color: reasonColor(row.reason.charAt(0).toUpperCase() + row.reason.slice(1)).text, fontWeight: 700, fontSize: 10 }}>{row.reason}</span> : '-'}
                        </td>
                        <td style={{ ...tdStyle, padding: '8px 10px', fontSize: 12 }}>{row.fromDate || '-'}</td>
                        <td style={{ ...tdStyle, padding: '8px 10px', fontSize: 12 }}>{row.toDate || '-'}</td>
                        <td style={{ ...tdStyle, padding: '8px 10px', fontSize: 11, color: '#64748b', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.notes || '-'}</td>
                        <td style={{ ...tdStyle, padding: '8px 10px', fontSize: 11 }}>
                          {row.matchedOccupant ? <span style={{ color: '#166534', fontWeight: 600 }}>OK {row.matchedOccupant}</span> : <span style={{ color: '#92400e' }}>Unmatched</span>}
                        </td>
                        <td style={{ ...tdStyle, padding: '8px 10px' }}>
                          {row.valid
                            ? <span style={{ background: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: 10, padding: '2px 8px', borderRadius: 999 }}>OK</span>
                            : <span style={{ color: '#dc2626', fontSize: 10, fontWeight: 600 }}>{row.errors.join(', ')}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10, justifyContent: 'flex-end', background: '#fafafa', borderRadius: '0 0 16px 16px' }}>
          <button onClick={handleClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
            {result ? 'Close' : 'Cancel'}
          </button>
          {parsed && !result ? (
            <button onClick={handleImport} disabled={importing || validCount === 0} style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: importing || validCount === 0 ? '#93c5fd' : '#2563eb', color: '#fff', fontWeight: 700, cursor: importing || validCount === 0 ? 'not-allowed' : 'pointer', fontSize: 13 }}>
              {importing ? 'Importing...' : `Import ${validCount} Exclusion${validCount !== 1 ? 's' : ''}`}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// --- History Modal ----------------------------------------------------------
function ExclusionHistoryModal({ open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [historyRows, setHistoryRows] = useState([]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true); setError('');
    fetchMealExclusionHistory()
      .then(rows => { if (active) setHistoryRows(Array.isArray(rows) ? rows : []); })
      .catch(err => {
        if (!active) return;
        const msg = err?.message || '';
        setError(msg.includes('meal_exclusions') ? 'Meal exclusions table not set up yet.' : msg || 'Unable to load history.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open]);

  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 980, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '84vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800, color: '#1e315f', fontSize: '1.05rem' }}>Exclusion History</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Past exclusions that have reached their to-date</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>X</button>
        </div>
        <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
          {error ? <div style={{ marginBottom: 12, padding: '9px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13, fontWeight: 600 }}>{error}</div> : null}
          {loading ? <div style={{ padding: '10px 0', color: '#64748b', fontWeight: 600 }}>Loading history...</div>
            : <ExclusionTable rows={historyRows} canEdit={false} closingId="" onClose={() => {}} onEdit={() => {}} emptyText="No past exclusions found." />}
        </div>
      </div>
    </div>
  );
}

// --- Exclusion Table --------------------------------------------------------
function ExclusionTable({ rows, canEdit, closingId, onClose, onEdit, emptyText }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
        <thead>
          <tr>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Department</th>
            <th style={thStyle}>Reason</th>
            <th style={thStyle}>From Date</th>
            <th style={thStyle}>To Date</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0
            ? <tr><td colSpan={6} style={{ ...tdStyle, color: '#94a3b8', fontWeight: 600, textAlign: 'center', padding: '24px 14px' }}>{emptyText}</td></tr>
            : rows.map((item, idx) => {
              const rc = reasonColor(item.reason);
              return (
                <tr
                  key={item.id}
                  style={{ background: idx % 2 === 0 ? '#fff' : '#fbfdff', transition: 'background .15s ease' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#eef6ff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fbfdff'; }}
                >
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 800, color: '#1f2937', fontSize: 13 }}>{item.name}</div>
                    {item.staffId ? <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{item.staffId}</div> : null}
                  </td>
                  <td style={{ ...tdStyle, color: '#374151', fontWeight: 600, textTransform: 'uppercase', fontSize: 12 }}>{item.department || '-'}</td>
                  <td style={tdStyle}>
                    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, background: rc.bg, color: rc.text, fontWeight: 700, fontSize: 11, border: `1px solid ${rc.text}30` }}>{item.reason}</span>
                  </td>
                  <td style={{ ...tdStyle, color: '#374151' }}>{asDate(item.fromDate)}</td>
                  <td style={{ ...tdStyle, color: '#374151' }}>{item.toDate ? asDate(item.toDate) : '-'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    {canEdit ? (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button onClick={() => onEdit(item)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #93c5fd', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>Edit</button>
                        <button onClick={() => onClose(item.id)} disabled={closingId === item.id} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', fontWeight: 700, cursor: closingId === item.id ? 'not-allowed' : 'pointer', fontSize: 12 }}>
                          {closingId === item.id ? 'Removing...' : 'Remove'}
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}

// --- Main Page --------------------------------------------------------------
function MealExclusion() {
  const {
    occupants = [],
    mealExclusionSummary = { active: [], upcoming: [], mealExcludedCount: 0 },
    refreshMealExclusionSummary,
    canEditAccommodation = true,
  } = useOutletContext();

  const [activeTab, setActiveTab] = useState('active');
  const [modalOpen, setModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [closingId, setClosingId] = useState('');
  const [notice, setNotice] = useState('');

  const active = Array.isArray(mealExclusionSummary?.active) ? mealExclusionSummary.active : [];
  const upcoming = Array.isArray(mealExclusionSummary?.upcoming) ? mealExclusionSummary.upcoming : [];
  const activeCount = active.length;
  const upcomingCount = upcoming.length;
  const mealHeadcount = Math.max(occupants.length - activeCount, 0);

  const departmentByStaffId = useMemo(() => {
    const map = new Map();
    for (const occ of occupants) {
      const key = normalizeText(occ.staffId);
      if (key && !map.has(key)) map.set(key, occ.department || '-');
    }
    return map;
  }, [occupants]);

  const hydrateRows = useMemo(() => {
    const enrich = items => items.map(item => ({ ...item, department: item.department || departmentByStaffId.get(normalizeText(item.staffId)) || '-' }));
    return { active: enrich(active), upcoming: enrich(upcoming) };
  }, [active, upcoming, departmentByStaffId]);

  const refreshSummary = () => refreshMealExclusionSummary();

  const handleCloseExclusion = async (id) => {
    if (!canEditAccommodation || !id || closingId) return;
    setClosingId(id); setNotice('');
    try {
      await closeMealExclusion(id);
      await refreshSummary();
      setNotice('Exclusion removed and moved to history.');
    } catch (err) { setNotice(err?.message || 'Unable to remove exclusion.'); }
    finally { setClosingId(''); }
  };
  const handleSaved = async (message) => { await refreshSummary(); setNotice(message); };
  const openAddModal = () => { setEditingEntry(null); setModalOpen(true); };
  const openEditModal = (item) => { setEditingEntry(item); setModalOpen(true); };

  // Tab style helper
  const tabBtn = (label, value, count, color) => {
    const isActive = activeTab === value;
    return (
      <button onClick={() => setActiveTab(value)} style={{
        padding: '10px 22px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 800,
        background: isActive ? '#fff' : 'transparent',
        color: isActive ? color : '#64748b',
        borderBottom: isActive ? `3px solid ${color}` : '3px solid transparent',
        borderRadius: 0,
        transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {label}
        <span style={{ background: isActive ? color : '#e2e8f0', color: isActive ? '#fff' : '#64748b', borderRadius: 999, padding: '1px 8px', fontSize: 11, fontWeight: 800 }}>{count}</span>
      </button>
    );
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', margin: 0, padding: 'clamp(14px, 2.2vw, 24px) clamp(12px, 3vw, 32px)', background: 'none', fontFamily: 'Inter,Segoe UI,Arial,sans-serif', boxSizing: 'border-box' }}>

      {/* --- Stat cards + buttons --- */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ background: 'linear-gradient(135deg,#ffe9d6 0%,#ffe2bf 100%)', borderRadius: 14, border: '1px solid rgba(154,52,18,0.12)', padding: '14px 20px', flex: '1 1 170px', boxShadow: '0 8px 18px rgba(154,52,18,0.11)' }}>
          <div style={{ fontSize: 11, color: '#9a3412', fontWeight: 800, textTransform: 'uppercase' }}>Active Exclusions</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#7c2d12', marginTop: 4 }}>{activeCount}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg,#e0ecff 0%,#d9f3ff 100%)', borderRadius: 14, border: '1px solid rgba(30,58,138,0.1)', padding: '14px 20px', flex: '1 1 170px', boxShadow: '0 8px 18px rgba(30,58,138,0.1)' }}>
          <div style={{ fontSize: 11, color: '#1e3a8a', fontWeight: 800, textTransform: 'uppercase' }}>Upcoming</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#1e315f', marginTop: 4 }}>{upcomingCount}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg,#f3e8ff 0%,#ede9fe 100%)', borderRadius: 14, border: '1px solid rgba(107,33,168,0.1)', padding: '14px 20px', flex: '1 1 170px', boxShadow: '0 8px 18px rgba(107,33,168,0.1)' }}>
          <div style={{ fontSize: 11, color: '#6b21a8', fontWeight: 800, textTransform: 'uppercase' }}>Meal Headcount</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#581c87', marginTop: 4 }}>{mealHeadcount}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexWrap: 'wrap', background: '#fff', border: '1px solid #dbe4f0', borderRadius: 14, padding: 8, boxShadow: '0 8px 20px rgba(15,23,42,0.06)' }}>
          {canEditAccommodation ? (
            <>
              <button onClick={openAddModal} style={{ padding: '11px 16px', borderRadius: 10, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(37,99,235,0.25)' }}>+ Add Exclusion</button>
              <button onClick={() => setImportOpen(true)} style={{ padding: '11px 16px', borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(22,163,74,0.25)' }}>Import CSV</button>
            </>
          ) : null}
          <button onClick={() => setHistoryOpen(true)} style={{ padding: '11px 16px', borderRadius: 10, border: '1px solid #93c5fd', background: '#eff6ff', color: '#1d4ed8', fontWeight: 800, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>Exclusion History</button>
        </div>
      </div>

      {notice ? (
        <div style={{ marginBottom: 14, padding: '10px 14px', border: '1px solid #bfdbfe', borderRadius: 10, background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{notice}</span>
          <button onClick={() => setNotice('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#93c5fd', fontSize: 18, lineHeight: 1 }}>X</button>
        </div>
      ) : null}

      {/* --- Tabbed exclusion table --- */}
      <div style={{ background: '#fff', border: '1px solid #dbe4f0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 18px 40px rgba(15,23,42,0.06)' }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(180deg, #f8fafc 0%, #f3f7fd 100%)', overflowX: 'auto' }}>
          {tabBtn('Active Exclusions', 'active', activeCount, '#ea580c')}
          {tabBtn('Upcoming Exclusions', 'upcoming', upcomingCount, '#2563eb')}
        </div>
        {/* Tab content */}
        <ExclusionTable
          rows={activeTab === 'active' ? hydrateRows.active : hydrateRows.upcoming}
          canEdit={canEditAccommodation}
          closingId={closingId}
          onClose={handleCloseExclusion}
          onEdit={openEditModal}
          emptyText={activeTab === 'active' ? 'No active meal exclusions.' : 'No upcoming meal exclusions.'}
        />
      </div>

      <ExclusionModal open={modalOpen} onClose={() => { setModalOpen(false); setEditingEntry(null); }} occupants={occupants} canEdit={canEditAccommodation} onSaved={handleSaved} editEntry={editingEntry} />
      <ExclusionHistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} occupants={occupants} onImported={async () => { await refreshSummary(); setImportOpen(false); setNotice('Bulk import completed successfully.'); }} />
    </div>
  );
}

export default MealExclusion;
