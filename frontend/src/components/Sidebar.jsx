import React from 'react';
import { NavLink } from 'react-router-dom';

const systemSection = {
  label: 'System',
  items: [
    {
      label: 'Settings',
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3" fill="currentColor" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      ),
      to: '/settings',
    },
  ],
};

const navSections = [
  {
    label: 'Main',
    items: [
      {
        label: 'Dashboard',
        icon: (
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="2" fill="currentColor"/><rect x="14" y="3" width="7" height="7" rx="2" fill="currentColor"/><rect x="14" y="14" width="7" height="7" rx="2" fill="currentColor"/><rect x="3" y="14" width="7" height="7" rx="2" fill="currentColor"/></svg>
        ),
        to: '/',
      },
    ],
  },
  {
    label: 'Accommodation',
    items: [
      {
        label: 'Rooms',
        icon: (
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="10" rx="2" fill="currentColor"/><rect x="7" y="11" width="2" height="2" rx="1" fill="#fff"/><rect x="15" y="11" width="2" height="2" rx="1" fill="#fff"/></svg>
        ),
        to: '/rooms',
      },
      {
        label: 'Occupancy',
        icon: (
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="currentColor"/><rect x="4" y="16" width="16" height="4" rx="2" fill="currentColor"/></svg>
        ),
        to: '/occupancy',
      },
      {
        label: 'Stay History',
        icon: (
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 8v5l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/></svg>
        ),
        to: '/stay-history',
      },
    ],
  },
  {
    label: 'Meals',
    items: [
      {
        label: 'Meal Exclusion',
        icon: (
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3" fill="currentColor"/><rect x="7" y="9" width="2" height="6" rx="1" fill="#fff"/><rect x="15" y="9" width="2" height="6" rx="1" fill="#fff"/></svg>
        ),
        to: '/meal-exclusion',
      },
      {
        label: 'Meal History',
        icon: (
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/></svg>
        ),
        to: '/meal-history',
      },
    ],
  },
];

/* ── shared nav-link style builder ───────────────────────────── */
function navLinkStyle(isActive, collapsed) {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: collapsed ? 'center' : 'flex-start',
    gap: collapsed ? 0 : 11,
    width: '100%',
    boxSizing: 'border-box',
    padding: collapsed ? '11px 0' : '10px 16px',
    color: isActive ? '#e3eafc' : '#b6c3e0',
    background: isActive ? 'rgba(227,234,252,0.14)' : 'transparent',
    borderLeft: isActive ? '3px solid #60a5fa' : '3px solid transparent',
    borderRadius: collapsed ? 0 : '0 8px 8px 0',
    fontWeight: 600,
    fontSize: 14,
    margin: '1px 0',
    transition: 'background 0.13s, color 0.13s',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  };
}

function Sidebar({ collapsed = false, setCollapsed, onLogout, user }) {
  const sidebarWidth = collapsed ? 64 : 220;
  const role = user?.role || 'Viewer';
  const roleInitial = String(role).charAt(0).toUpperCase();

  const filteredSections = navSections.map(section => {
    let items = section.items;
    if (role === 'Viewer') {
      items = items.filter(item => item.to !== '/stay-history');
    }
    return { ...section, items };
  });

  const showSystemSection = role === 'Admin';

  return (
    <aside
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        background: '#1e315f',
        color: '#fff',
        minHeight: '100vh',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 200,
        overflow: 'hidden',
        boxShadow: '2px 0 16px rgba(15,23,60,0.22)',
        userSelect: 'none',
        transition: 'width 0.18s ease',
      }}
    >
      {/* ── Logo / header ── */}
      <div
        style={{
          height: 64,
          minHeight: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? 0 : '0 20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          marginBottom: 6,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontWeight: 900,
            fontSize: collapsed ? 18 : 20,
            letterSpacing: collapsed ? 0 : 1,
            color: '#e3eafc',
          }}
        >
          {collapsed ? 'T' : 'TIC'}
        </span>
      </div>

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden' }}>
        {filteredSections.map(section => (
          <div key={section.label} style={{ marginBottom: 4 }}>
            {!collapsed && (
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: 'rgba(182,195,224,0.6)',
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  padding: '10px 16px 4px',
                }}
              >
                {section.label}
              </div>
            )}
            {section.items.map(item => (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.to === '/'}
                style={({ isActive }) => navLinkStyle(isActive, collapsed)}
                title={collapsed ? item.label : undefined}
              >
                <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  {item.icon}
                </span>
                {!collapsed && (
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}

        {showSystemSection && (
          <div style={{ marginBottom: 4 }}>
            {!collapsed && (
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: 'rgba(182,195,224,0.6)',
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  padding: '10px 16px 4px',
                }}
              >
                {systemSection.label}
              </div>
            )}
            {systemSection.items.map(item => (
              <NavLink
                key={item.label}
                to={item.to}
                style={({ isActive }) => navLinkStyle(isActive, collapsed)}
                title={collapsed ? item.label : undefined}
              >
                <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  {item.icon}
                </span>
                {!collapsed && (
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</span>
                )}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* ── Bottom: logout + user info ── */}
      <div
        style={{
          flexShrink: 0,
          background: 'rgba(0,0,0,0.18)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          padding: collapsed ? '12px 0' : '14px 12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <button
          onClick={onLogout}
          title="Logout"
          style={{
            width: collapsed ? 38 : '100%',
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: collapsed ? 0 : 6,
            background: '#e3eafc',
            color: '#1e315f',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            transition: 'background 0.15s',
            flexShrink: 0,
          }}
        >
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
            <path d="M16 17l5-5m0 0l-5-5m5 5H9" stroke="#1e315f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="3" y="4" width="7" height="16" rx="2" stroke="#1e315f" strokeWidth="2"/>
          </svg>
          {!collapsed && 'Logout'}
        </button>

        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            color: 'rgba(182,195,224,0.7)',
            fontSize: 11,
            fontWeight: 500,
          }}
        >
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.14)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 800,
              color: '#e3eafc',
              flexShrink: 0,
            }}
          >
            {roleInitial}
          </span>
          {!collapsed && (
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {role}
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
