import { useState } from 'react';
import { auth, fbAuth, googleProvider } from '../config/firebase';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

export default function LoginScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const result = await FirebaseAuthentication.signInWithGoogle();
        const idToken = result.credential?.idToken;

        if (!idToken) {
          throw new Error('Google Sign-In did not return an idToken.');
        }

        const credential = GoogleAuthProvider.credential(idToken);
        await fbAuth.signInWithCredential(auth, credential);
      } else {
        await fbAuth.signInWithPopup(auth, googleProvider);
      }
    } catch (err) {
      console.error("Google Login Error:", err);
      setError(err.message || 'Google Login failed');
    } finally {
      setLoading(false);
    }
  };

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
            border-color: #4CAF50 !important;
            box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.15);
            transform: translateY(-1px);
          }
          .anim-btn {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .anim-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 15px rgba(76, 175, 80, 0.25);
            filter: brightness(1.05);
          }
          .anim-btn:active:not(:disabled) {
            transform: translateY(0);
            box-shadow: 0 2px 5px rgba(76, 175, 80, 0.2);
          }
          .google-btn {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .google-btn:hover {
            background-color: #333 !important;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          }
          .google-btn:active {
            transform: translateY(0);
          }
          .toggle-text {
            transition: color 0.2s ease;
          }
          .toggle-text:hover {
            color: #66BB6A !important;
          }
        `}
      </style>

      <div className="auth-card" style={{ backgroundColor: '#1E1E1E', border: '1px solid #2C2C2C', borderRadius: '16px', padding: '2.5rem 2rem', width: '90%', maxWidth: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        
        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '48px', height: '48px', backgroundColor: '#2A2A2A', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', border: '1px solid #333' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '600', margin: '0 0 0.5rem' }}>Detox Timer</h1>
          <p style={{ color: '#A0A0A0', fontSize: '0.9rem', margin: 0 }}>Login to sync your focus sessions</p>
        </div>

        <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <input className="anim-input" type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required
              style={{ width: '100%', padding: '12px 16px', backgroundColor: '#2A2A2A', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
            />
            <input className="anim-input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required
              style={{ width: '100%', padding: '12px 16px', backgroundColor: '#2A2A2A', border: '1px solid #333', borderRadius: '8px', color: '#fff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {error && <p style={{ color: '#FF5252', fontSize: '0.85rem', margin: '0', textAlign: 'center', animation: 'fadeSlideUp 0.3s ease' }}>{error}</p>}

          <button className="anim-btn" type="submit" disabled={loading}
            style={{ width: '100%', padding: '12px', backgroundColor: '#4CAF50', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '0.5rem', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Log In')}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0', color: '#666', fontSize: '0.8rem', fontWeight: '500' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#333' }}></div>
          <span style={{ padding: '0 1rem' }}>OR</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#333' }}></div>
        </div>

        <button className="google-btn" onClick={handleGoogleLogin} disabled={loading}
          style={{ width: '100%', padding: '12px', backgroundColor: '#2A2A2A', color: '#E0E0E0', border: '1px solid #333', borderRadius: '8px', fontSize: '0.95rem', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '18px', height: '18px' }} />
          Continue with Google
        </button>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: '#A0A0A0' }}>
          {isSignUp ? "Already have an account?" : "Don't have an account?"} {' '}
          <span className="toggle-text" onClick={() => setIsSignUp(!isSignUp)} style={{ color: '#4CAF50', cursor: 'pointer', fontWeight: '500' }}>
            {isSignUp ? 'Log In' : 'Sign Up'}
          </span>
        </p>

      </div>
    </div>
  );
}
