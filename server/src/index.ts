import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'path';
import { connectDatabase } from './config/database';
import authRoutes from './routes/auth.routes';
import roomRoutes from './routes/room.routes';
import { setupSocketHandlers } from './sockets/socket.handlers';

// Load .env from server directory
// Check if we're already in the server directory or at project root
const isInServerDir = process.cwd().endsWith('server');
const envPath = isInServerDir 
  ? path.join(process.cwd(), '.env')
  : path.join(process.cwd(), 'server', '.env');
console.log('📁 Looking for .env at:', envPath);
dotenv.config({ path: envPath });

// Debug: Log environment variables (remove in production!)
console.log('🔍 Environment check:');
console.log('- SPOTIFY_CLIENT_ID:', process.env.SPOTIFY_CLIENT_ID ? '✓ Set' : '✗ Missing');
console.log('- SPOTIFY_CLIENT_SECRET:', process.env.SPOTIFY_CLIENT_SECRET ? '✓ Set' : '✗ Missing');
console.log('- SPOTIFY_REDIRECT_URI:', process.env.SPOTIFY_REDIRECT_URI || '✗ Missing');
console.log('- DISCORD_CLIENT_ID:', process.env.DISCORD_CLIENT_ID ? '✓ Set' : '✗ Missing');
console.log('- MONGODB_URI:', process.env.MONGODB_URI ? '✓ Set' : '✗ Missing');

const app = express();
const httpServer = createServer(app);

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// Health check
app.get('/health', (_req, res) => {
  return res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Setup Socket.IO handlers
setupSocketHandlers(io);

// Connect to database and start server
const PORT = process.env.PORT || 3000;

connectDatabase()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 WebSocket server ready`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

export { io };

