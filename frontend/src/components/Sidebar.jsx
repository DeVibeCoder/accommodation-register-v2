import React from 'react';
import { NavLink } from 'react-router-dom';

// New sidebar structure with sections
// System section for Settings
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
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="2" fill="currentColor"/><rect x="14" y="3" width="7" height="7" rx="2" fill="currentColor"/><rect x="14" y="14" width="7" height="7" rx="2" fill="currentColor"/><rect x="3" y="14" width="7" height="7" rx="2" fill="currentColor"/></svg>
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
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="10" rx="2" fill="currentColor"/><rect x="7" y="11" width="2" height="2" rx="1" fill="#fff"/><rect x="15" y="11" width="2" height="2" rx="1" fill="#fff"/></svg>
        ),
        to: '/rooms',
      },
      {
        label: 'Occupancy',
        icon: (
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="currentColor"/><rect x="4" y="16" width="16" height="4" rx="2" fill="currentColor"/></svg>
        ),
        to: '/occupancy',
      },
      {
        label: 'Stay History',
        icon: (
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M12 8v5l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/></svg>
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
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3" fill="currentColor"/><rect x="7" y="9" width="2" height="6" rx="1" fill="#fff"/><rect x="15" y="9" width="2" height="6" rx="1" fill="#fff"/></svg>
        ),
        to: '/meal-exclusion',
      },
      {
        label: 'Meal History',
        icon: (
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3" fill="currentColor"/><rect x="7" y="9" width="2" height="6" rx="1" fill="#fff"/><rect x="15" y="9" width="2" height="6" rx="1" fill="#fff"/></svg>
        ),
        to: '/meal-history',
      },
    ],
  },
  // Removed System/Settings section to avoid duplicate Settings
];

function Sidebar({ collapsed = false, setCollapsed, onLogout, user }) {
  const sidebarWidth = collapsed ? 70 : 220;

  // Role-based menu filtering
  const role = user?.role || 'Viewer';
  const roleInitial = String(role).charAt(0).toUpperCase() || 'U';
  const filteredSections = navSections.map(section => (
    section.label === 'Accommodation' && role === 'Supervisor'
      ? { ...section, label: 'Supervisor' }
      : section
  ));
  const showSystemSection = role === 'Admin';

  return (
    <aside style={{
      width: sidebarWidth,
      background: '#1e315f',
      color: '#fff',
      minHeight: '100vh',
      height: '100vh',
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 200,
      overflow: 'hidden',
      boxShadow: '2px 0 12px #1e2233',
      userSelect: 'none',
      transition: 'width 0.18s',
    }}>
      {/* Logo/Header */}
      <div style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? '0' : '0 18px',
        borderBottom: '1px solid #223366',
        marginBottom: 8,
      }}>
        <span style={{ fontWeight: 900, fontSize: 22, letterSpacing: 1, color: '#e3eafc', opacity: 0.95 }}>{collapsed ? 'T' : 'TIC'}</span>
      </div>

      {/* Navigation Sections */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
        {filteredSections.map(section => (
          <div key={section.label} style={{ marginBottom: 8 }}>
            {!collapsed && (
              <div style={{ fontSize: 12, fontWeight: 700, color: '#b6c3e0', letterSpacing: 0.5, margin: '8px 0 4px 18px' }}>{section.label}</div>
            )}
            {section.items.map(item => (
              <NavLink
                key={item.label}
                to={item.to}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: collapsed ? 0 : 12,
                  padding: collapsed ? '10px 0' : '10px 18px',
                  color: isActive ? '#e3eafc' : '#b6c3e0',
                  background: isActive ? 'rgba(227,234,252,0.13)' : 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 15,
                  margin: '2px 0',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  transition: 'background 0.13s',
                  textDecoration: 'none',
                })}
                title={item.label}
              >
                <span style={{ display: 'flex', alignItems: 'center', fontSize: 20 }}>{item.icon}</span>
                {!collapsed && item.label}
              </NavLink>
            ))}
          </div>
        ))}
        {showSystemSection ? (
          <div key={systemSection.label} style={{ marginBottom: 8 }}>
            {!collapsed && (
              <div style={{ fontSize: 12, fontWeight: 700, color: '#b6c3e0', letterSpacing: 0.5, margin: '8px 0 4px 18px' }}>{systemSection.label}</div>
            )}
            {systemSection.items.map(item => (
              <NavLink
                key={item.label}
                to={item.to}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: collapsed ? 0 : 12,
                  padding: collapsed ? '10px 0' : '10px 18px',
                  color: isActive ? '#e3eafc' : '#b6c3e0',
                  background: isActive ? 'rgba(227,234,252,0.13)' : 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 15,
                  margin: '2px 0',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  transition: 'background 0.13s',
                  textDecoration: 'none',
                })}
                title={item.label}
              >
                <span style={{ display: 'flex', alignItems: 'center', fontSize: 20 }}>{item.icon}</span>
                {!collapsed && item.label}
              </NavLink>
            ))}
          </div>
        ) : null}
      </nav>

      {/* Bottom section: Logout and user info */}
      <div
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.12)',
          padding: collapsed ? '14px 4px 10px 4px' : '18px 12px 12px 12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 10,
          marginTop: 24,
          borderRadius: collapsed ? '14px' : '20px 20px 0 0',
          boxShadow: '0 -2px 12px #1e223333',
        }}
      >
        <button
          style={{
            width: collapsed ? 36 : '100%',
            background: '#e3eafc',
            color: '#1e315f',
            border: 'none',
            borderRadius: 6,
            padding: '7px 0',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            boxShadow: '0 2px 8px #d0d7e2',
            margin: '0 0 0 0',
            transition: 'background 0.15s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0,
            marginLeft: collapsed ? 0 : 0,
          }}
          onClick={onLogout}
          title="Logout"
        >
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" style={{ marginRight: collapsed ? 0 : 4 }}>
            <path d="M16 17l5-5m0 0l-5-5m5 5H9" stroke="#1e315f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="3" y="4" width="7" height="16" rx="2" stroke="#1e315f" strokeWidth="2"/>
          </svg>
          {!collapsed && 'Logout'}
        </button>
        <div style={{ color: '#b6c3e0', fontSize: 11, fontWeight: 500, textAlign: 'center', margin: '0 0 2px 0', width: '100%', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', paddingLeft: collapsed ? 0 : 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#b6c3e0" strokeWidth="2"/><text x="50%" y="55%" textAnchor="middle" fill="#b6c3e0" fontSize="7" fontWeight="bold" dy=".3em">{roleInitial}</text></svg>
            {collapsed ? '' : `Logged in as: ${role}`}
          </span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
