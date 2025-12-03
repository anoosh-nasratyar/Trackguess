import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useDiscordSDK } from '../hooks/useDiscordSDK';
import axios from 'axios';
import './HomePage.css';

interface ActiveRoom {
  roomId: string;
  status: string;
  totalRounds: number;
  currentRound: number;
  roundDuration: number;
  songSource: string;
  isHost: boolean;
  playerCount: number;
  maxPlayers: number;
  createdAt: string;
}

function HomePage() {
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCheckingSpotify, setIsCheckingSpotify] = useState(true);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [isClosingRoom, setIsClosingRoom] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [totalRounds, setTotalRounds] = useState(5);
  const [roundDuration, setRoundDuration] = useState(30);
  const [songSource, setSongSource] = useState<'liked_songs' | 'playlist' | 'top_tracks'>('liked_songs');
  const [playlistId, setPlaylistId] = useState('');

  const setGameState = useGameStore((state) => state.setGameState);
  const setRoomId = useGameStore((state) => state.setRoomId);
  const setIsHost = useGameStore((state) => state.setIsHost);
  const setSettings = useGameStore((state) => state.setSettings);
  const setPlayers = useGameStore((state) => state.setPlayers);
  const spotifyConnected = useGameStore((state) => state.spotifyConnected);
  const setSpotifyConnected = useGameStore((state) => state.setSpotifyConnected);

  const { auth, sdk } = useDiscordSDK();

  // Check Spotify connection status on load and handle OAuth callback
  useEffect(() => {
    if (!auth?.id) {
      setIsCheckingSpotify(false);
      return;
    }

    const checkSpotifyStatus = async () => {
      try {
        setIsCheckingSpotify(true);
        const response = await axios.get(`/api/auth/spotify/status/${auth.id}`);
        console.log('Spotify status response:', response.data);
        
        // Check connection status - handle both old and new response formats
        const isConnected = response.data.connected === true && 
                           (response.data.hasValidToken === true || response.data.hasValidToken === undefined);
        
        setSpotifyConnected(isConnected);
        
        // If token was refreshed, show a brief message
        if (response.data.refreshed) {
          console.log('✅ Spotify token refreshed automatically');
        }
        
        // If needs reconnect, log it
        if (response.data.needsReconnect) {
          console.log('⚠️ Spotify needs reconnection');
        }
      } catch (err: any) {
        console.error('Failed to check Spotify status:', err);
        console.error('Error details:', err.response?.data);
        setSpotifyConnected(false);
      } finally {
        setIsCheckingSpotify(false);
      }
    };

    // Check URL params for OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const spotifyParam = urlParams.get('spotify');
    const errorParam = urlParams.get('error');

    if (spotifyParam === 'connected') {
      // Just connected, check status
      checkSpotifyStatus();
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (errorParam === 'auth_failed') {
      setError('Spotify authentication failed. Please try again.');
      setSpotifyConnected(false);
      setIsCheckingSpotify(false);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      // Regular status check
      checkSpotifyStatus();
    }
  }, [auth?.id, setSpotifyConnected]);

  // Fetch active rooms on load
  useEffect(() => {
    if (!auth?.id) return;

    const fetchActiveRooms = async () => {
      try {
        setIsLoadingRooms(true);
        const response = await axios.get(`/api/rooms/user/${auth.id}/active`);
        setActiveRooms(response.data.rooms || []);
      } catch (err) {
        console.error('Failed to fetch active rooms:', err);
      } finally {
        setIsLoadingRooms(false);
      }
    };

    fetchActiveRooms();
  }, [auth?.id]);

  const handleReconnectRoom = async (roomId: string) => {
    if (!auth?.id) return;

    setIsJoining(true);
    setError(null);

    try {
      const response = await axios.post('/api/rooms/reconnect', {
        roomId,
        discordId: auth.id,
        discordUsername: auth.username || 'User',
        discordAvatar: null,
      });

      setRoomId(response.data.room.roomId);
      setIsHost(response.data.room.isHost);
      setSettings({
        totalRounds: response.data.room.totalRounds,
        roundDuration: response.data.room.roundDuration,
        songSource: response.data.room.songSource,
        songSourceId: undefined,
      });
      
      // Set players if available
      if (response.data.players) {
        setPlayers(response.data.players);
      }

      // Navigate based on room status
      if (response.data.room.status === 'WAITING') {
        setGameState('lobby');
      } else if (response.data.room.status === 'PLAYING') {
        setGameState('playing');
      } else {
        setGameState('lobby');
      }
    } catch (err: any) {
      console.error('Reconnect room error:', err);
      setError(err.response?.data?.error || 'Failed to reconnect to room');
    } finally {
      setIsJoining(false);
    }
  };

  const handleCloseRoom = async (roomId: string) => {
    if (!auth?.id) return;

    setIsClosingRoom(roomId);
    setError(null);

    try {
      await axios.post('/api/rooms/close', {
        roomId,
        discordId: auth.id,
      });

      // Remove from active rooms list
      setActiveRooms(activeRooms.filter((r) => r.roomId !== roomId));
    } catch (err: any) {
      console.error('Close room error:', err);
      setError(err.response?.data?.error || 'Failed to close room');
    } finally {
      setIsClosingRoom(null);
    }
  };

  const handleConnectSpotify = async () => {
    if (isConnecting) return; // Prevent double clicks
    
    try {
      setIsConnecting(true);
      setError(null);
      
      if (!auth?.id) {
        setError('Discord user not authenticated');
        return;
      }

      const response = await axios.post('/api/auth/spotify/init', {
        discordId: auth.id,
        discordUsername: auth.username || 'User',
        discordAvatar: null,
      });

      // Open Spotify OAuth using Discord SDK (required for Activities)
      await (sdk?.commands as any)?.openExternalLink({
        url: response.data.authUrl,
      });

      // Poll for connection status
      let pollCount = 0;
      const maxPolls = 60; // 2 minutes max (60 * 2 seconds)
      
      const checkInterval = setInterval(async () => {
        pollCount++;
        try {
          const statusResponse = await axios.get(`/api/auth/spotify/status/${auth.id}`);
          if (statusResponse.data.connected && statusResponse.data.hasValidToken) {
            setSpotifyConnected(true);
            clearInterval(checkInterval);
            setError(null);
          }
        } catch (err) {
          console.error('Status check error:', err);
        }
        
        // Stop polling after max attempts
        if (pollCount >= maxPolls) {
          clearInterval(checkInterval);
          setError('Connection timeout. Please check if you completed the authorization.');
        }
      }, 2000);
    } catch (err: any) {
      console.error('Spotify connection error:', err);
      setError('Failed to connect Spotify');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!spotifyConnected) {
      setError('Please connect your Spotify account first');
      return;
    }

    if (songSource === 'playlist' && !playlistId) {
      setError('Please enter a playlist ID');
      return;
    }

    if (!auth?.id) {
      setError('Discord user not authenticated');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Get channel/guild info from SDK (available without OAuth)
      let channelId = null;
      let guildId = null;
      
      if (sdk) {
        channelId = (sdk as any).channelId || null;
        guildId = (sdk as any).guildId || null;
      }

      const response = await axios.post('/api/rooms/create', {
        hostId: auth.id,
        discordUsername: auth.username || 'User',
        discordAvatar: null,
        voiceChannelId: channelId,
        guildId: guildId,
        totalRounds,
        roundDuration,
        songSource,
        songSourceId: songSource === 'playlist' ? playlistId : undefined,
      });

      setRoomId(response.data.room.roomId);
      setIsHost(true);
      setSettings({
        totalRounds,
        roundDuration,
        songSource,
        songSourceId: songSource === 'playlist' ? playlistId : undefined,
      });
      setGameState('lobby');
      
      // Refresh active rooms list
      if (auth?.id) {
        const roomsResponse = await axios.get(`/api/rooms/user/${auth.id}/active`);
        setActiveRooms(roomsResponse.data.rooms || []);
      }
    } catch (err: any) {
      console.error('Create room error:', err);
      const errorMsg = err.response?.data?.error || 'Failed to create room';
      setError(errorMsg);
      
      // If room already exists, offer to reconnect
      if (err.response?.data?.roomId) {
        setError(`${errorMsg}. Click "Reconnect" below to join your existing room.`);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinRoomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    if (!auth?.id) {
      setError('Discord user not authenticated');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      // Join the room via API
      await axios.post('/api/rooms/join', {
        roomId: joinRoomCode.trim(),
        discordId: auth.id,
        discordUsername: auth.username || 'User',
        discordAvatar: null,
      });

      // Fetch room data to get settings
      const response = await axios.get(`/api/rooms/${joinRoomCode.trim()}`);
      
      setRoomId(response.data.room.roomId);
      setIsHost(false); // Not the host
      setSettings({
        totalRounds: response.data.room.totalRounds,
        roundDuration: response.data.room.roundDuration,
        songSource: response.data.room.songSource,
        songSourceId: response.data.room.songSourceId,
      });
      setGameState('lobby');
      
      // Refresh active rooms list
      if (auth?.id) {
        try {
          const roomsResponse = await axios.get(`/api/rooms/user/${auth.id}/active`);
          setActiveRooms(roomsResponse.data.rooms || []);
        } catch (err) {
          console.error('Failed to refresh rooms:', err);
        }
      }
    } catch (err: any) {
      console.error('Join room error:', err);
      setError(err.response?.data?.error || 'Failed to join room. Check the room code.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="container home-page">
      <div className="card home-card">
        <h1>🎵 TrackGuess</h1>
        <p className="subtitle">Guess the song and compete with friends!</p>

        {error && (
          <div className="error">
            <p>{error}</p>
          </div>
        )}

        {/* Active Rooms Section */}
        {auth?.id && (
          <div className="active-rooms-section">
            <h2>Your Active Rooms</h2>
            {isLoadingRooms ? (
              <p>Loading rooms...</p>
            ) : activeRooms.length > 0 ? (
              <div className="rooms-list">
                {activeRooms.map((room) => (
                  <div key={room.roomId} className="room-card">
                    <div className="room-info">
                      <div className="room-header">
                        <span className="room-code-badge">{room.roomId}</span>
                        {room.isHost && <span className="host-badge">Host</span>}
                        <span className={`status-badge ${room.status.toLowerCase()}`}>
                          {room.status}
                        </span>
                      </div>
                      <div className="room-details">
                        <span>Round {room.currentRound}/{room.totalRounds}</span>
                        <span>•</span>
                        <span>{room.playerCount}/{room.maxPlayers} players</span>
                        <span>•</span>
                        <span>{room.roundDuration}s per round</span>
                      </div>
                    </div>
                    <div className="room-actions">
                      <button
                        className="btn-primary btn-sm"
                        onClick={() => handleReconnectRoom(room.roomId)}
                        disabled={isJoining}
                      >
                        {isJoining ? 'Joining...' : 'Reconnect'}
                      </button>
                      {room.isHost && (
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => handleCloseRoom(room.roomId)}
                          disabled={isClosingRoom === room.roomId}
                        >
                          {isClosingRoom === room.roomId ? 'Closing...' : 'Close'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-rooms">No active rooms</p>
            )}
          </div>
        )}

        <div className="spotify-section">
          {isCheckingSpotify ? (
            <div className="checking">
              <span>Checking Spotify connection...</span>
            </div>
          ) : spotifyConnected ? (
            <div className="connected">
              <span className="check-icon">✓</span>
              <span>Spotify Connected</span>
            </div>
          ) : (
            <button 
              className="btn-primary" 
              onClick={handleConnectSpotify}
              disabled={isConnecting}
            >
              {isConnecting ? 'Opening Spotify...' : 'Connect Spotify'}
            </button>
          )}
        </div>

        {spotifyConnected && (
          <>
            <div className="join-room-section">
              <h2>Join a Room</h2>
              <div className="form-group">
                <label>Room Code</label>
                <input
                  type="text"
                  placeholder="Enter room code (e.g., 0207a2af5fd2)"
                  value={joinRoomCode}
                  onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                  maxLength={12}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
              <button
                className="btn-secondary"
                onClick={handleJoinRoom}
                disabled={isJoining || !joinRoomCode.trim()}
              >
                {isJoining ? 'Joining...' : 'Join Room'}
              </button>
            </div>

            <div className="divider">OR</div>

            <div className="create-room-section">
              <h2>Create a Room</h2>

            <div className="form-group">
              <label>Number of Rounds</label>
              <select value={totalRounds} onChange={(e) => setTotalRounds(Number(e.target.value))}>
                <option value={5}>5 Rounds</option>
                <option value={10}>10 Rounds</option>
                <option value={15}>15 Rounds</option>
                <option value={20}>20 Rounds</option>
              </select>
            </div>

            <div className="form-group">
              <label>Round Duration</label>
              <select value={roundDuration} onChange={(e) => setRoundDuration(Number(e.target.value))}>
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={45}>45 seconds</option>
                <option value={60}>60 seconds</option>
              </select>
            </div>

            <div className="form-group">
              <label>Song Source</label>
              <select value={songSource} onChange={(e) => setSongSource(e.target.value as any)}>
                <option value="liked_songs">My Liked Songs</option>
                <option value="playlist">Playlist</option>
                <option value="top_tracks">My Top Tracks</option>
              </select>
            </div>

            {songSource === 'playlist' && (
              <div className="form-group">
                <label>Playlist ID</label>
                <input
                  type="text"
                  placeholder="Enter Spotify Playlist ID"
                  value={playlistId}
                  onChange={(e) => setPlaylistId(e.target.value)}
                />
              </div>
            )}

            <button
              className="btn-primary create-btn"
              onClick={handleCreateRoom}
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Room'}
            </button>
          </div>
          </>
        )}
      </div>
    </div>
  );
}

export default HomePage;

