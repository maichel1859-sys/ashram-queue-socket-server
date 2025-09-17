/**
 * Queue event handlers for Socket.IO
 * Integration ready for aadhram-app
 */

import { Socket, Server } from 'socket.io';
import { 
  QueueSocketEvents, 
  QueueEntry
} from '../types/queue.types';

/**
 * Handle request for queue updates
 */
export const handleRequestQueueUpdate = (socket: Socket) => {
  socket.on(QueueSocketEvents.REQUEST_QUEUE_UPDATE, () => {
    try {
      // This will be triggered by the main app when queue data changes
      // For now, just acknowledge the request
      socket.emit(QueueSocketEvents.QUEUE_UPDATED, {
        message: 'Queue update request received',
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error handling queue update request:', error);
      socket.emit(QueueSocketEvents.ERROR, { 
        message: 'Failed to get queue updates', 
        code: 'QUEUE_UPDATE_ERROR' 
      });
    }
  });
};

/**
 * Handle request for user queue status
 */
export const handleRequestUserQueueStatus = (socket: Socket) => {
  socket.on(QueueSocketEvents.REQUEST_USER_QUEUE_STATUS, (data: { userId: string }) => {
    try {
      const { userId } = data;
      
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      // This will be populated by the main app when user queue status is requested
      // For now, just acknowledge the request
      socket.emit(QueueSocketEvents.USER_QUEUE_STATUS, {
        message: 'User queue status request received',
        userId,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error handling user queue status request:', error);
      socket.emit(QueueSocketEvents.ERROR, { 
        message: 'Failed to get user queue status', 
        code: 'USER_QUEUE_STATUS_ERROR' 
      });
    }
  });
};

/**
 * Handle request for guruji queue
 */
export const handleRequestGurujiQueue = (socket: Socket) => {
  socket.on(QueueSocketEvents.REQUEST_GURUJI_QUEUE, (data: { gurujiId: string }) => {
    try {
      const { gurujiId } = data;
      
      if (!gurujiId) {
        throw new Error('Guruji ID is required');
      }
      
      // This will be populated by the main app when guruji queue is requested
      // For now, just acknowledge the request
      socket.emit(QueueSocketEvents.GURUJI_QUEUE_UPDATED, {
        message: 'Guruji queue request received',
        gurujiId,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error handling guruji queue request:', error);
      socket.emit(QueueSocketEvents.ERROR, { 
        message: 'Failed to get guruji queue', 
        code: 'GURUJI_QUEUE_ERROR' 
      });
    }
  });
};

/**
 * Broadcast queue entry updates to relevant rooms
 * This function will be called by the main app when queue entries change
 */
export const broadcastQueueEntryUpdate = (io: Server, entry: QueueEntry) => {
  // Broadcast to the general queue room
  io.to('queue').emit(QueueSocketEvents.QUEUE_ENTRY_UPDATED, entry);
  
  // Broadcast to the specific user's room
  io.to(`user:${entry.userId}`).emit(QueueSocketEvents.QUEUE_ENTRY_UPDATED, entry);
  
  // Broadcast to the guruji's room if available
  if (entry.gurujiId) {
    io.to(`guruji:${entry.gurujiId}`).emit(QueueSocketEvents.QUEUE_ENTRY_UPDATED, entry);
  }
  
  // Broadcast to admin room
  io.to('admin').emit(QueueSocketEvents.QUEUE_ENTRY_UPDATED, entry);
};

/**
 * Broadcast queue position updates
 * This function will be called by the main app when queue positions change
 */
export const broadcastQueuePositionUpdate = (io: Server, gurujiId: string, entries: QueueEntry[]) => {
  // Broadcast to the general queue room
  io.to('queue').emit(QueueSocketEvents.QUEUE_POSITION_UPDATED, {
    gurujiId,
    entries,
    timestamp: Date.now()
  });
  
  // Broadcast to the guruji's room
  io.to(`guruji:${gurujiId}`).emit(QueueSocketEvents.QUEUE_POSITION_UPDATED, {
    gurujiId,
    entries,
    timestamp: Date.now()
  });
  
  // Broadcast to admin room
  io.to('admin').emit(QueueSocketEvents.QUEUE_POSITION_UPDATED, {
    gurujiId,
    entries,
    timestamp: Date.now()
  });
  
  // Broadcast individual updates to each user
  entries.forEach(entry => {
    io.to(`user:${entry.userId}`).emit(QueueSocketEvents.QUEUE_POSITION_UPDATED, {
      entry,
      timestamp: Date.now()
    });
  });
};

/**
 * Broadcast new queue entry added
 * This function will be called by the main app when new entries are added
 */
export const broadcastQueueEntryAdded = (io: Server, entry: QueueEntry) => {
  // Broadcast to the general queue room
  io.to('queue').emit(QueueSocketEvents.QUEUE_ENTRY_ADDED, entry);
  
  // Broadcast to admin room
  io.to('admin').emit(QueueSocketEvents.QUEUE_ENTRY_ADDED, entry);
  
  // Broadcast to the guruji's room if available
  if (entry.gurujiId) {
    io.to(`guruji:${entry.gurujiId}`).emit(QueueSocketEvents.QUEUE_ENTRY_ADDED, entry);
  }
};

/**
 * Broadcast queue entry removed
 * This function will be called by the main app when entries are removed
 */
export const broadcastQueueEntryRemoved = (io: Server, entry: QueueEntry) => {
  // Broadcast to the general queue room
  io.to('queue').emit(QueueSocketEvents.QUEUE_ENTRY_REMOVED, entry);
  
  // Broadcast to admin room
  io.to('admin').emit(QueueSocketEvents.QUEUE_ENTRY_REMOVED, entry);
  
  // Broadcast to the guruji's room if available
  if (entry.gurujiId) {
    io.to(`guruji:${entry.gurujiId}`).emit(QueueSocketEvents.QUEUE_ENTRY_REMOVED, entry);
  }
};

/**
 * Handle queue consultation start
 */
export const handleStartConsultation = (socket: Socket) => {
  socket.on(QueueSocketEvents.START_CONSULTATION, (data: { entryId: string }) => {
    try {
      const { entryId } = data;
      
      if (!entryId) {
        throw new Error('Entry ID is required');
      }
      
      // This will be handled by the main app
      // For now, just acknowledge the request
      socket.emit(QueueSocketEvents.QUEUE_ENTRY_UPDATED, {
        message: 'Consultation start request received',
        entryId,
        timestamp: Date.now()
      });
      
      console.log(`Consultation start requested for entry: ${entryId}`);
      
    } catch (error) {
      console.error('Error handling consultation start:', error);
      socket.emit(QueueSocketEvents.ERROR, { 
        message: 'Failed to start consultation', 
        code: 'START_CONSULTATION_ERROR' 
      });
    }
  });
};

/**
 * Handle queue consultation completion
 */
export const handleCompleteConsultation = (socket: Socket) => {
  socket.on(QueueSocketEvents.COMPLETE_CONSULTATION, (data: { entryId: string }) => {
    try {
      const { entryId } = data;
      
      if (!entryId) {
        throw new Error('Entry ID is required');
      }
      
      // This will be handled by the main app
      // For now, just acknowledge the request
      socket.emit(QueueSocketEvents.QUEUE_ENTRY_UPDATED, {
        message: 'Consultation completion request received',
        entryId,
        timestamp: Date.now()
      });
      
      console.log(`Consultation completion requested for entry: ${entryId}`);
      
    } catch (error) {
      console.error('Error handling consultation completion:', error);
      socket.emit(QueueSocketEvents.ERROR, { 
        message: 'Failed to complete consultation', 
        code: 'COMPLETE_CONSULTATION_ERROR' 
      });
    }
  });
};

/**
 * Handle short queue update request
 */
export const handleRequestQueueUpdateShort = (socket: Socket) => {
  socket.on(QueueSocketEvents.REQUEST_QUEUE_UPDATE_SHORT, () => {
    try {
      // This will be triggered by the main app when queue data changes
      // For now, just acknowledge the request
      socket.emit(QueueSocketEvents.QUEUE_UPDATED, {
        message: 'Queue update request received (short)',
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error handling queue update request (short):', error);
      socket.emit(QueueSocketEvents.ERROR, { 
        message: 'Failed to get queue updates', 
        code: 'QUEUE_UPDATE_ERROR' 
      });
    }
  });
};

/**
 * Register all queue event handlers
 */
export const registerQueueHandlers = (socket: Socket, _io: Server) => {
  handleRequestQueueUpdate(socket);
  handleRequestUserQueueStatus(socket);
  handleRequestGurujiQueue(socket);
  handleStartConsultation(socket);
  handleCompleteConsultation(socket);
  handleRequestQueueUpdateShort(socket);
};