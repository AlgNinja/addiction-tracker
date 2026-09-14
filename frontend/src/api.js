// ==============================================================================
// FRONTEND API CLIENT WITH CLERK AUTHENTICATION (frontend/src/api.js)
// ==============================================================================
// HOW AUTHENTICATION IS SENT TO THE SERVER:
// Every time a signed-in user interacts with the app, this API client attaches
// their cryptographic Clerk session token:
//
//   Authorization: Bearer <clerk_jwt_token>
//
// The Express server reads this header, verifies it with Clerk, extracts the user's
// unique ID, and scopes the PostgreSQL queries so users only access their OWN data.
// ==============================================================================

const API_BASE_URL = '/api';

// Reference to a function that retrieves the current Clerk JWT session token
let authTokenGetter = null;

/**
 * Configure the function used to retrieve the Clerk JWT token.
 * Called from Clerk's `useAuth()` hook: `setAuthTokenGetter(() => getToken())`.
 *
 * @param {Function} fn - Async function returning Clerk JWT token string
 */
export function setAuthTokenGetter(fn) {
  authTokenGetter = fn;
}

/**
 * Centralized fetch helper that automatically attaches Clerk authentication headers.
 *
 * @param {string} endpoint - API path (e.g. '/habits')
 * @param {object} options - Fetch options (method, body, headers)
 * @returns {Promise<any>} - Parsed JSON response
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // Attach the Clerk cryptographic Bearer token
  if (authTokenGetter) {
    try {
      const token = await authTokenGetter();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('Could not retrieve Clerk session token:', err);
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        // Non-JSON response
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error(`[API Error] ${options.method || 'GET'} ${url}:`, error.message);
    throw error;
  }
}

// ==============================================================================
// HABIT ENDPOINTS (Scoped to current Clerk user)
// ==============================================================================

export async function getHabits() {
  return await request('/habits');
}

export async function getHabitById(id) {
  return await request(`/habits/${id}`);
}

export async function createHabit(habitData) {
  return await request('/habits', {
    method: 'POST',
    body: JSON.stringify(habitData),
  });
}

export async function updateHabit(id, updateData) {
  return await request(`/habits/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updateData),
  });
}

export async function deleteHabit(id) {
  return await request(`/habits/${id}`, {
    method: 'DELETE',
  });
}

// ==============================================================================
// RELAPSE ENDPOINTS (Scoped to current Clerk user)
// ==============================================================================

export async function logRelapse(habitId, questionnaire) {
  return await request(`/habits/${habitId}/relapse`, {
    method: 'POST',
    body: JSON.stringify(questionnaire),
  });
}

export async function getHabitRelapses(habitId) {
  return await request(`/habits/${habitId}/relapses`);
}

export async function deleteRelapse(relapseId) {
  return await request(`/relapses/${relapseId}`, {
    method: 'DELETE',
  });
}
