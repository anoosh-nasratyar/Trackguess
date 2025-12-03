# 🌐 Ücretsiz Tunnel Kurulumu

Discord Activity için localhost'u internete açmak üzere **tamamen ücretsiz** yöntemler.

---

## ⭐ Yöntem 1: Cloudflare Tunnel (ÖNERİLEN)

### ✅ Avantajlar:
- Tamamen ücretsiz
- Limit yok
- Hızlı ve güvenilir
- Kalıcı domain

### 📥 Kurulum:

#### Windows:
```powershell
# Download
https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe

# Dosyayı cloudflared.exe olarak yeniden adlandır
# C:\Windows\System32 klasörüne kopyala (veya PATH'e ekle)
```

#### Mac/Linux:
```bash
brew install cloudflare/cloudflare/cloudflared
```

### 🚀 Kullanım:

**1. Cloudflare hesabı oluştur (ücretsiz):**
- https://dash.cloudflare.com/sign-up

**2. Login ol:**
```powershell
cloudflared tunnel login
```

**3. Tunnel oluştur:**
```powershell
cloudflared tunnel create trackguess
```

**4. Config dosyası oluştur:**

`%USERPROFILE%\.cloudflared\config.yml` (Windows)  
`~/.cloudflared/config.yml` (Mac/Linux)

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: C:\Users\YourUser\.cloudflared\YOUR_TUNNEL_ID.json

ingress:
  - hostname: trackguess.yourdomain.com
    service: http://localhost:5173
  - service: http_status:404
```

**5. DNS ekle:**
```powershell
cloudflared tunnel route dns trackguess trackguess.yourdomain.com
```

**6. Tunnel'ı başlat:**
```powershell
cloudflared tunnel run trackguess
```

---

## 🚀 Yöntem 2: LocalTunnel (EN KOLAY)

### ✅ Avantajlar:
- Çok kolay
- Kurulum gerektirmez
- Hemen çalışır

### ⚠️ Dezavantajlar:
- Her seferinde farklı URL
- Bazen yavaş olabilir

### 📥 Kurulum:

```powershell
npm install -g localtunnel
```

### 🚀 Kullanım:

```powershell
# Uygulamayı başlat
npm run dev

# Yeni terminalde tunnel aç
lt --port 5173 --subdomain trackguess
```

Örnek URL: `https://trackguess.loca.lt`

**Not:** İlk erişimde "click to continue" sayfası gösterir (güvenlik için).

---

## 🔧 Yöntem 3: serveo.net (SSH TABANLI)

### ✅ Avantajlar:
- Tamamen ücretsiz
- Kurulum gerektirmez
- SSH ile çalışır

### 🚀 Kullanım:

```powershell
# Windows'da Git Bash veya WSL kullan
ssh -R 80:localhost:5173 serveo.net
```

Otomatik URL verir. Örnek: `https://random.serveo.net`

---

## 🎯 Yöntem 4: localhost.run

### 🚀 Kullanım:

```powershell
ssh -R 80:localhost:5173 localhost.run
```

---

## 📝 Hangi Yöntemi Seçmeli?

| Yöntem | Zorluk | Hız | Kalıcılık | Önerilen |
|--------|--------|-----|-----------|----------|
| **Cloudflare Tunnel** | Orta | ⭐⭐⭐⭐⭐ | Kalıcı domain | ✅ |
| **LocalTunnel** | Kolay | ⭐⭐⭐ | Değişken URL | ✅ Hızlı test için |
| **serveo.net** | Kolay | ⭐⭐⭐ | Değişken URL | ✅ |
| **localhost.run** | Kolay | ⭐⭐⭐ | Değişken URL | ✅ |

---

## 🎮 EN HIZLI ÇÖZÜM: LocalTunnel

```powershell
# 1. LocalTunnel kur
npm install -g localtunnel

# 2. Uygulamayı başlat
npm run dev

# 3. Yeni terminal aç ve tunnel başlat
lt --port 5173

# Verdiği URL'yi kopyala (örn: https://funny-cat-12.loca.lt)
```

**Sonra:**
1. Bu URL'yi `.env` dosyalarında kullan
2. Discord Developer Portal'da güncelle
3. Spotify Dashboard'da güncelle

**Önemli:** Her `lt` başlattığında URL değişebilir. Sabit URL için subdomain kullan:

```powershell
lt --port 5173 --subdomain trackguess
# Her zaman: https://trackguess.loca.lt
```

---

## 🔄 URL Değişirse Ne Yapmalı?

Eğer tunnel URL'in değişirse, şunları güncelle:

1. `.env` → `FRONTEND_URL`, `SPOTIFY_REDIRECT_URI`, `ALLOWED_ORIGINS`
2. `client/.env` → `VITE_API_URL`
3. Discord Developer Portal → URL Mappings
4. Spotify Dashboard → Redirect URIs
5. Uygulamayı yeniden başlat

---

## 💡 Production İçin

Ücretsiz hosting seçenekleri:
- **Vercel** (Frontend için)
- **Railway** / **Render** (Backend için)
- **MongoDB Atlas** (Database için)

Hepsi ücretsiz tier sunuyor!

