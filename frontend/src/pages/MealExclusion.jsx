import React from 'react';

function MealExclusion() {
  return (
    <div className="page-container" style={{ width: '100%', maxWidth: '100%', margin: 0, padding: '32px 32px 0 32px', background: 'none', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', boxSizing: 'border-box' }}>
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #d0d7e2', padding: '32px 40px', minHeight: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h2 style={{ fontWeight: 800, fontSize: '1.3rem', color: '#1e315f', marginBottom: 18 }}>Meal Exclusion</h2>
        <div style={{ fontSize: 18, color: '#7a869a', marginBottom: 18, textAlign: 'center' }}>
          This section will show meal exclusion records for staff. (UI/UX placeholder)
        </div>
      </div>
    </div>
  );
}

export default MealExclusion;
