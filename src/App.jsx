import { useState, useEffect } from 'react';
import { auth, fbAuth, db, fbDb } from './config/firebase';
import { Capacitor, SystemBars } from '@capacitor/core';
import { Maximize, Minimize } from 'lucide-react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar } from '@hugotomazi/capacitor-navigation-bar';
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
import OnboardingScreen from './components/OnboardingScreen';

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
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // ================================================================
  // ACTIVE TIMER PROTECTIONS (Web + Mobile Survival Shield)
  // ================================================================
  useEffect(() => {
    let wakeLock = null;

    // 1. Prevent screen from sleeping (Mobile/Desktop)
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && (timerActive || stopwatchActive) && document.visibilityState === 'visible') {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        console.log('Wake Lock error:', err);
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLock !== null) {
        await wakeLock.release();
        wakeLock = null;
      }
    };

    // 2. Re-acquire lock if user switches apps and comes back
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };

    // 3. Warn on accidental tab close/refresh (PC)
    const handleBeforeUnload = (e) => {
      if (timerActive || stopwatchActive) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    // Apply protections if active
    if (timerActive || stopwatchActive) {
      requestWakeLock();
      window.addEventListener('beforeunload', handleBeforeUnload);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      // 4. Anti-Swipe Back Hack (Mobile)
      window.history.pushState(null, '', window.location.href);
      window.onpopstate = function () {
        if (window.confirm("Focus Session is active! Are you sure you want to go back?")) {
          window.history.back();
        } else {
          window.history.pushState(null, '', window.location.href);
        }
      };
    } else {
      releaseWakeLock();
      window.onpopstate = null;
    }

    return () => {
      releaseWakeLock();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.onpopstate = null;
    };
  }, [timerActive, stopwatchActive]);

  // ================================================================
  // NATIVE SYSTEM BARS CONTROL (Android/iOS)
  // ================================================================
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const setupSystemBars = async () => {
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        // Match the true black background
        await StatusBar.setBackgroundColor({ color: '#000000' });
        // Let the webview extend seamlessly behind the status bar (CSS safe-area will handle padding)
        await StatusBar.setOverlaysWebView({ overlay: true });

        // Force true black on the bottom Android Navigation Bar natively
        await NavigationBar.setColor({ color: '#000000', darkButtons: false });
      } catch (e) {
        console.log("System bar setup error:", e);
      }
    };

    const handleOrientationChange = async () => {
      try {
        // FIX: Use physical screen orientation, bypassing keyboard aspect-ratio changes
        let isLandscape = false;
        if (window.screen && window.screen.orientation) {
          isLandscape = window.screen.orientation.type.startsWith('landscape');
        } else {
          isLandscape = window.innerWidth > window.innerHeight;
        }

        if (isLandscape) {
          document.documentElement.classList.add('is-landscape');
          await StatusBar.hide();
          await SystemBars.hide();
        } else {
          document.documentElement.classList.remove('is-landscape');
          await StatusBar.show();
          await SystemBars.show();
        }
      } catch (e) {
        console.log("System bar orientation error:", e);
      }
    };

    setupSystemBars();
    handleOrientationChange();

    // Listen to physical rotation API instead of CSS media query
    if (window.screen && window.screen.orientation) {
      window.screen.orientation.addEventListener('change', handleOrientationChange);
    } else {
      window.addEventListener('resize', handleOrientationChange);
    }

    return () => {
      if (window.screen && window.screen.orientation) {
        window.screen.orientation.removeEventListener('change', handleOrientationChange);
      } else {
        window.removeEventListener('resize', handleOrientationChange);
      }
    };
  }, []);

  // ================================================================
  // NATIVE SAFE AREA CONTROL (Fix for Notch/Status Bar Overlap)
  // ================================================================
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      // Provide a fallback for web if needed, though web usually handles env() correctly
      document.documentElement.style.setProperty('--safe-top', 'env(safe-area-inset-top, 0px)');
      return;
    }

    const setSafeArea = async () => {
      try {
        // Dynamically import SafeArea so it doesn't break web builds if not installed
        const { SafeArea } = await import('@capacitor-community/safe-area');
        const insets = await SafeArea.getSafeAreaInsets();

        // If the native API successfully returns a value > 0, apply it.
        // Otherwise, fallback to a hardcoded minimum padding (e.g., 28px) for typical Android status bars.
        const topInset = insets.insets.top > 0 ? `${insets.insets.top}px` : '32px';

        document.documentElement.style.setProperty('--safe-top', topInset);
      } catch (e) {
        console.log("Safe Area plugin not found or failed, applying fallback.", e);
        // Fallback for Android status bar if the plugin fails
        document.documentElement.style.setProperty('--safe-top', '32px');
      }
    };

    setSafeArea();
  }, []);

  // ================================================================
  // KEYBOARD VISUAL STATE (toggles CSS class for UI shrinking)
  // NOTE: Actual viewport resize is handled by adjustResize + resize:native
  // ================================================================
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cleanupFns = [];

    const setupKeyboardListeners = async () => {
      try {
        const { Keyboard } = await import('@capacitor/keyboard');

        const showListener = await Keyboard.addListener('keyboardWillShow', () => {
          document.documentElement.classList.add('keyboard-open');
        });

        const hideListener = await Keyboard.addListener('keyboardWillHide', () => {
          document.documentElement.classList.remove('keyboard-open');
        });

        cleanupFns.push(() => showListener.remove());
        cleanupFns.push(() => hideListener.remove());
      } catch (e) {
        console.log("Keyboard plugin not available:", e);
      }
    };

    setupKeyboardListeners();

    return () => {
      cleanupFns.forEach(fn => fn());
    };
  }, []);

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

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };


  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Ignore if typing in input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      
      if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        if ((tab === 'Clock' || (tab === 'Timer' && stopwatchActive) || (tab === 'Pomodoro' && timerActive))) toggleFullscreen();
      } else if (e.code === 'Space') {
        e.preventDefault();
        window.dispatchEvent(new Event('toggle-timer'));
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isFullscreen, tab, stopwatchActive, timerActive]);


  const handleDoubleClick = (e) => {
    // Avoid triggering on inputs or buttons
    if (['INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'A'].includes(e.target.tagName)) return;
    if (e.target.closest('.controls') || e.target.closest('.pomo-config') || e.target.closest('.navbar')) return;
    
    if ((tab === 'Clock' || (tab === 'Timer' && stopwatchActive) || (tab === 'Pomodoro' && timerActive))) toggleFullscreen();
  };

  function cycleTheme() {
    setTheme(t => t === 'flip' ? 'dark' : t === 'dark' ? 'light' : 'flip');
  }

  if (authChecking) { return <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text)', gap: '1rem' }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="4.93" x2="19.07" y2="7.76"></line></svg><span style={{ fontSize: '0.9rem', letterSpacing: '0.1em' }}>LOADING</span></div>; }

  if (!user) {
    return <LoginScreen />;
  }

  // GATEKEEPER: If user is logged in, but has no username set, force them to onboarding.
  // We check this AFTER authChecking is false, meaning we've already tried fetching their existing cloud data.
  if (user && !settings.username) {
    return (
      <OnboardingScreen
        settings={settings}
        setSettings={setSettings}
        onComplete={() => console.log('Onboarding complete')}
      />
    );
  }

  return (
    <div className={`app ${isFullscreen ? 'is-fullscreen' : ''}`} onDoubleClick={handleDoubleClick}>
      <Navbar tab={tab} setTab={setTab} theme={theme} cycleTheme={cycleTheme}
        showDash={showDash} setShowDash={setShowDash}
        showSettings={showSettings} setShowSettings={setShowSettings}
        showManualLog={showManualLog} setShowManualLog={setShowManualLog}
        showLeaderboard={showLeaderboard} setShowLeaderboard={setShowLeaderboard}
        showChat={showChat} setShowChat={setShowChat} />

      <div className="app-main">
        <div
          className={`page-wrapper ${tab === 'Pomodoro' ? 'active' : timerActive ? 'mini' : 'hidden'}`}
          onClick={() => { if (tab !== 'Pomodoro' && timerActive) setTab('Pomodoro'); }}
          title={tab !== 'Pomodoro' && timerActive ? "Click to return to Pomodoro" : ""}
        >
          <TimerPage onStateChange={setTimerActive} settings={settings} isTabActive={tab === 'Pomodoro'} />
        </div>

        <div
          className={`page-wrapper ${tab === 'Timer' ? 'active' : stopwatchActive ? 'mini' : 'hidden'}`}
          onClick={() => { if (tab !== 'Timer' && stopwatchActive) setTab('Timer'); }}
          title={tab !== 'Timer' && stopwatchActive ? "Click to return to Timer" : ""}
        >
          <StopwatchPage onStateChange={setStopwatchActive} isTabActive={tab === 'Timer'} />
        </div>

        <div className={`page-wrapper ${tab === 'Clock' ? 'active' : 'hidden'}`}>
          <ClockPage settings={settings} />
        </div>
      </div>

      {!showDash && !showSettings && !showManualLog && !showLeaderboard && !showChat && (tab === 'Clock' || (tab === 'Timer' && stopwatchActive) || (tab === 'Pomodoro' && timerActive)) && (
        <button className="fullscreen-btn" onClick={toggleFullscreen} title="Toggle Fullscreen">
          {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </button>
      )}

      {showDash && <Dashboard settings={settings} setShowManualLog={setShowManualLog} onClose={() => setShowDash(false)} />}
      {showSettings && (
        <Settings 
          settings={settings} 
          setSettings={setSettings} 
          theme={theme} 
          setTheme={setTheme}
          cycleTheme={cycleTheme} 
          onClose={() => setShowSettings(false)} 
          setShowDash={setShowDash}
          setShowLeaderboard={setShowLeaderboard}
          setShowChat={setShowChat}
        />
      )}
      {showManualLog && <ManualLogModal onClose={() => setShowManualLog(false)} />}
      {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} />}
      {showChat && <ChatModal onClose={() => setShowChat(false)} />}
    </div>
  );
}
