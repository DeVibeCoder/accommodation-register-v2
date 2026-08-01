import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { formatDisplayDateTime, formatDisplayDate } from '../utils/date';
import { deleteStayHistoryEntry } from '../services/stayHistoryService';

const FILTERS = ['All', 'Check Out', 'Check In', 'Swap', 'Move', 'Edits'];

function shortCode(value) {
  if (!value) return '';
  const cleaned = String(value).toUpperCase().replace(/[^A-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  const parts = cleaned.split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 4);
  return parts.slice(0, 4).map(p => p[0]).join('');
}

const ACTION_STYLES = {
  'Check In':  { bg: '#dcfce7', text: '#15803d' },
  'Check Out': { bg: '#fee2e2', text: '#dc2626' },
  Swap:        { bg: '#ede9fe', text: '#7c3aed' },
  Move:        { bg: '#dbeafe', text: '#6366f1' },
  Edit:        { bg: '#fef3c7', text: '#b45309' },
};

function formatTime(value) { return formatDisplayDateTime(value); }

function fmtDate(value) {
  if (!value) return '';
  try { return formatDisplayDate(value); } catch { return String(value).slice(0, 10); }
}

/* ── Detail popup ─────────────────────────────────────────────────────── */
function HistoryDetailModal({ item, onClose, isMobile }) {
  if (!item) return null;
  const tone = ACTION_STYLES[item.type] || ACTION_STYLES.Edit;

  const row = (label, value) => value ? (
    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '5px 0', borderBottom: '1px solid var(--c-border)' }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: 0.4, minWidth: 88, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)' }}>{value}</span>
    </div>
  ) : null;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '16px 12px' : '24px', animation: 'fadeIn 0.18s ease both' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--c-card)', borderRadius: 18, padding: '20px', maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(15,23,42,0.25)', animation: 'scaleIn 0.2s cubic-bezier(0.22,1,0.36,1) both', maxHeight: isMobile ? 'calc(100vh - 80px)' : '88vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, background: tone.bg, color: tone.text, fontWeight: 800, fontSize: 12 }}>
            {item.type}
          </span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--c-border)', background: 'var(--c-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-subtle)', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>✕</button>
        </div>

        {item.type === 'Check Out' ? (
          /* Check Out: full ordered staff details */
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {row('Person Type', item.personType)}
            {row('Staff ID', item.staffId)}
            {row('WP/PP No', item.wpPpNo)}
            {row('Full Name', item.name)}
            {row('Section', item.section)}
            {row('Department', item.department)}
            {row('Nationality', item.nationality)}
            {row('Room', item.roomId)}
            {row('Bed', item.bedNo ? `Bed ${item.bedNo}` : null)}
            {row('Check In', fmtDate(item.checkIn))}
            {row('Check Out', formatTime(item.timestamp))}
          </div>
        ) : (
          /* Check In / other types */
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--c-text)', lineHeight: 1.3, marginBottom: 10 }}>{item.name || '-'}</div>
            {item.staffId && <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', marginBottom: 2 }}>Staff ID: {item.staffId}</div>}
            {item.wpPpNo && <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', marginBottom: 8 }}>WP/PP No: {item.wpPpNo}</div>}
            {row('Person Type', item.personType)}
            {row('Section', item.section)}
            {row('Department', item.department)}
            {row('Nationality', item.nationality)}
            {item.fasting !== undefined && item.fasting !== null && item.fasting !== '' && row('Fasting', item.fasting === true || item.fasting === 'true' || item.fasting === 'Yes' ? 'Yes' : 'No')}
            {row('Room', item.roomId ? `${item.roomId}${item.bedNo ? ` / Bed ${item.bedNo}` : ''}` : null)}
            {row('Check-in', fmtDate(item.checkIn))}
            {row('Time', formatTime(item.timestamp))}
            {item.details && row('Details', item.details)}
          </div>
        )}
      </div>
    </div>
  );
}

