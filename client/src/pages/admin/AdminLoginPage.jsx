import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminLoginPage.css';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem('adminAuth', 'true');
        navigate('/admin/dashboard');
      } else {
        setError(data.message || 'Şifre hatalı!');
      }
    } catch {
      setError('Sunucuya bağlanılamadı. Backend çalışıyor mu?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page page-wrapper">
      <div className="admin-login-container">
        <div className="admin-brand">
          <div className="admin-brand-icon">🛡️</div>
          <h1>Admin Paneli</h1>
          <p>Killayda OSYM Yönetim Sistemi</p>
        </div>

        <div className="card admin-login-card">
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>YÖNETİCİ ŞİFRESİ</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="login-error" style={{ marginBottom: 12 }}>⚠ {error}</div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 14 }} disabled={loading || !password}>
              {loading ? 'Giriş yapılıyor...' : '🔐 Giriş Yap'}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <a href="/" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>← Kullanıcı girişine dön</a>
          </div>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textAlign: 'center' }}>
          Varsayılan şifre: <code style={{ color: 'var(--accent-cyan)' }}>killayda_admin_2024</code>
        </p>
      </div>
    </div>
  );
}
