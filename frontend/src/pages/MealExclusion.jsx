import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { addMealExclusion, closeMealExclusion } from '../services/mealService';

const REASONS = ['Off Site', 'Vacation', 'Restaurant', 'Resignation/Termination'];

function reasonColor(reason) {
  if (reason === 'Resignation/Termination') return { bg: '#fee2e2', text: '#991b1b' };
  if (reason === 'Vacation') return { bg: '#e0e7ff', text: '#3730a3' };
  if (reason === 'Restaurant') return { bg: '#fef3c7', text: '#92400e' };
  return { bg: '#dcfce7', text: '#166534' };
}

function asDate(value) {
  const dateText = String(value || '').slice(0, 10);
  return dateText || '-';
}

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
  const activeCount = active.length;
  const upcomingCount = upcoming.length;
  const excludedCount = Number(mealExclusionSummary?.mealExcludedCount || 0);

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
      <div style={{ background: 'linear-gradient(120deg, #0f172a 0%, #1e3a8a 55%, #0ea5e9 100%)', borderRadius: 16, padding: '20px 22px', color: '#fff', marginBottom: 14 }}>
        <h1 style={{ margin: 0, fontWeight: 900, fontSize: '1.9rem' }}>Meal Exclusion</h1>
        <p style={{ margin: '8px 0 0', opacity: 0.92, fontWeight: 600 }}>
          Manage excluded staff while preserving occupancy bed allocation rules.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginBottom: 14 }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #dbe4f0', padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Active Exclusions</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#1e315f', marginTop: 4 }}>{activeCount}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #dbe4f0', padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Upcoming</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#1e315f', marginTop: 4 }}>{upcomingCount}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #dbe4f0', padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Excluded From Meals</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#1e315f', marginTop: 4 }}>{excludedCount}</div>
        </div>
      </div>

      {notice ? (
        <div style={{ marginBottom: 14, padding: '10px 12px', border: '1px solid #bfdbfe', borderRadius: 10, background: '#eff6ff', color: '#1d4ed8', fontWeight: 700 }}>
          {notice}
        </div>
      ) : null}

      <div style={{ background: '#fff', border: '1px solid #dbe4f0', borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <h2 style={{ margin: 0, marginBottom: 10, color: '#1e315f', fontWeight: 800, fontSize: '1.1rem' }}>Add Exclusion</h2>
        <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {REASONS.map(item => {
            const color = reasonColor(item);
            return (
              <span key={item} style={{ fontSize: 11, fontWeight: 800, padding: '4px 8px', borderRadius: 999, background: color.bg, color: color.text }}>
                {item}
              </span>
            );
          })}
        </div>

        <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, alignItems: 'end' }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 800, color: '#1f2937' }}>{item.name}</div>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: reasonColor(item.reason).bg, color: reasonColor(item.reason).text }}>{item.reason}</span>
                  </div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>{item.roomId} / Bed {item.bedNo} | From {asDate(item.fromDate)}{item.toDate ? ` to ${asDate(item.toDate)}` : ''}</div>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 800, color: '#1f2937' }}>{item.name}</div>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: reasonColor(item.reason).bg, color: reasonColor(item.reason).text }}>{item.reason}</span>
                </div>
                <div style={{ color: '#64748b', fontSize: 12 }}>{item.roomId} / Bed {item.bedNo} | Effective from {asDate(item.fromDate)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MealExclusion;
