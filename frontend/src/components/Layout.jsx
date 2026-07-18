
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from './Sidebar';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
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

function useViewportWidth() {
  const [w, setW] = React.useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1200));
  React.useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
}

/* ── Mobile bottom navigation bar ──────────────────────────────────────── */
function BottomNav({ role, pathname }) {
  const isViewer = role === 'Viewer';

  const items = [
    {
      label: 'Home',
      to: '/',
      end: true,
      icon: (
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="7" rx="2" fill="currentColor"/>
          <rect x="14" y="3" width="7" height="7" rx="2" fill="currentColor"/>
          <rect x="14" y="14" width="7" height="7" rx="2" fill="currentColor"/>
          <rect x="3" y="14" width="7" height="7" rx="2" fill="currentColor"/>
        </svg>
      ),
    },
    {
      label: 'Rooms',
      to: '/rooms',
      icon: (
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
          <rect x="3" y="7" width="18" height="10" rx="2" fill="currentColor"/>
          <rect x="7" y="11" width="2" height="2" rx="1" fill="#fff"/>
          <rect x="15" y="11" width="2" height="2" rx="1" fill="#fff"/>
        </svg>
      ),
    },
    {
      label: 'Occupancy',
      to: '/occupancy',
      icon: (
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="4" fill="currentColor"/>
          <rect x="4" y="16" width="16" height="4" rx="2" fill="currentColor"/>
        </svg>
      ),
    },
    ...(!isViewer ? [{
      label: 'Stay',
      to: '/stay-history',
      icon: (
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
          <path d="M12 8v5l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
    }] : []),
    {
      label: 'Excl.',
      to: '/meal-exclusion',
      icon: (
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" stroke="currentColor" strokeWidth="2"/>
          <line x1="6" y1="1" x2="6" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="10" y1="1" x2="10" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="14" y1="1" x2="14" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: 'Meals',
      to: '/meal-history',
      icon: (
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
          <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
    },
  ];

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      zIndex: 300,
      background: '#ffffff',
      borderTop: '1.5px solid #e2e8f0',
      display: 'flex',
      alignItems: 'stretch',
      boxShadow: '0 -2px 16px rgba(15,23,42,0.10)',
      height: 46,
      fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
    }}>
      {items.map(item => {
        const isActive = item.end ? pathname === '/' : pathname === item.to;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              color: isActive ? '#6366f1' : '#94a3b8',
              textDecoration: 'none',
              fontSize: 8.5,
              fontWeight: isActive ? 700 : 500,
              borderTop: isActive ? '2px solid #6366f1' : '2px solid transparent',
              background: isActive ? '#f5f3ff' : 'transparent',
              transition: 'color 0.15s, background 0.15s',
              padding: '4px 2px 3px',
              letterSpacing: 0.2,
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none',
            }}
          >
            <span style={{
              display: 'flex', alignItems: 'center',
              opacity: isActive ? 1 : 0.65,
              transform: isActive ? 'translateY(-1px) scale(1.18)' : 'scale(1)',
              transition: 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1), opacity 0.15s',
            }}>
              {item.icon}
            </span>
            <span style={{ transition: 'color 0.15s' }}>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

const PAGE_NAMES = {
  '/': 'Dashboard',
  '/rooms': 'Rooms',
  '/occupancy': 'Occupancy',
  '/stay-history': 'Stay History',
  '/meal-exclusion': 'Meal Exclusion',
  '/meal-history': 'Meal History',
  '/settings': 'Settings',
};

function Layout({ user, onLogout }) {
  const location = useLocation();
  const vw = useViewportWidth();
  const isMobile = vw < 768;

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

  const sidebarWidth = isMobile ? 0 : (sidebarCollapsed ? 64 : 220);
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
    <div style={{ minHeight: '100vh', overflow: 'hidden', background: '#f1f5f9' }}>

      {/* Desktop sidebar — hidden completely on mobile */}
      {!isMobile && (
        <Sidebar
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          onLogout={onLogout}
          user={user}
        />
      )}

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
          transition: 'margin-left 0.22s cubic-bezier(.4,0,.2,1), width 0.22s cubic-bezier(.4,0,.2,1)',
        }}
      >
        {/* ── Header ── */}
        <header
          style={{
            height: 62,
            minHeight: 62,
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            padding: isMobile ? '0 12px' : '0 24px',
            position: 'sticky',
            top: 0,
            zIndex: 20,
            gap: 10,
          }}
        >
          {/* Sidebar toggle — desktop only */}
          {!isMobile && (
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
          )}

          {/* Page name — centered */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: isMobile ? 16 : 17, color: '#1e293b', letterSpacing: '-0.2px' }}>
              {PAGE_NAMES[location.pathname] ?? 'TIC Meals & Stay'}
            </span>
          </div>

          {/* Mobile right actions: settings (admin) + logout */}
          {isMobile && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
              {isAdmin && (
                <NavLink
                  to="/settings"
                  title="Settings"
                  style={{
                    width: 34, height: 34,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: location.pathname === '/settings' ? '#6366f1' : '#64748b',
                    textDecoration: 'none',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="3" fill="currentColor"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                </NavLink>
              )}
              <button
                onClick={onLogout}
                title="Logout"
                style={{
                  width: 34, height: 34,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent',
                  border: '1px solid #e2e8f0',
                  color: '#64748b',
                  cursor: 'pointer',
                  borderRadius: 8,
                }}
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                  <path d="M16 17l5-5m0 0l-5-5m5 5H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="3" y="4" width="7" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </button>
            </div>
          )}
        </header>

        {/* ── Main content ── */}
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: isMobile ? 46 : 0 }}>
          <div style={{ width: '100%', maxWidth: '100%', margin: 0, padding: 0 }}>

            {/* Error banner */}
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

            {/* Loading skeleton */}
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
                <Outlet context={{ sidebarCollapsed, setSidebarCollapsed, occupants, setOccupants, roomsState, setRoomsState, getNextUid, stayHistory, setStayHistory, addStayHistory, prependStayHistoryEntry, mealExclusionSummary, setMealExclusionSummary, refreshMealExclusionSummary, user, role, isAdmin, canEditAccommodation, canEditMeals, canUseOccupancyBulkTools, canExportRooms, isMobile }} />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Bottom navigation — mobile only */}
      {isMobile && <BottomNav role={role} pathname={location.pathname} />}
    </div>
  );
}

export default Layout;
