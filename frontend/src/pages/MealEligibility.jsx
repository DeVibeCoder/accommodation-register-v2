import React from 'react';

function MealEligibility() {
  return (
    <div className="page-container" style={{ width: '100%', maxWidth: '100%', margin: 0, padding: '32px 32px 0 32px', background: 'none', boxSizing: 'border-box' }}>
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #d0d7e2', padding: '32px 40px', minHeight: 180 }}>
        <h2 style={{ fontWeight: 800, fontSize: '1.3rem', color: '#1e315f', marginBottom: 18 }}>Meal Eligibility</h2>
        <div style={{ fontSize: 16, color: '#7a869a', marginBottom: 18 }}>
          This section will show meal eligibility for staff. (UI/UX placeholder)
        </div>
        <div style={{ display: 'flex', gap: 18 }}>
          <div style={{ background: '#e3eafc', color: '#1e315f', borderRadius: 10, padding: '18px 24px', fontWeight: 700, fontSize: 18, flex: 1, textAlign: 'center' }}>
            Eligible: 280
          </div>
          <div style={{ background: '#ffe0b2', color: '#7c5a1e', borderRadius: 10, padding: '18px 24px', fontWeight: 700, fontSize: 18, flex: 1, textAlign: 'center' }}>
            Not Eligible: 20
          </div>
        </div>
      </div>
    </div>
  );
}

export default MealEligibility;
