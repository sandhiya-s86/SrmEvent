import { Request } from 'express';
import { UserRole, EventStatus, RegistrationStatus } from '@prisma/client';

// Extend Express Request to include user data
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: UserRole;
    firstName: string;
    lastName: string;
  };
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Event Types
export interface CreateEventRequest {
  title: string;
  description: string;
  categoryId: number;
  venue: string;
  date: string;
  endDate?: string;
  capacity: number;
  price?: number;
  imageUrl?: string;
  isOutdoor?: boolean;
  requirements?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface UpdateEventRequest extends Partial<CreateEventRequest> {
  status?: EventStatus;
}

export interface EventFilters {
  categoryId?: number;
  status?: EventStatus;
  isOutdoor?: boolean;
  minPrice?: number;
  maxPrice?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  organizerId?: number;
}

// Registration Types
export interface RegisterEventRequest {
  eventId: number;
  notes?: string;
  promoCode?: string;
}

export interface ConflictDetectionResult {
  hasConflict: boolean;
  conflictingEvents: Array<{
    id: number;
    title: string;
    date: string;
    venue: string;
    travelTimeMinutes: number;
  }>;
  suggestedAlternatives: Array<{
    id: number;
    title: string;
    date: string;
    similarity: number;
  }>;
}

// Analytics Types
export interface EventAnalytics {
  eventId: number;
  totalRegistrations: number;
  totalRevenue: number;
  registrationTrend: Array<{
    date: string;
    count: number;
  }>;
  demographics: {
    byRole: Record<string, number>;
    byDepartment?: Record<string, number>;
  };
  popularTimeSlots: Array<{
    hour: number;
    count: number;
  }>;
  cancellationRate: number;
  attendanceRate: number;
}

export interface UserAnalytics {
  userId: number;
  totalEventsRegistered: number;
  totalEventsAttended: number;
  favoriteCategories: Array<{
    category: string;
    count: number;
  }>;
  averageRating?: number;
  totalSpent: number;
}

// Notification Types
export interface CreateNotificationRequest {
  title: string;
  message: string;
  type: 'registration' | 'waitlist_promotion' | 'event_update' | 'reminder' | 'system';
  userId?: number;
  eventId?: number;
  data?: any;
}

// Search and Filter Types
export interface SearchParams {
  query?: string;
  category?: string;
  venue?: string;
  dateFrom?: string;
  dateTo?: string;
  priceMin?: number;
  priceMax?: number;
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'title' | 'price' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}

// Dynamic Pricing Types
export interface DynamicPricingConfig {
  eventId: number;
  basePrice: number;
  earlyBirdDiscount?: {
    percentage: number;
    validUntil: Date;
  };
  groupDiscount?: {
    minGroupSize: number;
    percentage: number;
  };
  demandMultiplier?: {
    thresholds: Array<{
      registrationPercentage: number;
      multiplier: number;
    }>;
  };
  timeBasedPricing?: Array<{
    daysBeforeEvent: number;
    priceMultiplier: number;
  }>;
}

// Weather Integration Types
export interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  icon: string;
}

// QR Code Types
export interface QRCodeData {
  registrationId: number;
  userId: number;
  eventId: number;
  checkInCode: string;
  generatedAt: Date;
}

// WebSocket Event Types
export interface SocketEventData {
  type: 'registration_update' | 'waitlist_promotion' | 'event_update' | 'notification';
  userId?: number;
  eventId?: number;
  data: any;
}

// Email Types
export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailData {
  to: string;
  template: EmailTemplate;
  variables?: Record<string, any>;
}

// File Upload Types
export interface FileUploadResult {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  url: string;
}

// Pagination Types
export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

// Error Types
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Validation Types
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Cache Types
export interface CacheConfig {
  ttl: number; // Time to live in seconds
  key: string;
}

// Rate Limiting Types
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

// Database Transaction Types
export interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
}

