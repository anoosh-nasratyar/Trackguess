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

        // Authenticate with Discord
        const { code } = await discordSdk.commands.authorize({
          client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
          response_type: 'code',
          state: '',
          prompt: 'none',
          scope: ['identify', 'guilds'],
        });

        clearTimeout(timeout);
        console.log('✅ Discord SDK authenticated');

        // Mock authentication for now
        setAuth({
          code,
          id: 'user-id',
          username: 'Discord User',
        });
        
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

