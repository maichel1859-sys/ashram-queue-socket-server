/**
 * Progress Tracking Handlers
 * 
 * Handles real-time progress updates for long-running operations
 * like file uploads, data processing, bulk operations, etc.
 */

import { Socket, Server } from 'socket.io';
import { RealTimeEvents, RoomTypes } from '../types/real-time.types';

// Progress data structures
interface ProgressData {
  id: string;
  userId: string;
  type: 'upload' | 'processing' | 'bulk_operation' | 'export' | 'import' | 'backup' | 'system_maintenance' | 'custom';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  message: string;
  startTime: number;
  endTime?: number;
  estimatedTimeRemaining?: number;
  metadata: Record<string, any>;
  error?: string;
}

// Store active progress operations
const activeProgress = new Map<string, ProgressData>();
const completedProgress = new Map<string, ProgressData>();

/**
 * Start a new progress operation
 */
export const startProgress = (io: Server, data: {
  id: string;
  userId: string;
  type: ProgressData['type'];
  message: string;
  metadata?: Record<string, any>;
}): ProgressData => {
  try {
    const progressData: ProgressData = {
      id: data.id,
      userId: data.userId,
      type: data.type,
      status: 'pending',
      progress: 0,
      message: data.message,
      startTime: Date.now(),
      metadata: data.metadata || {}
    };

    activeProgress.set(data.id, progressData);

    // Broadcast progress start
    broadcastProgressUpdate(io, progressData);

    console.log(`🔄 Progress started: ${data.id} (${data.type}) for user ${data.userId}`);
    return progressData;
  } catch (error) {
    console.error('Error starting progress:', error);
    throw error;
  }
};

/**
 * Update progress
 */
export const updateProgress = (io: Server, data: {
  id: string;
  progress: number;
  message?: string;
  estimatedTimeRemaining?: number;
  metadata?: Record<string, any>;
}) => {
  try {
    const progressData = activeProgress.get(data.id);
    if (!progressData) {
      console.warn(`Progress ${data.id} not found`);
      return;
    }

    // Update progress data
    progressData.progress = Math.min(100, Math.max(0, data.progress));
    if (data.message) progressData.message = data.message;
    if (data.estimatedTimeRemaining) progressData.estimatedTimeRemaining = data.estimatedTimeRemaining;
    if (data.metadata) progressData.metadata = { ...progressData.metadata, ...data.metadata };

    // Update status based on progress
    if (progressData.progress === 100) {
      progressData.status = 'completed';
      progressData.endTime = Date.now();
    } else if (progressData.status === 'pending') {
      progressData.status = 'running';
    }

    activeProgress.set(data.id, progressData);

    // Broadcast progress update
    broadcastProgressUpdate(io, progressData);

    console.log(`🔄 Progress updated: ${data.id} - ${progressData.progress}%`);
  } catch (error) {
    console.error('Error updating progress:', error);
  }
};

/**
 * Complete progress
 */
export const completeProgress = (io: Server, data: {
  id: string;
  message?: string;
  metadata?: Record<string, any>;
}) => {
  try {
    const progressData = activeProgress.get(data.id);
    if (!progressData) {
      console.warn(`Progress ${data.id} not found`);
      return;
    }

    // Update progress data
    progressData.status = 'completed';
    progressData.progress = 100;
    progressData.endTime = Date.now();
    if (data.message) progressData.message = data.message;
    if (data.metadata) progressData.metadata = { ...progressData.metadata, ...data.metadata };

    // Move to completed
    completedProgress.set(data.id, progressData);
    activeProgress.delete(data.id);

    // Broadcast progress completion
    broadcastProgressUpdate(io, progressData);

    console.log(`✅ Progress completed: ${data.id}`);
  } catch (error) {
    console.error('Error completing progress:', error);
  }
};

/**
 * Fail progress
 */
export const failProgress = (io: Server, data: {
  id: string;
  error: string;
  message?: string;
}) => {
  try {
    const progressData = activeProgress.get(data.id);
    if (!progressData) {
      console.warn(`Progress ${data.id} not found`);
      return;
    }

    // Update progress data
    progressData.status = 'failed';
    progressData.endTime = Date.now();
    progressData.error = data.error;
    if (data.message) progressData.message = data.message;

    // Move to completed (failed)
    completedProgress.set(data.id, progressData);
    activeProgress.delete(data.id);

    // Broadcast progress failure
    broadcastProgressUpdate(io, progressData);

    console.log(`❌ Progress failed: ${data.id} - ${data.error}`);
  } catch (error) {
    console.error('Error failing progress:', error);
  }
};

/**
 * Cancel progress
 */
export const cancelProgress = (io: Server, data: {
  id: string;
  message?: string;
}) => {
  try {
    const progressData = activeProgress.get(data.id);
    if (!progressData) {
      console.warn(`Progress ${data.id} not found`);
      return;
    }

    // Update progress data
    progressData.status = 'cancelled';
    progressData.endTime = Date.now();
    if (data.message) progressData.message = data.message;

    // Move to completed (cancelled)
    completedProgress.set(data.id, progressData);
    activeProgress.delete(data.id);

    // Broadcast progress cancellation
    broadcastProgressUpdate(io, progressData);

    console.log(`🚫 Progress cancelled: ${data.id}`);
  } catch (error) {
    console.error('Error cancelling progress:', error);
  }
};

/**
 * Broadcast progress update to relevant rooms
 */
