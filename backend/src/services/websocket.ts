import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class WebSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<number, string> = new Map(); // userId -> socketId

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, config.JWT_SECRET) as any;
        
        // Verify user exists and is active
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, isActive: true }
        });

        if (!user || !user.isActive) {
          return next(new Error('Invalid user'));
        }

        socket.userId = decoded.userId;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: Socket & { userId: number }) => {
      console.log(`User ${socket.userId} connected with socket ${socket.id}`);
      
      // Store user connection
      this.connectedUsers.set(socket.userId, socket.id);

      // Join user to their personal room
      socket.join(`user:${socket.userId}`);

      // Handle joining event rooms
      socket.on('join_event_room', (eventId: number) => {
        socket.join(`event:${eventId}`);
        console.log(`User ${socket.userId} joined event room ${eventId}`);
      });

      // Handle leaving event rooms
      socket.on('leave_event_room', (eventId: number) => {
        socket.leave(`event:${eventId}`);
        console.log(`User ${socket.userId} left event room ${eventId}`);
      });

      // Handle joining organizer rooms
      socket.on('join_organizer_room', (organizerId: number) => {
        socket.join(`organizer:${organizerId}`);
        console.log(`User ${socket.userId} joined organizer room ${organizerId}`);
      });

      // Handle real-time event updates
      socket.on('event_update', async (data) => {
        try {
          // Verify user has permission to update this event
          const event = await prisma.event.findUnique({
            where: { id: data.eventId },
            select: { organizerId: true }
          });

          if (!event || (event.organizerId !== socket.userId && socket.userId !== 1)) { // Admin check
            socket.emit('error', { message: 'Unauthorized' });
            return;
          }

          // Broadcast update to event room
          this.io.to(`event:${data.eventId}`).emit('event_updated', data);
        } catch (error) {
          socket.emit('error', { message: 'Failed to update event' });
        }
      });

      // Handle registration updates
      socket.on('registration_update', async (data) => {
        try {
          const event = await prisma.event.findUnique({
            where: { id: data.eventId },
            select: { organizerId: true }
          });

          if (!event) {
            socket.emit('error', { message: 'Event not found' });
            return;
          }

          // Broadcast to event room and organizer room
          this.io.to(`event:${data.eventId}`).emit('registration_updated', data);
          this.io.to(`organizer:${event.organizerId}`).emit('registration_updated', data);
        } catch (error) {
          socket.emit('error', { message: 'Failed to update registration' });
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected`);
        this.connectedUsers.delete(socket.userId);
      });
    });
  }

  // Public methods for broadcasting events

  public async broadcastRegistrationUpdate(eventId: number, registrationData: any) {
    try {
      // Get event organizer
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { organizerId: true, title: true }
      });

      if (!event) return;

      const updateData = {
        type: 'registration_update',
        eventId,
        eventTitle: event.title,
        data: registrationData,
        timestamp: new Date().toISOString()
      };

      // Broadcast to event room
      this.io.to(`event:${eventId}`).emit('registration_updated', updateData);

      // Broadcast to organizer room
      this.io.to(`organizer:${event.organizerId}`).emit('registration_updated', updateData);

      // Send notification to organizer if not online
      if (!this.connectedUsers.has(event.organizerId)) {
        await this.createNotification({
          userId: event.organizerId,
          title: 'New Registration',
          message: `New registration for "${event.title}"`,
          type: 'registration',
          eventId,
          data: registrationData
        });
      }
    } catch (error) {
      console.error('Error broadcasting registration update:', error);
    }
  }

  public async broadcastWaitlistPromotion(userId: number, eventId: number, eventTitle: string) {
    const updateData = {
      type: 'waitlist_promotion',
      eventId,
      eventTitle,
      timestamp: new Date().toISOString()
    };

    // Send to specific user
    this.io.to(`user:${userId}`).emit('waitlist_promoted', updateData);

    // Also send to event room
    this.io.to(`event:${eventId}`).emit('waitlist_promoted', updateData);
  }

  public async broadcastEventUpdate(eventId: number, eventData: any) {
    const updateData = {
      type: 'event_update',
      eventId,
      data: eventData,
      timestamp: new Date().toISOString()
    };

    // Broadcast to event room
    this.io.to(`event:${eventId}`).emit('event_updated', updateData);
  }

  public async broadcastCapacityUpdate(eventId: number, capacityData: any) {
    const updateData = {
      type: 'capacity_update',
      eventId,
      data: capacityData,
      timestamp: new Date().toISOString()
    };

    // Broadcast to event room
    this.io.to(`event:${eventId}`).emit('capacity_updated', updateData);
  }

  public async broadcastNotification(userId: number, notification: any) {
    // Send to specific user if online
    if (this.connectedUsers.has(userId)) {
      this.io.to(`user:${userId}`).emit('notification', notification);
    }
  }

  public async broadcastSystemAnnouncement(announcement: any) {
    // Broadcast to all connected users
    this.io.emit('system_announcement', announcement);
  }

  public async broadcastEventReminder(eventId: number, reminderData: any) {
    // Get all registered users for this event
    const registrations = await prisma.registration.findMany({
      where: {
        eventId,
        status: 'REGISTERED'
      },
      select: { userId: true }
    });

    const updateData = {
      type: 'event_reminder',
      eventId,
      data: reminderData,
      timestamp: new Date().toISOString()
    };

    // Send to all registered users
    registrations.forEach(registration => {
      this.io.to(`user:${registration.userId}`).emit('event_reminder', updateData);
    });
  }

  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  public isUserOnline(userId: number): boolean {
    return this.connectedUsers.has(userId);
  }

  private async createNotification(notificationData: any) {
    try {
      await prisma.notification.create({
        data: notificationData
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }
}

// Extend Socket interface to include userId
declare module 'socket.io' {
  interface Socket {
    userId: number;
  }
}

