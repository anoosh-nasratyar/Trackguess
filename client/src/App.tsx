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
    // Only wait for Discord SDK, Socket.IO is optional (may be blocked by CSP)
    if (isReady) {
      setLoading(false);
    }
  }, [isReady]);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>Loading TrackGuess...</p>
      </div>
    );
  }

  // Only show critical SDK errors, Socket.IO errors are expected in Discord Activities
  if (sdkError && !auth) {
    return (
      <div className="loading">
        <div className="error">
          <h2>Error</h2>
          <p>{sdkError}</p>
          <p style={{ fontSize: '0.9em', marginTop: '1rem', opacity: 0.8 }}>
            Make sure you're opening this inside Discord as an Activity.
          </p>
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
      {/* Show warning if Socket.IO is not connected (expected in Discord Activities) */}
      {!isConnected && socketError && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          padding: '8px 12px',
          background: 'rgba(255, 165, 0, 0.9)',
          color: 'white',
          borderRadius: '4px',
          fontSize: '0.8em',
          zIndex: 1000,
        }}>
          ⚠️ Real-time features unavailable (Discord CSP)
        </div>
      )}
      
      {gameState === 'home' && <HomePage />}
      {gameState === 'lobby' && <LobbyPage />}
      {gameState === 'playing' && <GamePage />}
      {gameState === 'ended' && <EndPage />}
    </div>
  );
}

export default App;

