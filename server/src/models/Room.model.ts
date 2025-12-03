import mongoose, { Schema, Document } from 'mongoose';

export enum RoomStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  ROUND_END = 'round_end',
  GAME_END = 'game_end',
  CLOSED = 'closed',
}

export enum SongSource {
  LIKED_SONGS = 'liked_songs',
  PLAYLIST = 'playlist',
  TOP_TRACKS = 'top_tracks',
  GENRE = 'genre',
}

export interface IRoom extends Document {
  roomId: string;
  hostId: string;
  voiceChannelId: string;
  guildId: string;
  maxPlayers: number;
  totalRounds: number;
  currentRound: number;
  roundDuration: number; // seconds
  status: RoomStatus;
  songSource: SongSource;
  songSourceId?: string; // playlist ID or genre name
  currentSongId?: string;
  currentSongData?: {
    trackId: string;
    title: string;
    artist: string;
    albumArt: string;
    duration: number;
    previewUrl?: string;
    startTime: number;
  };
  roundStartTime?: Date;
  artistGuessedBy?: string; // first player to guess artist
  titleGuessedBy?: string; // first player to guess title
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  hostId: {
    type: String,
    required: true,
    index: true,
  },
  voiceChannelId: {
    type: String,
    required: true,
  },
  guildId: {
    type: String,
    required: true,
  },
  maxPlayers: {
    type: Number,
    default: 10,
    min: 2,
    max: 10,
  },
  totalRounds: {
    type: Number,
    required: true,
    min: 1,
    max: 20,
  },
  currentRound: {
    type: Number,
    default: 0,
  },
  roundDuration: {
    type: Number,
    default: 30,
    min: 10,
    max: 60,
  },
  status: {
    type: String,
    enum: Object.values(RoomStatus),
    default: RoomStatus.WAITING,
  },
  songSource: {
    type: String,
    enum: Object.values(SongSource),
    required: true,
  },
  songSourceId: {
    type: String,
  },
  currentSongId: {
    type: String,
  },
  currentSongData: {
    type: {
      trackId: String,
      title: String,
      artist: String,
      albumArt: String,
      duration: Number,
      previewUrl: String,
      startTime: Number,
    },
  },
  roundStartTime: {
    type: Date,
  },
  artistGuessedBy: {
    type: String,
  },
  titleGuessedBy: {
    type: String,
  },
}, {
  timestamps: true,
});

export const Room = mongoose.model<IRoom>('Room', RoomSchema);

