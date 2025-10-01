import express from 'express';
import { PrismaClient } from '@prisma/client';
import { body, query, param, validationResult } from 'express-validator';
import { authenticateToken, requireOrganizer, requireAdmin, optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../types';
import { EventFilters, SearchParams } from '../types';

const router = express.Router();
const prisma = new PrismaClient();

// Validation middleware
const validateEventCreation = [
  body('title').trim().isLength({ min: 5, max: 200 }),
  body('description').trim().isLength({ min: 20, max: 2000 }),
  body('categoryId').isInt({ min: 1 }),
  body('venue').trim().isLength({ min: 5, max: 200 }),
  body('date').isISO8601(),
  body('endDate').optional().isISO8601(),
  body('capacity').isInt({ min: 1, max: 10000 }),
  body('price').optional().isFloat({ min: 0 }),
  body('imageUrl').optional().isURL(),
  body('isOutdoor').optional().isBoolean(),
  body('requirements').optional().trim().isLength({ max: 1000 }),
  body('contactEmail').optional().isEmail(),
  body('contactPhone').optional().isMobilePhone()
];

const validateEventUpdate = [
  body('title').optional().trim().isLength({ min: 5, max: 200 }),
  body('description').optional().trim().isLength({ min: 20, max: 2000 }),
  body('categoryId').optional().isInt({ min: 1 }),
  body('venue').optional().trim().isLength({ min: 5, max: 200 }),
  body('date').optional().isISO8601(),
  body('endDate').optional().isISO8601(),
  body('capacity').optional().isInt({ min: 1, max: 10000 }),
  body('price').optional().isFloat({ min: 0 }),
  body('imageUrl').optional().isURL(),
  body('isOutdoor').optional().isBoolean(),
  body('requirements').optional().trim().isLength({ max: 1000 }),
  body('contactEmail').optional().isEmail(),
  body('contactPhone').optional().isMobilePhone(),
  body('status').optional().isIn(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'])
];

// Get all events with filtering and pagination
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    categoryId,
    status = 'PUBLISHED',
    isOutdoor,
    minPrice,
    maxPrice,
    startDate,
    endDate,
    search,
    organizerId,
    sortBy = 'date',
    sortOrder = 'asc'
  } = req.query as any;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  // Build where clause
  const where: any = {};

  if (categoryId) where.categoryId = parseInt(categoryId);
  if (status) where.status = status;
  if (typeof isOutdoor === 'string') where.isOutdoor = isOutdoor === 'true';
  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = parseFloat(minPrice);
    if (maxPrice) where.price.lte = parseFloat(maxPrice);
  }
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { venue: { contains: search, mode: 'insensitive' } }
    ];
  }
  if (organizerId) where.organizerId = parseInt(organizerId);

  // Build orderBy clause
  const orderBy: any = {};
  orderBy[sortBy] = sortOrder;

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      skip,
      take,
      orderBy,
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
            id: true,
            firstName: true,
            lastName: true
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

  // Add user's registration status if authenticated
  if (req.user) {
    const userRegistrations = await prisma.registration.findMany({
      where: {
        userId: req.user.id,
        eventId: { in: events.map(e => e.id) }
      },
      select: {
        eventId: true,
        status: true
      }
    });

    const registrationMap = new Map(
      userRegistrations.map(reg => [reg.eventId, reg.status])
    );

    events.forEach(event => {
      (event as any).userRegistrationStatus = registrationMap.get(event.id) || null;
    });
  }

  res.json({
    success: true,
    data: events,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit))
    }
  });
}));

// Get event by ID
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const event = await prisma.event.findUnique({
    where: { id: parseInt(id) },
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
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      registrations: {
        where: {
          status: { in: ['REGISTERED', 'WAITLISTED'] }
        },
        select: {
          id: true,
          userId: true,
          status: true,
          registeredAt: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      }
    }
  });

  if (!event) {
    throw new AppError('Event not found', 404);
  }

  // Add user's registration status if authenticated
  if (req.user) {
    const userRegistration = await prisma.registration.findFirst({
      where: {
        userId: req.user.id,
        eventId: event.id
      },
      select: {
        status: true,
        registeredAt: true
      }
    });

    (event as any).userRegistrationStatus = userRegistration?.status || null;
    (event as any).userRegisteredAt = userRegistration?.registeredAt || null;
  }

  res.json({
    success: true,
    data: event
  });
}));

