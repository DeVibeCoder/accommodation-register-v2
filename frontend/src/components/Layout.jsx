
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from './Sidebar';
import { Outlet, useLocation } from 'react-router-dom';
import { fetchOccupants as fetchOccupantsFromApi } from '../services/occupancyService';
import { fetchRooms as fetchRoomsFromApi } from '../services/roomsService';
import { addStayHistory as addStayHistoryToApi, fetchStayHistory as fetchStayHistoryFromApi } from '../services/stayHistoryService';
import { fetchMealExclusions as fetchMealExclusionsFromApi } from '../services/mealService';
import { isCurrentRoomId } from '../utils/building';

function attachOccupantsToRooms(rooms, occupants) {
  return rooms.map(room => {
    const roomOccupants = occupants.filter(o => o.roomId === room.id);
    const highestOccupiedBed = roomOccupants.reduce((max, occupant) => {
      const nextBed = Number.parseInt(occupant?.bedNo, 10) || 1;
      return Math.max(max, nextBed);
    }, 0);
    const totalBeds = Math.max(Number.parseInt(room.totalBeds, 10) || 1, highestOccupiedBed || 0);

    return {
      ...room,
      totalBeds,
      availableBeds: Math.max(0, totalBeds - roomOccupants.length),
      usedBeds: roomOccupants.length,
      type: totalBeds === 1 ? 'Single' : `${totalBeds} Share`,
      beds: Array.from({ length: totalBeds }, (_, index) => {
        const bedNumber = index + 1;
        const occupant = roomOccupants.find(o => Number(o.bedNo) === bedNumber) ?? null;
        return {
          bedId: `Bed ${bedNumber}`,
          occupied: Boolean(occupant),
          occupant,
        };
      }),
    };
  });
}

