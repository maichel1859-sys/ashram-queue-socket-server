/**
 * Live Counters and Statistics Handlers
 * 
 * Handles real-time counters, statistics, and metrics across all dashboards.
 * Provides live updates for appointment counts, queue positions, user statistics, etc.
 */

import { Socket, Server } from 'socket.io';
import { RealTimeEvents, RoomTypes } from '../types/real-time.types';

// Counter data structures
interface CounterData {
  value: number;
  lastUpdated: number;
  metadata?: Record<string, any>;
}

interface DashboardCounters {
  appointments: {
    total: number;
    pending: number;
    confirmed: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };
  queue: {
    total: number;
    waiting: number;
    inProgress: number;
    completed: number;
    averageWaitTime: number;
  };
  users: {
    total: number;
    online: number;
    active: number;
    newToday: number;
  };
  gurujis: {
    total: number;
    online: number;
    busy: number;
    available: number;
  };
  consultations: {
    total: number;
    active: number;
    completed: number;
    averageDuration: number;
  };
  remedies: {
    total: number;
    prescribed: number;
    completed: number;
    pending: number;
  };
  notifications: {
    total: number;
    unread: number;
    sent: number;
  };
}

// Store counter data
const dashboardCounters: DashboardCounters = {
  appointments: {
    total: 0,
    pending: 0,
    confirmed: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0
  },
  queue: {
    total: 0,
    waiting: 0,
    inProgress: 0,
    completed: 0,
    averageWaitTime: 0
  },
  users: {
    total: 0,
    online: 0,
    active: 0,
    newToday: 0
  },
  gurujis: {
    total: 0,
    online: 0,
    busy: 0,
    available: 0
  },
  consultations: {
    total: 0,
    active: 0,
    completed: 0,
    averageDuration: 0
  },
  remedies: {
    total: 0,
    prescribed: 0,
    completed: 0,
    pending: 0
  },
  notifications: {
    total: 0,
    unread: 0,
    sent: 0
  }
};

// Store individual counters
const individualCounters = new Map<string, CounterData>();

/**
 * Update appointment counters
 */
export const updateAppointmentCounters = (io: Server, data: {
  type: 'created' | 'updated' | 'cancelled' | 'completed';
  status?: string;
  gurujiId?: string;
  userId?: string;
}) => {
  try {
    const { type, status } = data;

    switch (type) {
      case 'created':
        dashboardCounters.appointments.total++;
        if (status === 'BOOKED') dashboardCounters.appointments.pending++;
        break;
      case 'updated':
        if (status === 'CONFIRMED') {
          dashboardCounters.appointments.pending--;
          dashboardCounters.appointments.confirmed++;
        } else if (status === 'IN_PROGRESS') {
          dashboardCounters.appointments.confirmed--;
          dashboardCounters.appointments.inProgress++;
        } else if (status === 'COMPLETED') {
          dashboardCounters.appointments.inProgress--;
          dashboardCounters.appointments.completed++;
        }
        break;
      case 'cancelled':
        dashboardCounters.appointments.total--;
        if (status === 'BOOKED') dashboardCounters.appointments.pending--;
        else if (status === 'CONFIRMED') dashboardCounters.appointments.confirmed--;
        else if (status === 'IN_PROGRESS') dashboardCounters.appointments.inProgress--;
        dashboardCounters.appointments.cancelled++;
        break;
      case 'completed':
        dashboardCounters.appointments.inProgress--;
        dashboardCounters.appointments.completed++;
        break;
    }

    // Broadcast counter updates
    broadcastCounterUpdate(io, 'appointments', dashboardCounters.appointments);
  } catch (error) {
    console.error('Error updating appointment counters:', error);
  }
};

/**
 * Update queue counters
 */
export const updateQueueCounters = (io: Server, data: {
  type: 'added' | 'updated' | 'removed' | 'position_updated';
  status?: string;
  gurujiId?: string;
  userId?: string;
}) => {
  try {
    const { type, status } = data;

    switch (type) {
      case 'added':
        dashboardCounters.queue.total++;
        if (status === 'WAITING') dashboardCounters.queue.waiting++;
        break;
      case 'updated':
        if (status === 'IN_PROGRESS') {
          dashboardCounters.queue.waiting--;
          dashboardCounters.queue.inProgress++;
        } else if (status === 'COMPLETED') {
          dashboardCounters.queue.inProgress--;
          dashboardCounters.queue.completed++;
        }
        break;
      case 'removed':
        dashboardCounters.queue.total--;
        if (status === 'WAITING') dashboardCounters.queue.waiting--;
        else if (status === 'IN_PROGRESS') dashboardCounters.queue.inProgress--;
        break;
    }

    // Broadcast counter updates
    broadcastCounterUpdate(io, 'queue', dashboardCounters.queue);
  } catch (error) {
    console.error('Error updating queue counters:', error);
  }
};

