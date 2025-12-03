import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';

declare global {
  interface Window {
    Spotify: any;
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

export function useSpotify(accessToken: string | null) {
  const [player, setPlayer] = useState<any>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const currentSong = useGameStore((state) => state.currentSong);

  // Initialize Spotify Web Playback SDK
  useEffect(() => {
    if (!accessToken) return;

    window.onSpotifyWebPlaybackSDKReady = () => {
      const spotifyPlayer = new window.Spotify.Player({
        name: 'TrackGuess Player',
        getOAuthToken: (cb: (token: string) => void) => {
          cb(accessToken);
        },
        volume: 0.5,
      });

      // Ready
      spotifyPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
        console.log('Spotify Player Ready with Device ID', device_id);
        setDeviceId(device_id);
        setIsReady(true);
      });

      // Not Ready
      spotifyPlayer.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        console.log('Device ID has gone offline', device_id);
        setIsReady(false);
      });

      // Error handling
      spotifyPlayer.addListener('initialization_error', ({ message }: { message: string }) => {
        console.error('Spotify initialization error:', message);
      });

      spotifyPlayer.addListener('authentication_error', ({ message }: { message: string }) => {
        console.error('Spotify authentication error:', message);
      });

      spotifyPlayer.addListener('account_error', ({ message }: { message: string }) => {
        console.error('Spotify account error:', message);
      });

      spotifyPlayer.addListener('playback_error', ({ message }: { message: string }) => {
        console.error('Spotify playback error:', message);
      });

      // Connect to player
      spotifyPlayer.connect();

      setPlayer(spotifyPlayer);
    };

    // Check if SDK is already loaded
    if (window.Spotify) {
      window.onSpotifyWebPlaybackSDKReady();
    }

    return () => {
      if (player) {
        player.disconnect();
      }
    };
  }, [accessToken]);

  // Play track when currentSong changes
  useEffect(() => {
    if (!isReady || !deviceId || !accessToken || !currentSong) return;

    const playTrack = async () => {
      try {
        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            uris: [`spotify:track:${currentSong.trackId}`],
            position_ms: 0,
          }),
        });
      } catch (error) {
        console.error('Failed to play track:', error);
      }
    };

    playTrack();
  }, [currentSong, isReady, deviceId, accessToken]);

  const pause = useCallback(() => {
    if (player) {
      player.pause();
    }
  }, [player]);

  const resume = useCallback(() => {
    if (player) {
      player.resume();
    }
  }, [player]);

  return {
    player,
    deviceId,
    isReady,
    pause,
    resume,
  };
}

