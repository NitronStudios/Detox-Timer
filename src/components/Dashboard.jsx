import React, { useState, useEffect } from 'react';
import { getSessions, deleteSession, updateSession, getTodayStr, getGlobalSubjectColor, getUniqueSubjects } from '../utils/helpers';
import AutocompleteInput from './AutocompleteInput';

// ================================================================
// BAR CHART (With Dynamic Y-Axis & Grid Lines)
// ================================================================
function BarChart({ dailyGoal }) {
  const sessions = getSessions();
  const DAYS = ['SU', 'M', 'T', 'W', 'TH', 'F', 'S'];
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    const dateStr = local.toISOString().split('T')[0];
    
    const daySessions = sessions.filter(s => s.date === dateStr);
    const totalMinutes = daySessions.reduce((a, s) => a + s.durationMinutes, 0);
    
    const subjectsMap = {};
    daySessions.forEach(s => {
       const sub = (s.subject || 'Focus Session').substring(0, 15);
       subjectsMap[sub] = (subjectsMap[sub] || 0) + s.durationMinutes;
    });
    
    const subjects = Object.keys(subjectsMap).map(sub => ({
       label: sub,
       minutes: subjectsMap[sub],
       color: typeof getGlobalSubjectColor === 'function' ? getGlobalSubjectColor(sub) : '#4CAF50'
    })).sort((a,b) => b.minutes - a.minutes);
    return { label: DAYS[d.getDay()], total: totalMinutes, subjects };
  });

  const highestMins = Math.max(...days.map(d => d.total), 0);
  
  let chartMaxHours = parseInt(dailyGoal) || 4;
  while (highestMins >= (chartMaxHours * 60) - 30) {
    chartMaxHours += 1;
  }
  const chartMaxMins = chartMaxHours * 60;
  const yAxisLabels = [];
  const step = chartMaxHours >= 10 ? 2 : 1; 
  for (let h = chartMaxHours; h >= 0; h -= step) {
    yAxisLabels.push(h);
  }
  if (!yAxisLabels.includes(0)) yAxisLabels.push(0);

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: '160px', paddingTop: '10px' }}>
      
      {/* Y-AXIS LABELS */}
      <div style={{ position: 'relative', width: '30px', height: 'calc(100% - 20px)', marginRight: '8px' }}>
        {yAxisLabels.map((h, i) => {
          const pct = (h * 60) / chartMaxMins;
          return (
            <span key={i} style={{ position: 'absolute', top: `${(1 - pct) * 100}%`, right: 0, transform: 'translateY(-50%)', fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: '"Geist Mono", monospace', fontWeight: '500', whiteSpace: 'nowrap' }}>
              {h}h
            </span>
          );
        })}
      </div>

      {/* BARS & GRID CONTAINER */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flex: 1, gap: '10px', position: 'relative', height: '100%' }}>
        
        {/* Background Grid Lines */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 'calc(100% - 20px)', pointerEvents: 'none', zIndex: 0 }}>
           {yAxisLabels.map((h, i) => {
              const pct = (h * 60) / chartMaxMins;
              return (
                <div key={i} style={{ position: 'absolute', top: `${(1 - pct) * 100}%`, left: 0, width: '100%', borderTop: '1px dashed var(--border)', opacity: 0.4, transform: 'translateY(-50%)' }}></div>
              );
           })}
        </div>

        {/* Average Line (High Z-Index so it appears over bars) */}
        {(() => {
          const total7DaysMins = days.reduce((a, d) => a + d.total, 0);
          const avg7DaysMins = Math.floor(total7DaysMins / 7);
          const pct = avg7DaysMins / chartMaxMins;
          if (pct > 0) {
              return (
                <div style={{ position: 'absolute', top: `${(1 - pct) * 100}%`, left: 0, right: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pointerEvents: 'none', height: 0 }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, borderTop: '2px dashed var(--text)', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}></div>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, borderTop: '2px dashed rgba(255,255,255,0.4)', mixBlendMode: 'difference' }}></div>
                  
                  <span style={{ fontSize: '0.65rem', color: 'var(--bg)', fontWeight: 'bold', background: 'var(--text)', padding: '2px 6px', borderRadius: '4px', transform: 'translateY(-50%)', marginTop: '-1px', boxShadow: '0 2px 8px rgba(0,0,0,0.9)', zIndex: 11 }}>
                    {Math.floor(avg7DaysMins/60)}h {avg7DaysMins%60}m
                  </span>
                </div>
              );
          }
          return null;
        })()}

        {/* Vertical Bars */}
        {days.map((d, i) => {
          const hasSessions = d.total > 0;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%', zIndex: 1 }} title={`Total: ${Math.floor(d.total / 60)}h ${d.total % 60}m`}>
              <div style={{ width: '100%', flex: 1, background: 'var(--card2)', borderRadius: '4px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', marginBottom: '6px', minHeight: '4px' }}>
                {hasSessions ? (
                  d.subjects.map((sub, j) => (
                    <div key={j} style={{ height: `${(sub.minutes / chartMaxMins) * 100}%`, background: sub.color, width: '100%', borderTop: j > 0 ? '1px solid var(--bg)' : 'none', transition: 'height 0.4s ease' }} title={`${sub.label}: ${sub.minutes}m`} />
                  ))
                ) : (
                  <div style={{ height: '4px', background: 'transparent' }} />
                )}
              </div>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: '"Geist Mono", monospace', fontWeight: '500', height: '14px', lineHeight: '14px' }}>{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
// ================================================================
// HEATMAP 
// ================================================================
function Heatmap({ sessions, dailyGoal, isMobile }) {
  const scrollRef = React.useRef(null);
  
  React.useEffect(() => {
    if (isMobile && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isMobile]);

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 174); // scale down to fit beautifully
  while (startDate.getDay() !== 0) {
    startDate.setDate(startDate.getDate() - 1);
  }

  const daysMap = {};
  sessions.forEach(s => {
    daysMap[s.date] = (daysMap[s.date] || 0) + s.durationMinutes;
  });

  const totalDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;
  const grid = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    const dateStr = local.toISOString().split('T')[0];
    
    const mins = daysMap[dateStr] || 0;
    let intensity = 0;
    if (mins > 0) {
      const ratio = mins / (dailyGoal * 60); 
      if (ratio >= 1) intensity = 4;
      else if (ratio >= 0.66) intensity = 3;
      else if (ratio >= 0.33) intensity = 2;
      else intensity = 1;
    }
    grid.push({ date: dateStr, intensity, mins });
  }

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', minHeight: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px', flexShrink: 0 }}>
          {dayLabels.map((lbl, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: '"Geist Mono", monospace', fontWeight: '500' }}>{lbl}</div>
          ))}
        </div>
        <div ref={scrollRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', overflowY: 'auto', flex: 1, paddingRight: '4px', minHeight: 0, scrollBehavior: 'smooth' }}>
          {grid.map((cell, i) => (
            <div 
              key={i} 
              title={`${cell.date}: ${cell.mins} mins`}
              style={{ 
                aspectRatio: '1', 
                background: cell.intensity === 0 ? 'var(--card2)' : `rgba(76, 175, 80, ${cell.intensity * 0.25})`, 
                borderRadius: '2px',
                border: cell.date === getTodayStr() ? '1.5px solid var(--accent)' : 'none'
              }} 
            />
          ))}
        </div>
      </div>
    );
  } else {
    const weeks = [];
    for (let i = 0; i < grid.length; i += 7) {
      weeks.push(grid.slice(i, i + 7));
    }
    return (
      <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '6px', width: '100%', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', justifyContent: 'space-between', paddingRight: '6px' }}>
           {dayLabels.map((lbl, i) => (
             <div key={i} style={{ fontSize: '0.6rem', color: 'var(--text-muted)', height: '11px', lineHeight: '11px', fontFamily: '"Geist Mono", monospace', fontWeight: '500' }}>{lbl}</div>
           ))}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {weeks.map((week, wIdx) => (
            <div key={wIdx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {week.map((cell, i) => (
                <div 
                  key={i} 
                  title={`${cell.date}: ${cell.mins} mins`}
                  style={{ 
                    width: '11px', height: '11px', 
                    background: cell.intensity === 0 ? 'var(--card2)' : `rgba(76, 175, 80, ${cell.intensity * 0.25})`, 
                    borderRadius: '2px',
                    border: cell.date === getTodayStr() ? '1.5px solid var(--accent)' : 'none'
                  }} 
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }
}

// ================================================================
// MAIN DASHBOARD COMPONENT
// ================================================================
export default function Dashboard({ settings, onClose, setShowManualLog }) {
  const [sessions, setSessions] = useState([]);
  
  const checkMobile = () => window.innerWidth < 900;
  const [isMobile, setIsMobile] = useState(checkMobile());
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [editingSession, setEditingSession] = useState(null);
  const [editSubject, setEditSubject] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editDate, setEditDate] = useState('');
  const [uniqueSubjects, setUniqueSubjects] = useState([]);

  useEffect(() => {
    setSessions(getSessions());
    setUniqueSubjects(getUniqueSubjects());
    const handleResize = () => {
      setIsMobile(checkMobile());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDelete = (id) => {
    setSessionToDelete(id);
  };

  const confirmDelete = () => {
    if (sessionToDelete) {
      deleteSession(sessionToDelete);
      setSessions(getSessions());
      setSessionToDelete(null);
    }
  };

  const handleEdit = (s) => {
    setEditingSession(s.id);
    setEditSubject(s.subject || '');
    setEditDuration(s.durationMinutes || '');
    setEditDate(s.date || '');
  };

  const saveEdit = () => {
    if (editingSession) {
      updateSession(editingSession, {
        subject: editSubject,
        durationMinutes: parseInt(editDuration) || 1,
        date: editDate
      });
      setSessions(getSessions());
      setEditingSession(null);
    }
  };

  const todayStr = getTodayStr();
  const todayMins = sessions.filter(s => s.date === todayStr).reduce((a, s) => a + s.durationMinutes, 0);
  const totalMins = sessions.reduce((a, s) => a + s.durationMinutes, 0);
  const totalH = Math.floor(totalMins / 60);

  const totalM = totalMins % 60;

  // Calculate Last 7 Days Average
  const last7Days = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    last7Days.push(local.toISOString().split('T')[0]);
  }
  const last7DaysMins = sessions.filter(s => last7Days.includes(s.date)).reduce((a, s) => a + s.durationMinutes, 0);
  const last7DaysAvg = Math.floor(last7DaysMins / 7);

  // Calculate Current Month Average
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const currentMonthDays = today.getDate(); // 1 to 31
  const currentMonthMins = sessions.filter(s => {
    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    return s.date.startsWith(prefix);
  }).reduce((a, s) => a + s.durationMinutes, 0);
  const currentMonthAvg = Math.floor(currentMonthMins / currentMonthDays);

  const formatMins = (m) => {
    return { h: Math.floor(m / 60), m: m % 60 };
  };
  const avg7 = formatMins(last7DaysAvg);
  const avgMonth = formatMins(currentMonthAvg);


  const uniqueDays = [...new Set(sessions.map(s => s.date))].sort().reverse();
  let currentStreak = 0;
  let checkDate = new Date();
  for (let i = 0; i < 365; i++) {
    const offset = checkDate.getTimezoneOffset();
    const local = new Date(checkDate.getTime() - offset * 60000);
    const ds = local.toISOString().split('T')[0];
    if (uniqueDays.includes(ds)) currentStreak++;
    else if (i !== 0) break;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--bg)', zIndex: 1500, display: 'flex', flexDirection: 'column', paddingTop: 'var(--safe-top, 0px)' }}>
      {sessionToDelete && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
          <h3 style={{ color: 'var(--text)', marginBottom: '15px' }}>Delete Session?</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '25px', maxWidth: '300px' }}>This action cannot be undone.</p>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button className="ctrl-btn ctrl-btn-outline" onClick={() => setSessionToDelete(null)}>CANCEL</button>
            <button className="ctrl-btn ctrl-btn-resume" onClick={confirmDelete} style={{ background: '#EF4444', borderColor: '#EF4444' }}>DELETE</button>
          </div>
        </div>
      )}
      <div className="dash-overlay">
        
        {/* HEADER */}
        <div className="dash-header">
          <div>
            <span className="dash-label" style={{ marginBottom: 0 }}>Performance Overview</span>
            <h2>DASHBOARD</h2>
          </div>
          <button onClick={onClose} className="close-btn" style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '2.5rem', cursor: 'pointer', lineHeight: 0.8 }}>×</button>
        </div>

        {/* CONTENT SHELL */}
        <div className="dash-content">
          {isMobile ? (
            /* MOBILE 3-PART SCROLL SNAP LAYOUT */
            <div 
              className="dash-scrollable-mobile" 
              style={{
                overflowY: 'auto',
                height: '100%',
                scrollSnapType: 'y mandatory',
                scrollBehavior: 'smooth',
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              {/* PART 1: Today's Focus, Current Streak, All Time Total */}
              <div 
                className="dash-scroll-section-mobile" 
                style={{
                  scrollSnapAlign: 'start',
                  height: '100%',
                  minHeight: '100%',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  justifyContent: 'center',
                  padding: '1rem 0',
                  boxSizing: 'border-box',
                  flexShrink: 0
                }}
              >
                {/* Main Hero Card */}
                <div 
                  className="dash-card" 
                  style={{ 
                    flex: '1 1 auto', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between',
                    background: 'var(--accent, #4CAF50)',
                    color: '#121212',
                    border: 'none',
                    padding: '1.5rem',
                    borderRadius: '16px'
                  }}
                >
                  <span style={{ fontFamily: '"Syne", sans-serif', fontSize: '0.9rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.85 }}>TODAY'S FOCUS</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', margin: '1rem 0' }}>
                    <span style={{ fontSize: '5.5rem', fontWeight: '900', lineHeight: '0.95', fontFamily: '"Syne", sans-serif', letterSpacing: '-0.04em' }}>
                      {todayMins}
                    </span>
                    <span style={{ fontSize: '1.8rem', fontWeight: '700', fontFamily: '"Syne", sans-serif' }}>
                      mins
                    </span>
                  </div>
                  <div style={{ marginTop: 'auto', fontSize: '1rem', fontWeight: '700', opacity: 0.9 }}>
                    Goal: {settings.dailyGoal} hours
                  </div>
                </div>

                {/* DEEP STATS Wrapper */}
                <div 
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    background: 'var(--card2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    flex: '0 0 auto'
                  }}
                >
                  <span style={{ fontFamily: '"Geist Mono", monospace', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>
                    DEEP STATS
                  </span>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {/* Current Streak */}
                    <div className="dash-card" style={{ minHeight: '110px', background: 'var(--card)', padding: '1rem', justifyContent: 'center', border: '1px solid var(--border)', borderRadius: '12px' }}>
                      <span className="dash-label" style={{ fontSize: '0.6rem', marginBottom: '1rem' }}>CURRENT STREAK</span>
                      <div className="dash-stat-val" style={{ fontSize: '2rem', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        <span style={{ color: 'var(--accent)', fontWeight: '800' }}>{currentStreak}</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>days</span>
                      </div>
                    </div>

                    {/* All Time Total */}
                    <div className="dash-card" style={{ minHeight: '110px', background: 'var(--card)', padding: '1rem', justifyContent: 'center', border: '1px solid var(--border)', borderRadius: '12px' }}>
                      <span className="dash-label" style={{ fontSize: '0.6rem', marginBottom: '1rem' }}>ALL TIME</span>
                      <div className="dash-stat-val" style={{ fontSize: '2rem', display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                        <span style={{ fontWeight: '800' }}>{totalH}</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginRight: '4px' }}>h</span>
                        <span style={{ fontWeight: '800' }}>{totalM}</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>m</span>
                      </div>
                    </div>

                    {/* Last 7 Days Average */}
                    <div className="dash-card" style={{ minHeight: '110px', background: 'var(--card)', padding: '1rem', justifyContent: 'center', border: '1px solid var(--border)', borderRadius: '12px' }}>
                      <span className="dash-label" style={{ fontSize: "0.6rem", marginBottom: "1rem" }} title="Average per day over the last 7 days">7 DAY DAILY AVG</span>
                      <div className="dash-stat-val" style={{ fontSize: '2rem', display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                        <span style={{ fontWeight: '800' }}>{avg7.h}</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginRight: '4px' }}>h</span>
                        <span style={{ fontWeight: '800' }}>{avg7.m}</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>m</span>
                      </div>
                    </div>

                    {/* This Month Average */}
                    <div className="dash-card" style={{ minHeight: '110px', background: 'var(--card)', padding: '1rem', justifyContent: 'center', border: '1px solid var(--border)', borderRadius: '12px' }}>
                      <span className="dash-label" style={{ fontSize: "0.6rem", marginBottom: "1rem" }} title="Average per day for the current month">MONTH DAILY AVG</span>
                      <div className="dash-stat-val" style={{ fontSize: '2rem', display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                        <span style={{ fontWeight: '800' }}>{avgMonth.h}</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginRight: '4px' }}>h</span>
                        <span style={{ fontWeight: '800' }}>{avgMonth.m}</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>m</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Add Manual Log button inside section 1 */}
                <button 
                  onClick={() => { onClose(); setShowManualLog(true); }}
                  style={{ 
                    width: '100%', 
                    padding: '0.9rem', 
                    background: 'var(--card)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '12px', 
                    color: 'var(--text)', 
                    fontSize: '0.95rem', 
                    fontWeight: '700', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '10px',
                    transition: 'var(--transition)',
                    flexShrink: 0
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  Add Manual Log
                </button>
                <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: '"Geist Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.25rem', flexShrink: 0 }}>
                  ↓ Swipe for Charts ↓
                </div>
              </div>

              {/* PART 2: Activity Graph, Recent Sessions */}
              <div 
                className="dash-scroll-section-mobile" 
                style={{
                  scrollSnapAlign: 'start',
                  height: '100%',
                  minHeight: '100%',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  padding: '1rem 0',
                  boxSizing: 'border-box',
                  flexShrink: 0
                }}
              >
                {/* Activity Chart */}
                <div className="dash-card" style={{ flex: '0 0 auto', minHeight: '150px', padding: '1rem' }}>
                  <span className="dash-label">Activity — Past 7 Days</span>
                  <BarChart dailyGoal={settings.dailyGoal} />
                </div>

                {/* Recent Sessions */}
                <div className="dash-sessions-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem', background: 'var(--card)', marginTop: 0, borderLeft: '1px solid var(--border)', overflow: 'hidden', minHeight: 0 }}>
                  <span className="dash-label" style={{ marginBottom: '1rem', flexShrink: 0 }}>Recent Sessions</span>
                  
                  <div className="dash-sessions-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                    {sessions.length === 0 ? (
                      <div className="empty-msg" style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: '4rem', fontSize: '0.8rem', fontStyle: 'italic' }}>
                        No sessions recorded yet.
                      </div>
                    ) : (
                      [...sessions].reverse().slice(0, 20).map(s => {
                        const dObj = new Date(s.date);
                        const dateStr = dObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                        const subColor = typeof getGlobalSubjectColor === 'function' ? getGlobalSubjectColor(s.subject) : 'var(--text)';
                        return (
                          <div className="dash-session-row" key={s.id} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                            {editingSession === s.id ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 0' }}>
                                <AutocompleteInput 
                                  value={editSubject} 
                                  onChange={setEditSubject} 
                                  uniqueSubjects={uniqueSubjects} 
                                  style={{ padding: '0', background: 'transparent', borderRadius: '4px' }} 
                                  className="subject-input-small" 
                                  placeholder="Subject" 
                                />
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <input type="number" value={editDuration} onChange={e => setEditDuration(e.target.value)} style={{ padding: '8px', fontSize: '0.9rem', background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', width: '80px', outline: 'none' }} placeholder="Min" />
                                  <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={{ padding: '8px', fontSize: '0.9rem', background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', flex: 1, outline: 'none' }} />
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                  <button onClick={saveEdit} style={{ flex: 1, padding: '8px', background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: '4px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 'bold' }}>Save Changes</button>
                                  <button onClick={() => setEditingSession(null)} style={{ flex: 1, padding: '8px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.85rem', cursor: 'pointer' }}>Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => handleEdit(s)} title="Click to Edit">
                                  <div className="dash-session-subject" style={{ color: subColor }}>{s.subject || 'Study'}</div>
                                  <div className="dash-session-meta">{s.durationMinutes} min • {dateStr}</div>
                                </div>
                                <button className="btn-del" onClick={() => handleDelete(s.id)} title="Delete" style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '1rem', padding: '4px', marginLeft: '10px' }}>✕</button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* PART 3: Consistency Heatmap & Footer Info */}
              <div 
                className="dash-scroll-section-mobile" 
                style={{
                  scrollSnapAlign: 'start',
                  height: '100%',
                  minHeight: '100%',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  justifyContent: 'center',
                  padding: '1rem 0',
                  boxSizing: 'border-box',
                  flexShrink: 0
                }}
              >
                {/* Heatmap Card */}
                <div className="dash-card dash-heatmap-section" style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', margin: 0, minHeight: 0 }}>
                  <span className="dash-label" style={{ flexShrink: 0 }}>Consistency ({new Date().getFullYear()})</span>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: '10px', minHeight: 0 }}>
                    <Heatmap sessions={sessions} dailyGoal={settings.dailyGoal} isMobile={isMobile} />
                  </div>
                </div>

                <div className="dash-footer-meta" style={{ padding: '0.5rem 0 1.5rem 0', textAlign: 'center' }}>
                  Scroll for full year consistency — detox-v1.0.4
                </div>
              </div>
            </div>
          ) : (
            /* DESKTOP LAYOUT */
            <>
              {/* LEFT BENTO GRID */}
              <div className="dash-scrollable">
                {/* FIRST SECTION: Today's Focus, Streak, All Time, and Activity */}
                <div className="dash-scroll-section">
                  {/* Main Hero Card */}
                  <div className="dash-card dash-card-hero">
                    <span className="dash-label">Today's Focus</span>
                    <div className="dash-hero-value">
                      {todayMins}<span>mins</span>
                    </div>
                    <div style={{ marginTop: 'auto', fontSize: '0.8rem', fontWeight: '500', opacity: 0.8, fontFamily: '"Geist Mono", monospace' }}>
                      Goal: {settings.dailyGoal} hours
                    </div>
                  </div>

                  {/* Current Streak */}
                  <div className="dash-card">
                    <span className="dash-label">Current Streak</span>
                    <div className="dash-stat-val" style={{ color: 'var(--accent)' }}>
                      {currentStreak} <span>days</span>
                    </div>
                  </div>

                  {/* All Time Total */}
                  <div className="dash-card">
                    <span className="dash-label">All Time Total</span>
                    <div className="dash-stat-val">
                      {totalH}<span>h</span> {totalM}<span>m</span>
                    </div>
                  </div>

                  {/* Last 7 Days Average */}
                  <div className="dash-card">
                    <span className="dash-label" title="Average per day over the last 7 days">7 Day Daily Average</span>
                    <div className="dash-stat-val">
                      {avg7.h}<span>h</span> {avg7.m}<span>m</span>
                    </div>
                  </div>

                  {/* Month Average */}
                  <div className="dash-card">
                    <span className="dash-label" title="Average per day for the current month">Month Daily Average</span>
                    <div className="dash-stat-val">
                      {avgMonth.h}<span>h</span> {avgMonth.m}<span>m</span>
                    </div>
                  </div>

                </div>

                {/* SECOND SECTION: Consistency Heatmap & Footer Info */}
                <div className="dash-scroll-section" style={{  display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'space-between' }}>
                  {/* Activity Chart */}
                  <div className="dash-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '230px' }}>
                    <span className="dash-label">Activity — Past 7 Days</span>
                    <BarChart dailyGoal={settings.dailyGoal} />
                  </div>

                  {/* Heatmap Card */}
                  <div className="dash-card dash-heatmap-section" style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column' }}>
                    <span className="dash-label">Consistency ({new Date().getFullYear()})</span>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: '10px' }}>
                      <Heatmap sessions={sessions} dailyGoal={settings.dailyGoal} isMobile={isMobile} />
                    </div>
                  </div>

                  <div className="dash-footer-meta" style={{ padding: '0.5rem 0 1.5rem 0' }}>
                    Scroll for full year consistency — detox-v1.0.4
                  </div>
                </div>
              </div>

              {/* RIGHT SESSIONS SIDE PANEL */}
              <div className="dash-sessions-panel">
                <span className="dash-label">Recent Sessions</span>
                
                <button 
                  onClick={() => { onClose(); setShowManualLog(true); }}
                  style={{ 
                    marginTop: '0.75rem',
                    width: '100%', 
                    padding: '0.75rem', 
                    background: 'var(--card)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '8px', 
                    color: 'var(--text)', 
                    fontSize: '0.8rem', 
                    fontWeight: '600', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px',
                    fontFamily: '"Geist Mono", monospace',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    transition: 'var(--transition)'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  Add Manual Log
                </button>

                <div className="dash-sessions-scroll">
                  {sessions.length === 0 ? (
                    <div className="empty-msg" style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: '4rem', fontSize: '0.8rem', fontStyle: 'italic' }}>
                      No sessions recorded yet.
                    </div>
                  ) : (
                    [...sessions].reverse().slice(0, 20).map(s => {
                      const dObj = new Date(s.date);
                      const dateStr = dObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                      const subColor = typeof getGlobalSubjectColor === 'function' ? getGlobalSubjectColor(s.subject) : 'var(--text)';
                      return (
                        <div className="dash-session-row" key={s.id} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                          {editingSession === s.id ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 0' }}>
                              <AutocompleteInput 
                                value={editSubject} 
                                onChange={setEditSubject} 
                                uniqueSubjects={uniqueSubjects} 
                                style={{ padding: '0', background: 'transparent', borderRadius: '4px' }} 
                                className="subject-input-small" 
                                placeholder="Subject" 
                              />
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <input type="number" value={editDuration} onChange={e => setEditDuration(e.target.value)} style={{ padding: '8px', fontSize: '0.9rem', background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', width: '80px', outline: 'none' }} placeholder="Min" />
                                <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={{ padding: '8px', fontSize: '0.9rem', background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', flex: 1, outline: 'none' }} />
                              </div>
                              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                <button onClick={saveEdit} style={{ flex: 1, padding: '8px', background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: '4px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 'bold' }}>Save Changes</button>
                                <button onClick={() => setEditingSession(null)} style={{ flex: 1, padding: '8px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.85rem', cursor: 'pointer' }}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                              <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => handleEdit(s)} title="Click to Edit">
                                <div className="dash-session-subject" style={{ color: subColor }}>{s.subject || 'Study'}</div>
                                <div className="dash-session-meta">{s.durationMinutes} min • {dateStr}</div>
                              </div>
                              <button className="btn-del" onClick={() => handleDelete(s.id)} title="Delete" style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '1rem', padding: '4px', marginLeft: '10px' }}>✕</button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
