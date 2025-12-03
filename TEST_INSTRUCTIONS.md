# Testing Instructions - After CSP Fixes

## ✅ What Was Fixed

### 1. **Removed Spotify Player SDK** (blocked by Discord CSP)
- Deleted `<script src="https://sdk.scdn.co/spotify-player.js">` from `index.html`
- Updated `useSpotify` hook to be a placeholder with warnings

### 2. **Fixed "Already authing" Error**
- Added `useRef` flag to prevent double initialization in React StrictMode
- Discord SDK now initializes only once

### 3. **Made Socket.IO Optional**
- App no longer waits for Socket.IO to connect before showing UI
- Added error handling for CSP-blocked WebSocket connections
- Shows warning banner when Socket.IO is unavailable

### 4. **Fixed Loading Screen**
- Reduced timeout from 5s to 3s
- App loads as soon as Discord SDK is ready (doesn't wait for Socket.IO)
- Shows UI even if there are connection errors

---

## 🧪 Test 1: Local Development (Mock SDK)

**Status:** ✅ Servers are already running!

```
✅ MongoDB connected successfully
✅ Server running on port 3000  
✅ Vite running at http://localhost:5173/
```

### Test Steps:

1. Open your browser to: **http://localhost:5173/**

2. **Expected Results:**
   - ✅ App loads within 3 seconds
   - ✅ Shows "Loading TrackGuess..." briefly
   - ✅ Loads HomePage with "TrackGuess" title
   - ⚠️ Console shows: "Using Discord SDK Mock for development"
   - ⚠️ Console shows: "Attempting to connect to Socket.IO..."
   - ⚠️ May show orange warning banner: "Real-time features unavailable (Discord CSP)"

3. **Check Console Logs:**
   ```
   🚀 Initializing Discord SDK...
   ⚠️ Using Discord SDK Mock for development
   🔌 Attempting to connect to Socket.IO...
   ✅ Socket.IO connected (or ⚠️ connection failed - both OK)
   ⚠️ Spotify Web Playback SDK cannot be used...
   ```

4. **Verify No Errors:**
   - ❌ No "Already authing" error
   - ❌ No Spotify SDK CSP errors
   - ❌ No infinite loading screen

---

## 🧪 Test 2: Discord Activity (With Cloudflare Tunnel)

### Step 1: Start Cloudflare Tunnel

Open a new PowerShell terminal and run:

```powershell
cd C:\Users\Anoos\OneDrive\Desktop\Discord_Bots\trackguess
.\cloudflared-windows-amd64.exe tunnel --url http://localhost:5173
```

**Copy the generated URL** (e.g., `https://random-words-here.trycloudflare.com`)

### Step 2: Update Configuration Files

Replace the old tunnel URL with the new one in:

1. **`.env`**
   ```
   VITE_API_URL=https://YOUR-NEW-TUNNEL-URL.trycloudflare.com
   ```

2. **`client/.env`**
   ```
   VITE_DISCORD_CLIENT_ID=YOUR_DISCORD_CLIENT_ID
   VITE_API_URL=https://YOUR-NEW-TUNNEL-URL.trycloudflare.com
   ```

3. **`client/vite.config.ts`**
   ```typescript
   server: {
     // ...
     allowedHosts: [
       'YOUR-NEW-TUNNEL-URL.trycloudflare.com',
       'localhost',
       '127.0.0.1',
     ],
   }
   ```

### Step 3: Update Discord Developer Portal

1. Go to: https://discord.com/developers/applications
2. Select your TrackGuess application
3. Go to **Activities** tab
4. Update **URL Mappings:**
   ```
   / → https://YOUR-NEW-TUNNEL-URL.trycloudflare.com
   ```
5. Go to **OAuth2** tab  
6. Update **Redirect URIs:**
   ```
   https://YOUR-NEW-TUNNEL-URL.trycloudflare.com/api/auth/spotify/callback
   ```
7. **Save Changes**

### Step 4: Restart Dev Servers

In your existing terminal (Terminal 4):
1. Press `Ctrl+C` to stop the servers
2. Run:
   ```powershell
   npm run dev
   ```

Wait for:
```
✅ MongoDB connected successfully
✅ Server running on port 3000
✅ Vite ready at http://localhost:5173/
```

### Step 5: Test in Discord

1. Open Discord Desktop
2. Join a voice channel
3. Click the 🎮 **Activities** button (rocket icon)
4. Find and launch **TrackGuess**

### Expected Results:

- ✅ App loads within 3 seconds (no longer stuck on "Loading TrackGuess...")
- ✅ Shows HomePage UI
- ⚠️ Orange warning banner: "Real-time features unavailable (Discord CSP)"
- ⚠️ Socket.IO will fail to connect (expected, blocked by CSP)
- ⚠️ Spotify Player SDK will not load (expected, blocked by CSP)

### Check Discord Console (F12):

```
✅ Discord SDK initialized
✅ Discord SDK ready
✅ Discord SDK authenticated
❌ Refused to connect to 'wss://...' (EXPECTED - CSP block)
❌ Refused to load script 'spotify-player.js' (EXPECTED - removed)
⚠️ Socket.IO connection failed (EXPECTED - CSP block)
```

### What Should Work:
- ✅ UI renders properly
- ✅ No white screen
- ✅ No infinite loading
- ✅ Discord SDK authentication
- ✅ Basic navigation

### What Won't Work (CSP Limitations):
- ❌ Socket.IO real-time updates
- ❌ Spotify Web Playback SDK
- ❌ Live leaderboard updates
- ❌ Real-time game state sync

---

## 📊 Success Criteria

### ✅ Pass Criteria:
1. App loads in **< 3 seconds**
2. HomePage renders with "TrackGuess" title
3. No "Already authing" error
4. No infinite loading screen
5. Console shows Discord SDK initialized
6. UI is visible (not white screen)

### ⚠️ Expected Warnings (NOT Errors):
1. "Real-time features unavailable (Discord CSP)" banner
2. Socket.IO connection failed
3. Spotify SDK warning in console

### ❌ Fail Criteria (Should NOT Happen):
1. White blank screen in Discord
2. Stuck on "Loading TrackGuess..." forever
3. "Already authing" error
4. TypeScript build errors
5. App crashes or doesn't render

---

## 🐛 If Something Goes Wrong

### Issue: Still stuck on loading screen
**Solution:** Check browser console for specific errors. Discord SDK timeout is 3s.

### Issue: White screen in Discord
**Solution:** 
1. Verify tunnel URL is updated in ALL config files
2. Check Discord Developer Portal URL Mappings
3. Hard refresh Discord (Ctrl+Shift+R)

### Issue: "Blocked request" error
**Solution:** Add tunnel URL to `vite.config.ts` `allowedHosts`

### Issue: Socket.IO errors
**Solution:** These are EXPECTED due to CSP. App should still work.

---

## 📝 Next Steps (After Basic UI Works)

Once the UI loads successfully, you'll need to implement:

1. **Real-Time Communication**
   - Replace Socket.IO with Discord SDK's Activity State API
   - Or implement HTTP polling as fallback

2. **Audio Playback**
   - Implement backend-based audio streaming
   - Or use Discord voice channel audio (bot streams to VC)
   - Or control user's Spotify device via Web API

3. **Production Deployment**
   - Use permanent domain (not trycloudflare.com)
   - Set up proper SSL certificates
   - Configure CORS and CSP headers

See `DISCORD_CSP_FIXES.md` for detailed architecture recommendations.

---

## 🎯 Current Project Status

✅ **Working:**
- Discord SDK integration
- Basic UI rendering
- TypeScript builds
- Local development
- Mock SDK for testing

⚠️ **Limited (CSP Restrictions):**
- WebSocket connections
- External scripts
- Direct API calls

❌ **Not Implemented:**
- Real-time game state sync
- Audio playback
- Multiplayer gameplay
- Score tracking

**Next Priority:** Get basic UI working in Discord, then implement CSP-compatible solutions for real-time and audio.

