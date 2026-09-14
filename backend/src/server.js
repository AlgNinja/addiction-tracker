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
const fs = require('fs');
const path = require('path');
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

// CORS: Allow frontend to send requests with Authorization headers
app.use(cors({
  origin: true,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// JSON Parser
app.use(express.json());

// Verify Clerk environment configuration
const hasClerkKeys = Boolean(process.env.CLERK_SECRET_KEY || process.env.CLERK_PUBLISHABLE_KEY);

if (hasClerkKeys) {
  console.log('🔒 Clerk Authentication: ACTIVE (verifying requests via Clerk keys)');
  app.use(clerkMiddleware());
} else {
  console.warn('⚠️  WARNING: CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY not found in environment!');
  // Provide a friendly error handler if someone calls the API without keys configured
  app.use('/api', (req, res, next) => {
    if (req.path === '/health') return next();
    return res.status(500).json({
      error: 'Missing Clerk Configuration',
      message: 'CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY must be set in your environment variables.',
      hint: 'If hosting on Render, add CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY in the Environment tab of your Web Service.',
    });
  });
}

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
    message: 'Addiction Tracker Backend is running!',
    clerk_configured: hasClerkKeys,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
app.use('/api/habits', habitRoutes);
app.use('/api', relapseRoutes);

// ==============================================================================
// STATIC FILE SERVING (PRODUCTION / RENDER)
// ==============================================================================
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../frontend/dist');

  if (fs.existsSync(distPath)) {
    // Serve static frontend assets (JS, CSS, images)
    app.use(express.static(distPath));

    // Client-side single page app routing: any non-API route serves index.html
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    console.warn(`⚠️ Warning: Production frontend build folder not found at ${distPath}`);
    app.get('*', (req, res) => {
      res.status(500).json({
        error: 'Frontend build not found',
        message: 'The frontend/dist directory does not exist. Make sure your build command ran "npm run build".',
      });
    });
  }
} else {
  // 404 Handler for development API calls
  app.use((req, res) => {
    res.status(404).json({
      error: `Route not found: ${req.method} ${req.originalUrl}`,
    });
  });
}

// ==============================================================================
// GLOBAL ERROR HANDLER
// ==============================================================================
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'An internal server error occurred.',
    message: err.message,
    hint: err.message && err.message.includes('key is missing')
      ? 'Please check that CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY are set in Render environment variables.'
      : undefined,
  });
});

// ==============================================================================
// START SERVER
// ==============================================================================
const startServer = async () => {
  console.log('\n🚀 Starting Addiction Tracker Backend...');

  const dbConnected = await testConnection();

  if (!dbConnected) {
    console.warn('⚠️  Warning: Database connection failed. Please ensure PostgreSQL is running or DATABASE_URL is set.');
  }

  app.listen(PORT, () => {
    console.log(`📡 Backend API listening on http://localhost:${PORT}`);
    console.log(`🔍 Health check: http://localhost:${PORT}/api/health\n`);
  });
};

startServer();
