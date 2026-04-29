import React, { useEffect, useMemo, useState } from 'react';
import { fetchMealHistory } from '../services/mealService';

const DEFAULT_DEPARTMENTS = [
  { code: 'LOG', name: 'Logistics' },
  { code: 'MR', name: 'Marine' },
  { code: 'QM', name: 'Quality Management' },
  { code: 'SW', name: 'Steel Workshop' },
  { code: 'TIC', name: 'Thilafushi Industrial Complex' },
  { code: 'VT', name: 'Villa Transport' },
  { code: 'VMT', name: 'Vehicle Maintenance' },
  { code: 'OTH', name: 'Other' },
];

function toIsoDate(value) {
  const text = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

function formatDateForUi(isoDate = '') {
  const safe = toIsoDate(isoDate);
  if (!safe) return '-';
  const [year, month, day] = safe.split('-');
  return `${month}/${day}/${year}`;
}

function normalizeCounts(source = {}, departments = DEFAULT_DEPARTMENTS) {
  const counts = {};
  for (const item of departments) {
    const value = Number(source?.[item.code] || 0);
    counts[item.code] = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
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

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 3500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 440, background: '#fff', borderRadius: 14, border: '1px solid #dbe4f0', boxShadow: '0 18px 50px rgba(15,23,42,0.22)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <div style={{ fontWeight: 900, color: '#1e315f', fontSize: '1.02rem' }}>Meal Details</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{formatDateForUi(row.date)}</div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 800, fontSize: 16 }}>X</button>
        </div>

        <div style={{ padding: 14, display: 'grid', gap: 8 }}>
          {departments.map(item => (
            <div key={item.code} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', border: '1px solid #eef2f7', borderRadius: 8, padding: '9px 10px', background: '#fbfdff' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#1f2937', fontSize: 13 }}>{item.name}</div>
                <div style={{ color: '#94a3b8', fontSize: 11 }}>{item.code}</div>
              </div>
              <div style={{ fontWeight: 900, color: '#1d4ed8', fontSize: 17 }}>{row.counts?.[item.code] || 0}</div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid #e2e8f0', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderRadius: '0 0 14px 14px' }}>
          <div style={{ color: '#475569', fontSize: 13, fontWeight: 700 }}>Total Meals</div>
          <div style={{ color: '#0f172a', fontWeight: 900, fontSize: 18 }}>{row.total || 0}</div>
        </div>
      </div>
    </div>
  );
}

function MealHistory() {
  const [history, setHistory] = useState([]);
  const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS);
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
      const deptList = Array.isArray(payload?.departments) && payload.departments.length > 0
        ? payload.departments
        : DEFAULT_DEPARTMENTS;

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
        setNotice(payload.warning);
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

    const header = ['Date', ...departments.map(item => item.code), 'Total'];
    const lines = [header.map(escapeCsv).join(',')];

    for (const row of filteredRows) {
      const values = [
        formatDateForUi(row.date),
        ...departments.map(item => row.counts?.[item.code] || 0),
        row.total || 0,
      ];
      lines.push(values.map(escapeCsv).join(','));
    }

    const suffix = selectedMonth || new Date().toISOString().slice(0, 7);
    downloadCsv(`meal-history-${suffix}.csv`, `${lines.join('\n')}\n`);
  };

  return (
    <div className="page-container" style={{ width: '100%', maxWidth: '100%', margin: 0, padding: '24px 32px', background: 'none', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div>
          <h1 style={{ margin: 0, color: '#1e315f', fontWeight: 900, fontSize: '1.8rem' }}>Meal History</h1>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontWeight: 600 }}>Daily meal headcount snapshots by department with export.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
        <div style={{ marginBottom: 12, borderRadius: 10, border: '1px solid #fcd34d', background: '#fffbeb', color: '#92400e', padding: '10px 12px', fontWeight: 700 }}>
          {notice}
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div style={{ border: '1px solid #d8e2f2', borderRadius: 10, background: '#f8fbff', padding: '10px 12px' }}>
          <div style={{ color: '#5b7090', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Total Meals (Filtered)</div>
          <div style={{ marginTop: 5, fontWeight: 900, color: '#0f172a', fontSize: 30 }}>{totalMeals}</div>
        </div>
        <div style={{ border: '1px solid #d8e2f2', borderRadius: 10, background: '#f8fbff', padding: '10px 12px' }}>
          <div style={{ color: '#5b7090', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Average Per Day</div>
          <div style={{ marginTop: 5, fontWeight: 900, color: '#0f172a', fontSize: 30 }}>{averageMeals.toFixed(1)}</div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #dbe4f0', borderRadius: 14, overflow: 'hidden' }}>
        {loading && history.length === 0 ? <div style={{ color: '#64748b', fontWeight: 700, padding: 16 }}>Loading history...</div> : null}
        {!loading && filteredRows.length === 0 ? <div style={{ color: '#64748b', fontWeight: 700, padding: 16 }}>No meal history records for the selected filters.</div> : null}

        {filteredRows.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: 12, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #dbe4f0', background: '#f8fafc' }}>Date</th>
                  {departments.map(item => (
                    <th key={item.code} style={{ textAlign: 'center', padding: '12px 10px', fontSize: 12, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #dbe4f0', background: '#f8fafc' }}>{item.code}</th>
                  ))}
                  <th style={{ textAlign: 'center', padding: '12px 12px', fontSize: 12, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid #dbe4f0', background: '#f8fafc' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map(row => (
                  <tr key={row.date} style={{ cursor: 'pointer', borderBottom: '1px solid #edf2f7', background: '#fff' }} onClick={() => setSelectedRow(row)}>
                    <td style={{ padding: '11px 14px', color: '#1f2937', fontWeight: 700 }}>{formatDateForUi(row.date)}</td>
                    {departments.map(item => (
                      <td key={`${row.date}-${item.code}`} style={{ textAlign: 'center', padding: '11px 10px', color: '#1e3a8a', fontWeight: 700 }}>{row.counts?.[item.code] || 0}</td>
                    ))}
                    <td style={{ textAlign: 'center', padding: '11px 12px', color: '#0f172a', fontWeight: 900 }}>{row.total || 0}</td>
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