const broadcastProgressUpdate = (io: Server, progressData: ProgressData) => {
  try {
    const updateData = {
      ...progressData,
      timestamp: Date.now()
    };

    // Broadcast to user-specific room
    io.to(`user:${progressData.userId}`).emit(RealTimeEvents.PROGRESS_UPDATE, updateData);

    // Broadcast to admin/coordinator for monitoring
    io.to(RoomTypes.ADMIN).emit(RealTimeEvents.PROGRESS_UPDATE, updateData);
    io.to(RoomTypes.COORDINATOR).emit(RealTimeEvents.PROGRESS_UPDATE, updateData);

    // Broadcast to global room for system-wide operations
    if (progressData.type === 'backup' || progressData.type === 'system_maintenance') {
      io.to(RoomTypes.GLOBAL).emit(RealTimeEvents.PROGRESS_UPDATE, updateData);
    }
  } catch (error) {
    console.error('Error broadcasting progress update:', error);
  }
};

/**
 * Handle progress requests
 */
export const handleProgressRequest = (socket: Socket) => {
  socket.on(RealTimeEvents.REQUEST_PROGRESS, (data: {
    userId?: string;
    type?: string;
    status?: string;
  }) => {
    try {
      const { userId, type, status } = data;
      let progressList: ProgressData[] = [];

      // Get active progress
      if (userId) {
        // User-specific progress
        progressList = Array.from(activeProgress.values())
          .filter(progress => progress.userId === userId);
      } else {
        // All active progress
        progressList = Array.from(activeProgress.values());
      }

      // Filter by type if specified
      if (type) {
        progressList = progressList.filter(progress => progress.type === type);
      }

      // Filter by status if specified
      if (status) {
        progressList = progressList.filter(progress => progress.status === status);
      }

      socket.emit(RealTimeEvents.PROGRESS_RESPONSE, {
        progress: progressList,
        timestamp: Date.now()
      });

      console.log(`🔄 Sent progress data to ${socket.id}`);
    } catch (error) {
      console.error('Error handling progress request:', error);
      socket.emit(RealTimeEvents.ERROR, {
        message: 'Failed to get progress data',
        code: 'PROGRESS_REQUEST_ERROR'
      });
    }
  });
};

/**
 * Handle progress cancellation request
 */
export const handleProgressCancellation = (socket: Socket) => {
  socket.on(RealTimeEvents.CANCEL_PROGRESS, (data: {
    id: string;
    userId: string;
  }) => {
    try {
      const { id, userId } = data;
      const progressData = activeProgress.get(id);

      if (!progressData) {
        socket.emit(RealTimeEvents.ERROR, {
          message: 'Progress not found',
          code: 'PROGRESS_NOT_FOUND'
        });
        return;
      }

      // Check if user can cancel this progress
      if (progressData.userId !== userId && !isAdminOrCoordinator(socket)) {
        socket.emit(RealTimeEvents.ERROR, {
          message: 'Permission denied',
          code: 'PERMISSION_DENIED'
        });
        return;
      }

      // Cancel the progress
      cancelProgress(socket.nsp.server as any, { id, message: 'Cancelled by user' });

      socket.emit(RealTimeEvents.PROGRESS_CANCELLED, {
        id,
        timestamp: Date.now()
      });

      console.log(`🚫 Progress ${id} cancelled by user ${userId}`);
    } catch (error) {
      console.error('Error handling progress cancellation:', error);
      socket.emit(RealTimeEvents.ERROR, {
        message: 'Failed to cancel progress',
        code: 'PROGRESS_CANCELLATION_ERROR'
      });
    }
  });
};

/**
 * Get active progress for a user
 */
export const getActiveProgress = (userId: string): ProgressData[] => {
  return Array.from(activeProgress.values())
    .filter(progress => progress.userId === userId);
};

/**
 * Get all active progress
 */
export const getAllActiveProgress = (): ProgressData[] => {
  return Array.from(activeProgress.values());
};

/**
 * Get completed progress for a user
 */
export const getCompletedProgress = (userId: string, limit: number = 10): ProgressData[] => {
  return Array.from(completedProgress.values())
    .filter(progress => progress.userId === userId)
    .sort((a, b) => (b.endTime || 0) - (a.endTime || 0))
    .slice(0, limit);
};

/**
 * Cleanup old completed progress
 */
export const cleanupOldProgress = () => {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  for (const [id, progress] of completedProgress.entries()) {
    if (progress.endTime && (now - progress.endTime) > maxAge) {
      completedProgress.delete(id);
    }
  }

  console.log(`🧹 Cleaned up old progress data`);
};

/**
 * Check if socket belongs to admin or coordinator
 */
const isAdminOrCoordinator = (_socket: Socket): boolean => {
  // This would need to be implemented based on your authentication system
  // For now, return false
  return false;
};

/**
 * Register progress handlers
 */
export const registerProgressHandlers = (socket: Socket) => {
  handleProgressRequest(socket);
  handleProgressCancellation(socket);
};

/**
 * Initialize progress system
 */
export const initializeProgressSystem = () => {
  // Cleanup old progress every hour
  setInterval(cleanupOldProgress, 60 * 60 * 1000);
  
  console.log('🔄 Progress tracking system initialized');
};

/**
 * Create a progress tracker for long operations
 */
export const createProgressTracker = (io: Server, data: {
  id: string;
  userId: string;
  type: ProgressData['type'];
  message: string;
  metadata?: Record<string, any>;
}) => {
  startProgress(io, data);

  return {
    update: (progress: number, message?: string, metadata?: Record<string, any>) => {
      updateProgress(io, { id: data.id, progress, message: message || '', metadata: metadata || {} });
    },
    complete: (message?: string, metadata?: Record<string, any>) => {
      completeProgress(io, { id: data.id, message: message || '', metadata: metadata || {} });
    },
    fail: (error: string, message?: string) => {
      failProgress(io, { id: data.id, error, message: message || '' });
    },
    cancel: (message?: string) => {
      cancelProgress(io, { id: data.id, message: message || '' });
    }
  };
};
