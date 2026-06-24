import { useState, useEffect } from 'react';
import { auth, db, fbDb } from '../config/firebase';
import { syncToCloud } from '../utils/helpers';

export default function OnboardingScreen({ settings, setSettings, onComplete }) {
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameStatus, setUsernameStatus] = useState('');

  useEffect(() => {
    if (!usernameInput.trim()) {
      setUsernameStatus('');
      return;
    }
    const timer = setTimeout(async () => {
      const val = usernameInput.trim();
      if (val.length < 3 || val.length > 15) {
        setUsernameStatus('error_length');
        return;
      }
      if (!/^[a-z0-9_]+$/.test(val)) {
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
  }, [usernameInput]);

  async function handleSaveUsername() {
    if (usernameStatus !== 'available') return;
    const val = usernameInput.trim();
    try {
      await fbDb.setDoc(fbDb.doc(db, 'usernames', val), { uid: auth.currentUser.uid, original: val });
      const newSettings = { ...settings, username: val, lastUsernameChange: Date.now() };
      setSettings(newSettings);
      localStorage.setItem('focus_settings', JSON.stringify(newSettings));
      syncToCloud();
      onComplete();
    } catch (error) {
      alert("Network error. Please try again.");
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#121212', color: '#ffffff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Premium Animations Injected */}
      <style>
        {`
          @keyframes fadeSlideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .auth-card {
            animation: fadeSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .anim-input {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .anim-input:focus {
            box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.15);
            transform: translateY(-1px);
          }
          .anim-btn {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .anim-btn.active:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 15px rgba(76, 175, 80, 0.25);
            filter: brightness(1.05);
          }
          .anim-btn.active:active {
            transform: translateY(0);
            box-shadow: 0 2px 5px rgba(76, 175, 80, 0.2);
          }
          @keyframes slideInText {
            from { opacity: 0; transform: translateX(-10px); }
            to { opacity: 1; transform: translateX(0); }
          }
          .status-text {
            animation: slideInText 0.3s ease forwards;
          }
        `}
      </style>

      <div className="auth-card" style={{ backgroundColor: '#1E1E1E', border: '1px solid #2C2C2C', borderRadius: '16px', padding: '2.5rem 2rem', width: '90%', maxWidth: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', textAlign: 'center' }}>
        
        <div style={{ width: '48px', height: '48px', backgroundColor: '#2A2A2A', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', border: '1px solid #333' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>
        
        <h1 style={{ fontSize: '1.5rem', fontWeight: '600', margin: '0 0 0.5rem' }}>Choose a Username</h1>
        <p style={{ color: '#A0A0A0', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: '1.5' }}>
          Set up your unique profile handle for the leaderboard.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', textAlign: 'left' }}>
          <input
            className="anim-input"
            type="text"
            value={usernameInput}
            onChange={e => { 
              const cleanValue = e.target.value.replace(/\s+/g, '').toLowerCase();
              setUsernameInput(cleanValue); 
              setUsernameStatus(''); 
            }}
            placeholder="e.g. detox_user"
            style={{ width: '100%', padding: '12px 16px', backgroundColor: '#2A2A2A', border: `1px solid ${usernameStatus === 'available' ? '#4CAF50' : (usernameStatus.startsWith('error') || usernameStatus === 'taken') ? '#FF5252' : '#333'}`, borderRadius: '8px', color: '#fff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
          />

          <div style={{ fontSize: '0.85rem', minHeight: '20px', paddingLeft: '4px' }}>
            {usernameStatus === 'checking' && <span className="status-text" style={{ color: '#A0A0A0' }}>Checking availability...</span>}
            {usernameStatus === 'available' && <span className="status-text" style={{ color: '#4CAF50' }}>Username is available</span>}
            {usernameStatus === 'taken' && <span className="status-text" style={{ color: '#FF5252' }}>Username is already taken</span>}
            {usernameStatus === 'error_length' && <span className="status-text" style={{ color: '#FF5252' }}>Must be 3-15 characters</span>}
            {usernameStatus === 'error_invalid' && <span className="status-text" style={{ color: '#FF5252' }}>Letters, numbers & underscores only</span>}
          </div>

          <button
            className={`anim-btn ${usernameStatus === 'available' ? 'active' : ''}`}
            onClick={handleSaveUsername}
            disabled={usernameStatus !== 'available'}
            style={{ width: '100%', padding: '12px', backgroundColor: usernameStatus === 'available' ? '#4CAF50' : '#2A2A2A', color: usernameStatus === 'available' ? '#ffffff' : '#666', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: usernameStatus === 'available' ? 'pointer' : 'not-allowed', marginTop: '0.5rem' }}
          >
            Save Username
          </button>
        </div>
      </div>
    </div>
  );
}
