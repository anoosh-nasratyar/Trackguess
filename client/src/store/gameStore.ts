import { create } from 'zustand';

export type GameState = 'home' | 'lobby' | 'playing' | 'round_end' | 'ended';

export interface Player {
  discordId: string;
  username: string;
  avatar?: string;
  score: number;
  spotifyConnected: boolean;
}

export interface RoomSettings {
  totalRounds: number;
  roundDuration: number;
  songSource: 'liked_songs' | 'playlist' | 'top_tracks';
  songSourceId?: string;
}

export interface CurrentSong {
  trackId: string;
  albumArt: string;
  duration: number;
  previewUrl?: string;
  startTime: number;
  title?: string; // Only revealed at end
  artist?: string; // Only revealed at end
}

interface GameStore {
  gameState: GameState;
  roomId: string | null;
  isHost: boolean;
  hostId: string | null;
  players: Player[];
  settings: RoomSettings | null;
  currentRound: number;
  currentSong: CurrentSong | null;
  spotifyConnected: boolean;
  guessedArtist: boolean;
  guessedTitle: boolean;

  // Actions
  setGameState: (state: GameState) => void;
  setRoomId: (roomId: string) => void;
  setIsHost: (isHost: boolean) => void;
  setHostId: (hostId: string) => void;
  setPlayers: (players: Player[]) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (discordId: string) => void;
  updatePlayerScore: (discordId: string, score: number) => void;
  setSettings: (settings: RoomSettings) => void;
  setCurrentRound: (round: number) => void;
  setCurrentSong: (song: CurrentSong | null) => void;
  revealSongInfo: (title: string, artist: string) => void;
  setSpotifyConnected: (connected: boolean) => void;
  setGuessedArtist: (guessed: boolean) => void;
  setGuessedTitle: (guessed: boolean) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: 'home',
  roomId: null,
  isHost: false,
  hostId: null,
  players: [],
  settings: null,
  currentRound: 0,
  currentSong: null,
  spotifyConnected: false,
  guessedArtist: false,
  guessedTitle: false,

  setGameState: (state) => set({ gameState: state }),
  setRoomId: (roomId) => set({ roomId }),
  setIsHost: (isHost) => set({ isHost }),
  setHostId: (hostId) => set({ hostId }),
  setPlayers: (players) => set({ players }),
  addPlayer: (player) =>
    set((state) => ({
      players: [...state.players.filter((p) => p.discordId !== player.discordId), player],
    })),
  removePlayer: (discordId) =>
    set((state) => ({
      players: state.players.filter((p) => p.discordId !== discordId),
    })),
  updatePlayerScore: (discordId, score) =>
    set((state) => ({
      players: state.players.map((p) =>
        p.discordId === discordId ? { ...p, score } : p
      ),
    })),
  setSettings: (settings) => set({ settings }),
  setCurrentRound: (round) => set({ currentRound: round }),
  setCurrentSong: (song) => set({ currentSong: song, guessedArtist: false, guessedTitle: false }),
  revealSongInfo: (title, artist) =>
    set((state) => ({
      currentSong: state.currentSong ? { ...state.currentSong, title, artist } : null,
    })),
  setSpotifyConnected: (connected) => set({ spotifyConnected: connected }),
  setGuessedArtist: (guessed) => set({ guessedArtist: guessed }),
  setGuessedTitle: (guessed) => set({ guessedTitle: guessed }),
  resetGame: () =>
    set({
      gameState: 'home',
      roomId: null,
      isHost: false,
      players: [],
      settings: null,
      currentRound: 0,
      currentSong: null,
      guessedArtist: false,
      guessedTitle: false,
    }),
}));

