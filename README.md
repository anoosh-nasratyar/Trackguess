# 🎵 TrackGuess - Discord Music Guessing Game

Discord Activity that lets you play a music guessing game with Spotify in voice channels.

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Tunnel (Ücretsiz!)

**Seçenek A: LocalTunnel (EN KOLAY - ÖNERİLEN)**

```bash
# LocalTunnel kur
npm install -g localtunnel

# Uygulamayı başlat
npm run dev

# Yeni terminal aç
lt --port 5173

# Verdiği URL'yi kopyala (örn: https://funny-cat-12.loca.lt)
```

**Seçenek B: Cloudflare Tunnel (KALICI DOMAIN)**

Detaylı kurulum için `TUNNEL_SETUP.md` dosyasına bak.

### 3. Environment Dosyalarını Oluştur

**Root `.env` dosyası:**

```env
# Discord (https://discord.com/developers/applications)
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_PUBLIC_KEY=

# Spotify (https://developer.spotify.com/dashboard)
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=https://your-tunnel-url/api/auth/spotify/callback

# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=https://your-tunnel-url

# MongoDB
MONGODB_URI=mongodb://localhost:27017/trackguess

# Security (generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=

# CORS
ALLOWED_ORIGINS=https://your-tunnel-url,https://discord.com
```

**`client/.env` dosyası:**

```env
VITE_DISCORD_CLIENT_ID=
VITE_API_URL=https://your-tunnel-url
```

**⚠️ `your-tunnel-url` yerine LocalTunnel'ın verdiği URL'yi koy!**

### 4. Discord ve Spotify Setup

**Discord Developer Portal:**
1. Create Application → Activities → Enable
2. URL Mappings: `/` → `https://your-tunnel-url`
3. Redirect URI: `https://your-tunnel-url/api/auth/spotify/callback`

**Spotify Developer Dashboard:**
1. Create App
2. Redirect URI: `https://your-tunnel-url/api/auth/spotify/callback`

### 5. Start MongoDB

```bash
mongod
# OR: docker run -d -p 27017:27017 mongo
```

### 6. Run Application

```bash
# Terminal 1: Uygulamayı başlat
npm run dev

# Terminal 2: Tunnel başlat (LocalTunnel örneği)
lt --port 5173
```

## 🎮 How to Play

### As Host:
1. Open Activity in Discord voice channel
2. Connect Spotify account (required)
3. Configure: rounds (5/10/15/20), duration (15-60s), song source
4. Create room and start game

### As Player:
1. Join voice channel
2. Optionally connect Spotify to hear music
3. Type guesses in input field
4. Earn points: Artist (+2), Title (+3), Both (+5)

## 📝 Important Notes

### Tunnel URL Değişirse:

LocalTunnel her başlattığında farklı URL verebilir. URL değişirse:

1. `.env` ve `client/.env` dosyalarını güncelle
2. Discord ve Spotify ayarlarını güncelle
3. Uygulamayı yeniden başlat

### Sabit URL İçin:

```bash
# Subdomain kullan (her zaman aynı URL)
lt --port 5173 --subdomain trackguess
# URL: https://trackguess.loca.lt
```

**Not:** İlk erişimde "click to continue" sayfası gösterebilir (güvenlik).

## 🌐 Tunnel Alternatifleri

Detaylı bilgi için `TUNNEL_SETUP.md` dosyasına bak:

- **LocalTunnel** (EN KOLAY) ✅
- **Cloudflare Tunnel** (Kalıcı domain)
- **serveo.net** (SSH tabanlı)
- **localhost.run** (SSH tabanlı)

Hepsi tamamen ücretsiz!

## 🛠️ Tech Stack

- Backend: Node.js, Express, Socket.IO, MongoDB
- Frontend: React, TypeScript, Vite
- Discord: Embedded App SDK
- Spotify: Web API + Playback SDK

## 🐛 Troubleshooting

**MongoDB connection failed?**
```bash
mongod
```

**Tunnel bağlanamıyor?**
- URL'leri kontrol et (.env dosyaları)
- Discord ve Spotify ayarlarını kontrol et
- Uygulamayı yeniden başlat

**Discord Activity açılmıyor?**
- URL mapping'i kontrol et
- Tunnel çalışıyor mu kontrol et
- Browser console'u kontrol et

## 📁 Project Structure

```
trackguess/
├── client/          # Frontend
├── server/          # Backend
├── TUNNEL_SETUP.md  # Detaylı tunnel kurulum rehberi
├── QUICK_START.md   # Hızlı başlangıç
└── README.md
```

## 📝 License

MIT
