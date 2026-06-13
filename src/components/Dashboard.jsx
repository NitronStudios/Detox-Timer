import { useState } from 'react';
import { getSessions, deleteSession, getTodayStr, getGlobalSubjectColor } from '../utils/helpers';

/* ================================================================
   STACKED BAR CHART (SVG)
   ================================================================ */
function BarChart() {
  const sessions = getSessions();
  const todayStr = getTodayStr();

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
       color: getGlobalSubjectColor(sub)
    })).sort((a,b) => b.minutes - a.minutes);

    return { label: DAYS[d.getDay()], totalMinutes, subjects, isToday: dateStr === todayStr };
  });

  const W = 800, H = 450, PL = 35, PB = 25, PT = 15, PR = 10;
  const cW = W - PL - PR, cH = H - PT - PB;
  const maxMin = Math.max(...days.map(d => d.totalMinutes), 60);
  const pxPerMin = cH / Math.max(maxMin, 480);
  const bW = 50;
  const gap = (cW - bW * 7) / 6;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ overflow: 'visible', display: 'block' }}>
      {[0, 2, 4, 6, 8].map(h => {
        const y = H - PB - (h * 60 * pxPerMin);
        return <text key={h} x={PL - 12} y={y + 5} fill="var(--text-muted)" fontSize="14" fontWeight="500" textAnchor="end">{h}h</text>;
      })}

      {days.map((d, i) => {
        const x = PL + i * (bW + gap);
        
        if (d.totalMinutes === 0) {
          return (
            <g key={i}>
              <rect x={x} y={H - PB - 3} width={bW} height={3} rx="2" fill="var(--border)" />
              <text x={x + bW / 2} y={H - 7} fill="var(--text-muted)" fontSize="14" fontWeight="500" textAnchor="middle">{d.label}</text>
            </g>
          );
        }

        let currentY = H - PB;
        return (
          <g key={i}>
            {d.subjects.map((sub, j) => {
              const sH = Math.max(2, sub.minutes * pxPerMin);
              currentY -= sH;
              return (
                <rect 
                  key={j} 
                  x={x} y={currentY} width={bW} height={sH} rx="3"
                  fill={sub.color}
                  stroke="var(--bg)"
                  strokeWidth="2.5"
                  style={{ transition: 'all 0.3s ease' }} 
                >
                  <title>{sub.label}: {sub.minutes}m</title>
                </rect>
              );
            })}
            <text x={x + bW / 2} y={H - 7} fill="var(--text-muted)" fontSize="14" fontWeight="500" textAnchor="middle">{d.label}</text>
          </g>
        );
      })}

      {/* Draw axes LAST so they render on top and don't get hidden by bar strokes */}
      <line x1={PL} y1={PT} x2={PL} y2={H - PB} stroke="var(--border)" strokeWidth="1.5" />
      <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke="var(--border)" strokeWidth="1.5" />
    </svg>
  );
}

/* ================================================================
   FULL YEAR GITHUB HEATMAP (AUTO-FIT GRID)
   ================================================================ */
