import React, { useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import AddOccupantModal from '../components/AddOccupantModal';
import {
  fetchOccupants as fetchOccupantsFromApi,
  addOccupant as addOccupantRecord,
  importOccupants as importOccupantsRecord,
  updateOccupant as updateOccupantRecord,
} from '../services/occupancyService';
import { updateRoom as updateRoomRecord } from '../services/roomsService';

const BUILDING_ORDER = ['OFFICE BUILDING', 'F&B BUILDING', 'VTV BUILDING'];
const BUILDING_LABELS = {
  'OFFICE BUILDING': 'Office Building',
  'F&B BUILDING': 'F&B Building',
  'VTV BUILDING': 'VTV Building',
};
const PERSON_TYPE_COLORS = {
  Permanent: { bg: '#dbeafe', text: '#1d4ed8' },
  Temporary:  { bg: '#fef9c3', text: '#a16207' },
  Project:    { bg: '#dcfce7', text: '#16a34a' },
};

const OCCUPANCY_TEMPLATE_HEADERS = [
  'Person Type',
  'Staff ID',
  'Full Name',
  'Section',
  'Department',
  'Nationality',
  'Room ID',
  'Bed No',
  'Fasting',
  'Check-in',
  'Check-out',
  'Status',
];

function compareRoomIds(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function normalizeRoomType(totalBeds) {
  return totalBeds === 1 ? 'Single' : `${totalBeds} Share`;
}

function normalizeImportedRoomId(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[\s_/]+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function normalizeImportedStatus(status, checkOut = '') {
  const normalized = String(status || '').trim().toLowerCase();
  if (!normalized) return checkOut ? 'Checked Out' : 'Active';
  if (normalized === 'active') return 'Active';
  if (normalized.includes('check') && normalized.includes('out')) return 'Checked Out';
  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function resolveRoomId(rawRoomId, rooms = []) {
  const normalized = normalizeImportedRoomId(rawRoomId);
  if (!normalized) return '';

  const exact = rooms.find(room => String(room.id || '').toUpperCase() === normalized);
  if (exact) return exact.id;

  const compact = normalized.replace(/-/g, '');
  const compactExact = rooms.find(room => String(room.id || '').toUpperCase().replace(/-/g, '') === compact);
  if (compactExact) return compactExact.id;

  const match = normalized.match(/^(OB|FB|VTV)-?(?:(\d+)-)?(\d+)$/i);
  if (!match) return normalized;

  const [, code, floor, roomNo] = match;
  const candidates = rooms.filter(room => {
    const id = String(room.id || '').toUpperCase();
    if (!id.startsWith(`${code}-`)) return false;
    if (floor && id === `${code}-${floor}-${roomNo}`) return true;
    return id.endsWith(`-${roomNo}`);
  });

  return candidates.length === 1 ? candidates[0].id : normalized;
}

function shortCode(value) {
  if (!value) return '-';
  const cleaned = value
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '-';
  const parts = cleaned.split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 3);
  return parts.slice(0, 4).map(p => p[0]).join('');
}

function normalizeHeader(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function escapeCsvValue(value) {
  const str = value == null ? '' : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function buildCsv(headers, rows) {
  const lines = [headers.map(escapeCsvValue).join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => escapeCsvValue(row[h] ?? '')).join(','));
  }
  return lines.join('\n');
}

function parseCsvLine(line) {
  const values = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      values.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  values.push(cur.trim());
  return values;
}

function parseCsvText(text) {
  const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(parseCsvLine);
  return { headers, rows };
}

/* ── Swap Modal ── */
function SwapModal({ open, onClose, occupant, allOccupants, onSwap }) {
  const [search, setSearch] = useState('');
  const [targetId, setTargetId] = useState(null);
  const searchRef = useRef(null);

  React.useEffect(() => {
    if (open) { setSearch(''); setTargetId(null); setTimeout(() => searchRef.current?.focus(), 80); }
  }, [open]);

  if (!open || !occupant) return null;

  const q = search.trim().toLowerCase();
  const others = allOccupants.filter(o => o._id !== occupant._id);
  const filtered = q
    ? others.filter(o =>
        o.name.toLowerCase().includes(q) ||
        String(o.staffId).toLowerCase().includes(q) ||
        o.roomId.toLowerCase().includes(q) ||
        (o.section || '').toLowerCase().includes(q) ||
        (o.department || '').toLowerCase().includes(q)
      )
    : others;
  const selected = targetId != null ? others.find(o => o._id === targetId) : null;

  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:3000,background:'rgba(20,30,60,.55)',display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#fff',borderRadius:18,padding:'28px 32px',maxWidth:560,width:'95%',boxShadow:'0 8px 40px rgba(30,50,120,.18)',position:'relative',display:'flex',flexDirection:'column',maxHeight:'88vh' }}>
        <button onClick={onClose} style={{ position:'absolute',top:14,right:18,fontSize:22,border:'none',background:'none',cursor:'pointer',color:'#64748b' }}>×</button>
        <h2 style={{ fontWeight:800,fontSize:'1.1rem',marginBottom:4,color:'#1e315f' }}>Swap Occupant</h2>
        <p style={{ fontSize:12,color:'#64748b',marginBottom:14 }}>
          Swapping <strong>{occupant.name}</strong> — {occupant.roomId} / Bed {occupant.bedNo}
        </p>

        {/* Search */}
        <div style={{ position:'relative',marginBottom:10 }}>
          <svg style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#94a3b8',pointerEvents:'none' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            ref={searchRef}
            type="text"
            placeholder="Search by name, ID, room, section…"
            value={search}
            onChange={e => { setSearch(e.target.value); setTargetId(null); }}
            style={{ width:'100%',boxSizing:'border-box',paddingLeft:32,paddingRight:10,paddingTop:9,paddingBottom:9,borderRadius:10,border:'1.5px solid #d0d7e2',fontSize:13,background:'#f8fafc' }}
          />
        </div>

        {/* Results list */}
        <div style={{ flex:1,overflowY:'auto',border:'1.5px solid #e2e8f0',borderRadius:12,marginBottom:16,minHeight:0 }}>
          {filtered.length === 0 && (
            <div style={{ padding:'24px',textAlign:'center',color:'#94a3b8',fontSize:13 }}>No occupants match your search.</div>
          )}
          {filtered.map(o => {
            const isSelected = o._id === targetId;
            return (
              <div
                key={o._id}
                onClick={() => setTargetId(isSelected ? null : o._id)}
                style={{
                  display:'grid',gridTemplateColumns:'1fr auto',alignItems:'center',gap:10,
                  padding:'10px 14px',cursor:'pointer',
                  background: isSelected ? '#eff6ff' : 'transparent',
                  borderBottom:'1px solid #f1f5f9',
                  transition:'background .12s',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background='#f8fafc'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background='transparent'; }}
              >
                <div>
                  <div style={{ fontWeight:700,fontSize:13,color:'#1e293b' }}>{o.name}</div>
                  <div style={{ fontSize:11,color:'#64748b',marginTop:2 }}>
                    {o.roomId} / Bed {o.bedNo}
                    {o.section ? <span style={{ marginLeft:8,color:'#94a3b8' }}>· {o.section}</span> : null}
                    {o.staffId ? <span style={{ marginLeft:8,color:'#94a3b8' }}>· ID {o.staffId}</span> : null}
                  </div>
                </div>
                {isSelected && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected preview */}
        {selected && (
          <div style={{ background:'#eff6ff',border:'1.5px solid #bfdbfe',borderRadius:10,padding:'8px 14px',marginBottom:14,fontSize:12,color:'#1e40af' }}>
            Swapping with: <strong>{selected.name}</strong> — {selected.roomId} / Bed {selected.bedNo}
          </div>
        )}

        <div style={{ display:'flex',justifyContent:'flex-end',gap:10 }}>
          <button onClick={onClose} style={{ padding:'9px 26px',borderRadius:10,border:'none',background:'#e3eafc',color:'#1e315f',fontWeight:700,cursor:'pointer' }}>Cancel</button>
          <button
            disabled={targetId == null}
            onClick={() => { onSwap(occupant._id, targetId); onClose(); }}
            style={{ padding:'9px 26px',borderRadius:10,border:'none',background:targetId!=null?'#3b82f6':'#93c5fd',color:'#fff',fontWeight:700,cursor:targetId!=null?'pointer':'not-allowed' }}
          >
            Confirm Swap
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Move Modal ── */
function MoveModal({ open, onClose, occupant, allRooms, onMove }) {
  const [targetRoom, setTargetRoom] = useState('');
  const [targetBed, setTargetBed] = useState('');
  if (!open || !occupant) return null;
  const orderedRooms = [...allRooms].sort((a,b)=>compareRoomIds(a.id,b.id));
  const selRoom = allRooms.find(r=>r.id===targetRoom);
  const availBeds = selRoom ? selRoom.beds.filter(b=>!b.occupied) : [];
  const ready = targetRoom && targetBed;
  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:3000,background:'rgba(20,30,60,.55)',display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#fff',borderRadius:18,padding:'32px 40px',maxWidth:520,width:'95%',boxShadow:'0 8px 40px rgba(30,50,120,.18)',position:'relative' }}>
        <button onClick={onClose} style={{ position:'absolute',top:16,right:20,fontSize:22,border:'none',background:'none',cursor:'pointer',color:'#64748b' }}>×</button>
        <h2 style={{ fontWeight:800,fontSize:'1.15rem',marginBottom:8,color:'#1e315f' }}>Move Occupant</h2>
        <p style={{ fontSize:13,color:'#64748b',marginBottom:20 }}>Moving <strong>{occupant.name}</strong> from {occupant.roomId} / Bed {occupant.bedNo}</p>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:24 }}>
          <label style={{ display:'flex',flexDirection:'column',fontWeight:600,fontSize:14,color:'#334155',gap:6 }}>Room
            <select value={targetRoom} onChange={e=>{setTargetRoom(e.target.value);setTargetBed('');}} style={{ padding:'9px 12px',borderRadius:10,border:'1.5px solid #d0d7e2',fontSize:14 }}>
              <option value="">Select room…</option>
              {orderedRooms.filter(r=>r.id!==occupant.roomId && r.beds.some(b=>!b.occupied)).map(r=>(
                <option key={r.id} value={r.id}>{r.id}</option>
              ))}
            </select>
          </label>
          <label style={{ display:'flex',flexDirection:'column',fontWeight:600,fontSize:14,color:'#334155',gap:6 }}>Bed
            <select value={targetBed} onChange={e=>setTargetBed(e.target.value)} style={{ padding:'9px 12px',borderRadius:10,border:'1.5px solid #d0d7e2',fontSize:14 }}>
              <option value="">Select bed…</option>
              {availBeds.map(b=><option key={b.bedId} value={b.bedId}>{b.bedId}</option>)}
            </select>
          </label>
        </div>
        <div style={{ display:'flex',justifyContent:'flex-end',gap:12 }}>
          <button onClick={onClose} style={{ padding:'9px 28px',borderRadius:10,border:'none',background:'#e3eafc',color:'#1e315f',fontWeight:700,cursor:'pointer' }}>Cancel</button>
          <button disabled={!ready} onClick={()=>{ onMove(occupant._id,targetRoom,targetBed); onClose(); }} style={{ padding:'9px 28px',borderRadius:10,border:'none',background:ready?'#10b981':'#6ee7b7',color:'#fff',fontWeight:700,cursor:ready?'pointer':'not-allowed' }}>Confirm Move</button>
        </div>
      </div>
    </div>
  );
}

/* ── Edit Modal ── */
function EditOccupantModal({ open, onClose, occupant, onSave }) {
  const [form, setForm] = useState(null);
  React.useEffect(()=>{ if (occupant) setForm({ ...occupant }); }, [occupant]);
  if (!open || !occupant || !form) return null;
  const lbl2 = { display:'flex',flexDirection:'column',fontWeight:600,fontSize:13,color:'#475569',gap:5 };
  const inp2 = { padding:'10px 12px',borderRadius:10,border:'1.5px solid #d0d7e2',fontSize:13,fontWeight:500,color:'#1e293b',background:'#fff' };
  const handle = e => setForm(f=>({...f,[e.target.name]:e.target.value}));
  const handleFasting = e => setForm(f=>({...f,fasting:e.target.value==='true'}));
  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:3000,background:'rgba(20,30,60,.55)',display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#fff',borderRadius:18,padding:'40px',maxWidth:700,width:'95%',boxShadow:'0 8px 40px rgba(30,50,120,.18)',position:'relative' }}>
        <button onClick={onClose} style={{ position:'absolute',top:16,right:20,fontSize:24,border:'none',background:'none',cursor:'pointer',color:'#94a3b8' }}>×</button>
        <h2 style={{ fontWeight:800,fontSize:'1.3rem',marginBottom:32,color:'#1e315f',letterSpacing:'-0.3px' }}>Edit Occupant</h2>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'18px 24px',marginBottom:32 }}>
          <label style={lbl2}>Person Type<select name="personType" value={form.personType} onChange={handle} style={inp2}><option value="Permanent">Permanent</option><option value="Temporary">Temporary</option><option value="Project">Project</option></select></label>
          <label style={lbl2}>Staff ID<input name="staffId" value={form.staffId} onChange={handle} style={inp2} /></label>
          <label style={{...lbl2,gridColumn:'1/3'}}>Full Name<input name="name" value={form.name} onChange={handle} style={inp2} /></label>
          <label style={lbl2}>Section<input name="section" value={form.section} onChange={handle} style={inp2} /></label>
          <label style={lbl2}>Department<input name="department" value={form.department} onChange={handle} style={inp2} /></label>
          <label style={lbl2}>Nationality<input name="nationality" value={form.nationality} onChange={handle} style={inp2} /></label>
          <label style={lbl2}>Fasting<select name="fasting" value={String(form.fasting)} onChange={handleFasting} style={inp2}><option value="true">Yes</option><option value="false">No</option></select></label>
        </div>
        <div style={{ display:'flex',justifyContent:'flex-end',gap:12 }}>
          <button onClick={onClose} style={{ padding:'10px 32px',borderRadius:10,border:'none',background:'#e3eafc',color:'#1e315f',fontWeight:700,cursor:'pointer',fontSize:14 }}>Cancel</button>
          <button onClick={()=>{ onSave(form); onClose(); }} style={{ padding:'10px 32px',borderRadius:10,border:'none',background:'#3b82f6',color:'#fff',fontWeight:700,cursor:'pointer',fontSize:14 }}>Save</button>
        </div>
      </div>
    </div>
  );
}

/* ── Confirm Modal ── */
function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel='Confirm', confirmColor='#ef4444' }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:3000,background:'rgba(20,30,60,.55)',display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#fff',borderRadius:18,padding:'32px 40px',maxWidth:420,width:'95%',boxShadow:'0 8px 40px rgba(30,50,120,.18)' }}>
        <h2 style={{ fontWeight:800,fontSize:'1.1rem',marginBottom:10,color:'#1e315f' }}>{title}</h2>
        <p style={{ fontSize:14,color:'#64748b',marginBottom:28 }}>{message}</p>
        <div style={{ display:'flex',justifyContent:'flex-end',gap:12 }}>
          <button onClick={onClose} style={{ padding:'9px 28px',borderRadius:10,border:'none',background:'#e3eafc',color:'#1e315f',fontWeight:700,cursor:'pointer' }}>Cancel</button>
          <button onClick={()=>{ onConfirm(); onClose(); }} style={{ padding:'9px 28px',borderRadius:10,border:'none',background:confirmColor,color:'#fff',fontWeight:700,cursor:'pointer' }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Action button ── */
function ActionBtn({ title, children, onClick, color='#64748b', hoverColor='#1e293b', bgGradient=null }) {
  const [hov, setHov] = useState(false);
  return (
    <button title={title} onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ width:30,height:30,borderRadius:9,border:'1px solid #d7e0ec',background:bgGradient||(hov?'#f1f5f9':'#fff'),cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:hov?hoverColor:color,transition:'all .15s',flexShrink:0,boxShadow:hov?'0 2px 6px rgba(30,49,95,.16)':'0 1px 2px rgba(30,49,95,.08)' }}>
      {children}
    </button>
  );
}

