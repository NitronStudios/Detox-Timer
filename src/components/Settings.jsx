import { useState, useEffect } from 'react';
import { getSessions, syncToCloud } from '../utils/helpers';
import { auth, fbAuth, db, fbDb } from '../config/firebase';
import { Clock, AlertTriangle, Download, Upload, Trash2, LogOut, CheckCircle, XCircle } from 'lucide-react';

export default function Settings({ 
  settings, 
  setSettings, 
  theme, 
  setTheme,
  cycleTheme, 
  onClose, 
  setShowDash, 
  setShowLeaderboard, 
  setShowChat 
}) {
  const [usernameInput, setUsernameInput] = useState(settings.username || '');
  const [usernameStatus, setUsernameStatus] = useState('');
  const [daysLeft, setDaysLeft] = useState(0);
  const [activeCategory, setActiveCategory] = useState('profile');
  const [selectedMobileCategory, setSelectedMobileCategory] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 580);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 580);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    setShowClearConfirm(true);
  }

  function confirmClearData() {
    localStorage.removeItem('focus_sessions');
    syncToCloud();
    alert("All data cleared successfully.");
    setShowClearConfirm(false);
    onClose();
  }

  async function handleLogout() {
    try {
      localStorage.clear();
      await fbAuth.signOut(auth);
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
        const unique = merged.filter((v, i, a) => a.findIndex(v2 => (v2.id === v.id)) === i);
        localStorage.setItem('focus_sessions', JSON.stringify(unique));
        syncToCloud();
        alert(`${importedSessions.length} sessions imported & synced to cloud successfully!`);
        onClose();
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
    <div className="dash-overlay mobile-modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(12px)', zIndex: 2000, padding: '2rem' }}>
      {showClearConfirm && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2500, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
          <h3 style={{ color: 'var(--text)', marginBottom: '15px' }}>Clear All Data?</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '25px', maxWidth: '300px' }}>Are you sure you want to clear all your study data? This cannot be undone.</p>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button className="ctrl-btn ctrl-btn-outline" onClick={() => setShowClearConfirm(false)}>CANCEL</button>
            <button className="ctrl-btn ctrl-btn-resume" onClick={confirmClearData} style={{ background: '#EF4444', borderColor: '#EF4444' }}>CLEAR DATA</button>
          </div>
        </div>
      )}
      {/* Self-contained styling specifically for the Settings design variation */}
      <style>{`
        .system-container {
          display: grid;
          grid-template-columns: 320px 1fr;
          height: calc(100vh - 4rem);
          width: calc(100vw - 4rem);
          max-width: 1100px;
          max-height: 750px;
          background-color: var(--bg);
          color: var(--text);
          position: relative;
          border: 1px solid var(--border);
          border-radius: 20px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
          overflow: hidden;
        }

        .setting-group-card {
          background: var(--card2);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          width: 100%;
          max-width: 500px;
        }

        .setting-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
        }

        @media (max-width: 580px) {
          .setting-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Column 1: Navigation */
        .nav-pane {
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          padding: 2rem 1.5rem;
          background: var(--bg);
        }

        .brand {
          font-family: 'Syne', sans-serif;
          font-size: 1.25rem;
          font-weight: 800;
          margin-bottom: 3rem;
          letter-spacing: -0.04em;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text);
        }

        .nav-group {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .nav-item {
          font-family: 'JetBrains Mono', monospace, 'Space Mono';
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          padding: 0.75rem;
          border: 1px solid transparent;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.2s;
        }

        .nav-item.active {
          color: var(--text);
          border-color: var(--border);
          background: var(--card2);
        }

        .nav-item:hover:not(.active) {
          color: var(--text);
          background: var(--card2);
        }

        /* Column 2: Main Settings List */
        .master-pane {
          background: var(--card2);
          border-right: 1px solid var(--border);
          padding: 0;
          display: flex;
          flex-direction: column;
        }

        .pane-header {
          padding: 2.5rem 2rem;
          border-bottom: 1px solid var(--border);
        }

        .pane-label {
          font-family: 'JetBrains Mono', monospace, 'Space Mono';
          font-size: 0.6rem;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          color: var(--accent);
          margin-bottom: 1rem;
          display: block;
        }

        .settings-title {
          font-family: 'Syne', sans-serif;
          font-size: 2.2rem;
          font-weight: 800;
          letter-spacing: -0.05em;
          line-height: 1;
          margin: 0;
          color: var(--text);
        }

        .setting-categories {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          padding: 1.5rem 1.25rem;
        }

        .category-item {
          padding: 1.25rem 1.5rem;
          border: 1px solid transparent;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          background: none;
          width: 100%;
        }

        .category-item:hover:not(.active) { 
          background: var(--card2); 
          border-color: var(--card2);
        }

        .category-item.active { 
          background: var(--accent); 
          border-color: var(--accent);
        }

        .category-item.active .category-title { 
          color: #000 !important; 
        }

        .category-item.active .category-meta { 
          color: rgba(0, 0, 0, 0.6) !important; 
        }

        .category-title {
          font-weight: 600;
          font-size: 0.95rem;
          margin-bottom: 0.25rem;
          display: block;
          color: var(--text);
        }

        .category-meta {
          font-family: 'JetBrains Mono', monospace, 'Space Mono';
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
        }

        /* Column 3: Detailed View */
        .detail-pane {
          padding: 4rem 3rem;
          display: flex;
          flex-direction: column;
          gap: 3rem;
          overflow-y: auto;
          position: relative;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          max-width: 500px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .field-label {
          font-family: 'JetBrains Mono', monospace, 'Space Mono';
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
        }

        .field-input, .field-select {
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text);
          padding: 1rem;
          font-family: 'JetBrains Mono', monospace, 'Space Mono';
          font-size: 0.85rem;
          width: 100%;
          outline: none;
          transition: border-color 0.2s;
        }

        .field-input:focus, .field-select:focus {
          border-color: var(--accent);
        }

        .toggle-control {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border: 1px solid var(--border);
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .toggle-control:hover {
          background: var(--card2);
        }

        .toggle-switch {
          width: 36px;
          height: 18px;
          background: var(--border);
          border-radius: 9px;
          position: relative;
          transition: background 0.2s;
        }

        .toggle-switch.active { 
          background: var(--accent); 
        }

        .toggle-switch::after {
          content: '';
          position: absolute;
          width: 14px; height: 14px;
          background: var(--text);
          top: 2px; left: 2px;
          border-radius: 50%;
          transition: left 0.2s;
        }

        .toggle-switch.active::after { 
          left: 20px; 
          background: #000; 
        }

        .color-swatches { 
          display: flex; 
          gap: 8px; 
        }

        .swatch { 
          width: 24px; 
          height: 24px; 
          border: 1px solid var(--border); 
          border-radius: 50%;
          cursor: pointer;
          transition: transform 0.1s;
        }

        .swatch:hover {
          transform: scale(1.15);
        }

        .swatch.active { 
          border: 2px solid var(--text); 
          outline: 4px solid var(--bg); 
          outline-offset: -2px; 
        }

        .action-strip {
          margin-top: auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          max-width: 500px;
        }

        .action-btn {
          background: var(--card2);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text-muted);
          padding: 1.25rem;
          font-family: 'JetBrains Mono', monospace, 'Space Mono';
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .action-btn:hover { 
          color: var(--text); 
          background: var(--card2); 
        }

        .action-btn.danger { 
          color: #ff5555; 
        }

        .action-btn.danger:hover { 
          background: rgba(255, 85, 85, 0.1); 
        }

        .footer-meta {
          padding: 1.5rem;
          margin-top: auto;
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .avatar-mini { 
          width: 24px; 
          height: 24px; 
          background: var(--accent); 
        }

        /* Responsive Breakpoints */
        @media (max-width: 1024px) {
          .system-container {
            grid-template-columns: 280px 1fr;
          }
        }

        @media (max-width: 580px) {
          .system-container {
            grid-template-columns: 1fr;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            height: 100%;
            width: 100%;
            max-height: none;
            max-width: none;
            border-radius: 0;
            border: none;
          }
          .nav-pane {
            display: none !important;
          }
          .master-pane {
            border-right: none !important;
            border-bottom: none;
            flex: 1;
          }
          .pane-header {
            padding: 2rem 1.5rem 1rem;
          }
          .setting-categories {
            display: flex;
            flex-direction: column;
            padding: 0 1rem 1rem;
            gap: 0.5rem;
            border-bottom: none;
          }
          .category-item {
            padding: 1.25rem 1.5rem;
            border: 1px solid var(--border) !important;
            border-radius: 12px;
            white-space: normal;
            width: 100%;
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
          .category-item::after {
            content: '>';
            color: var(--text-muted);
            font-family: monospace;
            font-size: 1.2rem;
          }
          .category-meta {
            display: none;
          }
          .category-title {
            font-size: 1rem;
            margin-bottom: 0;
            text-align: left;
          }
          .detail-pane {
            padding: 2rem 1.5rem;
            gap: 2rem;
            flex: 1;
            overflow-y: visible;
          }
        }
      `}</style>

      <div className="system-container">
        {/* Architectural Close Button */}
        <button 
          onClick={onClose} 
          style={{ 
            position: 'absolute', 
            top: '1.5rem', 
            right: '1.5rem', 
            background: 'none', 
            border: 'none', 
            color: 'var(--text)', 
            fontSize: '1.5rem', 
            cursor: 'pointer', 
            opacity: 0.4, 
            transition: 'opacity 0.2s',
            zIndex: 1000
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.4'}
          title="Close Settings"
        >
          ✕
        </button>

        {/* Column 1: Navigation Pane removed at user request */}

        {/* Column 2: Master Category Pane */}
        {(!isMobile || !selectedMobileCategory) && (
        <div className="master-pane">
          <div className="pane-header">
            <span className="pane-label">Configuration</span>
            <h1 className="settings-title">Settings</h1>
          </div>
          <div className="setting-categories">
            <button 
              className={`category-item ${activeCategory === 'profile' ? 'active' : ''}`}
              onClick={() => { setActiveCategory('profile'); setSelectedMobileCategory('profile'); }}
            >
              <span className="category-meta">Profile</span>
              <span className="category-title">Account Profile</span>
            </button>
            <button 
              className={`category-item ${activeCategory === 'timing' ? 'active' : ''}`}
              onClick={() => { setActiveCategory('timing'); setSelectedMobileCategory('timing'); }}
            >
              <span className="category-meta">Timing</span>
              <span className="category-title">Timer Dynamics</span>
            </button>
            <button 
              className={`category-item ${activeCategory === 'alerts' ? 'active' : ''}`}
              onClick={() => { setActiveCategory('alerts'); setSelectedMobileCategory('alerts'); }}
            >
              <span className="category-meta">Alerts</span>
              <span className="category-title">System Alerts</span>
            </button>
            <button 
              className={`category-item ${activeCategory === 'canvas' ? 'active' : ''}`}
              onClick={() => { setActiveCategory('canvas'); setSelectedMobileCategory('canvas'); }}
            >
              <span className="category-meta">Canvas</span>
              <span className="category-title">Visual Configuration</span>
            </button>
          </div>
        </div>
        )}

        {/* Column 3: Detailed Form Pane */}
        {(!isMobile || selectedMobileCategory) && (
        <main className="detail-pane">
          {isMobile && selectedMobileCategory && (
            <button 
              onClick={() => setSelectedMobileCategory(null)}
              style={{ marginBottom: '1.5rem', background: 'transparent', border: 'none', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: '"Space Mono", monospace', fontSize: '0.9rem', padding: 0 }}
            >
              ← Back to Settings
            </button>
          )}
          {activeCategory === 'profile' && (
            <>
              {/* Identity Handle Card */}
              <div className="field-group">
                <div className="setting-group-card">
                  <label className="field-label" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
                    Identity Handle
                  </label>
                  <div className="field">
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
                        className="field-input"
                        style={{ 
                          borderColor: usernameStatus === 'available' ? '#4CAF50' : (usernameStatus.startsWith('error') || usernameStatus === 'taken') ? '#EF4444' : 'var(--border)' 
                        }}
                      />
                      {daysLeft === 0 && usernameInput !== settings.username && (
                        <button
                          onClick={handleSaveUsername}
                          disabled={usernameStatus !== 'available'}
                          style={{ 
                            padding: '0 1.5rem', 
                            background: usernameStatus === 'available' ? 'var(--accent)' : 'var(--card2)', 
                            color: usernameStatus === 'available' ? '#000' : 'var(--text-muted)', 
                            border: '1px solid var(--border)', 
                            borderRadius: '10px',
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            fontWeight: 'bold', 
                            cursor: usernameStatus === 'available' ? 'pointer' : 'not-allowed', 
                            transition: 'all 0.2s' 
                          }}
                        >
                          Save
                        </button>
                      )}
                    </div>

                    {/* Status Messages */}
                    <div style={{ fontSize: '0.8rem', minHeight: '20px', fontFamily: 'JetBrains Mono, monospace' }}>
                      {daysLeft > 0 && <span style={{ color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> Username lock active. Cooldown: {daysLeft} days.</span>}
                      {daysLeft === 0 && usernameStatus === 'checking' && <span style={{ color: 'var(--text-muted)' }}>Checking handle availability...</span>}
                      {daysLeft === 0 && usernameStatus === 'available' && <span style={{ color: '#4CAF50', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={14} /> Handle available.</span>}
                      {daysLeft === 0 && usernameStatus === 'taken' && <span style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px' }}><XCircle size={14} /> Handle already registered by another user.</span>}
                      {daysLeft === 0 && usernameStatus === 'error_length' && <span style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={14} /> Constraints violated: Must be 3-15 chars.</span>}
                      {daysLeft === 0 && usernameStatus === 'error_invalid' && <span style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={14} /> Invalid characters. Alphanumeric and underscores only.</span>}
                      {usernameStatus === 'saved' && <span style={{ color: '#4CAF50', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={14} /> Handle successfully saved.</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Interface Mode Card */}
              <div className="field-group">
                <div className="setting-group-card">
                  <label className="field-label" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
                    Interface Mode
                  </label>
                  <div className="field">
                    <select 
                      className="field-select"
                      value={theme}
                      onChange={e => {
                        const selected = e.target.value;
                        if (setTheme) {
                          setTheme(selected);
                        }
                      }}
                    >
                      <option value="dark">Dark Mode</option>
                      <option value="light">Light Mode</option>
                      <option value="flip">Flip Clock Classic</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Data Backup Card */}
              <div className="field-group">
                <div className="setting-group-card">
                  <label className="field-label" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                    Data Portability
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <button className="action-btn" onClick={handleExportData} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <Download size={16} /> Export .CSV
                    </button>
                    
                    <input 
                      type="file" 
                      accept=".csv" 
                      id="csv-upload" 
                      style={{ display: 'none' }} 
                      onChange={handleImportCSV} 
                    />
                    <button className="action-btn" onClick={() => document.getElementById('csv-upload').click()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <Upload size={16} /> Import .CSV
                    </button>
                  </div>
                </div>
              </div>

              {/* System Actions Card */}
              <div className="field-group">
                <div className="setting-group-card">
                  <label className="field-label" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                    System Actions
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button className="action-btn danger" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={handleClearData}>
                      <Trash2 size={16} /> Wipe System Cache
                    </button>

                    <button className="action-btn" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={handleLogout}>
                      <LogOut size={16} /> Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeCategory === 'timing' && (
            <>
              {/* Focus & Break Intervals Card */}
              <div className="field-group">
                <div className="setting-group-card">
                  <label className="field-label" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
                    Focus & Break Intervals
                  </label>
                  <div className="setting-grid">
                    <div className="field">
                      <label className="field-label" style={{ fontSize: '0.65rem', opacity: 0.8 }}>Study Session (MIN)</label>
                      <input 
                        type="number" 
                        className="field-input" 
                        value={settings.studyMin} 
                        onChange={e => updateSetting('studyMin', Math.max(1, parseInt(e.target.value) || 1))} 
                      />
                    </div>

                    <div className="field">
                      <label className="field-label" style={{ fontSize: '0.65rem', opacity: 0.8 }}>Break Interval (MIN)</label>
                      <input 
                        type="number" 
                        className="field-input" 
                        value={settings.breakMin} 
                        onChange={e => updateSetting('breakMin', Math.max(1, parseInt(e.target.value) || 1))} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Standard Timer & Goals Card */}
              <div className="field-group">
                <div className="setting-group-card">
                  <label className="field-label" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
                    Standard Timer & Goals
                  </label>
                  <div className="setting-grid">
                    <div className="field">
                      <label className="field-label" style={{ fontSize: '0.65rem', opacity: 0.8 }}>Normal Session (MIN)</label>
                      <input 
                        type="number" 
                        className="field-input" 
                        value={settings.normalMin} 
                        onChange={e => updateSetting('normalMin', Math.max(1, parseInt(e.target.value) || 1))} 
                      />
                    </div>

                    <div className="field">
                      <label className="field-label" style={{ fontSize: '0.65rem', opacity: 0.8 }}>Daily Focus Goal (HRS)</label>
                      <input 
                        type="number" 
                        className="field-input" 
                        value={settings.dailyGoal} 
                        onChange={e => updateSetting('dailyGoal', Math.max(1, parseInt(e.target.value) || 1))} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeCategory === 'alerts' && (
            <>
              {/* Sound Response Card */}
              <div className="field-group">
                <div className="setting-group-card">
                  <label className="field-label" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
                    Sound Response
                  </label>
                  <div 
                    className="toggle-control"
                    onClick={() => updateSetting('audioEnabled', !settings.audioEnabled)}
                  >
                    <label className="field-label" style={{ cursor: 'pointer', margin: 0 }}>Audio Notifications</label>
                    <div className={`toggle-switch ${settings.audioEnabled ? 'active' : ''}`} />
                  </div>
                </div>
              </div>

              {/* App Rules Card */}
              <div className="field-group">
                <div className="setting-group-card">
                  <label className="field-label" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
                    App Rules
                  </label>
                  <div 
                    className="toggle-control"
                    onClick={() => updateSetting('strictMode', !settings.strictMode)}
                  >
                    <label className="field-label" style={{ cursor: 'pointer', margin: 0 }}>Strict Mode (Block Exits)</label>
                    <div className={`toggle-switch ${settings.strictMode ? 'active' : ''}`} />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeCategory === 'canvas' && (
            <>
              {/* Clock Format Card */}
              <div className="field-group">
                <div className="setting-group-card">
                  <label className="field-label" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
                    Clock Format
                  </label>
                  <div className="field">
                    <select 
                      className="field-select" 
                      value={settings.clockFormat || '12h'} 
                      onChange={e => updateSetting('clockFormat', e.target.value)}
                    >
                      <option value="12h">12-Hour</option>
                      <option value="24h">24-Hour</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Theme Accent Card */}
              <div className="field-group">
                <div className="setting-group-card">
                  <label className="field-label" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
                    Theme Accent
                  </label>
                  <div className="field">
                    <div className="color-swatches" style={{ marginTop: '0.5rem' }}>
                      {ACCENT_COLORS.map(c => (
                        <div 
                          key={c.value} 
                          className={`swatch ${settings.accentColor === c.value ? 'active' : ''}`} 
                          style={{ backgroundColor: c.value }} 
                          onClick={() => updateSetting('accentColor', c.value)} 
                          title={c.name} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
        )}
      </div>
    </div>
  );
}
