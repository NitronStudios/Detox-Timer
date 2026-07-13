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
    <div className="login-screen-container">
      <style>
        {`
          .login-screen-container {
            --bg: #0d0d0e;
            --ink: #e4e4e7;
            --accent: #4CAF50;
            --ink-faint: rgba(228, 228, 231, 0.1);
            --ink-medium: rgba(228, 228, 231, 0.6);
            --card-bg: #18181b;
            background-color: var(--bg);
            color: var(--ink);
            font-family: 'Inter', sans-serif;
            min-height: 100dvh;
            display: flex;
            flex-direction: column;
            -webkit-font-smoothing: antialiased;
            overflow-y: auto;
          }

          .app-shell {
            display: grid;
            grid-template-columns: 1fr 480px;
            min-height: 100dvh;
            width: 100%;
          }

          /* Cinematic Left Panel */
          .hero-panel {
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            text-align: center;
            padding: 4rem;
            border-right: 1px solid var(--ink-faint);
            background: radial-gradient(circle at 50% 30%, rgba(76, 175, 80, 0.05) 0%, transparent 40%);
            background-color: var(--bg);
            overflow: hidden;
          }

          .meta-data {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.65rem;
            text-transform: uppercase;
            letter-spacing: 0.2em;
            color: var(--accent);
            font-weight: 700;
          }

          .main-headline {
            font-family: 'Syne', sans-serif;
            font-size: clamp(4rem, 10vw, 9rem);
            line-height: 0.85;
            letter-spacing: -0.05em;
            text-transform: uppercase;
            margin-top: 185px;
            margin-bottom: 2rem;
            font-weight: 800;
          }

          .hero-footer {
            display: flex;
            align-self: flex-start;
            text-align: left;
            width: 100%;
            z-index: 10;
          }

          .desc-text {
            max-width: 340px;
            font-size: 0.85rem;
            line-height: 1.6;
            color: var(--ink-medium);
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          /* Structured Right Panel */
          .auth-panel {
            background-color: var(--bg);
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 4rem;
            position: relative;
          }

          .auth-panel::before {
            content: "";
            position: absolute;
            inset: 0;
            background-image: linear-gradient(var(--ink-faint) 1px, transparent 1px), linear-gradient(to right, var(--ink-faint) 1px, transparent 1px);
            background-size: 40px 40px;
            opacity: 0.3;
            pointer-events: none;
          }

          .form-container {
            position: relative;
            z-index: 1;
            width: 100%;
          }

          .form-header {
            margin-bottom: 2.5rem;
          }

          .form-header h1 {
            font-family: 'Syne', sans-serif;
            font-size: 2.5rem;
            text-transform: uppercase;
            margin-bottom: 0.75rem;
            font-weight: 800;
            letter-spacing: -0.02em;
          }

          .form-header p {
            color: var(--ink-medium);
            font-size: 0.95rem;
            line-height: 1.5;
          }

          .input-group {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            margin-bottom: 1.5rem;
          }

          .field-label {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.65rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--ink-medium);
            font-weight: 700;
            display: block;
            margin-bottom: 0.25rem;
          }

          .input-control {
            background: var(--card-bg);
            border: 1px solid var(--ink-faint);
            padding: 1rem;
            color: var(--ink);
            font-family: 'Inter', sans-serif;
            font-size: 0.95rem;
            outline: none;
            transition: border-color 0.2s, box-shadow 0.2s;
            width: 100%;
            box-sizing: border-box;
          }

          .input-control:focus {
            border-color: var(--accent);
            box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
          }

          .btn {
            width: 100%;
            padding: 1.1rem;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.8rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            cursor: pointer;
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            transition: transform 0.1s, opacity 0.2s, background-color 0.2s;
          }

          .btn-primary {
            background-color: var(--accent);
            color: white;
          }

          .btn-secondary {
            background-color: transparent;
            border: 1px solid var(--ink-faint);
            color: var(--ink);
            margin-top: 1rem;
          }

          .btn:hover:not(:disabled) {
            opacity: 0.9;
          }

          .btn:active:not(:disabled) {
            transform: scale(0.98);
          }

          .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .separator {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin: 2rem 0;
          }

          .line {
            flex: 1;
            height: 1px;
            background: var(--ink-faint);
          }

          .sep-text {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.6rem;
            color: var(--ink-medium);
            font-weight: 700;
          }

          .switch-link {
            margin-top: 2.5rem;
            text-align: center;
            font-size: 0.85rem;
            color: var(--ink-medium);
          }

          .switch-link span {
            color: var(--accent);
            font-weight: 600;
            cursor: pointer;
            text-decoration: underline;
            transition: color 0.2s;
          }

          .switch-link span:hover {
            color: #3d8b41;
          }

          .decoration-svg {
            position: absolute;
            top: 50%;
            right: -100px;
            transform: translateY(-50%);
            pointer-events: none;
            opacity: 0.12;
            animation: spin 60s linear infinite;
          }

          @keyframes spin {
            from { transform: translateY(-50%) rotate(0deg); }
            to { transform: translateY(-50%) rotate(360deg); }
          }

          .error-container {
            background: rgba(255, 59, 48, 0.1);
            border: 1px solid #ff3b30;
            padding: 0.8rem 1rem;
            margin-bottom: 1.2rem;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            color: #ff3b30;
            display: flex;
            align-items: flex-start;
            gap: 8px;
            font-weight: 700;
          }

          @media (max-width: 1000px) {
            .app-shell {
              grid-template-columns: 1fr;
            }
            .hero-panel {
              display: none;
            }
            .auth-panel {
              padding: 2.5rem 1.5rem;
            }
          }
        `}
      </style>

      <div className="app-shell">
        <section className="hero-panel">
          <h1 className="main-headline">
            Detox<br />Timer
          </h1>
          <div className="hero-footer">
            <p className="desc-text">Flip clock study timer with Pomodoro & analytics dashboard.</p>
          </div>
        </section>

        <section className="auth-panel">
          <div className="form-container">
            <header className="form-header">
              <h1>{isSignUp ? 'Sign Up' : 'Log In'}</h1>
              <p>
                {isSignUp
                  ? 'Create an account to start tracking, syncing, and building healthy focus streaks across your devices.'
                  : 'Login to sync your focus sessions and access your study dashboard across devices.'
                }
              </p>
            </header>

            {error && (
              <div className="error-container">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: '2px' }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleEmailAuth}>
              <div className="input-group">
                <input
                  type="email"
                  className="input-control"
                  placeholder="Email Address"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
                <input
                  type="password"
                  className="input-control"
                  placeholder="Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  style={{ marginTop: '0.75rem' }}
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                <span>{loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Log In')}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
            </form>

            <div className="separator">
              <div className="line"></div>
              <div className="sep-text">OR CONTINUE WITH</div>
              <div className="line"></div>
            </div>

            <button className="btn btn-secondary" onClick={handleGoogleLogin} disabled={loading}>
              <img width="16" height="16" src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" />
              <span>Google Account</span>
            </button>



            <p className="switch-link">
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <span onClick={() => setIsSignUp(!isSignUp)}>
                {isSignUp ? 'Log In' : 'Sign Up'}
              </span>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
