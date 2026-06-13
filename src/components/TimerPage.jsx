import { useState, useEffect, useRef } from 'react';
import FlipDisplay from './FlipDisplay';
import PomodoroConfig from './PomodoroConfig';
import { saveSession } from '../utils/helpers';

export default function TimerPage({ settings, onStateChange }) {
  const [mode, setMode] = useState('pomodoro');
  const [studyMin, setStudyMin] = useState(settings.studyMin);
  const [breakMin, setBreakMin] = useState(settings.breakMin);
  const [normalMin, setNormalMin] = useState(settings.normalMin);
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
      setNormalMin(settings.normalMin);
      if (mode === 'pomodoro') {
        setTimeLeft(settings.studyMin * 60);
        setPhase('study');
      } else {
        setTimeLeft(settings.normalMin * 60);
      }
      setElapsed(0);
    }
  }, [settings.studyMin, settings.breakMin, settings.normalMin, mode, isRunning, isPaused]);

  // Sync timeLeft when local steppers change
  useEffect(() => {
    if (!isRunning && !isPaused) {
      if (mode === 'pomodoro') {
        setTimeLeft(studyMin * 60);
        setPhase('study');
      } else {
        setTimeLeft(normalMin * 60);
      }
      setElapsed(0);
    }
  }, [mode, studyMin, normalMin]);

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

  // Tab Title Timer effect
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
    return () => {
      document.title = "DETOX TIMER — Flip Clock Study Timer";
    };
  }, [timeLeft, isRunning, isPaused]);

  // Track active state for Mini Mode
  useEffect(() => {
    if (onStateChange) {
      onStateChange(isRunning || isPaused);
    }
  }, [isRunning, isPaused, onStateChange]);

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
      try {
        playBeep();
      } catch (e) {
        console.error("Audio Context playback failed:", e);
      }
    }
    if (mode === 'pomodoro') {
      if (phase === 'study') {
        setPhase('break');
        setTimeLeft(breakMin * 60);
        setElapsed(0);
      } else {
        setPhase('study');
        setTimeLeft(studyMin * 60);
        setElapsed(0);
      }
    } else {
      handleSave();
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
    if (mode === 'pomodoro') {
      setTimeLeft(studyMin * 60);
    } else {
      setTimeLeft(normalMin * 60);
    }
  }

  function handleStopClick() {
    if (settings.strictMode) {
      if (window.confirm('Strict Mode: Are you sure you want to break your focus?')) {
        handleSave();
      }
    } else {
      handleSave();
    }
  }

  const active = isRunning || isPaused;

  return (
    <div className="page" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>

      {/* Hide Menus Completely When Active */}
      {!active && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'all 0.3s' }}>
          <div className="mode-select">
            <button className={`mode-btn${mode === 'pomodoro' ? ' active' : ''}`} onClick={() => setMode('pomodoro')}>Pomodoro</button>
            <button className={`mode-btn${mode === 'normal' ? ' active' : ''}`} onClick={() => setMode('normal')}>Normal</button>
          </div>

          {mode === 'pomodoro' ? (
            <PomodoroConfig studyMin={studyMin} breakMin={breakMin} onStudy={setStudyMin} onBreak={setBreakMin} disabled={active} />
          ) : (
            <div className="pomo-config">
              <div className="pomo-field">
                <span className="pomo-label">Duration (min)</span>
                <div className="pomo-stepper">
                  <button onClick={() => setNormalMin(m => Math.max(1, m - 5))} disabled={active || normalMin <= 1}>−</button>
                  <span className="pomo-value">{normalMin}</span>
                  <button onClick={() => setNormalMin(m => Math.min(120, m + 5))} disabled={active || normalMin >= 120}>+</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subject and Phase Info (Moves to Top when Active) */}
      <div style={{
        position: active ? 'absolute' : 'relative',
        top: active ? '8%' : 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: active ? 'scale(1.3)' : 'scale(1)',
        zIndex: 10
      }}>
        {mode === 'pomodoro' && active && (
          <div className={`phase-pill${phase === 'study' ? ' study' : ' break-phase'}`} style={{ marginBottom: '10px' }}>
            {phase === 'study' ? '● Study' : '● Break'}
          </div>
        )}
        <div className="subject-wrap" style={{ margin: 0 }}>
          <input
            className={`subject-input${active ? ' locked' : ''}`}
            type="text"
            placeholder="What are you studying?"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            readOnly={active}
            maxLength={50}
          />
        </div>
      </div>

      {/* Clock Wrapper (Scales up 2.8x when Active) */}
      <div style={{
        transform: active ? 'scale(2.8)' : 'scale(1)',
        transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        marginTop: active ? '0' : '20px',
        zIndex: 5
      }}>
        <FlipDisplay seconds={timeLeft} />
      </div>

      {/* Controls (Moved to bottom when running, kept fully visible) */}
      <div className="controls" style={{
        position: active ? 'absolute' : 'relative',
        bottom: active ? '10%' : 'auto',
        marginTop: active ? '0' : '30px',
        transition: 'all 0.5s ease',
        zIndex: 10
      }}>
        {!active && (
          <button className="ctrl-btn ctrl-btn-primary" onClick={handleStart}>▶ START</button>
        )}
        {isRunning && <>
          {!settings.strictMode && (
            <button className="ctrl-btn ctrl-btn-outline" onClick={handlePause}>⏸ PAUSE</button>
          )}
          <button className="ctrl-btn ctrl-btn-outline" onClick={handleStopClick}>⏹ STOP</button>
        </>}
        {isPaused && <>
          <button className="ctrl-btn ctrl-btn-resume" onClick={handleResume}>▶ RESUME</button>
          <button className="ctrl-btn ctrl-btn-outline" onClick={handleStopClick}>⏹ STOP</button>
        </>}
      </div>
    </div>
  );
}