function Heatmap({ sessions, dailyGoal }) {
  const now = new Date();
  const year = now.getFullYear();
  
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  
  const days = [];
  const sessionTotals = {};
  sessions.forEach(s => {
     sessionTotals[s.date] = (sessionTotals[s.date] || 0) + s.durationMinutes;
  });

  // Add blank placeholders so Jan 1st aligns with the correct day of the week
  const startDayOfWeek = startDate.getDay();
  for(let i = 0; i < startDayOfWeek; i++) {
     days.push({ isBlank: true });
  }

  let d = new Date(startDate);
  // Get local date string for today
  const todayDateStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];

  while (d <= endDate) {
     const offset = d.getTimezoneOffset();
     const local = new Date(d.getTime() - offset * 60000);
     const dateStr = local.toISOString().split('T')[0];
     
     const isFuture = dateStr > todayDateStr;
     const mins = sessionTotals[dateStr] || 0;
     
     days.push({ dateStr, mins, isFuture, isBlank: false });
     d.setDate(d.getDate() + 1);
  }

  // Calculate total columns (weeks) + 1 extra column for the weekday labels
  const totalCols = Math.ceil(days.length / 7) + 1;
  const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 1rem' }}>
      <div style={{ 
         display: 'grid', 
         gridTemplateRows: 'repeat(7, 1fr)', 
         gridTemplateColumns: `repeat(${totalCols}, 1fr)`,
         gridAutoFlow: 'column', 
         gap: 'clamp(3px, 0.4vw, 6px)', 
         width: '100%',
         aspectRatio: `${totalCols} / 7`, 
         margin: '0 auto'
      }}>
         {/* Labels Column */}
         {DAY_LABELS.map((lbl, i) => (
            <div key={`lbl-${i}`} style={{ 
               display: 'flex', 
               alignItems: 'center', 
               justifyContent: 'center',
               fontSize: 'clamp(0.5rem, 0.75vw, 0.85rem)',
               fontWeight: '600',
               color: 'var(--text-muted)',
               height: '100%',
               width: '100%'
            }}>
               {lbl}
            </div>
         ))}

         {/* Heatmap Boxes */}
         {days.map((d, i) => {
            if (d.isBlank) return <div key={`blank-${i}`} style={{ width: '100%', height: '100%' }} />;
            
            if (d.isFuture) {
               return (
                 <div key={i} className="heat-box" 
                      style={{ 
                        width: '100%', height: '100%', borderRadius: 'min(3px, 0.3vw)',
                        backgroundColor: 'transparent', 
                        border: '1px dashed var(--border)', 
                        opacity: 0.3,
                        cursor: 'default'
                      }} 
                      title={`${d.dateStr} (Upcoming)`} />
               );
            }
            
            let intensity = 0; 
            if (d.mins > 0) {
               const pct = d.mins / (dailyGoal * 60);
               if (pct >= 1) intensity = 1;
               else if (pct >= 0.75) intensity = 0.8;
               else if (pct >= 0.4) intensity = 0.55;
               else intensity = 0.3;
            }
            const isEmpty = intensity === 0;
            
            return (
              <div key={i} className="heat-box" 
                   style={{ 
                     width: '100%', height: '100%', borderRadius: 'min(3px, 0.3vw)',
                     backgroundColor: isEmpty ? 'var(--bg)' : 'var(--accent)', 
                     opacity: isEmpty ? 0.7 : intensity,
                     border: isEmpty ? '1px solid var(--border)' : 'none'
                   }} 
                   title={`${d.dateStr}: ${d.mins} min`} />
            );
         })}
      </div>
    </div>
  );
}

