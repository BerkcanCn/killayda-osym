// Kick OAuth 2.1 yapılandırması ve authorize URL'i.
// Client ID herkese açıktır; frontend'e girmesi güvenlidir.
// Client Secret ASLA burada olmamalı — sadece backend'de kullanılır.

export const KICK_CLIENT_ID = import.meta.env.VITE_KICK_CLIENT_ID || '';

// Giriş için tek gereken scope: kullanıcı bilgisi (e-posta dahil).
export const KICK_SCOPE = 'user:read';

export const KICK_AUTHORIZE_URL = 'https://id.kick.com/oauth/authorize';

// Redirect URI, Kick uygulama panelinde kayıtlı adresle BİREBİR aynı olmalı.
// origin'e göre dinamik: localhost'ta ve prod domaininde otomatik çalışır
// (her iki adres de Kick panelinde kayıtlı olmak kaydıyla).
export function getRedirectUri() {
  return `${window.location.origin}/auth/kick/callback`;
}

export function buildAuthorizeUrl({ state, codeChallenge }) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: KICK_CLIENT_ID,
    redirect_uri: getRedirectUri(),
    scope: KICK_SCOPE,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `${KICK_AUTHORIZE_URL}?${params.toString()}`;
}
