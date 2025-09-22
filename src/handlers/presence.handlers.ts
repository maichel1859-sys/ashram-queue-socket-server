/**
 * Presence and Status Handlers
 * 
 * Handles user presence, online/offline status, typing indicators,
 * and real-time activity tracking across all dashboards.
 */

import { Socket } from 'socket.io';
import { RealTimeEvents, RoomTypes } from '../types/real-time.types';

// Store user presence data
interface UserPresence {
  userId: string;
  socketId: string;
  role: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen: number;
  currentPage: string;
  isTyping?: boolean;
  typingIn?: string; // room or context where user is typing
}

// Store typing indicators
interface TypingIndicator {
  userId: string;
  userName: string;
  room: string;
  timestamp: number;
}

// In-memory stores (in production, use Redis)
const userPresence = new Map<string, UserPresence>();
const typingIndicators = new Map<string, TypingIndicator>();
const onlineUsers = new Map<string, Set<string>>(); // role -> Set of userIds

/**
 * Handle user presence updates
 */
export const handlePresenceUpdate = (socket: Socket) => {
  socket.on(RealTimeEvents.PRESENCE_UPDATE, (data: {
    userId: string;
    role: string;
    status: 'online' | 'offline' | 'away' | 'busy';
    currentPage?: string;
  }) => {
    try {
      const { userId, role, status, currentPage } = data;
      
      // Update user presence
      userPresence.set(userId, {
        userId,
        socketId: socket.id,
        role,
        status,
        lastSeen: Date.now(),
        currentPage: currentPage || '',
        isTyping: false
      });

      // Update online users by role
      if (!onlineUsers.has(role)) {
        onlineUsers.set(role, new Set());
      }
      onlineUsers.get(role)!.add(userId);

      // Broadcast presence update to relevant rooms
      const presenceData = {
        userId,
        role,
        status,
        currentPage,
        timestamp: Date.now()
      };

      // Broadcast to role-specific rooms
      socket.to(`role:${role}`).emit(RealTimeEvents.PRESENCE_UPDATE, presenceData);
      
      // Broadcast to admin/coordinator rooms for monitoring
      socket.to(RoomTypes.ADMIN).emit(RealTimeEvents.PRESENCE_UPDATE, presenceData);
      socket.to(RoomTypes.COORDINATOR).emit(RealTimeEvents.PRESENCE_UPDATE, presenceData);

      // Broadcast online count updates
      broadcastOnlineCounts(socket);

      console.log(`👤 User ${userId} (${role}) is now ${status}`);
    } catch (error) {
      console.error('Error handling presence update:', error);
      socket.emit(RealTimeEvents.ERROR, {
        message: 'Failed to update presence',
        code: 'PRESENCE_UPDATE_ERROR'
      });
    }
  });
};

/**
 * Handle typing indicators
 */
export const handleTypingIndicator = (socket: Socket) => {
  socket.on(RealTimeEvents.TYPING_START, (data: {
    userId: string;
    userName: string;
    room: string;
  }) => {
    try {
      const { userId, userName, room } = data;
      
      // Store typing indicator
      typingIndicators.set(userId, {
        userId,
        userName,
        room,
        timestamp: Date.now()
      });

      // Broadcast typing indicator to room
      socket.to(room).emit(RealTimeEvents.TYPING_START, {
        userId,
        userName,
        room,
        timestamp: Date.now()
      });

      console.log(`⌨️ User ${userName} started typing in ${room}`);
    } catch (error) {
      console.error('Error handling typing start:', error);
    }
  });

  socket.on(RealTimeEvents.TYPING_STOP, (data: {
    userId: string;
    room: string;
  }) => {
    try {
      const { userId, room } = data;
      
      // Remove typing indicator
      typingIndicators.delete(userId);

      // Broadcast typing stop to room
      socket.to(room).emit(RealTimeEvents.TYPING_STOP, {
        userId,
        room,
        timestamp: Date.now()
      });

      console.log(`⌨️ User ${userId} stopped typing in ${room}`);
    } catch (error) {
      console.error('Error handling typing stop:', error);
    }
  });
};

/**
 * Handle user activity tracking
 */
export const handleUserActivity = (socket: Socket) => {
  socket.on(RealTimeEvents.USER_ACTIVITY, (data: {
    userId: string;
    activity: string;
    page: string;
    metadata?: Record<string, any>;
  }) => {
    try {
      const { userId, activity, page, metadata } = data;
      
      // Update user presence with activity
      const presence = userPresence.get(userId);
      if (presence) {
        presence.currentPage = page;
        presence.lastSeen = Date.now();
        userPresence.set(userId, presence);
      }

      // Broadcast activity to admin/coordinator for monitoring
      const activityData = {
        userId,
        activity,
        page,
        metadata,
        timestamp: Date.now()
      };

      socket.to(RoomTypes.ADMIN).emit(RealTimeEvents.USER_ACTIVITY, activityData);
      socket.to(RoomTypes.COORDINATOR).emit(RealTimeEvents.USER_ACTIVITY, activityData);

      console.log(`📊 User ${userId} activity: ${activity} on ${page}`);
    } catch (error) {
      console.error('Error handling user activity:', error);
    }
  });
};

/**
 * Handle heartbeat/ping for connection health
 */
