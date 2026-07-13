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
    <div className="mobile-modal-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '10px' }}>
      <div className="modal-content mobile-full-modal" style={{ position: 'relative', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: '16px', padding: '2.5rem 2rem 2rem', width: '95%', maxWidth: '550px', height: '80vh', display: 'flex', flexDirection: 'column', gap: '2rem', boxSizing: 'border-box' }}>
        
        {/* Architectural Close Button */}
        <button 
          onClick={onClose} 
          style={{ 
            position: 'absolute', 
            top: '1.5rem', 
            right: '1.5rem', 
            background: 'none', 
            border: 'none', 
            color: 'var(--text)', 
            fontSize: '1.25rem', 
            cursor: 'pointer', 
            opacity: 0.4, 
            transition: 'opacity 0.2s',
            zIndex: 10
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.4'}
        >
          ✕
        </button>

        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1.5px solid var(--border)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem', position: 'relative' }}>
          <h2 style={{ fontFamily: '"Syne", sans-serif', fontSize: 'clamp(1.25rem, 5.5vw, 2rem)', fontWeight: '800', letterSpacing: '-0.05em', margin: 0, color: 'var(--text)', paddingRight: '2rem' }}>
            LEADERBOARD
          </h2>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {['daily', 'weekly', 'monthly', 'yearly'].map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text)',
                    opacity: isActive ? 1 : 0.5,
                    fontFamily: '"Space Mono", monospace',
                    fontSize: '0.65rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                    padding: '4px 0',
                    borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '4px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontFamily: '"Space Mono", monospace', fontSize: '0.8rem' }}>Fetching ranks...</div>
          ) : leaderboardData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontFamily: '"Space Mono", monospace', fontSize: '0.8rem' }}>No focus time recorded yet.</div>
          ) : (
            leaderboardData.map((item) => {
              const formattedRank = String(item.rank).padStart(2, '0');
              const opacityVal = item.rank === 1 ? 1 : item.rank === 2 ? 0.8 : item.rank === 3 ? 0.65 : 0.5;
              return (
                <div 
                  key={item.rank} 
                  onClick={() => setSelectedUser(item)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '1rem', 
                    border: '1px solid var(--border)', 
                    borderRadius: '8px', 
                    background: 'var(--card2)', 
                    cursor: 'pointer', 
                    opacity: opacityVal,
                    transition: 'all 0.2s' 
                  }}
                  onMouseEnter={(e) => { 
                    e.currentTarget.style.borderColor = 'var(--accent)'; 
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.borderColor = 'var(--border)'; 
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.opacity = opacityVal;
                  }}
                >
                  <span style={{ 
                    fontFamily: '"Space Mono", monospace', 
                    fontSize: '0.8rem', 
                    width: '3rem', 
                    color: 'var(--accent)',
                    fontWeight: 'bold'
                  }}>
                    #{formattedRank}
                  </span>
                  <span style={{ 
                    flexGrow: 1, 
                    fontWeight: '500', 
                    color: 'var(--text)' 
                  }}>
                    @{item.username}
                  </span>
                  <span style={{ 
                    fontFamily: '"Space Mono", monospace', 
                    fontSize: '0.8rem', 
                    opacity: 0.8, 
                    color: 'var(--text)' 
                  }}>
                    {item.time}
                  </span>
                </div>
              );
            })
          )}
        </div>



        {selectedUser && <UserProfileModal user={selectedUser} onClose={() => setSelectedUser(null)} />}
      </div>
    </div>
  );
}
