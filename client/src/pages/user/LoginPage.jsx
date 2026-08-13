import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KICK_CLIENT_ID, buildAuthorizeUrl } from '../../lib/kickAuth';
import { randomString, sha256Challenge } from '../../lib/pkce';
import './LoginPage.css';

const KILLAYDA_LOGO = `⚡`;

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showGuest, setShowGuest] = useState(false);
  const navigate = useNavigate();

  // Kick OAuth 2.1 + PKCE akışını başlatır
  const handleKickLogin = async () => {
    if (!KICK_CLIENT_ID) {
      setError('Kick Client ID tanımlı değil (client/.env → VITE_KICK_CLIENT_ID).');
      return;
    }
    setLoading(true);
    setError('');

    const codeVerifier = randomString(64);
    const codeChallenge = await sha256Challenge(codeVerifier);
    const state = randomString(32);

    // PKCE verifier ve state'i callback'te doğrulamak için sakla
    sessionStorage.setItem('kick_pkce_verifier', codeVerifier);
    sessionStorage.setItem('kick_oauth_state', state);

    // Kick yetkilendirme sayfasına yönlendir
    window.location.href = buildAuthorizeUrl({ state, codeChallenge });
  };

  // Geliştirme/test için Kick olmadan giriş
  const handleGuestSubmit = async (e) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (trimmed.length < 2) {
      setError('Kullanıcı adı en az 2 karakter olmalı!');
      return;
    }

    setLoading(true);
    setError('');
    sessionStorage.setItem('username', trimmed);
    await new Promise((r) => setTimeout(r, 400));
    setLoading(false);
    navigate('/exams');
  };

  return (
    <div className="login-page">
      <div className="login-bg-particles">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="particle" style={{
            '--delay': `${Math.random() * 5}s`,
            '--x': `${Math.random() * 100}%`,
            '--size': `${Math.random() * 4 + 1}px`,
            '--duration': `${Math.random() * 3 + 2}s`,
          }} />
        ))}
      </div>

      <div className="login-container">
        {/* Logo / Brand */}
        <div className="login-brand">
          <div className="brand-icon neon-border">{KILLAYDA_LOGO}</div>
          <h1 className="gradient-text">KILLAYDA OSYM</h1>
          <p className="brand-tagline">Kemik Kadro Lore Sınavı</p>
        </div>

        {/* Card */}
        <div className="login-card card">
          <div className="login-card-header">
            <h2>Sınava Giriş</h2>
            <p>Devam etmek için Kick hesabınla giriş yap</p>
          </div>

          {error && (
            <div className="login-error" style={{ marginBottom: 16 }}>
              ⚠ {error}
            </div>
          )}

          {/* Kick ile giriş — ana yöntem */}
          <button
            type="button"
            className="btn login-btn kick-login-btn"
            onClick={handleKickLogin}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                Yönlendiriliyor...
              </>
            ) : (
              <>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M3 3h5v5h2V6h2V4h2V3h5v6h-2v2h-2v2h2v2h2v6h-5v-1h-2v-2h-2v-2H8v5H3V3z" />
                </svg>
                Kick ile Giriş Yap
              </>
            )}
          </button>

          {/* Geliştirme/test için misafir girişi */}
          <div className="guest-toggle">
            <button type="button" className="guest-link" onClick={() => setShowGuest((v) => !v)}>
              {showGuest ? 'Gizle' : 'Misafir olarak devam et (test)'}
            </button>
          </div>

          {showGuest && (
            <form onSubmit={handleGuestSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="username">KULLANICI ADI</label>
                <input
                  id="username"
                  className="form-input"
                  type="text"
                  placeholder="örn: KemikFanatic99"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(''); }}
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={32}
                />
              </div>
              <button
                type="submit"
                className="btn btn-secondary login-btn"
                disabled={loading || !username.trim()}
              >
                🎮 Misafir Girişi
              </button>
            </form>
          )}

          <div className="login-footer">
            <span className="badge badge-purple">KemikKadro Only 💀</span>
          </div>
        </div>

        <div className="login-hint">
          <span>Admin misin?</span>
          <a href="/admin" style={{ color: 'var(--accent-cyan)', marginLeft: 6 }}>
            Admin Paneli →
          </a>
        </div>
      </div>
    </div>
  );
}
