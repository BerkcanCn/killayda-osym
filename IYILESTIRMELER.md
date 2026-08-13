# Killayda OSYM — İyileştirmeler

Bu belge, projeye yapılan iki ana iyileştirmeyi ve ilgili teknik detayları özetler.

> Tarih: 2026-08-14

---

## 1) Sınav sorularının rastgele gelmesi + havuzdan 10 soru seçimi

### Problem
Sorular her sınavda **sıralı** geliyordu. İstenen: her oturumda soru havuzundan **rastgele 10 soru** ve **karışık sırada** sunulması.

### Çözüm
Randomizasyon **server tarafında, oturum başlangıcında** yapılır. Böylece her session'a özel bir alt küme seçilir ve puanlama da bu alt küme üzerinden hesaplanır.

- **Seçim algoritması:** Soruların sıra numaraları (index) bir diziye alınır, **Fisher–Yates** ile karıştırılır, ilk 10 tanesi soruya çevrilir. Havuz 10'dan küçükse tamamı (karışık sırada) döner.
- Seçilen sorular session dokümanına (`questions`) kaydedilir.
- **Puanlama düzeltmesi:** Skor artık tüm havuz değil, o oturuma **servis edilen sorular** üzerinden hesaplanır. (Bu düzeltilmeseydi skorlar 10 yerine toplam soru sayısı üzerinden çıkardı.)

### Değişen dosyalar
| Dosya | Değişiklik |
|-------|-----------|
| `server/routes/sessions.js` | `pickRandomQuestions()` helper'ı; `POST /start` havuzdan 10 rastgele soru seçip session'a kaydeder; `POST /:sessionId/complete` puanlamayı servis edilen sorulara göre yapar |
| `client/src/pages/user/ExamPage.jsx` | Sınav, `/api/exams` yerine session'ın döndürdüğü rastgele alt kümeyi gösterir; ilerleme/socket sayaçları bu 10'a göre |

### Ayar
`server/routes/sessions.js` içindeki sabit:
```js
const QUESTIONS_PER_SESSION = 10; // oturum başına soru sayısı
```

### Notlar
- Cevaplar soru `id`'sine göre eşleştiği için sıra puanlamayı etkilemez.
- Puanlamanın 10 üzerinden olması için oturumun Firestore'a yazılması gerekir. Firebase yoksa (demo mod) oturum saklanmadığından, `complete` yalnızca **cevaplanan** sorular üzerinden puanlar (yine doğru sonuç verir).

---

## 2) "Kick ile Giriş Yap" (OAuth 2.1 + PKCE)

### Amaç
Login ekranında elle kullanıcı adı yazmak yerine **Kick hesabıyla giriş**. Kick'in resmî OAuth 2.1 akışı kullanılır (PKCE zorunlu).

### Akış
```
[Kick ile Giriş Yap]
  → id.kick.com/oauth/authorize (PKCE code_challenge ile)
  → kullanıcı onaylar
  → /auth/kick/callback?code=...&state=...
  → backend: code + code_verifier → access_token → kullanıcı bilgisi
  → username sessionStorage'a yazılır → /exams
```

### Kick endpoint'leri
- Authorize: `https://id.kick.com/oauth/authorize`
- Token: `https://id.kick.com/oauth/token`
- Kullanıcı: `GET https://api.kick.com/public/v1/users` → `data[0].{ user_id, name, email, profile_picture }`
- Scope: **`user:read`** (e-posta dahil kullanıcı bilgisi)

### Yeni dosyalar
| Dosya | Görev |
|-------|-------|
| `client/src/lib/pkce.js` | PKCE code_verifier / S256 code_challenge üretimi |
| `client/src/lib/kickAuth.js` | Client ID, scope, redirect URI ve authorize URL kurulumu |
| `client/src/pages/user/KickCallback.jsx` | `/auth/kick/callback` — state doğrular, code'u backend'e gönderir, girişi tamamlar |
| `server/routes/auth.js` | `POST /api/auth/kick/callback` — code→token→kullanıcı değişimi (Client Secret sadece burada) |

### Değişen dosyalar
| Dosya | Değişiklik |
|-------|-----------|
| `client/src/pages/user/LoginPage.jsx` | "Kick ile Giriş Yap" ana butonu + PKCE başlatma; test için "Misafir girişi" |
| `client/src/pages/user/LoginPage.css` | Kick butonu (marka yeşili) ve misafir bağlantısı stilleri |
| `client/src/App.jsx` | `/auth/kick/callback` rotası |
| `server/server.js` | `/api/auth` router'ı bağlandı |

### Ortam değişkenleri (.env)
`client/.env`:
```bash
VITE_KICK_CLIENT_ID=<kick_client_id>   # herkese açık, frontend'e girer
```
`server/.env`:
```bash
KICK_CLIENT_ID=<kick_client_id>
KICK_CLIENT_SECRET=<kick_client_secret>   # GİZLİ — sadece backend
```

### Kick Geliştirici Modu ayarı
- **Redirect URL** (birebir eşleşmeli): `http://localhost:5173/auth/kick/callback` (yerel) ve prod domaini için `https://<domain>/auth/kick/callback`
- **Scope:** yalnızca "Kullanıcı bilgilerini okuyun (e-posta adresi dahil)" = `user:read`
- Webhooks: kapalı

### Güvenlik
- **Client Secret asla frontend'de veya `.env.example`'da bulunmamalı.** Yalnızca `server/.env` (gitignore'lu) içinde.
- PKCE state, callback'te CSRF'e karşı doğrulanır.
- `.env.example` dosyaları yalnızca **placeholder** içerir.

---

## Deployment notları
- **Frontend (Vercel):** `VITE_KICK_CLIENT_ID` environment değişkenini ekle; Vercel domainini Kick panelinde redirect olarak kaydet.
- **Backend (Render):** `KICK_CLIENT_ID` + `KICK_CLIENT_SECRET` ekle. Token değişimi `fetch` kullandığından **Node 18+** gerekir.
- `client/vercel.json` `/api/*`'i Render'a proxy'ler; SPA fallback callback rotasını da kapsar.

## Yerel çalıştırma
```bash
cd server && npm install && npm run dev   # http://localhost:3001
```
```bash
cd client && npm install && npm run dev   # http://localhost:5173
```

## Test
- **Rastgele soru:** `POST /api/sessions/start`'ı birkaç kez çağır → her seferinde farklı 10'lu set/sıra. Puanlama servis edilen 10 üzerinden.
- **Kick girişi:** http://localhost:5173 → "Kick ile Giriş Yap" → Kick onayı → otomatik `/exams`. (Gerçek Kick hesabı gerektirir.)
- **Creds'siz test:** "Misafir olarak devam et" ile eski akış.
