import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { addMealExclusion, closeMealExclusion } from '../services/mealService';

const REASONS = ['Off Site', 'On Leave', 'Vacation', 'Restaurant', 'Resignation/Termination'];

function reasonColor(reason) {
  if (reason === 'Resignation/Termination') return { bg: '#fee2e2', text: '#991b1b' };
  if (reason === 'Vacation') return { bg: '#e0e7ff', text: '#3730a3' };
  if (reason === 'Restaurant') return { bg: '#fef3c7', text: '#92400e' };
  if (reason === 'On Leave') return { bg: '#fef9c3', text: '#854d0e' };
  return { bg: '#dcfce7', text: '#166534' };
}

function asDate(value) {
  const dateText = String(value || '').slice(0, 10);
  if (!dateText) return '-';
  const [y, m, d] = dateText.split('-');
  return `${m}/${d}/${y}`;
}

const thStyle = {
  padding: '10px 14px',
  fontSize: 11,
  fontWeight: 800,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  borderBottom: '1px solid #e2e8f0',
  background: '#f8fafc',
  textAlign: 'left',
  whiteSpace: 'nowrap',
};
const tdStyle = {
  padding: '12px 14px',
  borderBottom: '1px solid #f1f5f9',
  verticalAlign: 'middle',
  fontSize: 13,
};

