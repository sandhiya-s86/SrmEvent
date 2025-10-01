import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import { config } from '../config/config';
import { EmailData, EmailTemplate } from '../types';

const prisma = new PrismaClient();

export class NotificationService {
  private emailTransporter: nodemailer.Transporter;

  constructor() {
    // Initialize email transporter
    this.emailTransporter = nodemailer.createTransporter({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: false,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS
      }
    });
  }

  // Create and send notification
  public async createNotification(data: {
    userId: number;
    title: string;
    message: string;
    type: 'registration' | 'waitlist_promotion' | 'event_update' | 'reminder' | 'system';
    eventId?: number;
    data?: any;
  }) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
          eventId: data.eventId,
          data: data.data
        }
      });

      // Send email if configured
      if (config.FEATURES.EMAIL_NOTIFICATIONS && data.type !== 'system') {
        await this.sendEmailNotification(data.userId, notification);
      }

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Send email notification
  private async sendEmailNotification(userId: number, notification: any) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true }
      });

      if (!user) return;

      const emailTemplate = this.getEmailTemplate(notification.type, notification);
      
      const emailData: EmailData = {
        to: user.email,
        template: emailTemplate,
        variables: {
          firstName: user.firstName,
          lastName: user.lastName,
          title: notification.title,
          message: notification.message,
          ...notification.data
        }
      };

      await this.sendEmail(emailData);
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  // Get email template based on notification type
  private getEmailTemplate(type: string, notification: any): EmailTemplate {
    const baseTemplate = {
      html: '',
      text: ''
    };

    switch (type) {
      case 'registration':
        return {
          subject: 'Event Registration Confirmed',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Registration Confirmed</h2>
              <p>Hello {{firstName}},</p>
              <p>{{message}}</p>
              <p>Event: <strong>{{eventTitle}}</strong></p>
              <p>Date: {{eventDate}}</p>
              <p>Venue: {{venue}}</p>
              <p>Thank you for registering!</p>
            </div>
          `,
          text: `Registration Confirmed\n\nHello {{firstName}},\n\n{{message}}\n\nEvent: {{eventTitle}}\nDate: {{eventDate}}\nVenue: {{venue}}\n\nThank you for registering!`
        };

      case 'waitlist_promotion':
        return {
          subject: 'You\'ve Been Promoted from Waitlist!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #059669;">Waitlist Promotion</h2>
              <p>Hello {{firstName}},</p>
              <p>Great news! You've been promoted from the waitlist for <strong>{{eventTitle}}</strong>.</p>
              <p>Event: <strong>{{eventTitle}}</strong></p>
              <p>Date: {{eventDate}}</p>
              <p>Venue: {{venue}}</p>
              <p>You are now confirmed to attend this event.</p>
            </div>
          `,
          text: `Waitlist Promotion\n\nHello {{firstName}},\n\nGreat news! You've been promoted from the waitlist for {{eventTitle}}.\n\nEvent: {{eventTitle}}\nDate: {{eventDate}}\nVenue: {{venue}}\n\nYou are now confirmed to attend this event.`
        };

      case 'event_update':
        return {
          subject: 'Event Update',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">Event Update</h2>
              <p>Hello {{firstName}},</p>
              <p>{{message}}</p>
              <p>Event: <strong>{{eventTitle}}</strong></p>
              <p>Please check the event details for any changes.</p>
            </div>
          `,
          text: `Event Update\n\nHello {{firstName}},\n\n{{message}}\n\nEvent: {{eventTitle}}\n\nPlease check the event details for any changes.`
        };

      case 'reminder':
        return {
          subject: 'Event Reminder',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #7c3aed;">Event Reminder</h2>
              <p>Hello {{firstName}},</p>
              <p>This is a reminder about your upcoming event.</p>
              <p>Event: <strong>{{eventTitle}}</strong></p>
              <p>Date: {{eventDate}}</p>
              <p>Venue: {{venue}}</p>
              <p>We look forward to seeing you there!</p>
            </div>
          `,
          text: `Event Reminder\n\nHello {{firstName}},\n\nThis is a reminder about your upcoming event.\n\nEvent: {{eventTitle}}\nDate: {{eventDate}}\nVenue: {{venue}}\n\nWe look forward to seeing you there!`
        };

      default:
        return {
          subject: notification.title,
          html: `<p>{{message}}</p>`,
          text: notification.message
        };
    }
  }

  // Send email
  private async sendEmail(emailData: EmailData) {
    try {
      const { to, template, variables } = emailData;
      
      // Replace variables in template
      let html = template.html;
      let text = template.text;
      
      Object.entries(variables || {}).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        html = html.replace(regex, String(value));
        text = text.replace(regex, String(value));
      });

      await this.emailTransporter.sendMail({
        from: config.SMTP_USER,
        to,
        subject: template.subject,
        html,
        text
      });

      console.log(`Email sent to ${to}`);
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  // Send bulk notifications
  public async sendBulkNotifications(userIds: number[], notificationData: {
    title: string;
    message: string;
    type: 'registration' | 'waitlist_promotion' | 'event_update' | 'reminder' | 'system';
    eventId?: number;
    data?: any;
  }) {
    try {
      const notifications = await Promise.all(
        userIds.map(userId => 
          this.createNotification({
            ...notificationData,
            userId
          })
        )
      );

      return notifications;
    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      throw error;
    }
  }

  // Mark notification as read
  public async markAsRead(notificationId: number, userId: number) {
    try {
      const notification = await prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId
        },
        data: {
          isRead: true
        }
      });

      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read for user
  public async markAllAsRead(userId: number) {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          userId,
          isRead: false
        },
        data: {
          isRead: true
        }
      });

      return result;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Get user notifications
  public async getUserNotifications(userId: number, limit: number = 20, offset: number = 0) {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      });

      return notifications;
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  // Get unread notification count
  public async getUnreadCount(userId: number) {
    try {
      const count = await prisma.notification.count({
        where: {
          userId,
          isRead: false
        }
      });

      return count;
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      throw error;
    }
  }

  // Schedule event reminders
  public async scheduleEventReminders() {
    try {
      // Get events starting in 24 hours
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      const upcomingEvents = await prisma.event.findMany({
        where: {
          date: {
            gte: tomorrow,
            lt: dayAfterTomorrow
          },
          status: 'PUBLISHED'
        },
        include: {
          registrations: {
            where: {
              status: 'REGISTERED'
            },
            select: {
              userId: true
            }
          }
        }
      });

      for (const event of upcomingEvents) {
        const userIds = event.registrations.map(reg => reg.userId);
        
        if (userIds.length > 0) {
          await this.sendBulkNotifications(userIds, {
            title: 'Event Reminder',
            message: `Don't forget! "${event.title}" is tomorrow.`,
            type: 'reminder',
            eventId: event.id,
            data: {
              eventTitle: event.title,
              eventDate: event.date.toISOString(),
              venue: event.venue
            }
          });
        }
      }

      console.log(`Scheduled reminders for ${upcomingEvents.length} events`);
    } catch (error) {
      console.error('Error scheduling event reminders:', error);
    }
  }

  // Clean up old notifications
  public async cleanupOldNotifications(daysOld: number = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await prisma.notification.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          },
          isRead: true
        }
      });

      console.log(`Cleaned up ${result.count} old notifications`);
      return result;
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      throw error;
    }
  }
}

