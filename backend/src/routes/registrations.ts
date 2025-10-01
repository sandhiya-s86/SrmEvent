import express from 'express';
import { PrismaClient } from '@prisma/client';
import { body, param, query, validationResult } from 'express-validator';
import { authenticateToken, requireStudent } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../types';
import QRCode from 'qrcode';
import { config } from '../config/config';

const router = express.Router();
const prisma = new PrismaClient();

// Validation middleware
const validateRegistration = [
  body('eventId').isInt({ min: 1 }),
  body('notes').optional().trim().isLength({ max: 500 }),
  body('promoCode').optional().trim().isLength({ max: 50 })
];

// Conflict detection service
async function detectConflicts(userId: number, eventId: number): Promise<any> {
  const targetEvent = await prisma.event.findUnique({
    where: { id: eventId }
  });

  if (!targetEvent) {
    throw new AppError('Event not found', 404);
  }

  // Get user's registered events that overlap in time
  const conflictingRegistrations = await prisma.registration.findMany({
    where: {
      userId,
      status: 'REGISTERED',
      event: {
        date: {
          lt: new Date(targetEvent.endDate || new Date(targetEvent.date.getTime() + 2 * 60 * 60 * 1000))
        },
        endDate: {
          gt: targetEvent.date
        }
      }
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          date: true,
          endDate: true,
          venue: true
        }
      }
    }
  });

  const conflicts = conflictingRegistrations.map(reg => {
    const travelTimeMinutes = calculateTravelTime(reg.event.venue, targetEvent.venue);
    return {
      id: reg.event.id,
      title: reg.event.title,
      date: reg.event.date,
      venue: reg.event.venue,
      travelTimeMinutes
    };
  });

  // Get suggested alternative events
  const suggestedAlternatives = await prisma.event.findMany({
    where: {
      id: { not: eventId },
      categoryId: targetEvent.categoryId,
      status: 'PUBLISHED',
      date: { gte: new Date() },
      capacity: { gt: prisma.registration.count({
        where: {
          eventId: { in: [] }, // This would need to be calculated properly
          status: 'REGISTERED'
        }
      }) }
    },
    take: 5,
    include: {
      category: true
    }
  });

  const suggestions = suggestedAlternatives.map(event => ({
    id: event.id,
    title: event.title,
    date: event.date,
    similarity: calculateSimilarity(targetEvent, event)
  }));

  return {
    hasConflict: conflicts.length > 0,
    conflictingEvents: conflicts,
    suggestedAlternatives: suggestions.sort((a, b) => b.similarity - a.similarity)
  };
}

// Helper function to calculate travel time (mock implementation)
function calculateTravelTime(venue1: string, venue2: string): number {
  // In a real implementation, this would use Google Maps API
  // For now, return a mock travel time based on venue names
  if (venue1 === venue2) return 0;
  
  const venueDistanceMap: Record<string, number> = {
    'Dr. T.P. Ganesan Auditorium': 0,
    'Tech Park': 5,
    'Main Campus Grounds': 10,
    'UB Auditorium Complex': 8,
    'Mini Hall 1': 3,
    'SRM Cricket Ground': 15,
    'Football Ground': 12
  };

  const distance1 = venueDistanceMap[venue1] || 5;
  const distance2 = venueDistanceMap[venue2] || 5;
  
  return Math.abs(distance1 - distance2) + Math.random() * 5;
}

// Helper function to calculate event similarity
function calculateSimilarity(event1: any, event2: any): number {
  let similarity = 0;
  
  // Category similarity (40% weight)
  if (event1.categoryId === event2.categoryId) {
    similarity += 40;
  }
  
  // Time similarity (30% weight)
  const timeDiff = Math.abs(event1.date.getTime() - event2.date.getTime());
  const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
  if (daysDiff <= 7) similarity += 30;
  else if (daysDiff <= 30) similarity += 15;
  
  // Price similarity (20% weight)
  const priceDiff = Math.abs(event1.price - event2.price);
  if (priceDiff === 0) similarity += 20;
  else if (priceDiff <= 10) similarity += 10;
  
  // Capacity similarity (10% weight)
  const capacityDiff = Math.abs(event1.capacity - event2.capacity);
  if (capacityDiff <= 100) similarity += 10;
  
  return Math.min(similarity, 100);
}

