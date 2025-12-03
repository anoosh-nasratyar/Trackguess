import { Server, Socket } from 'socket.io';
import { Room, RoomStatus } from '../models/Room.model';
import { RoomPlayer } from '../models/RoomPlayer.model';
import { gameService } from '../services/game.service';

interface SocketData {
  discordId?: string;
  roomId?: string;
}

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    /**
     * Join a room
     */
    socket.on('room:join', async (data: { roomId: string; discordId: string; username: string; avatar?: string }) => {
      try {
        const { roomId, discordId, username, avatar } = data;

        // Verify room exists
        const room = await Room.findOne({ roomId });
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Join socket room
        socket.join(roomId);
        (socket.data as SocketData).discordId = discordId;
        (socket.data as SocketData).roomId = roomId;

        // Update player activity
        await RoomPlayer.findOneAndUpdate(
          { roomId, discordId },
          { lastActivity: new Date() }
        );

        // Get updated player list
        const players = await gameService.getLeaderboard(roomId);

        // Notify all players in room
        io.to(roomId).emit('room:player_joined', {
          discordId,
          username,
          avatar,
          players,
        });

        console.log(`Player ${discordId} joined room ${roomId}`);
      } catch (error: any) {
        console.error('Room join error:', error);
        socket.emit('error', { message: error.message });
      }
    });

    /**
     * Leave room
     */
    socket.on('room:leave', async () => {
      try {
        const { roomId, discordId } = socket.data as SocketData;

        if (!roomId || !discordId) {
          return;
        }

        socket.leave(roomId);

        const players = await gameService.getLeaderboard(roomId);

        io.to(roomId).emit('room:player_left', {
          discordId,
          players,
        });

        console.log(`Player ${discordId} left room ${roomId}`);
      } catch (error: any) {
        console.error('Room leave error:', error);
      }
    });

    /**
     * Start game (host only)
     */
    socket.on('game:start', async (data: { roomId: string; discordId: string }) => {
      try {
        const { roomId, discordId } = data;

        const room = await Room.findOne({ roomId });

        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        if (room.hostId !== discordId) {
          socket.emit('error', { message: 'Only host can start the game' });
          return;
        }

        if (room.status !== RoomStatus.WAITING) {
          socket.emit('error', { message: 'Game already started' });
          return;
        }

        // Start first round
        await gameService.startRound(roomId);

        const updatedRoom = await Room.findOne({ roomId });

        // Notify all players
        io.to(roomId).emit('game:started', {
          totalRounds: updatedRoom?.totalRounds,
          roundDuration: updatedRoom?.roundDuration,
        });

        // Send song data (without answer)
        io.to(roomId).emit('round:started', {
          roundNumber: updatedRoom?.currentRound,
          songData: {
            trackId: updatedRoom?.currentSongData?.trackId,
            albumArt: updatedRoom?.currentSongData?.albumArt,
            duration: updatedRoom?.currentSongData?.duration,
            startTime: updatedRoom?.currentSongData?.startTime,
          },
          roundDuration: updatedRoom?.roundDuration,
        });

        // Auto-end round after duration
        setTimeout(async () => {
          await handleRoundEnd(io, roomId);
        }, (updatedRoom?.roundDuration || 30) * 1000);

        console.log(`Game started in room ${roomId}`);
      } catch (error: any) {
        console.error('Game start error:', error);
        socket.emit('error', { message: error.message });
      }
    });

    /**
     * Submit guess
     */
    socket.on('game:guess', async (data: { roomId: string; discordId: string; guess: string }) => {
      try {
        const { roomId, discordId, guess } = data;

        if (!guess || guess.trim().length === 0) {
          return;
        }

        const result = await gameService.processGuess(roomId, discordId, guess);

        if (result.correct) {
          // Get player info
          const player = await RoomPlayer.findOne({ roomId, discordId });

          // Notify all players about correct guess
          io.to(roomId).emit('game:correct_guess', {
            discordId,
            username: player?.discordUsername,
            type: result.type,
            points: result.points,
            artistFirst: result.artistFirst,
            titleFirst: result.titleFirst,
          });

          // Send updated leaderboard
          const leaderboard = await gameService.getLeaderboard(roomId);
          io.to(roomId).emit('game:leaderboard_update', { leaderboard });

          // Check if both artist and title have been guessed
          const room = await Room.findOne({ roomId });
          if (room?.artistGuessedBy && room?.titleGuessedBy) {
            // End round early if both are guessed
            setTimeout(async () => {
              await handleRoundEnd(io, roomId);
            }, 3000); // 3 second delay to show the correct answer
          }
        }
      } catch (error: any) {
        console.error('Guess error:', error);
        socket.emit('error', { message: error.message });
      }
    });

    /**
     * Request next round (host only)
     */
    socket.on('game:next_round', async (data: { roomId: string; discordId: string }) => {
      try {
        const { roomId, discordId } = data;

        const room = await Room.findOne({ roomId });

        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        if (room.hostId !== discordId) {
          socket.emit('error', { message: 'Only host can start next round' });
          return;
        }

        if (room.status !== RoomStatus.ROUND_END) {
          socket.emit('error', { message: 'Current round not ended' });
          return;
        }

        if (room.currentRound >= room.totalRounds) {
          // Game ended
          const leaderboard = await gameService.endGame(roomId);
          io.to(roomId).emit('game:ended', { leaderboard });
          return;
        }

        // Start next round
        await gameService.startRound(roomId);

        const updatedRoom = await Room.findOne({ roomId });

        io.to(roomId).emit('round:started', {
          roundNumber: updatedRoom?.currentRound,
          songData: {
            trackId: updatedRoom?.currentSongData?.trackId,
            albumArt: updatedRoom?.currentSongData?.albumArt,
            duration: updatedRoom?.currentSongData?.duration,
            startTime: updatedRoom?.currentSongData?.startTime,
          },
          roundDuration: updatedRoom?.roundDuration,
        });

        // Auto-end round after duration
        setTimeout(async () => {
          await handleRoundEnd(io, roomId);
        }, (updatedRoom?.roundDuration || 30) * 1000);
      } catch (error: any) {
        console.error('Next round error:', error);
        socket.emit('error', { message: error.message });
      }
    });

    /**
     * Disconnect
     */
    socket.on('disconnect', async () => {
      try {
        const { roomId, discordId } = socket.data as SocketData;

        if (roomId && discordId) {
          const players = await gameService.getLeaderboard(roomId);
          io.to(roomId).emit('room:player_left', {
            discordId,
            players,
          });
        }

        console.log(`Client disconnected: ${socket.id}`);
      } catch (error: any) {
        console.error('Disconnect error:', error);
      }
    });
  });
}

