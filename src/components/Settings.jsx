import { useState, useEffect } from 'react';
import { getSessions, syncToCloud } from '../utils/helpers';
import { auth, fbAuth, db, fbDb } from '../config/firebase';

export default function Settings({ settings, setSettings, onClose, theme, cycleTheme }) {
  const [usernameInput, setUsernameInput] = useState(settings.username || '');
  const [usernameStatus, setUsernameStatus] = useState('');
  const [daysLeft, setDaysLeft] = useState(0);

  // Calculate 14-day cooldown
  useEffect(() => {
    if (settings.lastUsernameChange) {
      const daysPassed = (Date.now() - settings.lastUsernameChange) / (1000 * 60 * 60 * 24);
      if (daysPassed < 14) {
        setDaysLeft(Math.ceil(14 - daysPassed));
      }
    }
  }, [settings.lastUsernameChange]);

  // Debounced availability check
  useEffect(() => {
    if (daysLeft > 0 || usernameInput === settings.username || !usernameInput.trim()) {
      setUsernameStatus('');
      return;
    }

    const timer = setTimeout(async () => {
      const val = usernameInput.trim();
      
      // Rule 1: Length check (3 to 15 chars)
      if (val.length < 3 || val.length > 15) {
        setUsernameStatus('error_length');
        return;
      }

      // Rule 2: Allowed characters (alphanumeric and underscore only)
      const isValid = /^[a-z0-9_]+$/.test(val);
      if (!isValid) {
        setUsernameStatus('error_invalid');
        return;
      }

      setUsernameStatus('checking');
      try {
        const docSnap = await fbDb.getDoc(fbDb.doc(db, 'usernames', val));
        if (docSnap.exists() && docSnap.data().uid !== auth.currentUser?.uid) {
          setUsernameStatus('taken');
        } else {
          setUsernameStatus('available');
        }
      } catch (e) {
        setUsernameStatus('error');
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [usernameInput, daysLeft, settings.username]);

  async function handleSaveUsername() {
    if (usernameStatus !== 'available') return;
    const val = usernameInput.trim();
    try {
      // Register in global unique collection
      await fbDb.setDoc(fbDb.doc(db, 'usernames', val.toLowerCase()), {
        uid: auth.currentUser.uid,
        original: val
      });

      // Update local settings and leaderboard
      const newSettings = { ...settings, username: val, lastUsernameChange: Date.now() };
      setSettings(newSettings);
      localStorage.setItem('focus_settings', JSON.stringify(newSettings));
      syncToCloud();

      setUsernameStatus('saved');
      setDaysLeft(14);
    } catch (error) {
      alert("Error saving username");
    }
  }

  function handleClearData() {
    if (window.confirm("Are you sure you want to clear all your study data? This cannot be undone.")) {
      localStorage.removeItem('focus_sessions');
      syncToCloud();
      alert("All data cleared successfully.");
      onClose();
    }
  }

  async function handleLogout() {
    try {
      // 1. NUKE local storage FIRST to prevent any state-saving listeners from catching old data
      localStorage.clear();

      // 2. NOW sign out from Firebase Auth
      await fbAuth.signOut(auth);

      // 3. Hard replace the URL to kill the React instance instantly
      // This prevents any background useEffects from re-saving state.
      window.location.replace('/');
    } catch (error) {
      console.error('Logout Error:', error);
    }
  }

  function updateSetting(key, val) {
    const newSettings = { ...settings, [key]: val };
    setSettings(newSettings);
    localStorage.setItem('focus_settings', JSON.stringify(newSettings));
    syncToCloud();
  }

  function handleExportData() {
    const sessions = getSessions();
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

  function handleImportCSV(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      const importedSessions = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = lines[i].split(',');
        if (cols.length >= 4) {
          importedSessions.push({
            id: parseInt(cols[0]),
            date: cols[1],
            subject: cols[2].replace(/"/g, ''),
            durationMinutes: parseInt(cols[3])
          });
        }
      }
      if (importedSessions.length > 0) {
        const existing = JSON.parse(localStorage.getItem('focus_sessions') || '[]');
        const merged = [...existing, ...importedSessions];
        // Deduplicate by ID to prevent double entries
        const unique = merged.filter((v, i, a) => a.findIndex(v2 => (v2.id === v.id)) === i);
        localStorage.setItem('focus_sessions', JSON.stringify(unique));
        syncToCloud();
        alert(`${importedSessions.length} sessions imported & synced to cloud successfully!`);
        onClose(); // Close settings to see dashboard update
      }
    };
    reader.readAsText(file);
  }

  const ACCENT_COLORS = [
    { name: 'Green', value: '#4CAF50' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Amber', value: '#F59E0B' }
  ];

  return (
    <div className="dash-overlay">
      <div className="dash-navbar">
        <button className="icon-btn" onClick={onClose} title="Back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
        </button>
        <span className="dash-title">Settings</span>
        <span style={{ width: 34 }} />
      </div>
      <div className="dash-content" style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '2rem 1.5rem', gap: '2rem', maxWidth: '500px', margin: '0 auto', width: '100%' }}>

        <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
          <span className="setting-label" style={{ fontWeight: 'bold' }}>Username</span>
          <div style={{ display: 'flex', width: '100%', gap: '10px' }}>
            <input
              type="text"
              value={usernameInput}
              onChange={e => { 
                const cleanValue = e.target.value.replace(/\s+/g, '').toLowerCase();
                setUsernameInput(cleanValue); 
                setUsernameStatus(''); 
              }}
              placeholder="e.g. shadow_focus"
              disabled={daysLeft > 0}
              style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: `1px solid ${usernameStatus === 'available' ? '#4CAF50' : (usernameStatus.startsWith('error') || usernameStatus === 'taken') ? '#EF4444' : 'var(--border)'}`, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}
            />
            {daysLeft === 0 && usernameInput !== settings.username && (
              <button
                onClick={handleSaveUsername}
                disabled={usernameStatus !== 'available'}
                style={{ padding: '0 1rem', background: usernameStatus === 'available' ? 'var(--accent)' : 'var(--card2)', color: usernameStatus === 'available' ? '#000' : 'var(--text-muted)', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: usernameStatus === 'available' ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
              >
                Save
              </button>
            )}
          </div>

          {/* Status Messages */}
          <div style={{ fontSize: '0.85rem', marginTop: '4px', minHeight: '20px' }}>
            {daysLeft > 0 && <span style={{ color: '#F59E0B' }}>⏳ You can change your username in {daysLeft} days.</span>}
            {daysLeft === 0 && usernameStatus === 'checking' && <span style={{ color: 'var(--text-muted)' }}>🔍 Checking availability...</span>}
            {daysLeft === 0 && usernameStatus === 'available' && <span style={{ color: '#4CAF50' }}>✨ Username is available!</span>}
            {daysLeft === 0 && usernameStatus === 'taken' && <span style={{ color: '#EF4444' }}>❌ Username is already taken.</span>}
            {daysLeft === 0 && usernameStatus === 'error_length' && <span style={{ color: '#EF4444' }}>⚠️ Username must be between 3 and 15 characters.</span>}
            {daysLeft === 0 && usernameStatus === 'error_invalid' && <span style={{ color: '#EF4444' }}>⚠️ Only letters, numbers, and underscores (_) are allowed.</span>}
            {usernameStatus === 'saved' && <span style={{ color: '#4CAF50' }}>✅ Username successfully saved!</span>}
          </div>
        </div>

        {/* Theme Selection */}
        <div className="setting-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginTop: '1rem' }}>
          <span className="setting-label" style={{ fontWeight: 'bold' }}>App Theme</span>
          <button 
            onClick={cycleTheme}
            style={{ padding: '0.5rem 1.2rem', background: 'var(--card2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '20px', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
          >
            <span style={{ fontSize: '1.1rem' }}>
              {theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '🕰️'}
            </span>
            {theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'Flip (OLED)'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', borderBottom: '1px solid var(--divider)', paddingBottom: '0.5rem' }}>⏳ Durations & Goals</h3>
          <div className="settings-row"><span className="settings-label">Default Study (min)</span><input type="number" className="settings-input" value={settings.studyMin} onChange={e => updateSetting('studyMin', Math.max(1, parseInt(e.target.value) || 1))} /></div>
          <div className="settings-row"><span className="settings-label">Default Break (min)</span><input type="number" className="settings-input" value={settings.breakMin} onChange={e => updateSetting('breakMin', Math.max(1, parseInt(e.target.value) || 1))} /></div>
          <div className="settings-row"><span className="settings-label">Default Normal (min)</span><input type="number" className="settings-input" value={settings.normalMin} onChange={e => updateSetting('normalMin', Math.max(1, parseInt(e.target.value) || 1))} /></div>
          <div className="settings-row"><span className="settings-label">Daily Focus Goal (hrs)</span><input type="number" className="settings-input" value={settings.dailyGoal} onChange={e => updateSetting('dailyGoal', Math.max(1, parseInt(e.target.value) || 1))} /></div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', borderBottom: '1px solid var(--divider)', paddingBottom: '0.5rem' }}>⚙️ Focus & Alerts</h3>
          <div className="settings-row"><span className="settings-label">Audio Alerts</span><label className="settings-toggle"><input type="checkbox" checked={settings.audioEnabled} onChange={e => updateSetting('audioEnabled', e.target.checked)} /><span className="toggle-slider"></span></label></div>
          <div className="settings-row"><span className="settings-label">Strict Mode</span><label className="settings-toggle"><input type="checkbox" checked={settings.strictMode} onChange={e => updateSetting('strictMode', e.target.checked)} /><span className="toggle-slider"></span></label></div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', borderBottom: '1px solid var(--divider)', paddingBottom: '0.5rem' }}>🎨 Display</h3>
          <div className="settings-row">
            <span className="settings-label">Clock Format</span>
            <select className="settings-input" style={{ width: 'auto', cursor: 'pointer' }} value={settings.clockFormat || '12h'} onChange={e => updateSetting('clockFormat', e.target.value)}>
              <option value="12h">12-Hour</option>
              <option value="24h">24-Hour</option>
            </select>
          </div>
          <div className="settings-row"><span className="settings-label">Accent Color</span><div className="color-picker">{ACCENT_COLORS.map(c => (<div key={c.value} className={`color-dot${settings.accentColor === c.value ? ' active' : ''}`} style={{ backgroundColor: c.value }} onClick={() => updateSetting('accentColor', c.value)} title={c.name} />))}</div></div>
        </div>


        <div style={{ borderTop: '1px solid var(--divider)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleExportData} style={{ flex: 1, padding: '10px', background: 'var(--card2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s', fontWeight: '500' }}>📥 Export CSV</button>
            
            <input type="file" accept=".csv" id="csv-upload" style={{ display: 'none' }} onChange={handleImportCSV} />
            <button onClick={() => document.getElementById('csv-upload').click()} style={{ flex: 1, padding: '10px', background: 'var(--card2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s', fontWeight: '500' }}>📤 Import CSV</button>
          </div>
          <button onClick={handleLogout} style={{ padding: '10px', background: 'var(--card2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg> Sign Out</button>
          <button onClick={handleClearData} style={{ padding: '10px', background: 'transparent', border: '1px solid #ff4444', color: '#ff4444', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}>Clear Local Data</button>
        </div>
      </div>
    </div>
  );
}