function StayHistory() {
  const { stayHistory = [], setStayHistory, isAdmin, occupants = [], isMobile = false } = useOutletContext();
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [detailItem, setDetailItem] = useState(null);

  const occupantInfoByName = useMemo(() => {
    const map = new Map();
    for (const o of occupants) {
      const key = String(o.name || '').trim().toLowerCase();
      if (key && !map.has(key)) {
        map.set(key, { section: o.section || '', department: o.department || '', staffId: o.staffId || '', wpPpNo: o.wpPpNo || '' });
      }
    }
    return map;
  }, [occupants]);

  const enrichedHistory = useMemo(() => {
    return stayHistory.map(item => {
      const needsEnrich = !item.section && !item.department;
      if (!needsEnrich) return item;
      const info = occupantInfoByName.get(String(item.name || '').trim().toLowerCase());
      if (!info) return item;
      return { ...item, section: info.section, department: info.department };
    });
  }, [stayHistory, occupantInfoByName]);

  const handleDeleteEntry = async (id) => {
    if (!window.confirm('Delete this stay history entry? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await deleteStayHistoryEntry(id);
      setStayHistory(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      alert('Failed to delete entry: ' + (err.message || err));
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = useMemo(() => {
    return enrichedHistory.filter(item => {
      const matchesFilter = activeFilter === 'All'
        ? true
        : activeFilter === 'Edits'
          ? item.type === 'Edit'
          : item.type === activeFilter;

      const q = search.trim().toLowerCase();
      const matchesSearch = q === '' ||
        String(item.name || '').toLowerCase().includes(q) ||
        String(item.roomId || '').toLowerCase().includes(q) ||
        String(item.details || '').toLowerCase().includes(q) ||
        String(item.type || '').toLowerCase().includes(q) ||
        String(item.staffId || '').toLowerCase().includes(q) ||
        String(item.wpPpNo || '').toLowerCase().includes(q) ||
        String(item.section || '').toLowerCase().includes(q) ||
        String(item.department || '').toLowerCase().includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [enrichedHistory, activeFilter, search]);

  const cols = isAdmin ? '120px 1fr 100px 1.6fr 120px 36px' : '120px 1fr 100px 1.6fr 120px';

  return (
    <div style={{ width: '100%', maxWidth: '100%', margin: 0, padding: isMobile ? '10px 12px 16px' : '12px 24px 24px', background: 'none', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', boxSizing: 'border-box', minHeight: isMobile ? 'calc(100vh - 96px)' : 'calc(100vh - 62px)' }}>

      {/* ── Top bar: count + search ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: isMobile ? 8 : 16, marginBottom: isMobile ? 8 : 14, flexWrap: isMobile ? 'nowrap' : 'wrap' }}>
        <p style={{ margin: 0, color: 'var(--c-muted)', fontSize: isMobile ? 10 : 13, fontWeight: 600, flexShrink: 0 }}>
          {filtered.length} of {stayHistory.length} {isMobile ? 'activities' : 'recorded accommodation activities'}
        </p>
        <input
          type="text"
          placeholder={isMobile ? 'Search...' : 'Search name, ID, room, action...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: isMobile ? '6px 10px' : '9px 14px', borderRadius: 10, border: '1.5px solid var(--c-border-3)', minWidth: isMobile ? 0 : 260, width: isMobile ? '100%' : 'auto', fontSize: isMobile ? 12 : 14, background: 'var(--c-card)', color: 'var(--c-text)' }}
        />
      </div>

      {/* ── Filter pills ── */}
      <div style={{ display: 'flex', flexWrap: isMobile ? 'nowrap' : 'wrap', gap: isMobile ? 4 : 10, marginBottom: isMobile ? 10 : 18, overflowX: isMobile ? 'auto' : 'visible', scrollbarWidth: 'none' }}>
        {FILTERS.map(filter => {
          const isActive = activeFilter === filter;
          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              style={{ padding: isMobile ? '4px 9px' : '9px 16px', borderRadius: 999, border: isActive ? '1px solid #2563eb' : '1px solid var(--c-border-2)', background: isActive ? '#dbeafe' : 'var(--c-card)', color: isActive ? '#4338ca' : 'var(--c-text-2)', fontWeight: 700, fontSize: isMobile ? 10 : 13, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
            >
              {filter}
            </button>
          );
        })}
      </div>

      {/* ── Mobile card view ── */}
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--c-muted)', background: 'var(--c-card)', borderRadius: 16 }}>
              No stay activity has been recorded yet for this filter.
            </div>
          ) : (
            filtered.map((item, index) => {
              const tone = ACTION_STYLES[item.type] || ACTION_STYLES.Edit;
              const idLabel = item.staffId ? `ID ${item.staffId}` : item.wpPpNo ? `WP/PP ${item.wpPpNo}` : null;
              return (
                <div
                  key={item.id || index}
                  onClick={() => setDetailItem(item)}
                  style={{ background: 'var(--c-card)', borderRadius: 14, padding: '11px 13px', boxShadow: '0 2px 8px rgba(30,49,95,0.06)', border: '1px solid var(--c-border)', animation: 'fadeUp 0.3s ease both', animationDelay: `${Math.min(index, 10) * 25}ms`, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 999, background: tone.bg, color: tone.text, fontWeight: 800, fontSize: 11 }}>
                      {item.type === 'Edit' ? 'Edit' : item.type}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--c-muted)', fontWeight: 600 }}>{formatTime(item.timestamp)}</span>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--c-text)', fontSize: 13, marginBottom: 1 }}>{item.name || '-'}</div>
                  <div style={{ fontSize: 10, color: 'var(--c-muted)', fontWeight: 600, marginBottom: 5, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {idLabel && <span style={{ color: '#6366f1' }}>{idLabel}</span>}
                    {(item.section || item.department) && (
                      <span>{[item.section, shortCode(item.department)].filter(Boolean).join(' | ')}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ color: '#6366f1', fontWeight: 800, fontSize: 11 }}>{item.roomId || '-'}</span>
                    {item.bedNo ? <span style={{ color: 'var(--c-muted)', fontSize: 10, fontWeight: 600 }}>Bed {item.bedNo}</span> : null}
                    {item.details ? <span style={{ color: 'var(--c-text-2)', fontSize: 11, fontWeight: 500 }}>— {item.details}</span> : null}
                  </div>
                  {isAdmin && (
                    <div style={{ marginTop: 7, display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteEntry(item.id); }}
                        disabled={deletingId === item.id}
                        title="Delete this entry"
                        style={{ background: '#fff1f2', border: '1px solid #fca5a5', cursor: 'pointer', color: '#dc2626', opacity: deletingId === item.id ? 0.4 : 1, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 7, lineHeight: 1 }}
                      >Delete</button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ── Desktop table view ── */
        <div style={{ background: 'var(--c-card)', borderRadius: 18, boxShadow: '0 8px 26px rgba(30,49,95,.08)', border: '1px solid var(--c-border-2)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: cols, padding: '0 20px', height: 44, alignItems: 'center', background: 'linear-gradient(180deg, var(--c-card-alt) 0%, var(--c-card-hdr) 100%)', borderBottom: '1px solid var(--c-border-2)', gap: 12 }}>
            {[...['Action', 'Person', 'Room', 'Details', 'Time'], ...(isAdmin ? [''] : [])].map(label => (
              <span key={label} style={{ fontSize: 10.5, fontWeight: 700, color: '#7f93b3', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                {label}
              </span>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: '56px 20px', textAlign: 'center', color: 'var(--c-muted)' }}>
              No stay activity has been recorded yet for this filter.
            </div>
          ) : (
            filtered.map((item, index) => {
              const tone = ACTION_STYLES[item.type] || ACTION_STYLES.Edit;
              const rowBg = index % 2 === 0 ? 'var(--c-card)' : 'var(--c-card-alt)';
              const idLabel = item.staffId ? `ID ${item.staffId}` : item.wpPpNo ? `WP/PP ${item.wpPpNo}` : null;
              return (
                <div
                  key={item.id || index}
                  onClick={() => setDetailItem(item)}
                  style={{ display: 'grid', gridTemplateColumns: cols, gap: 12, alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--c-border)', background: rowBg, cursor: 'pointer', transition: 'background 0.12s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-hover-row)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = rowBg; }}
                >
                  <div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 9px', borderRadius: 999, background: tone.bg, color: tone.text, fontWeight: 800, fontSize: 11, whiteSpace: 'nowrap' }}>
                      {item.type === 'Edit' ? 'Edit' : item.type}
                    </span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--c-text)', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name || '-'}</div>
                    <div style={{ fontSize: 11, color: 'var(--c-muted)', fontWeight: 600, marginTop: 1, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {idLabel && <span style={{ color: '#6366f1' }}>{idLabel}</span>}
                      {(item.section || item.department) && (
                        <span>{[item.section, shortCode(item.department)].filter(Boolean).join(' | ')}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ color: '#6366f1', fontWeight: 800, fontSize: 12 }}>
                    {item.roomId || '-'}
                    {item.bedNo ? <div style={{ color: 'var(--c-muted)', fontWeight: 600, fontSize: 10, marginTop: 1 }}>Bed {item.bedNo}</div> : null}
                  </div>
                  <div style={{ color: 'var(--c-text-2)', fontWeight: 600, fontSize: 12, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.details || '-'}</div>
                  <div style={{ color: 'var(--c-subtle)', fontSize: 11.5, fontWeight: 600 }}>{formatTime(item.timestamp)}</div>
                  {isAdmin && (
                    <div>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteEntry(item.id); }}
                        disabled={deletingId === item.id}
                        title="Delete this entry"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', opacity: deletingId === item.id ? 0.4 : 0.6, fontSize: 15, padding: '2px 4px', lineHeight: 1 }}
                      >✕</button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      <HistoryDetailModal item={detailItem} onClose={() => setDetailItem(null)} isMobile={isMobile} />
    </div>
  );
}

export default StayHistory;
