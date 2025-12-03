import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';

let socket: Socket | null = null;

export function useSocketIO() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setupRan = useRef(false);

  const setGameState = useGameStore((state) => state.setGameState);
  const setPlayers = useGameStore((state) => state.setPlayers);
  const setCurrentRound = useGameStore((state) => state.setCurrentRound);
  const setCurrentSong = useGameStore((state) => state.setCurrentSong);
  const revealSongInfo = useGameStore((state) => state.revealSongInfo);
  const removePlayer = useGameStore((state) => state.removePlayer);

  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (setupRan.current) return;
    setupRan.current = true;

    try {
      // Note: Socket.IO connections will be blocked by Discord's CSP
      // In production, you'll need to use Discord's proxy or alternative real-time solution
      console.log('🔌 Attempting to connect to Socket.IO...');
      
      // Use relative path so it goes through Vite proxy to backend
      socket = io('/', {
        path: '/socket.io',
        transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 3,
      });

      socket.on('connect', () => {
        console.log('✅ Socket.IO connected');
        setIsConnected(true);
        setError(null);
      });

      socket.on('connect_error', (err) => {
        console.warn('⚠️ Socket.IO connection failed (may be blocked by CSP):', err.message);
        setError('WebSocket connection blocked (Discord CSP restriction)');
        setIsConnected(false);
      });

      socket.on('disconnect', () => {
        console.log('🔌 Socket.IO disconnected');
        setIsConnected(false);
      });

      socket.on('error', (data: { message: string }) => {
        console.error('❌ Socket.IO error:', data.message);
        setError(data.message);
      });

      // Game events
      socket.on('room:player_joined', (data: { players: any[] }) => {
        setPlayers(data.players);
      });

      socket.on('room:player_left', (data: { discordId: string; players: any[] }) => {
        removePlayer(data.discordId);
        setPlayers(data.players);
      });

      socket.on('game:started', () => {
        setGameState('playing');
      });

      socket.on('round:started', (data: { roundNumber: number; songData: any; roundDuration: number }) => {
        setCurrentRound(data.roundNumber);
        setCurrentSong(data.songData);
        setGameState('playing');
      });

      socket.on('game:correct_guess', (data: { discordId: string; type: string; points: number }) => {
        console.log('Correct guess:', data);
        // UI will show notification
      });

      socket.on('game:leaderboard_update', (data: { leaderboard: any[] }) => {
        setPlayers(data.leaderboard);
      });

      socket.on('round:ended', (data: { answer: { title: string; artist: string } }) => {
        revealSongInfo(data.answer.title, data.answer.artist);
        setGameState('round_end');
      });

      socket.on('game:ended', (data: { leaderboard: any[] }) => {
        setPlayers(data.leaderboard);
        setGameState('ended');
      });
    } catch (err) {
      console.error('❌ Socket.IO initialization failed:', err);
      setError('Failed to initialize real-time connection');
    }

    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, []);

  return {
    isConnected,
    error,
    socket,
  };
}

export function getSocket() {
  return socket;
}

