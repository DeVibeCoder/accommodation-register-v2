import React, { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';

const BUILDINGS = [
  { code: 'OB', label: 'Office Building' },
  { code: 'FB', label: 'F&B Building' },
  { code: 'VTV', label: 'VTV Building' },
];

const CHART_COLORS = ['#2563eb', '#0ea5e9', '#14b8a6', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

function percent(val, total) {
  if (!total) return 0;
  return Math.round((val / total) * 100);
}

function roomCode(roomId) {
  const code = String(roomId || '').split('-')[0].toUpperCase();
  return code;
}

function normalizeLabel(value) {
  const text = String(value || '').trim();
  return text ? text : 'Unknown';
}

function toBreakdown(items, getLabel, topN = null) {
  const map = new Map();
  for (const item of items) {
    const label = normalizeLabel(getLabel(item));
    map.set(label, (map.get(label) || 0) + 1);
  }
  let rows = [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  if (topN && rows.length > topN) {
    const visible = rows.slice(0, topN);
    const otherTotal = rows.slice(topN).reduce((sum, row) => sum + row.value, 0);
    rows = [...visible, { label: 'Other', value: otherTotal }];
  }
  return rows;
}

function donutSegments(data, total, radius) {
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return data.map((row, index) => {
    const part = total ? row.value / total : 0;
    const length = part * circumference;
    const segment = {
      color: CHART_COLORS[index % CHART_COLORS.length],
      dashArray: `${length} ${circumference - length}`,
      dashOffset: -offset,
    };
    offset += length;
    return segment;
  });
}

function DonutCard({ title, data, subtitle }) {
  const total = data.reduce((sum, row) => sum + row.value, 0);
  const radius = 54;
  const size = 140;
  const stroke = 16;
  const segments = donutSegments(data, total, radius);

  return (
    <div style={{ background:'#fff', border:'1px solid #dce5f2', borderRadius:16, padding:'16px 16px', boxShadow:'0 4px 14px rgba(15,23,42,.05)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}>
        <h3 style={{ margin:0, fontSize:15, color:'#1f2a44', fontWeight:800 }}>{title}</h3>
        <span style={{ fontSize:11, color:'#64748b' }}>{subtitle}</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'minmax(128px, 140px) minmax(0, 1fr)', gap:10, alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e8eef8" strokeWidth={stroke} />
            {segments.map((seg, idx) => (
              <circle
                key={`${title}-${idx}`}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={stroke}
                strokeLinecap="butt"
                strokeDasharray={seg.dashArray}
                strokeDashoffset={seg.dashOffset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            ))}
            <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" style={{ fill:'#1e315f', fontSize:19, fontWeight:900 }}>{total}</text>
            <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" style={{ fill:'#64748b', fontSize:10, fontWeight:700, letterSpacing:'.4px' }}>TOTAL</text>
          </svg>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:170, overflowY:'auto', overflowX:'hidden', minWidth:0, paddingRight:4 }}>
          {data.map((row, idx) => {
            const pct = total ? Math.round((row.value / total) * 100) : 0;
            return (
              <div key={`${title}-${row.label}-${idx}`} style={{ display:'grid', gridTemplateColumns:'12px minmax(0, 1fr) auto auto', alignItems:'center', gap:8, fontSize:12 }}>
                <span style={{ width:10, height:10, borderRadius:99, background:CHART_COLORS[idx % CHART_COLORS.length], display:'inline-block' }} />
                <span style={{ color:'#334155', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{row.label}</span>
                <span style={{ color:'#1f2a44', fontWeight:800 }}>{row.value}</span>
                <span style={{ color:'#64748b', fontWeight:600 }}>{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const { occupants, roomsState, mealExclusionSummary } = useOutletContext();

  const metrics = useMemo(() => {
    const totalBeds = roomsState.reduce((sum, room) => sum + room.beds.length, 0);
    const occupied = occupants.length;
    const available = Math.max(totalBeds - occupied, 0);
    const excludedMeals = Number(mealExclusionSummary?.mealExcludedCount || 0);
    const mealHeadcount = Math.max(occupied - excludedMeals, 0);

    const typeBreakdown = { Permanent: 0, Temporary: 0, Project: 0 };
    occupants.forEach(o => {
      const key = String(o.personType || '').trim();
      if (key in typeBreakdown) typeBreakdown[key] += 1;
    });

    const byBuilding = BUILDINGS.map(b => {
      const total = roomsState
        .filter(r => roomCode(r.id) === b.code)
        .reduce((sum, room) => sum + room.beds.length, 0);
      const occupiedCount = occupants.filter(o => roomCode(o.roomId) === b.code).length;
      const availableCount = Math.max(total - occupiedCount, 0);
      return {
        ...b,
        total,
        occupied: occupiedCount,
        available: availableCount,
        occupancyPct: percent(occupiedCount, total),
      };
    });

    const nationalityBreakdown = toBreakdown(occupants, o => o.nationality, 8);
    const departmentBreakdown = toBreakdown(occupants, o => o.department, 8);
    const acBreakdown = [
      { label: 'AC', value: roomsState.filter(r => !!r.ac).length },
      { label: 'Non-AC', value: roomsState.filter(r => !r.ac).length },
    ];
    const shareBreakdown = toBreakdown(roomsState, r => r.type);

    return {
      totalBeds,
      occupied,
      available,
      excludedMeals,
      mealHeadcount,
      typeBreakdown,
      byBuilding,
      nationalityBreakdown,
      departmentBreakdown,
      acBreakdown,
      shareBreakdown,
    };
  }, [occupants, roomsState, mealExclusionSummary]);

  const cards = [
    { title: 'Total Beds', value: metrics.totalBeds, bg: 'linear-gradient(135deg, #e0ecff 0%, #d9f3ff 100%)', color: '#1e3a8a' },
    { title: 'Occupied Beds', value: metrics.occupied, bg: 'linear-gradient(135deg, #ffe9d6 0%, #ffe2bf 100%)', color: '#9a3412' },
    { title: 'Available Beds', value: metrics.available, bg: 'linear-gradient(135deg, #dcfce7 0%, #d1fae5 100%)', color: '#166534' },
    { title: 'Meal Headcount', value: metrics.mealHeadcount, bg: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%)', color: '#6b21a8' },
  ];

  return (
    <div style={{ width:'100%', padding:'clamp(12px, 2vw, 24px) clamp(12px, 2.6vw, 28px) 20px', boxSizing:'border-box', minHeight:'100vh', background:'linear-gradient(180deg, #f4f7fb 0%, #eef3f9 100%)', overflowX:'hidden' }}>
      <div style={{
        background:'linear-gradient(125deg, #0f172a 0%, #1e3a8a 45%, #0ea5e9 100%)',
        color:'#fff',
        borderRadius:18,
        padding:'24px 26px',
        boxShadow:'0 16px 32px rgba(15,23,42,.24)',
        marginBottom:16,
      }}>
        <div style={{ fontSize:12, opacity:.92, letterSpacing:.5, textTransform:'uppercase', fontWeight:700 }}>Live Occupancy Snapshot</div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:20, marginTop:8, flexWrap:'wrap' }}>
          <h1 style={{ margin:0, fontSize:'1.9rem', lineHeight:1.1, fontWeight:900 }}>Accommodation Dashboard</h1>
          <div style={{ fontSize:14, opacity:.95 }}>Occupancy Rate: <strong>{percent(metrics.occupied, metrics.totalBeds)}%</strong></div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(210px, 1fr))', gap:14, marginBottom:14 }}>
        {cards.map(card => (
          <div key={card.title} style={{ background:card.bg, color:card.color, borderRadius:14, padding:'16px 16px', border:'1px solid rgba(30,58,138,.09)', boxShadow:'0 5px 14px rgba(15,23,42,.06)' }}>
            <div style={{ fontSize:12, textTransform:'uppercase', fontWeight:700, letterSpacing:.5, opacity:.75 }}>{card.title}</div>
            <div style={{ fontSize:'1.9rem', fontWeight:900, marginTop:6 }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:14, marginBottom:14 }}>
        <div style={{ background:'#fff', border:'1px solid #dfe6f2', borderRadius:16, padding:'20px 22px', boxShadow:'0 6px 16px rgba(15,23,42,.05)' }}>
          <div style={{ fontWeight:800, color:'#1e315f', marginBottom:10 }}>Occupancy Overview</div>
          <div style={{ height:14, background:'#e7edf7', borderRadius:999, overflow:'hidden' }}>
            <div style={{ width:`${percent(metrics.occupied, metrics.totalBeds)}%`, height:'100%', borderRadius:999, background:'linear-gradient(90deg, #2563eb 0%, #0ea5e9 100%)' }} />
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:10, fontSize:13, color:'#64748b' }}>
            <span><strong style={{ color:'#1e315f' }}>{metrics.occupied}</strong> occupied</span>
            <span>{metrics.totalBeds} total beds</span>
            <span><strong style={{ color:'#166534' }}>{metrics.available}</strong> available</span>
          </div>
        </div>

        <div style={{ background:'#fff', border:'1px solid #dfe6f2', borderRadius:16, padding:'20px 22px', boxShadow:'0 6px 16px rgba(15,23,42,.05)' }}>
          <div style={{ fontWeight:800, color:'#1e315f', marginBottom:10 }}>Occupant Types</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {Object.entries(metrics.typeBreakdown).map(([k, v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13 }}>
                <span style={{ color:'#334155', fontWeight:600 }}>{k}</span>
                <span style={{ background:'#eef2ff', color:'#3730a3', border:'1px solid #c7d2fe', borderRadius:999, padding:'2px 9px', fontWeight:700 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background:'#fff', border:'1px solid #dfe6f2', borderRadius:16, padding:'18px 20px', boxShadow:'0 6px 16px rgba(15,23,42,.05)', marginBottom:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14 }}>
          <div style={{ fontWeight:800, color:'#1e315f' }}>Building Breakdown</div>
          <div style={{ fontSize:12, color:'#64748b' }}>Live from current room and occupancy data</div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:14 }}>
          {metrics.byBuilding.map(b => (
            <div key={b.code} style={{ border:'1px solid #d9e2f0', borderRadius:14, padding:'14px 14px', background:'linear-gradient(180deg, #ffffff 0%, #f6f9ff 100%)', boxShadow:'inset 0 1px 0 rgba(255,255,255,.8)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div>
                  <div style={{ fontWeight:800, color:'#1e293b', fontSize:16 }}>{b.label}</div>
                  <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>{b.total} total beds</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                  <span style={{ fontSize:11, fontWeight:800, color:'#1e3a8a', background:'#dbeafe', borderRadius:999, padding:'3px 8px' }}>{b.code}</span>
                  <span style={{ fontSize:11, fontWeight:800, color:'#1e315f', background:'#e0e7ff', borderRadius:999, padding:'2px 8px' }}>{b.occupancyPct}% occ</span>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
                <div style={{ border:'1px solid #dbe8fb', borderRadius:10, padding:'8px 10px', background:'#eff6ff' }}>
                  <div style={{ fontSize:11, color:'#1e40af', fontWeight:700 }}>Occupied</div>
                  <div style={{ marginTop:2, fontSize:20, color:'#1e3a8a', fontWeight:900, lineHeight:1 }}>{b.occupied}</div>
                </div>
                <div style={{ border:'1px solid #caeedb', borderRadius:10, padding:'8px 10px', background:'#ecfdf3' }}>
                  <div style={{ fontSize:11, color:'#166534', fontWeight:700 }}>Available</div>
                  <div style={{ marginTop:2, fontSize:20, color:'#166534', fontWeight:900, lineHeight:1 }}>{b.available}</div>
                </div>
              </div>

              <div style={{ height:11, background:'#e8eef7', borderRadius:999, overflow:'hidden', position:'relative' }}>
                <div style={{ width:`${b.occupancyPct}%`, height:'100%', background:'linear-gradient(90deg, #60a5fa 0%, #2563eb 45%, #1d4ed8 100%)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(250px, 1fr))', gap:14 }}>
        <DonutCard title="Nationality Breakdown" data={metrics.nationalityBreakdown} subtitle="Occupants" />
        <DonutCard title="Department Breakdown" data={metrics.departmentBreakdown} subtitle="Occupants" />
        <DonutCard title="AC and Non-AC Breakdown" data={metrics.acBreakdown} subtitle="Rooms" />
        <DonutCard title="Share Breakdown" data={metrics.shareBreakdown} subtitle="Room Types" />
      </div>
    </div>
  );
}

export default Dashboard;
