/**
 * Comprehensive real-time event types for Aashram app
 * Covers all aspects: appointments, remedies, consultations, notifications, etc.
 */

// Base event interface
export interface BaseEvent {
  id: string;
  timestamp: number;
  userId?: string;
  gurujiId?: string;
  clinicId?: string;
}

// Appointment events
export interface AppointmentEvent extends BaseEvent {
  type: 'APPOINTMENT_CREATED' | 'APPOINTMENT_UPDATED' | 'APPOINTMENT_CANCELLED' | 'APPOINTMENT_REMINDER';
  appointmentId: string;
  data: {
    id: string;
    userId: string;
    gurujiId: string;
    date: string;
    time: string;
    status: string;
    reason?: string;
    priority: string;
  };
}

// Queue events
export interface QueueEvent extends BaseEvent {
  type: 'QUEUE_ENTRY_ADDED' | 'QUEUE_ENTRY_UPDATED' | 'QUEUE_ENTRY_REMOVED' | 'QUEUE_POSITION_UPDATED';
  queueId: string;
  data: {
    id: string;
    position: number;
    status: string;
    estimatedWait?: number;
    priority: string;
  };
}

// Consultation events
export interface ConsultationEvent extends BaseEvent {
  type: 'CONSULTATION_STARTED' | 'CONSULTATION_ENDED' | 'CONSULTATION_UPDATED';
  consultationId: string;
  data: {
    id: string;
    startTime: string;
    endTime?: string;
    status: string;
    notes?: string;
  };
}

// Remedy events
export interface RemedyEvent extends BaseEvent {
  type: 'REMEDY_PRESCRIBED' | 'REMEDY_UPDATED' | 'REMEDY_COMPLETED';
  remedyId: string;
  data: {
    id: string;
    templateId: string;
    status: string;
    instructions: string;
    dosage?: string;
    duration?: string;
  };
}

// Notification events
export interface NotificationEvent extends BaseEvent {
  type: 'NOTIFICATION_SENT' | 'NOTIFICATION_READ' | 'NOTIFICATION_DELETED';
  notificationId: string;
  data: {
    id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
  };
}

// User events
export interface UserEvent extends BaseEvent {
  type: 'USER_REGISTERED' | 'USER_UPDATED' | 'USER_STATUS_CHANGED' | 'USER_LOGGED_IN' | 'USER_LOGGED_OUT';
  data: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  };
}

// Guruji events
export interface GurujiEvent extends BaseEvent {
  type: 'GURUJI_AVAILABLE' | 'GURUJI_BUSY' | 'GURUJI_OFFLINE' | 'GURUJI_SCHEDULE_UPDATED';
  data: {
    id: string;
    name: string;
    status: string;
    availability: string[];
    currentQueueLength: number;
  };
}

// Clinic events
export interface ClinicEvent extends BaseEvent {
  type: 'CLINIC_OPENED' | 'CLINIC_CLOSED' | 'CLINIC_SCHEDULE_UPDATED' | 'CLINIC_MAINTENANCE';
  data: {
    id: string;
    name: string;
    status: string;
    operatingHours: string[];
    currentCapacity: number;
    maxCapacity: number;
  };
}

// Payment events
export interface PaymentEvent extends BaseEvent {
  type: 'PAYMENT_INITIATED' | 'PAYMENT_COMPLETED' | 'PAYMENT_FAILED' | 'REFUND_PROCESSED';
  paymentId: string;
  data: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    method: string;
  };
}

// Emergency events
export interface EmergencyEvent extends BaseEvent {
  type: 'EMERGENCY_ALERT' | 'EMERGENCY_RESOLVED' | 'EMERGENCY_ESCALATED';
  emergencyId: string;
  data: {
    id: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    location?: string;
    status: string;
  };
}

// System events
export interface SystemEvent extends BaseEvent {
  type: 'SYSTEM_MAINTENANCE' | 'SYSTEM_UPDATE' | 'SYSTEM_ERROR' | 'SYSTEM_RECOVERY';
  data: {
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    message: string;
    component: string;
    status: string;
  };
}

// Union type for all events
export type RealTimeEvent = 
  | AppointmentEvent 
  | QueueEvent 
  | ConsultationEvent 
  | RemedyEvent 
  | NotificationEvent 
  | UserEvent 
  | GurujiEvent 
  | ClinicEvent 
  | PaymentEvent 
  | EmergencyEvent 
  | SystemEvent;

// Socket.IO event names
export enum RealTimeEvents {
  // Client -> Server events
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',
  SUBSCRIBE_TO_EVENTS = 'subscribe_to_events',
  UNSUBSCRIBE_FROM_EVENTS = 'unsubscribe_from_events',
  REQUEST_UPDATE = 'request_update',
  
  // Server -> Client events
  EVENT_BROADCAST = 'event_broadcast',
  EVENT_TARGETED = 'event_targeted',
  EVENT_GROUP = 'event_group',
  EVENT_GLOBAL = 'event_global',
  
  // Specific event types
  APPOINTMENT_UPDATE = 'appointment_update',
  QUEUE_UPDATE = 'queue_update',
  CONSULTATION_UPDATE = 'consultation_update',
  REMEDY_UPDATE = 'remedy_update',
  NOTIFICATION_UPDATE = 'notification_update',
  USER_UPDATE = 'user_update',
  GURUJI_UPDATE = 'guruji_update',
  CLINIC_UPDATE = 'clinic_update',
  PAYMENT_UPDATE = 'payment_update',
  EMERGENCY_UPDATE = 'emergency_update',
  SYSTEM_UPDATE = 'system_update',
  
  // Error events
  ERROR = 'error',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  AUTHENTICATION_ERROR = 'authentication_error',
  PERMISSION_DENIED = 'permission_denied'
}

// Room types for different user roles and contexts
export enum RoomTypes {
  // User-specific rooms
  USER = 'user',
  GURUJI = 'guruji',
  ADMIN = 'admin',
  COORDINATOR = 'coordinator',
  
  // Feature-specific rooms
  APPOINTMENTS = 'appointments',
  QUEUE = 'queue',
  CONSULTATIONS = 'consultations',
  REMEDIES = 'remedies',
  NOTIFICATIONS = 'notifications',
  PAYMENTS = 'payments',
  EMERGENCIES = 'emergencies',
  
  // Clinic-specific rooms
  CLINIC = 'clinic',
  
  // Global rooms
  GLOBAL = 'global',
  SYSTEM = 'system'
}

// Subscription request interface
export interface EventSubscription {
  userId: string;
  events: string[];
  rooms: string[];
  filters?: Record<string, any>;
}

// Event filter interface
export interface EventFilter {
  eventTypes?: string[];
  userIds?: string[];
  gurujiIds?: string[];
  clinicIds?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  priority?: string[];
  status?: string[];
}
