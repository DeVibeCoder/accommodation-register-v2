
import React, { useMemo, useRef, useState } from 'react';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';
import { occupants as rawOccupants } from '../data/occupants';
import { rooms as structuredRooms } from '../data/data';

function Layout({ user, onLogout }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const uidRef = useRef(1000);
  const [occupants, setOccupants] = useState(() => rawOccupants.map(o => ({ ...o, _id: uidRef.current++ })));
  const roomsState = useMemo(() => structuredRooms, []);
  const getNextUid = () => uidRef.current++;
  const sidebarWidth = sidebarCollapsed ? 70 : 220;

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
            height: 70,
            minHeight: 70,
            background: '#fff',
            borderBottom: '1.5px solid #e3eafc',
            boxShadow: '0 2px 12px rgba(30,40,90,0.06)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 32px',
            position: 'sticky',
            top: 0,
            zIndex: 20,
            gap: 18,
          }}
        >
          <button
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            style={{
              background: sidebarCollapsed ? '#e3eafc' : '#f0f4ff',
              border: '1.5px solid #d0d7e2',
              color: '#1e315f',
              fontSize: 24,
              cursor: 'pointer',
              borderRadius: 8,
              padding: 6,
              marginRight: 18,
              boxShadow: sidebarCollapsed ? '0 2px 8px #d0d7e2' : 'none',
              transition: 'all 0.18s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar"
          >
            <svg width="28" height="28" fill="none" viewBox="0 0 28 28">
              <rect x="4" y="5" width="20" height="18" rx="4" fill="#1e315f" />
              <rect x="8" y="9" width="3" height="10" rx="1.5" fill="#fff" />
            </svg>
          </button>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <span style={{ fontWeight: 900, fontSize: 28, color: '#1e315f', letterSpacing: 0.5, textAlign: 'center' }}>TIC Meals and Stay</span>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <div style={{ width: '100%', maxWidth: '100%', margin: 0, padding: 0 }}>
            <Outlet context={{ sidebarCollapsed, setSidebarCollapsed, occupants, setOccupants, roomsState, getNextUid }} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout;
