import { useGameStore } from '../store/gameStore';
import './EndPage.css';

function EndPage() {
  const players = useGameStore((state) => state.players);
  const resetGame = useGameStore((state) => state.resetGame);

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];

  const handlePlayAgain = () => {
    resetGame();
  };

  return (
    <div className="container end-page">
      <div className="card end-card">
        <h1 className="game-over-title">🏆 Game Over!</h1>

        <div className="winner-section">
          <div className="winner-badge">👑</div>
          {winner?.avatar && (
            <img
              src={`https://cdn.discordapp.com/avatars/${winner.discordId}/${winner.avatar}.png`}
              alt={winner.username}
              className="winner-avatar"
            />
          )}
          <h2 className="winner-name">{winner?.username}</h2>
          <div className="winner-score">{winner?.score} points</div>
        </div>

        <div className="final-leaderboard">
          <h3>Final Rankings</h3>
          <div className="podium">
            {sortedPlayers.slice(0, 3).map((player, index) => (
              <div key={player.discordId} className={`podium-place place-${index + 1}`}>
                <div className="podium-rank">
                  {index === 0 && '🥇'}
                  {index === 1 && '🥈'}
                  {index === 2 && '🥉'}
                </div>
                {player.avatar && (
                  <img
                    src={`https://cdn.discordapp.com/avatars/${player.discordId}/${player.avatar}.png`}
                    alt={player.username}
                    className="podium-avatar"
                  />
                )}
                <div className="podium-name">{player.username}</div>
                <div className="podium-score">{player.score}</div>
              </div>
            ))}
          </div>

          {sortedPlayers.length > 3 && (
            <div className="other-players">
              {sortedPlayers.slice(3).map((player, index) => (
                <div key={player.discordId} className="other-player-item">
                  <span className="other-rank">#{index + 4}</span>
                  {player.avatar && (
                    <img
                      src={`https://cdn.discordapp.com/avatars/${player.discordId}/${player.avatar}.png`}
                      alt={player.username}
                      className="other-avatar"
                    />
                  )}
                  <span className="other-name">{player.username}</span>
                  <span className="other-score">{player.score}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="end-actions">
          <button className="btn-primary" onClick={handlePlayAgain}>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default EndPage;

