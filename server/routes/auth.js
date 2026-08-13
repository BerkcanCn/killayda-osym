const express = require('express');
const router = express.Router();

// POST /api/auth/kick/callback
// Frontend, Kick'ten dönen authorization code'u (ve PKCE code_verifier'ı) buraya gönderir.
// Burada code -> access_token değişimi (client_secret ile) ve kullanıcı bilgisi çekimi yapılır.
router.post('/kick/callback', async (req, res) => {
  try {
    const { code, codeVerifier, redirectUri } = req.body;
    if (!code || !codeVerifier || !redirectUri) {
      return res.status(400).json({ error: 'code, codeVerifier ve redirectUri gerekli' });
    }

    const clientId = process.env.KICK_CLIENT_ID;
    const clientSecret = process.env.KICK_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return res.status(500).json({
        error: 'Sunucuda KICK_CLIENT_ID / KICK_CLIENT_SECRET tanımlı değil (.env)',
      });
    }

    // 1) Authorization code -> access token
    const tokenRes = await fetch('https://id.kick.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
        code,
      }),
    });

    const tokenData = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !tokenData.access_token) {
      return res.status(401).json({ error: 'Kick token alınamadı', detail: tokenData });
    }

    // 2) Access token -> kullanıcı bilgisi (user:read scope'u ile)
    const userRes = await fetch('https://api.kick.com/public/v1/users', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
      },
    });

    const userJson = await userRes.json().catch(() => ({}));
    if (!userRes.ok) {
      return res.status(401).json({ error: 'Kick kullanıcı bilgisi alınamadı', detail: userJson });
    }

    const user = (userJson.data && userJson.data[0]) || {};
    if (!user.name) {
      return res.status(502).json({ error: 'Kick beklenmeyen kullanıcı yanıtı', detail: userJson });
    }

    res.json({
      username: user.name,
      email: user.email || '',
      userId: user.user_id || null,
      avatar: user.profile_picture || '',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