const IconEdit=()=>(<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>);
const IconDelete=()=>(<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>);
const IconSwap=()=>(<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16V4m0 0L3 8m4-4l4 4"/><path d="M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>);
const IconMove=()=>(<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>);
const IconCheckout=()=>(<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>);

function buildingFrom(roomId) {
  if (roomId.startsWith('OB-'))  return 'OFFICE BUILDING';
  if (roomId.startsWith('FB-'))  return 'F&B BUILDING';
  if (roomId.startsWith('VTV-')) return 'VTV BUILDING';
  return 'UNKNOWN';
}
function buildingCodeFrom(roomId) {
  if (roomId.startsWith('OB-'))  return 'OB';
  if (roomId.startsWith('FB-'))  return 'FB';
  if (roomId.startsWith('VTV-')) return 'VTV';
  return '??';
}

function Occupancy() {
  const { occupants, setOccupants, roomsState, setRoomsState, getNextUid, addStayHistory, canEditAccommodation = true } = useOutletContext();
  const importInputRef = useRef(null);

  const refreshOccupantsFromBackend = async () => {
    const remote = await fetchOccupantsFromApi();
    const live = Array.isArray(remote)
      ? remote.filter(item => /^(OB|FB|VTV)-/i.test(String(item?.roomId || '')))
      : [];

    setOccupants(live.map(item => ({ ...item, _id: getNextUid() })));
    return live;
  };

  const syncRoomCapacities = async (assignments = []) => {
    if (!Array.isArray(assignments) || assignments.length === 0) return;

    const requiredByRoom = new Map();
    assignments.forEach(item => {
      const roomId = String(item?.roomId || '').toUpperCase();
      const bedNo = Number.parseInt(item?.bedNo, 10) || 1;
      if (!roomId) return;
      requiredByRoom.set(roomId, Math.max(requiredByRoom.get(roomId) || 0, bedNo));
    });

    const roomsToPersist = [];

    setRoomsState(prev => prev.map(room => {
      const roomId = String(room.id || '').toUpperCase();
      const requiredBeds = requiredByRoom.get(roomId);
      const currentBeds = Math.max(1, Number.parseInt(room.totalBeds, 10) || 1);

      if (!requiredBeds || requiredBeds <= currentBeds) return room;

      const nextRoom = {
        ...room,
        totalBeds: requiredBeds,
        type: normalizeRoomType(requiredBeds),
        beds: Array.from({ length: requiredBeds }, (_, index) => room.beds?.[index] || {
          bedId: `Bed ${index + 1}`,
          occupied: false,
          occupant: null,
        }),
      };

      roomsToPersist.push(nextRoom);
      return nextRoom;
    }));

    for (const room of roomsToPersist) {
      await updateRoomRecord(room.id, room);
    }
  };

  const [personTypeFilter, setPersonTypeFilter] = useState('All');
  const [buildingFilter,   setBuildingFilter]   = useState('All');
  const [idNameSearch,     setIdNameSearch]      = useState('');
  const [roomSearch,       setRoomSearch]        = useState('');

  const [addOpen,        setAddOpen]        = useState(false);
  const [editTarget,     setEditTarget]     = useState(null);
  const [swapTarget,     setSwapTarget]     = useState(null);
  const [moveTarget,     setMoveTarget]     = useState(null);
  const [deleteTarget,   setDeleteTarget]   = useState(null);
  const [checkoutTarget, setCheckoutTarget] = useState(null);
  const [importNotice, setImportNotice] = useState(null);

  const filtered = useMemo(()=>{
    return occupants.filter(o=>{
      if (personTypeFilter!=='All' && o.personType!==personTypeFilter) return false;
      if (buildingFilter!=='All' && o.building!==buildingFilter) return false;
      if (idNameSearch.trim()){
        const q=idNameSearch.trim().toLowerCase();
        if (!o.name.toLowerCase().includes(q) && !String(o.staffId).toLowerCase().includes(q)) return false;
      }
      if (roomSearch.trim()){
        const q=roomSearch.trim().toLowerCase();
        if (!o.roomId.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  },[occupants,personTypeFilter,buildingFilter,idNameSearch,roomSearch]);

  const grouped = useMemo(()=>{
    const buildingRank = Object.fromEntries(BUILDING_ORDER.map((b,i)=>[b,i]));
    const sorted=[...filtered].sort((a,b)=>{
      const ra=buildingRank[a.building]??99, rb=buildingRank[b.building]??99;
      if (ra!==rb) return ra-rb;
      const rc=compareRoomIds(a.roomId,b.roomId);
      if (rc!==0) return rc;
      return a.bedNo-b.bedNo;
    });
    const result=[];
    let curBuilding=null;
    let occupantRowIndex = 0;
    for(const occ of sorted){
      if(occ.building!==curBuilding){
        curBuilding=occ.building;
        result.push({type:'building',name:occ.building,label:BUILDING_LABELS[occ.building]||occ.building});
      }
      result.push({type:'occupant',occ,rowIndex:occupantRowIndex});
      occupantRowIndex += 1;
    }
    return result;
  },[filtered]);

  const handleAdd = async form => {
    if (!canEditAccommodation) return;

    const normalized = {
      _id: getNextUid(),
      personType: form.personType,
      staffId: form.staffId,
      name: form.fullName,
      section: form.section,
      department: form.department,
      nationality: form.nationality,
      roomId: form.roomId,
      bedNo: parseInt(String(form.bedId).replace(/\D/g, ''), 10) || 1,
      fasting: String(form.fasting).toLowerCase() === 'yes' || form.fasting === true,
      checkIn: form.checkin || '',
      checkOut: '',
      status: 'Active',
      building: buildingFrom(form.roomId),
      buildingCode: buildingCodeFrom(form.roomId),
    };

    const saved = await addOccupantRecord({
      ...normalized,
      __history: {
        type: 'Check In',
        name: normalized.name,
        roomId: normalized.roomId,
        bedNo: normalized.bedNo,
        details: `Checked in to ${normalized.roomId} / Bed ${normalized.bedNo}`,
      },
    });
    if (!saved) {
      await refreshOccupantsFromBackend();
      window.alert('Unable to add occupant to live data. Please try again.');
      return;
    }

    await syncRoomCapacities([saved]);
    await refreshOccupantsFromBackend();
  };

  const handleEdit = async updated => {
    if (!canEditAccommodation) return;

    const original = occupants.find(o => o._id === updated._id);
    setOccupants(prev => prev.map(o => o._id === updated._id ? { ...o, ...updated } : o));

    const changedFields = [];
    if (original) {
      ['name', 'personType', 'staffId', 'section', 'department', 'nationality', 'fasting'].forEach(field => {
        if (String(original[field] ?? '') !== String(updated[field] ?? '')) changedFields.push(field);
      });
    }

    const saved = await updateOccupantRecord(updated?.id, {
      ...updated,
      __history: {
        type: 'Edit',
        name: updated.name,
        roomId: updated.roomId,
        bedNo: updated.bedNo,
        details: changedFields.length > 0 ? `Updated ${changedFields.join(', ')}` : 'Occupant details edited',
      },
    });
    if (!saved || saved?.success === false) {
      await refreshOccupantsFromBackend();
      window.alert(saved?.error || 'Unable to save occupant changes to live data.');
      return;
    }

    await refreshOccupantsFromBackend();
  };

  const handleDelete = async occupant => {
    if (!occupant || !canEditAccommodation) return;
    const deleted = await updateOccupantRecord(occupant?.id, {
      ...occupant,
      __action: 'delete',
      __method: 'DELETE',
      __history: {
        type: 'Edit',
        name: occupant.name,
        roomId: occupant.roomId,
        bedNo: occupant.bedNo,
        details: 'Occupant record deleted',
      },
    });
    await refreshOccupantsFromBackend();

    if (!deleted || deleted?.success === false) {
      window.alert(deleted?.error || 'Delete failed on live data. Please refresh and try again.');
      return;
    }

  };

  const handleCheckout = async occupant => {
    if (!occupant || !canEditAccommodation) return;
    const deleted = await updateOccupantRecord(occupant?.id, {
      ...occupant,
      __action: 'checkout',
      __method: 'DELETE',
      checkOut: new Date().toISOString(),
      __history: {
        type: 'Check Out',
        name: occupant.name,
        roomId: occupant.roomId,
        bedNo: occupant.bedNo,
        details: `Checked out from ${occupant.roomId} / Bed ${occupant.bedNo}`,
      },
    });
    await refreshOccupantsFromBackend();

    if (!deleted || deleted?.success === false) {
      window.alert(deleted?.error || 'Check-out failed on live data. Please refresh and try again.');
      return;
    }

  };

  const handleSwap = async (idA, idB) => {
    if (!canEditAccommodation) return;

    let swapped = [];
    let beforeA = null;
    let beforeB = null;

    setOccupants(prev => {
      const next = prev.map(o => ({ ...o }));
      const a = next.find(o => o._id === idA);
      const b = next.find(o => o._id === idB);
      if (!a || !b) return next;

      beforeA = { ...a };
      beforeB = { ...b };

      const tmpRoom = a.roomId;
      const tmpBed = a.bedNo;
      const tmpBuilding = a.building;
      const tmpCode = a.buildingCode;

      a.roomId = b.roomId;
      a.bedNo = b.bedNo;
      a.building = b.building;
      a.buildingCode = b.buildingCode;

      b.roomId = tmpRoom;
      b.bedNo = tmpBed;
      b.building = tmpBuilding;
      b.buildingCode = tmpCode;

      swapped = [{ ...a }, { ...b }];
      return next;
    });

    let allSaved = swapped.length > 0;
    for (let index = 0; index < swapped.length; index += 1) {
      const occupant = swapped[index];
      const saved = await updateOccupantRecord(occupant.id, {
        ...occupant,
        ...(index === 0 ? {
          __history: {
            type: 'Swap',
            name: `${beforeA?.name || ''} ⇄ ${beforeB?.name || ''}`,
            roomId: `${beforeA?.roomId || ''} ⇄ ${beforeB?.roomId || ''}`,
            bedNo: `${beforeA?.bedNo || ''} ⇄ ${beforeB?.bedNo || ''}`,
            details: 'Swapped occupant room and bed assignments',
          },
        } : {}),
      });
      if (!saved || saved?.success === false) allSaved = false;
    }

    await refreshOccupantsFromBackend();

    if (!allSaved) {
      window.alert('Swap failed to save on live data.');
    }
  };

  const handleMove = async (id, toRoom, toBed) => {
    if (!canEditAccommodation) return;

    let moved = null;
    let original = null;

    setOccupants(prev => prev.map(o => {
      if (o._id !== id) return o;
      original = { ...o };
      const bedNum = parseInt(String(toBed).replace(/\D/g, ''), 10) || o.bedNo;
      moved = {
        ...o,
        roomId: toRoom,
        bedNo: bedNum,
        building: buildingFrom(toRoom),
        buildingCode: buildingCodeFrom(toRoom),
      };
      return moved;
    }));

    await syncRoomCapacities(moved ? [moved] : []);

    if (moved) {
      const saved = await updateOccupantRecord(moved.id, {
        ...moved,
        __history: {
          type: 'Move',
          name: moved.name,
          roomId: moved.roomId,
          bedNo: moved.bedNo,
          details: `Moved from ${original?.roomId || ''} / Bed ${original?.bedNo || ''} to ${moved.roomId} / Bed ${moved.bedNo}`,
        },
      });
      await refreshOccupantsFromBackend();

      if (!saved || saved?.success === false) {
        window.alert(saved?.error || 'Move failed to save on live data.');
      }
      return;
    }

    await refreshOccupantsFromBackend();
  };

  const downloadCsv = (fileName, csvContent) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    const rows = filtered.map(o => ({
      'Person Type': o.personType || '',
      'Staff ID': o.staffId || '',
      'Full Name': o.name || '',
      Section: o.section || '',
      Department: o.department || '',
      Nationality: o.nationality || '',
      'Room ID': o.roomId || '',
      'Bed No': o.bedNo ?? '',
      Fasting: o.fasting === true || String(o.fasting).toLowerCase() === 'yes' ? 'Yes' : 'No',
      'Check-in': o.checkIn || '',
      'Check-out': o.checkOut || '',
      Status: o.status || 'Active',
    }));
    const csv = buildCsv(OCCUPANCY_TEMPLATE_HEADERS, rows);
    downloadCsv(`occupancy-export-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  const handleTemplate = () => {
    const sample = [{
      'Person Type': 'Permanent',
      'Staff ID': 'S10001',
      'Full Name': 'JOHN DOE',
      Section: 'ACCOUNTS',
      Department: 'FINANCE',
      Nationality: 'SL',
      'Room ID': 'OB-1-101',
      'Bed No': '1',
      Fasting: 'No',
      'Check-in': '2026-01-01',
      'Check-out': '',
      Status: 'Active',
    }];
    const csv = buildCsv(OCCUPANCY_TEMPLATE_HEADERS, sample);
    downloadCsv('occupancy-import-template.csv', csv);
  };

  const handleImportClick = () => {
    if (importInputRef.current) importInputRef.current.click();
  };

  const handleImportFile = async e => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;

    setImportNotice(null);

    try {
      const text = await file.text();
      const parsed = parseCsvText(text);
      const normalizedExpected = OCCUPANCY_TEMPLATE_HEADERS.map(normalizeHeader);
      const normalizedHeaders = parsed.headers.map(normalizeHeader);
      const isExactTemplate = normalizedExpected.every((h, idx) => normalizedHeaders[idx] === h);

      if (!isExactTemplate) {
        setImportNotice({
          type: 'error',
          text: 'Import failed: CSV does not match the occupancy template format. Please use the Template file.',
        });
        return;
      }

      const roomIds = new Set(roomsState.map(r => r.id));
      const validTypes = new Set(['permanent', 'temporary', 'project']);
      const rows = parsed.rows;
      const additions = [];
      let skippedCount = 0;

      for (const cols of rows) {
        const get = header => cols[OCCUPANCY_TEMPLATE_HEADERS.indexOf(header)] ?? '';
        const personTypeRaw = get('Person Type').trim();
        const staffId = get('Staff ID').trim();
        const fullName = get('Full Name').trim();
        const section = get('Section').trim();
        const department = get('Department').trim();
        const nationality = get('Nationality').trim();
        const rawRoomId = get('Room ID').trim();
        const roomId = resolveRoomId(rawRoomId, roomsState);
        const bedNoStr = get('Bed No').trim();
        const fastingRaw = get('Fasting').trim().toLowerCase();
        const checkIn = get('Check-in').trim();

        const personTypeKey = personTypeRaw.toLowerCase();
        const personType = personTypeKey ? personTypeKey[0].toUpperCase() + personTypeKey.slice(1) : '';
        const bedNo = parseInt(bedNoStr, 10);

        if (!validTypes.has(personTypeKey) || !fullName || !roomId || !Number.isFinite(bedNo) || !roomIds.has(roomId)) {
          skippedCount += 1;
          continue;
        }

        additions.push({
          _id: getNextUid(),
          personType,
          staffId,
          name: fullName,
          section,
          department,
          nationality,
          roomId,
          bedNo,
          fasting: fastingRaw === 'yes',
          checkIn,
          checkOut: '',
          status: 'Active',
          building: buildingFrom(roomId),
          buildingCode: buildingCodeFrom(roomId),
        });
      }

      if (additions.length === 0) {
        setImportNotice({
          type: 'success',
          text: `Import complete. Imported: 0. Skipped: ${skippedCount}.`,
        });
        return;
      }

      await syncRoomCapacities(additions);
      const result = await importOccupantsRecord(additions);
      await refreshOccupantsFromBackend();

      const importMessage = `Import complete. Imported: ${result.imported}. Skipped: ${skippedCount + result.skipped}.`;
      setImportNotice({ type: 'success', text: importMessage });

      try {
        addStayHistory?.({
          type: 'Edit',
          name: 'CSV Import',
          roomId: `${additions.length} records`,
          details: `Imported ${result.imported} occupant records${(skippedCount + result.skipped) ? `, ${(skippedCount + result.skipped)} skipped` : ''}`,
        });
      } catch (error) {
        console.error('[Occupancy] Unable to log CSV import history.', error);
      }
    } catch (error) {
      console.error('[Occupancy] Import failed.', error);
      setImportNotice({
        type: 'error',
        text: error?.message || 'Import failed while saving occupancy data.',
      });
    }
  };

  const hasFilters = personTypeFilter!=='All'||buildingFilter!=='All'||idNameSearch||roomSearch;

  return (
    <div style={{ width:'100%',maxWidth:'100%',margin:0,padding:'24px 32px',background:'none',fontFamily:'Inter,Segoe UI,Arial,sans-serif',boxSizing:'border-box',minHeight:'100vh' }}>

      {/* Header */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24 }}>
        <div>
          <h1 style={{ fontWeight:800,fontSize:'1.7rem',color:'#1e315f',margin:0,letterSpacing:'-0.5px' }}>Occupancy</h1>
          <p style={{ margin:'4px 0 0',fontSize:13,color:'#94a3b8' }}>{filtered.length} of {occupants.length} active occupants</p>
        </div>
        <div style={{ display:'flex',gap:10,alignItems:'flex-start' }}>
          {canEditAccommodation ? <button onClick={()=>setAddOpen(true)} style={{ padding:'11px 26px',borderRadius:12,border:'none',background:'#3b82f6',color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer',display:'flex',alignItems:'center',gap:8,boxShadow:'0 2px 8px rgba(59,130,246,.35)' }}>+ Add Occupant</button> : null}
          <div style={{ display:'flex',gap:8 }}>
            <button onClick={handleExport} style={{ padding:'10px 18px',borderRadius:10,border:'1.5px solid #d0d7e2',background:'#fff',color:'#1e315f',fontWeight:700,fontSize:13,cursor:'pointer' }}>Export</button>
            {canEditAccommodation ? <button onClick={handleImportClick} style={{ padding:'10px 18px',borderRadius:10,border:'1.5px solid #d0d7e2',background:'#fff',color:'#1e315f',fontWeight:700,fontSize:13,cursor:'pointer' }}>Import</button> : null}
            <button onClick={handleTemplate} style={{ padding:'10px 18px',borderRadius:10,border:'1.5px solid #d0d7e2',background:'#fff',color:'#1e315f',fontWeight:700,fontSize:13,cursor:'pointer' }}>Template</button>
            <input ref={importInputRef} type="file" accept=".csv,text/csv" onChange={handleImportFile} style={{ display:'none' }} />
          </div>
        </div>
      </div>

      {importNotice ? (
        <div style={{
          marginBottom: 14,
          borderRadius: 12,
          border: importNotice.type === 'error' ? '1px solid #fecaca' : '1px solid #bbf7d0',
          background: importNotice.type === 'error' ? '#fff1f2' : '#f0fdf4',
          color: importNotice.type === 'error' ? '#b91c1c' : '#166534',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{importNotice.text}</span>
          <button
            onClick={() => setImportNotice(null)}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'inherit',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: 16,
              lineHeight: 1,
              padding: 0,
            }}
            aria-label="Dismiss import notice"
          >
            x
          </button>
        </div>
      ) : null}

      {/* Filters */}
      <div style={{ display:'flex',flexWrap:'wrap',gap:12,marginBottom:24,alignItems:'flex-end',background:'#fff',borderRadius:16,padding:'16px 20px',boxShadow:'0 1px 4px rgba(30,49,95,.08)',border:'1.5px solid #e8edf5' }}>
        <div style={{ display:'flex',flexDirection:'column',gap:4 }}>
          <span style={{ fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5 }}>Person Type</span>
          <select value={personTypeFilter} onChange={e=>setPersonTypeFilter(e.target.value)} style={{ padding:'8px 14px',borderRadius:10,border:'1.5px solid #d0d7e2',fontSize:13,fontWeight:600,color:'#1e293b',background:'#f8fafc',cursor:'pointer',minWidth:130 }}>
            <option value="All">All Types</option>
            <option value="Permanent">Permanent</option>
            <option value="Temporary">Temporary</option>
            <option value="Project">Project</option>
          </select>
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:4 }}>
          <span style={{ fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5 }}>Building</span>
          <select value={buildingFilter} onChange={e=>setBuildingFilter(e.target.value)} style={{ padding:'8px 14px',borderRadius:10,border:'1.5px solid #d0d7e2',fontSize:13,fontWeight:600,color:'#1e293b',background:'#f8fafc',cursor:'pointer',minWidth:160 }}>
            <option value="All">All Buildings</option>
            {BUILDING_ORDER.map(b=>(<option key={b} value={b}>{BUILDING_LABELS[b]}</option>))}
          </select>
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:4,flex:'1 1 180px' }}>
          <span style={{ fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5 }}>Search ID / Name</span>
          <div style={{ position:'relative' }}>
            <svg style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#94a3b8',pointerEvents:'none' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Staff ID or name…" value={idNameSearch} onChange={e=>setIdNameSearch(e.target.value)}
              style={{ paddingLeft:30,paddingRight:10,paddingTop:8,paddingBottom:8,borderRadius:10,border:'1.5px solid #d0d7e2',fontSize:13,width:'100%',background:'#f8fafc',boxSizing:'border-box' }} />
          </div>
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:4,flex:'1 1 160px' }}>
          <span style={{ fontSize:11,fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5 }}>Search Room</span>
          <div style={{ position:'relative' }}>
            <svg style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#94a3b8',pointerEvents:'none' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
            <input type="text" placeholder="Room ID e.g. OB-1-101" value={roomSearch} onChange={e=>setRoomSearch(e.target.value)}
              style={{ paddingLeft:30,paddingRight:10,paddingTop:8,paddingBottom:8,borderRadius:10,border:'1.5px solid #d0d7e2',fontSize:13,width:'100%',background:'#f8fafc',boxSizing:'border-box' }} />
          </div>
        </div>
        {hasFilters && (
          <button onClick={()=>{ setPersonTypeFilter('All'); setBuildingFilter('All'); setIdNameSearch(''); setRoomSearch(''); }}
            style={{ alignSelf:'flex-end',padding:'8px 16px',borderRadius:10,border:'1.5px solid #fca5a5',background:'#fff5f5',color:'#ef4444',fontSize:13,fontWeight:600,cursor:'pointer' }}>
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background:'#fff',borderRadius:18,boxShadow:'0 8px 26px rgba(30,49,95,.08)',border:'1px solid #dfe6f1',overflow:'hidden' }}>
        <div style={{ display:'grid',gridTemplateColumns:'2.9fr 1.1fr 1.9fr 138px',padding:'0 20px',height:42,alignItems:'center',background:'linear-gradient(180deg, #f8fbff 0%, #f3f7fd 100%)',borderBottom:'1px solid #dfe6f1',gap:10 }}>
          {['Name / Person Type','Room','Section / Department | Nat','Actions'].map(h=>(
            <span key={h} style={{ fontSize:10.5,fontWeight:700,color:'#7f93b3',textTransform:'uppercase',letterSpacing:.6 }}>{h}</span>
          ))}
        </div>

        {grouped.length===0 && (
          <div style={{ padding:'48px 20px',textAlign:'center',color:'#94a3b8',fontSize:15 }}>No occupants match the current filters.</div>
        )}

        {grouped.map((item,idx)=>{
          if(item.type==='building'){
            return(
              <div key={`b-${item.name}-${idx}`} style={{ padding:'12px 20px 6px',background:'#f1f5f9',borderTop:idx===0?'none':'2px solid #e2e8f0',borderBottom:'1px solid #e2e8f0' }}>
                <span style={{ fontSize:11.5,fontWeight:800,color:'#475569',textTransform:'uppercase',letterSpacing:1.2 }}>{item.label}</span>
              </div>
            );
          }
          const o=item.occ;
          const tc=PERSON_TYPE_COLORS[o.personType]||{bg:'#f1f5f9',text:'#475569'};
          const deptCode = shortCode(o.department);
          const natCode = shortCode(o.nationality);
          const rowBg = item.rowIndex % 2 === 0 ? '#ffffff' : '#f4f7fb';
          return(
            <div key={o._id}
              style={{ display:'grid',gridTemplateColumns:'2.9fr 1.1fr 1.9fr 140px',padding:'0 20px',minHeight:90,alignItems:'center',paddingTop:8,paddingBottom:8,borderBottom:'1px solid #e1e8f2',borderLeft:`3px solid ${tc.text}1f`,gap:10,transition:'background .12s, border-left-color .12s',cursor:'default',background:rowBg }}
              onMouseEnter={e=>{e.currentTarget.style.background='#ebf2ff'; e.currentTarget.style.borderLeftColor=tc.text;}}
              onMouseLeave={e=>{e.currentTarget.style.background=rowBg; e.currentTarget.style.borderLeftColor=`${tc.text}1f`;}}
            >
              <div style={{ display:'flex',flexDirection:'column',gap:5,minWidth:0,alignSelf:'flex-start',paddingTop:2 }}>
                <div style={{ display:'flex',alignItems:'center',gap:6,minWidth:0,flexWrap:'wrap' }}>
                  <span style={{ fontSize:10.5,fontWeight:600,padding:'3px 10px',borderRadius:999,background:tc.bg,color:tc.text,letterSpacing:.2,display:'inline-block',whiteSpace:'nowrap',textTransform:'uppercase',border:`1px solid ${tc.text}22` }}>{o.personType}</span>
                  <span style={{ fontSize:10.5,fontWeight:700,padding:'3px 10px',borderRadius:999,background:'#eef2ff',color:'#4f46e5',letterSpacing:.2,display:'inline-block',whiteSpace:'nowrap',border:'1px solid #cfd8ff' }}>ID {o.staffId || '-'}</span>
                </div>
                <span style={{ fontWeight:700,fontSize:13.5,color:'#1e293b',lineHeight:1.5,overflowWrap:'break-word',wordBreak:'break-word' }}>{o.name}</span>
              </div>

              <div style={{ display:'flex',flexDirection:'column',gap:5,minWidth:0,justifyContent:'center' }}>
                <span style={{ fontSize:13,fontWeight:800,padding:'2px 10px',borderRadius:6,background:'#dbeafe',color:'#2563eb',display:'inline-block',width:'fit-content',whiteSpace:'nowrap',letterSpacing:'0.5px' }}>{o.roomId}</span>
                <span style={{ fontSize:11,color:'#94a3b8',whiteSpace:'nowrap',marginLeft:20 }}>Bed {o.bedNo}</span>
              </div>

              <div style={{ display:'flex',flexDirection:'column',gap:4,minWidth:0,justifyContent:'center' }}>
                <div style={{ fontSize:12,color:'#1e293b',fontWeight:700,lineHeight:1.2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{o.section||'—'}</div>
                <div style={{ fontSize:11,color:'#94a3b8',fontWeight:600,letterSpacing:.2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{deptCode} | {natCode}</div>
              </div>

              <div style={{ display:'flex',gap:4,alignItems:'center',background:'rgba(255,255,255,.76)',padding:'4px 6px',borderRadius:11,overflow:'visible',flexWrap:'nowrap',justifyContent:'center',border:'1px solid #dbe4f0' }}>
                {canEditAccommodation ? (
                  <>
                    <ActionBtn title="Edit"      onClick={()=>setEditTarget(o)}     color="#3b82f6" bgGradient="linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)"><IconEdit /></ActionBtn>
                    <ActionBtn title="Swap"      onClick={()=>setSwapTarget(o)}     color="#8b5cf6" bgGradient="linear-gradient(135deg, #ede9fe 0%, #f3e8ff 100%)"><IconSwap /></ActionBtn>
                    <ActionBtn title="Move"      onClick={()=>setMoveTarget(o)}     color="#10b981" bgGradient="linear-gradient(135deg, #d1fae5 0%, #ecfdf5 100%)"><IconMove /></ActionBtn>
                    <ActionBtn title="Check Out" onClick={()=>setCheckoutTarget(o)} color="#f59e0b" bgGradient="linear-gradient(135deg, #fed7aa 0%, #fffbeb 100%)"><IconCheckout /></ActionBtn>
                    <ActionBtn title="Delete"    onClick={()=>setDeleteTarget(o)}   color="#ef4444" bgGradient="linear-gradient(135deg, #fecaca 0%, #fee2e2 100%)" hoverColor="#b91c1c"><IconDelete /></ActionBtn>
                  </>
                ) : <span style={{ fontSize: 11, fontWeight: 700, color:'#64748b', padding:'4px 8px' }}>View only</span>}
              </div>
            </div>
          );
        })}
      </div>

      <AddOccupantModal open={canEditAccommodation && addOpen} onClose={()=>setAddOpen(false)} rooms={roomsState} onAdd={handleAdd} />
      <EditOccupantModal open={!!editTarget} onClose={()=>setEditTarget(null)} occupant={editTarget} onSave={handleEdit} />
      <SwapModal open={!!swapTarget} onClose={()=>setSwapTarget(null)} occupant={swapTarget} allOccupants={occupants} onSwap={handleSwap} />
      <MoveModal open={!!moveTarget} onClose={()=>setMoveTarget(null)} occupant={moveTarget} allRooms={roomsState} onMove={handleMove} />
      <ConfirmModal open={!!checkoutTarget} onClose={()=>setCheckoutTarget(null)} onConfirm={()=>handleCheckout(checkoutTarget)} title="Check Out Occupant" message={`Check out ${checkoutTarget?.name} from ${checkoutTarget?.roomId}? They will be removed from the active list.`} confirmLabel="Check Out" confirmColor="#f59e0b" />
      <ConfirmModal open={!!deleteTarget} onClose={()=>setDeleteTarget(null)} onConfirm={()=>handleDelete(deleteTarget)} title="Delete Occupant" message={`Permanently delete ${deleteTarget?.name}? This cannot be undone.`} confirmLabel="Delete" confirmColor="#ef4444" />
    </div>
  );
}

export default Occupancy;
