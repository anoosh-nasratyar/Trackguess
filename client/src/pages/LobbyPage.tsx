import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { getSocket } from '../hooks/useSocketIO';
import { useDiscordSDK } from '../hooks/useDiscordSDK';
import axios from 'axios';
import './LobbyPage.css';

function LobbyPage() {
  const roomId = useGameStore((state) => state.roomId);
  const isHost = useGameStore((state) => state.isHost);
  const players = useGameStore((state) => state.players);
  const settings = useGameStore((state) => state.settings);
  const setPlayers = useGameStore((state) => state.setPlayers);

  const socket = getSocket();
  const { auth } = useDiscordSDK();
  const [isJoining, setIsJoining] = useState(false);

  // Fetch room data and join via API (Socket.IO is blocked by CSP)
  useEffect(() => {
    if (!auth?.id || !roomId) return;

    const fetchRoomData = async () => {
      try {
        // Try to join via API first
        setIsJoining(true);
        await axios.post('/api/rooms/join', {
          roomId,
          discordId: auth.id,
          discordUsername: auth.username || 'User',
          discordAvatar: null,
        });
        setIsJoining(false);

        // Fetch room data
        const response = await axios.get(`/api/rooms/${roomId}`);
        // Map API response to match expected format
        const playersData = (response.data.players || []).map((p: any) => ({
          discordId: p.discordId,
          username: p.username || p.discordUsername,
          avatar: p.avatar || p.discordAvatar,
          score: p.score || 0,
          spotifyConnected: p.spotifyConnected || false,
        }));
        setPlayers(playersData);

        // Also try Socket.IO (may not work due to CSP)
        socket?.emit('room:join', {
          roomId,
          discordId: auth.id,
          username: auth.username || 'User',
          avatar: null,
        });
      } catch (err: any) {
        console.error('Failed to join room:', err);
        setIsJoining(false);
        // Still try to fetch room data
        try {
          const response = await axios.get(`/api/rooms/${roomId}`);
          setPlayers(response.data.players || []);
        } catch (fetchErr) {
          console.error('Failed to fetch room data:', fetchErr);
        }
      }
    };

    fetchRoomData();

        // Poll for player updates (since Socket.IO is blocked)
        const pollInterval = setInterval(async () => {
          try {
            const response = await axios.get(`/api/rooms/${roomId}`);
            // Map API response to match expected format
            const playersData = (response.data.players || []).map((p: any) => ({
              discordId: p.discordId,
              username: p.username || p.discordUsername,
              avatar: p.avatar || p.discordAvatar,
              score: p.score || 0,
              spotifyConnected: p.spotifyConnected || false,
            }));
            setPlayers(playersData);
          } catch (err) {
            console.error('Failed to poll room data:', err);
          }
        }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [roomId, auth, setPlayers, socket]);

  const handleStartGame = async () => {
    if (!auth?.id || !isHost) return;
    
    try {
      // Try Socket.IO first (may not work due to CSP)
      socket?.emit('game:start', {
        roomId,
        discordId: auth.id,
      });
      
      // Fallback: Start game via API if Socket.IO fails
      // Note: This would require a new API endpoint for starting games
      // For now, we'll rely on Socket.IO working or manual refresh
    } catch (err) {
      console.error('Failed to start game:', err);
    }
  };

  return (
    <div className="container lobby-page">
      <div className="card lobby-card">
        <h1>Game Lobby</h1>
        <p className="room-code">Room Code: <strong>{roomId}</strong></p>

        <div className="settings-info">
          <h3>Game Settings</h3>
          <div className="settings-grid">
            <div className="setting-item">
              <span className="label">Rounds:</span>
              <span className="value">{settings?.totalRounds}</span>
            </div>
            <div className="setting-item">
              <span className="label">Duration:</span>
              <span className="value">{settings?.roundDuration}s</span>
            </div>
            <div className="setting-item">
              <span className="label">Source:</span>
              <span className="value">
                {settings?.songSource === 'liked_songs' && 'Liked Songs'}
                {settings?.songSource === 'playlist' && 'Playlist'}
                {settings?.songSource === 'top_tracks' && 'Top Tracks'}
              </span>
            </div>
          </div>
        </div>

        <div className="players-section">
          <h3>Players ({players.length}/10)</h3>
          <div className="players-list">
            {players.map((player) => (
              <div key={player.discordId} className="player-item">
                {player.avatar && (
                  <img
                    src={`https://cdn.discordapp.com/avatars/${player.discordId}/${player.avatar}.png`}
                    alt={player.username}
                    className="player-avatar"
                  />
                )}
                <span className="player-name">{player.username}</span>
                {player.spotifyConnected && (
                  <span className="spotify-badge">🎵</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {isHost && (
          <button
            className="btn-primary start-btn"
            onClick={handleStartGame}
            disabled={players.length < 2}
          >
            Start Game
          </button>
        )}

        {!isHost && (
          <p className="waiting-text">Waiting for host to start the game...</p>
        )}
      </div>
    </div>
  );
}

export default LobbyPage;

