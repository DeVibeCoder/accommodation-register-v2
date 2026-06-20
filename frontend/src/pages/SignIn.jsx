import React, { useState } from 'react';
import { FaBed, FaUtensils, FaLock, FaRocket } from 'react-icons/fa';

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

export default function SignIn({ onSignIn }) {
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9' }}>

      {/* ── Left panel ── */}
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
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -80, left: -80, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', zIndex: 0 }} />
        <div style={{ position: 'absolute', bottom: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(8,145,178,0.2)', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: '40%', right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(99,102,241,0.2)', zIndex: 0 }} />

        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
            <img src="/logo.png" alt="TIC" style={{ width: 54, height: 54, objectFit: 'cover', objectPosition: 'center', borderRadius: 12, border: '1px solid rgba(255,255,255,0.18)' }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#fff', lineHeight: 1.2 }}>TIC Meals &amp; Stay</div>
              <div style={{ fontSize: 11, color: 'rgba(199,210,254,0.7)', marginTop: 2 }}>Camp Management System</div>
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

      {/* ── Right panel ── */}
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
                style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 9, border: '1.5px solid #e2e8f0', fontSize: 14, fontWeight: 500, color: '#1e293b', background: '#f8fafc', outline: 'none', transition: 'border-color 0.15s' }}
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
                style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 9, border: '1.5px solid #e2e8f0', fontSize: 14, fontWeight: 500, color: '#1e293b', background: '#f8fafc', outline: 'none', transition: 'border-color 0.15s' }}
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
