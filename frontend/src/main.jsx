// ==============================================================================
// APPLICATION ENTRYPOINT (frontend/src/main.jsx)
// ==============================================================================
// HOW CLERK PROVIDER WORKS:
// In React, Clerk uses a Context Provider (<ClerkProvider>) to manage and provide
// user session state, JWT tokens, and user profile data to all child components.
// ==============================================================================

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App.jsx';
import './index.css';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error('Missing Clerk Publishable Key in frontend/.env');
}

const root = createRoot(document.getElementById('root'));

root.render(
  <StrictMode>
    <ClerkProvider publishableKey={clerkPubKey}>
      <App />
    </ClerkProvider>
  </StrictMode>
);
