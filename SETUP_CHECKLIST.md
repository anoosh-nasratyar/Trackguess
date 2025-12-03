# ✅ Setup Checklist

## ngrok URL: `https://3774c061c141.ngrok-free.app`

---

## 1️⃣ Environment Files (✅ COMPLETED)

- [x] `.env` created
- [x] `client/.env` created
- [x] URLs updated with ngrok domain

---

## 2️⃣ Generate JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste it in `.env` file at `JWT_SECRET=`

---

## 3️⃣ Discord Developer Portal

Go to: https://discord.com/developers/applications

### Create/Configure Application:

1. **General Information:**
   - Copy `CLIENT ID` → Paste in `.env` as `DISCORD_CLIENT_ID`
   - Copy `CLIENT SECRET` → Paste in `.env` as `DISCORD_CLIENT_SECRET`
   - Copy `PUBLIC KEY` → Paste in `.env` as `DISCORD_PUBLIC_KEY`
   - Also add `CLIENT ID` to `client/.env` as `VITE_DISCORD_CLIENT_ID`

2. **Activities Tab:**
   - Enable "Embedded App SDK"
   - **URL Mappings:**
     ```
     / → https://3774c061c141.ngrok-free.app
     ```
   - Click "Save"

3. **OAuth2 → Redirects:**
   - Add redirect URL:
     ```
     https://3774c061c141.ngrok-free.app/api/auth/spotify/callback
     ```

---

## 4️⃣ Spotify Developer Dashboard

Go to: https://developer.spotify.com/dashboard

### Create/Configure App:

1. **Create App:**
   - App Name: `TrackGuess`
   - App Description: `Discord music guessing game`

2. **Settings:**
   - Copy `Client ID` → Paste in `.env` as `SPOTIFY_CLIENT_ID`
   - Copy `Client Secret` → Paste in `.env` as `SPOTIFY_CLIENT_SECRET`

3. **Redirect URIs:**
   - Add:
     ```
     https://3774c061c141.ngrok-free.app/api/auth/spotify/callback
     ```
   - Click "Add"
   - Click "Save"

---

## 5️⃣ Start MongoDB

```bash
mongod
```

Or with Docker:
```bash
docker run -d -p 27017:27017 --name trackguess-mongo mongo:latest
```

---

## 6️⃣ Install Dependencies

```bash
npm install
```

---

## 7️⃣ Run Application

**Terminal 1 (ngrok - ALREADY RUNNING ✅):**
```bash
ngrok http 5173
```

**Terminal 2 (Application):**
```bash
npm run dev
```

---

## 8️⃣ Test in Discord

1. Join a voice channel
2. Click the rocket icon (Activities)
3. Your app "TrackGuess" should appear
4. Click to launch
5. Connect Spotify and start playing!

---

## 🔍 Troubleshooting

### If ngrok URL changes:
When you restart ngrok, the URL might change. If it does:

1. Update `.env` with new URL
2. Update `client/.env` with new URL
3. Update Discord Developer Portal URL mappings
4. Update Spotify Dashboard redirect URIs
5. Restart the application

### Common Issues:

**MongoDB connection failed:**
```bash
mongod
```

**Discord Activity not loading:**
- Check browser console (F12)
- Verify URL mapping in Discord portal
- Make sure ngrok is running

**Spotify auth failing:**
- Verify redirect URI matches exactly
- Check Spotify credentials in `.env`

---

## 📋 Final Checklist

Before testing, make sure:

- [ ] JWT_SECRET generated and added to `.env`
- [ ] Discord credentials added to `.env` and `client/.env`
- [ ] Spotify credentials added to `.env`
- [ ] Discord Activities URL mapping configured
- [ ] Spotify redirect URI configured
- [ ] MongoDB is running
- [ ] ngrok is running (Terminal 1)
- [ ] Application is running (Terminal 2)

---

## 🎉 Ready to Play!

Once all checkboxes are complete, test in Discord!

