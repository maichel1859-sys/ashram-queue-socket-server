/**
 * Socket.IO server for queue management
 * Integration ready for aadhram-app
 * Single port with Socket.IO Admin monitoring
 */

import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { instrument } from '@socket.io/admin-ui';
import cors from 'cors';
import { config } from './config/env';
import { registerConnectionHandlers } from './middleware/connection.middleware';
import { registerQueueHandlers } from './handlers/queue.handlers';
import { registerRealTimeHandlers } from './handlers/real-time.handlers';

// Create Express app
const app = express();

// Configure CORS
app.use(cors({
  origin: [config.corsOrigin, "https://admin.socket.io"],
  methods: ['GET', 'POST'],
  credentials: true
}));

// Add JSON parsing middleware
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
  path: config.socketPath,
  cors: {
    origin: [config.corsOrigin, "https://admin.socket.io"],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Add Socket.IO Admin UI for monitoring with authentication
if (config.adminAuth && (!config.adminUsername || !config.adminPassword)) {
  console.warn('⚠️ Admin authentication enabled but credentials not provided. Admin UI will be disabled.');
  console.warn('   Set ADMIN_USERNAME and ADMIN_PASSWORD environment variables to enable admin authentication.');
} else {
  instrument(io, { 
    auth: config.adminAuth ? {
      type: "basic",
      username: config.adminUsername!,
      password: config.adminPassword!
    } : false, 
    mode: config.adminMode as "development" | "production", 
    serverId: `ashram-queue-${config.nodeEnv}-${config.port}`, 
    readonly: false
  });
}

// Basic health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    socketConnections: io.engine.clientsCount,
    environment: config.nodeEnv,
    adminUrl: "https://admin.socket.io"
  });
});

// Broadcast API endpoint for external applications
app.post('/api/broadcast', (req: Request, res: Response) => {
  try {
    const { event, data, rooms } = req.body;
    
    if (!event || !data || !rooms) {
      return res.status(400).json({ 
        error: 'Missing required fields: event, data, rooms' 
      });
    }
    
    // Broadcast to specified rooms
    rooms.forEach((room: string) => {
      io.to(room).emit(event, {
        ...data,
        timestamp: new Date().toISOString(),
        broadcastedAt: Date.now()
      });
    });
    
    console.log(`🔌 Broadcasted event '${event}' to ${rooms.length} rooms:`, rooms);
    
    res.status(200).json({ 
      success: true, 
      message: `Event '${event}' broadcasted to ${rooms.length} rooms`,
      rooms,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Broadcast API error:', error);
    res.status(500).json({ 
      error: 'Failed to broadcast event',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  try {
    // Register connection handlers
    registerConnectionHandlers(socket);
    
    // Register queue handlers
    registerQueueHandlers(socket, io);
    
    // Register real-time handlers
    registerRealTimeHandlers(socket);
    
    console.log(`Client connected: ${socket.id}, Total connections: ${io.engine.clientsCount}`);
  } catch (error) {
    console.error('Error handling socket connection:', error);
    socket.emit('error', { 
      message: 'Connection setup failed', 
      code: 'CONNECTION_ERROR' 
    });
  }
});

// Socket.IO error handling
io.engine.on('connection_error', (err) => {
  console.error('Socket.IO connection error:', err);
});

// Start server
server.listen(Number(config.port), config.host, () => {
  console.log(`🚀 Socket.IO server running at http://${config.host}:${config.port}`);
  console.log(`📱 Environment: ${config.nodeEnv}`);
  console.log(`🌐 CORS origin: ${config.corsOrigin}`);
  console.log(`🔌 Socket path: ${config.socketPath}`);
  console.log(`📊 Ready to handle queue management events`);
  console.log(`🔍 Socket.IO Admin: https://admin.socket.io`);
  console.log(`💡 Only ONE port running: ${config.port}`);
});

// Handle server shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server shut down gracefully');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down server...');
  server.close(() => {
    console.log('✅ Server shut down gracefully');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  server.close(() => {
    console.log('✅ Server shut down due to uncaught exception');
    process.exit(1);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  server.close(() => {
    console.log('✅ Server shut down due to unhandled rejection');
    process.exit(1);
  });
});