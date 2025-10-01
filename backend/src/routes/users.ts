import express from 'express';
import { PrismaClient } from '@prisma/client';
import { body, param, query, validationResult } from 'express-validator';
import { authenticateToken, requireAdmin, requireOrganizer } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../types';

const router = express.Router();
const prisma = new PrismaClient();

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, role, search } = req.query;

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = parseInt(limit as string);

  const where: any = {};

  if (role) {
    where.role = role;
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search as string, mode: 'insensitive' } },
      { lastName: { contains: search as string, mode: 'insensitive' } },
      { email: { contains: search as string, mode: 'insensitive' } },
      { studentId: { contains: search as string, mode: 'insensitive' } }
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        studentId: true,
        phoneNumber: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            organizedEvents: true,
            registrations: true
          }
        }
      }
    }),
    prisma.user.count({ where })
  ]);

  res.json({
    success: true,
    data: users,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      totalPages: Math.ceil(total / parseInt(limit as string))
    }
  });
}));

// Get user by ID
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id);

  // Check if user can view this profile
  if (req.user!.id !== userId && req.user!.role !== 'ADMIN') {
    throw new AppError('You can only view your own profile', 403);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      studentId: true,
      phoneNumber: true,
      profileImage: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      organizedEvents: {
        select: {
          id: true,
          title: true,
          date: true,
          status: true,
          _count: {
            select: {
              registrations: {
                where: { status: 'REGISTERED' }
              }
            }
          }
        },
        orderBy: { date: 'desc' },
        take: 10
      },
      registrations: {
        select: {
          id: true,
          status: true,
          registeredAt: true,
          event: {
            select: {
              id: true,
              title: true,
              date: true,
              venue: true,
              category: {
                select: {
                  name: true,
                  icon: true
                }
              }
            }
          }
        },
        orderBy: { registeredAt: 'desc' },
        take: 10
      },
      _count: {
        select: {
          organizedEvents: true,
          registrations: true
        }
      }
    }
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    success: true,
    data: user
  });
}));

// Update user (admin only or own profile)
router.put('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id);

  // Check permissions
  if (req.user!.id !== userId && req.user!.role !== 'ADMIN') {
    throw new AppError('You can only update your own profile', 403);
  }

  const { firstName, lastName, phoneNumber, role, isActive } = req.body;

  const updateData: any = {};
  
  if (firstName) updateData.firstName = firstName;
  if (lastName) updateData.lastName = lastName;
  if (phoneNumber) updateData.phoneNumber = phoneNumber;
  
  // Only admin can update role and active status
  if (req.user!.role === 'ADMIN') {
    if (role) updateData.role = role;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      studentId: true,
      phoneNumber: true,
      profileImage: true,
      isActive: true,
      updatedAt: true
    }
  });

  res.json({
    success: true,
    message: 'User updated successfully',
    data: user
  });
}));

// Deactivate user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id);

  if (userId === req.user!.id) {
    throw new AppError('You cannot deactivate your own account', 400);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false }
  });

  res.json({
    success: true,
    message: 'User deactivated successfully'
  });
}));

// Get user statistics
router.get('/:id/stats', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id);

  // Check permissions
  if (req.user!.id !== userId && req.user!.role !== 'ADMIN') {
    throw new AppError('You can only view your own statistics', 403);
  }

  const [
    totalEvents,
    attendedEvents,
    organizedEvents,
    currentRegistrations,
    favoriteCategories
  ] = await Promise.all([
    // Total events registered
    prisma.registration.count({
      where: { userId }
    }),
    
    // Attended events
    prisma.registration.count({
      where: {
        userId,
        status: 'ATTENDED'
      }
    }),
    
    // Events organized
    prisma.event.count({
      where: { organizerId: userId }
    }),
    
    // Current registrations
    prisma.registration.count({
      where: {
        userId,
        status: 'REGISTERED',
        event: {
          date: { gte: new Date() }
        }
      }
    }),
    
    // Favorite categories
    prisma.registration.groupBy({
      by: ['eventId'],
      where: { userId },
      _count: true,
      orderBy: { _count: { eventId: 'desc' } },
      take: 5
    }).then(async (groupedRegistrations) => {
      const eventIds = groupedRegistrations.map(g => g.eventId);
      const events = await prisma.event.findMany({
        where: { id: { in: eventIds } },
        select: {
          category: {
            select: {
              name: true,
              icon: true
            }
          }
        }
      });
      
      const categoryCounts: Record<string, number> = {};
      events.forEach(event => {
        const categoryName = event.category.name;
        categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
      });
      
      return Object.entries(categoryCounts).map(([category, count]) => ({
        category,
        count
      }));
    })
  ]);

  const attendanceRate = totalEvents > 0 ? (attendedEvents / totalEvents) * 100 : 0;

  res.json({
    success: true,
    data: {
      totalEvents,
      attendedEvents,
      organizedEvents,
      currentRegistrations,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      favoriteCategories
    }
  });
}));

// Get user's events (organized)
router.get('/:id/events', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id);

  // Check permissions
  if (req.user!.id !== userId && req.user!.role !== 'ADMIN') {
    throw new AppError('You can only view your own events', 403);
  }

  const { status = 'PUBLISHED', page = 1, limit = 10 } = req.query;

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = parseInt(limit as string);

  const where: any = { organizerId: userId };
  if (status) {
    where.status = status;
  }

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      skip,
      take,
      orderBy: { date: 'desc' },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true
          }
        },
        _count: {
          select: {
            registrations: {
              where: {
                status: { in: ['REGISTERED', 'WAITLISTED'] }
              }
            }
          }
        }
      }
    }),
    prisma.event.count({ where })
  ]);

  res.json({
    success: true,
    data: events,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      totalPages: Math.ceil(total / parseInt(limit as string))
    }
  });
}));

// Get user's registrations
router.get('/:id/registrations', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id);

  // Check permissions
  if (req.user!.id !== userId && req.user!.role !== 'ADMIN') {
    throw new AppError('You can only view your own registrations', 403);
  }

  const { status, page = 1, limit = 10 } = req.query;

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = parseInt(limit as string);

  const where: any = { userId };
  if (status) {
    where.status = status;
  }

  const [registrations, total] = await Promise.all([
    prisma.registration.findMany({
      where,
      skip,
      take,
      orderBy: { registeredAt: 'desc' },
      include: {
        event: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                icon: true,
                color: true
              }
            },
            organizer: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    }),
    prisma.registration.count({ where })
  ]);

  res.json({
    success: true,
    data: registrations,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      totalPages: Math.ceil(total / parseInt(limit as string))
    }
  });
}));

export default router;

