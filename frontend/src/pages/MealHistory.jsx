import React, { useEffect, useMemo, useState } from 'react';

function useViewportWidth() {
  const [w, setW] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1200));
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
}
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
const MEAL_HISTORY_CACHE_KEY = 'tic_meal_history_cache_v2';

// Dates that were missed due to manual-refresh not being done.
// Each entry is filled by copying the closest previous date's headcount.
const MISSED_DATES = ['2026-05-15', '2026-06-12', '2026-06-16'];

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
  // Preserve any OTHER-* sub-variants from source that aren't in the main list
  for (const key of Object.keys(source || {})) {
    if (!(key in counts) && /^other(\s|[-_])/i.test(key)) {
      const value = Number(source[key] ?? 0);
      counts[key] = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    }
  }
  return counts;
}

function rowOtherTotal(counts = {}) {
  return Object.entries(counts).reduce((sum, [k, v]) => {
    if (/^other(\s|[-_]|$)/i.test(k)) return sum + (Number(v) || 0);
    return sum;
  }, 0);
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
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  // Union global departments with any extra keys in this row's counts (e.g. OTHER - X variants)
  const allRowDepts = [...new Set([...departments, ...Object.keys(row.counts || {})])].filter(d => (row.counts?.[d] || 0) > 0 || departments.includes(d));
  const sorted = allRowDepts.sort((a, b) => {
    const aOther = /^other(\s|[-_]|$)/i.test(a);
    const bOther = /^other(\s|[-_]|$)/i.test(b);
    if (aOther !== bOther) return aOther ? 1 : -1;
    return (row.counts?.[b] || 0) - (row.counts?.[a] || 0);
  });
  const maxCount = sorted.length > 0 ? (row.counts?.[sorted[0]] || 0) : 1;

  const BADGE_COLORS = [
    { bg: '#dbeafe', text: '#6366f1' },
    { bg: '#dcfce7', text: '#16a34a' },
    { bg: '#fef3c7', text: '#b45309' },
    { bg: '#f3e8ff', text: '#7c3aed' },
    { bg: '#fce7f3', text: '#be185d' },
    { bg: '#e0f2fe', text: '#0369a1' },
  ];

  return (
    <div style={{ position: 'fixed', top: isMobile ? 50 : 62, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 3500, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16, overflowY: 'auto' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 500, background: 'var(--c-card)', borderRadius: 18, boxShadow: '0 24px 80px rgba(15,23,42,0.3)', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid #e8edf5', background: 'linear-gradient(135deg, #1e315f 0%, #2563eb 100%)', borderRadius: '18px 18px 0 0' }}>
          <div>
            <div style={{ fontWeight: 900, color: '#fff', fontSize: '1.1rem', letterSpacing: '-0.2px' }}>Department Breakdown</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 3, fontWeight: 600 }}>{formatDateForUi(row.date)}</div>
          </div>
          <button onClick={onClose} style={{ border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: 13, borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&#x2715;</button>
        </div>

        <div style={{ padding: '8px 0', overflowY: 'auto', flex: 1 }}>
          {(() => {
            const mainDepts = sorted.filter(d => !/^other(\s|[-_])/i.test(d) && d.toUpperCase() !== 'OTHER');
            const otherDepts = sorted.filter(d => /^other(\s|[-_])/i.test(d) || d.toUpperCase() === 'OTHER');
            const otherTotal = otherDepts.reduce((s, d) => s + (row.counts?.[d] || 0), 0);

            const renderRow = (dept, idx, count, overrideLabel, extraStyle = {}) => {
              const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
              const sharePct = row.total > 0 ? ((count / row.total) * 100).toFixed(1) : '0.0';
              const color = BADGE_COLORS[idx % BADGE_COLORS.length];
              const label = overrideLabel !== undefined ? overrideLabel : dept;
              return (
                <div key={dept} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'center', padding: '11px 22px', borderBottom: '1px solid var(--c-border)', ...extraStyle }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 42 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 7px', borderRadius: 6, background: color.bg, color: color.text, letterSpacing: 0.4, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{shortCode(label || dept)}</span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--c-text)', fontSize: extraStyle.fontSize || 13, lineHeight: 1.3, marginBottom: 5 }}>{label}</div>
                    <div style={{ position: 'relative', height: 6, borderRadius: 6, background: 'var(--c-border)', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: count > 0 ? color.text : '#cbd5e1', borderRadius: 6, transition: 'width .4s ease' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 50 }}>
                    <span style={{ fontWeight: 900, color: count > 0 ? 'var(--c-text)' : 'var(--c-muted)', fontSize: extraStyle.fontSize ? 16 : 20, lineHeight: 1 }}>{count}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--c-muted)', fontWeight: 600, marginTop: 2 }}>{sharePct}%</span>
                  </div>
                </div>
              );
            };

            const isSingleExact = otherDepts.length === 1 && otherDepts[0].toUpperCase() === 'OTHER';

            return (
              <>
                {mainDepts.map((dept, idx) => renderRow(dept, idx, row.counts?.[dept] || 0))}
                {otherDepts.length > 0 && (() => {
                  const otherIdx = mainDepts.length;
                  const otherColor = BADGE_COLORS[otherIdx % BADGE_COLORS.length];
                  const otherPct = maxCount > 0 ? Math.round((otherTotal / maxCount) * 100) : 0;
                  const otherSharePct = row.total > 0 ? ((otherTotal / row.total) * 100).toFixed(1) : '0.0';
                  return (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'center', padding: '11px 22px', borderBottom: '1px solid var(--c-border)', borderLeft: '3px solid var(--c-border-3)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 42 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 7px', borderRadius: 6, background: otherColor.bg, color: otherColor.text, letterSpacing: 0.4, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>OTH</span>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: 'var(--c-text)', fontSize: 13, lineHeight: 1.3, marginBottom: 5 }}>OTHER</div>
                          <div style={{ position: 'relative', height: 6, borderRadius: 6, background: 'var(--c-border)', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${otherPct}%`, background: otherTotal > 0 ? otherColor.text : '#cbd5e1', borderRadius: 6, transition: 'width .4s ease' }} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 50 }}>
                          <span style={{ fontWeight: 900, color: otherTotal > 0 ? 'var(--c-text)' : 'var(--c-muted)', fontSize: 20, lineHeight: 1 }}>{otherTotal}</span>
                          <span style={{ fontSize: 10.5, color: 'var(--c-muted)', fontWeight: 600, marginTop: 2 }}>{otherSharePct}%</span>
                        </div>
                      </div>
                      {!isSingleExact && (() => {
                        const subItems = otherDepts
                          .map((dept, subIdx) => ({
                            dept,
                            subLabel: dept.replace(/^other\s*[-:/()]*\s*/i, '').trim() || dept,
                            count: row.counts?.[dept] || 0,
                            color: BADGE_COLORS[(otherIdx + 1 + subIdx) % BADGE_COLORS.length],
                          }))
                          .filter(item => item.count > 0);
                        if (subItems.length === 0) return null;
                        return (
                          <div style={{ padding: '8px 22px 12px 22px', borderBottom: '1px solid var(--c-border)', background: 'var(--c-card-alt)' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {subItems.map(({ dept, subLabel, count, color }) => (
                                <div key={dept} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--c-card)', border: '1px solid var(--c-border-2)', borderRadius: 8, padding: '5px 10px', minWidth: 0 }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text)', whiteSpace: 'nowrap' }}>{subLabel}</span>
                                  <span style={{ fontSize: 13, fontWeight: 900, background: color.bg, color: color.text, borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap' }}>{count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  );
                })()}
              </>
            );
          })()}
          {departments.length === 0 && <div style={{ color: 'var(--c-muted)', padding: 20, textAlign: 'center', fontSize: 13 }}>No department data available.</div>}
        </div>

        <div style={{ borderTop: '1px solid var(--c-border)', padding: '14px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--c-surface)', borderRadius: '0 0 18px 18px' }}>
          <div style={{ color: 'var(--c-text-2)', fontSize: 13, fontWeight: 700 }}>Total Meals</div>
          <div style={{ color: 'var(--c-text)', fontWeight: 900, fontSize: 26 }}>{row.total || 0}</div>
        </div>
      </div>
    </div>
  );
}

function MealHistory() {
  const vw = useViewportWidth();
  const isMobile = vw < 768;
  const [history, setHistory] = useState([]);
  const [departments, setDepartments] = useState([]);
  const mainTableDepts = useMemo(() => departments.filter(d => DEPT_ORDER.includes(shortCode(d))), [departments]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedRow, setSelectedRow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const hydrateFromCache = () => {
    try {
      const raw = sessionStorage.getItem(MEAL_HISTORY_CACHE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      const deptList = Array.isArray(parsed?.departments) ? parsed.departments : [];
      const rows = Array.isArray(parsed?.history) ? parsed.history : [];
      if (deptList.length === 0 || rows.length === 0) return false;
      setDepartments(sortDepartments(deptList));
      setHistory(rows);
      return true;
    } catch {
      return false;
    }
  };

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

      try {
        sessionStorage.setItem(MEAL_HISTORY_CACHE_KEY, JSON.stringify({
          departments: deptList,
          history: (Array.isArray(payload?.history) ? payload.history : []).map(item => ({
            date: toIsoDate(item.date),
            counts: normalizeCounts(item.counts || {}, deptList),
            total: Number.isFinite(Number(item.total || 0)) ? Math.max(0, Math.floor(Number(item.total || 0))) : 0,
          })).filter(item => item.date),
        }));
      } catch {
        // ignore cache write issues
      }

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
    hydrateFromCache();
    loadHistory();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh at midnight so the new day's snapshot appears automatically
  // without anyone needing to click Refresh.
  const [midnightTick, setMidnightTick] = useState(0);
  useEffect(() => {
    const now = new Date();
    // Fire 30 seconds after midnight to give the backend time to snapshot
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 30);
    const msUntil = tomorrow - now;

    const timer = setTimeout(() => {
      // Switch selected month in case the month rolled over
      setSelectedMonth(new Date().toISOString().slice(0, 7));
      loadHistory();
      setMidnightTick(t => t + 1); // re-trigger this effect for the next night
    }, msUntil);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [midnightTick]);

  // Inject missing dates by copying the closest prior date's headcount.
  // These rows are marked _synthetic so they can be styled differently.
  const filledHistory = useMemo(() => {
    if (history.length === 0) return history;
    const dateSet = new Set(history.map(r => r.date));
    const extras = [];

    for (const missedDate of MISSED_DATES) {
      if (dateSet.has(missedDate)) continue;
      // Find the most recent date before the missed date that has data
      const prev = history
        .filter(r => r.date < missedDate)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      if (!prev) continue;
      extras.push({ ...prev, date: missedDate, _synthetic: true, _copiedFrom: prev.date });
    }

    if (extras.length === 0) return history;
    return [...history, ...extras].sort((a, b) => b.date.localeCompare(a.date));
  }, [history]);

  const monthOptions = useMemo(() => {
    const uniq = new Set();
    for (const row of filledHistory) {
      const monthKey = row.date.slice(0, 7);
      if (monthKey) uniq.add(monthKey);
    }
    const list = [...uniq].sort((a, b) => String(b).localeCompare(String(a)));
    if (selectedMonth && !list.includes(selectedMonth)) list.unshift(selectedMonth);
    return list;
  }, [filledHistory, selectedMonth]);

  const filteredRows = useMemo(() => {
    return filledHistory.filter(row => {
      if (selectedMonth && row.date.slice(0, 7) !== selectedMonth) return false;
      if (fromDate && row.date < fromDate) return false;
      if (toDate && row.date > toDate) return false;
      return true;
    });
  }, [filledHistory, selectedMonth, fromDate, toDate]);

  const totalMeals = useMemo(() => filteredRows.reduce((sum, row) => sum + (row.total || 0), 0), [filteredRows]);
  const averageMeals = filteredRows.length > 0 ? (totalMeals / filteredRows.length) : 0;
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayRow = useMemo(() => filledHistory.find(item => item.date === todayIso) || null, [filledHistory, todayIso]);
  const todaysHeadcount = todayRow?.total || 0;

  const handleExport = () => {
    if (filteredRows.length === 0) return;

    const header = ['Date', ...mainTableDepts, 'OTHE', 'Total'];
    const lines = [header.map(escapeCsv).join(',')];

    for (const row of filteredRows) {
      const values = [
        formatDateForUi(row.date),
        ...mainTableDepts.map(dept => row.counts?.[dept] || 0),
        rowOtherTotal(row.counts),
        row.total || 0,
      ];
      lines.push(values.map(escapeCsv).join(','));
    }

    const suffix = selectedMonth || new Date().toISOString().slice(0, 7);
    downloadCsv(`meal-history-${suffix}.csv`, `${lines.join('\n')}\n`);
  };

  return (
    <div className="page-container" style={{ width: '100%', maxWidth: '100%', margin: 0, padding: isMobile ? '10px 12px 20px' : '12px clamp(12px, 3vw, 32px) 30px', background: 'none', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: isMobile ? 6 : 16, marginBottom: isMobile ? 8 : 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8, flexWrap: 'wrap', padding: isMobile ? 7 : 10, borderRadius: isMobile ? 12 : 16, background: 'linear-gradient(180deg, var(--c-card) 0%, var(--c-card-alt) 100%)', border: '1px solid var(--c-border-2)', boxShadow: '0 10px 28px rgba(15,23,42,0.06)', width: isMobile ? '100%' : 'auto' }}>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ height: isMobile ? 28 : 36, minWidth: isMobile ? 0 : 150, flex: isMobile ? '1 1 0' : 'none', border: '1px solid var(--c-border-3)', borderRadius: 8, padding: '0 6px', fontWeight: 600, color: 'var(--c-text-2)', background: 'var(--c-card)', fontSize: isMobile ? 11 : 14 }}>
            {monthOptions.map(month => <option key={month} value={month}>{month}</option>)}
          </select>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ height: isMobile ? 28 : 36, flex: isMobile ? '1 1 0' : 'none', border: '1px solid var(--c-border-3)', borderRadius: 8, padding: '0 6px', fontWeight: 600, color: 'var(--c-text-2)', background: 'var(--c-card)', fontSize: isMobile ? 11 : 14, minWidth: 0 }} />
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ height: isMobile ? 28 : 36, flex: isMobile ? '1 1 0' : 'none', border: '1px solid var(--c-border-3)', borderRadius: 8, padding: '0 6px', fontWeight: 600, color: 'var(--c-text-2)', background: 'var(--c-card)', fontSize: isMobile ? 11 : 14, minWidth: 0 }} />
          <button onClick={handleExport} disabled={filteredRows.length === 0} style={{ height: isMobile ? 28 : 36, padding: isMobile ? '0 8px' : '0 14px', borderRadius: 8, border: '1px solid var(--c-border-3)', background: filteredRows.length === 0 ? 'var(--c-border)' : 'var(--c-card-alt)', color: 'var(--c-text)', fontWeight: 800, cursor: filteredRows.length === 0 ? 'not-allowed' : 'pointer', fontSize: isMobile ? 11 : 14, whiteSpace: 'nowrap' }}>{isMobile ? 'CSV' : 'Export CSV'}</button>
          <button onClick={loadHistory} disabled={loading} style={{ height: isMobile ? 28 : 36, padding: isMobile ? '0 8px' : '0 14px', borderRadius: 8, border: 'none', background: loading ? '#cbd5e1' : '#6366f1', color: '#fff', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', fontSize: isMobile ? 11 : 14, whiteSpace: 'nowrap' }}>{loading ? (isMobile ? '...' : 'Refreshing...') : 'Refresh'}</button>
        </div>
      </div>

      {notice ? (
        <div style={{ marginBottom: 14, borderRadius: 12, border: '1px solid #fcd34d', background: 'linear-gradient(180deg, #fffbeb 0%, #fff7d6 100%)', color: '#92400e', padding: '12px 14px', fontWeight: 700, boxShadow: '0 8px 20px rgba(146,64,14,0.08)' }}>
          {notice}
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: isMobile ? 6 : 12, marginBottom: isMobile ? 10 : 16 }}>
        <div style={{ border: '1px solid var(--c-border-2)', borderRadius: isMobile ? 10 : 14, background: 'linear-gradient(135deg, var(--c-card) 0%, var(--c-card-alt) 100%)', padding: isMobile ? '9px 10px' : '14px 16px', boxShadow: '0 12px 30px rgba(30,49,95,0.06)', animation: 'fadeUp 0.38s cubic-bezier(0.22,1,0.36,1) both', animationDelay: '0ms' }}>
          <div style={{ color: 'var(--c-subtle)', fontSize: isMobile ? 9 : 11, fontWeight: 800, textTransform: 'uppercase' }}>{isMobile ? 'Total' : 'Total Meals (Filtered)'}</div>
          <div style={{ marginTop: isMobile ? 2 : 6, fontWeight: 900, color: 'var(--c-text)', fontSize: isMobile ? 20 : 32, animation: 'numberPop 0.5s cubic-bezier(0.22,1,0.36,1) both', animationDelay: '120ms' }}>{totalMeals}</div>
        </div>
        <div style={{ border: '1px solid var(--c-border-2)', borderRadius: isMobile ? 10 : 14, background: 'linear-gradient(135deg, var(--c-card) 0%, var(--c-card-alt) 100%)', padding: isMobile ? '9px 10px' : '14px 16px', boxShadow: '0 12px 30px rgba(30,49,95,0.06)', animation: 'fadeUp 0.38s cubic-bezier(0.22,1,0.36,1) both', animationDelay: '65ms' }}>
          <div style={{ color: 'var(--c-subtle)', fontSize: isMobile ? 9 : 11, fontWeight: 800, textTransform: 'uppercase' }}>{isMobile ? 'Avg/Day' : 'Average Per Day'}</div>
          <div style={{ marginTop: isMobile ? 2 : 6, fontWeight: 900, color: 'var(--c-text)', fontSize: isMobile ? 20 : 32, animation: 'numberPop 0.5s cubic-bezier(0.22,1,0.36,1) both', animationDelay: '185ms' }}>{averageMeals.toFixed(1)}</div>
        </div>
        <div style={{ border: '1px solid var(--c-border-2)', borderRadius: isMobile ? 10 : 14, background: 'var(--c-card)', padding: isMobile ? '9px 10px' : '14px 16px', boxShadow: '0 12px 30px rgba(30,49,95,0.06)', animation: 'fadeUp 0.38s cubic-bezier(0.22,1,0.36,1) both', animationDelay: '130ms' }}>
          <div style={{ color: '#6366f1', fontSize: isMobile ? 9 : 11, fontWeight: 800, textTransform: 'uppercase' }}>{isMobile ? 'Today' : "Today's Headcount"}</div>
          <div style={{ marginTop: isMobile ? 2 : 6, fontWeight: 900, color: 'var(--c-text)', fontSize: isMobile ? 20 : 32, animation: 'numberPop 0.5s cubic-bezier(0.22,1,0.36,1) both', animationDelay: '250ms' }}>{todaysHeadcount}</div>
        </div>
      </div>

      <div style={{ background: 'var(--c-card)', border: '1px solid var(--c-border-2)', borderRadius: 18, overflow: 'hidden', boxShadow: '0 18px 40px rgba(15,23,42,0.06)' }}>
        {loading && history.length === 0 ? <div style={{ color: 'var(--c-subtle)', fontWeight: 700, padding: 16 }}>Loading history...</div> : null}
        {!loading && filteredRows.length === 0 ? <div style={{ color: 'var(--c-subtle)', fontWeight: 700, padding: 16 }}>No meal history records for the selected filters.</div> : null}

        {filteredRows.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: isMobile ? '7px 8px' : '14px 16px', fontSize: isMobile ? 10 : 12, color: 'var(--c-text-2)', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid var(--c-border-2)', background: 'var(--c-surface)' }}>Date</th>
                  {mainTableDepts.map(dept => (
                    <th key={dept} title={dept} style={{ textAlign: 'center', padding: isMobile ? '7px 6px' : '14px 10px', fontSize: isMobile ? 10 : 12, color: 'var(--c-text-2)', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid var(--c-border-2)', background: 'var(--c-surface)', whiteSpace: 'nowrap' }}>{shortCode(dept)}</th>
                  ))}
                  <th title="Other departments (aggregated)" style={{ textAlign: 'center', padding: isMobile ? '7px 6px' : '14px 10px', fontSize: isMobile ? 10 : 12, color: 'var(--c-text-2)', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid var(--c-border-2)', background: 'var(--c-surface)', whiteSpace: 'nowrap' }}>OTHE</th>
                  <th style={{ textAlign: 'center', padding: isMobile ? '7px 6px' : '14px 12px', fontSize: isMobile ? 10 : 12, color: 'var(--c-text-2)', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid var(--c-border-2)', background: 'var(--c-surface)' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, index) => {
                  const isToday = row.date === todayIso;
                  const baseBg = isToday ? 'var(--c-today-row)' : (index % 2 === 0 ? 'var(--c-card)' : 'var(--c-card-alt)');
                  const hoverBg = isToday ? 'var(--c-today-hover)' : 'var(--c-card-alt)';
                  return (
                  <tr key={row.date} style={{ cursor: 'pointer', borderBottom: '1px solid var(--c-border)', background: baseBg, transition: 'background .15s ease' }} onClick={() => setSelectedRow(row)} onMouseEnter={e => { e.currentTarget.style.background = hoverBg; }} onMouseLeave={e => { e.currentTarget.style.background = baseBg; }}>
                    <td style={{ padding: isMobile ? '7px 8px' : '13px 16px', color: 'var(--c-text)', fontWeight: 700, fontSize: isMobile ? 11 : 14 }}>
                      {formatDateForUi(row.date)}
                    </td>
                    {mainTableDepts.map(dept => (
                      <td key={`${row.date}-${dept}`} style={{ textAlign: 'center', padding: isMobile ? '7px 6px' : '13px 10px', color: 'var(--c-text)', fontWeight: 700, fontSize: isMobile ? 11 : 14 }}>{row.counts?.[dept] || 0}</td>
                    ))}
                    <td key={`${row.date}-OTHE`} style={{ textAlign: 'center', padding: isMobile ? '7px 6px' : '13px 10px', color: 'var(--c-text)', fontWeight: 700, fontSize: isMobile ? 11 : 14 }}>{rowOtherTotal(row.counts)}</td>
                    <td style={{ textAlign: 'center', padding: isMobile ? '7px 6px' : '13px 12px', color: 'var(--c-text)', fontWeight: 900, fontSize: isMobile ? 11 : 14 }}>{row.total || 0}</td>
                  </tr>
                  );
                })}
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