/**
 * Update user counters
 */
export const updateUserCounters = (io: Server, data: {
  type: 'registered' | 'online' | 'offline' | 'active';
  userId?: string;
}) => {
  try {
    const { type } = data;

    switch (type) {
      case 'registered':
        dashboardCounters.users.total++;
        dashboardCounters.users.newToday++;
        break;
      case 'online':
        dashboardCounters.users.online++;
        break;
      case 'offline':
        dashboardCounters.users.online--;
        break;
      case 'active':
        dashboardCounters.users.active++;
        break;
    }

    // Broadcast counter updates
    broadcastCounterUpdate(io, 'users', dashboardCounters.users);
  } catch (error) {
    console.error('Error updating user counters:', error);
  }
};

/**
 * Update guruji counters
 */
export const updateGurujiCounters = (io: Server, data: {
  type: 'online' | 'offline' | 'busy' | 'available';
  gurujiId?: string;
}) => {
  try {
    const { type } = data;

    switch (type) {
      case 'online':
        dashboardCounters.gurujis.online++;
        dashboardCounters.gurujis.available++;
        break;
      case 'offline':
        dashboardCounters.gurujis.online--;
        dashboardCounters.gurujis.available--;
        break;
      case 'busy':
        dashboardCounters.gurujis.available--;
        dashboardCounters.gurujis.busy++;
        break;
      case 'available':
        dashboardCounters.gurujis.busy--;
        dashboardCounters.gurujis.available++;
        break;
    }

    // Broadcast counter updates
    broadcastCounterUpdate(io, 'gurujis', dashboardCounters.gurujis);
  } catch (error) {
    console.error('Error updating guruji counters:', error);
  }
};

/**
 * Update consultation counters
 */
export const updateConsultationCounters = (io: Server, data: {
  type: 'started' | 'ended' | 'created';
  duration?: number;
}) => {
  try {
    const { type, duration } = data;

    switch (type) {
      case 'started':
        dashboardCounters.consultations.active++;
        break;
      case 'ended':
        dashboardCounters.consultations.active--;
        dashboardCounters.consultations.completed++;
        if (duration) {
          // Update average duration
          const totalDuration = dashboardCounters.consultations.averageDuration * 
            (dashboardCounters.consultations.completed - 1) + duration;
          dashboardCounters.consultations.averageDuration = 
            totalDuration / dashboardCounters.consultations.completed;
        }
        break;
      case 'created':
        dashboardCounters.consultations.total++;
        break;
    }

    // Broadcast counter updates
    broadcastCounterUpdate(io, 'consultations', dashboardCounters.consultations);
  } catch (error) {
    console.error('Error updating consultation counters:', error);
  }
};

/**
 * Update remedy counters
 */
export const updateRemedyCounters = (io: Server, data: {
  type: 'prescribed' | 'completed' | 'updated';
}) => {
  try {
    const { type } = data;

    switch (type) {
      case 'prescribed':
        dashboardCounters.remedies.total++;
        dashboardCounters.remedies.prescribed++;
        dashboardCounters.remedies.pending++;
        break;
      case 'completed':
        dashboardCounters.remedies.pending--;
        dashboardCounters.remedies.completed++;
        break;
      case 'updated':
        // Handle status changes
        break;
    }

    // Broadcast counter updates
    broadcastCounterUpdate(io, 'remedies', dashboardCounters.remedies);
  } catch (error) {
    console.error('Error updating remedy counters:', error);
  }
};

/**
 * Update notification counters
 */
export const updateNotificationCounters = (io: Server, data: {
  type: 'sent' | 'read' | 'deleted';
  userId?: string;
}) => {
  try {
    const { type } = data;

    switch (type) {
      case 'sent':
        dashboardCounters.notifications.total++;
        dashboardCounters.notifications.sent++;
        dashboardCounters.notifications.unread++;
        break;
      case 'read':
        dashboardCounters.notifications.unread--;
        break;
      case 'deleted':
        dashboardCounters.notifications.total--;
        dashboardCounters.notifications.unread--;
        break;
    }

    // Broadcast counter updates
    broadcastCounterUpdate(io, 'notifications', dashboardCounters.notifications);
  } catch (error) {
    console.error('Error updating notification counters:', error);
  }
};

/**
 * Update individual counter
 */
