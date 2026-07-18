import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { formatDisplayDateTime } from '../utils/date';
import { deleteStayHistoryEntry } from '../services/stayHistoryService';

const FILTERS = ['All', 'Check Out', 'Check In', 'Swap', 'Move', 'Edits'];

/** Abbreviate a department name to its initials, e.g. "THILAFUSHI INDUSTRIAL COMPLEX" → "TIC" */
function shortCode(value) {
  if (!value) return '';
  const cleaned = String(value).toUpperCase().replace(/[^A-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  const parts = cleaned.split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 4);
  return parts.slice(0, 4).map(p => p[0]).join('');
}

const ACTION_STYLES = {
  'Check In': { bg: '#dcfce7', text: '#15803d' },
  'Check Out': { bg: '#fee2e2', text: '#dc2626' },
  Swap: { bg: '#ede9fe', text: '#7c3aed' },
  Move: { bg: '#dbeafe', text: '#6366f1' },
  Edit: { bg: '#fef3c7', text: '#b45309' },
};

function formatTime(value) {
  return formatDisplayDateTime(value);
}

function StayHistory() {
  const { stayHistory = [], setStayHistory, isAdmin, occupants = [], isMobile = false } = useOutletContext();
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // Build a lookup of occupant section/department by name (for existing records
  // that pre-date section/department being stored in history).
  const occupantInfoByName = useMemo(() => {
    const map = new Map();
    for (const o of occupants) {
      const key = String(o.name || '').trim().toLowerCase();
      if (key && !map.has(key)) {
        map.set(key, { section: o.section || '', department: o.department || '' });
      }
    }
    return map;
  }, [occupants]);

  // Enrich history items: fill section/department from live occupant list
  // when the stored record doesn't already carry them.
  const enrichedHistory = useMemo(() => {
    return stayHistory.map(item => {
      if (item.section || item.department) return item;
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
        String(item.type || '').toLowerCase().includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [enrichedHistory, activeFilter, search]);

  return (
    <div style={{ width: '100%', maxWidth: '100%', margin: 0, padding: isMobile ? '10px 12px 16px' : '12px 24px 24px', background: 'none', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', boxSizing: 'border-box', minHeight: isMobile ? 'calc(100vh - 96px)' : '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: isMobile ? 8 : 16, marginBottom: isMobile ? 8 : 14, flexWrap: isMobile ? 'nowrap' : 'wrap' }}>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: isMobile ? 10 : 13, fontWeight: 600, flexShrink: 0 }}>
          {filtered.length} of {stayHistory.length} {isMobile ? 'activities' : 'recorded accommodation activities'}
        </p>
        <input
          type="text"
          placeholder={isMobile ? 'Search...' : 'Search name, room, action...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: isMobile ? '6px 10px' : '9px 14px', borderRadius: 10, border: '1.5px solid #d0d7e2', minWidth: isMobile ? 0 : 260, width: isMobile ? '100%' : 'auto', fontSize: isMobile ? 12 : 14, background: '#fff' }}
        />
      </div>

      <div style={{ display: 'flex', flexWrap: isMobile ? 'nowrap' : 'wrap', gap: isMobile ? 4 : 10, marginBottom: isMobile ? 10 : 18, overflowX: isMobile ? 'auto' : 'visible', scrollbarWidth: 'none' }}>
        {FILTERS.map(filter => {
          const isActive = activeFilter === filter;
          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              style={{
                padding: isMobile ? '4px 9px' : '9px 16px',
                borderRadius: 999,
                border: isActive ? '1px solid #2563eb' : '1px solid #d7e1ef',
                background: isActive ? '#dbeafe' : '#fff',
                color: isActive ? '#4338ca' : '#475569',
                fontWeight: 700,
                fontSize: isMobile ? 10 : 13,
                cursor: 'pointer',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
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
            <div style={{ padding: '40px 16px', textAlign: 'center', color: '#94a3b8', background: '#fff', borderRadius: 16 }}>
              No stay activity has been recorded yet for this filter.
            </div>
          ) : (
            filtered.map((item, index) => {
              const tone = ACTION_STYLES[item.type] || ACTION_STYLES.Edit;
              return (
                <div
                  key={item.id || index}
                  style={{
                    background: '#fff',
                    borderRadius: 14,
                    padding: '12px 14px',
                    boxShadow: '0 2px 8px rgba(30,49,95,0.06)',
                    border: '1px solid #e8eef6',
                    animation: 'fadeUp 0.3s ease both',
                    animationDelay: `${Math.min(index, 10) * 25}ms`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, background: tone.bg, color: tone.text, fontWeight: 800, fontSize: 11 }}>
                      {item.type === 'Edit' ? 'Edit' : item.type}
                    </span>
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{formatTime(item.timestamp)}</span>
                  </div>
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14, marginBottom: 2 }}>{item.name || '-'}</div>
                  {(item.section || item.department) ? (
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 6 }}>
                      {[item.section, shortCode(item.department)].filter(Boolean).join(' | ')}
                    </div>
                  ) : <div style={{ marginBottom: 6 }} />}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ color: '#6366f1', fontWeight: 800, fontSize: 12 }}>{item.roomId || '-'}</span>
                    {item.bedNo ? <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600 }}>Bed {item.bedNo}</span> : null}
                    {item.details ? <span style={{ color: '#475569', fontSize: 12, fontWeight: 500 }}>— {item.details}</span> : null}
                  </div>
                  {isAdmin && (
                    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleDeleteEntry(item.id)}
                        disabled={deletingId === item.id}
                        title="Delete this entry"
                        style={{ background: '#fff1f2', border: '1px solid #fca5a5', cursor: 'pointer', color: '#dc2626', opacity: deletingId === item.id ? 0.4 : 1, fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 7, lineHeight: 1 }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ── Desktop table view ── */
        <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 26px rgba(30,49,95,.08)', border: '1px solid #dfe6f1', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1.2fr 0.9fr 1fr 1.8fr 1fr auto' : '1.2fr 0.9fr 1fr 1.8fr 1fr', padding: '0 20px', height: 46, alignItems: 'center', background: 'linear-gradient(180deg, #f8fbff 0%, #f3f7fd 100%)', borderBottom: '1px solid #dfe6f1', gap: 12 }}>
            {[...['Action', 'Person', 'Room', 'Details', 'Time'], ...(isAdmin ? [''] : [])].map(label => (
              <span key={label} style={{ fontSize: 10.5, fontWeight: 700, color: '#7f93b3', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                {label}
              </span>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: '56px 20px', textAlign: 'center', color: '#94a3b8' }}>
              No stay activity has been recorded yet for this filter.
            </div>
          ) : (
            filtered.map((item, index) => {
              const tone = ACTION_STYLES[item.type] || ACTION_STYLES.Edit;
              const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fbff';
              return (
                <div
                  key={item.id || index}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isAdmin ? '1.2fr 0.9fr 1fr 1.8fr 1fr auto' : '1.2fr 0.9fr 1fr 1.8fr 1fr',
                    gap: 12,
                    alignItems: 'center',
                    padding: '14px 20px',
                    borderBottom: '1px solid #e8eef6',
                    background: rowBg,
                  }}
                >
                  <div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 10px', borderRadius: 999, background: tone.bg, color: tone.text, fontWeight: 800, fontSize: 12 }}>
                      {item.type === 'Edit' ? 'Edit' : item.type}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 13.5 }}>
                    {item.name || '-'}
                    {(item.section || item.department) ? (
                      <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>
                        {[item.section, shortCode(item.department)].filter(Boolean).join(' | ')}
                      </div>
                    ) : null}
                  </div>
                  <div style={{ color: '#6366f1', fontWeight: 800, fontSize: 13 }}>
                    {item.roomId || '-'}
                    {item.bedNo ? <div style={{ color: '#94a3b8', fontWeight: 600, fontSize: 11, marginTop: 2 }}>Bed {item.bedNo}</div> : null}
                  </div>
                  <div style={{ color: '#475569', fontWeight: 600, fontSize: 13, lineHeight: 1.4 }}>{item.details || '-'}</div>
                  <div style={{ color: '#64748b', fontSize: 12.5, fontWeight: 600 }}>{formatTime(item.timestamp)}</div>
                  {isAdmin && (
                    <div>
                      <button
                        onClick={() => handleDeleteEntry(item.id)}
                        disabled={deletingId === item.id}
                        title="Delete this entry"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', opacity: deletingId === item.id ? 0.4 : 0.6, fontSize: 16, padding: '2px 4px', lineHeight: 1 }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default StayHistory;
