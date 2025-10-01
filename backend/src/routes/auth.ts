import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { generateToken, JWTPayload } from '../utils/jwt';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../types';

const router = express.Router();
const prisma = new PrismaClient();

// Validation middleware
const validateRegistration = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 2 }),
  body('lastName').trim().isLength({ min: 2 }),
  body('studentId').optional().trim(),
  body('phoneNumber').optional().isMobilePhone('any')
];

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

// Register new user
router.post('/register', validateRegistration, asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400);
  }

  const { email, password, firstName, lastName, studentId, phoneNumber } = req.body;

  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        ...(studentId ? [{ studentId }] : [])
      ]
    }
  });

  if (existingUser) {
    throw new AppError('User with this email or student ID already exists', 400);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      studentId,
      phoneNumber,
      role: 'STUDENT'
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      studentId: true,
      phoneNumber: true,
      createdAt: true
    }
  });

  // Generate token
  const tokenPayload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName
  };

  const token = generateToken(tokenPayload);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user,
      token
    }
  });
}));

// Login user
router.post('/login', validateLogin, asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400);
  }

  const { email, password } = req.body;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user || !user.isActive) {
    throw new AppError('Invalid credentials', 401);
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401);
  }

  // Generate token
  const tokenPayload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName
  };

  const token = generateToken(tokenPayload);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        studentId: user.studentId,
        phoneNumber: user.phoneNumber
      },
      token
    }
  });
}));

// Get current user profile
router.get('/me', asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new AppError('Access token required', 401);
  }

  const { verifyToken } = await import('../utils/jwt');
  const decoded = verifyToken(token);

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
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
      updatedAt: true
    }
  });

  if (!user || !user.isActive) {
    throw new AppError('User not found', 404);
  }

  res.json({
    success: true,
    data: { user }
  });
}));

// Update user profile
router.put('/profile', asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new AppError('Access token required', 401);
  }

  const { verifyToken } = await import('../utils/jwt');
  const decoded = verifyToken(token);

  const { firstName, lastName, phoneNumber } = req.body;

  const user = await prisma.user.update({
    where: { id: decoded.userId },
    data: {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(phoneNumber && { phoneNumber })
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      studentId: true,
      phoneNumber: true,
      profileImage: true,
      updatedAt: true
    }
  });

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user }
  });
}));

// Change password
router.put('/change-password', asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new AppError('Access token required', 401);
  }

  const { verifyToken } = await import('../utils/jwt');
  const decoded = verifyToken(token);

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError('Current password and new password are required', 400);
  }

  if (newPassword.length < 6) {
    throw new AppError('New password must be at least 6 characters long', 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId }
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isCurrentPasswordValid) {
    throw new AppError('Current password is incorrect', 400);
  }

  const hashedNewPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: decoded.userId },
    data: { password: hashedNewPassword }
  });

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
}));

// Request password reset
router.post('/forgot-password', asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError('Email is required', 400);
  }

  const user = await prisma.user.findUnique({
    where: { email }
  });

  // Always return success to prevent email enumeration
  if (!user) {
    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent'
    });
    return;
  }

  // Generate reset token (in a real app, you'd send this via email)
  const resetToken = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName
  });

  // TODO: Send email with reset link
  console.log(`Password reset token for ${email}: ${resetToken}`);

  res.json({
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent'
  });
}));

// Reset password
router.post('/reset-password', asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throw new AppError('Reset token and new password are required', 400);
  }

  if (newPassword.length < 6) {
    throw new AppError('New password must be at least 6 characters long', 400);
  }

  try {
    const { verifyToken } = await import('../utils/jwt');
    const decoded = verifyToken(token);

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: decoded.userId },
      data: { password: hashedPassword }
    });

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    throw new AppError('Invalid or expired reset token', 400);
  }
}));

export default router;