function Layout({ user, onLogout }) {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const uidRef = useRef(1000);
  const getNextUid = () => uidRef.current++;

  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState('');

  const [occupants, setOccupants] = useState([]);
  const [roomBaseState, setRoomsState] = useState([]);
  const [mealExclusionSummary, setMealExclusionSummary] = useState({ active: [], upcoming: [], mealExcludedCount: 0 });
  const [stayHistory, setStayHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('tic_stay_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const addStayHistory = (entry) => {
    const payload = {
      timestamp: new Date().toISOString(),
      // Store both email and role so the audit trail is traceable by person
      user: user?.email ? `${user.email} (${user?.role || 'User'})` : (user?.role || 'Admin'),
      ...entry,
    };

    (async () => {
      const saved = await addStayHistoryToApi(payload);
      if (!saved) return;

      setStayHistory(prev => {
        const next = [saved, ...prev].slice(0, 500);
        try {
          localStorage.setItem('tic_stay_history', JSON.stringify(next));
        } catch {
          // ignore cache write issues
        }
        return next;
      });
    })();
  };

  const roomsState = useMemo(() => attachOccupantsToRooms(roomBaseState, occupants), [roomBaseState, occupants]);
  const sidebarWidth = sidebarCollapsed ? 64 : 220;
  const role = user?.role || 'Viewer';
  const isAdmin = role === 'Admin';
  const canEditAccommodation = role === 'Admin' || role === 'Accommodation' || role === 'Supervisor';
  const canEditMeals = role === 'Admin' || role === 'Supervisor';
  const canUseOccupancyBulkTools = role === 'Admin' || role === 'Accommodation';
  const canExportRooms = role === 'Admin' || role === 'Accommodation';

  const prependStayHistoryEntry = (entry) => {
    if (!entry) return;
    setStayHistory(prev => {
      const next = [entry, ...prev].slice(0, 500);
      try {
        localStorage.setItem('tic_stay_history', JSON.stringify(next));
      } catch {
        // ignore cache write issues
      }
      return next;
    });
  };

  const refreshMealExclusionSummary = async () => {
    try {
      const summary = await fetchMealExclusionsFromApi();
      setMealExclusionSummary(summary);
      return summary;
    } catch {
      const fallback = { active: [], upcoming: [], mealExcludedCount: 0 };
      setMealExclusionSummary(fallback);
      return fallback;
    }
  };

  const loadAllData = async (ignoreCheck) => {
    setDataLoading(true);
    setDataError('');

    try {
      const [remoteOccupants, remoteRooms, remoteHistory, mealSummary] = await Promise.all([
        fetchOccupantsFromApi(),
        fetchRoomsFromApi(),
        fetchStayHistoryFromApi(),
        fetchMealExclusionsFromApi().catch(() => ({ active: [], upcoming: [], mealExcludedCount: 0 })),
      ]);

      if (ignoreCheck?.()) return;

      const liveRooms = Array.isArray(remoteRooms)
        ? remoteRooms.filter(room => isCurrentRoomId(room.id))
        : [];

      const liveOccupants = Array.isArray(remoteOccupants)
        ? remoteOccupants.filter(occupant => isCurrentRoomId(occupant.roomId))
        : [];

      const historyEntries = Array.isArray(remoteHistory)
        ? remoteHistory.slice(0, 500)
        : [];

      setRoomsState(liveRooms);
      uidRef.current = 1000;
      setOccupants(liveOccupants.map(o => ({ ...o, _id: uidRef.current++ })));
      setStayHistory(historyEntries);
      setMealExclusionSummary(mealSummary);

      try {
        localStorage.setItem('tic_stay_history', JSON.stringify(historyEntries));
      } catch {
        // ignore cache write issues
      }

      console.info(`[API] Loaded ${liveRooms.length} rooms, ${liveOccupants.length} occupants, ${historyEntries.length} history entries, and ${mealSummary?.mealExcludedCount || 0} active meal exclusions from backend.`);
    } catch (error) {
      if (!ignoreCheck?.()) {
        setRoomsState([]);
        setOccupants([]);
        setStayHistory([]);
        setMealExclusionSummary({ active: [], upcoming: [], mealExcludedCount: 0 });
        setDataError(error?.message || 'Unable to connect to the server. Please check your connection and try again.');
      }
      console.error('[API] Failed to load live accommodation data.', error?.message || error);
    } finally {
      if (!ignoreCheck?.()) setDataLoading(false);
    }
  };

  useEffect(() => {
    let ignored = false;
    loadAllData(() => ignored);
    return () => { ignored = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ minHeight: '100vh', overflow: 'hidden', background: '#f5f7fa' }}>
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} onLogout={onLogout} user={user} />

      <div
        style={{
          marginLeft: sidebarWidth,
          width: `calc(100vw - ${sidebarWidth}px)`,
          maxWidth: `calc(100vw - ${sidebarWidth}px)`,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <header
          style={{
            height: 62,
            minHeight: 62,
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            position: 'sticky',
            top: 0,
            zIndex: 20,
            gap: 14,
          }}
        >
          <button
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            style={{
              width: 34, height: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent',
              border: '1px solid #e2e8f0',
              color: '#64748b',
              cursor: 'pointer',
              borderRadius: 8,
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#1e293b'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
            <img src="/logo.png" alt="TIC" style={{ height: 34, width: 34, objectFit: 'cover', objectPosition: 'center', borderRadius: 6 }} />
            <span style={{ fontWeight: 800, fontSize: 17, color: '#1e293b', letterSpacing: 0.2 }}>TIC Meals &amp; Stay</span>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <div style={{ width: '100%', maxWidth: '100%', margin: 0, padding: 0 }}>

            {/* ── Error banner shown when initial data load fails ── */}
            {dataError ? (
              <div style={{
                margin: '18px 24px 0',
                padding: '14px 18px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%)',
                color: '#fff',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 14,
                boxShadow: '0 6px 18px rgba(185,28,28,.22)',
              }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 3 }}>Connection Problem</div>
                  <div style={{ fontSize: 13, opacity: 0.92 }}>{dataError}</div>
                </div>
                <button
                  type="button"
                  onClick={() => loadAllData()}
                  style={{ padding: '8px 14px', borderRadius: 9, border: 'none', background: 'rgba(255,255,255,.18)', color: '#fff', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  Retry
                </button>
              </div>
            ) : null}

            {/* ── Loading skeleton while data is being fetched ── */}
            {dataLoading ? (
              <div style={{ padding: '24px 28px' }}>
                <div style={{ height: 110, borderRadius: 18, background: 'linear-gradient(90deg, #e8eef7 25%, #f4f7fb 50%, #e8eef7 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', marginBottom: 16 }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px,1fr))', gap: 14, marginBottom: 16 }}>
                  {[1,2,3,4].map(k => (
                    <div key={k} style={{ height: 80, borderRadius: 14, background: 'linear-gradient(90deg, #e8eef7 25%, #f4f7fb 50%, #e8eef7 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                  ))}
                </div>
                <div style={{ height: 260, borderRadius: 16, background: 'linear-gradient(90deg, #e8eef7 25%, #f4f7fb 50%, #e8eef7 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
              </div>
            ) : (
              <div key={location.pathname} style={{ animation: 'fadeIn 0.25s ease both' }}>
                <Outlet context={{ sidebarCollapsed, setSidebarCollapsed, occupants, setOccupants, roomsState, setRoomsState, getNextUid, stayHistory, setStayHistory, addStayHistory, prependStayHistoryEntry, mealExclusionSummary, setMealExclusionSummary, refreshMealExclusionSummary, user, role, isAdmin, canEditAccommodation, canEditMeals, canUseOccupancyBulkTools, canExportRooms }} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout;
