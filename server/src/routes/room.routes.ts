import { Router } from 'express';
import { Room, RoomStatus } from '../models/Room.model';
import { RoomPlayer } from '../models/RoomPlayer.model';
import { User } from '../models/User.model';
import crypto from 'crypto';

const router = Router();

/**
 * Create a new room
 */
router.post('/create', async (req, res) => {
  try {
    const {
      hostId,
      discordUsername,
      discordAvatar,
      voiceChannelId,
      guildId,
      totalRounds,
      roundDuration,
      songSource,
      songSourceId,
      maxPlayers = 10,
    } = req.body;

    if (!hostId || !voiceChannelId || !guildId || !totalRounds || !songSource) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify host has Spotify connected
    const host = await User.findOne({ discordId: hostId });
    if (!host || !host.spotifyConnected) {
      return res.status(400).json({ error: 'Host must connect Spotify first' });
    }

    // Check if host already has an active room
    const existingRoom = await Room.findOne({
      hostId,
      status: { $in: [RoomStatus.WAITING, RoomStatus.PLAYING] },
    });

    if (existingRoom) {
      return res.status(400).json({
        error: 'Host already has an active room',
        roomId: existingRoom.roomId,
      });
    }

    // Create room
    const roomId = crypto.randomBytes(6).toString('hex');
    const room = new Room({
      roomId,
      hostId,
      voiceChannelId,
      guildId,
      maxPlayers,
      totalRounds,
      roundDuration: roundDuration || 30,
      songSource,
      songSourceId,
      status: RoomStatus.WAITING,
    });

    await room.save();

    // Add host as first player
    const hostPlayer = new RoomPlayer({
      roomId,
      discordId: hostId,
      discordUsername: discordUsername || 'Host',
      discordAvatar,
      spotifyConnected: true,
    });

    await hostPlayer.save();

    return res.json({
      success: true,
      room: {
        roomId: room.roomId,
        hostId: room.hostId,
        maxPlayers: room.maxPlayers,
        totalRounds: room.totalRounds,
        roundDuration: room.roundDuration,
        songSource: room.songSource,
        status: room.status,
      },
    });
  } catch (error: any) {
    console.error('Create room error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Join a room
 */
router.post('/join', async (req, res) => {
  try {
    const { roomId, discordId, discordUsername, discordAvatar } = req.body;

    if (!roomId || !discordId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.status !== RoomStatus.WAITING) {
      return res.status(400).json({ error: 'Game already started' });
    }

    // Check if player already in room
    const existingPlayer = await RoomPlayer.findOne({ roomId, discordId });

    if (existingPlayer) {
      return res.json({ success: true, message: 'Already in room' });
    }

    // Check room capacity
    const playerCount = await RoomPlayer.countDocuments({ roomId });

    if (playerCount >= room.maxPlayers) {
      return res.status(400).json({ error: 'Room is full' });
    }

    // Check if user has Spotify connected
    const user = await User.findOne({ discordId });
    const spotifyConnected = user?.spotifyConnected || false;

    // Add player
    const player = new RoomPlayer({
      roomId,
      discordId,
      discordUsername: discordUsername || 'Player',
      discordAvatar,
      spotifyConnected,
    });

    await player.save();

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Join room error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Get room info
 */
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const players = await RoomPlayer.find({ roomId }).sort({ score: -1 });

    return res.json({
      room: {
        roomId: room.roomId,
        hostId: room.hostId,
        voiceChannelId: room.voiceChannelId,
        guildId: room.guildId,
        maxPlayers: room.maxPlayers,
        totalRounds: room.totalRounds,
        currentRound: room.currentRound,
        roundDuration: room.roundDuration,
        status: room.status,
        songSource: room.songSource,
      },
      players: players.map((p) => ({
        discordId: p.discordId,
        username: p.discordUsername,
        avatar: p.discordAvatar,
        score: p.score,
        spotifyConnected: p.spotifyConnected,
      })),
    });
  } catch (error: any) {
    console.error('Get room error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Leave room
 */
router.post('/leave', async (req, res) => {
  try {
    const { roomId, discordId } = req.body;

    if (!roomId || !discordId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await RoomPlayer.deleteOne({ roomId, discordId });

    // If host left, close the room
    const room = await Room.findOne({ roomId });
    if (room && room.hostId === discordId) {
      room.status = RoomStatus.CLOSED;
      await room.save();
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Leave room error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;

