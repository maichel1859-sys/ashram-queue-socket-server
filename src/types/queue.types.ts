/**
 * Queue event types for Socket.IO server
 * Aligned with aadhram-app types
 */

export enum QueueStatus {
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  LATE_ARRIVAL = 'LATE_ARRIVAL'
}

export enum Priority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

// Simplified QueueEntry that matches the main app
export interface QueueEntry {
  id: string;
  appointmentId: string;
  userId: string;
  gurujiId?: string | null;
  position: number;
  status: QueueStatus;
  priority: Priority;
  estimatedWait?: number | null;
  checkedInAt: Date;
  startedAt?: Date | null;
  completedAt?: Date | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Simplified QueueUpdate that matches the main app
export interface QueueUpdate {
  type: 'position_update' | 'status_change' | 'estimate_update';
  queueEntry: QueueEntry;
  message?: string;
}

// Socket.IO event types
export enum QueueSocketEvents {
  // Client -> Server events
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',
  REQUEST_QUEUE_UPDATE = 'request_queue_update',
  REQUEST_USER_QUEUE_STATUS = 'request_user_queue_status',
  REQUEST_GURUJI_QUEUE = 'request_guruji_queue',
  
  // Server -> Client events
  QUEUE_UPDATED = 'queue_updated',
  USER_QUEUE_STATUS = 'user_queue_status',
  GURUJI_QUEUE_UPDATED = 'guruji_queue_updated',
  QUEUE_ENTRY_UPDATED = 'queue_entry_updated',
  QUEUE_ENTRY_ADDED = 'queue_entry_added',
  QUEUE_ENTRY_REMOVED = 'queue_entry_removed',
  QUEUE_POSITION_UPDATED = 'queue_position_updated',
  ERROR = 'error'
}

export interface SocketError {
  message: string;
  code: string;
}

export interface RoomJoinRequest {
  userId?: string;
  gurujiId?: string;
  role: 'USER' | 'GURUJI' | 'COORDINATOR' | 'ADMIN';
}