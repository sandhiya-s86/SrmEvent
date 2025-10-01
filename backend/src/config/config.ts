import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server Configuration
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/srm_event_hub',
  
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // Email Configuration
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  
  // File Upload
  UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  
  // External APIs
  WEATHER_API_KEY: process.env.WEATHER_API_KEY || '',
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || '',
  
  // Frontend URL
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  // QR Code
  QR_CODE_BASE_URL: process.env.QR_CODE_BASE_URL || 'https://your-domain.com/qr',
  
  // Security
  BCRYPT_ROUNDS: 12,
  SESSION_SECRET: process.env.SESSION_SECRET || 'your-session-secret',
  
  // Redis (for caching and sessions)
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Feature Flags
  FEATURES: {
    EMAIL_NOTIFICATIONS: process.env.EMAIL_NOTIFICATIONS === 'true',
    WEATHER_INTEGRATION: process.env.WEATHER_INTEGRATION === 'true',
    DYNAMIC_PRICING: process.env.DYNAMIC_PRICING === 'true',
    ANALYTICS_TRACKING: process.env.ANALYTICS_TRACKING === 'true'
  },
  
  // Event Configuration
  EVENT_CONFIG: {
    MAX_CAPACITY: 10000,
    MIN_CAPACITY: 1,
    MAX_PRICE: 10000,
    MIN_PRICE: 0,
    DEFAULT_WAITLIST_SIZE: 100,
    REGISTRATION_DEADLINE_HOURS: 24
  },
  
  // Notification Configuration
  NOTIFICATION_CONFIG: {
    EMAIL_TEMPLATES_PATH: './src/templates/email',
    PUSH_NOTIFICATION_ENABLED: false,
    SMS_ENABLED: false
  }
};

// Validation
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`⚠️  Warning: ${envVar} is not set. Using default value.`);
  }
}

export default config;

