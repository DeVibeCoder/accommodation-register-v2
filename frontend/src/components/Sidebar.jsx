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
        icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="2" fill="currentColor"/><rect x="14" y="3" width="7" height="7" rx="2" fill="currentColor"/><rect x="14" y="14" width="7" height="7" rx="2" fill="currentColor"/><rect x="3" y="14" width="7" height="7" rx="2" fill="currentColor"/></svg>,
        to: '/',
      },
    ],
  },
  {
    label: 'Accommodation',
    items: [
      {
        label: 'Rooms',
        icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="10" rx="2" fill="currentColor"/><rect x="7" y="11" width="2" height="2" rx="1" fill="#0f172a"/><rect x="15" y="11" width="2" height="2" rx="1" fill="#0f172a"/></svg>,
        to: '/rooms',
      },
      {
        label: 'Occupancy',
        icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="currentColor"/><rect x="4" y="16" width="16" height="4" rx="2" fill="currentColor"/></svg>,
        to: '/occupancy',
      },
      {
        label: 'Stay History',
        icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M12 8v5l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/></svg>,
        to: '/stay-history',
      },
    ],
  },
  {
    label: 'Meals',
    items: [
      {
        label: 'Meal Exclusion',
        icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 0 1 0 8h-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" stroke="currentColor" strokeWidth="2"/><line x1="6" y1="1" x2="6" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="10" y1="1" x2="10" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="14" y1="1" x2="14" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
        to: '/meal-exclusion',
      },
      {
        label: 'Meal History',
        icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/></svg>,
        to: '/meal-history',
      },
    ],
  },
];

/* ── nav link style: split cleanly so collapsed never inherits expanded margin ── */
function navLinkStyle(isActive, collapsed) {
  const base = {
    display: 'flex',
    alignItems: 'center',
    color: isActive ? '#c7d2fe' : '#94a3b8',
    background: isActive ? 'rgba(129,140,248,0.14)' : 'transparent',
    borderLeft: isActive ? '3px solid #818cf8' : '3px solid transparent',
    fontWeight: isActive ? 700 : 500,
    fontSize: 13.5,
    transition: 'background 0.14s ease, color 0.14s ease',
    textDecoration: 'none',
    boxSizing: 'border-box',
  };

  if (collapsed) {
    return {
      ...base,
      justifyContent: 'center',
      width: '100%',
      padding: '11px 0',
      margin: '1px 0',
      borderRadius: 0,
    };
  }

  return {
    ...base,
    justifyContent: 'flex-start',
    gap: 10,
    width: 'calc(100% - 16px)',
    padding: '9px 13px',
    margin: '1px 8px',
    borderRadius: 8,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  };
}

export default function Sidebar({ collapsed = false, setCollapsed, onLogout, user, onNavClick }) {
  const sidebarWidth = collapsed ? 64 : 220;
  const role = user?.role || 'Viewer';
  const roleInitial = String(role).charAt(0).toUpperCase();

  const filteredSections = navSections.map(section => ({
    ...section,
    items: role === 'Viewer'
      ? section.items.filter(item => item.to !== '/stay-history')
      : section.items,
  }));

  const showSystem = role === 'Admin';

  return (
    <aside style={{
      width: sidebarWidth,
      minWidth: sidebarWidth,
      background: '#0f172a',
      color: '#fff',
      minHeight: '100vh',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
      position: 'fixed',
      left: 0, top: 0,
      zIndex: 200,
      overflow: 'hidden',
      boxShadow: '4px 0 24px rgba(0,0,0,0.3)',
      userSelect: 'none',
      transition: 'width 0.22s cubic-bezier(.4,0,.2,1)',
    }}>

      {/* ── Logo / branding ── */}
      <div style={{
        height: 62, minHeight: 62,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? '0' : '0 14px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {collapsed ? (
          /* Collapsed: same logo size as expanded */
          <img
            src="/logo.png"
            alt="TIC"
            style={{ width: 42, height: 42, objectFit: 'contain', borderRadius: 8 }}
          />
        ) : (
          /* Expanded: same logo + name */
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <img
              src="/logo.png"
              alt="TIC Meals and Stay"
              style={{ width: 42, height: 42, objectFit: 'contain', borderRadius: 8, flexShrink: 0 }}
            />
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div style={{ fontWeight: 900, fontSize: 14, color: '#e2e8f0', whiteSpace: 'nowrap', letterSpacing: 0.2 }}>
                TIC Meals &amp; Stay
              </div>
              <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.55)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 1 }}>
                Camp Management
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingBottom: 8,
        paddingTop: 6,
      }}>
        {filteredSections.map(section => (
          <div key={section.label} style={{ marginBottom: 4 }}>
            {!collapsed && (
              <div style={{
                fontSize: 10, fontWeight: 700,
                color: 'rgba(148,163,184,0.5)',
                letterSpacing: 1.4, textTransform: 'uppercase',
                padding: '8px 20px 3px',
              }}>
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
                onClick={onNavClick}
              >
                <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  {item.icon}
                </span>
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}

        {showSystem && (
          <div style={{ marginBottom: 4 }}>
            {!collapsed && (
              <div style={{
                fontSize: 10, fontWeight: 700,
                color: 'rgba(148,163,184,0.5)',
                letterSpacing: 1.4, textTransform: 'uppercase',
                padding: '8px 20px 3px',
              }}>
                {systemSection.label}
              </div>
            )}
            {systemSection.items.map(item => (
              <NavLink
                key={item.label}
                to={item.to}
                style={({ isActive }) => navLinkStyle(isActive, collapsed)}
                title={collapsed ? item.label : undefined}
                onClick={onNavClick}
              >
                <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  {item.icon}
                </span>
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* ── Footer: logout + role ── */}
      <div style={{
        flexShrink: 0,
        borderTop: '1px solid rgba(255,255,255,0.07)',
        padding: collapsed ? '10px 0' : '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}>
        <button
          onClick={onLogout}
          title="Logout"
          style={{
            width: collapsed ? 36 : '100%',
            height: 34,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: collapsed ? 0 : 6,
            background: '#4338ca',
            color: '#fff',
            border: '1px solid rgba(165,180,252,0.4)',
            borderRadius: 7,
            fontWeight: 700,
            fontSize: 12.5,
            cursor: 'pointer',
            transition: 'background 0.14s, border-color 0.14s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#6366f1'; e.currentTarget.style.borderColor = 'rgba(165,180,252,0.7)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#4338ca'; e.currentTarget.style.borderColor = 'rgba(165,180,252,0.4)'; }}
        >
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
            <path d="M16 17l5-5m0 0l-5-5m5 5H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="3" y="4" width="7" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
          </svg>
          {!collapsed && 'Logout'}
        </button>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, color: 'rgba(148,163,184,0.6)', fontSize: 11,
          width: '100%',
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            background: 'rgba(129,140,248,0.2)',
            border: '1px solid rgba(129,140,248,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 800, color: '#a5b4fc', flexShrink: 0,
          }}>
            {roleInitial}
          </div>
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
