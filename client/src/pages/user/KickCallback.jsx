import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRedirectUri } from '../../lib/kickAuth';
import './LoginPage.css';

// Kick'ten dönülen adres: /auth/kick/callback?code=...&state=...
// Burada state doğrulanır, code backend'e gönderilip kullanıcı bilgisi alınır.
export default function KickCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const ran = useRef(false); // React 18 StrictMode çift-çalıştırmasına karşı

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const returnedState = params.get('state');
    const oauthError = params.get('error');

    const storedState = sessionStorage.getItem('kick_oauth_state');
    const codeVerifier = sessionStorage.getItem('kick_pkce_verifier');

    if (oauthError) { setError(`Kick girişi reddedildi: ${oauthError}`); return; }
    if (!code) { setError('Yetkilendirme kodu bulunamadı.'); return; }
    if (!returnedState || returnedState !== storedState) {
      setError('Güvenlik doğrulaması başarısız (state uyuşmuyor).');
      return;
    }
    if (!codeVerifier) { setError('PKCE doğrulayıcısı bulunamadı, tekrar deneyin.'); return; }

    (async () => {
      try {
        const res = await fetch('/api/auth/kick/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, codeVerifier, redirectUri: getRedirectUri() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Giriş başarısız');

        // Oturum bilgisi — uygulama username üzerinden ilerliyor
        sessionStorage.setItem('username', data.username);
        if (data.email) sessionStorage.setItem('kick_email', data.email);
        if (data.avatar) sessionStorage.setItem('kick_avatar', data.avatar);
        if (data.userId) sessionStorage.setItem('kick_user_id', String(data.userId));

        // Tek kullanımlık PKCE/state verilerini temizle
        sessionStorage.removeItem('kick_pkce_verifier');
        sessionStorage.removeItem('kick_oauth_state');

        navigate('/exams', { replace: true });
      } catch (e) {
        setError(e.message);
      }
    })();
  }, [navigate]);

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card card" style={{ textAlign: 'center' }}>
          {error ? (
            <>
              <h2 style={{ color: '#f87171' }}>⚠ Giriş Hatası</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>{error}</p>
              <button
                className="btn btn-secondary"
                style={{ marginTop: 20 }}
                onClick={() => navigate('/', { replace: true })}
              >
                ← Girişe Dön
              </button>
            </>
          ) : (
            <>
              <div className="spinner" style={{ margin: '0 auto' }} />
              <p style={{ marginTop: 16, color: 'var(--text-muted)' }}>
                Kick ile giriş yapılıyor...
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
