/**
 * Comprehensive real-time event handlers for Aashram app
 * Handles all types of real-time updates: appointments, remedies, consultations, etc.
 */

import { Socket, Server } from 'socket.io';
import { 
  RealTimeEvents, 
  RealTimeEvent, 
  EventSubscription,
  RoomTypes,
  AppointmentEvent,
  QueueEvent,
  ConsultationEvent,
  RemedyEvent,
  NotificationEvent,
  UserEvent,
  GurujiEvent,
  ClinicEvent,
  PaymentEvent,
  EmergencyEvent,
  SystemEvent
} from '../types/real-time.types';

// Event subscription tracking
const eventSubscriptions = new Map<string, Set<string>>();
const userSubscriptions = new Map<string, EventSubscription>();

/**
 * Handle event subscriptions
 */
export const handleEventSubscription = (socket: Socket) => {
  socket.on(RealTimeEvents.SUBSCRIBE_TO_EVENTS, (subscription: EventSubscription) => {
    try {
      const { userId, events, rooms } = subscription;
      
      // Store user subscription
      userSubscriptions.set(socket.id, subscription);
      
      // Join relevant rooms
      rooms.forEach(room => {
        socket.join(room);
        console.log(`User ${userId} subscribed to room: ${room}`);
      });
      
      // Track event subscriptions
      events.forEach(eventType => {
        if (!eventSubscriptions.has(eventType)) {
          eventSubscriptions.set(eventType, new Set());
        }
        eventSubscriptions.get(eventType)!.add(socket.id);
      });
      
      socket.emit(RealTimeEvents.EVENT_BROADCAST, {
        message: 'Successfully subscribed to events',
        subscribedEvents: events,
        subscribedRooms: rooms,
        timestamp: Date.now()
      });
      
      console.log(`User ${userId} subscribed to ${events.length} event types and ${rooms.length} rooms`);
      
    } catch (error) {
      console.error('Error handling event subscription:', error);
      socket.emit(RealTimeEvents.ERROR, { 
        message: 'Failed to subscribe to events', 
        code: 'SUBSCRIPTION_ERROR' 
      });
    }
  });
};

/**
 * Handle event unsubscription
 */
export const handleEventUnsubscription = (socket: Socket) => {
  socket.on(RealTimeEvents.UNSUBSCRIBE_FROM_EVENTS, (subscription: EventSubscription) => {
    try {
      const { userId, events, rooms } = subscription;
      
      // Remove user subscription
      userSubscriptions.delete(socket.id);
      
      // Leave rooms
      rooms.forEach(room => {
        socket.leave(room);
        console.log(`User ${userId} unsubscribed from room: ${room}`);
      });
      
      // Remove event subscriptions
      events.forEach(eventType => {
        const subscribers = eventSubscriptions.get(eventType);
        if (subscribers) {
          subscribers.delete(socket.id);
          if (subscribers.size === 0) {
            eventSubscriptions.delete(eventType);
          }
        }
      });
      
      socket.emit(RealTimeEvents.EVENT_BROADCAST, {
        message: 'Successfully unsubscribed from events',
        unsubscribedEvents: events,
        unsubscribedRooms: rooms,
        timestamp: Date.now()
      });
      
      console.log(`User ${userId} unsubscribed from ${events.length} event types and ${rooms.length} rooms`);
      
    } catch (error) {
      console.error('Error handling event unsubscription:', error);
      socket.emit(RealTimeEvents.ERROR, { 
        message: 'Failed to unsubscribe from events', 
        code: 'UNSUBSCRIPTION_ERROR' 
      });
    }
  });
};

/**
 * Handle update requests
 */
