import React, { useEffect, useState } from 'react';
import { FaBed, FaUtensils, FaLock, FaRocket } from 'react-icons/fa';

function useViewportWidth() {
  const [w, setW] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1200));
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
}

function Feature({ icon, title, desc }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
        background: 'rgba(255,255,255,0.12)',
        border: '1px solid rgba(255,255,255,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#c7d2fe',
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#e0e7ff', marginBottom: 2 }}>{title}</div>
        <div style={{ fontWeight: 400, fontSize: 13, color: 'rgba(199,210,254,0.7)', lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  );
}

/* SVG icons used in inputs */
const IconEmail = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
    <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M2 8l10 6 10-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const IconLock = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
    <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const IconEye = ({ off }) => off ? (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M6.53 6.53 17.47 17.47" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
  </svg>
) : (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8"/>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
  </svg>
);
const IconArrow = () => (
  <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconSpinner = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: 'loginSpin 0.75s linear infinite' }}>
    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
    <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

const desktopInputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '11px 13px', borderRadius: 9,
  border: '1.5px solid #e2e8f0', fontSize: 14,
  fontWeight: 500, color: '#1e293b', background: '#f8fafc',
  outline: 'none', WebkitAppearance: 'none', fontFamily: 'inherit',
};

export default function SignIn({ onSignIn }) {
  const vw = useViewportWidth();
  const isMobile = vw < 768;

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter both email and password.'); return; }
    setLoading(true);
    setError('');
    const result = await onSignIn({ email, password });
    if (result?.error) setError(result.error);
    setLoading(false);
  };

  /* ── Mobile layout ─────────────────────────────────────────────── */
  if (isMobile) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(155deg, #0f0c29 0%, #302b63 40%, #24243e 70%, #0891b2 100%)',
        display: 'flex', flexDirection: 'column',
        position: 'relative', overflow: 'hidden',
        fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
      }}>
        <style>{`
          @keyframes loginSpin { to { transform: rotate(360deg); } }
          @keyframes logoPulse {
            0%,100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.5), 0 0 0 8px rgba(99,102,241,0.15), 0 20px 48px rgba(15,23,42,0.5); }
            50%      { box-shadow: 0 0 0 6px rgba(99,102,241,0.3), 0 0 0 16px rgba(99,102,241,0.08), 0 20px 48px rgba(15,23,42,0.5); }
          }
        `}</style>

        {/* Ambient blobs */}
        <div style={{ position: 'absolute', top: -90, left: -90, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)', pointerEvents: 'none', animation: 'drift1 16s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', top: '8%', right: -60, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(8,145,178,0.30) 0%, transparent 70%)', pointerEvents: 'none', animation: 'drift2 20s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', top: '32%', left: '5%', width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.20) 0%, transparent 70%)', pointerEvents: 'none', animation: 'drift3 12s ease-in-out infinite' }} />

        {/* ── Hero section ── */}
        <div style={{
          flex: '0 0 auto',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'flex-end',
          paddingTop: 56, paddingBottom: 30,
          gap: 0,
          position: 'relative', zIndex: 1,
          animation: 'fadeIn 0.55s ease both',
        }}>
          {/* Logo with pulsing glow rings */}
          <div style={{
            width: 90, height: 90, borderRadius: 22,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)',
            border: '1.5px solid rgba(255,255,255,0.30)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
            animation: 'logoPulse 3s ease-in-out infinite',
            marginBottom: 16,
          }}>
            <img src="/logo.png" alt="TIC" style={{ width: 78, height: 78, objectFit: 'contain' }} />
          </div>

          <div style={{ fontWeight: 900, fontSize: 26, color: '#fff', letterSpacing: '-0.5px', textAlign: 'center', lineHeight: 1.15, marginBottom: 6 }}>
            TIC Meals &amp; Stay
          </div>
          <div style={{ fontSize: 13, color: 'rgba(199,210,254,0.75)', textAlign: 'center', lineHeight: 1.5, fontWeight: 400, marginBottom: 18 }}>
            Camp management, simplified.
          </div>

          {/* Feature pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { icon: '🏠', label: 'Rooms' },
              { icon: '🍽️', label: 'Meals' },
              { icon: '👥', label: 'Staff' },
            ].map(({ icon, label }) => (
              <span key={label} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.20)',
                borderRadius: 999, padding: '5px 12px',
                fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.88)',
                backdropFilter: 'blur(6px)',
              }}>
                <span>{icon}</span>{label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Form card ── */}
        <div style={{
          flex: 1,
          background: '#ffffff',
          borderRadius: '32px 32px 0 0',
          padding: '8px 22px 44px',
          position: 'relative', zIndex: 1,
          boxShadow: '0 -12px 48px rgba(15,23,42,0.32)',
          animation: 'fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both',
          animationDelay: '120ms',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Drag handle */}
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'linear-gradient(90deg, #a5b4fc, #818cf8)', margin: '0 auto 24px', opacity: 0.6 }} />

          {/* Welcome badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: 999, padding: '5px 14px', marginBottom: 12, alignSelf: 'flex-start' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366f1', flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', letterSpacing: 0.4 }}>Welcome back</span>
          </div>

          <div style={{ fontWeight: 900, fontSize: 26, color: '#0f172a', lineHeight: 1.15, marginBottom: 24, letterSpacing: '-0.4px' }}>
            Sign in to<br />your account
          </div>

          <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

            {/* Email field */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 8 }}>
                Email address
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', display: 'flex' }}>
                  <IconEmail />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  inputMode="email"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '15px 16px 15px 46px',
                    borderRadius: 14, border: '1.5px solid #e2e8f0',
                    fontSize: 16, fontWeight: 500, color: '#1e293b',
                    background: '#f8fafc', outline: 'none',
                    WebkitAppearance: 'none', fontFamily: 'inherit',
                    transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; e.target.style.background = '#fff'; }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f8fafc'; }}
                />
              </div>
            </div>

            {/* Password field */}
            <div style={{ marginBottom: 6 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 8 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', display: 'flex' }}>
                  <IconLock />
                </div>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '15px 50px 15px 46px',
                    borderRadius: 14, border: '1.5px solid #e2e8f0',
                    fontSize: 16, fontWeight: 500, color: '#1e293b',
                    background: '#f8fafc', outline: 'none',
                    WebkitAppearance: 'none', fontFamily: 'inherit',
                    transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; e.target.style.background = '#fff'; }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f8fafc'; }}
                />
                {/* Eye toggle */}
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', padding: 4, cursor: 'pointer',
                    color: showPwd ? '#6366f1' : '#94a3b8',
                    display: 'flex', alignItems: 'center',
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'color 0.15s',
                  }}
                  tabIndex={-1}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                >
                  <IconEye off={showPwd} />
                </button>
              </div>
            </div>

            {/* Error */}
            {error ? (
              <div style={{
                marginTop: 12, padding: '11px 14px', borderRadius: 12,
                background: '#fef2f2', border: '1px solid #fecaca',
                color: '#dc2626', fontSize: 13.5, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" stroke="#dc2626" strokeWidth="2"/>
                  <path d="M12 8v4M12 16h.01" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                {error}
              </div>
            ) : null}

            {/* Sign In button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', marginTop: 22,
                padding: '16px', borderRadius: 14,
                border: 'none',
                background: loading
                  ? 'linear-gradient(135deg, #818cf8 0%, #a5b4fc 100%)'
                  : 'linear-gradient(135deg, #4338ca 0%, #6366f1 50%, #7c3aed 100%)',
                backgroundSize: '200% 100%',
                color: '#fff', fontWeight: 700, fontSize: 16,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 8px 24px rgba(99,102,241,0.45)',
                WebkitTapHighlightColor: 'transparent',
                fontFamily: 'inherit',
                transition: 'opacity 0.15s, transform 0.1s, box-shadow 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
              onTouchStart={e => { if (!loading) { e.currentTarget.style.transform = 'scale(0.97)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.3)'; }}}
              onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.45)'; }}
            >
              {loading ? (
                <><IconSpinner /> Signing in…</>
              ) : (
                <>Sign In <IconArrow /></>
              )}
            </button>

            {/* Footer */}
            <div style={{ marginTop: 'auto', paddingTop: 26, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
                  <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Contact your administrator for access
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  /* ── Desktop layout (unchanged) ─────────────────────────────────── */
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9' }}>

      {/* Left panel */}
      <div style={{
        flex: '0 0 46%',
        background: 'linear-gradient(150deg, #1e1b4b 0%, #4338ca 50%, #0891b2 100%)',
        color: '#fff',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        padding: '48px 40px',
        position: 'relative', overflow: 'hidden',
        animation: 'fadeIn 0.5s ease both',
      }}>
        <div style={{ position: 'absolute', top: -80, left: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', zIndex: 0, animation: 'drift1 14s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: -60, right: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(8,145,178,0.22)', zIndex: 0, animation: 'drift2 18s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', top: '38%', right: -50, width: 180, height: 180, borderRadius: '50%', background: 'rgba(99,102,241,0.22)', zIndex: 0, animation: 'drift3 11s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', top: '20%', left: '30%', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', zIndex: 0, animation: 'drift2 20s ease-in-out infinite reverse' }} />
        <div style={{ position: 'absolute', bottom: '20%', left: '10%', width: 90, height: 90, borderRadius: '50%', background: 'rgba(129,140,248,0.15)', zIndex: 0, animation: 'drift1 9s ease-in-out infinite reverse' }} />

        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 36, textAlign: 'center' }}>
            <img src="/logo.png" alt="TIC" style={{ width: 110, height: 110, objectFit: 'contain', borderRadius: 18, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ fontWeight: 900, fontSize: 36, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.5px' }}>
              TIC Meals &amp; Stay
            </div>
          </div>
          <h1 style={{ margin: '0 0 12px', fontWeight: 900, fontSize: 38, lineHeight: 1.1, color: '#fff' }}>
            Camp management,<br />simplified.
          </h1>
          <p style={{ margin: '0 0 36px', fontSize: 15, color: 'rgba(199,210,254,0.8)', lineHeight: 1.6 }}>
            Real-time visibility across accommodation, meals, and staff — all in one place.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Feature icon={<FaBed size={20} />} title="Accommodation" desc="Track beds, rooms, and occupancy in real time." />
            <Feature icon={<FaUtensils size={20} />} title="Meals" desc="Plan, exclude, and monitor meal services easily." />
            <Feature icon={<FaLock size={20} />} title="Secure" desc="Role-based access keeps your data protected." />
            <Feature icon={<FaRocket size={20} />} title="Fast" desc="Lightning-fast operations for busy camps." />
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px',
        animation: 'fadeUp 0.45s cubic-bezier(0.22,1,0.36,1) both',
        animationDelay: '120ms',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>Welcome back</div>
            <h2 style={{ margin: 0, fontWeight: 900, fontSize: 28, color: '#1e293b' }}>Sign in to your account</h2>
            <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14 }}>Enter your credentials to continue.</p>
          </div>
          <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(99,102,241,0.08), 0 1px 3px rgba(0,0,0,0.06)', padding: '28px 28px 24px', border: '1px solid #e2e8f0' }}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 6 }}>Email address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com" autoFocus
                style={desktopInputStyle}
                onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.background = '#fff'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; }}
              />
            </div>
            <div style={{ marginBottom: 6 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 6 }}>Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={desktopInputStyle}
                onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.background = '#fff'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; }}
              />
            </div>
            {error ? (
              <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, fontWeight: 600 }}>
                {error}
              </div>
            ) : null}
            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', marginTop: 20, padding: '12px', borderRadius: 9,
                border: 'none',
                background: loading ? '#a5b4fc' : 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                color: '#fff', fontWeight: 700, fontSize: 15,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.15s, transform 0.1s',
                boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.92'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.98)'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
