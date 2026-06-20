import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { formatDisplayDateTime } from '../utils/date';
import { deleteStayHistoryEntry } from '../services/stayHistoryService';

const FILTERS = ['All', 'Check Out', 'Check In', 'Swap', 'Move', 'Edits'];

const ACTION_STYLES = {
  'Check In': { bg: '#dcfce7', text: '#15803d' },
  'Check Out': { bg: '#fee2e2', text: '#dc2626' },
  Swap: { bg: '#ede9fe', text: '#7c3aed' },
  Move: { bg: '#dbeafe', text: '#2563eb' },
  Edit: { bg: '#fef3c7', text: '#b45309' },
};

function formatTime(value) {
  return formatDisplayDateTime(value);
}

function StayHistory() {
  const { stayHistory = [], setStayHistory, isAdmin, occupants = [] } = useOutletContext();
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
    <div style={{ width: '100%', maxWidth: '100%', margin: 0, padding: '24px 32px', background: 'none', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', boxSizing: 'border-box', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: '1.7rem', color: '#1e315f', margin: 0, letterSpacing: '-0.4px' }}>Stay History</h1>
          <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: 13 }}>
            {filtered.length} of {stayHistory.length} recorded accommodation activities
          </p>
        </div>
        <input
          type="text"
          placeholder="Search name, room, action..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: 12, border: '1.5px solid #d0d7e2', minWidth: 280, fontSize: 14, background: '#fff' }}
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
        {FILTERS.map(filter => {
          const isActive = activeFilter === filter;
          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              style={{
                padding: '9px 16px',
                borderRadius: 999,
                border: isActive ? '1px solid #2563eb' : '1px solid #d7e1ef',
                background: isActive ? '#dbeafe' : '#fff',
                color: isActive ? '#1d4ed8' : '#475569',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {filter}
            </button>
          );
        })}
      </div>

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
                      {[item.section, item.department].filter(Boolean).join(' | ')}
                    </div>
                  ) : null}
                </div>

                <div style={{ color: '#2563eb', fontWeight: 800, fontSize: 13 }}>
                  {item.roomId || '-'}
                  {item.bedNo ? <div style={{ color: '#94a3b8', fontWeight: 600, fontSize: 11, marginTop: 2 }}>Bed {item.bedNo}</div> : null}
                </div>

                <div style={{ color: '#475569', fontWeight: 600, fontSize: 13, lineHeight: 1.4 }}>
                  {item.details || '-'}
                </div>

                <div style={{ color: '#64748b', fontSize: 12.5, fontWeight: 600 }}>
                  {formatTime(item.timestamp)}
                </div>
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
    </div>
  );
}

export default StayHistory;
