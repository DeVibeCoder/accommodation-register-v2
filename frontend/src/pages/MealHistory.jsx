import React, { useEffect, useMemo, useState } from 'react';
import { fetchMealHistory } from '../services/mealService';
import { formatDisplayDate, toIsoDate } from '../utils/date';

function shortCode(value) {
  if (!value) return '-';
  const cleaned = String(value).toUpperCase().replace(/[^A-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '-';
  const parts = cleaned.split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 4);
  return parts.slice(0, 4).map(p => p[0]).join('');
}

const DEPT_ORDER = ['TIC', 'QMAR', 'VTC2', 'VMT', 'VT', 'LOGI'];

function sortDepartments(departments) {
  return [...departments].sort((a, b) => {
    const ai = DEPT_ORDER.indexOf(shortCode(a));
    const bi = DEPT_ORDER.indexOf(shortCode(b));
    const aPos = ai === -1 ? 9999 : ai;
    const bPos = bi === -1 ? 9999 : bi;
    if (aPos !== bPos) return aPos - bPos;
    return a.localeCompare(b);
  });
}

function formatDateForUi(isoDate = '') {
  return formatDisplayDate(isoDate);
}

function normalizeCounts(source = {}, departments = []) {
  const counts = {};
  for (const dept of departments) {
    const value = Number(source?.[dept] ?? 0);
    counts[dept] = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }
  return counts;
}

function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCsv(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function MealDayDetailModal({ row, departments, onClose }) {
  if (!row) return null;

  const sorted = [...departments].sort((a, b) => (row.counts?.[b] || 0) - (row.counts?.[a] || 0));
  const maxCount = sorted.length > 0 ? (row.counts?.[sorted[0]] || 0) : 1;

  const BADGE_COLORS = [
    { bg: '#dbeafe', text: '#1d4ed8' },
    { bg: '#dcfce7', text: '#16a34a' },
    { bg: '#fef3c7', text: '#b45309' },
    { bg: '#f3e8ff', text: '#7c3aed' },
    { bg: '#fce7f3', text: '#be185d' },
    { bg: '#e0f2fe', text: '#0369a1' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 3500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 500, background: '#fff', borderRadius: 18, boxShadow: '0 24px 80px rgba(15,23,42,0.3)', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid #e8edf5', background: 'linear-gradient(135deg, #1e315f 0%, #2563eb 100%)', borderRadius: '18px 18px 0 0' }}>
          <div>
            <div style={{ fontWeight: 900, color: '#fff', fontSize: '1.1rem', letterSpacing: '-0.2px' }}>Department Breakdown</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 3, fontWeight: 600 }}>{formatDateForUi(row.date)}</div>
          </div>
          <button onClick={onClose} style={{ border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: 13, borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&#x2715;</button>
        </div>

        <div style={{ padding: '8px 0', overflowY: 'auto', flex: 1 }}>
          {sorted.map((dept, idx) => {
            const count = row.counts?.[dept] || 0;
            const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
            const sharePct = row.total > 0 ? ((count / row.total) * 100).toFixed(1) : '0.0';
            const color = BADGE_COLORS[idx % BADGE_COLORS.length];
            return (
              <div key={dept} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'center', padding: '11px 22px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 42 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 7px', borderRadius: 6, background: color.bg, color: color.text, letterSpacing: 0.4, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{shortCode(dept)}</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 13, lineHeight: 1.3, marginBottom: 5 }}>{dept}</div>
                  <div style={{ position: 'relative', height: 6, borderRadius: 6, background: '#e9edf5', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: count > 0 ? color.text : '#cbd5e1', borderRadius: 6, transition: 'width .4s ease' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 50 }}>
                  <span style={{ fontWeight: 900, color: count > 0 ? '#0f172a' : '#94a3b8', fontSize: 20, lineHeight: 1 }}>{count}</span>
                  <span style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>{sharePct}%</span>
                </div>
              </div>
            );
          })}
          {departments.length === 0 && <div style={{ color: '#94a3b8', padding: 20, textAlign: 'center', fontSize: 13 }}>No department data available.</div>}
        </div>

        <div style={{ borderTop: '1px solid #e8edf5', padding: '14px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderRadius: '0 0 18px 18px' }}>
          <div style={{ color: '#475569', fontSize: 13, fontWeight: 700 }}>Total Meals</div>
          <div style={{ color: '#0f172a', fontWeight: 900, fontSize: 26 }}>{row.total || 0}</div>
        </div>
      </div>
    </div>
  );
}

function MealHistory() {
  const [history, setHistory] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedRow, setSelectedRow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const loadHistory = async () => {
    setLoading(true);
    setNotice('');
    try {
      const payload = await fetchMealHistory();
      const rawDepts = Array.isArray(payload?.departments) ? payload.departments : [];
      // departments is now array of actual department name strings
      const deptList = sortDepartments(rawDepts.filter(d => typeof d === 'string' && d.trim()));

      setDepartments(deptList);
      setHistory(
        (Array.isArray(payload?.history) ? payload.history : []).map(item => {
          const date = toIsoDate(item.date);
          const counts = normalizeCounts(item.counts || {}, deptList);
          const total = Number(item.total || 0);
          return {
            date,
            counts,
            total: Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0,
          };
        }).filter(item => item.date)
      );

      if (payload?.warning) {
        const msg = String(payload.warning);
        // Suppress table-setup noise — live data still shows correctly
        if (!msg.toLowerCase().includes('schema cache') && !msg.toLowerCase().includes('meal_history_daily')) {
          setNotice(msg);
        }
      }
    } catch (error) {
      setNotice(error?.message || 'Unable to load meal history.');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const monthOptions = useMemo(() => {
    const uniq = new Set();
    for (const row of history) {
      const monthKey = row.date.slice(0, 7);
      if (monthKey) uniq.add(monthKey);
    }
    const list = [...uniq].sort((a, b) => String(b).localeCompare(String(a)));
    if (selectedMonth && !list.includes(selectedMonth)) list.unshift(selectedMonth);
    return list;
  }, [history, selectedMonth]);

  const filteredRows = useMemo(() => {
    return history.filter(row => {
      if (selectedMonth && row.date.slice(0, 7) !== selectedMonth) return false;
      if (fromDate && row.date < fromDate) return false;
      if (toDate && row.date > toDate) return false;
      return true;
    });
  }, [history, selectedMonth, fromDate, toDate]);

  const totalMeals = useMemo(() => filteredRows.reduce((sum, row) => sum + (row.total || 0), 0), [filteredRows]);
  const averageMeals = filteredRows.length > 0 ? (totalMeals / filteredRows.length) : 0;

  const handleExport = () => {
    if (filteredRows.length === 0) return;

    const header = ['Date', ...departments, 'Total'];
    const lines = [header.map(escapeCsv).join(',')];

    for (const row of filteredRows) {
      const values = [
        formatDateForUi(row.date),
        ...departments.map(dept => row.counts?.[dept] || 0),
        row.total || 0,
      ];
      lines.push(values.map(escapeCsv).join(','));
    }

    const suffix = selectedMonth || new Date().toISOString().slice(0, 7);
    downloadCsv(`meal-history-${suffix}.csv`, `${lines.join('\n')}\n`);
  };

  return (
    <div className="page-container" style={{ width: '100%', maxWidth: '100%', margin: 0, padding: '24px 32px 36px', background: 'none', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, color: '#1e315f', fontWeight: 900, fontSize: '1.8rem' }}>Meal History</h1>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontWeight: 600 }}>Daily meal headcount snapshots by department with export.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: 10, borderRadius: 16, background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)', border: '1px solid #dbe4f0', boxShadow: '0 10px 28px rgba(15,23,42,0.06)' }}>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ height: 36, minWidth: 150, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 10px', fontWeight: 600, color: '#334155' }}>
            {monthOptions.map(month => <option key={month} value={month}>{month}</option>)}
          </select>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ height: 36, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 10px', fontWeight: 600, color: '#334155' }} />
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ height: 36, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 10px', fontWeight: 600, color: '#334155' }} />
          <button onClick={handleExport} disabled={filteredRows.length === 0} style={{ height: 36, padding: '0 14px', borderRadius: 8, border: '1px solid #94a3b8', background: filteredRows.length === 0 ? '#e2e8f0' : '#dbe4ef', color: '#1e315f', fontWeight: 800, cursor: filteredRows.length === 0 ? 'not-allowed' : 'pointer' }}>Export CSV</button>
          <button onClick={loadHistory} disabled={loading} style={{ height: 36, padding: '0 14px', borderRadius: 8, border: 'none', background: loading ? '#cbd5e1' : '#1d4ed8', color: '#fff', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer' }}>{loading ? 'Refreshing...' : 'Refresh'}</button>
        </div>
      </div>

      {notice ? (
        <div style={{ marginBottom: 14, borderRadius: 12, border: '1px solid #fcd34d', background: 'linear-gradient(180deg, #fffbeb 0%, #fff7d6 100%)', color: '#92400e', padding: '12px 14px', fontWeight: 700, boxShadow: '0 8px 20px rgba(146,64,14,0.08)' }}>
          {notice}
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div style={{ border: '1px solid #d8e2f2', borderRadius: 14, background: 'linear-gradient(135deg, #ffffff 0%, #eef6ff 100%)', padding: '14px 16px', boxShadow: '0 12px 30px rgba(30,49,95,0.06)' }}>
          <div style={{ color: '#5b7090', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Total Meals (Filtered)</div>
          <div style={{ marginTop: 6, fontWeight: 900, color: '#0f172a', fontSize: 32 }}>{totalMeals}</div>
        </div>
        <div style={{ border: '1px solid #d8e2f2', borderRadius: 14, background: 'linear-gradient(135deg, #ffffff 0%, #eef6ff 100%)', padding: '14px 16px', boxShadow: '0 12px 30px rgba(30,49,95,0.06)' }}>
          <div style={{ color: '#5b7090', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Average Per Day</div>
          <div style={{ marginTop: 6, fontWeight: 900, color: '#0f172a', fontSize: 32 }}>{averageMeals.toFixed(1)}</div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #dbe4f0', borderRadius: 18, overflow: 'hidden', boxShadow: '0 18px 40px rgba(15,23,42,0.06)' }}>
        {loading && history.length === 0 ? <div style={{ color: '#64748b', fontWeight: 700, padding: 16 }}>Loading history...</div> : null}
        {!loading && filteredRows.length === 0 ? <div style={{ color: '#64748b', fontWeight: 700, padding: 16 }}>No meal history records for the selected filters.</div> : null}

        {filteredRows.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: 12, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #dbe4f0', background: '#f8fafc' }}>Date</th>
                  {departments.map(dept => (
                    <th key={dept} title={dept} style={{ textAlign: 'center', padding: '14px 10px', fontSize: 12, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #dbe4f0', background: '#f8fafc', whiteSpace: 'nowrap' }}>{shortCode(dept)}</th>
                  ))}
                  <th style={{ textAlign: 'center', padding: '14px 12px', fontSize: 12, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #dbe4f0', background: '#f8fafc' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, index) => (
                  <tr key={row.date} style={{ cursor: 'pointer', borderBottom: '1px solid #edf2f7', background: index % 2 === 0 ? '#fff' : '#fbfdff', transition: 'background .15s ease' }} onClick={() => setSelectedRow(row)} onMouseEnter={e => { e.currentTarget.style.background = '#eef6ff'; }} onMouseLeave={e => { e.currentTarget.style.background = index % 2 === 0 ? '#fff' : '#fbfdff'; }}>
                    <td style={{ padding: '13px 16px', color: '#1f2937', fontWeight: 700 }}>{formatDateForUi(row.date)}</td>
                    {departments.map(dept => (
                      <td key={`${row.date}-${dept}`} style={{ textAlign: 'center', padding: '13px 10px', color: '#1e3a8a', fontWeight: 700 }}>{row.counts?.[dept] || 0}</td>
                    ))}
                    <td style={{ textAlign: 'center', padding: '13px 12px', color: '#0f172a', fontWeight: 900 }}>{row.total || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <MealDayDetailModal row={selectedRow} departments={departments} onClose={() => setSelectedRow(null)} />
    </div>
  );
}

export default MealHistory;
