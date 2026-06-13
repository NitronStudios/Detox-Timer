import { useState, useEffect } from 'react';
import { auth, db, fbDb } from '../config/firebase';

export default function Navbar({ tab, setTab, theme, cycleTheme, showDash, setShowDash, showSettings, setShowSettings, showManualLog, setShowManualLog, showLeaderboard, setShowLeaderboard, showChat, setShowChat }) {
  const [pendingRequests, setPendingRequests] = useState(0);
  const currentUid = auth.currentUser?.uid;

  useEffect(() => {
    if (!currentUid) {
      setPendingRequests(0);
      return;
    }
    const unsub = fbDb.onSnapshot(fbDb.collection(db, 'friend_requests'), (snapshot) => {
      let count = 0;
      snapshot.forEach(doc => {
        if (doc.data().to === currentUid) count++;
      });
      setPendingRequests(count);
    });
    return () => unsub();
  }, [currentUid]);

  const themeIcon = theme === 'light' ? '☀' : theme === 'dark' ? '◑' : '◉';
  const themeTitle = theme === 'light' ? 'Light mode' : theme === 'dark' ? 'Dark mode' : 'Flip Clock mode';

  return (
    <nav className="navbar">
      <span className="navbar-brand">DETOX TIMER</span>

      <div className="navbar-tabs">
        {['Timer', 'Stopwatch', 'Clock'].map(t => (
          <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div className="navbar-right">
        <button className="icon-btn" onClick={cycleTheme} title={themeTitle}>{themeIcon}</button>
        <button className={`icon-btn${showDash ? ' active' : ''}`}
          onClick={() => { setShowDash(s => !s); setShowSettings(false); }} title="Dashboard">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </button>
        {/* Manual Log Button - Fixed */}
        <button className={`icon-btn${showManualLog ? ' active' : ''}`} onClick={() => setShowManualLog(true)} title="Add Manual Log">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
        </button>
        {/* Leaderboard Button */}
        <button className={`icon-btn${showLeaderboard ? ' active' : ''}`}
          onClick={() => { setShowLeaderboard(s => !s); setShowDash(false); setShowSettings(false); setShowManualLog(false); }} title="Leaderboard">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
            <path d="M4 22h16"></path>
            <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"></path>
            <path d="M12 2a6 6 0 0 1 6 6v1c0 3.3-2.7 6-6 6a6 6 0 0 1-6-6V8a6 6 0 0 1 6-6z"></path>
          </svg>
        </button>
        {/* Chat Button */}
        <button className={`icon-btn${showChat ? ' active' : ''}`} style={{ position: 'relative' }} onClick={() => { setShowChat(s => !s); setShowDash(false); setShowSettings(false); setShowManualLog(false); setShowLeaderboard(false); }} title="Friends">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          {pendingRequests > 0 && (
            <span style={{ position: 'absolute', top: '2px', right: '2px', width: '8px', height: '8px', background: '#EF4444', borderRadius: '50%', border: '2px solid var(--bg)' }}></span>
          )}
        </button>
        <button className={`icon-btn${showSettings ? ' active' : ''}`}
          onClick={() => { setShowSettings(s => !s); setShowDash(false); setShowLeaderboard(false); setShowChat(false); }} title="Settings">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0a2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
      </div>
    </nav>
  );
}
