import { useState, useEffect, useRef } from 'react';
import FlipDisplay from './FlipDisplay';
import PomodoroConfig from './PomodoroConfig';
import { saveSession, getUniqueSubjects } from '../utils/helpers';
import AutocompleteInput from './AutocompleteInput';

export default function TimerPage({ settings, onStateChange, isTabActive }) {
  const [studyMin, setStudyMin] = useState(settings.studyMin);
  const [breakMin, setBreakMin] = useState(settings.breakMin);
  const [phase, setPhase] = useState('study');
  const [timeLeft, setTimeLeft] = useState(settings.studyMin * 60);
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showStrictConfirm, setShowStrictConfirm] = useState(false);
  const [subject, setSubject] = useState('');
  const [uniqueSubjects, setUniqueSubjects] = useState([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    setUniqueSubjects(getUniqueSubjects());
  }, []);

  // Sync settings when defaults change
  useEffect(() => {
    if (!isRunning && !isPaused) {
      setStudyMin(settings.studyMin);
      setBreakMin(settings.breakMin);
      setTimeLeft(settings.studyMin * 60);
      setPhase('study');
      setElapsed(0);
    }
  }, [settings.studyMin, settings.breakMin, isRunning, isPaused]);

  // Sync timeLeft when local steppers change
  useEffect(() => {
    if (!isRunning && !isPaused) {
      setTimeLeft(studyMin * 60);
      setPhase('study');
      setElapsed(0);
    }
  }, [studyMin, isRunning, isPaused]);

  useEffect(() => {
    if (isRunning) {
      let lastTick = Date.now();
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const deltaSeconds = Math.floor((now - lastTick) / 1000);

        if (deltaSeconds > 0) {
          lastTick += deltaSeconds * 1000;
          setElapsed(e => e + deltaSeconds);
          setTimeLeft(t => {
            if (t - deltaSeconds <= 0) {
              clearInterval(intervalRef.current);
              setTimeout(handlePhaseEnd, 0);
              return 0;
            }
            return t - deltaSeconds;
          });
        }
      }, 1000);
    }
  
  }, [isRunning]);

  useEffect(() => {
    if (isRunning || isPaused) {
      const m = Math.floor(timeLeft / 60);
      const s = timeLeft % 60;
      const mStr = String(m).padStart(2, '0');
      const sStr = String(s).padStart(2, '0');
      document.title = `(${mStr}:${sStr}) DETOX TIMER`;
    } else {
      document.title = "DETOX TIMER — Flip Clock Study Timer";
    }
    return () => document.title = "DETOX TIMER — Flip Clock Study Timer";
  }, [timeLeft, isRunning, isPaused]);

  useEffect(() => {
    if (onStateChange) onStateChange(isRunning || isPaused);
  }, [isRunning, isPaused, onStateChange]);

  // Background Survival: Restore timer on mount
  useEffect(() => {
    const savedTarget = localStorage.getItem('detox_timer_target');
    if (savedTarget) {
      const remaining = Math.floor((parseInt(savedTarget) - Date.now()) / 1000);
      if (remaining > 0) {
        setTimeLeft(remaining);
        setIsRunning(true);
      } else {
        localStorage.removeItem('detox_timer_target');
      }
    }
  }, []);

  // Background Survival: Save target time when running
  useEffect(() => {
    if (isRunning) {
      localStorage.setItem('detox_timer_target', (Date.now() + timeLeft * 1000).toString());
    } else {
      localStorage.removeItem('detox_timer_target');
    }
  }, [isRunning, timeLeft]);


  useEffect(() => {
    const onToggle = () => {
      // Only toggle if this tab is active (TimerPage doesn't know tab, but we can assume if it's rendered, wait, TimerPage is always rendered but might be hidden!
      // If we only want the active one, we should pass tab === 'Pomodoro' as a prop, or just check its offsetParent.
      if (isTabActive) {
        if (isRunning) handlePause();
        else if (isPaused) handleResume();
        else handleStart();
      }
    };
    window.addEventListener('toggle-timer', onToggle);
    return () => window.removeEventListener('toggle-timer', onToggle);
  }, [isRunning, isPaused, isTabActive]);

  const playBeep = () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.connect(ctx.destination);
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  };

  function handlePhaseEnd() {
    setIsRunning(false);
    if (settings.audioEnabled) {
      try { playBeep(); } catch (e) { console.error("Audio Context playback failed:", e); }
    }
    if (phase === 'study') {
      setPhase('break');
      setTimeLeft(breakMin * 60);
      setElapsed(0);
    } else {
      setPhase('study');
      setTimeLeft(studyMin * 60);
      setElapsed(0);
    }
  }

  function handleStart() {
    setIsRunning(true);
    setIsPaused(false);
  }
  function handlePause() {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setIsPaused(true);
  }
  function handleResume() {
    setIsRunning(true);
    setIsPaused(false);
  }

  function handleSave() {
    clearInterval(intervalRef.current);
    saveSession(subject.trim() || 'Focus Session', elapsed);
    setIsRunning(false);
    setIsPaused(false);
    setSubject('');
    setPhase('study');
    setElapsed(0);
    setTimeLeft(studyMin * 60);
  }

  function handleStopClick() {
    if (settings.strictMode) {
      setShowStrictConfirm(true);
    } else {
      handleSave();
    }
  }

  const active = isRunning || isPaused;

  if (active) {
    return (
      <div className="running-page-wrapper">
        {showStrictConfirm && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
            <h3 style={{ color: 'var(--text)', marginBottom: '15px' }}>Strict Mode Active</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '25px', maxWidth: '300px' }}>Are you sure you want to break your focus?</p>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button className="ctrl-btn ctrl-btn-outline" onClick={() => setShowStrictConfirm(false)}>CANCEL</button>
              <button className="ctrl-btn ctrl-btn-resume" onClick={() => { setShowStrictConfirm(false); handleSave(); }}>STOP SESSION</button>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div className={`phase-pill${phase === 'study' ? ' study' : ' break-phase'}`}>
            {phase === 'study' ? '● Study' : '● Break'}
          </div>
          <div className="session-title" style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
            {subject.trim() || 'Study'} Session
          </div>
        </div>

        <div className="dynamic-flip-wrapper">
          <div className="dynamic-flip-clock">
            <FlipDisplay seconds={timeLeft} showHours={true} />
          </div>
        </div>

        <div className="controls" style={{ marginTop: 'auto', marginBottom: '1.5rem' }}>
          {isRunning && (
            <>
              {!settings.strictMode && <button className="ctrl-btn ctrl-btn-outline" onClick={handlePause}>⏸ PAUSE</button>}
              <button className="ctrl-btn ctrl-btn-outline" onClick={handleStopClick}>⏹ STOP</button>
            </>
          )}
          {isPaused && (
            <>
              <button className="ctrl-btn ctrl-btn-resume" onClick={handleResume}>▶ RESUME</button>
              <button className="ctrl-btn ctrl-btn-outline" onClick={handleStopClick}>⏹ STOP</button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflowY: 'auto',
      overflowX: 'hidden',
      width: '100%'
    }}>

      {/* TOP SPACER: Pushes content to center, gracefully shrinks to 0 when keyboard opens */}
      <div style={{ flex: 1, minHeight: '10px' }}></div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px 0',
        width: '100%',
        gap: '25px',
        flexShrink: 0 /* Prevents the actual content from squishing */
      }}>

        {!active && (
          <PomodoroConfig studyMin={studyMin} breakMin={breakMin} onStudy={setStudyMin} onBreak={setBreakMin} disabled={active} />
        )}

        <div className="subject-wrap" style={{ margin: 0, width: '85%', maxWidth: '350px' }}>
          <AutocompleteInput
            className="subject-input"
            uniqueSubjects={uniqueSubjects}
            placeholder="What are you studying?"
            value={subject}
            onChange={setSubject}
            maxLength={50}
          />
        </div>

        <FlipDisplay seconds={timeLeft} />

        <div className="controls">
          <button className="ctrl-btn ctrl-btn-primary" onClick={handleStart}>▶ START</button>
        </div>
      </div>

      {/* BOTTOM SPACER: Pushes content up to center, gracefully shrinks to 0 when keyboard opens */}
      <div style={{ flex: 1, minHeight: '10px' }}></div>

    </div>
  );
}