export const updateIndividualCounter = (io: Server, counterId: string, value: number, metadata?: Record<string, any>) => {
  try {
    individualCounters.set(counterId, {
      value,
      lastUpdated: Date.now(),
      metadata: metadata || {}
    });

    // Broadcast individual counter update
    io.emit(RealTimeEvents.COUNTERS_UPDATE, {
      counterId,
      value,
      metadata,
      timestamp: Date.now()
    });

    console.log(`📊 Counter ${counterId} updated to ${value}`);
  } catch (error) {
    console.error('Error updating individual counter:', error);
  }
};

/**
 * Broadcast counter update to relevant rooms
 */
const broadcastCounterUpdate = (io: Server, counterType: string, data: any) => {
  try {
    const updateData = {
      type: counterType,
      data,
      timestamp: Date.now()
    };

    // Broadcast to all relevant rooms
    io.to(RoomTypes.ADMIN).emit(RealTimeEvents.COUNTERS_UPDATE, updateData);
    io.to(RoomTypes.COORDINATOR).emit(RealTimeEvents.COUNTERS_UPDATE, updateData);
    io.to(RoomTypes.GLOBAL).emit(RealTimeEvents.COUNTERS_UPDATE, updateData);

    console.log(`📊 ${counterType} counters updated`);
  } catch (error) {
    console.error('Error broadcasting counter update:', error);
  }
};

/**
 * Handle counter requests
 */
export const handleCounterRequest = (socket: Socket) => {
  socket.on(RealTimeEvents.REQUEST_COUNTERS, (data: {
    types?: string[];
    userId?: string;
    gurujiId?: string;
  }) => {
    try {
      const { types, userId, gurujiId } = data;

      let responseData: any = {};

      if (!types || types.includes('all')) {
        responseData = {
          dashboard: dashboardCounters,
          individual: Object.fromEntries(individualCounters.entries())
        };
      } else {
        types.forEach(type => {
          if (dashboardCounters[type as keyof DashboardCounters]) {
            responseData[type] = dashboardCounters[type as keyof DashboardCounters];
          }
        });
      }

      // Add user-specific counters if requested
      if (userId) {
        responseData.userSpecific = {
          userId,
          counters: getIndividualCountersForUser(userId)
        };
      }

      if (gurujiId) {
        responseData.gurujiSpecific = {
          gurujiId,
          counters: getIndividualCountersForGuruji(gurujiId)
        };
      }

      socket.emit(RealTimeEvents.COUNTERS_RESPONSE, {
        ...responseData,
        timestamp: Date.now()
      });

      console.log(`📊 Sent counters to ${socket.id}`);
    } catch (error) {
      console.error('Error handling counter request:', error);
      socket.emit(RealTimeEvents.ERROR, {
        message: 'Failed to get counters',
        code: 'COUNTER_REQUEST_ERROR'
      });
    }
  });
};

/**
 * Get individual counters for a specific user
 */
const getIndividualCountersForUser = (userId: string): Record<string, CounterData> => {
  const userCounters: Record<string, CounterData> = {};
  
  for (const [counterId, data] of individualCounters.entries()) {
    if (counterId.startsWith(`user:${userId}:`)) {
      userCounters[counterId] = data;
    }
  }
  
  return userCounters;
};

/**
 * Get individual counters for a specific guruji
 */
const getIndividualCountersForGuruji = (gurujiId: string): Record<string, CounterData> => {
  const gurujiCounters: Record<string, CounterData> = {};
  
  for (const [counterId, data] of individualCounters.entries()) {
    if (counterId.startsWith(`guruji:${gurujiId}:`)) {
      gurujiCounters[counterId] = data;
    }
  }
  
  return gurujiCounters;
};

/**
 * Get current dashboard counters
 */
export const getDashboardCounters = (): DashboardCounters => {
  return { ...dashboardCounters };
};

/**
 * Get individual counter
 */
export const getIndividualCounter = (counterId: string): CounterData | null => {
  return individualCounters.get(counterId) || null;
};

/**
 * Reset all counters (for testing or maintenance)
 */
export const resetAllCounters = () => {
  // Reset dashboard counters
  Object.keys(dashboardCounters).forEach(key => {
    const counterGroup = dashboardCounters[key as keyof DashboardCounters];
    Object.keys(counterGroup).forEach(subKey => {
      (counterGroup as any)[subKey] = 0;
    });
  });

  // Clear individual counters
  individualCounters.clear();

  console.log('📊 All counters reset');
};

/**
 * Register counter handlers
 */
export const registerCounterHandlers = (socket: Socket) => {
  handleCounterRequest(socket);
};

/**
 * Initialize counters with current data (call this on server start)
 */
export const initializeCounters = async () => {
  try {
    // In a real implementation, you would fetch current data from the database
    // For now, we'll start with zero values
    console.log('📊 Counters initialized');
  } catch (error) {
    console.error('Error initializing counters:', error);
  }
};
