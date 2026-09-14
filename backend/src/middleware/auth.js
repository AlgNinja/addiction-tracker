// ==============================================================================
// CLERK AUTHENTICATION MIDDLEWARE (backend/src/middleware/auth.js)
// ==============================================================================
// HOW AUTHENTICATION WORKS:
// 1. The user signs in via Clerk on the React frontend.
// 2. React sends requests with:
//      Authorization: Bearer <clerk_jwt_token>
// 3. This middleware verifies the cryptographic signature with @clerk/express.
// 4. If valid, req.userId is set to the Clerk user ID (e.g., "user_2...").
// 5. If missing or invalid, an HTTP 401 Unauthorized response is returned.
//
// Every database query in the backend uses `WHERE user_id = $userId` to guarantee
// complete data privacy for each user.
// ==============================================================================

const { getAuth } = require('@clerk/express');

/**
 * Middleware that strictly requires authenticated Clerk users.
 * Attaches `req.userId` to the request object for database query filtering.
 */
const requireUserAuth = (req, res, next) => {
  try {
    // getAuth(req) extracts and cryptographically verifies the token from the request
    const auth = getAuth(req);

    if (!auth || !auth.userId) {
      return res.status(401).json({
        error: 'Unauthorized: You must be signed in with Clerk to access your habit tracker.',
      });
    }

    // Attach the verified Clerk User ID to the request object
    req.userId = auth.userId;
    return next();
  } catch (err) {
    console.error('Clerk authentication error:', err.message);
    return res.status(401).json({
      error: 'Invalid or expired authentication token. Please sign in again.',
    });
  }
};

module.exports = {
  requireUserAuth,
};
