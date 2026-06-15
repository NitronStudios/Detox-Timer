import { useState, useEffect, useRef } from 'react';
import FlipDisplay from './FlipDisplay';
import PomodoroConfig from './PomodoroConfig';
import { saveSession } from '../utils/helpers';

export default function TimerPage({ settings, onStateChange }) {
  const [studyMin, setStudyMin] = useState(settings.studyMin);
  const [breakMin, setBreakMin] = useState(settings.breakMin);
  const [phase, setPhase] = useState('study');
  const [timeLeft, setTimeLeft] = useState(settings.studyMin * 60);
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [subject, setSubject] = useState('');
  const intervalRef = useRef(null);

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
    return () => clearInterval(intervalRef.current);
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
      if (window.confirm('Strict Mode: Are you sure you want to break your focus?')) handleSave();
    } else {
      handleSave();
    }
  }

  const active = isRunning || isPaused;

  if (active) {
    return (
      <div className="running-page-wrapper">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div className={`phase-pill${phase === 'study' ? ' study' : ' break-phase'}`}>
            {phase === 'study' ? '● Study' : '● Break'}
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
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
    <div className="page" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      {!active && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'all 0.3s', marginBottom: '1.5rem' }}>
          <PomodoroConfig studyMin={studyMin} breakMin={breakMin} onStudy={setStudyMin} onBreak={setBreakMin} disabled={active} />
        </div>
      )}

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
        <div className="subject-wrap" style={{ margin: 0 }}>
          <input className="subject-input" type="text" placeholder="What are you studying?" value={subject} onChange={e => setSubject(e.target.value)} maxLength={50} />
        </div>
      </div>

      <div style={{ marginTop: '20px', zIndex: 5 }}>
        <FlipDisplay seconds={timeLeft} />
      </div>

      <div className="controls" style={{ marginTop: '30px', zIndex: 10 }}>
        <button className="ctrl-btn ctrl-btn-primary" onClick={handleStart}>▶ START</button>
      </div>
    </div>
  );
}
