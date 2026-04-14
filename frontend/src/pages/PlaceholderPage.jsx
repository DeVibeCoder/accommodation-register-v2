import React from 'react';

function PlaceholderPage({ title }) {
  return (
    <div style={{ padding: 40, textAlign: 'center', color: '#7a869a', fontSize: 24 }}>
      <h2 style={{ fontWeight: 800, fontSize: '2rem', marginBottom: 18 }}>{title}</h2>
      <div style={{ fontSize: 18, opacity: 0.7 }}>This page is under construction for the new UI/UX redesign.</div>
    </div>
  );
}

export default PlaceholderPage;