export default function Dashboard({ settings, onClose }) {
  const [sessions, setSessions] = useState(getSessions);
  const todayStr = getTodayStr();

  const todayMin = sessions.filter(s => s.date === todayStr).reduce((a, s) => a + s.durationMinutes, 0);
  const h = Math.floor(todayMin / 60), m = todayMin % 60;
  const progress = Math.min(100, Math.round((todayMin / (settings.dailyGoal * 60)) * 100));

  // Deep Stats Calculations
  const totalMin = sessions.reduce((a, s) => a + s.durationMinutes, 0);
  const totalH = Math.floor(totalMin / 60);
  const longestSession = sessions.length ? Math.max(...sessions.map(s => s.durationMinutes)) : 0;
  
  // Streak Calculation
  const dailyGoalMin = settings.dailyGoal * 60;
  const dateMap = {};
  sessions.forEach(s => { dateMap[s.date] = (dateMap[s.date] || 0) + s.durationMinutes; });
  
  let streak = 0;
  let d = new Date();
  let checkStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  
  if (dateMap[checkStr] >= dailyGoalMin) {
     streak++;
     d.setDate(d.getDate() - 1);
  } else {
     d.setDate(d.getDate() - 1);
     checkStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  }
  
  while (true) {
     checkStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
     if (dateMap[checkStr] >= dailyGoalMin) {
         streak++;
         d.setDate(d.getDate() - 1);
     } else {
         break;
     }
  }

  function handleDelete(id) {
    deleteSession(id);
    setSessions(getSessions());
  }

  function downloadCSV() {
    if (sessions.length === 0) return alert("No data to export!");
    const headers = ["ID", "Date", "Subject", "Duration (Minutes)"];
    const rows = sessions.map(s => [s.id, s.date, `"${s.subject}"`, s.durationMinutes]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "detox_timer_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const recent = [...sessions].reverse().slice(0, 15);

  return (
    <div className="dash-overlay">
      <div className="dash-navbar">
        <button className="icon-btn" onClick={onClose} title="Back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <span className="dash-title">Dashboard</span>
        <button className="icon-btn" onClick={downloadCSV} title="Export CSV Data">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
      </div>

      {/* Vertical Snap Scroll Container */}
      <div style={{ flex: 1, overflowY: 'auto', scrollSnapType: 'y mandatory', scrollBehavior: 'smooth' }}>
        
        {/* PAGE 1: Overview Dashboard */}
        <div style={{ height: 'calc(100vh - 56px)', scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column' }}>
          <div className="bento-grid" style={{ flex: 1, gridTemplateRows: 'auto minmax(0, 1fr)', padding: '1.25rem 1.25rem 0.5rem 1.25rem', minHeight: 0 }}>
            
            {/* Top Left: Today's Focus */}
            <div className="bento-card">
              <div className="chart-title">Today's Focus</div>
              <div className="stat-val" style={{ fontSize: '2.5rem', margin: '0.5rem 0' }}>{h}h {m}m</div>
              <div style={{ marginTop: 'auto', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <span>Daily Goal Progress</span>
                  <span>{progress}%</span>
                </div>
                <div style={{ height: '6px', background: 'var(--bg)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', borderRadius: '3px', transition: 'width 0.3s ease' }}></div>
                </div>
              </div>
            </div>

            {/* Top Right: Deep Stats */}
            <div className="bento-card col-span-2">
               <div className="chart-title">Deep Stats &amp; Streaks</div>
               <div className="stat-group" style={{ marginTop: '0.5rem', height: '100%' }}>
                  <div className="stat-item">
                     <div className="stat-val" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>{streak} <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c-2.2 0-4-1.8-4-4a8 8 0 0 1 14 6c0 4.4-3.6 8-8 8a8 8 0 0 1-8-8c1.7 0 2.5.5 2.5 2.5z"></path></svg></div>
                     <div className="stat-label">Day Streak</div>
                  </div>
                  <div className="stat-item">
                     <div className="stat-val">{totalH} <span style={{fontSize:'1rem'}}>hrs</span></div>
                     <div className="stat-label">Total Focus Time</div>
                  </div>
                  <div className="stat-item">
                     <div className="stat-val">{longestSession} <span style={{fontSize:'1rem'}}>min</span></div>
                     <div className="stat-label">Longest Session</div>
                  </div>
               </div>
            </div>

            {/* Middle Left: Bar Chart */}
            <div className="bento-card col-span-2">
              <div className="chart-title">Activity — Past 7 Days</div>
              <div className="chart-wrap" style={{ marginTop: 'auto', height: '100%', display: 'flex', alignItems: 'flex-end' }}><BarChart /></div>
            </div>

            {/* Middle Right: Recent Subjects / Sessions */}
            <div className="bento-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div className="chart-title" style={{ padding: '1.25rem 1.25rem 0 1.25rem' }}>Recent Sessions</div>
              <div className="sessions-scroll" style={{ padding: '0 1.25rem 1.25rem 1.25rem', flex: 1, overflowY: 'auto' }}>
                {recent.length === 0 && <div className="empty-msg">No sessions yet. Start focusing!</div>}
                {recent.map(s => {
                  const d = new Date(s.id * 1000);
                  let h = d.getHours();
                  const m = String(d.getMinutes()).padStart(2, '0');
                  let ampm = '';

                  if (settings.clockFormat === '12h') {
                    ampm = h >= 12 ? ' PM' : ' AM';
                    h = h % 12 || 12;
                  }

                  const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                  const timeStr = `${String(h).padStart(2, '0')}:${m}${ampm}`;

                  return (
                    <div className="session-row" key={s.id}>
                      <div className="session-info">
                        <span className="session-subject" style={{ color: getGlobalSubjectColor(s.subject), fontWeight: '600' }}>{s.subject}</span>
                        <span className="session-dur">{s.durationMinutes} min</span>
                      </div>
                      <div className="session-actions">
                        <span className="session-time" style={{ marginRight: '8px' }}>{dateStr}, {timeStr}</span>
                        <button className="btn-del" onClick={() => handleDelete(s.id)} title="Delete">✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
          
          {/* Scroll Hint */}
          <div style={{ textAlign: 'center', paddingBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            ↓ Scroll Down For Full Year Consistency ↓
          </div>
        </div>

        {/* PAGE 2: Full Screen Consistency Heatmap */}
        <div style={{ height: 'calc(100vh - 56px)', scrollSnapAlign: 'start', padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <div className="bento-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="chart-title">Consistency ({new Date().getFullYear()})</div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
               <Heatmap sessions={sessions} dailyGoal={settings.dailyGoal} />
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
