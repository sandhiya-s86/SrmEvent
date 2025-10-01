// Simple startup script for development
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting SRM Event Hub Backend...\n');

// Check if .env exists, if not create a basic one
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file...');
  const envContent = `# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/srm_event_hub"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# Server
PORT=3001
NODE_ENV="development"

# Frontend URL
FRONTEND_URL="http://localhost:5173"

# File Upload
UPLOAD_PATH="./uploads"
MAX_FILE_SIZE=5242880

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# QR Code
QR_CODE_BASE_URL="http://localhost:3001/qr"
`;
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created\n');
}

// Install dependencies if node_modules doesn't exist
if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
  console.log('📦 Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed\n');
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
  }
}

// Generate Prisma client
console.log('🔧 Generating Prisma client...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma client generated\n');
} catch (error) {
  console.log('⚠️  Prisma generate failed (database might not be set up yet)\n');
}

// Start the development server
console.log('🎯 Starting development server...');
try {
  execSync('npm run dev', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
}

