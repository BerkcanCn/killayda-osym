import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

const KILLAYDA_LOGO = `⚡`;

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      setError('Kullanıcı adı boş bırakılamaz!');
      return;
    }
    if (trimmed.length < 2) {
      setError('Kullanıcı adı en az 2 karakter olmalı!');
      return;
    }

    setLoading(true);
    setError('');

    // Store username in session
    sessionStorage.setItem('username', trimmed);

    // Brief loading for effect
    await new Promise((r) => setTimeout(r, 800));

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
            <p>Twitch veya Discord kullanıcı adını gir</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
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

            {error && (
              <div className="login-error">
                ⚠ {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary login-btn"
              disabled={loading || !username.trim()}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  Giriş yapılıyor...
                </>
              ) : (
                <>🎮 Sınavlara Git</>
              )}
            </button>
          </form>

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