export const handleUpdateRequest = (socket: Socket) => {
  socket.on(RealTimeEvents.REQUEST_UPDATE, (data: { type: string; id?: string }) => {
    try {
      const { type, id } = data;
      
      // This would typically fetch data from your main app
      // For now, just acknowledge the request
      socket.emit(RealTimeEvents.EVENT_BROADCAST, {
        message: `Update request received for ${type}`,
        type,
        id,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('Error handling update request:', error);
      socket.emit(RealTimeEvents.ERROR, { 
        message: 'Failed to process update request', 
        code: 'UPDATE_REQUEST_ERROR' 
      });
    }
  });
};

/**
 * Broadcast appointment updates
 */
export const broadcastAppointmentUpdate = (io: Server, event: AppointmentEvent) => {
  // Broadcast to specific user
  if (event.userId) {
    io.to(`${RoomTypes.USER}:${event.userId}`).emit(RealTimeEvents.APPOINTMENT_UPDATE, event);
  }
  
  // Broadcast to guruji
  if (event.gurujiId) {
    io.to(`${RoomTypes.GURUJI}:${event.gurujiId}`).emit(RealTimeEvents.APPOINTMENT_UPDATE, event);
  }
  
  // Broadcast to appointments room
  io.to(RoomTypes.APPOINTMENTS).emit(RealTimeEvents.APPOINTMENT_UPDATE, event);
  
  // Broadcast to admin/coordinator rooms
  io.to(RoomTypes.ADMIN).emit(RealTimeEvents.APPOINTMENT_UPDATE, event);
  io.to(RoomTypes.COORDINATOR).emit(RealTimeEvents.APPOINTMENT_UPDATE, event);
  
  console.log(`Broadcasted appointment update: ${event.type} for appointment ${event.appointmentId}`);
};

/**
 * Broadcast queue updates
 */
export const broadcastQueueUpdate = (io: Server, event: QueueEvent) => {
  // Broadcast to queue room
  io.to(RoomTypes.QUEUE).emit(RealTimeEvents.QUEUE_UPDATE, event);
  
  // Broadcast to specific user
  if (event.userId) {
    io.to(`${RoomTypes.USER}:${event.userId}`).emit(RealTimeEvents.QUEUE_UPDATE, event);
  }
  
  // Broadcast to guruji
  if (event.gurujiId) {
    io.to(`${RoomTypes.GURUJI}:${event.gurujiId}`).emit(RealTimeEvents.QUEUE_UPDATE, event);
  }
  
  // Broadcast to admin/coordinator rooms
  io.to(RoomTypes.ADMIN).emit(RealTimeEvents.QUEUE_UPDATE, event);
  io.to(RoomTypes.COORDINATOR).emit(RealTimeEvents.QUEUE_UPDATE, event);
  
  console.log(`Broadcasted queue update: ${event.type} for queue ${event.queueId}`);
};

/**
 * Broadcast consultation updates
 */
export const broadcastConsultationUpdate = (io: Server, event: ConsultationEvent) => {
  // Broadcast to consultations room
  io.to(RoomTypes.CONSULTATIONS).emit(RealTimeEvents.CONSULTATION_UPDATE, event);
  
  // Broadcast to specific user
  if (event.userId) {
    io.to(`${RoomTypes.USER}:${event.userId}`).emit(RealTimeEvents.CONSULTATION_UPDATE, event);
  }
  
  // Broadcast to guruji
  if (event.gurujiId) {
    io.to(`${RoomTypes.GURUJI}:${event.gurujiId}`).emit(RealTimeEvents.CONSULTATION_UPDATE, event);
  }
  
  // Broadcast to admin/coordinator rooms
  io.to(RoomTypes.ADMIN).emit(RealTimeEvents.CONSULTATION_UPDATE, event);
  io.to(RoomTypes.COORDINATOR).emit(RealTimeEvents.CONSULTATION_UPDATE, event);
  
  console.log(`Broadcasted consultation update: ${event.type} for consultation ${event.consultationId}`);
};

/**
 * Broadcast remedy updates
 */
export const broadcastRemedyUpdate = (io: Server, event: RemedyEvent) => {
  // Broadcast to remedies room
  io.to(RoomTypes.REMEDIES).emit(RealTimeEvents.REMEDY_UPDATE, event);
  
  // Broadcast to specific user
  if (event.userId) {
    io.to(`${RoomTypes.USER}:${event.userId}`).emit(RealTimeEvents.REMEDY_UPDATE, event);
  }
  
  // Broadcast to admin/coordinator rooms
  io.to(RoomTypes.ADMIN).emit(RealTimeEvents.REMEDY_UPDATE, event);
  io.to(RoomTypes.COORDINATOR).emit(RealTimeEvents.REMEDY_UPDATE, event);
  
  console.log(`Broadcasted remedy update: ${event.type} for remedy ${event.remedyId}`);
};

/**
 * Broadcast notification updates
 */
export const broadcastNotificationUpdate = (io: Server, event: NotificationEvent) => {
  // Broadcast to notifications room
  io.to(RoomTypes.NOTIFICATIONS).emit(RealTimeEvents.NOTIFICATION_UPDATE, event);
  
  // Broadcast to specific user
  if (event.userId) {
    io.to(`${RoomTypes.USER}:${event.userId}`).emit(RealTimeEvents.NOTIFICATION_UPDATE, event);
  }
  
  // Broadcast to admin/coordinator rooms
  io.to(RoomTypes.ADMIN).emit(RealTimeEvents.NOTIFICATION_UPDATE, event);
  io.to(RoomTypes.COORDINATOR).emit(RealTimeEvents.NOTIFICATION_UPDATE, event);
  
  console.log(`Broadcasted notification update: ${event.type} for notification ${event.notificationId}`);
};

/**
 * Broadcast user updates
 */
export const broadcastUserUpdate = (io: Server, event: UserEvent) => {
  // Broadcast to users room
  io.to(RoomTypes.USER).emit(RealTimeEvents.USER_UPDATE, event);
  
  // Broadcast to specific user
  if (event.userId) {
    io.to(`${RoomTypes.USER}:${event.userId}`).emit(RealTimeEvents.USER_UPDATE, event);
  }
  
  // Broadcast to admin/coordinator rooms
  io.to(RoomTypes.ADMIN).emit(RealTimeEvents.USER_UPDATE, event);
  io.to(RoomTypes.COORDINATOR).emit(RealTimeEvents.USER_UPDATE, event);
  
  console.log(`Broadcasted user update: ${event.type} for user ${event.userId}`);
};

/**
 * Broadcast guruji updates
 */
export const broadcastGurujiUpdate = (io: Server, event: GurujiEvent) => {
  // Broadcast to guruji room
  io.to(RoomTypes.GURUJI).emit(RealTimeEvents.GURUJI_UPDATE, event);
  
  // Broadcast to specific guruji
  if (event.gurujiId) {
    io.to(`${RoomTypes.GURUJI}:${event.gurujiId}`).emit(RealTimeEvents.GURUJI_UPDATE, event);
  }
  
  // Broadcast to admin/coordinator rooms
  io.to(RoomTypes.ADMIN).emit(RealTimeEvents.GURUJI_UPDATE, event);
  io.to(RoomTypes.COORDINATOR).emit(RealTimeEvents.GURUJI_UPDATE, event);
  
  console.log(`Broadcasted guruji update: ${event.type} for guruji ${event.gurujiId}`);
};

/**
 * Broadcast clinic updates
 */
export const broadcastClinicUpdate = (io: Server, event: ClinicEvent) => {
  // Broadcast to clinic room
  io.to(RoomTypes.CLINIC).emit(RealTimeEvents.CLINIC_UPDATE, event);
  
  // Broadcast to specific clinic
  if (event.clinicId) {
    io.to(`${RoomTypes.CLINIC}:${event.clinicId}`).emit(RealTimeEvents.CLINIC_UPDATE, event);
  }
  
  // Broadcast to all users (clinic status affects everyone)
  io.to(RoomTypes.GLOBAL).emit(RealTimeEvents.CLINIC_UPDATE, event);
  
  console.log(`Broadcasted clinic update: ${event.type} for clinic ${event.clinicId}`);
};

/**
 * Broadcast payment updates
 */
export const broadcastPaymentUpdate = (io: Server, event: PaymentEvent) => {
  // Broadcast to payments room
  io.to(RoomTypes.PAYMENTS).emit(RealTimeEvents.PAYMENT_UPDATE, event);
  
  // Broadcast to specific user
  if (event.userId) {
    io.to(`${RoomTypes.USER}:${event.userId}`).emit(RealTimeEvents.PAYMENT_UPDATE, event);
  }
  
  // Broadcast to admin/coordinator rooms
  io.to(RoomTypes.ADMIN).emit(RealTimeEvents.PAYMENT_UPDATE, event);
  io.to(RoomTypes.COORDINATOR).emit(RealTimeEvents.PAYMENT_UPDATE, event);
  
  console.log(`Broadcasted payment update: ${event.type} for payment ${event.paymentId}`);
};

/**
 * Broadcast emergency updates
 */
export const broadcastEmergencyUpdate = (io: Server, event: EmergencyEvent) => {
  // Broadcast to emergencies room
  io.to(RoomTypes.EMERGENCIES).emit(RealTimeEvents.EMERGENCY_UPDATE, event);
  
  // Broadcast to admin/coordinator rooms (high priority)
  io.to(RoomTypes.ADMIN).emit(RealTimeEvents.EMERGENCY_UPDATE, event);
  io.to(RoomTypes.COORDINATOR).emit(RealTimeEvents.EMERGENCY_UPDATE, event);
  
  // Broadcast critical emergencies to all users
  if (event.data.severity === 'CRITICAL' || event.data.severity === 'HIGH') {
    io.to(RoomTypes.GLOBAL).emit(RealTimeEvents.EMERGENCY_UPDATE, event);
  }
  
  console.log(`Broadcasted emergency update: ${event.type} for emergency ${event.emergencyId}`);
};

/**
 * Broadcast system updates
 */
export const broadcastSystemUpdate = (io: Server, event: SystemEvent) => {
  // Broadcast to system room
  io.to(RoomTypes.SYSTEM).emit(RealTimeEvents.SYSTEM_UPDATE, event);
  
  // Broadcast to admin/coordinator rooms
  io.to(RoomTypes.ADMIN).emit(RealTimeEvents.SYSTEM_UPDATE, event);
  io.to(RoomTypes.COORDINATOR).emit(RealTimeEvents.SYSTEM_UPDATE, event);
  
  // Broadcast critical system events to all users
  if (event.data.severity === 'CRITICAL' || event.data.severity === 'ERROR') {
    io.to(RoomTypes.GLOBAL).emit(RealTimeEvents.SYSTEM_UPDATE, event);
  }
  
  console.log(`Broadcasted system update: ${event.type} - ${event.data.message}`);
};

/**
 * Generic event broadcaster
 */
export const broadcastEvent = (io: Server, event: RealTimeEvent) => {
  switch (event.type) {
    case 'APPOINTMENT_CREATED':
    case 'APPOINTMENT_UPDATED':
    case 'APPOINTMENT_CANCELLED':
    case 'APPOINTMENT_REMINDER':
      broadcastAppointmentUpdate(io, event as AppointmentEvent);
      break;
      
    case 'QUEUE_ENTRY_ADDED':
    case 'QUEUE_ENTRY_UPDATED':
    case 'QUEUE_ENTRY_REMOVED':
    case 'QUEUE_POSITION_UPDATED':
      broadcastQueueUpdate(io, event as QueueEvent);
      break;
      
    case 'CONSULTATION_STARTED':
    case 'CONSULTATION_ENDED':
    case 'CONSULTATION_UPDATED':
      broadcastConsultationUpdate(io, event as ConsultationEvent);
      break;
      
    case 'REMEDY_PRESCRIBED':
    case 'REMEDY_UPDATED':
    case 'REMEDY_COMPLETED':
      broadcastRemedyUpdate(io, event as RemedyEvent);
      break;
      
    case 'NOTIFICATION_SENT':
    case 'NOTIFICATION_READ':
    case 'NOTIFICATION_DELETED':
      broadcastNotificationUpdate(io, event as NotificationEvent);
      break;
      
    case 'USER_REGISTERED':
    case 'USER_UPDATED':
    case 'USER_STATUS_CHANGED':
    case 'USER_LOGGED_IN':
    case 'USER_LOGGED_OUT':
      broadcastUserUpdate(io, event as UserEvent);
      break;
      
    case 'GURUJI_AVAILABLE':
    case 'GURUJI_BUSY':
    case 'GURUJI_OFFLINE':
    case 'GURUJI_SCHEDULE_UPDATED':
      broadcastGurujiUpdate(io, event as GurujiEvent);
      break;
      
    case 'CLINIC_OPENED':
    case 'CLINIC_CLOSED':
    case 'CLINIC_SCHEDULE_UPDATED':
    case 'CLINIC_MAINTENANCE':
      broadcastClinicUpdate(io, event as ClinicEvent);
      break;
      
    case 'PAYMENT_INITIATED':
    case 'PAYMENT_COMPLETED':
    case 'PAYMENT_FAILED':
    case 'REFUND_PROCESSED':
      broadcastPaymentUpdate(io, event as PaymentEvent);
      break;
      
    case 'EMERGENCY_ALERT':
    case 'EMERGENCY_RESOLVED':
    case 'EMERGENCY_ESCALATED':
      broadcastEmergencyUpdate(io, event as EmergencyEvent);
      break;
      
    case 'SYSTEM_MAINTENANCE':
    case 'SYSTEM_UPDATE':
    case 'SYSTEM_ERROR':
    case 'SYSTEM_RECOVERY':
      broadcastSystemUpdate(io, event as SystemEvent);
      break;
      
    default:
      console.warn(`Unknown event type: ${(event as any).type}`);
  }
};

/**
 * Register all real-time event handlers
 */
export const registerRealTimeHandlers = (socket: Socket) => {
  handleEventSubscription(socket);
  handleEventUnsubscription(socket);
  handleUpdateRequest(socket);
};

/**
 * Get subscription statistics
 */
export const getSubscriptionStats = () => ({
  totalSubscriptions: eventSubscriptions.size,
  totalUsers: userSubscriptions.size,
  eventTypes: Array.from(eventSubscriptions.keys()),
  userCounts: Object.fromEntries(
    Array.from(eventSubscriptions.entries()).map(([event, users]) => [event, users.size])
  )
});