function ExclusionModal({ open, onClose, occupants, canEdit }) {
  const [selectedOccupantId, setSelectedOccupantId] = useState('');
  const [reason, setReason] = useState(REASONS[0]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const {
    refreshMealExclusionSummary,
  } = useOutletContext();

  const selectedOccupant = useMemo(
    () => occupants.find(item => String(item.id) === String(selectedOccupantId)),
    [occupants, selectedOccupantId]
  );

  const reset = () => {
    setSelectedOccupantId('');
    setReason(REASONS[0]);
    setFromDate('');
    setToDate('');
    setNotes('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit || saving) return;
    if (!selectedOccupant || !reason || !fromDate) {
      setError('Select occupant, reason, and from date.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await addMealExclusion({
        occupantId: selectedOccupant.id,
        name: selectedOccupant.name,
        staffId: selectedOccupant.staffId,
        roomId: selectedOccupant.roomId,
        bedNo: selectedOccupant.bedNo,
        reason,
        fromDate,
        toDate: toDate || null,
        notes,
      });
      await refreshMealExclusionSummary();
      reset();
      onClose();
    } catch (err) {
      setError(err?.message || 'Unable to save meal exclusion.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => { reset(); onClose(); };

  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', position: 'relative', fontFamily: 'Inter, Segoe UI, Arial, sans-serif' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1e315f' }}>Add Meal Exclusion</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Exclude a staff member from meals for a date range</div>
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
          {error ? <div style={{ marginBottom: 12, padding: '9px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13, fontWeight: 600 }}>{error}</div> : null}
          <div style={{ display: 'grid', gap: 14 }}>
            <label style={{ display: 'grid', gap: 5, fontWeight: 700, color: '#334155', fontSize: 12 }}>
              Occupant
              <select value={selectedOccupantId} onChange={e => setSelectedOccupantId(e.target.value)} disabled={!canEdit || saving} required style={{ padding: '9px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}>
                <option value="">Select Occupant</option>
                {occupants.map(item => (
                  <option key={item.id || item._id} value={item.id}>{item.name} {item.staffId ? `(${item.staffId})` : ''} — {item.roomId} / Bed {item.bedNo}</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 5, fontWeight: 700, color: '#334155', fontSize: 12 }}>
              Reason
              <select value={reason} onChange={e => setReason(e.target.value)} disabled={!canEdit || saving} style={{ padding: '9px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#fff' }}>
                {REASONS.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={{ display: 'grid', gap: 5, fontWeight: 700, color: '#334155', fontSize: 12 }}>
                From Date
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} disabled={!canEdit || saving} required style={{ padding: '9px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }} />
              </label>
              <label style={{ display: 'grid', gap: 5, fontWeight: 700, color: '#334155', fontSize: 12 }}>
                To Date <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} disabled={!canEdit || saving} style={{ padding: '9px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }} />
              </label>
            </div>
            <label style={{ display: 'grid', gap: 5, fontWeight: 700, color: '#334155', fontSize: 12 }}>
              Notes <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span>
              <input value={notes} onChange={e => setNotes(e.target.value)} disabled={!canEdit || saving} placeholder="Any additional notes..." style={{ padding: '9px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button type="button" onClick={handleClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
            <button type="submit" disabled={!canEdit || saving} style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: saving ? '#93c5fd' : '#2563eb', color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13 }}>
              {saving ? 'Saving…' : 'Save Exclusion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ExclusionTable({ rows, canEdit, closingId, onClose, emptyText }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
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
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ ...tdStyle, color: '#94a3b8', fontWeight: 600, textAlign: 'center', padding: '20px 14px' }}>{emptyText}</td>
            </tr>
          ) : rows.map(item => {
            const rc = reasonColor(item.reason);
            return (
              <tr key={item.id} style={{ background: '#fff' }}>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 800, color: '#1f2937', fontSize: 13 }}>{item.name}</div>
                  {item.staffId ? <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{item.staffId}</div> : null}
                </td>
                <td style={{ ...tdStyle, color: '#374151', fontWeight: 600, textTransform: 'uppercase', fontSize: 12 }}>{item.department || '—'}</td>
                <td style={tdStyle}>
                  <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, background: rc.bg, color: rc.text, fontWeight: 700, fontSize: 11, border: `1px solid ${rc.text}30` }}>{item.reason}</span>
                </td>
                <td style={{ ...tdStyle, color: '#374151' }}>{asDate(item.fromDate)}</td>
                <td style={{ ...tdStyle, color: '#374151' }}>{item.toDate ? asDate(item.toDate) : '—'}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  {canEdit ? (
                    <button onClick={() => onClose(item.id)} disabled={closingId === item.id} style={{ padding: '5px 14px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', fontWeight: 700, cursor: closingId === item.id ? 'not-allowed' : 'pointer', fontSize: 12 }}>
                      {closingId === item.id ? 'Removing…' : 'Remove'}
                    </button>
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

function MealExclusion() {
  const {
    occupants = [],
    mealExclusionSummary = { active: [], upcoming: [], mealExcludedCount: 0 },
    refreshMealExclusionSummary,
    canEditAccommodation = true,
  } = useOutletContext();

  const [modalOpen, setModalOpen] = useState(false);
  const [closingId, setClosingId] = useState('');
  const [notice, setNotice] = useState('');

  const active = Array.isArray(mealExclusionSummary?.active) ? mealExclusionSummary.active : [];
  const upcoming = Array.isArray(mealExclusionSummary?.upcoming) ? mealExclusionSummary.upcoming : [];
  const activeCount = active.length;
  const upcomingCount = upcoming.length;
  const excludedCount = Number(mealExclusionSummary?.mealExcludedCount || 0);

  const handleCloseExclusion = async (id) => {
    if (!canEditAccommodation || !id || closingId) return;
    setClosingId(id);
    setNotice('');
    try {
      await closeMealExclusion(id);
      await refreshMealExclusionSummary();
      setNotice('Exclusion removed and moved to history.');
    } catch (error) {
      setNotice(error?.message || 'Unable to remove exclusion.');
    } finally {
      setClosingId('');
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', margin: 0, padding: '24px 32px', background: 'none', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', boxSizing: 'border-box' }}>
      {/* Stat cards + Add button */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #dbe4f0', padding: '14px 20px', flex: '1 1 140px' }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Active Exclusions</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#1e315f', marginTop: 4 }}>{activeCount}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #dbe4f0', padding: '14px 20px', flex: '1 1 140px' }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Upcoming</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#1e315f', marginTop: 4 }}>{upcomingCount}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #dbe4f0', padding: '14px 20px', flex: '1 1 140px' }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Excluded From Meals</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#1e315f', marginTop: 4 }}>{excludedCount}</div>
        </div>
        {canEditAccommodation ? (
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
            <button onClick={() => setModalOpen(true)} style={{ padding: '12px 22px', borderRadius: 10, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(37,99,235,0.25)' }}>
              + Add Exclusion
            </button>
          </div>
        ) : null}
      </div>

      {notice ? (
        <div style={{ marginBottom: 16, padding: '10px 14px', border: '1px solid #bfdbfe', borderRadius: 10, background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, fontSize: 13 }}>
          {notice}
        </div>
      ) : null}

      {/* Active Exclusions */}
      <div style={{ background: '#fff', border: '1px solid #dbe4f0', borderRadius: 14, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>✅</span>
          <span style={{ fontWeight: 800, color: '#1e315f', fontSize: '1rem' }}>Active Exclusions</span>
        </div>
        <ExclusionTable rows={active} canEdit={canEditAccommodation} closingId={closingId} onClose={handleCloseExclusion} emptyText="No active meal exclusions." />
      </div>

      {/* Upcoming Exclusions */}
      <div style={{ background: '#fff', border: '1px solid #dbe4f0', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>⏳</span>
          <span style={{ fontWeight: 800, color: '#1e315f', fontSize: '1rem' }}>Upcoming Exclusions</span>
        </div>
        <ExclusionTable rows={upcoming} canEdit={canEditAccommodation} closingId={closingId} onClose={handleCloseExclusion} emptyText="No upcoming meal exclusions." />
      </div>

      <ExclusionModal open={modalOpen} onClose={() => setModalOpen(false)} occupants={occupants} canEdit={canEditAccommodation} />
    </div>
  );
}

export default MealExclusion;
