import React, { useState, useEffect } from 'react';
import { getSessions, deleteSession, getTodayStr, getGlobalSubjectColor } from '../utils/helpers';

// ================================================================
// BAR CHART (With Dynamic Y-Axis & Grid Lines)
// ================================================================
function BarChart({ dailyGoal }) {
  const sessions = getSessions();
  const DAYS = ['Su', 'M', 'T', 'W', 'Th', 'F', 'S'];
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
    <div style={{ display: 'flex', flex: 1, minHeight: '150px', paddingTop: '15px' }}>
      
      {/* Y-AXIS LABELS */}
      <div style={{ position: 'relative', width: '35px', height: 'calc(100% - 22px)', marginRight: '5px' }}>
        {yAxisLabels.map((h, i) => {
          const pct = (h * 60) / chartMaxMins;
          return (
            <span key={i} style={{ position: 'absolute', top: `${(1 - pct) * 100}%`, right: 0, transform: 'translateY(-50%)', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
              {h}h
            </span>
          );
        })}
      </div>

      {/* BARS & GRID CONTAINER */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flex: 1, gap: '8px', position: 'relative' }}>
        
        {/* Background Grid Lines */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 'calc(100% - 22px)', pointerEvents: 'none', zIndex: 0 }}>
           {yAxisLabels.map((h, i) => {
              const pct = (h * 60) / chartMaxMins;
              return (
                <div key={i} style={{ position: 'absolute', top: `${(1 - pct) * 100}%`, left: 0, width: '100%', borderTop: '1px dashed var(--border)', opacity: 0.5, transform: 'translateY(-50%)' }}></div>
              );
           })}
        </div>

        {/* Vertical Bars */}
        {days.map((d, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%', zIndex: 1 }} title={`Total: ${Math.floor(d.total / 60)}h ${d.total % 60}m`}>
            <div style={{ width: '100%', flex: 1, background: 'var(--bg)', borderRadius: '6px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', marginBottom: '8px' }}>
              {d.subjects.map((sub, j) => (
                <div key={j} style={{ height: `${(sub.minutes / chartMaxMins) * 100}%`, background: sub.color, width: '100%', borderTop: j > 0 ? '1px solid var(--bg)' : 'none', transition: 'height 0.4s ease' }} title={`${sub.label}: ${sub.minutes}m`} />
              ))}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', height: '14px', lineHeight: '14px' }}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


// ================================================================
// HEATMAP 
// ================================================================
function Heatmap({ sessions, dailyGoal, isMobile }) {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 364);
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
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflowY: 'auto', paddingRight: '5px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
          {dayLabels.map((lbl, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>{lbl}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', paddingBottom: '20px' }}>
          {grid.map((cell, i) => (
            <div 
              key={i} 
              title={`${cell.date}: ${cell.mins} mins`}
              style={{ 
                aspectRatio: '1', 
                background: cell.intensity === 0 ? 'var(--card2)' : `rgba(76, 175, 80, ${cell.intensity * 0.25})`, 
                borderRadius: '4px',
                border: cell.date === getTodayStr() ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.05)'
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
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '10px', height: '100%', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'space-between', paddingRight: '8px' }}>
           {dayLabels.map((lbl, i) => (
             <div key={i} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', height: '14px', lineHeight: '14px', fontWeight: 'bold' }}>{lbl}</div>
           ))}
        </div>
        {weeks.map((week, wIdx) => (
          <div key={wIdx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {week.map((cell, i) => (
              <div 
                key={i} 
                title={`${cell.date}: ${cell.mins} mins`}
                style={{ 
                  width: '14px', height: '14px', 
                  background: cell.intensity === 0 ? 'var(--card2)' : `rgba(76, 175, 80, ${cell.intensity * 0.25})`, 
                  borderRadius: '3px',
                  border: cell.date === getTodayStr() ? '2px solid var(--accent)' : 'none'
                }} 
              />
            ))}
          </div>
        ))}
      </div>
    );
  }
}

// ================================================================
// MAIN DASHBOARD COMPONENT
// ================================================================
export default function Dashboard({ settings, onClose, setShowManualLog }) {
  const [sessions, setSessions] = useState([]);
  
  // Smart detection: Triggers mobile layout if screen is narrow OR if height is short (landscape phone)
  const checkMobile = () => window.innerWidth < 850 || window.innerHeight < 600;
  const checkLandscape = () => window.innerHeight < 500 && window.innerWidth > window.innerHeight;
  
  const [isMobile, setIsMobile] = useState(checkMobile());
  const [isLandscape, setIsLandscape] = useState(checkLandscape());

  useEffect(() => {
    setSessions(getSessions());
    const handleResize = () => {
      setIsMobile(checkMobile());
      setIsLandscape(checkLandscape());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDelete = (id) => {
    if(window.confirm("Delete this session?")) {
      deleteSession(id);
      setSessions(getSessions());
    }
  };

  const todayStr = getTodayStr();
  const todayMins = sessions.filter(s => s.date === todayStr).reduce((a, s) => a + s.durationMinutes, 0);
  const totalMins = sessions.reduce((a, s) => a + s.durationMinutes, 0);
  const totalH = Math.floor(totalMins / 60);
  const totalM = totalMins % 60;

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

  // --- REUSABLE CARDS ---
  const TodaysFocusCard = () => (
    <div className={`bento-card ${!isMobile ? 'col-span-2' : ''}`} style={{ background: 'var(--accent)', color: '#000', border: 'none', flex: isMobile ? 1 : 'none', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ fontSize: isMobile && !isLandscape ? '1rem' : '0.9rem', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: isMobile && !isLandscape ? '1rem' : '0.5rem', opacity: 0.8 }}>Today's Focus</div>
      <div style={{ fontSize: isMobile && !isLandscape ? '4.5rem' : '3rem', fontWeight: '800', lineHeight: 1, marginTop: 'auto' }}>{todayMins} <span style={{ fontSize: isMobile && !isLandscape ? '1.5rem' : '1.2rem' }}>mins</span></div>
      <div style={{ marginTop: 'auto', fontSize: isMobile && !isLandscape ? '1.1rem' : '0.9rem', fontWeight: '600' }}>Goal: {settings.dailyGoal} hours</div>
    </div>
  );

  const StatsCard = () => (
    <div className="bento-card" style={{ flex: isMobile ? 1 : 'none', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div className="chart-title" style={{ marginBottom: isMobile && !isLandscape ? '1.5rem' : '1rem', fontSize: isMobile && !isLandscape ? '0.85rem' : '0.75rem' }}>Deep Stats</div>
      <div className="stat-group" style={{ flex: 1, display: 'flex', gap: '1rem' }}>
        <div className="stat-item" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: isMobile && !isLandscape ? '0.9rem' : '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Current Streak</div>
          <div className="stat-val" style={{ color: 'var(--accent)', fontSize: isMobile && !isLandscape ? '2.2rem' : '1.6rem' }}>{currentStreak} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>days</span></div>
        </div>
        <div className="stat-item" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: isMobile && !isLandscape ? '0.9rem' : '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>All Time</div>
          <div className="stat-val" style={{ fontSize: isMobile && !isLandscape ? '2.2rem' : '1.6rem' }}>{totalH}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>h</span> {totalM}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>m</span></div>
        </div>
      </div>
    </div>
  );

  const BarChartCard = () => (
    <div className={`bento-card ${!isMobile ? 'col-span-2' : ''}`} style={{ display: 'flex', flexDirection: 'column', flex: isMobile ? 1 : 'none', minHeight: 0 }}>
      <div className="chart-title">Activity — Past 7 Days</div>
      <BarChart dailyGoal={settings.dailyGoal} />
    </div>
  );

  const RecentCard = () => (
    <div className="bento-card" style={{ display: 'flex', flexDirection: 'column', flex: isMobile ? 1 : 'none', minHeight: 0, overflow: 'hidden' }}>
      <div className="chart-title">Recent Sessions</div>
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
        {sessions.length === 0 ? (
           <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>No sessions yet.</div>
        ) : (
           [...sessions].reverse().slice(0, 15).map(s => {
              const dObj = new Date(s.date);
              const dateStr = dObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              const subColor = typeof getGlobalSubjectColor === 'function' ? getGlobalSubjectColor(s.subject) : 'var(--text)';
              return (
                <div className="session-entry" key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div className="session-sub" style={{ fontWeight: 'bold', fontSize: '0.95rem', color: subColor }}>{s.subject || 'Study'}</div>
                    <span className="session-dur" style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>{s.durationMinutes} min</span>
                  </div>
                  <div className="session-actions" style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="session-time" style={{ marginRight: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{dateStr}</span>
                    <button className="btn-del" onClick={() => handleDelete(s.id)} title="Delete" style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                  </div>
                </div>
              );
           })
        )}
      </div>
    </div>
  );

  const HeatmapCard = () => (
    <div className={`bento-card ${!isMobile ? 'col-span-3' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      <div className="chart-title">Consistency ({new Date().getFullYear()})</div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden', paddingTop: '10px' }}>
         <Heatmap sessions={sessions} dailyGoal={settings.dailyGoal} isMobile={isMobile} />
      </div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--bg)', zIndex: 1500, display: 'flex', flexDirection: 'column', paddingTop: 'var(--safe-top, 0px)' }}>
      
      {/* HEADER */}
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg2)' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '0.1em' }}>DASHBOARD</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '2rem', cursor: 'pointer', lineHeight: 0.8 }}>&times;</button>
      </div>

      {/* SCROLLABLE CONTENT AREA */}
      <div style={{ flex: 1, overflowY: 'auto', scrollSnapType: 'y mandatory' }}>
        
        {isMobile ? (
          <>
            {/* MOBILE PAGE 1: Today & Stats */}
            <div style={{ height: 'calc(100vh - 65px - var(--safe-top, 0px))', scrollSnapAlign: 'start', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', flexDirection: isLandscape ? 'row' : 'column', gap: '1rem', flex: 1, minHeight: 0 }}>
                <TodaysFocusCard />
                <StatsCard />
              </div>
              
              <button 
                onClick={() => { onClose(); setShowManualLog(true); }}
                style={{ 
                  marginTop: '0.75rem',
                  width: '100%', 
                  padding: isLandscape ? '0.75rem' : '1.25rem', 
                  background: 'var(--card)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '12px', 
                  color: 'var(--text)', 
                  fontSize: '1rem', 
                  fontWeight: '600', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '12px',
                  boxShadow: 'var(--shadow)',
                  transition: 'var(--transition)'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                Add Manual Log
              </button>

              <div style={{ marginTop: '0.75rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>↓ Swipe for Charts ↓</div>
            </div>

            {/* MOBILE PAGE 2: Bar Graph & Recent */}
            <div style={{ height: 'calc(100vh - 65px - var(--safe-top, 0px))', scrollSnapAlign: 'start', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', flexDirection: isLandscape ? 'row' : 'column', gap: '1rem', flex: 1, minHeight: 0 }}>
                <BarChartCard />
                <RecentCard />
              </div>
              <div style={{ marginTop: '0.75rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>↓ Swipe for Heatmap ↓</div>
            </div>

            {/* MOBILE PAGE 3: Consistency (Vertical) */}
            <div style={{ height: 'calc(100vh - 65px - var(--safe-top, 0px))', scrollSnapAlign: 'start', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
              <HeatmapCard />
            </div>
          </>
        ) : (
          <>
            {/* DESKTOP PAGE 1: Original Bento Grid */}
            <div style={{ height: 'calc(100vh - 56px - var(--safe-top, 0px))', scrollSnapAlign: 'start', padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
              <div className="bento-grid">
                <TodaysFocusCard />
                <StatsCard />
                <BarChartCard />
                <RecentCard />
              </div>
              <div style={{ textAlign: 'center', paddingBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                ↓ Scroll Down For Full Year Consistency ↓
              </div>
            </div>

            {/* DESKTOP PAGE 2: Horizontal Heatmap */}
            <div style={{ height: 'calc(100vh - 56px - var(--safe-top, 0px))', scrollSnapAlign: 'start', padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
              <HeatmapCard />
            </div>
          </>
        )}

      </div>
    </div>
  );
}
