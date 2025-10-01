import express from 'express';
import { PrismaClient } from '@prisma/client';
import { param, query, validationResult } from 'express-validator';
import { authenticateToken, requireOrganizer } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../types';

const router = express.Router();
const prisma = new PrismaClient();

// Get event analytics
router.get('/event/:eventId', authenticateToken, requireOrganizer, asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const eventIdNum = parseInt(eventId);

  // Check if user can view analytics for this event
  const event = await prisma.event.findUnique({
    where: { id: eventIdNum }
  });

  if (!event) {
    throw new AppError('Event not found', 404);
  }

  if (req.user!.role !== 'ADMIN' && event.organizerId !== req.user!.id) {
    throw new AppError('You can only view analytics for your own events', 403);
  }

  const [
    totalRegistrations,
    totalRevenue,
    registrationTrend,
    demographics,
    popularTimeSlots,
    cancellations,
    attendance
  ] = await Promise.all([
    // Total registrations
    prisma.registration.count({
      where: {
        eventId: eventIdNum,
        status: { in: ['REGISTERED', 'WAITLISTED', 'ATTENDED'] }
      }
    }),

    // Total revenue
    prisma.registration.aggregate({
      where: {
        eventId: eventIdNum,
        status: { in: ['REGISTERED', 'WAITLISTED', 'ATTENDED'] }
      },
      _sum: {
        id: true // This would need to be adjusted for actual revenue tracking
      }
    }),

    // Registration trend (last 30 days)
    prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM registrations 
      WHERE event_id = ${eventIdNum}
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `,

    // Demographics
    prisma.registration.groupBy({
      by: ['userId'],
      where: {
        eventId: eventIdNum,
        status: { in: ['REGISTERED', 'WAITLISTED', 'ATTENDED'] }
      }
    }).then(async (groupedRegistrations) => {
      const userIds = groupedRegistrations.map(g => g.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { role: true }
      });

      const byRole: Record<string, number> = {};
      users.forEach(user => {
        byRole[user.role] = (byRole[user.role] || 0) + 1;
      });

      return { byRole };
    }),

    // Popular time slots (mock data for now)
    Promise.resolve([
      { hour: 9, count: 45 },
      { hour: 14, count: 78 },
      { hour: 19, count: 56 }
    ]),

    // Cancellations
    prisma.registration.count({
      where: {
        eventId: eventIdNum,
        status: 'CANCELLED'
      }
    }),

    // Attendance
    prisma.registration.count({
      where: {
        eventId: eventIdNum,
        status: 'ATTENDED'
      }
    })
  ]);

  const totalRegistrationsCount = totalRegistrations;
  const cancellationRate = totalRegistrationsCount > 0 ? (cancellations / totalRegistrationsCount) * 100 : 0;
  const attendanceRate = totalRegistrationsCount > 0 ? (attendance / totalRegistrationsCount) * 100 : 0;

  res.json({
    success: true,
    data: {
      eventId: eventIdNum,
      eventTitle: event.title,
      totalRegistrations: totalRegistrationsCount,
      totalRevenue: event.price * totalRegistrationsCount, // Simplified calculation
      registrationTrend: registrationTrend || [],
      demographics,
      popularTimeSlots,
      cancellationRate: Math.round(cancellationRate * 100) / 100,
      attendanceRate: Math.round(attendanceRate * 100) / 100
    }
  });
}));

// Get user analytics
router.get('/user/:userId', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const userIdNum = parseInt(userId);

  // Check permissions
  if (req.user!.id !== userIdNum && req.user!.role !== 'ADMIN') {
    throw new AppError('You can only view your own analytics', 403);
  }

  const [
    totalEventsRegistered,
    totalEventsAttended,
    favoriteCategories,
    totalSpent
  ] = await Promise.all([
    // Total events registered
    prisma.registration.count({
      where: { userId: userIdNum }
    }),

    // Total events attended
    prisma.registration.count({
      where: {
        userId: userIdNum,
        status: 'ATTENDED'
      }
    }),

    // Favorite categories
    prisma.registration.findMany({
      where: { userId: userIdNum },
      include: {
        event: {
          select: {
            category: {
              select: {
                name: true,
                icon: true
              }
            }
          }
        }
      }
    }).then(registrations => {
      const categoryCounts: Record<string, number> = {};
      registrations.forEach(registration => {
        const categoryName = registration.event.category.name;
        categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
      });

      return Object.entries(categoryCounts)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    }),

    // Total spent (simplified calculation)
    prisma.registration.findMany({
      where: { userId: userIdNum },
      include: {
        event: {
          select: { price: true }
        }
      }
    }).then(registrations => {
      return registrations.reduce((total, reg) => total + reg.event.price, 0);
    })
  ]);

  const attendanceRate = totalEventsRegistered > 0 ? (totalEventsAttended / totalEventsRegistered) * 100 : 0;

  res.json({
    success: true,
    data: {
      userId: userIdNum,
      totalEventsRegistered,
      totalEventsAttended,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      favoriteCategories,
      totalSpent
    }
  });
}));

// Get system-wide analytics (admin only)
router.get('/system/overview', authenticateToken, asyncHandler(async (req, res) => {
  if (req.user!.role !== 'ADMIN') {
    throw new AppError('Admin access required', 403);
  }

  const [
    totalEvents,
    totalUsers,
    totalRegistrations,
    eventsByCategory,
    registrationTrend,
    revenueByMonth
  ] = await Promise.all([
    // Total events
    prisma.event.count(),

    // Total users
    prisma.user.count({
      where: { isActive: true }
    }),

    // Total registrations
    prisma.registration.count(),

    // Events by category
    prisma.event.groupBy({
      by: ['categoryId'],
      _count: true
    }).then(async (groupedEvents) => {
      const categoryIds = groupedEvents.map(g => g.categoryId);
      const categories = await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true }
      });

      return groupedEvents.map(group => {
        const category = categories.find(c => c.id === group.categoryId);
        return {
          category: category?.name || 'Unknown',
          count: group._count
        };
      });
    }),

    // Registration trend (last 30 days)
    prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM registrations 
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `,

    // Revenue by month (last 12 months)
    prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) * e.price as revenue
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      WHERE r.created_at >= NOW() - INTERVAL '12 months'
        AND r.status IN ('REGISTERED', 'WAITLISTED', 'ATTENDED')
      GROUP BY DATE_TRUNC('month', created_at), e.price
      ORDER BY month
    `
  ]);

  res.json({
    success: true,
    data: {
      totalEvents,
      totalUsers,
      totalRegistrations,
      eventsByCategory,
      registrationTrend: registrationTrend || [],
      revenueByMonth: revenueByMonth || []
    }
  });
}));

// Get organizer analytics
router.get('/organizer/overview', authenticateToken, requireOrganizer, asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  const [
    totalEvents,
    totalRegistrations,
    totalRevenue,
    upcomingEvents,
    popularEvents
  ] = await Promise.all([
    // Total events organized
    prisma.event.count({
      where: { organizerId: userId }
    }),

    // Total registrations across all events
    prisma.registration.count({
      where: {
        event: {
          organizerId: userId
        },
        status: { in: ['REGISTERED', 'WAITLISTED', 'ATTENDED'] }
      }
    }),

    // Total revenue (simplified calculation)
    prisma.event.aggregate({
      where: { organizerId: userId },
      _sum: { price: true }
    }),

    // Upcoming events
    prisma.event.findMany({
      where: {
        organizerId: userId,
        status: 'PUBLISHED',
        date: { gte: new Date() }
      },
      include: {
        _count: {
          select: {
            registrations: {
              where: {
                status: { in: ['REGISTERED', 'WAITLISTED'] }
              }
            }
          }
        }
      },
      orderBy: { date: 'asc' },
      take: 5
    }),

    // Popular events (by registration count)
    prisma.event.findMany({
      where: { organizerId: userId },
      include: {
        _count: {
          select: {
            registrations: {
              where: {
                status: { in: ['REGISTERED', 'WAITLISTED', 'ATTENDED'] }
              }
            }
          }
        }
      },
      orderBy: {
        registrations: {
          _count: 'desc'
        }
      },
      take: 5
    })
  ]);

  res.json({
    success: true,
    data: {
      totalEvents,
      totalRegistrations,
      totalRevenue: totalRevenue._sum.price || 0,
      upcomingEvents,
      popularEvents
    }
  });
}));

// Track event view
router.post('/track/view', asyncHandler(async (req, res) => {
  const { eventId, userId } = req.body;

  if (!eventId) {
    throw new AppError('Event ID is required', 400);
  }

  await prisma.analytics.create({
    data: {
      eventId: parseInt(eventId),
      userId: userId ? parseInt(userId) : null,
      metric: 'view',
      value: 1,
      metadata: {
        timestamp: new Date().toISOString(),
        userAgent: req.headers['user-agent'],
        ip: req.ip
      }
    }
  });

  res.json({
    success: true,
    message: 'View tracked'
  });
}));

// Track registration
router.post('/track/registration', asyncHandler(async (req, res) => {
  const { eventId, userId, registrationId } = req.body;

  if (!eventId || !userId || !registrationId) {
    throw new AppError('Event ID, User ID, and Registration ID are required', 400);
  }

  await prisma.analytics.create({
    data: {
      eventId: parseInt(eventId),
      userId: parseInt(userId),
      metric: 'registration',
      value: 1,
      metadata: {
        registrationId: parseInt(registrationId),
        timestamp: new Date().toISOString()
      }
    }
  });

  res.json({
    success: true,
    message: 'Registration tracked'
  });
}));

export default router;

