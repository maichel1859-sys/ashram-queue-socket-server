/**
 * Tab Synchronization Handlers
 * 
 * Handles instant synchronization between browser tabs for the same user
 * Ensures all tabs stay in sync with real-time updates
 */

import { Socket, Server } from 'socket.io';
import { RealTimeEvents } from '../types/real-time.types';

// Tab synchronization data structures
interface TabSyncData {
  userId: string;
  tabId: string;
  socketId: string;
  lastActivity: number;
  isActive: boolean;
  metadata: {
    userAgent?: string;
    url?: string;
    title?: string;
  };
}

interface SyncEvent {
  id: string;
  type: 'appointment' | 'queue' | 'notification' | 'user' | 'guruji' | 'system' | 'custom';
  action: 'create' | 'update' | 'delete' | 'status_change' | 'custom';
  data: any;
  timestamp: number;
  userId: string;
  tabId?: string; // If specified, only sync to that tab
  excludeTabId?: string; // If specified, exclude this tab from sync
}

// Store active tabs per user
const userTabs = new Map<string, Map<string, TabSyncData>>(); // userId -> tabId -> TabSyncData
const syncEvents = new Map<string, SyncEvent>(); // Store recent sync events for recovery

/**
 * Register a new tab for a user
 */
export const registerTab = (socket: Socket, data: {
  userId: string;
  tabId: string;
  metadata?: TabSyncData['metadata'];
}) => {
  try {
    const { userId, tabId, metadata } = data;
    
    if (!userTabs.has(userId)) {
      userTabs.set(userId, new Map());
    }

    const tabData: TabSyncData = {
      userId,
      tabId,
      socketId: socket.id,
      lastActivity: Date.now(),
      isActive: true,
      metadata: metadata || {}
    };

    userTabs.get(userId)!.set(tabId, tabData);

    // Notify other tabs about new tab
    broadcastToOtherTabs(socket, userId, tabId, RealTimeEvents.TAB_JOINED, {
      tabId,
      timestamp: Date.now(),
      totalTabs: userTabs.get(userId)!.size
    });

    console.log(`📱 Tab registered: ${tabId} for user ${userId} (Total tabs: ${userTabs.get(userId)!.size})`);
  } catch (error) {
    console.error('Error registering tab:', error);
  }
};

/**
 * Unregister a tab
 */
export const unregisterTab = (socket: Socket, data: {
  userId: string;
  tabId: string;
}) => {
  try {
    const { userId, tabId } = data;
    
    if (userTabs.has(userId)) {
      userTabs.get(userId)!.delete(tabId);
      
      // Notify other tabs about tab leaving
      broadcastToOtherTabs(socket, userId, tabId, RealTimeEvents.TAB_LEFT, {
        tabId,
        timestamp: Date.now(),
        totalTabs: userTabs.get(userId)!.size
      });

      // Clean up empty user entry
      if (userTabs.get(userId)!.size === 0) {
        userTabs.delete(userId);
      }

      console.log(`📱 Tab unregistered: ${tabId} for user ${userId}`);
    }
  } catch (error) {
    console.error('Error unregistering tab:', error);
  }
};

/**
 * Update tab activity
 */
export const updateTabActivity = (_socket: Socket, data: {
  userId: string;
  tabId: string;
  metadata?: TabSyncData['metadata'];
}) => {
  try {
    const { userId, tabId, metadata } = data;
    
    if (userTabs.has(userId) && userTabs.get(userId)!.has(tabId)) {
      const tabData = userTabs.get(userId)!.get(tabId)!;
      tabData.lastActivity = Date.now();
      tabData.isActive = true;
      if (metadata) {
        tabData.metadata = { ...tabData.metadata, ...metadata };
      }
      userTabs.get(userId)!.set(tabId, tabData);
    }
  } catch (error) {
    console.error('Error updating tab activity:', error);
  }
};

/**
 * Broadcast sync event to all tabs of a user
 */
