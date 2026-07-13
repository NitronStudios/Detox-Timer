import { useState, useEffect, useRef } from 'react';
import FlipDisplay from './FlipDisplay';
import { saveSession, getUniqueSubjects } from '../utils/helpers';
import AutocompleteInput from './AutocompleteInput';

export default function StopwatchPage({ onStateChange, isTabActive }) {
  const [subject, setSubject] = useState('');
  const [uniqueSubjects, setUniqueSubjects] = useState([]);

  useEffect(() => {
    setUniqueSubjects(getUniqueSubjects());
  }, []);
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [laps, setLaps] = useState([]);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
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

  // Background Survival: Restore stopwatch on mount
  useEffect(() => {
    const savedStart = localStorage.getItem('detox_stopwatch_start');
    if (savedStart) {
      const elapsedSince = Math.floor((Date.now() - parseInt(savedStart)) / 1000);
      setElapsed(elapsedSince);
      setIsRunning(true);
    }
  }, []);

  // Background Survival: Save theoretical start time when running
  useEffect(() => {
    if (isRunning) {
      localStorage.setItem('detox_stopwatch_start', (Date.now() - elapsed * 1000).toString());
    } else {
      localStorage.removeItem('detox_stopwatch_start');
    }
  }, [isRunning, elapsed]);

  function handleLap() {
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    const label = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    setLaps(l => [...l, { num: l.length + 1, time: label }]);
  }


  useEffect(() => {
    const onToggle = () => {
      if (isTabActive) {
        if (isRunning) handlePause();
        else handleStart();
      }
    };
    window.addEventListener('toggle-timer', onToggle);
    return () => window.removeEventListener('toggle-timer', onToggle);
  }, [isRunning, isTabActive]);

  function handleStart() {
    setIsRunning(true);
  }

  function handlePause() {
    setIsRunning(false);
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
    setShowDiscardConfirm(true);
  }

  function confirmDiscard() {
    setShowDiscardConfirm(false);
    setIsRunning(false);
    setElapsed(0);
    setLaps([]);
    setSubject('');
  }

  if (isActive) {
    return (
      <div className="running-page-wrapper">
        {showDiscardConfirm && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
            <h3 style={{ color: 'var(--text)', marginBottom: '15px' }}>Discard Session?</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '25px', maxWidth: '300px' }}>Are you sure you want to discard this time without saving?</p>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button className="ctrl-btn ctrl-btn-outline" onClick={() => setShowDiscardConfirm(false)}>CANCEL</button>
              <button className="ctrl-btn ctrl-btn-resume" onClick={confirmDiscard} style={{ background: '#EF4444', borderColor: '#EF4444' }}>DISCARD</button>
            </div>
          </div>
        )}
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
              <button className="ctrl-btn ctrl-btn-outline" onClick={handlePause}>⏸ PAUSE</button>
              <button className="ctrl-btn ctrl-btn-outline" onClick={handleLap}>⧗ LAP</button>
            </>
          )}
          {!isRunning && elapsed > 0 && (
            <>
              <button className="ctrl-btn ctrl-btn-resume" onClick={handleStart}>▶ RESUME</button>
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
    <div className="page" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      overflowY: 'auto', 
      overflowX: 'hidden',
      width: '100%'
    }}>
      
      {/* TOP SPACER: Pushes content to center, shrinks gracefully when keyboard opens */}
      <div style={{ flex: 1, minHeight: '10px' }}></div>
      
      {/* CONTENT WRAPPER */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        padding: '20px 0',
        width: '100%', 
        gap: '25px',
        flexShrink: 0
      }}>
        
        <div className="subject-wrap" style={{ margin: 0, width: '85%', maxWidth: '350px' }}>
          <AutocompleteInput
            className="subject-input"
            uniqueSubjects={uniqueSubjects}
            placeholder="What are you working on?"
            value={subject}
            onChange={setSubject}
            maxLength={50}
          />
        </div>

        <FlipDisplay seconds={elapsed} showHours={elapsed >= 3600} />

        <div className="controls">
          <button className="ctrl-btn ctrl-btn-primary" onClick={handleStart}>▶ START</button>
        </div>
      </div>

      {/* BOTTOM SPACER */}
      <div style={{ flex: 1, minHeight: '10px' }}></div>
      
    </div>
  );
}
