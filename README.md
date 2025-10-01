# SRM Smart Campus Event Hub

A full-stack event management system for SRM University with React frontend and Node.js backend.

## Project Structure

```
srm-smart-campus-event-hub/
├── src/                    # Frontend source (React app)
│   ├── main.tsx           # Entry point
│   ├── index.html         # HTML template
│   └── index.css          # Global styles
├── components/            # React components
├── pages/                 # Page components
├── hooks/                 # Custom React hooks
├── public/                # Static assets
│   ├── favicon.svg
│   ├── host.html          # Static HTML page
│   ├── images/            # Image assets
│   ├── docs/              # Document assets
│   └── media/             # Media assets
├── backend/               # Backend server
│   ├── src/               # Backend source
│   ├── prisma/            # Database schema
│   └── package.json
├── index.html             # Main HTML entry
├── index.css              # Global styles
├── App.tsx                # Main React component
├── types.ts               # TypeScript types
├── constants.ts           # App constants
├── api.ts                 # API functions
├── start.bat              # Windows startup script
└── package.json           # Frontend dependencies
```

## Quick Start

### Option 1: Use the startup script (Windows)
```bash
# Double-click start.bat or run:
start.bat
```

### Option 2: Manual startup

1. **Start Backend:**
```bash
cd backend
npm install
npm start
```

2. **Start Frontend (in new terminal):**
```bash
npm install
npm run dev
```

## Access Points

- **Frontend App:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **Static Page:** http://localhost:3000/host.html
- **API Docs:** http://localhost:3001/api-docs

## Features

- Event browsing and registration
- User authentication (Student/Organizer/Admin roles)
- Event management for organizers
- Admin dashboard
- Real-time notifications
- Conflict detection
- Waitlist management
- QR code generation
- Dark/Light theme

## Tech Stack

**Frontend:**
- React 19
- TypeScript
- Vite
- Tailwind CSS

**Backend:**
- Node.js
- Express
- Prisma (Database ORM)
- JWT Authentication
- WebSocket support

## Development

The frontend proxies API calls to the backend automatically. Both servers need to be running for full functionality.

For production deployment, build the frontend and serve it with the backend.