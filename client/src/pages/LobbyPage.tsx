import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { getSocket } from '../hooks/useSocketIO';
import { useDiscordSDK } from '../hooks/useDiscordSDK';
import './LobbyPage.css';

function LobbyPage() {
  const roomId = useGameStore((state) => state.roomId);
  const isHost = useGameStore((state) => state.isHost);
  const players = useGameStore((state) => state.players);
  const settings = useGameStore((state) => state.settings);

  const socket = getSocket();
  const { auth } = useDiscordSDK();

  useEffect(() => {
    if (!auth?.id) return;

    socket?.emit('room:join', {
      roomId,
      discordId: auth.id,
      username: auth.username || 'User',
      avatar: null,
    });
  }, [roomId, auth]);

  const handleStartGame = () => {
    if (!auth?.id) return;
    
    socket?.emit('game:start', {
      roomId,
      discordId: auth.id,
    });
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

