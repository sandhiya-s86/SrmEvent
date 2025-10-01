import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { config } from '../config/config';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SRM Smart Campus Event Hub API',
      version: '1.0.0',
      description: 'A comprehensive API for managing campus events, registrations, and analytics',
      contact: {
        name: 'SRM Event Hub Team',
        email: 'support@srmuniv.ac.in'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.PORT}`,
        description: 'Development server'
      },
      {
        url: 'https://api.srm-event-hub.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            email: { type: 'string', format: 'email', example: 'student@srmuniv.ac.in' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            role: { type: 'string', enum: ['STUDENT', 'ORGANIZER', 'ADMIN'], example: 'STUDENT' },
            studentId: { type: 'string', example: 'RA123456' },
            phoneNumber: { type: 'string', example: '+91 9876543210' },
            profileImage: { type: 'string', example: '/uploads/profile-123.jpg' },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Event: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            title: { type: 'string', example: 'React Horizon: State of the Art' },
            description: { type: 'string', example: 'A hands-on workshop for aspiring frontend developers' },
            categoryId: { type: 'integer', example: 1 },
            venue: { type: 'string', example: 'Dr. T.P. Ganesan Auditorium' },
            date: { type: 'string', format: 'date-time', example: '2024-02-15T14:00:00Z' },
            endDate: { type: 'string', format: 'date-time', example: '2024-02-15T17:00:00Z' },
            capacity: { type: 'integer', example: 500 },
            currentRegistrations: { type: 'integer', example: 150 },
            price: { type: 'number', format: 'float', example: 0 },
            imageUrl: { type: 'string', example: 'https://picsum.photos/seed/react/800/600' },
            status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'], example: 'PUBLISHED' },
            isOutdoor: { type: 'boolean', example: false },
            requirements: { type: 'string', example: 'Laptop required' },
            contactEmail: { type: 'string', format: 'email', example: 'workshop@srmuniv.ac.in' },
            contactPhone: { type: 'string', example: '+91 9876543210' },
            organizerId: { type: 'integer', example: 2 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Registration: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            userId: { type: 'integer', example: 1 },
            eventId: { type: 'integer', example: 1 },
            status: { type: 'string', enum: ['REGISTERED', 'WAITLISTED', 'CANCELLED', 'ATTENDED'], example: 'REGISTERED' },
            registeredAt: { type: 'string', format: 'date-time' },
            qrCode: { type: 'string', example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...' },
            checkInTime: { type: 'string', format: 'date-time' },
            notes: { type: 'string', example: 'Looking forward to learning React!' }
          }
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Technical Workshop' },
            description: { type: 'string', example: 'Hands-on technical learning sessions' },
            icon: { type: 'string', example: '💻' },
            color: { type: 'string', example: '#3B82F6' },
            isActive: { type: 'boolean', example: true }
          }
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            userId: { type: 'integer', example: 1 },
            title: { type: 'string', example: 'Registration Confirmed' },
            message: { type: 'string', example: 'You have successfully registered for the event' },
            type: { type: 'string', enum: ['registration', 'waitlist_promotion', 'event_update', 'reminder', 'system'], example: 'registration' },
            isRead: { type: 'boolean', example: false },
            data: { type: 'object' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error message' },
            error: { type: 'string', example: 'Detailed error information' }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation successful' },
            data: { type: 'object' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.ts', './src/index.ts']
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'SRM Event Hub API Documentation'
  }));
};

export default specs;

