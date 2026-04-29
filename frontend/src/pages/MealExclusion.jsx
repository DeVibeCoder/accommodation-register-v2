import React, { useMemo, useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { addMealExclusion, closeMealExclusion, fetchMealHistory, updateMealExclusion } from '../services/mealService';

const REASONS = ['Off Site', 'Vacation', 'Restaurant', 'Exit'];

function reasonColor(reason) {
  if (reason === 'Exit') return { bg: '#fee2e2', text: '#991b1b' };
  if (reason === 'Vacation') return { bg: '#e0e7ff', text: '#3730a3' };
  if (reason === 'Restaurant') return { bg: '#fef3c7', text: '#92400e' };
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

const modalFieldStyle = {
  height: 40,
  padding: '9px 10px',
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  fontSize: 13,
  boxSizing: 'border-box',
  width: '100%',
  background: '#ffffff',
};

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

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
      setSelectedOccupantId('');
      setOccupantQuery('');
      setReason(REASONS[0]);
      setFromDate('');
      setToDate('');
      setNotes('');
      setError('');
      setShowMatches(false);
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
    setError('');
    setShowMatches(false);
  }, [open, editEntry, occupants]);

  const selectedOccupant = useMemo(
    () => occupants.find(item => String(item.id) === String(selectedOccupantId)),
    [occupants, selectedOccupantId]
  );

  const filteredOccupants = useMemo(() => {
    const query = normalizeText(occupantQuery);
    if (query === '' && !showMatches) return [];
    return occupants
      .filter(item => !query || normalizeText(item.name).includes(query) || normalizeText(item.staffId).includes(query))
      .slice(0, 12);
  }, [occupantQuery, occupants, showMatches]);

  const reset = () => {
    setSelectedOccupantId('');
    setOccupantQuery('');
    setReason(REASONS[0]);
    setFromDate('');
    setToDate('');
    setNotes('');
    setError('');
    setShowMatches(false);
  };

  const handlePickOccupant = (item) => {
    setSelectedOccupantId(String(item.id));
    setOccupantQuery(`${item.name || ''}${item.staffId ? ` (${item.staffId})` : ''}`.trim());
    setShowMatches(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit || saving) return;

    const normalizedQuery = normalizeText(occupantQuery);
    const resolvedOccupant = selectedOccupant || occupants.find(item => (
      normalizeText(item.name) === normalizedQuery || normalizeText(item.staffId) === normalizedQuery
    ));

    if (!resolvedOccupant) {
      setError('Please select a valid occupant from the list.');
      return;
    }
    if (!reason) {
      setError('Please select a reason.');
      return;
    }
    if (!fromDate) {
      setError('Please select a from date.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        occupantId: resolvedOccupant.id,
        name: resolvedOccupant.name,
        staffId: resolvedOccupant.staffId,
        roomId: resolvedOccupant.roomId,
        bedNo: resolvedOccupant.bedNo,
        reason,
        fromDate,
        toDate: toDate || null,
        notes,
      };

      if (isEditing) {
        await updateMealExclusion(editEntry.id, payload);
      } else {
        await addMealExclusion(payload);
      }

      await onSaved(`${isEditing ? 'Exclusion updated.' : 'Meal exclusion added.'}`);
      reset();
      onClose();
    } catch (err) {
      setError(err?.message || `Unable to ${isEditing ? 'update' : 'save'} meal exclusion.`);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => { reset(); onClose(); };

  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)', borderRadius: 16, width: '100%', maxWidth: 560, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', position: 'relative', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', border: '1px solid #dbeafe' }}>
        <div style={{ padding: '18px 24px 15px', borderBottom: '1px solid #dbeafe', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(130deg, #eff6ff 0%, #f8fbff 100%)', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1e315f' }}>{isEditing ? 'Edit Meal Exclusion' : 'Add Meal Exclusion'}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{isEditing ? 'Update exclusion details for selected occupant' : 'Exclude a staff member from meals for a date range'}</div>
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '18px 24px 20px' }}>
          {error ? <div style={{ marginBottom: 12, padding: '9px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13, fontWeight: 600 }}>{error}</div> : null}
          <div style={{ display: 'grid', gap: 14, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14 }}>
            <div style={{ display: 'grid', gap: 5, fontWeight: 700, color: '#334155', fontSize: 12, position: 'relative', zIndex: 10 }}>
              Occupant (search by Name or Staff ID)
              <input
                value={occupantQuery}
                onChange={e => {
                  setOccupantQuery(e.target.value);
                  setSelectedOccupantId('');
                  setShowMatches(true);
                }}
                onFocus={() => setShowMatches(true)}
                onBlur={() => setTimeout(() => setShowMatches(false), 150)}
                placeholder="Click to see all occupants, or type to search"
                disabled={!canEdit || saving}
                style={modalFieldStyle}
              />
              {showMatches && (filteredOccupants.length > 0 || occupants.length === 0) ? (
                <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 2, background: '#fff', border: '2px solid #2563eb', borderRadius: 8, boxShadow: '0 12px 32px rgba(15,23,42,0.18)', zIndex: 30, maxHeight: 280, overflowY: 'auto' }}>
                  {filteredOccupants.length === 0 && occupants.length === 0 ? (
                    <div style={{ padding: '12px 10px', color: '#64748b', fontSize: 12, textAlign: 'center' }}>No occupants available</div>
                  ) : filteredOccupants.length === 0 ? (
                    <div style={{ padding: '12px 10px', color: '#64748b', fontSize: 12, textAlign: 'center' }}>No matches found</div>
                  ) : (
                    filteredOccupants.map(item => (
                      <button
                        key={item.id || item._id}
                        type="button"
                        onMouseDown={() => handlePickOccupant(item)}
                        style={{ width: '100%', textAlign: 'left', border: 'none', background: '#fff', padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #e2e8f0', fontSize: 12, color: '#334155', transition: 'background 0.15s' }}
                        onMouseEnter={(e) => e.target.style.background = '#f0f8ff'}
                        onMouseLeave={(e) => e.target.style.background = '#fff'}
                      >
                        <div style={{ fontWeight: 700, color: '#1f2937', fontSize: 13 }}>{item.name || 'Unknown'}</div>
                        <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>ID: {item.staffId || '-'} | {item.roomId || '-'} / Bed {item.bedNo ?? '-'}</div>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
            <label style={{ display: 'grid', gap: 5, fontWeight: 700, color: '#334155', fontSize: 12 }}>
              Reason
              <select value={reason} onChange={e => setReason(e.target.value)} disabled={!canEdit || saving} style={modalFieldStyle}>
                {REASONS.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'end' }}>
              <label style={{ display: 'grid', gap: 5, fontWeight: 700, color: '#334155', fontSize: 12 }}>
                <span>From Date</span>
                <span style={{ fontWeight: 500, color: '#94a3b8', minHeight: 16, fontSize: 11 }}>required</span>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} disabled={!canEdit || saving} required style={modalFieldStyle} />
              </label>
              <label style={{ display: 'grid', gap: 5, fontWeight: 700, color: '#334155', fontSize: 12 }}>
                <span>To Date</span>
                <span style={{ fontWeight: 500, color: '#94a3b8', minHeight: 16, fontSize: 11 }}>optional</span>
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
              {saving ? 'Saving…' : isEditing ? 'Update Exclusion' : 'Save Exclusion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ExclusionHistoryModal({ open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [historyRows, setHistoryRows] = useState([]);

  useEffect(() => {
    if (!open) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const rows = await fetchMealHistory();
        if (active) setHistoryRows(Array.isArray(rows) ? rows : []);
      } catch (err) {
        const message = err?.message || 'Unable to load exclusion history.';
        const friendlyMessage = message.includes("public.meal_exclusions")
          ? 'Meal exclusions table is not available yet. Please run the meal_exclusions SQL setup in Supabase.'
          : message;
        if (active) setError(friendlyMessage);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [open]);

  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 980, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '84vh', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800, color: '#1e315f', fontSize: '1.05rem' }}>Exclusion History</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Past exclusions that have reached their to-date</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 16, overflowY: 'auto', maxHeight: 'calc(84vh - 74px)' }}>
          {error ? <div style={{ marginBottom: 12, padding: '9px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13, fontWeight: 600 }}>{error}</div> : null}
          {loading ? (
            <div style={{ padding: '10px 0', color: '#64748b', fontWeight: 600 }}>Loading history...</div>
          ) : (
            <ExclusionTable rows={historyRows} canEdit={false} closingId="" onClose={() => {}} onEdit={() => {}} emptyText="No past exclusions found." />
          )}
        </div>
      </div>
    </div>
  );
}

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
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <button onClick={() => onEdit(item)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #93c5fd', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
                        Edit
                      </button>
                      <button onClick={() => onClose(item.id)} disabled={closingId === item.id} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', fontWeight: 700, cursor: closingId === item.id ? 'not-allowed' : 'pointer', fontSize: 12 }}>
                        {closingId === item.id ? 'Removing…' : 'Remove'}
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

function MealExclusion() {
  const {
    occupants = [],
    mealExclusionSummary = { active: [], upcoming: [], mealExcludedCount: 0 },
    refreshMealExclusionSummary,
    canEditAccommodation = true,
  } = useOutletContext();

  const [modalOpen, setModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
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
      if (key && !map.has(key)) map.set(key, occ.department || '—');
    }
    return map;
  }, [occupants]);

  const hydrateRows = useMemo(() => {
    const enrich = (items) => items.map(item => ({
      ...item,
      department: item.department || departmentByStaffId.get(normalizeText(item.staffId)) || '—',
    }));
    return {
      active: enrich(active),
      upcoming: enrich(upcoming),
    };
  }, [active, upcoming, departmentByStaffId]);

  const refreshSummary = async () => {
    await refreshMealExclusionSummary();
  };

  const handleCloseExclusion = async (id) => {
    if (!canEditAccommodation || !id || closingId) return;
    setClosingId(id);
    setNotice('');
    try {
      await closeMealExclusion(id);
      await refreshSummary();
      setNotice('Exclusion removed and moved to history.');
    } catch (error) {
      setNotice(error?.message || 'Unable to remove exclusion.');
    } finally {
      setClosingId('');
    }
  };

  const handleSaved = async (message) => {
    await refreshSummary();
    setNotice(message);
  };

  const openAddModal = () => {
    setEditingEntry(null);
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingEntry(item);
    setModalOpen(true);
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
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Meal Headcount</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#1e315f', marginTop: 4 }}>{mealHeadcount}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          {canEditAccommodation ? (
            <button onClick={openAddModal} style={{ padding: '12px 18px', borderRadius: 10, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(37,99,235,0.25)' }}>
              + Add Exclusion
            </button>
          ) : null}
          <button onClick={() => setHistoryOpen(true)} style={{ padding: '12px 18px', borderRadius: 10, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(37,99,235,0.25)' }}>
            Exclusion History
          </button>
        </div>
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
        <ExclusionTable rows={hydrateRows.active} canEdit={canEditAccommodation} closingId={closingId} onClose={handleCloseExclusion} onEdit={openEditModal} emptyText="No active meal exclusions." />
      </div>

      {/* Upcoming Exclusions */}
      <div style={{ background: '#fff', border: '1px solid #dbe4f0', borderRadius: 14, overflow: 'hidden', marginTop: 60 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>⏳</span>
          <span style={{ fontWeight: 800, color: '#1e315f', fontSize: '1rem' }}>Upcoming Exclusions</span>
        </div>
        <ExclusionTable rows={hydrateRows.upcoming} canEdit={canEditAccommodation} closingId={closingId} onClose={handleCloseExclusion} onEdit={openEditModal} emptyText="No upcoming meal exclusions." />
      </div>

      <ExclusionModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingEntry(null);
        }}
        occupants={occupants}
        canEdit={canEditAccommodation}
        onSaved={handleSaved}
        editEntry={editingEntry}
      />
      <ExclusionHistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </div>
  );
}

export default MealExclusion;
