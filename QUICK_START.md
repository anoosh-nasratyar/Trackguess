# ⚡ Quick Start Guide

## 🎯 3 Adımda Başla

### 1. LocalTunnel Kur (Ücretsiz!)

```bash
npm install -g localtunnel
```

### 2. Uygulamayı Başlat

```bash
# Dependencies yükle
npm install

# MongoDB başlat
mongod

# Uygulamayı başlat
npm run dev
```

### 3. Tunnel Aç

```bash
# Yeni terminal aç
lt --port 5173

# Verilen URL'yi kopyala
# Örnek: https://funny-cat-12.loca.lt
```

---

## 📝 Environment Setup

### `.env` Oluştur (Root)

```env
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_PUBLIC_KEY=

SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=https://YOUR-TUNNEL-URL/api/auth/spotify/callback

PORT=3000
NODE_ENV=development
FRONTEND_URL=https://YOUR-TUNNEL-URL

MONGODB_URI=mongodb://localhost:27017/trackguess

JWT_SECRET=

ALLOWED_ORIGINS=https://YOUR-TUNNEL-URL,https://discord.com
```

### `client/.env` Oluştur

```env
VITE_DISCORD_CLIENT_ID=
VITE_API_URL=https://YOUR-TUNNEL-URL
```

**⚠️ `YOUR-TUNNEL-URL` yerine LocalTunnel'ın verdiği URL'yi yaz!**

---

## 🔑 Discord & Spotify Setup

### Discord:
1. https://discord.com/developers/applications
2. Create app → Activities → Enable
3. URL Mapping: `/` → `https://YOUR-TUNNEL-URL`

### Spotify:
1. https://developer.spotify.com/dashboard
2. Create app
3. Redirect URI: `https://YOUR-TUNNEL-URL/api/auth/spotify/callback`

---

## 🚀 Çalıştır

```bash
# Terminal 1
npm run dev

# Terminal 2
lt --port 5173
```

---

## 💡 Tips

### Sabit URL İstersen:

```bash
lt --port 5173 --subdomain trackguess
# Her zaman: https://trackguess.loca.lt
```

### URL Değişirse:

1. `.env` ve `client/.env` güncelle
2. Discord ve Spotify'da güncelle
3. Uygulamayı restart et

### JWT_SECRET Oluştur:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📚 Daha Fazla Bilgi

- **Tunnel alternatifleri:** `TUNNEL_SETUP.md`
- **Detaylı döküman:** `README.md`

---

🎉 Hazırsın! Discord'da test et!
