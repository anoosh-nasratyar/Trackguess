import { Room, RoomStatus, SongSource } from '../models/Room.model';
import { RoomPlayer } from '../models/RoomPlayer.model';
import { spotifyService } from './spotify.service';

/**
 * Normalize text for comparison (remove accents, extra spaces, punctuation)
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

/**
 * Check if guess matches the target (with fuzzy matching)
 */
export function isMatch(guess: string, target: string): boolean {
  const normalizedGuess = normalizeText(guess);
  const normalizedTarget = normalizeText(target);

  // Exact match
  if (normalizedGuess === normalizedTarget) {
    return true;
  }

  // Check if guess contains target or vice versa (for partial matches)
  if (
    normalizedGuess.includes(normalizedTarget) ||
    normalizedTarget.includes(normalizedGuess)
  ) {
    // Calculate similarity ratio
    const minLength = Math.min(normalizedGuess.length, normalizedTarget.length);
    const maxLength = Math.max(normalizedGuess.length, normalizedTarget.length);
    
    // Accept if the shorter string is at least 70% of the longer
    if (minLength / maxLength >= 0.7) {
      return true;
    }
  }

  return false;
}

export class GameService {
  /**
   * Start a new round
   */
  async startRound(roomId: string): Promise<void> {
    const room = await Room.findOne({ roomId });

    if (!room) {
      throw new Error('Room not found');
    }

    if (room.currentRound >= room.totalRounds) {
      throw new Error('All rounds completed');
    }

    // Increment round
    room.currentRound += 1;
    room.status = RoomStatus.PLAYING;
    room.roundStartTime = new Date();
    room.artistGuessedBy = undefined;
    room.titleGuessedBy = undefined;

    // Select random song based on source
    let track;
    switch (room.songSource) {
      case SongSource.LIKED_SONGS:
        track = await spotifyService.getRandomLikedTrack(room.hostId);
        break;
      case SongSource.PLAYLIST:
        if (!room.songSourceId) {
          throw new Error('Playlist ID required');
        }
        track = await spotifyService.getRandomPlaylistTrack(room.hostId, room.songSourceId);
        break;
      case SongSource.TOP_TRACKS:
        track = await spotifyService.getRandomTopTrack(room.hostId);
        break;
      default:
        throw new Error('Unsupported song source');
    }

    const trackData = spotifyService.formatTrackData(track);
    
    room.currentSongId = trackData.trackId;
    room.currentSongData = {
      ...trackData,
      startTime: Date.now(),
    };

    await room.save();
  }

  /**
   * Process a player's guess
   */
  async processGuess(
    roomId: string,
    discordId: string,
    guess: string
  ): Promise<{
    correct: boolean;
    type?: 'artist' | 'title' | 'both';
    points: number;
    artistFirst?: boolean;
    titleFirst?: boolean;
  }> {
    const room = await Room.findOne({ roomId });

    if (!room || !room.currentSongData) {
      throw new Error('No active round');
    }

    if (room.status !== RoomStatus.PLAYING) {
      throw new Error('Round is not active');
    }

    const { artist, title } = room.currentSongData;
    const artistMatch = isMatch(guess, artist);
    const titleMatch = isMatch(guess, title);

    let points = 0;
    let type: 'artist' | 'title' | 'both' | undefined;
    let artistFirst = false;
    let titleFirst = false;

    // Check artist guess
    if (artistMatch && !room.artistGuessedBy) {
      room.artistGuessedBy = discordId;
      artistFirst = true;
      points += 2;
      type = 'artist';
    }

    // Check title guess
    if (titleMatch && !room.titleGuessedBy) {
      room.titleGuessedBy = discordId;
      titleFirst = true;
      points += 3;
      type = type === 'artist' ? 'both' : 'title';
    }

    // Bonus for getting both in one message
    if (artistFirst && titleFirst) {
      points = 5; // Replace with bonus total
      type = 'both';
    }

    if (points > 0) {
      // Update player score
      await RoomPlayer.findOneAndUpdate(
        { roomId, discordId },
        { $inc: { score: points }, lastActivity: new Date() }
      );

      await room.save();

      return {
        correct: true,
        type,
        points,
        artistFirst,
        titleFirst,
      };
    }

    return {
      correct: false,
      points: 0,
    };
  }

  /**
   * End current round
   */
  async endRound(roomId: string): Promise<void> {
    const room = await Room.findOne({ roomId });

    if (!room) {
      throw new Error('Room not found');
    }

    room.status = RoomStatus.ROUND_END;
    await room.save();
  }

  /**
   * End game and calculate final scores
   */
  async endGame(roomId: string): Promise<any[]> {
    const room = await Room.findOne({ roomId });

    if (!room) {
      throw new Error('Room not found');
    }

    room.status = RoomStatus.GAME_END;
    await room.save();

    // Get final leaderboard
    const players = await RoomPlayer.find({ roomId })
      .sort({ score: -1 })
      .limit(10);

    return players.map((player) => ({
      discordId: player.discordId,
      username: player.discordUsername,
      avatar: player.discordAvatar,
      score: player.score,
      spotifyConnected: player.spotifyConnected,
    }));
  }

  /**
   * Get current leaderboard
   */
  async getLeaderboard(roomId: string): Promise<any[]> {
    const players = await RoomPlayer.find({ roomId })
      .sort({ score: -1 })
      .limit(10);

    return players.map((player) => ({
      discordId: player.discordId,
      username: player.discordUsername,
      avatar: player.discordAvatar,
      score: player.score,
      spotifyConnected: player.spotifyConnected,
    }));
  }
}

export const gameService = new GameService();

