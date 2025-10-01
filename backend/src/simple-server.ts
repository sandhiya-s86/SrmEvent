import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, { cors: { origin: true, credentials: true } });
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// Swagger (simple, minimal spec)
const swaggerSpec = {
  openapi: '3.0.0',
  info: { title: 'SRM Event Hub Simple API', version: '1.0.0' },
  paths: {
    '/api/events': { get: { summary: 'List events' } },
    '/api/registrations/register': { post: { summary: 'Register for event' } },
    '/api/registrations/my-registrations': { get: { summary: 'List my registrations' } },
    '/api/registrations/{id}': { delete: { summary: 'Cancel registration', parameters: [{ name: 'id', in: 'path', required: true }] } },
    '/api/registrations/{id}/checkin': { post: { summary: 'Check-in', parameters: [{ name: 'id', in: 'path', required: true }] } },
    '/api/admin/events/{id}/approve': { post: { summary: 'Approve event', parameters: [{ name: 'id', in: 'path', required: true }] } },
    '/api/admin/events/{id}/reject': { post: { summary: 'Reject event', parameters: [{ name: 'id', in: 'path', required: true }] } },
    '/api/events/{id}/price': { get: { summary: 'Dynamic price', parameters: [{ name: 'id', in: 'path', required: true }] } }
  }
} as any;
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// In-memory events with status for admin approvals
type SimpleEvent = {
  id: number; title: string; description: string; venue: string; date: string;
  capacity: number; currentRegistrations: number; price: number; category: string;
  organizer: string; status: 'PUBLISHED' | 'PENDING' | 'REJECTED';
};

const simpleEvents: SimpleEvent[] = [
  {
    id: 1, title: 'React Workshop', description: 'Learn React basics', venue: 'Tech Park',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), capacity: 100,
    currentRegistrations: 50, price: 0, category: 'Technical Workshop', organizer: 'SRM ACM Chapter', status: 'PUBLISHED'
  },
  {
    id: 2, title: 'Cultural Event', description: 'Annual cultural festival', venue: 'Main Grounds',
    date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), capacity: 1000,
    currentRegistrations: 200, price: 10, category: 'Cultural Event', organizer: 'Student Affairs', status: 'PENDING'
  }
];

// List events (published + pending for simplicity)
app.get('/api/events', (req, res) => {
  res.json({ success: true, data: simpleEvents });
});

// Dynamic pricing example endpoint
app.get('/api/events/:id/price', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const ev = simpleEvents.find(e => e.id === id);
  if (!ev) return res.status(404).json({ success: false, message: 'Event not found' });
  // Base demand factor: higher currentRegistrations → higher price
  const demand = ev.currentRegistrations / Math.max(ev.capacity, 1);
  const timeToEventDays = Math.max(0, (new Date(ev.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  // Early bird: if > 14 days, 20% off; if 7-14 days, 10% off
  let price = ev.price;
  if (price > 0) {
    if (timeToEventDays > 14) price = price * 0.8;
    else if (timeToEventDays > 7) price = price * 0.9;
    // Demand surge: if > 70% full, +15%
    if (demand > 0.7) price = price * 1.15;
  }
  res.json({ success: true, data: { price: Math.round(price * 100) / 100 } });
});

app.get('/api/events/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const ev = simpleEvents.find(e => e.id === id);
  if (!ev) return res.status(404).json({ success: false, message: 'Event not found' });
  res.json({ success: true, data: ev });
});

// Admin approve event
app.post('/api/admin/events/:id/approve', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const ev = simpleEvents.find(e => e.id === id);
  if (!ev) return res.status(404).json({ success: false, message: 'Event not found' });
  ev.status = 'PUBLISHED';
  return res.json({ success: true, message: 'Approved', data: ev });
});

// Admin reject event
app.post('/api/admin/events/:id/reject', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const ev = simpleEvents.find(e => e.id === id);
  if (!ev) return res.status(404).json({ success: false, message: 'Event not found' });
  ev.status = 'REJECTED';
  return res.json({ success: true, message: 'Rejected', data: ev });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'student@srmuniv.ac.in' && password === 'password123') {
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: 1,
          email: 'student@srmuniv.ac.in',
          firstName: 'John',
          lastName: 'Doe',
          role: 'STUDENT',
          studentId: 'RA123456'
        },
        token: 'mock-jwt-token-123'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  
  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: 2,
        email,
        firstName,
        lastName,
        role: 'STUDENT',
        studentId: 'RA123457'
      },
      token: 'mock-jwt-token-456'
    }
  });
});

app.post('/api/registrations/register', (req, res) => {
  const { eventId } = req.body;
  
  res.status(201).json({
    success: true,
    message: 'Successfully registered for event',
    data: {
      registration: {
        id: 1,
        userId: 1,
        eventId: parseInt(eventId),
        status: 'REGISTERED',
        registeredAt: new Date().toISOString(),
        qrCode: 'data:image/png;base64,mock-qr-code'
      }
    }
  });
  io.emit('registration_updated', { eventId: parseInt(eventId, 10), timestamp: Date.now() });
});

// In-memory registrations for demo
const registrations: any[] = [
  {
    id: 101,
    userId: 1,
    eventId: 1,
    status: 'REGISTERED',
    registeredAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    event: {
      id: 1,
      title: 'React Workshop',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      venue: 'Tech Park'
    }
  }
];

// Mock email notification
app.post('/api/notifications/email', (req, res) => {
  const { to, subject } = req.body || {};
  console.log(`[EMAIL] → to=${to} | subject=${subject}`);
  res.json({ success: true, message: 'Email queued (mock)' });
});

// List current user's registrations
app.get('/api/registrations/my-registrations', (req, res) => {
  res.json({ success: true, data: registrations });
});

// Cancel registration
app.delete('/api/registrations/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = registrations.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Registration not found' });
  registrations[idx].status = 'CANCELLED';
  return res.json({ success: true, message: 'Registration cancelled' });
});

// Check-in
app.post('/api/registrations/:id/checkin', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const reg = registrations.find(r => r.id === id);
  if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });
  if (reg.status !== 'REGISTERED') return res.status(400).json({ success: false, message: 'Not eligible for check-in' });
  reg.status = 'ATTENDED';
  reg.checkInTime = new Date().toISOString();
  return res.json({ success: true, message: 'Checked in', data: { checkInTime: reg.checkInTime } });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!'
  });
});

server.listen(PORT, () => {
  console.log(`🚀 SRM Event Hub Backend running on port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API endpoints: http://localhost:${PORT}/api/`);
  console.log(`📖 Swagger: http://localhost:${PORT}/api-docs`);
  console.log(`🎯 Test login: student@srmuniv.ac.in / password123`);
});

// Export app for testing
export { app };