/**
 * Handle round end logic
 */
async function handleRoundEnd(io: Server, roomId: string) {
  try {
    const room = await Room.findOne({ roomId });

    if (!room || room.status !== RoomStatus.PLAYING) {
      return;
    }

    await gameService.endRound(roomId);

    const updatedRoom = await Room.findOne({ roomId });

    // Reveal the answer
    io.to(roomId).emit('round:ended', {
      answer: {
        title: updatedRoom?.currentSongData?.title,
        artist: updatedRoom?.currentSongData?.artist,
        trackId: updatedRoom?.currentSongData?.trackId,
      },
      artistGuessedBy: updatedRoom?.artistGuessedBy,
      titleGuessedBy: updatedRoom?.titleGuessedBy,
    });

    // Get updated leaderboard
    const leaderboard = await gameService.getLeaderboard(roomId);
    io.to(roomId).emit('game:leaderboard_update', { leaderboard });

    // Check if game is over
    if (updatedRoom && updatedRoom.currentRound >= updatedRoom.totalRounds) {
      setTimeout(async () => {
        const finalLeaderboard = await gameService.endGame(roomId);
        io.to(roomId).emit('game:ended', { leaderboard: finalLeaderboard });
      }, 5000); // 5 second delay before showing final results
    }
  } catch (error: any) {
    console.error('Round end error:', error);
  }
}

