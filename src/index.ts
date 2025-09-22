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
import { registerPresenceHandlers } from './handlers/presence.handlers';
import { initializeCounters } from './handlers/counters.handlers';
import { registerProgressHandlers, initializeProgressSystem } from './handlers/progress.handlers';
import { registerTabSyncHandlers, initializeTabSyncSystem } from './handlers/tab-sync.handlers';

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
  transports: ['websocket', 'polling'],
  allowEIO3: true
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
    readonly: false,
    namespaceName: "/admin"
  });
}

// Basic health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    socketConnections: io.engine.clientsCount,
    environment: config.nodeEnv,
    adminUrl: "https://admin.socket.io",
    serverUrl: config.appUrl,
    corsOrigin: config.corsOrigin
  });
});

// Admin UI info endpoint
app.get('/admin-info', (_req: Request, res: Response) => {
  res.status(200).json({
    adminEnabled: !config.adminAuth || (config.adminUsername && config.adminPassword),
    adminMode: config.adminMode,
    serverId: `ashram-queue-${config.nodeEnv}-${config.port}`,
    adminUrl: "https://admin.socket.io",
    serverUrl: config.appUrl
  });
});

// Unified emit endpoint for all socket events
app.post('/emit', (req: Request, res: Response): void => {
  try {
    const { type, appointmentId, queueId, consultationId, remedyId, notificationId, userId, gurujiId, clinicId, data, rooms } = req.body;
    
    if (!type || !data) {
      res.status(400).json({ 
        error: 'Missing required fields: type, data' 
      });
      return;
    }
    
    // Create the event payload
    const eventPayload = {
      id: `${type}-${Date.now()}`,
      type,
      timestamp: Date.now(),
      userId,
      gurujiId,
      clinicId,
      appointmentId,
      queueId,
      consultationId,
      remedyId,
      notificationId,
      data,
      rooms: rooms || []
    };
    
    // Handle different event types with specific broadcasting logic
    switch (type) {
      case 'appointment.created':
      case 'appointment.updated':
      case 'appointment.cancelled':
      case 'appointment.rescheduled':
      case 'appointment.checked_in':
      case 'appointment.completed':
      case 'appointment.reminder':
        // Broadcast to appointment-related rooms
        const appointmentRooms = ['appointments', 'admin', 'coordinator'];
        if (userId) appointmentRooms.push(`user:${userId}`);
        if (gurujiId) appointmentRooms.push(`guruji:${gurujiId}`);
        
        appointmentRooms.forEach(room => {
          io.to(room).emit('appointment_update', eventPayload);
        });
        break;
        
      case 'queue.entry_added':
      case 'queue.entry_updated':
      case 'queue.entry_removed':
      case 'queue.position_updated':
        // Broadcast to queue-related rooms
        const queueRooms = ['queue', 'admin', 'coordinator'];
        if (userId) queueRooms.push(`user:${userId}`);
        if (gurujiId) queueRooms.push(`guruji:${gurujiId}`);
        
        queueRooms.forEach(room => {
          io.to(room).emit('queue_update', eventPayload);
        });
        break;
        
      case 'consultation.started':
      case 'consultation.ended':
      case 'consultation.updated':
        // Broadcast to consultation-related rooms
        const consultationRooms = ['consultations', 'admin', 'coordinator'];
        if (userId) consultationRooms.push(`user:${userId}`);
        if (gurujiId) consultationRooms.push(`guruji:${gurujiId}`);
        
        consultationRooms.forEach(room => {
          io.to(room).emit('consultation_update', eventPayload);
        });
        break;
        
      case 'remedy.prescribed':
      case 'remedy.updated':
      case 'remedy.completed':
        // Broadcast to remedy-related rooms
        const remedyRooms = ['remedies', 'admin', 'coordinator'];
        if (userId) remedyRooms.push(`user:${userId}`);
        if (gurujiId) remedyRooms.push(`guruji:${gurujiId}`);
        
        remedyRooms.forEach(room => {
          io.to(room).emit('remedy_update', eventPayload);
        });
        break;
        
      case 'notification.sent':
      case 'notification.read':
      case 'notification.deleted':
        // Broadcast to notification-related rooms
        const notificationRooms = ['notifications'];
        if (userId) notificationRooms.push(`user:${userId}`);
        
        notificationRooms.forEach(room => {
          io.to(room).emit('notification_update', eventPayload);
        });
        break;
        
      case 'user.registered':
      case 'user.updated':
      case 'user.status_changed':
        // Broadcast to admin rooms
        io.to('admin').emit('user_update', eventPayload);
        break;
        
      case 'guruji.available':
      case 'guruji.busy':
      case 'guruji.offline':
      case 'guruji.schedule_updated':
        // Broadcast to admin and coordinator rooms
        io.to('admin').emit('guruji_update', eventPayload);
        io.to('coordinator').emit('guruji_update', eventPayload);
        if (gurujiId) {
          io.to(`guruji:${gurujiId}`).emit('guruji_update', eventPayload);
        }
        break;
        
      case 'system.maintenance':
      case 'system.update':
      case 'system.error':
        // Broadcast to global rooms
        io.to('global').emit('system_update', eventPayload);
        break;
        
      default:
        // Generic broadcast to specified rooms
        const defaultRooms = rooms || ['global'];
        defaultRooms.forEach((room: string) => {
          io.to(room).emit(type, eventPayload);
        });
        break;
    }
    
    console.log(`🔌 Emitted event '${type}' to appropriate rooms`);
    
    res.status(200).json({ 
      success: true, 
      message: `Event '${type}' emitted successfully`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Emit API error:', error);
    res.status(500).json({ 
      error: 'Failed to emit event',
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
    
    // Register presence handlers
    registerPresenceHandlers(socket);
    
    // Register progress handlers
    registerProgressHandlers(socket);
    
    // Register tab sync handlers
    registerTabSyncHandlers(socket);
    
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
  
  // Initialize real-time systems
  initializeCounters();
  initializeProgressSystem();
  initializeTabSyncSystem();
  
  console.log(`✨ Real-time systems initialized: presence, counters, progress, tab-sync`);
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