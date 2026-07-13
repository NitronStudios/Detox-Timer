import { auth, db, fbDb } from '../config/firebase.js';

const STORAGE_KEY = 'focus_sessions';

export function getSessions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

export async function syncToCloud() {
  if (!auth || !auth.currentUser) return;
  const user = auth.currentUser;
  const sessions = getSessions();
  const settings = JSON.parse(localStorage.getItem('focus_settings') || '{}');
  
  try {
    // 1. Sync private user data
    await fbDb.setDoc(fbDb.doc(db, 'users', user.uid), {
      sessions,
      settings,
      lastUpdated: Date.now()
    });

    // 2. Calculate Leaderboard Stats
    const now = new Date();
    const todayStr = getTodayStr();
    
    // Basic date boundaries for filtering
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); 
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    let daily = 0, weekly = 0, monthly = 0, yearly = 0;

    sessions.forEach(s => {
      const sDate = new Date(s.date);
      if (s.date === todayStr) daily += s.durationMinutes;
      if (sDate >= startOfWeek) weekly += s.durationMinutes;
      if (sDate >= startOfMonth) monthly += s.durationMinutes;
      if (sDate >= startOfYear) yearly += s.durationMinutes;
    });

    const username = settings.username ? settings.username.trim() : 'Anonymous';

    // 3. Update Public Leaderboard Collection
    await fbDb.setDoc(fbDb.doc(db, 'leaderboard', user.uid), {
      username,
      daily,
      weekly,
      monthly,
      yearly,
      lastUpdated: Date.now()
    });

  } catch (e) { console.error("Cloud Sync Error:", e); }
}

export function saveSession(subject, elapsedSeconds) {
  if (elapsedSeconds < 5) return null;
  
  const now = new Date();
  const startTime = new Date(now.getTime() - elapsedSeconds * 1000);
  
  const sessions = getSessions();
  
  // Calculate local dates
  const getLocalDateStr = (d) => {
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().split('T')[0];
  };

  const startDateStr = getLocalDateStr(startTime);
  const endDateStr = getLocalDateStr(now);

  if (startDateStr !== endDateStr) {
    // Session crossed midnight
    // End of start day:
    const endOfStartDay = new Date(startTime);
    endOfStartDay.setHours(23, 59, 59, 999);
    
    let currentStart = startTime;
    
    while (getLocalDateStr(currentStart) !== getLocalDateStr(now)) {
      const eod = new Date(currentStart);
      eod.setHours(23, 59, 59, 999);
      
      const durationSecs = (eod.getTime() - currentStart.getTime()) / 1000;
      const durationMins = Math.max(1, Math.round(durationSecs / 60));
      
      sessions.push({
        id: Math.floor(currentStart.getTime() / 1000),
        date: getLocalDateStr(currentStart),
        subject: subject || 'Study',
        durationMinutes: durationMins
      });
      
      currentStart = new Date(eod.getTime() + 1);
    }
    
    // Remaining time on end date
    const remainingSecs = (now.getTime() - currentStart.getTime()) / 1000;
    if (remainingSecs >= 30) { // Only save if at least 30 seconds into the new day
      sessions.push({
        id: Math.floor(currentStart.getTime() / 1000),
        date: getLocalDateStr(currentStart),
        subject: subject || 'Study',
        durationMinutes: Math.max(1, Math.round(remainingSecs / 60))
      });
    }
  } else {
    // Normal single-day session
    const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    sessions.push({
      id: Math.floor(Date.now() / 1000),
      date: endDateStr,
      subject: subject || 'Study',
      durationMinutes
    });
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  syncToCloud();
  return sessions[sessions.length - 1];
}

export function getUniqueSubjects() {
  const sessions = getSessions();
  const subjects = [...new Set(sessions.map(s => s.subject).filter(Boolean))];
  return subjects;
}

export function updateSession(id, data) {
  const sessions = getSessions();
  const index = sessions.findIndex(s => s.id === id);
  if (index !== -1) {
    sessions[index] = { ...sessions[index], ...data };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    syncToCloud();
  }
}

export function deleteSession(id) {
  const sessions = getSessions().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  syncToCloud();
}

export function getTodayStr() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().split('T')[0];
}

export const CHART_COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981', '#EC4899', '#14B8A6', '#F43F5E', 'var(--accent)'];
export const getGlobalSubjectColor = (() => {
  const cache = {};
  let colorIdx = 0;
  return (sub) => {
    const key = (sub || 'Focus Session').substring(0, 15);
    if (!cache[key]) {
      cache[key] = CHART_COLORS[colorIdx % CHART_COLORS.length];
      colorIdx++;
    }
    return cache[key];
  };
})();