// Register for event
router.post('/register', authenticateToken, requireStudent, validateRegistration, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400);
  }

  const { eventId, notes, promoCode } = req.body;
  const userId = req.user!.id;

  // Check if event exists and is published
  const event = await prisma.event.findUnique({
    where: { id: eventId }
  });

  if (!event) {
    throw new AppError('Event not found', 404);
  }

  if (event.status !== 'PUBLISHED') {
    throw new AppError('Event is not available for registration', 400);
  }

  if (event.date < new Date()) {
    throw new AppError('Cannot register for past events', 400);
  }

  // Check if user is already registered
  const existingRegistration = await prisma.registration.findUnique({
    where: {
      userId_eventId: {
        userId,
        eventId
      }
    }
  });

  if (existingRegistration) {
    throw new AppError('You are already registered for this event', 400);
  }

  // Detect conflicts
  const conflictResult = await detectConflicts(userId, eventId);

  // If there are conflicts, return conflict information
  if (conflictResult.hasConflict) {
    res.status(409).json({
      success: false,
      message: 'Registration conflicts detected',
      data: conflictResult
    });
    return;
  }

  // Apply promo code if provided
  let finalPrice = event.price;
  if (promoCode) {
    const promo = await prisma.promoCode.findUnique({
      where: { code: promoCode }
    });

    if (promo && promo.isActive && promo.currentUses < (promo.maxUses || Infinity)) {
      if (promo.validFrom <= new Date() && promo.validUntil >= new Date()) {
        if (promo.discountType === 'percentage') {
          finalPrice = event.price * (1 - promo.discountValue / 100);
        } else if (promo.discountType === 'fixed') {
          finalPrice = Math.max(0, event.price - promo.discountValue);
        }
        
        // Update promo code usage
        await prisma.promoCode.update({
          where: { id: promo.id },
          data: { currentUses: promo.currentUses + 1 }
        });
      }
    }
  }

  // Check capacity and determine registration status
  const currentRegistrations = await prisma.registration.count({
    where: {
      eventId,
      status: 'REGISTERED'
    }
  });

  let registrationStatus = 'REGISTERED';
  if (currentRegistrations >= event.capacity) {
    registrationStatus = 'WAITLISTED';
  }

  // Create registration
  const registration = await prisma.registration.create({
    data: {
      userId,
      eventId,
      status: registrationStatus as any,
      notes
    },
    include: {
      event: {
        include: {
          category: true
        }
      },
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true
        }
      }
    }
  });

  // Generate QR code
  const qrCodeData = {
    registrationId: registration.id,
    userId,
    eventId,
    checkInCode: Math.random().toString(36).substring(2, 15)
  };

  const qrCodeString = await QRCode.toDataURL(JSON.stringify(qrCodeData));

  // Update registration with QR code
  await prisma.registration.update({
    where: { id: registration.id },
    data: { qrCode: qrCodeString }
  });

  // Update event registration count
  await prisma.event.update({
    where: { id: eventId },
    data: {
      currentRegistrations: currentRegistrations + 1
    }
  });

  res.status(201).json({
    success: true,
    message: `Successfully ${registrationStatus.toLowerCase()} for event`,
    data: {
      registration: {
        ...registration,
        qrCode: qrCodeString
      },
      finalPrice,
      conflictResult
    }
  });
}));

// Force register (bypass conflicts)
router.post('/force-register', authenticateToken, requireStudent, asyncHandler(async (req, res) => {
  const { eventId, conflictingEventIds, notes, promoCode } = req.body;
  const userId = req.user!.id;

  if (!Array.isArray(conflictingEventIds) || conflictingEventIds.length === 0) {
    throw new AppError('Conflicting event IDs are required', 400);
  }

  // Start transaction
  const result = await prisma.$transaction(async (tx) => {
    // Unregister from conflicting events
    await tx.registration.updateMany({
      where: {
        userId,
        eventId: { in: conflictingEventIds },
        status: 'REGISTERED'
      },
      data: { status: 'CANCELLED' }
    });

    // Update event registration counts
    for (const conflictEventId of conflictingEventIds) {
      await tx.event.update({
        where: { id: conflictEventId },
        data: {
          currentRegistrations: {
            decrement: 1
          }
        }
      });
    }

    // Register for new event
    const registration = await tx.registration.create({
      data: {
        userId,
        eventId,
        status: 'REGISTERED',
        notes
      },
      include: {
        event: {
          include: {
            category: true
          }
        }
      }
    });

    // Update new event registration count
    await tx.event.update({
      where: { id: eventId },
      data: {
        currentRegistrations: {
          increment: 1
        }
      }
    });

    return registration;
  });

  // Generate QR code
  const qrCodeData = {
    registrationId: result.id,
    userId,
    eventId,
    checkInCode: Math.random().toString(36).substring(2, 15)
  };

  const qrCodeString = await QRCode.toDataURL(JSON.stringify(qrCodeData));

  // Update registration with QR code
  await prisma.registration.update({
    where: { id: result.id },
    data: { qrCode: qrCodeString }
  });

  res.status(201).json({
    success: true,
    message: 'Successfully registered for event (conflicts resolved)',
    data: {
      registration: {
        ...result,
        qrCode: qrCodeString
      }
    }
  });
}));

