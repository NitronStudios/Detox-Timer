import { useState } from 'react';
import { auth, fbAuth, googleProvider } from '../config/firebase';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { GoogleAuthProvider } from 'firebase/auth';

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    setLoading(true);
    try {
      if (Capacitor.isNativePlatform()) {
        // Native Android: use official Firebase Capacitor plugin
        const result = await FirebaseAuthentication.signInWithGoogle();
        const idToken = result.credential?.idToken;

        if (!idToken) {
          throw new Error('Google Sign-In did not return an idToken.');
        }

        const credential = GoogleAuthProvider.credential(idToken);
        await fbAuth.signInWithCredential(auth, credential);
      } else {
        // Web browser: use standard popup
        await fbAuth.signInWithPopup(auth, googleProvider);
      }
    } catch (error) {
      console.error('Login Error:', error);
      alert('Login failed: ' + (error.message || JSON.stringify(error)));
      setLoading(false);
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text)' }}>
      <div style={{ background: 'var(--card)', padding: '3rem', borderRadius: '16px', border: '1px solid var(--border)', textAlign: 'center', maxWidth: '400px', width: '90%' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--text)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', fontSize: '2rem', fontWeight: '800' }}>
          D
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>DETOX TIMER</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2.5rem', lineHeight: '1.5' }}>Sync your focus sessions, track consistency, and build habits across all your devices.</p>
        
        <button 
          onClick={handleGoogleLogin} 
          disabled={loading}
          style={{ width: '100%', padding: '0.85rem', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
        >
          {loading ? 'Connecting...' : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              Continue with Google
            </>
          )}
        </button>
      </div>
    </div>
  );
}
