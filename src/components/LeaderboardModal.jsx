import React, { useState, useEffect } from 'react';
import { db, fbDb } from '../config/firebase';
import UserProfileModal from './UserProfileModal';

function formatTime(totalMins) {
  if (!totalMins) return '0 mins';
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `${m} mins`;
  return `${h} hrs ${m} mins`;
}

export default function LeaderboardModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('weekly');
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      try {
        const querySnapshot = await fbDb.getDocs(fbDb.collection(db, 'leaderboard'));
        const data = [];
        
        // 1. Calculate time boundaries
        const now = new Date();
        const offset = now.getTimezoneOffset();
        const localNow = new Date(now.getTime() - offset * 60000);
        const todayStr = localNow.toISOString().split('T')[0];

        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        querySnapshot.forEach((doc) => {
          const item = { id: doc.id, ...doc.data() };
          const lastUp = new Date(item.lastUpdated || 0);

          // Local date string for lastUpdated
          const localLastUp = new Date(lastUp.getTime() - lastUp.getTimezoneOffset() * 60000);
          const lastUpStr = localLastUp.toISOString().split('T')[0];

          // 2. STALE DATA FIX: Zero out old data before sorting
          if (lastUpStr !== todayStr) item.daily = 0;
          if (lastUp < startOfWeek) item.weekly = 0;
          if (lastUp < startOfMonth) item.monthly = 0;
          if (lastUp < startOfYear) item.yearly = 0;

          data.push(item);
        });

        // 3. Sort dynamically based on the active tab
        data.sort((a, b) => (b[activeTab] || 0) - (a[activeTab] || 0));

        // 4. Assign ranks, format time, and filter out zeroes
        const rankedData = data.map((item, index) => {
          const displayUser = (item.username && item.username !== 'Anonymous') 
                              ? item.username 
                              : `Anonymous_${item.id.substring(0, 4)}`;
                              
          return {
            ...item,
            rank: index + 1,
            username: displayUser,
            time: formatTime(item[activeTab] || 0)
          };
        }).filter(item => (item[activeTab] || 0) > 0);

        setLeaderboardData(rankedData);
      } catch (error) {
        console.error("Error fetching leaderboard: ", error);
      }
      setLoading(false);
    }

    fetchLeaderboard();
  }, [activeTab]);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '10px' }}>
      <div className="modal-content" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '20px', padding: '2rem', width: '95%', maxWidth: '500px', height: '80vh', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', letterSpacing: '0.05em' }}>🏆 LEADERBOARD</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '1.6rem', cursor: 'pointer' }}>&times;</button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--card)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)' }}>
          {['daily', 'weekly', 'monthly', 'yearly'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: '0.6rem 0', background: activeTab === tab ? 'var(--bg)' : 'none',
                color: activeTab === tab ? 'var(--text)' : 'var(--text-muted)', border: activeTab === tab ? '1px solid var(--border)' : 'none',
                borderRadius: '8px', fontSize: '0.85rem', fontWeight: activeTab === tab ? '600' : '400',
                textTransform: 'capitalize', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Fetching ranks...</div>
          ) : leaderboardData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No focus time recorded yet.</div>
          ) : (
            leaderboardData.map((item) => (
              <div 
                key={item.rank} 
                onClick={() => setSelectedUser(item)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '1rem', fontWeight: '800', color: item.rank === 1 ? '#FFD700' : item.rank === 2 ? '#C0C0C0' : item.rank === 3 ? '#CD7F32' : 'var(--text-muted)', width: '24px' }}>
                    #{item.rank}
                  </span>
                  <span style={{ fontSize: '0.95rem', fontWeight: '500', color: 'var(--text)' }}>@{item.username}</span>
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--accent)' }}>{item.time}</span>
              </div>
            ))
          )}
        </div>
        {selectedUser && <UserProfileModal user={selectedUser} onClose={() => setSelectedUser(null)} />}
      </div>
    </div>
  );
}