export const handleHeartbeat = (socket: Socket) => {
  socket.on(RealTimeEvents.HEARTBEAT, (data: {
    userId: string;
    timestamp: number;
  }) => {
    try {
      const { userId } = data;
      
      // Update last seen
      const presence = userPresence.get(userId);
      if (presence) {
        presence.lastSeen = Date.now();
        userPresence.set(userId, presence);
      }

      // Respond with pong
      socket.emit(RealTimeEvents.HEARTBEAT_PONG, {
        timestamp: Date.now(),
        serverTime: Date.now()
      });
    } catch (error) {
      console.error('Error handling heartbeat:', error);
    }
  });
};

/**
 * Broadcast online counts to all relevant rooms
 */
export const broadcastOnlineCounts = (socket: Socket) => {
  try {
    const counts = {
      total: userPresence.size,
      byRole: Object.fromEntries(
        Array.from(onlineUsers.entries()).map(([role, users]) => [role, users.size])
      ),
      timestamp: Date.now()
    };

    // Broadcast to all rooms
    socket.emit(RealTimeEvents.ONLINE_COUNTS, counts);
    socket.to(RoomTypes.ADMIN).emit(RealTimeEvents.ONLINE_COUNTS, counts);
    socket.to(RoomTypes.COORDINATOR).emit(RealTimeEvents.ONLINE_COUNTS, counts);
    socket.to(RoomTypes.GLOBAL).emit(RealTimeEvents.ONLINE_COUNTS, counts);
  } catch (error) {
    console.error('Error broadcasting online counts:', error);
  }
};

/**
 * Handle user disconnect and cleanup
 */
export const handleUserDisconnect = (socket: Socket) => {
  socket.on('disconnect', (reason) => {
    try {
      // Find user by socket ID
      let disconnectedUserId: string | null = null;
      let disconnectedUserRole: string | null = null;

      for (const [userId, presence] of userPresence.entries()) {
        if (presence.socketId === socket.id) {
          disconnectedUserId = userId;
          disconnectedUserRole = presence.role;
          break;
        }
      }

      if (disconnectedUserId && disconnectedUserRole) {
        // Remove from presence
        userPresence.delete(disconnectedUserId);
        
        // Remove from online users
        const roleUsers = onlineUsers.get(disconnectedUserRole);
        if (roleUsers) {
          roleUsers.delete(disconnectedUserId);
          if (roleUsers.size === 0) {
            onlineUsers.delete(disconnectedUserRole);
          }
        }

        // Remove typing indicators
        typingIndicators.delete(disconnectedUserId);

        // Broadcast user offline
        const offlineData = {
          userId: disconnectedUserId,
          role: disconnectedUserRole,
          status: 'offline',
          timestamp: Date.now(),
          reason
        };

        socket.to(`role:${disconnectedUserRole}`).emit(RealTimeEvents.PRESENCE_UPDATE, offlineData);
        socket.to(RoomTypes.ADMIN).emit(RealTimeEvents.PRESENCE_UPDATE, offlineData);
        socket.to(RoomTypes.COORDINATOR).emit(RealTimeEvents.PRESENCE_UPDATE, offlineData);

        // Broadcast updated online counts
        broadcastOnlineCounts(socket);

        console.log(`👤 User ${disconnectedUserId} (${disconnectedUserRole}) disconnected: ${reason}`);
      }
    } catch (error) {
      console.error('Error handling user disconnect:', error);
    }
  });
};

/**
 * Get current presence statistics
 */
export const getPresenceStats = () => {
  return {
    totalUsers: userPresence.size,
    onlineByRole: Object.fromEntries(
      Array.from(onlineUsers.entries()).map(([role, users]) => [role, users.size])
    ),
    typingUsers: typingIndicators.size,
    lastUpdated: Date.now()
  };
};

/**
 * Get user presence data
 */
export const getUserPresence = (userId: string): UserPresence | null => {
  return userPresence.get(userId) || null;
};

/**
 * Get all online users
 */
export const getOnlineUsers = (): UserPresence[] => {
  return Array.from(userPresence.values());
};

/**
 * Register all presence handlers
 */
export const registerPresenceHandlers = (socket: Socket) => {
  handlePresenceUpdate(socket);
  handleTypingIndicator(socket);
  handleUserActivity(socket);
  handleHeartbeat(socket);
  handleUserDisconnect(socket);
};

/**
 * Cleanup old presence data (run periodically)
 */
export const cleanupPresenceData = () => {
  const now = Date.now();
  const timeout = 5 * 60 * 1000; // 5 minutes

  for (const [userId, presence] of userPresence.entries()) {
    if (now - presence.lastSeen > timeout) {
      userPresence.delete(userId);
      
      // Remove from online users
      const roleUsers = onlineUsers.get(presence.role);
      if (roleUsers) {
        roleUsers.delete(userId);
        if (roleUsers.size === 0) {
          onlineUsers.delete(presence.role);
        }
      }
    }
  }

  // Cleanup old typing indicators
  for (const [userId, indicator] of typingIndicators.entries()) {
    if (now - indicator.timestamp > 30000) { // 30 seconds
      typingIndicators.delete(userId);
    }
  }
};

// Run cleanup every minute
setInterval(cleanupPresenceData, 60000);
