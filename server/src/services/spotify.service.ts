import axios from 'axios';
import { User } from '../models/User.model';
import crypto from 'crypto';

export class SpotifyService {
  private clientId: string;
  private _clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID || '';
    this._clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';
    this.redirectUri = process.env.SPOTIFY_REDIRECT_URI || '';
  }

  /**
   * Generate PKCE challenge for secure OAuth flow
   */
  generatePKCEChallenge(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    return { codeVerifier, codeChallenge };
  }

  /**
   * Get Spotify authorization URL
   */
  getAuthUrl(state: string, codeChallenge: string): string {
    const scopes = [
      'user-read-email',
      'user-read-private',
      'user-library-read',
      'user-top-read',
      'playlist-read-private',
      'playlist-read-collaborative',
      'streaming',
      'user-read-playback-state',
      'user-modify-playback-state',
    ];

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: scopes.join(' '),
      state,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, codeVerifier: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    try {
      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.redirectUri,
          client_id: this.clientId,
          code_verifier: codeVerifier,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
      };
    } catch (error: any) {
      console.error('Spotify token exchange error:', error.response?.data || error.message);
      throw new Error('Failed to exchange code for token');
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    try {
      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.clientId,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return {
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in,
      };
    } catch (error: any) {
      console.error('Spotify token refresh error:', error.response?.data || error.message);
      throw new Error('Failed to refresh token');
    }
  }

  /**
   * Get valid access token for user (refresh if needed)
   */
  async getValidAccessToken(discordId: string): Promise<string> {
    const user = await User.findOne({ discordId });

    if (!user || !user.spotifyConnected) {
      throw new Error('User has not connected Spotify');
    }

    if (!user.spotifyAccessToken || !user.spotifyRefreshToken) {
      throw new Error('Missing Spotify tokens');
    }

    // Check if token is expired or about to expire (5 minutes buffer)
    const now = new Date();
    const expiresAt = user.spotifyExpiresAt || new Date(0);
    const bufferTime = 5 * 60 * 1000; // 5 minutes

    if (expiresAt.getTime() - now.getTime() > bufferTime) {
      return user.spotifyAccessToken;
    }

    // Token expired or about to expire, refresh it
    const { accessToken, expiresIn } = await this.refreshAccessToken(user.spotifyRefreshToken);

    user.spotifyAccessToken = accessToken;
    user.spotifyExpiresAt = new Date(now.getTime() + expiresIn * 1000);
    await user.save();

    return accessToken;
  }

  /**
   * Get random track from liked songs
   */
  async getRandomLikedTrack(discordId: string): Promise<any> {
    const accessToken = await this.getValidAccessToken(discordId);

    try {
      // Get total number of liked songs
      const response = await axios.get('https://api.spotify.com/v1/me/tracks', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { limit: 1 },
      });

      const total = response.data.total;

      if (total === 0) {
        throw new Error('No liked songs found');
      }

      // Get random offset
      const randomOffset = Math.floor(Math.random() * total);

      // Fetch the random track
      const trackResponse = await axios.get('https://api.spotify.com/v1/me/tracks', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { limit: 1, offset: randomOffset },
      });

      return trackResponse.data.items[0].track;
    } catch (error: any) {
      console.error('Error fetching liked track:', error.response?.data || error.message);
      throw new Error('Failed to fetch liked track');
    }
  }

  /**
   * Get random track from playlist
   */
  async getRandomPlaylistTrack(discordId: string, playlistId: string): Promise<any> {
    const accessToken = await this.getValidAccessToken(discordId);

    try {
      const response = await axios.get(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const tracks = response.data.items.filter((item: any) => item.track);

      if (tracks.length === 0) {
        throw new Error('No tracks found in playlist');
      }

      const randomIndex = Math.floor(Math.random() * tracks.length);
      return tracks[randomIndex].track;
    } catch (error: any) {
      console.error('Error fetching playlist track:', error.response?.data || error.message);
      throw new Error('Failed to fetch playlist track');
    }
  }

  /**
   * Get random track from user's top tracks
   */
  async getRandomTopTrack(discordId: string): Promise<any> {
    const accessToken = await this.getValidAccessToken(discordId);

    try {
      const response = await axios.get('https://api.spotify.com/v1/me/top/tracks', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { limit: 50, time_range: 'medium_term' },
      });

      const tracks = response.data.items;

      if (tracks.length === 0) {
        throw new Error('No top tracks found');
      }

      const randomIndex = Math.floor(Math.random() * tracks.length);
      return tracks[randomIndex];
    } catch (error: any) {
      console.error('Error fetching top tracks:', error.response?.data || error.message);
      throw new Error('Failed to fetch top tracks');
    }
  }

  /**
   * Format track data for game use
   */
  formatTrackData(track: any): {
    trackId: string;
    title: string;
    artist: string;
    albumArt: string;
    duration: number;
    previewUrl?: string;
  } {
    return {
      trackId: track.id,
      title: track.name,
      artist: track.artists.map((a: any) => a.name).join(', '),
      albumArt: track.album.images[0]?.url || '',
      duration: track.duration_ms,
      previewUrl: track.preview_url,
    };
  }
}

export const spotifyService = new SpotifyService();

