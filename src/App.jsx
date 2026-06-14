import { useState, useEffect } from 'react';
import { auth, fbAuth, db, fbDb } from './config/firebase';
import Navbar from './components/Navbar';
import TimerPage from './components/TimerPage';
import StopwatchPage from './components/StopwatchPage';
import ClockPage from './components/ClockPage';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import ManualLogModal from './components/ManualLogModal';
import LoginScreen from './components/LoginScreen';
import LeaderboardModal from './components/LeaderboardModal';
import ChatModal from './components/ChatModal';

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [tab, setTab] = useState('Timer');
  const [showDash, setShowDash] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showManualLog, setShowManualLog] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [stopwatchActive, setStopwatchActive] = useState(false);

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('focus_settings');
      if (saved) {
        return {
          studyMin: 25, breakMin: 5, normalMin: 25,
          audioEnabled: true, strictMode: false, dailyGoal: 4,
          accentColor: '#4CAF50', clockFormat: '12h',
          ...JSON.parse(saved)
        };
      }
    } catch (e) { }
    return {
      studyMin: 25, breakMin: 5, normalMin: 25,
      audioEnabled: true, strictMode: false, dailyGoal: 4,
      accentColor: '#4CAF50', clockFormat: '12h'
    };
  });

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('focus_theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'flip';
  });

  // Firebase Auth & Cloud Sync Listener
  useEffect(() => {
    const unsubscribe = fbAuth.onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const docSnap = await fbDb.getDoc(fbDb.doc(db, 'users', currentUser.uid));
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.sessions) localStorage.setItem('focus_sessions', JSON.stringify(data.sessions));
            if (data.settings) {
              localStorage.setItem('focus_settings', JSON.stringify(data.settings));
              setSettings(prev => ({ ...prev, ...data.settings }));
            }
          }
        } catch (error) {
          console.error("Error fetching cloud data:", error);
        }
      }
      setUser(currentUser);
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('focus_theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', settings.accentColor);
  }, [settings.accentColor]);

  // Prevent accidental tab closure if a timer is active
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (timerActive || stopwatchActive) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome and modern browsers to show the warning
        return ''; // Legacy support
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [timerActive, stopwatchActive]);

  // Online Presence Heartbeat
  useEffect(() => {
    if (!auth.currentUser) return;
    const updatePresence = async () => {
      try {
        await fbDb.setDoc(fbDb.doc(db, 'users', auth.currentUser.uid), {
          lastActive: Date.now()
        }, { merge: true });
      } catch (e) { }
    };
    updatePresence(); // Run once immediately
    const interval = setInterval(updatePresence, 60000); // Update every 1 minute
    return () => clearInterval(interval);
  }, [auth.currentUser]);

  function cycleTheme() {
    setTheme(t => t === 'flip' ? 'dark' : t === 'dark' ? 'light' : 'flip');
  }

  if (authChecking) { return <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text)', gap: '1rem' }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="4.93" x2="19.07" y2="7.76"></line></svg><span style={{ fontSize: '0.9rem', letterSpacing: '0.1em' }}>LOADING</span></div>; }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="app">
      <Navbar tab={tab} setTab={setTab} theme={theme} cycleTheme={cycleTheme}
        showDash={showDash} setShowDash={setShowDash}
        showSettings={showSettings} setShowSettings={setShowSettings}
        showManualLog={showManualLog} setShowManualLog={setShowManualLog}
        showLeaderboard={showLeaderboard} setShowLeaderboard={setShowLeaderboard}
        showChat={showChat} setShowChat={setShowChat} />

      <div className="app-main">
        <div
          className={`page-wrapper ${tab === 'Timer' ? 'active' : timerActive ? 'mini' : 'hidden'}`}
          onClick={() => { if (tab !== 'Timer' && timerActive) setTab('Timer'); }}
          title={tab !== 'Timer' && timerActive ? "Click to return to Timer" : ""}
        >
          <TimerPage onStateChange={setTimerActive} settings={settings} />
        </div>

        <div
          className={`page-wrapper ${tab === 'Stopwatch' ? 'active' : stopwatchActive ? 'mini' : 'hidden'}`}
          onClick={() => { if (tab !== 'Stopwatch' && stopwatchActive) setTab('Stopwatch'); }}
          title={tab !== 'Stopwatch' && stopwatchActive ? "Click to return to Stopwatch" : ""}
        >
          <StopwatchPage onStateChange={setStopwatchActive} />
        </div>

        <div className={`page-wrapper ${tab === 'Clock' ? 'active' : 'hidden'}`}>
          <ClockPage settings={settings} />
        </div>
      </div>

      {showDash && <Dashboard settings={settings} onClose={() => setShowDash(false)} />}
      {showSettings && <Settings settings={settings} setSettings={setSettings} theme={theme} cycleTheme={cycleTheme} onClose={() => setShowSettings(false)} />}
      {showManualLog && <ManualLogModal onClose={() => setShowManualLog(false)} />}
      {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} />}
      {showChat && <ChatModal onClose={() => setShowChat(false)} />}
    </div>
  );
}
