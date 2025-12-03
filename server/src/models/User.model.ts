import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  discordId: string;
  discordUsername: string;
  discordAvatar?: string;
  spotifyConnected: boolean;
  spotifyAccessToken?: string;
  spotifyRefreshToken?: string;
  spotifyExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  discordId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  discordUsername: {
    type: String,
    required: true,
  },
  discordAvatar: {
    type: String,
  },
  spotifyConnected: {
    type: Boolean,
    default: false,
  },
  spotifyAccessToken: {
    type: String,
  },
  spotifyRefreshToken: {
    type: String,
  },
  spotifyExpiresAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

export const User = mongoose.model<IUser>('User', UserSchema);

