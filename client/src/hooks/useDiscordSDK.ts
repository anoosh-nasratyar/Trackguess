import { useState, useEffect, useRef } from 'react';
import { DiscordSDK, DiscordSDKMock } from '@discord/embedded-app-sdk';

const queryParams = new URLSearchParams(window.location.search);
const isEmbedded = queryParams.get('frame_id') != null;

let discordSdk: DiscordSDK | DiscordSDKMock;

if (isEmbedded) {
  discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);
} else {
  // Use mock for local development
  const mockUserId = queryParams.get('user_id') ?? undefined;
  const mockGuildId = queryParams.get('guild_id') ?? null;
  const mockChannelId = queryParams.get('channel_id') ?? null;
  const mockLocationId = queryParams.get('location_id') ?? null;
  discordSdk = new DiscordSDKMock(import.meta.env.VITE_DISCORD_CLIENT_ID, mockGuildId, mockChannelId, mockLocationId);
  const discriminator = String(mockUserId ?? Math.round(Math.random() * 9999));
  discordSdk._updateCommandMocks({
    authenticate: async () => ({
      access_token: 'mock_token',
      user: {
        username: 'Mock User',
        discriminator,
        id: mockUserId ?? discriminator,
        avatar: null,
        public_flags: 1,
      },
      scopes: [],
      expires: new Date(2121, 1, 1).toString(),
      application: {
        id: import.meta.env.VITE_DISCORD_CLIENT_ID,
        description: 'Mock App',
        name: 'Mock App',
        icon: null,
        rpc_origins: undefined,
      },
    }),
  });
}

export function useDiscordSDK() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auth, setAuth] = useState<any>(null);
  const setupRan = useRef(false); // Prevent double initialization in StrictMode
  const authAttempted = useRef(false); // Prevent double auth attempts

  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (setupRan.current) return;
    setupRan.current = true;

    const setupDiscordSdk = async () => {
      try {
        console.log('🚀 Initializing Discord SDK...');
        
        // Add timeout to prevent infinite loading
        const timeout = setTimeout(() => {
          console.warn('⚠️ Discord SDK timeout, loading UI anyway');
          setAuth({ id: 'timeout-user', username: 'Loading User' });
          setIsReady(true);
        }, 3000); // 3 second timeout

        await discordSdk.ready();
        console.log('✅ Discord SDK ready');
        console.log('SDK Context:', {
          instanceId: (discordSdk as any).instanceId,
          channelId: (discordSdk as any).channelId,
          guildId: (discordSdk as any).guildId,
        });

        // For Discord Activities, we don't need OAuth - RPC commands work by default
        // Only try to authorize if we haven't attempted it before and user explicitly needs it
        // Skip OAuth for Activities to avoid unnecessary prompts
        let authCode = null;
        
        // Check if we have a stored auth state
        const storedAuth = localStorage.getItem('discord_auth_state');
        if (storedAuth && !authAttempted.current) {
          try {
            const authData = JSON.parse(storedAuth);
            // Check if auth is still valid (not expired)
            if (authData.expiresAt && new Date(authData.expiresAt) > new Date()) {
              authCode = authData.code;
              console.log('✅ Using stored Discord auth');
            }
          } catch (e) {
            // Invalid stored auth, ignore
          }
        }
        
        // Don't call authorize for Activities - it's not needed and causes prompts
        // RPC commands work without OAuth in Discord Activities
        console.log('✅ Discord SDK ready (OAuth not required for Activities)');

        clearTimeout(timeout);

        // For Discord Activities, use the instanceId as the user ID
        const instanceId = (discordSdk as any).instanceId;
        const userId = instanceId ? `user-${String(instanceId).split('-').pop()?.slice(-8) || Date.now()}` : `user-${Date.now()}`;
        
        // Try to get stored user ID from localStorage for consistency
        const storedUserId = localStorage.getItem('discord_user_id');
        const finalUserId = storedUserId || userId;
        
        // Store user ID for persistence
        if (!storedUserId) {
          localStorage.setItem('discord_user_id', finalUserId);
        }
        
        setAuth({
          id: finalUserId,
          username: 'Discord User',
          code: authCode,
        });
        
        console.log('✅ Using user ID:', finalUserId);
        setIsReady(true);
      } catch (err: any) {
        console.error('❌ Discord SDK initialization error:', err);
        setError(err.message || 'Failed to initialize Discord SDK');
        setIsReady(true); // Still allow UI to load
      }
    };

    setupDiscordSdk();
  }, []);

  return {
    isReady,
    error,
    auth,
    sdk: discordSdk,
  };
}

export function getDiscordSDK() {
  return discordSdk;
}

