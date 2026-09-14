// ==============================================================================
// EXPRESS SERVER ENTRYPOINT (backend/src/server.js)
// ==============================================================================
// HOW CLERK AUTHENTICATION FITS IN:
// 1. React user signs in -> Clerk provides JWT token.
// 2. React fetch() sends -> "Authorization: Bearer <token>"
// 3. Clerk middleware (@clerk/express) verifies token using CLERK_SECRET_KEY.
// 4. Our auth middleware extracts `req.userId` and secures all SQL queries.
// ==============================================================================

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { clerkMiddleware } = require('@clerk/express');
const { testConnection } = require('./db');

// 1. Load environment variables
dotenv.config();

// 2. Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// ==============================================================================
// MIDDLEWARE
// ==============================================================================

// CORS: Allow frontend on localhost:5173 to send requests with Authorization headers
app.use(cors({
  origin: true,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// JSON Parser
app.use(express.json());

// Clerk Middleware: Parses and cryptographically validates Clerk session JWTs
console.log('🔒 Clerk Authentication: ACTIVE (verifying requests via CLERK_SECRET_KEY)');
app.use(clerkMiddleware());

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ==============================================================================
// API ROUTES
// ==============================================================================
const habitRoutes = require('./routes/habits');
const relapseRoutes = require('./routes/relapses');

// Health Check endpoint
app.get('/api/health', async (req, res) => {
  res.json({
    status: 'ok',
    message: 'Addiction Tracker Backend is running with Clerk authentication!',
    clerk_enabled: true,
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
app.use('/api/habits', habitRoutes);
app.use('/api', relapseRoutes);

// In production (Render deployment), serve the React frontend static build
const path = require('path');
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // 404 Handler for development API calls
  app.use((req, res) => {
    res.status(404).json({
      error: `Route not found: ${req.method} ${req.originalUrl}`,
    });
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'An internal server error occurred.',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ==============================================================================
// START SERVER
// ==============================================================================
const startServer = async () => {
  console.log('\n🚀 Starting Addiction Tracker Backend with Clerk Auth...');

  const dbConnected = await testConnection();

  if (!dbConnected) {
    console.warn('⚠️  Warning: Database connection failed. Please ensure PostgreSQL Docker container is running:');
    console.warn('   docker compose up -d\n');
  }

  app.listen(PORT, () => {
    console.log(`📡 Backend API listening on http://localhost:${PORT}`);
    console.log(`🔍 Try opening in browser: http://localhost:${PORT}/api/health\n`);
  });
};

startServer();