// Cancel registration
router.delete('/:registrationId', authenticateToken, asyncHandler(async (req, res) => {
  const { registrationId } = req.params;
  const userId = req.user!.id;

  const registration = await prisma.registration.findFirst({
    where: {
      id: parseInt(registrationId),
      userId
    },
    include: {
      event: true
    }
  });

  if (!registration) {
    throw new AppError('Registration not found', 404);
  }

  if (registration.status === 'CANCELLED') {
    throw new AppError('Registration is already cancelled', 400);
  }

  if (registration.event.date < new Date()) {
    throw new AppError('Cannot cancel registration for past events', 400);
  }

  // Start transaction
  await prisma.$transaction(async (tx) => {
    // Cancel registration
    await tx.registration.update({
      where: { id: parseInt(registrationId) },
      data: { status: 'CANCELLED' }
    });

    // Update event registration count
    await tx.event.update({
      where: { id: registration.eventId },
      data: {
        currentRegistrations: {
          decrement: 1
        }
      }
    });

    // Check if there are waitlisted users to promote
    const nextWaitlisted = await tx.registration.findFirst({
      where: {
        eventId: registration.eventId,
        status: 'WAITLISTED'
      },
      orderBy: { registeredAt: 'asc' }
    });

    if (nextWaitlisted) {
      // Promote waitlisted user
      await tx.registration.update({
        where: { id: nextWaitlisted.id },
        data: { status: 'REGISTERED' }
      });

      // Create notification for promoted user
      await tx.notification.create({
        data: {
          userId: nextWaitlisted.userId,
          title: 'Waitlist Promotion',
          message: `You've been promoted from the waitlist for "${registration.event.title}"`,
          type: 'waitlist_promotion',
          data: {
            eventId: registration.eventId,
            eventTitle: registration.event.title
          }
        }
      });
    }
  });

  res.json({
    success: true,
    message: 'Registration cancelled successfully'
  });
}));

// Get user's registrations
router.get('/my-registrations', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
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

// Check-in for event
router.post('/:registrationId/checkin', authenticateToken, asyncHandler(async (req, res) => {
  const { registrationId } = req.params;
  const userId = req.user!.id;

  const registration = await prisma.registration.findFirst({
    where: {
      id: parseInt(registrationId),
      userId
    },
    include: {
      event: true
    }
  });

  if (!registration) {
    throw new AppError('Registration not found', 404);
  }

  if (registration.status !== 'REGISTERED') {
    throw new AppError('Only registered users can check in', 400);
  }

  if (registration.checkInTime) {
    throw new AppError('Already checked in', 400);
  }

  if (registration.event.date > new Date()) {
    throw new AppError('Cannot check in before event starts', 400);
  }

  await prisma.registration.update({
    where: { id: parseInt(registrationId) },
    data: {
      status: 'ATTENDED',
      checkInTime: new Date()
    }
  });

  res.json({
    success: true,
    message: 'Successfully checked in',
    data: {
      checkInTime: new Date()
    }
  });
}));

// Get event registrations (for organizers)
router.get('/event/:eventId', authenticateToken, asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { status, page = 1, limit = 50 } = req.query;

  // Check if user can view registrations for this event
  const event = await prisma.event.findUnique({
    where: { id: parseInt(eventId) }
  });

  if (!event) {
    throw new AppError('Event not found', 404);
  }

  if (req.user!.role !== 'ADMIN' && event.organizerId !== req.user!.id) {
    throw new AppError('You can only view registrations for your own events', 403);
  }

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = parseInt(limit as string);

  const where: any = { eventId: parseInt(eventId) };
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
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            studentId: true,
            phoneNumber: true
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

