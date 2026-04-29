import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { addMealExclusion, closeMealExclusion } from '../services/mealService';

const REASONS = ['Off Site', 'Vacation', 'Restaurant', 'Resignation/Termination'];

function MealExclusion() {
  const {
    occupants = [],
    mealExclusionSummary = { active: [], upcoming: [], mealExcludedCount: 0 },
    refreshMealExclusionSummary,
    canEditAccommodation = true,
  } = useOutletContext();

  const [selectedOccupantId, setSelectedOccupantId] = useState('');
  const [reason, setReason] = useState(REASONS[0]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [closingId, setClosingId] = useState('');
  const [notice, setNotice] = useState('');

  const selectedOccupant = useMemo(
    () => occupants.find(item => String(item.id) === String(selectedOccupantId)),
    [occupants, selectedOccupantId]
  );

  const active = Array.isArray(mealExclusionSummary?.active) ? mealExclusionSummary.active : [];
  const upcoming = Array.isArray(mealExclusionSummary?.upcoming) ? mealExclusionSummary.upcoming : [];

  const resetForm = () => {
    setSelectedOccupantId('');
    setReason(REASONS[0]);
    setFromDate('');
    setToDate('');
    setNotes('');
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!canEditAccommodation || saving) return;
    if (!selectedOccupant || !reason || !fromDate) {
      setNotice('Select occupant, reason, and from date before saving.');
      return;
    }

    setSaving(true);
    setNotice('');
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
      resetForm();
      setNotice('Meal exclusion saved successfully.');
    } catch (error) {
      setNotice(error?.message || 'Unable to save meal exclusion.');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseExclusion = async (id) => {
    if (!canEditAccommodation || !id || closingId) return;
    setClosingId(id);
    setNotice('');
    try {
      await closeMealExclusion(id);
      await refreshMealExclusionSummary();
      setNotice('Exclusion closed and moved to history.');
    } catch (error) {
      setNotice(error?.message || 'Unable to close exclusion.');
    } finally {
      setClosingId('');
    }
  };

  return (
    <div className="page-container" style={{ width: '100%', maxWidth: '100%', margin: 0, padding: '24px 32px', background: 'none', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, color: '#1e315f', fontWeight: 900, fontSize: '1.8rem' }}>Meal Exclusion</h1>
        <p style={{ margin: '6px 0 0', color: '#64748b', fontWeight: 600 }}>
          Active exclusions: {active.length} | Upcoming exclusions: {upcoming.length} | Meal exclusions in effect: {mealExclusionSummary?.mealExcludedCount || 0}
        </p>
      </div>

      {notice ? (
        <div style={{ marginBottom: 14, padding: '10px 12px', border: '1px solid #bfdbfe', borderRadius: 10, background: '#eff6ff', color: '#1d4ed8', fontWeight: 700 }}>
          {notice}
        </div>
      ) : null}

      <div style={{ background: '#fff', border: '1px solid #dbe4f0', borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <h2 style={{ margin: 0, marginBottom: 12, color: '#1e315f', fontWeight: 800, fontSize: '1.1rem' }}>Add Exclusion</h2>
        <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10, alignItems: 'end' }}>
          <label style={{ display: 'grid', gap: 6, fontWeight: 700, color: '#334155', fontSize: 12 }}>
            Occupant
            <select value={selectedOccupantId} onChange={e => setSelectedOccupantId(e.target.value)} disabled={!canEditAccommodation || saving} style={{ padding: '9px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }}>
              <option value="">Select Occupant</option>
              {occupants.map(item => (
                <option key={item.id || item._id} value={item.id}>{item.name} - {item.roomId} / Bed {item.bedNo}</option>
              ))}
            </select>
          </label>

          <label style={{ display: 'grid', gap: 6, fontWeight: 700, color: '#334155', fontSize: 12 }}>
            Reason
            <select value={reason} onChange={e => setReason(e.target.value)} disabled={!canEditAccommodation || saving} style={{ padding: '9px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }}>
              {REASONS.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label style={{ display: 'grid', gap: 6, fontWeight: 700, color: '#334155', fontSize: 12 }}>
            From Date
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} disabled={!canEditAccommodation || saving} style={{ padding: '9px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
          </label>

          <label style={{ display: 'grid', gap: 6, fontWeight: 700, color: '#334155', fontSize: 12 }}>
            To Date (optional)
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} disabled={!canEditAccommodation || saving} style={{ padding: '9px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
          </label>

          <label style={{ display: 'grid', gap: 6, fontWeight: 700, color: '#334155', fontSize: 12 }}>
            Notes
            <input value={notes} onChange={e => setNotes(e.target.value)} disabled={!canEditAccommodation || saving} placeholder="Optional" style={{ padding: '9px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
          </label>

          <button type="submit" disabled={!canEditAccommodation || saving} style={{ padding: '10px 12px', borderRadius: 10, border: 'none', background: saving ? '#cbd5e1' : '#2563eb', color: '#fff', fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Saving...' : 'Save Exclusion'}
          </button>
        </form>
      </div>

      <div style={{ background: '#fff', border: '1px solid #dbe4f0', borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <h2 style={{ margin: 0, marginBottom: 12, color: '#1e315f', fontWeight: 800, fontSize: '1.1rem' }}>Currently Excluded</h2>
        {active.length === 0 ? <div style={{ color: '#64748b', fontWeight: 600 }}>No active meal exclusions.</div> : (
          <div style={{ display: 'grid', gap: 8 }}>
            {active.map(item => (
              <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, color: '#1f2937' }}>{item.name} ({item.reason})</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>{item.roomId} / Bed {item.bedNo} | From {String(item.fromDate || '').slice(0, 10)}{item.toDate ? ` to ${String(item.toDate).slice(0, 10)}` : ''}</div>
                </div>
                {canEditAccommodation ? (
                  <button onClick={() => handleCloseExclusion(item.id)} disabled={closingId === item.id} style={{ padding: '7px 10px', borderRadius: 8, border: 'none', background: '#0f766e', color: '#fff', fontWeight: 800, cursor: closingId === item.id ? 'not-allowed' : 'pointer' }}>
                    {closingId === item.id ? 'Closing...' : 'Close'}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: '#fff', border: '1px solid #dbe4f0', borderRadius: 14, padding: 16 }}>
        <h2 style={{ margin: 0, marginBottom: 12, color: '#1e315f', fontWeight: 800, fontSize: '1.1rem' }}>Upcoming Exclusions</h2>
        {upcoming.length === 0 ? <div style={{ color: '#64748b', fontWeight: 600 }}>No upcoming meal exclusions.</div> : (
          <div style={{ display: 'grid', gap: 8 }}>
            {upcoming.map(item => (
              <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}>
                <div style={{ fontWeight: 800, color: '#1f2937' }}>{item.name} ({item.reason})</div>
                <div style={{ color: '#64748b', fontSize: 12 }}>{item.roomId} / Bed {item.bedNo} | Effective from {String(item.fromDate || '').slice(0, 10)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MealExclusion;
