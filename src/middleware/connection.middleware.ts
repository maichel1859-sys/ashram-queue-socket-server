/**
 * Connection management middleware for Socket.IO
 * Optimized for 10,000+ concurrent users
 */

import { Socket } from 'socket.io';
import { RoomJoinRequest, QueueSocketEvents } from '../types/queue.types';

// Connection tracking for rate limiting and memory management
const connectionTracker = new Map<string, {
  connectionTime: number;
  lastActivity: number;
  eventCount: number;
  roomCount: number;
}>();

// Rate limiting map
const rateLimitMap = new Map<string, {
  count: number;
  resetTime: number;
}>();

// Memory usage tracking
let totalConnections = 0;
let totalRooms = 0;

/**
 * Check rate limit for a socket
 */
const checkRateLimit = (socketId: string, maxEvents: number = 100, windowMs: number = 60000): boolean => {
  const now = Date.now();
  const limit = rateLimitMap.get(socketId);
  
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(socketId, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (limit.count >= maxEvents) {
    return false;
  }
  
  limit.count++;
  return true;
};

/**
 * Clean up old connections and rate limit data
 */
const cleanupOldData = () => {
  const now = Date.now();
  const timeout = 300000; // 5 minutes
  
  // Clean up old rate limit data
  for (const [socketId, data] of rateLimitMap.entries()) {
    if (now > data.resetTime) {
      rateLimitMap.delete(socketId);
    }
  }
  
  // Clean up old connection tracking
  for (const [socketId, data] of connectionTracker.entries()) {
    if (now - data.lastActivity > timeout) {
      connectionTracker.delete(socketId);
      totalConnections--;
    }
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupOldData, 300000);

/**
 * Handle user joining a room
 */
export const handleJoinRoom = (socket: Socket) => {
  socket.on(QueueSocketEvents.JOIN_ROOM, (data: RoomJoinRequest) => {
    try {
      // Rate limiting check
      if (!checkRateLimit(socket.id, 10, 60000)) {
        socket.emit(QueueSocketEvents.ERROR, { 
          message: 'Rate limit exceeded', 
          code: 'RATE_LIMIT_EXCEEDED' 
        });
        return;
      }
      
      const { userId, gurujiId, role } = data;
      
      // Track connection
      if (!connectionTracker.has(socket.id)) {
        connectionTracker.set(socket.id, {
          connectionTime: Date.now(),
          lastActivity: Date.now(),
          eventCount: 0,
          roomCount: 0
        });
        totalConnections++;
      }
      
      const tracker = connectionTracker.get(socket.id)!;
      tracker.lastActivity = Date.now();
      tracker.eventCount++;
      
      // Clear existing rooms
      const currentRooms = Array.from(socket.rooms);
      currentRooms.forEach(room => {
        if (room !== socket.id) {
          socket.leave(room);
          tracker.roomCount--;
          totalRooms--;
        }
      });
      
      // Join appropriate rooms based on role
      if (role === 'USER' && userId) {
        socket.join(`user:${userId}`);
        tracker.roomCount++;
        totalRooms++;
        console.log(`User ${userId} joined their room`);
      } else if (role === 'GURUJI' && gurujiId) {
        socket.join(`guruji:${gurujiId}`);
        tracker.roomCount++;
        totalRooms++;
        console.log(`Guruji ${gurujiId} joined their room`);
      } else if (role === 'ADMIN' || role === 'COORDINATOR') {
        socket.join('admin');
        tracker.roomCount++;
        totalRooms++;
        console.log(`Admin/Coordinator joined admin room`);
      }
      
      // Everyone joins the general queue room
      socket.join('queue');
      tracker.roomCount++;
      totalRooms++;
      
      socket.emit(QueueSocketEvents.JOIN_ROOM, { 
        success: true,
        roomCount: tracker.roomCount
      });
      
      // Log connection stats
      if (totalConnections % 100 === 0) {
        console.log(`Connection stats: ${totalConnections} connections, ${totalRooms} rooms`);
      }
      
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit(QueueSocketEvents.ERROR, { 
        message: 'Failed to join room', 
        code: 'JOIN_ROOM_ERROR' 
      });
    }
  });
};

/**
 * Handle user leaving a room
 */
export const handleLeaveRoom = (socket: Socket) => {
  socket.on(QueueSocketEvents.LEAVE_ROOM, (data: RoomJoinRequest) => {
    try {
      // Rate limiting check
      if (!checkRateLimit(socket.id, 10, 60000)) {
        socket.emit(QueueSocketEvents.ERROR, { 
          message: 'Rate limit exceeded', 
          code: 'RATE_LIMIT_EXCEEDED' 
        });
        return;
      }
      
      const { userId, gurujiId, role } = data;
      
      // Update tracker
      const tracker = connectionTracker.get(socket.id);
      if (tracker) {
        tracker.lastActivity = Date.now();
        tracker.eventCount++;
      }
      
      // Leave appropriate rooms based on role
      if (role === 'USER' && userId) {
        socket.leave(`user:${userId}`);
        if (tracker) tracker.roomCount--;
        totalRooms--;
        console.log(`User ${userId} left their room`);
      } else if (role === 'GURUJI' && gurujiId) {
        socket.leave(`guruji:${gurujiId}`);
        if (tracker) tracker.roomCount--;
        totalRooms--;
        console.log(`Guruji ${gurujiId} left their room`);
      } else if (role === 'ADMIN' || role === 'COORDINATOR') {
        socket.leave('admin');
        if (tracker) tracker.roomCount--;
        totalRooms--;
        console.log(`Admin/Coordinator left admin room`);
      }
      
      // Leave the general queue room
      socket.leave('queue');
      if (tracker) tracker.roomCount--;
      totalRooms--;
      
      socket.emit(QueueSocketEvents.LEAVE_ROOM, { 
        success: true,
        roomCount: tracker?.roomCount || 0
      });
      
    } catch (error) {
      console.error('Error leaving room:', error);
      socket.emit(QueueSocketEvents.ERROR, { 
        message: 'Failed to leave room', 
        code: 'LEAVE_ROOM_ERROR' 
      });
    }
  });
};

/**
 * Handle socket disconnection
 */
export const handleDisconnect = (socket: Socket) => {
  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
    
    // Clean up tracking data
    const tracker = connectionTracker.get(socket.id);
    if (tracker) {
      totalRooms -= tracker.roomCount;
      totalConnections--;
      connectionTracker.delete(socket.id);
    }
    
    // Clean up rate limit data
    rateLimitMap.delete(socket.id);
    
    console.log(`Connection stats after disconnect: ${totalConnections} connections, ${totalRooms} rooms`);
  });
};

/**
 * Register all connection middleware
 */
export const registerConnectionHandlers = (socket: Socket) => {
  console.log(`Client connected: ${socket.id}, Total connections: ${totalConnections + 1}`);
  
  handleJoinRoom(socket);
  handleLeaveRoom(socket);
  handleDisconnect(socket);
};

/**
 * Get connection statistics
 */
export const getConnectionStats = () => ({
  totalConnections,
  totalRooms,
  activeConnections: connectionTracker.size,
  rateLimitEntries: rateLimitMap.size
});