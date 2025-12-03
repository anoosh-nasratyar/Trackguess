import { useEffect, useState } from 'react';
import { useDiscordSDK } from './hooks/useDiscordSDK';
import { useSocketIO } from './hooks/useSocketIO';
import { useGameStore } from './store/gameStore';
import HomePage from './pages/HomePage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import EndPage from './pages/EndPage';

function App() {
  const { isReady, error: sdkError, auth } = useDiscordSDK();
  const { isConnected, error: socketError } = useSocketIO();
  const gameState = useGameStore((state) => state.gameState);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isReady && isConnected) {
      setLoading(false);
    }
  }, [isReady, isConnected]);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>Loading TrackGuess...</p>
      </div>
    );
  }

  if (sdkError || socketError) {
    return (
      <div className="loading">
        <div className="error">
          <h2>Error</h2>
          <p>{sdkError || socketError}</p>
        </div>
      </div>
    );
  }

  if (!auth) {
    return (
      <div className="loading">
        <p>Authenticating...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {gameState === 'home' && <HomePage />}
      {gameState === 'lobby' && <LobbyPage />}
      {gameState === 'playing' && <GamePage />}
      {gameState === 'ended' && <EndPage />}
    </div>
  );
}

export default App;

