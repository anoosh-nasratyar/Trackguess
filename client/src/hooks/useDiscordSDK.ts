import { useState, useEffect } from 'react';
import { DiscordSDK } from '@discord/embedded-app-sdk';

let discordSdk: DiscordSDK | null = null;

export function useDiscordSDK() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auth, setAuth] = useState<any>(null);

  useEffect(() => {
    const initDiscordSDK = async () => {
      try {
        // Development fallback
        if (import.meta.env.DEV && !(window as any).DiscordSDK) {
          setAuth({
            id: 'dev-user',
            username: 'Dev Tester',
            guildId: 'dev-guild',
            channelId: 'dev-channel',
          });
          setIsReady(true);
          return;
        }

        // Initialize Discord SDK
        discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);

        await discordSdk.ready();

        // Authenticate
        const { code } = await discordSdk.commands.authorize({
          client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
          response_type: 'code',
          state: '',
          prompt: 'none',
          scope: ['identify', 'guilds'],
        });

        // For now, use mock auth
        setAuth({
          id: code || 'discord-user',
          username: 'Discord User',
          code,
        });
        setIsReady(true);
      } catch (err: any) {
        console.error('Discord SDK initialization error:', err);
        setError(err.message || 'Failed to initialize Discord SDK');
        setIsReady(true); // Allow UI to load even with error
      }
    };

    initDiscordSDK();
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

