import { useState, useEffect, useRef } from 'react';
import FlipDisplay from './FlipDisplay';
import { saveSession } from '../utils/helpers';

export default function StopwatchPage({ onStateChange }) {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [laps, setLaps] = useState([]);
  const [subject, setSubject] = useState('');
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isRunning) {
      let lastTick = Date.now();
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const deltaSeconds = Math.floor((now - lastTick) / 1000);

        if (deltaSeconds > 0) {
          lastTick += deltaSeconds * 1000;
          setElapsed(e => e + deltaSeconds);
        }
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  const isActive = isRunning || elapsed > 0;
  useEffect(() => {
    if (onStateChange) {
      onStateChange(isActive);
    }
  }, [isActive, onStateChange]);

  function handleLap() {
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    const label = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    setLaps(l => [...l, { num: l.length + 1, time: label }]);
  }

  function handleSave() {
    if (elapsed > 0) {
      saveSession(subject.trim() || 'Flow Session', elapsed);
    }
    setIsRunning(false);
    setElapsed(0);
    setLaps([]);
    setSubject('');
  }

  function handleDiscard() {
    if (window.confirm("Are you sure you want to discard this time without saving?")) {
      setIsRunning(false);
      setElapsed(0);
      setLaps([]);
      setSubject('');
    }
  }

  if (isActive) {
    return (
      <div className="running-page-wrapper">
        {/* (1) Subject Name/Stopwatch title at top */}
        <div className="phase-pill study" style={{ fontSize: '0.85rem', padding: '0.4rem 1.2rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
          ● {subject.trim() || 'Flow Session'}
        </div>

        {/* (2) DYNAMIC SPACED CLOCK BLOCK */}
        <div className="dynamic-flip-wrapper">
          <div className="dynamic-flip-clock">
            <FlipDisplay seconds={elapsed} showHours={true} />
          </div>
        </div>

        {/* (3) Controls at bottom */}
        <div className="controls" style={{ marginTop: 'auto', marginBottom: '1.5rem' }}>
          {isRunning && (
            <>
              <button className="ctrl-btn ctrl-btn-outline" onClick={() => setIsRunning(false)}>⏸ PAUSE</button>
              <button className="ctrl-btn ctrl-btn-outline" onClick={handleLap}>⧗ LAP</button>
            </>
          )}
          {!isRunning && elapsed > 0 && (
            <>
              <button className="ctrl-btn ctrl-btn-resume" onClick={() => setIsRunning(true)}>▶ RESUME</button>
              <button className="ctrl-btn ctrl-btn-outline" onClick={handleSave}>⏹ SAVE & STOP</button>
              <button className="icon-btn" style={{ height: 'clamp(45px, 6vh, 55px)', width: 'clamp(45px, 6vh, 55px)' }} onClick={handleDiscard} title="Discard">✕</button>
            </>
          )}
        </div>

        {laps.length > 0 && (
          <div className="laps-container" style={{ maxHeight: '150px', overflowY: 'auto', width: '100%', maxWidth: '300px', marginTop: '1rem' }}>
            {[...laps].reverse().map(l => (
              <div className="lap-entry" key={l.num}>
                <span className="lap-num">Lap {l.num}</span>
                <span>{l.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>

      <div className="subject-wrap" style={{ margin: 0, marginBottom: '2rem' }}>
        <input
          className="subject-input"
          type="text"
          placeholder="What are you working on?"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          maxLength={50}
        />
      </div>

      <FlipDisplay seconds={elapsed} showHours={elapsed >= 3600} />

      <div className="controls">
        <button className="ctrl-btn ctrl-btn-primary" onClick={() => setIsRunning(true)}>▶ START</button>
      </div>
    </div>
  );
}
