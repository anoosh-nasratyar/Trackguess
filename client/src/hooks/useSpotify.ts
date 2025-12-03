import { useState, useCallback } from 'react';

/**
 * NOTE: Spotify Web Playback SDK cannot be used in Discord Activities
 * due to Content Security Policy restrictions that block external scripts.
 * 
 * Audio playback must be handled server-side or through alternative methods.
 * This hook is a placeholder for future backend-based playback implementation.
 */

export function useSpotify(_accessToken: string | null) {
  const [player] = useState<any>(null);
  const [deviceId] = useState<string | null>(null);
  const [isReady] = useState(false);

  // Spotify Web Playback SDK is blocked by Discord's CSP
  // All playback must be handled server-side or through alternative methods
  console.warn('⚠️ Spotify Web Playback SDK cannot be used in Discord Activities (CSP restriction)');
  console.info('💡 Consider using Discord\'s voice channel audio or backend-based streaming');

  const pause = useCallback(() => {
    console.warn('⚠️ Spotify playback not available (CSP restriction)');
  }, []);

  const resume = useCallback(() => {
    console.warn('⚠️ Spotify playback not available (CSP restriction)');
  }, []);

  return {
    player,
    deviceId,
    isReady,
    pause,
    resume,
  };
}

