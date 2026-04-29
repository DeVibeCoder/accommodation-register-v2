import React, { useEffect, useState } from 'react';
import { fetchMealHistory } from '../services/mealService';

function MealHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const loadHistory = async () => {
    setLoading(true);
    setNotice('');
    try {
      const rows = await fetchMealHistory();
      setHistory(rows);
    } catch (error) {
      setNotice(error?.message || 'Unable to load meal history.');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <div className="page-container" style={{ width: '100%', maxWidth: '100%', margin: 0, padding: '24px 32px', background: 'none', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div>
          <h1 style={{ margin: 0, color: '#1e315f', fontWeight: 900, fontSize: '1.8rem' }}>Meal History</h1>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontWeight: 600 }}>Completed meal exclusions and processed records.</p>
        </div>
        <button onClick={loadHistory} disabled={loading} style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: loading ? '#cbd5e1' : '#1d4ed8', color: '#fff', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {notice ? (
        <div style={{ marginBottom: 12, borderRadius: 10, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', padding: '10px 12px', fontWeight: 700 }}>
          {notice}
        </div>
      ) : null}

      <div style={{ background: '#fff', border: '1px solid #dbe4f0', borderRadius: 14, padding: 16 }}>
        {loading && history.length === 0 ? <div style={{ color: '#64748b', fontWeight: 700 }}>Loading history...</div> : null}
        {!loading && history.length === 0 ? <div style={{ color: '#64748b', fontWeight: 700 }}>No meal history records yet.</div> : null}

        {history.length > 0 ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {history.map(item => (
              <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}>
                <div style={{ fontWeight: 800, color: '#1f2937' }}>{item.name} ({item.reason})</div>
                <div style={{ color: '#64748b', fontSize: 12 }}>
                  {item.roomId} / Bed {item.bedNo} | From {String(item.fromDate || '').slice(0, 10)}{item.toDate ? ` to ${String(item.toDate).slice(0, 10)}` : ''}
                </div>
                <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                  Completed: {item.autoCheckedOutAt ? String(item.autoCheckedOutAt).slice(0, 10) : (item.toDate ? String(item.toDate).slice(0, 10) : '-')}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default MealHistory;
