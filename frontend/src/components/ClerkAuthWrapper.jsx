// ==============================================================================
// CLERK AUTHENTICATION WRAPPER (frontend/src/components/ClerkAuthWrapper.jsx)
// ==============================================================================
// WHAT THIS COMPONENT DOES:
// 1. Bridges Clerk's React SDK with our application.
// 2. Extracts Clerk's session token using `useAuth()` and registers it with
//    `api.js` so all backend requests contain the Authorization Bearer header.
// 3. Renders:
//    - <SignedOut>: A clean, welcoming landing view inviting user to Sign In / Sign Up.
//    - <SignedIn>: The authenticated habit tracking application with <UserButton />.
// ==============================================================================

import React, { useEffect } from 'react';
import { 
  SignedIn, 
  SignedOut, 
  SignInButton, 
  SignUpButton, 
  useAuth, 
  useUser 
} from '@clerk/clerk-react';
import { ShieldCheck, Sparkles, Flame, CheckCircle, ArrowRight } from 'lucide-react';
import { setAuthTokenGetter } from '../api';

export default function ClerkAuthWrapper({ children }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  // Register token getter with our API client so every fetch includes Bearer token
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setAuthTokenGetter(async () => {
        return await getToken();
      });
    }
  }, [isLoaded, isSignedIn, getToken]);

  return (
    <>
      {/* 1. When the user is NOT signed in */}
      <SignedOut>
        <div className="clerk-landing-container">
          <div className="clerk-landing-card">
            <div className="landing-badge">
              <ShieldCheck size={18} />
              <span>Private & Confidential Recovery</span>
            </div>

            <h1>Overcome Addictions with Mindful Self-Awareness</h1>
            <p className="landing-subtitle">
              Track clean streaks down to the second. When you slip, our guided check-in
              helps you uncover your emotional triggers and build lasting resilience.
            </p>

            <div className="landing-features">
              <div className="landing-feature-item">
                <CheckCircle size={18} className="text-success" />
                <span>100% Private: Your habits & journals are locked to your Clerk account</span>
              </div>
              <div className="landing-feature-item">
                <Flame size={18} className="text-amber" />
                <span>Real-time streak clocks with milestone achievements</span>
              </div>
              <div className="landing-feature-item">
                <Sparkles size={18} className="text-blue" />
                <span>Pattern recognition detecting your top emotional triggers</span>
              </div>
            </div>

            <div className="landing-actions">
              <SignInButton mode="modal">
                <button className="btn-primary-large">
                  <span>Sign In to Your Tracker</span>
                  <ArrowRight size={18} />
                </button>
              </SignInButton>

              <SignUpButton mode="modal">
                <button className="btn-secondary">
                  Create Free Account
                </button>
              </SignUpButton>
            </div>

            <div className="landing-privacy-guarantee">
              🔒 Protected by Clerk Authentication & PostgreSQL Row-Level Privacy
            </div>
          </div>
        </div>
      </SignedOut>

      {/* 2. When the user IS signed in */}
      <SignedIn>
        {children}
      </SignedIn>
    </>
  );
}
