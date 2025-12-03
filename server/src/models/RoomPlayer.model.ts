import mongoose, { Schema, Document } from 'mongoose';

export interface IRoomPlayer extends Document {
  roomId: string;
  discordId: string;
  discordUsername: string;
  discordAvatar?: string;
  score: number;
  spotifyConnected: boolean;
  joinedAt: Date;
  lastActivity: Date;
}

const RoomPlayerSchema = new Schema<IRoomPlayer>({
  roomId: {
    type: String,
    required: true,
    index: true,
  },
  discordId: {
    type: String,
    required: true,
    index: true,
  },
  discordUsername: {
    type: String,
    required: true,
  },
  discordAvatar: {
    type: String,
  },
  score: {
    type: Number,
    default: 0,
  },
  spotifyConnected: {
    type: Boolean,
    default: false,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for quick lookups
RoomPlayerSchema.index({ roomId: 1, discordId: 1 }, { unique: true });

export const RoomPlayer = mongoose.model<IRoomPlayer>('RoomPlayer', RoomPlayerSchema);

