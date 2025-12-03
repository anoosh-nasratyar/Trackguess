import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useDiscordSDK } from '../hooks/useDiscordSDK';
import axios from 'axios';
import './HomePage.css';

function HomePage() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalRounds, setTotalRounds] = useState(5);
  const [roundDuration, setRoundDuration] = useState(30);
  const [songSource, setSongSource] = useState<'liked_songs' | 'playlist' | 'top_tracks'>('liked_songs');
  const [playlistId, setPlaylistId] = useState('');

  const setGameState = useGameStore((state) => state.setGameState);
  const setRoomId = useGameStore((state) => state.setRoomId);
  const setIsHost = useGameStore((state) => state.setIsHost);
  const setSettings = useGameStore((state) => state.setSettings);
  const spotifyConnected = useGameStore((state) => state.spotifyConnected);
  const setSpotifyConnected = useGameStore((state) => state.setSpotifyConnected);

  const { auth, sdk } = useDiscordSDK();

  const handleConnectSpotify = async () => {
    try {
      if (!auth?.id) {
        setError('Discord user not authenticated');
        return;
      }

      const response = await axios.post('/api/auth/spotify/init', {
        discordId: auth.id,
        discordUsername: auth.username || 'User',
        discordAvatar: null,
      });

      // Open Spotify OAuth in popup
      window.open(response.data.authUrl, '_blank', 'width=500,height=700');

      // Poll for connection status
      const checkInterval = setInterval(async () => {
        const statusResponse = await axios.get(`/api/auth/spotify/status/${auth.id}`);
        if (statusResponse.data.connected) {
          setSpotifyConnected(true);
          clearInterval(checkInterval);
        }
      }, 2000);

      // Clear interval after 2 minutes
      setTimeout(() => clearInterval(checkInterval), 120000);
    } catch (err: any) {
      console.error('Spotify connection error:', err);
      setError('Failed to connect Spotify');
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
      // Try to get channel/guild info from SDK
      let channelId = null;
      let guildId = null;
      
      try {
        const instanceInfo = await (sdk?.commands as any)?.getInstanceConnectedParticipants();
        channelId = instanceInfo?.channelId || null;
        guildId = instanceInfo?.guildId || null;
      } catch (e) {
        console.warn('Could not get instance info:', e);
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
    } catch (err: any) {
      console.error('Create room error:', err);
      setError(err.response?.data?.error || 'Failed to create room');
    } finally {
      setIsCreating(false);
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

        <div className="spotify-section">
          {spotifyConnected ? (
            <div className="connected">
              <span className="check-icon">✓</span>
              <span>Spotify Connected</span>
            </div>
          ) : (
            <button className="btn-primary" onClick={handleConnectSpotify}>
              Connect Spotify
            </button>
          )}
        </div>

        {spotifyConnected && (
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
        )}
      </div>
    </div>
  );
}

export default HomePage;

