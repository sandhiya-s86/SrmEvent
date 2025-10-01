import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import { config } from '../config/config';
import { UserRole } from '@prisma/client';

export interface JWTPayload {
  userId: number;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}

export const generateToken = (payload: JWTPayload): string => {
  const secret: Secret = config.JWT_SECRET as unknown as Secret;
  const options: SignOptions = { expiresIn: config.JWT_EXPIRES_IN as unknown as any };
  return jwt.sign(payload, secret, options);
};

export const generateRefreshToken = (payload: JWTPayload): string => {
  const secret: Secret = config.JWT_SECRET as unknown as Secret;
  const options: SignOptions = { expiresIn: '30d' as unknown as any };
  return jwt.sign(payload, secret, options);
};

export const verifyToken = (token: string): JWTPayload => {
  const secret: Secret = config.JWT_SECRET as unknown as Secret;
  return jwt.verify(token, secret) as JWTPayload;
};

export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    return null;
  }
};

