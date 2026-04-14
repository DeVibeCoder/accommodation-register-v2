

import React, { useState } from 'react';
import { FaBed, FaUtensils, FaLock, FaRocket } from 'react-icons/fa';

export default function SignIn({ onSignIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simple demo: accept any non-empty email/password
    if (email && password) {
      setError('');
      onSignIn({ email });
    } else {
      setError('Please enter both email and password.');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f7fa' }}>
      {/* Left: Modern, engaging marketing */}
      <div
        style={{
          flex: 1.2,
          background: 'linear-gradient(135deg, #1e315f 60%, #3a7bd5 100%)',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 0,
          minWidth: 0,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{
          width: '100%',
          maxWidth: 600,
          padding: '0 0 0 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
        }}>
          <div style={{
            fontWeight: 900,
            fontSize: 54,
            marginBottom: 18,
            letterSpacing: 0.5,
            textAlign: 'center',
            lineHeight: 1.08,
            textShadow: '0 4px 32px #0003',
          }}>
            TIC Meals & Stay
          </div>
          <div style={{
            fontWeight: 700,
            fontSize: 32,
            marginBottom: 24,
            textAlign: 'center',
            lineHeight: 1.2,
            color: '#e3eafc',
            textShadow: '0 2px 12px #0002',
          }}>
            The all-in-one platform for modern camp management
          </div>
          <div style={{
            fontWeight: 400,
            fontSize: 22,
            color: '#c7d6f7',
            maxWidth: 440,
            textAlign: 'center',
            marginBottom: 36,
            lineHeight: 1.4,
          }}>
            Effortlessly manage accommodation, meals, and staff with speed, security, and clarity.
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
            width: '100%',
            maxWidth: 420,
            margin: '0 auto',
          }}>
            <Feature icon={<FaBed size={28} />} title="Accommodation" desc="Track beds, rooms, and occupancy in real time." />
            <Feature icon={<FaUtensils size={28} />} title="Meals" desc="Plan, exclude, and monitor meal services easily." />
            <Feature icon={<FaLock size={28} />} title="Security" desc="Your data is safe with enterprise-grade protection." />
            <Feature icon={<FaRocket size={28} />} title="Speed" desc="Lightning-fast operations for busy camps." />
          </div>
        </div>
        {/* Decorative background shapes */}
        <div style={{
          position: 'absolute',
          top: '-120px',
          left: '-120px',
          width: 320,
          height: 320,
          background: 'radial-gradient(circle, #fff2 0%, #1e315f00 80%)',
          borderRadius: '50%',
          zIndex: 1,
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-100px',
          right: '-100px',
          width: 220,
          height: 220,
          background: 'radial-gradient(circle, #3a7bd5aa 0%, #1e315f00 80%)',
          borderRadius: '50%',
          zIndex: 1,
        }} />
      </div>

      {/* Feature component for left panel */}
      {/* Place this inside the file, outside the SignIn function */}
      {/* ...existing code... */}
      {/* Right: Sign in form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e9ecf3' }}>
        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 18, boxShadow: '0 4px 32px #1e315f22', padding: 40, minWidth: 340, maxWidth: 400, width: '100%' }}>
          <div style={{ color: '#7a869a', fontWeight: 700, fontSize: 13, letterSpacing: 1, marginBottom: 8 }}>SECURE SIGN IN</div>
          <div style={{ fontWeight: 900, fontSize: 32, color: '#16244c', marginBottom: 8 }}>Welcome back</div>
          <div style={{ color: '#7a869a', fontWeight: 500, fontSize: 15, marginBottom: 24 }}>Sign in to continue.</div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontWeight: 700, fontSize: 15, color: '#16244c', marginBottom: 6, display: 'block' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1.5px solid #d0d7e2', fontSize: 16, fontWeight: 600, marginBottom: 4 }}
              autoFocus
            />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontWeight: 700, fontSize: 15, color: '#16244c', marginBottom: 6, display: 'block' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1.5px solid #d0d7e2', fontSize: 16, fontWeight: 600, marginBottom: 4 }}
            />
          </div>
          {error && <div style={{ color: '#e74c3c', fontWeight: 600, marginBottom: 12 }}>{error}</div>}
          <button type="submit" style={{ width: '100%', background: '#16244c', color: '#fff', fontWeight: 800, fontSize: 18, border: 'none', borderRadius: 8, padding: '12px 0', marginTop: 8, boxShadow: '0 2px 8px #d0d7e2', cursor: 'pointer', letterSpacing: 0.5 }}>
            Sign In
          </button>

        </form>
      </div>
    </div>
  );

// Feature component for left panel
function Feature({ icon, title, desc }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        background: 'rgba(255,255,255,0.10)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        boxShadow: '0 2px 8px #0001',
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 2 }}>{title}</div>
        <div style={{ fontWeight: 400, fontSize: 16, color: '#e3eafc' }}>{desc}</div>
      </div>
    </div>
  );
}
}
