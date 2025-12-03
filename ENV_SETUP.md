# Environment Variables Setup

## Required Environment Variables

### Client (`client/.env`)

Create a `client/.env` file with:

```env
VITE_DISCORD_CLIENT_ID=your_discord_client_id_here
VITE_API_URL=http://localhost:3000
```

### Server (`server/.env`)

Create a `server/.env` file with:

```env
# Discord
DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_CLIENT_SECRET=your_discord_client_secret_here

# Spotify
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
SPOTIFY_REDIRECT_URI=https://your-tunnel-url.trycloudflare.com/api/auth/spotify/callback

# MongoDB
MONGODB_URI=mongodb://localhost:27017/trackguess

# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=https://your-tunnel-url.trycloudflare.com
```

## How to Get These Values

### Discord Application
1. Go to https://discord.com/developers/applications
2. Create a new application or select your existing TrackGuess app
3. Copy the **Application ID** (this is your `DISCORD_CLIENT_ID`)
4. Go to **OAuth2** section
5. Copy the **Client Secret** (this is your `DISCORD_CLIENT_SECRET`)

### Spotify Application
1. Go to https://developer.spotify.com/dashboard
2. Create a new app or select your existing one
3. Copy the **Client ID** (this is your `SPOTIFY_CLIENT_ID`)
4. Click "Show Client Secret" and copy it (this is your `SPOTIFY_CLIENT_SECRET`)
5. In "Redirect URIs", add your Cloudflare Tunnel URL + `/api/auth/spotify/callback`
   - Example: `https://resume-korea-arnold-relative.trycloudflare.com/api/auth/spotify/callback`

### MongoDB
- If running locally: `mongodb://localhost:27017/trackguess`
- If using MongoDB Atlas: Get connection string from Atlas dashboard

### Cloudflare Tunnel URL
- Run: `.\cloudflared-windows-amd64.exe tunnel --url http://localhost:5173`
- Copy the `https://xxxxx.trycloudflare.com` URL it gives you
- Use this for `SPOTIFY_REDIRECT_URI` and `FRONTEND_URL`

## Notes

- **Important:** After you set up environment variables, restart both servers!
- The Cloudflare Tunnel URL changes every time you restart it
- You'll need to update `SPOTIFY_REDIRECT_URI` and `FRONTEND_URL` each time
- For production, use a permanent tunneling solution or deploy to a hosting service