export const broadcastSyncEvent = (io: Server, params: {
  userId: string;
  type: SyncEvent['type'];
  action: SyncEvent['action'];
  data: any;
  excludeTabId?: string;
  tabId?: string;
}) => {
  try {
    const { userId, type, action, data, excludeTabId, tabId } = params;
    
    const syncEvent: SyncEvent = {
      id: `${type}-${action}-${Date.now()}`,
      type,
      action,
      data,
      timestamp: Date.now(),
      userId,
      ...(tabId && { tabId }),
      ...(excludeTabId && { excludeTabId })
    };

    // Store the sync event
    syncEvents.set(syncEvent.id, syncEvent);

    // Get user's tabs
    const userTabMap = userTabs.get(userId);
    if (!userTabMap) {
      console.log(`No tabs found for user ${userId}`);
      return;
    }

    // Broadcast to relevant tabs
    for (const [currentTabId, tabData] of userTabMap.entries()) {
      // Skip if this is the excluded tab
      if (excludeTabId && currentTabId === excludeTabId) {
        continue;
      }

      // Skip if only specific tab should receive
      if (tabId && currentTabId !== tabId) {
        continue;
      }

      // Send sync event to this tab
      io.to(tabData.socketId).emit(RealTimeEvents.TAB_SYNC, syncEvent);
    }

    console.log(`🔄 Sync event broadcasted: ${type}.${action} to user ${userId} tabs`);
  } catch (error) {
    console.error('Error broadcasting sync event:', error);
  }
};

/**
 * Broadcast to other tabs (excluding the current one)
 */
const broadcastToOtherTabs = (socket: Socket, userId: string, excludeTabId: string, event: string, data: any) => {
  try {
    const userTabMap = userTabs.get(userId);
    if (!userTabMap) return;

    for (const [tabId, tabData] of userTabMap.entries()) {
      if (tabId !== excludeTabId) {
        socket.to(tabData.socketId).emit(event, data);
      }
    }
  } catch (error) {
    console.error('Error broadcasting to other tabs:', error);
  }
};

/**
 * Handle tab registration
 */
export const handleTabRegistration = (socket: Socket) => {
  socket.on(RealTimeEvents.REGISTER_TAB, (data: {
    userId: string;
    tabId: string;
    metadata?: TabSyncData['metadata'];
  }) => {
    registerTab(socket, data);
  });
};

/**
 * Handle tab unregistration
 */
export const handleTabUnregistration = (socket: Socket) => {
  socket.on(RealTimeEvents.UNREGISTER_TAB, (data: {
    userId: string;
    tabId: string;
  }) => {
    unregisterTab(socket, data);
  });
};

/**
 * Handle tab activity updates
 */
export const handleTabActivity = (socket: Socket) => {
  socket.on(RealTimeEvents.TAB_ACTIVITY, (data: {
    userId: string;
    tabId: string;
    metadata?: TabSyncData['metadata'];
  }) => {
    updateTabActivity(socket, data);
  });
};

/**
 * Handle sync event requests
 */
export const handleSyncEventRequest = (socket: Socket) => {
  socket.on(RealTimeEvents.REQUEST_SYNC_EVENTS, (data: {
    userId: string;
    tabId: string;
    lastSyncTime?: number;
  }) => {
    try {
      const { userId, tabId, lastSyncTime = 0 } = data;
      
      // Get recent sync events for this user
      const recentEvents = Array.from(syncEvents.values())
        .filter(event => 
          event.userId === userId && 
          event.timestamp > lastSyncTime &&
          event.tabId !== tabId // Don't send events from the same tab
        )
        .sort((a, b) => a.timestamp - b.timestamp);

      socket.emit(RealTimeEvents.SYNC_EVENTS_RESPONSE, {
        events: recentEvents,
        timestamp: Date.now()
      });

      console.log(`🔄 Sent ${recentEvents.length} sync events to tab ${tabId}`);
    } catch (error) {
      console.error('Error handling sync event request:', error);
      socket.emit(RealTimeEvents.ERROR, {
        message: 'Failed to get sync events',
        code: 'SYNC_EVENTS_ERROR'
      });
    }
  });
};

/**
 * Handle tab focus/blur events
 */