// Create new event
router.post('/', authenticateToken, requireOrganizer, validateEventCreation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400);
  }

  const eventData = req.body;

  // Validate dates
  const eventDate = new Date(eventData.date);
  const eventEndDate = eventData.endDate ? new Date(eventData.endDate) : null;

  if (eventDate < new Date()) {
    throw new AppError('Event date cannot be in the past', 400);
  }

  if (eventEndDate && eventEndDate <= eventDate) {
    throw new AppError('End date must be after start date', 400);
  }

  const event = await prisma.event.create({
    data: {
      ...eventData,
      organizerId: req.user!.id,
      date: eventDate,
      endDate: eventEndDate
    },
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
          id: true,
          firstName: true,
          lastName: true
        }
      }
    }
  });

  res.status(201).json({
    success: true,
    message: 'Event created successfully',
    data: event
  });
}));

// Update event
router.put('/:id', authenticateToken, validateEventUpdate, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400);
  }

  const { id } = req.params;
  const updateData = req.body;

  // Check if event exists
  const existingEvent = await prisma.event.findUnique({
    where: { id: parseInt(id) }
  });

  if (!existingEvent) {
    throw new AppError('Event not found', 404);
  }

  // Check permissions
  if (req.user!.role !== 'ADMIN' && existingEvent.organizerId !== req.user!.id) {
    throw new AppError('You can only update your own events', 403);
  }

  // Validate dates if provided
  if (updateData.date) {
    const eventDate = new Date(updateData.date);
    if (eventDate < new Date()) {
      throw new AppError('Event date cannot be in the past', 400);
    }
  }

  if (updateData.endDate) {
    const eventEndDate = new Date(updateData.endDate);
    const eventDate = new Date(updateData.date || existingEvent.date);
    if (eventEndDate <= eventDate) {
      throw new AppError('End date must be after start date', 400);
    }
  }

  const event = await prisma.event.update({
    where: { id: parseInt(id) },
    data: updateData,
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
          id: true,
          firstName: true,
          lastName: true
        }
      }
    }
  });

  res.json({
    success: true,
    message: 'Event updated successfully',
    data: event
  });
}));

// Delete event
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const event = await prisma.event.findUnique({
    where: { id: parseInt(id) },
    include: {
      registrations: true
    }
  });

  if (!event) {
    throw new AppError('Event not found', 404);
  }

  // Check permissions
  if (req.user!.role !== 'ADMIN' && event.organizerId !== req.user!.id) {
    throw new AppError('You can only delete your own events', 403);
  }

  // Check if event has registrations
  if (event.registrations.length > 0) {
    throw new AppError('Cannot delete event with existing registrations. Cancel the event instead.', 400);
  }

  await prisma.event.delete({
    where: { id: parseInt(id) }
  });

  res.json({
    success: true,
    message: 'Event deleted successfully'
  });
}));

// Get event categories
router.get('/categories/list', asyncHandler(async (req, res) => {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      description: true,
      icon: true,
      color: true
    },
    orderBy: { name: 'asc' }
  });

  res.json({
    success: true,
    data: categories
  });
}));

// Get popular events
router.get('/popular/list', asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const popularEvents = await prisma.event.findMany({
    where: {
      status: 'PUBLISHED',
      date: { gte: new Date() }
    },
    take: parseInt(limit as string),
    orderBy: {
      currentRegistrations: 'desc'
    },
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
          id: true,
          firstName: true,
          lastName: true
        }
      }
    }
  });

  res.json({
    success: true,
    data: popularEvents
  });
}));

// Get events by organizer
router.get('/organizer/:organizerId', optionalAuth, asyncHandler(async (req, res) => {
  const { organizerId } = req.params;
  const { status = 'PUBLISHED' } = req.query;

  const events = await prisma.event.findMany({
    where: {
      organizerId: parseInt(organizerId),
      status: status as any
    },
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
          id: true,
          firstName: true,
          lastName: true
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
    },
    orderBy: { date: 'asc' }
  });

  res.json({
    success: true,
    data: events
  });
}));

export default router;

