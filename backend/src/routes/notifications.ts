import express from 'express';
import { PrismaClient } from '@prisma/client';
import { body, param, query, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../types';

const router = express.Router();
const prisma = new PrismaClient();

// Get user notifications
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { page = 1, limit = 20, unreadOnly } = req.query;

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = parseInt(limit as string);

  const where: any = { userId };
  if (unreadOnly === 'true') {
    where.isRead = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { userId, isRead: false }
    })
  ]);

  res.json({
    success: true,
    data: notifications,
    meta: {
      unreadCount,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string))
      }
    }
  });
}));

// Mark notification as read
router.put('/:id/read', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const notification = await prisma.notification.findFirst({
    where: {
      id: parseInt(id),
      userId
    }
  });

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  await prisma.notification.update({
    where: { id: parseInt(id) },
    data: { isRead: true }
  });

  res.json({
    success: true,
    message: 'Notification marked as read'
  });
}));

// Mark all notifications as read
router.put('/read-all', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  const result = await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false
    },
    data: {
      isRead: true
    }
  });

  res.json({
    success: true,
    message: `${result.count} notifications marked as read`
  });
}));

// Delete notification
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const notification = await prisma.notification.findFirst({
    where: {
      id: parseInt(id),
      userId
    }
  });

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  await prisma.notification.delete({
    where: { id: parseInt(id) }
  });

  res.json({
    success: true,
    message: 'Notification deleted'
  });
}));

// Get unread count
router.get('/unread-count', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  const unreadCount = await prisma.notification.count({
    where: {
      userId,
      isRead: false
    }
  });

  res.json({
    success: true,
    data: { unreadCount }
  });
}));

export default router;

