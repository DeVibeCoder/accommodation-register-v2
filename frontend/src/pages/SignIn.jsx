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

const inputStyle = (mobile) => ({
  width: '100%',
  boxSizing: 'border-box',
  padding: mobile ? '15px 16px' : '11px 13px',
  borderRadius: mobile ? 14 : 9,
  border: '1.5px solid #e2e8f0',
  fontSize: mobile ? 16 : 14,
  fontWeight: 500,
  color: '#1e293b',
  background: mobile ? '#fff' : '#f8fafc',
  outline: 'none',
  WebkitAppearance: 'none',
  fontFamily: 'inherit',
});

export default function SignIn({ onSignIn }) {
  const vw = useViewportWidth();
  const isMobile = vw < 768;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter both email and password.'); return; }
    setLoading(true);
    setError('');
    const result = await onSignIn({ email, password });
    if (result?.error) setError(result.error);
    setLoading(false);
  };

  /* ── Mobile layout ───────────────────────────────────────────── */
  if (isMobile) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #1e1b4b 0%, #4338ca 55%, #0891b2 100%)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
      }}>
        {/* Decorative ambient circles */}
        <div style={{ position: 'absolute', top: -70, left: -70, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none', animation: 'drift1 14s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', top: '10%', right: -50, width: 190, height: 190, borderRadius: '50%', background: 'rgba(8,145,178,0.20)', pointerEvents: 'none', animation: 'drift2 18s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', top: '28%', left: '15%', width: 100, height: 100, borderRadius: '50%', background: 'rgba(99,102,241,0.18)', pointerEvents: 'none', animation: 'drift3 11s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', top: '5%', right: '25%', width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none', animation: 'drift1 20s ease-in-out infinite reverse' }} />

        {/* Top: branding */}
        <div style={{
          flex: '0 0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingTop: 60,
          paddingBottom: 32,
          gap: 12,
          position: 'relative',
          zIndex: 1,
          animation: 'fadeIn 0.5s ease both',
        }}>
          <div style={{
            width: 82, height: 82,
            borderRadius: 20,
            border: '1.5px solid rgba(255,255,255,0.25)',
            background: 'rgba(255,255,255,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: '0 8px 28px rgba(15,23,42,0.30)',
          }}>
            <img src="/logo.png" alt="TIC" style={{ width: 72, height: 72, objectFit: 'contain' }} />
          </div>
          <div style={{ fontWeight: 900, fontSize: 24, color: '#fff', letterSpacing: '-0.4px', textAlign: 'center', lineHeight: 1.2 }}>
            TIC Meals &amp; Stay
          </div>
          <div style={{ fontSize: 13, color: 'rgba(199,210,254,0.82)', textAlign: 'center', lineHeight: 1.5, fontWeight: 400, maxWidth: 240 }}>
            Camp management, simplified.
          </div>
        </div>

        {/* Bottom: form card slides up */}
        <div style={{
          flex: 1,
          background: '#f8fafc',
          borderRadius: '28px 28px 0 0',
          padding: '10px 20px 48px',
          position: 'relative',
          zIndex: 1,
          boxShadow: '0 -10px 40px rgba(15,23,42,0.28)',
          animation: 'fadeUp 0.45s cubic-bezier(0.22,1,0.36,1) both',
          animationDelay: '100ms',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Drag handle */}
          <div style={{ width: 38, height: 4, borderRadius: 2, background: '#d1d9e6', margin: '0 auto 22px' }} />

          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', letterSpacing: 1.3, textTransform: 'uppercase', marginBottom: 5 }}>
              Welcome back
            </div>
            <div style={{ fontWeight: 900, fontSize: 23, color: '#1e293b', lineHeight: 1.2 }}>
              Sign in to your account
            </div>
            <div style={{ marginTop: 6, fontSize: 13.5, color: '#64748b' }}>
              Enter your credentials to continue.
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 7 }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                inputMode="email"
                style={inputStyle(true)}
                onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 7 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={inputStyle(true)}
                onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {error ? (
              <div style={{ marginTop: 10, padding: '11px 14px', borderRadius: 12, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13.5, fontWeight: 600, lineHeight: 1.4 }}>
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                marginTop: 22,
                padding: '16px',
                borderRadius: 14,
                border: 'none',
                background: loading ? '#a5b4fc' : 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 16,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 6px 18px rgba(99,102,241,0.40)',
                WebkitTapHighlightColor: 'transparent',
                letterSpacing: 0.2,
                fontFamily: 'inherit',
                transition: 'opacity 0.15s',
              }}
              onTouchStart={e => { if (!loading) e.currentTarget.style.opacity = '0.88'; }}
              onTouchEnd={e => { e.currentTarget.style.opacity = '1'; }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>

            <div style={{ marginTop: 'auto', paddingTop: 28, textAlign: 'center', fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
              Contact your administrator if you need access.
            </div>
          </form>
        </div>
      </div>
    );
  }

  /* ── Desktop layout ──────────────────────────────────────────── */
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
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoFocus
                style={inputStyle(false)}
                onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.background = '#fff'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; }}
              />
            </div>
            <div style={{ marginBottom: 6 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 6 }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={inputStyle(false)}
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
              type="submit"
              disabled={loading}
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