export const handleTabFocus = (socket: Socket) => {
  socket.on(RealTimeEvents.TAB_FOCUS, (data: {
    userId: string;
    tabId: string;
  }) => {
    try {
      const { userId, tabId } = data;
      
      if (userTabs.has(userId) && userTabs.get(userId)!.has(tabId)) {
        const tabData = userTabs.get(userId)!.get(tabId)!;
        tabData.isActive = true;
        tabData.lastActivity = Date.now();
        userTabs.get(userId)!.set(tabId, tabData);

        // Notify other tabs about focus change
        broadcastToOtherTabs(socket, userId, tabId, RealTimeEvents.TAB_FOCUS_CHANGED, {
          activeTabId: tabId,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error handling tab focus:', error);
    }
  });

  socket.on(RealTimeEvents.TAB_BLUR, (data: {
    userId: string;
    tabId: string;
  }) => {
    try {
      const { userId, tabId } = data;
      
      if (userTabs.has(userId) && userTabs.get(userId)!.has(tabId)) {
        const tabData = userTabs.get(userId)!.get(tabId)!;
        tabData.isActive = false;
        userTabs.get(userId)!.set(tabId, tabData);
      }
    } catch (error) {
      console.error('Error handling tab blur:', error);
    }
  });
};

/**
 * Get active tabs for a user
 */
export const getActiveTabs = (userId: string): TabSyncData[] => {
  const userTabMap = userTabs.get(userId);
  if (!userTabMap) return [];

  return Array.from(userTabMap.values())
    .filter(tab => tab.isActive);
};

/**
 * Get all tabs for a user
 */
export const getAllTabs = (userId: string): TabSyncData[] => {
  const userTabMap = userTabs.get(userId);
  if (!userTabMap) return [];

  return Array.from(userTabMap.values());
};

/**
 * Cleanup inactive tabs
 */
export const cleanupInactiveTabs = () => {
  const now = Date.now();
  const inactiveThreshold = 5 * 60 * 1000; // 5 minutes

  for (const [userId, userTabMap] of userTabs.entries()) {
    for (const [tabId, tabData] of userTabMap.entries()) {
      if (now - tabData.lastActivity > inactiveThreshold) {
        userTabMap.delete(tabId);
        console.log(`🧹 Cleaned up inactive tab: ${tabId} for user ${userId}`);
      }
    }

    // Clean up empty user entry
    if (userTabMap.size === 0) {
      userTabs.delete(userId);
    }
  }

  // Clean up old sync events
  const maxSyncEvents = 1000;
  if (syncEvents.size > maxSyncEvents) {
    const sortedEvents = Array.from(syncEvents.entries())
      .sort((a, b) => b[1].timestamp - a[1].timestamp);
    
    for (let i = maxSyncEvents; i < sortedEvents.length; i++) {
      const eventToDelete = sortedEvents[i];
      if (eventToDelete) {
        syncEvents.delete(eventToDelete[0]);
      }
    }
  }
};

/**
 * Register tab sync handlers
 */
export const registerTabSyncHandlers = (socket: Socket) => {
  handleTabRegistration(socket);
  handleTabUnregistration(socket);
  handleTabActivity(socket);
  handleSyncEventRequest(socket);
  handleTabFocus(socket);
};

/**
 * Initialize tab sync system
 */
export const initializeTabSyncSystem = () => {
  // Cleanup inactive tabs every minute
  setInterval(cleanupInactiveTabs, 60 * 1000);
  
  console.log('📱 Tab synchronization system initialized');
};

/**
 * Create a tab sync helper for easy broadcasting
 */
export const createTabSyncHelper = (io: Server, userId: string) => {
  return {
    broadcast: (type: SyncEvent['type'], action: SyncEvent['action'], data: any, options?: {
      excludeTabId?: string;
      tabId?: string;
    }) => {
      broadcastSyncEvent(io, {
        userId,
        type,
        action,
        data,
        ...options
      });
    },
    
    getActiveTabs: () => getActiveTabs(userId),
    getAllTabs: () => getAllTabs(userId)
  };
};
