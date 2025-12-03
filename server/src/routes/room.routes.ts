import { Router } from 'express';
import { Room, RoomStatus } from '../models/Room.model';
import { RoomPlayer } from '../models/RoomPlayer.model';
import { User } from '../models/User.model';
import { gameService } from '../services/game.service';
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

    // Allow creating new room even if one exists (user can manage multiple)
    // We'll just create a new one

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
 * Get user's active rooms (as host or player)
 */
router.get('/user/:discordId/active', async (req, res) => {
  try {
    const { discordId } = req.params;

    // Get rooms where user is host
    const hostedRooms = await Room.find({
      hostId: discordId,
      status: { $in: [RoomStatus.WAITING, RoomStatus.PLAYING] },
    }).sort({ createdAt: -1 });

    // Get rooms where user is a player
    const playerRooms = await RoomPlayer.find({ discordId });
    const playerRoomIds = playerRooms.map((p) => p.roomId);
    
    const joinedRooms = await Room.find({
      roomId: { $in: playerRoomIds },
      status: { $in: [RoomStatus.WAITING, RoomStatus.PLAYING] },
      hostId: { $ne: discordId }, // Exclude rooms where user is host
    }).sort({ createdAt: -1 });

    // Combine and format
    const allRooms = [
      ...hostedRooms.map((r) => ({ ...r.toObject(), isHost: true })),
      ...joinedRooms.map((r) => ({ ...r.toObject(), isHost: false })),
    ];

    // Get player counts for each room
    const roomsWithPlayers = await Promise.all(
      allRooms.map(async (room) => {
        const playerCount = await RoomPlayer.countDocuments({ roomId: room.roomId });
        return {
          roomId: room.roomId,
          hostId: room.hostId,
          status: room.status,
          totalRounds: room.totalRounds,
          currentRound: room.currentRound || 0,
          roundDuration: room.roundDuration,
          songSource: room.songSource,
          createdAt: room.createdAt,
          isHost: room.isHost,
          playerCount,
          maxPlayers: room.maxPlayers,
        };
      })
    );

    return res.json({ rooms: roomsWithPlayers });
  } catch (error: any) {
    console.error('Get active rooms error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Close/Delete a room (host only)
 */
router.post('/close', async (req, res) => {
  try {
    const { roomId, discordId } = req.body;

    if (!roomId || !discordId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.hostId !== discordId) {
      return res.status(403).json({ error: 'Only host can close the room' });
    }

    // Close the room
    room.status = RoomStatus.CLOSED;
    await room.save();

    // Optionally remove all players
    await RoomPlayer.deleteMany({ roomId });

    return res.json({ success: true, message: 'Room closed' });
  } catch (error: any) {
    console.error('Close room error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Reconnect to a room
 */
router.post('/reconnect', async (req, res) => {
  try {
    const { roomId, discordId, discordUsername, discordAvatar } = req.body;

    if (!roomId || !discordId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.status === RoomStatus.CLOSED) {
      return res.status(400).json({ error: 'Room is closed' });
    }

    // Check if player already exists, if not add them
    let player = await RoomPlayer.findOne({ roomId, discordId });

    if (!player) {
      const user = await User.findOne({ discordId });
      const spotifyConnected = user?.spotifyConnected || false;

      player = new RoomPlayer({
        roomId,
        discordId,
        discordUsername: discordUsername || 'Player',
        discordAvatar,
        spotifyConnected,
      });
      await player.save();
    } else {
      // Update activity
      player.lastActivity = new Date();
      await player.save();
    }

    // Get room data
    const players = await RoomPlayer.find({ roomId }).sort({ score: -1 });

    return res.json({
      success: true,
      room: {
        roomId: room.roomId,
        hostId: room.hostId,
        status: room.status,
        totalRounds: room.totalRounds,
        currentRound: room.currentRound || 0,
        roundDuration: room.roundDuration,
        songSource: room.songSource,
        isHost: room.hostId === discordId,
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
    console.error('Reconnect room error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Start game (host only, allows solo play)
 */
router.post('/start', async (req, res) => {
  try {
    const { roomId, discordId } = req.body;

    if (!roomId || !discordId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.hostId !== discordId) {
      return res.status(403).json({ error: 'Only host can start the game' });
    }

    if (room.status !== RoomStatus.WAITING) {
      return res.status(400).json({ error: 'Game already started' });
    }

    // Check if there's at least 1 player (allow solo play)
    const playerCount = await RoomPlayer.countDocuments({ roomId });
    if (playerCount < 1) {
      return res.status(400).json({ error: 'No players in room' });
    }

    // Start first round
    await gameService.startRound(roomId);

    const updatedRoom = await Room.findOne({ roomId });
    const players = await RoomPlayer.find({ roomId }).sort({ score: -1 });

    return res.json({
      success: true,
      room: {
        roomId: updatedRoom?.roomId,
        status: updatedRoom?.status,
        currentRound: updatedRoom?.currentRound || 1,
        totalRounds: updatedRoom?.totalRounds,
        roundDuration: updatedRoom?.roundDuration,
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
    console.error('Start game error:', error);
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

