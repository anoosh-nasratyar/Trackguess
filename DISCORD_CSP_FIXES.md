# Discord Activity CSP Fixes

## Issues Fixed

### 1. Spotify Player SDK Blocked by CSP ❌
**Problem:** Discord's Content Security Policy blocks external scripts like `https://sdk.scdn.co/spotify-player.js`

**Solution:** Removed the Spotify Player SDK script from `client/index.html`. The `useSpotify` hook now returns placeholder values and logs warnings.

**Impact:** Client-side audio playback is not possible in Discord Activities. Must use alternative approach (see below).

---

### 2. "Already authing" Error (React StrictMode) ✅
**Problem:** Discord SDK's `authorize` command was being called twice due to React's StrictMode double-mounting in development.

**Solution:** Added `useRef` flag in `useDiscordSDK.ts` to prevent double initialization.

**Result:** No more "Already authing" error.

---

### 3. Socket.IO Blocked by CSP ⚠️
**Problem:** Discord's CSP only allows WebSocket connections to Discord's own proxy domains (`*.discordsays.com`), not to Cloudflare Tunnel or other external URLs.

**Solution:** 
- Added error handling and fallback in `useSocketIO.ts`
- Changed `App.tsx` to only require Discord SDK (Socket.IO is optional)
- Added warning banner when Socket.IO is unavailable

**Impact:** Real-time features (WebSocket) don't work in Discord Activities. Must use alternative approach (see below).

---

### 4. Loading Screen Stuck ✅
**Problem:** App was waiting for both Discord SDK AND Socket.IO to be ready, but Socket.IO would never connect due to CSP.

**Solution:** Changed `App.tsx` to only wait for Discord SDK (`isReady`), making Socket.IO optional.

**Result:** App now loads properly in Discord Activities (within 3 seconds).

---

## Current Status

### ✅ Working
- Discord SDK initialization
- Discord authentication
- Basic UI rendering in Discord Activities
- Local development with mock SDK
- TypeScript builds without errors

### ❌ Not Working (Due to Discord CSP Restrictions)
- Spotify Web Playback SDK (blocked external script)
- Socket.IO WebSocket connections (blocked external WebSocket)
- Real-time game state updates
- Live leaderboard updates

---

## Architecture Limitations

Discord Activities have **very strict Content Security Policy (CSP)** that blocks:

1. **External Scripts** - Cannot load `<script src="https://external.com/script.js">`
2. **External WebSockets** - Can only connect to Discord's proxy (`*.discordsays.com`)
3. **External API Calls** - Must be proxied through Discord's infrastructure

### What This Means for TrackGuess

#### Audio Playback
❌ **Cannot use:** Spotify Web Playback SDK (blocked script)

✅ **Must use one of:**
- Discord's voice channel audio streaming (requires Discord Gateway/Voice API)
- Backend-based audio preview generation (30-second clips)
- Audio URLs served from your backend (proxied Spotify audio)
- Alternative: Use Spotify's standard Web API to control user's device

#### Real-Time Communication
❌ **Cannot use:** Direct Socket.IO to backend

✅ **Must use one of:**
- Discord SDK's RPC commands for state management
- HTTP polling (fallback, not ideal)
- Discord's Activity State API
- Server-Sent Events (SSE) if allowed by CSP

---

## Recommended Next Steps

### 1. Audio Playback Solution

**Option A: Backend Audio Streaming (Recommended)**
```
Backend generates 30-second preview MP3 → Serves via HTTPS → Client plays with <audio>
```

**Option B: Discord Voice Channel Audio**
```
Bot joins voice channel → Streams audio → Players hear in Discord
```

**Option C: Control User's Spotify**
```
User connects Spotify → Backend controls their device → Plays on their speakers
```

### 2. Real-Time Communication Solution

**Option A: Discord Activity State (Recommended)**
```javascript
// Use Discord SDK's built-in state management
await discordSdk.commands.setActivity({
  state: 'Playing Round 3',
  details: 'Score: 150',
  instance: true,
});
```

**Option B: HTTP Polling**
```javascript
// Poll backend every 2-3 seconds for game state
setInterval(() => {
  fetch('/api/game-state').then(updateUI);
}, 2000);
```

**Option C: Server-Sent Events (if CSP allows)**
```javascript
const eventSource = new EventSource('/api/game-events');
eventSource.onmessage = (event) => {
  const gameState = JSON.parse(event.data);
  updateUI(gameState);
};
```

---

## Testing Instructions

### Local Development
```bash
npm run dev
```
Open: `http://localhost:5173`

The app will use mock Discord SDK and show warnings about Socket.IO.

### Discord Activity Testing

1. Start Cloudflare Tunnel:
```bash
cloudflared tunnel --url http://localhost:5173
```

2. Update Discord Developer Portal:
   - Copy the `trycloudflare.com` URL
   - Update Activity URL Mappings
   - Update OAuth2 Redirect URIs

3. Update `.env` files with new tunnel URL

4. Build production version:
```bash
cd client
npm run build
npm run preview
```

5. Update tunnel to point to preview server:
```bash
cloudflared tunnel --url http://localhost:4173
```

6. Test in Discord voice channel

**Expected Results:**
- ✅ UI loads within 3 seconds
- ✅ Shows "Real-time features unavailable (Discord CSP)" warning
- ❌ Socket.IO connection fails (expected)
- ❌ No real-time updates (expected)

---

## Files Changed

- `client/index.html` - Removed Spotify Player SDK script
- `client/src/hooks/useDiscordSDK.ts` - Added StrictMode protection
- `client/src/hooks/useSocketIO.ts` - Added error handling and CSP awareness
- `client/src/hooks/useSpotify.ts` - Replaced with placeholder (CSP limitation)
- `client/src/App.tsx` - Made Socket.IO optional, added warning banner

---

## Important Notes

1. **Cloudflare Tunnel URL Changes:** The `trycloudflare.com` URL changes every time you restart the tunnel. You must update ALL the following:
   - `.env` → `VITE_API_URL`
   - `client/.env` → `VITE_API_URL`
   - `client/vite.config.ts` → `server.allowedHosts`
   - Discord Developer Portal → URL Mappings
   - Discord Developer Portal → OAuth2 Redirects

2. **Large File Warning:** The `cloudflared-windows-amd64.exe` file (65MB) was accidentally committed. Consider using `.gitignore` or Git LFS.

3. **Production Deployment:** For production, use a permanent domain (not `trycloudflare.com`) with proper SSL certificates.

---

## Resources

- [Discord Embedded App SDK Docs](https://discord.com/developers/docs/activities/overview)
- [Discord Activities CSP Policy](https://discord.com/developers/docs/activities/development-guides#content-security-policy)
- [Example Discord Activity (YouTube Tutorial)](https://github.com/Yatsuki-ish/discord-activity-youtube-tutorial)

