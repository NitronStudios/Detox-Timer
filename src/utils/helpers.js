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
  const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  const entry = {
    id: Math.floor(Date.now() / 1000),
    date: local.toISOString().split('T')[0],
    subject: subject || 'Study',
    durationMinutes
  };
  const sessions = getSessions();
  sessions.push(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  syncToCloud();
  return entry;
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
