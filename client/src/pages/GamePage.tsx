import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { getSocket } from '../hooks/useSocketIO';
import { useDiscordSDK } from '../hooks/useDiscordSDK';
import { useSpotify } from '../hooks/useSpotify';
import './GamePage.css';

function GamePage() {
  const [guess, setGuess] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const roomId = useGameStore((state) => state.roomId);
  const currentRound = useGameStore((state) => state.currentRound);
  const currentSong = useGameStore((state) => state.currentSong);
  const settings = useGameStore((state) => state.settings);
  const players = useGameStore((state) => state.players);
  const spotifyConnected = useGameStore((state) => state.spotifyConnected);
  const guessedArtist = useGameStore((state) => state.guessedArtist);
  const guessedTitle = useGameStore((state) => state.guessedTitle);
  const setGuessedArtist = useGameStore((state) => state.setGuessedArtist);
  const setGuessedTitle = useGameStore((state) => state.setGuessedTitle);

  const socket = getSocket();
  const { auth } = useDiscordSDK();

  // Initialize Spotify player (if connected)
  const spotifyAccessToken = null; // TODO: Get from auth
  useSpotify(spotifyAccessToken);

  // Timer
  useEffect(() => {
    if (!currentSong || !settings) return;

    const startTime = currentSong.startTime;
    const duration = settings.roundDuration * 1000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [currentSong, settings]);

  // Listen for correct guesses
  useEffect(() => {
    const handleCorrectGuess = (data: { discordId: string; username: string; type: string; points: number }) => {
      if (data.type === 'artist' || data.type === 'both') {
        setGuessedArtist(true);
      }
      if (data.type === 'title' || data.type === 'both') {
        setGuessedTitle(true);
      }

      setNotification({
        message: `${data.username} guessed ${data.type} correctly! +${data.points} points`,
        type: 'success',
      });

      setTimeout(() => setNotification(null), 3000);
    };

    socket?.on('game:correct_guess', handleCorrectGuess);

    return () => {
      socket?.off('game:correct_guess', handleCorrectGuess);
    };
  }, [socket]);

  const handleSubmitGuess = (e: React.FormEvent) => {
    e.preventDefault();

    if (!guess.trim() || !auth?.id) return;

    socket?.emit('game:guess', {
      roomId,
      discordId: auth.id,
      guess: guess.trim(),
    });

    setGuess('');
  };

  const progressPercentage = settings ? (timeLeft / settings.roundDuration) * 100 : 0;

  return (
    <div className="container game-page">
      <div className="game-header">
        <div className="round-info">
          Round {currentRound} / {settings?.totalRounds}
        </div>
        <div className="timer-container">
          <div className="timer-progress" style={{ width: `${progressPercentage}%` }} />
          <div className="timer-text">{timeLeft}s</div>
        </div>
      </div>

      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="game-content">
        <div className="album-art-section">
          {currentSong?.albumArt ? (
            <img src={currentSong.albumArt} alt="Album Art" className="album-art" />
          ) : (
            <div className="album-art-placeholder">🎵</div>
          )}

          {!spotifyConnected && (
            <div className="no-spotify-warning">
              <p>⚠️ Connect Spotify to hear the music!</p>
            </div>
          )}

          <div className="hints">
            {guessedArtist && (
              <div className="hint hint-revealed">
                ✓ Artist has been guessed!
              </div>
            )}
            {guessedTitle && (
              <div className="hint hint-revealed">
                ✓ Title has been guessed!
              </div>
            )}
          </div>
        </div>

        <div className="guess-section">
          <h2>Make Your Guess</h2>
          <form onSubmit={handleSubmitGuess}>
            <input
              type="text"
              className="guess-input"
              placeholder="Type artist or song title..."
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              autoFocus
            />
            <button type="submit" className="btn-primary guess-btn">
              Submit
            </button>
          </form>
        </div>

        <div className="leaderboard-section">
          <h3>Leaderboard</h3>
          <div className="leaderboard">
            {players
              .sort((a, b) => b.score - a.score)
              .map((player, index) => (
                <div key={player.discordId} className="leaderboard-item">
                  <span className="rank">#{index + 1}</span>
                  {player.avatar && (
                    <img
                      src={`https://cdn.discordapp.com/avatars/${player.discordId}/${player.avatar}.png`}
                      alt={player.username}
                      className="player-avatar-small"
                    />
                  )}
                  <span className="player-name">{player.username}</span>
                  <span className="player-score">{player.score}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GamePage;

