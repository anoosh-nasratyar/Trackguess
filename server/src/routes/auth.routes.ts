import { Router } from 'express';
import { spotifyService } from '../services/spotify.service';
import { User } from '../models/User.model';

const router = Router();

// Store PKCE challenges temporarily (in production, use Redis)
const pkceStore = new Map<string, { codeVerifier: string; discordId: string }>();

/**
 * Initiate Spotify OAuth flow
 */
router.post('/spotify/init', async (req, res) => {
  try {
    const { discordId, discordUsername, discordAvatar } = req.body;

    if (!discordId) {
      return res.status(400).json({ error: 'Discord ID required' });
    }

    // Create or update user
    await User.findOneAndUpdate(
      { discordId },
      {
        discordId,
        discordUsername: discordUsername || 'Unknown',
        discordAvatar,
      },
      { upsert: true, new: true }
    );

    // Generate PKCE challenge
    const { codeVerifier, codeChallenge } = spotifyService.generatePKCEChallenge();
    const state = `${discordId}_${Date.now()}`;

    // Store code verifier
    pkceStore.set(state, { codeVerifier, discordId });

    // Clean up old entries after 10 minutes
    setTimeout(() => pkceStore.delete(state), 10 * 60 * 1000);

    const authUrl = spotifyService.getAuthUrl(state, codeChallenge);

    return res.json({ authUrl, state });
  } catch (error: any) {
    console.error('Spotify init error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Spotify OAuth callback
 */
router.get('/spotify/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`${process.env.FRONTEND_URL}?error=${error}`);
    }

    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state' });
    }

    // Retrieve PKCE challenge
    const pkceData = pkceStore.get(state as string);

    if (!pkceData) {
      return res.status(400).json({ error: 'Invalid state or expired session' });
    }

    const { codeVerifier, discordId } = pkceData;

    // Exchange code for tokens
    const { accessToken, refreshToken, expiresIn } = await spotifyService.exchangeCodeForToken(
      code as string,
      codeVerifier
    );

    // Update user with Spotify tokens
    await User.findOneAndUpdate(
      { discordId },
      {
        spotifyConnected: true,
        spotifyAccessToken: accessToken,
        spotifyRefreshToken: refreshToken,
        spotifyExpiresAt: new Date(Date.now() + expiresIn * 1000),
      }
    );

    // Clean up
    pkceStore.delete(state as string);

    // Redirect back to frontend
    res.redirect(`${process.env.FRONTEND_URL}?spotify=connected`);
  } catch (error: any) {
    console.error('Spotify callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}?error=auth_failed`);
  }
});

/**
 * Check Spotify connection status
 */
router.get('/spotify/status/:discordId', async (req, res) => {
  try {
    const { discordId } = req.params;

    const user = await User.findOne({ discordId });

    if (!user) {
      return res.json({ connected: false });
    }

    return res.json({
      connected: user.spotifyConnected,
      hasValidToken: user.spotifyAccessToken && user.spotifyExpiresAt && user.spotifyExpiresAt > new Date(),
    });
  } catch (error: any) {
    console.error('Spotify status error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Disconnect Spotify
 */
router.post('/spotify/disconnect', async (req, res) => {
  try {
    const { discordId } = req.body;

    if (!discordId) {
      return res.status(400).json({ error: 'Discord ID required' });
    }

    await User.findOneAndUpdate(
      { discordId },
      {
        spotifyConnected: false,
        spotifyAccessToken: undefined,
        spotifyRefreshToken: undefined,
        spotifyExpiresAt: undefined,
      }
    );

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Spotify disconnect error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;

