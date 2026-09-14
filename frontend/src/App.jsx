// ==============================================================================
// ROOT REACT APPLICATION COMPONENT (frontend/src/App.jsx)
// ==============================================================================
// HOW USER PRIVACY IS INTEGRATED:
// 1. Clerk provides the authenticated user session and JWT Bearer token.
// 2. The navbar displays the logged-in Clerk user profile via <UserButton />.
// 3. Whenever the user signs in or adds data, `loadHabits()` queries the backend,
//    which strictly scopes all database operations to this user's Clerk ID.
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus } from 'lucide-react';
import { UserButton, useUser } from '@clerk/clerk-react';
import { getHabits, getHabitById, deleteHabit } from './api';

import HabitList from './components/HabitList';
import HabitDetail from './components/HabitDetail';
import AddHabitModal from './components/AddHabitModal';
import RelapseModal from './components/RelapseModal';
import ClerkAuthWrapper from './components/ClerkAuthWrapper';

import './App.css';

export default function App() {
  const { user } = useUser();

  // Application data state
  const [habits, setHabits] = useState([]);
  const [selectedHabitId, setSelectedHabitId] = useState(null);
  const [activeHabit, setActiveHabit] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  // Modal visibility states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRelapseModalOpen, setIsRelapseModalOpen] = useState(false);

  // ==============================================================================
  // DATA FETCHING
  // ==============================================================================

  const loadHabits = async (preferSelectedId = null) => {
    try {
      setErrorMessage(null);
      const data = await getHabits();
      setHabits(data);

      if (data.length > 0) {
        const idToSelect = preferSelectedId || (data.some(h => h.id === selectedHabitId) ? selectedHabitId : data[0].id);
        setSelectedHabitId(idToSelect);
      } else {
        setSelectedHabitId(null);
        setActiveHabit(null);
      }
    } catch (err) {
      setErrorMessage('Could not connect to backend server. Make sure PostgreSQL & Express are running!');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadActiveHabitDetails = async (id) => {
    if (!id) return;
    try {
      const details = await getHabitById(id);
      setActiveHabit(details);
    } catch (err) {
      console.error(`Failed to fetch habit details for id ${id}:`, err);
    }
  };

  // Load habits whenever user authenticates or signs in
  useEffect(() => {
    if (user) {
      loadHabits();
    }
  }, [user]);

  // When selected habit changes, load its relapses
  useEffect(() => {
    if (selectedHabitId) {
      loadActiveHabitDetails(selectedHabitId);
    }
  }, [selectedHabitId]);

  // ==============================================================================
  // EVENT HANDLERS
  // ==============================================================================

  const handleSelectHabit = (id) => {
    setSelectedHabitId(id);
  };

  const handleHabitAdded = (newHabit) => {
    loadHabits(newHabit.id);
  };

  const handleRelapseLogged = () => {
    loadHabits(selectedHabitId);
    loadActiveHabitDetails(selectedHabitId);
  };

  const handleDeleteHabit = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this habit and all its relapse logs?')) {
      return;
    }
    try {
      await deleteHabit(id);
      loadHabits();
    } catch (err) {
      alert(`Failed to delete habit: ${err.message}`);
    }
  };

  const handleRelapseDeleted = () => {
    loadHabits(selectedHabitId);
    loadActiveHabitDetails(selectedHabitId);
  };

  return (
    <ClerkAuthWrapper>
      <div className="app-layout">
        {/* ============================================================================ */}
        {/* NAVBAR */}
        {/* ============================================================================ */}
        <header className="app-navbar">
          <div className="nav-brand">
            <div className="brand-logo-icon">
              <ShieldCheck size={26} />
            </div>
            <div className="brand-text">
              <h1>SoberTrack</h1>
              <span className="brand-tagline">Streak Counter & Mindful Relapse Journal</span>
            </div>
          </div>

          <div className="nav-actions">
            <button 
              className="btn-primary" 
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus size={18} />
              <span>Track New Habit</span>
            </button>

            {/* Clerk User Button with Profile and Sign Out */}
            <div className="clerk-user-profile-btn">
              <UserButton afterSignOutUrl="/" showName />
            </div>
          </div>
        </header>

        {/* Global Error Alert Banner */}
        {errorMessage && (
          <div className="system-alert-banner">
            <span>⚠️ {errorMessage}</span>
            <button onClick={() => loadHabits(selectedHabitId)}>Retry Connection</button>
          </div>
        )}

        {/* ============================================================================ */}
        {/* MAIN INTERFACE: SIDEBAR + HABIT DETAIL */}
        {/* ============================================================================ */}
        <main className="app-main">
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading your private habits...</p>
            </div>
          ) : (
            <>
              <HabitList
                habits={habits}
                selectedHabitId={selectedHabitId}
                onSelectHabit={handleSelectHabit}
                onOpenAddModal={() => setIsAddModalOpen(true)}
              />

              <div className="main-content-panel">
                {activeHabit ? (
                  <HabitDetail
                    habit={activeHabit}
                    relapses={activeHabit.relapses || []}
                    onOpenRelapseModal={() => setIsRelapseModalOpen(true)}
                    onDeleteHabit={handleDeleteHabit}
                    onRelapseDeleted={handleRelapseDeleted}
                  />
                ) : (
                  <div className="empty-overview-hero">
                    <div className="hero-badge">🌱 Fresh Journey</div>
                    <h2>No habits currently tracked</h2>
                    <p>
                      Your habit tracker is completely private to your account. Add an addiction or
                      habit you want to overcome. SoberTrack will count your clean streaks in real-time
                      and prompt you with mindful reflection questions whenever you break your streak.
                    </p>
                    <button 
                      className="btn-primary-large" 
                      onClick={() => setIsAddModalOpen(true)}
                    >
                      <Plus size={20} />
                      <span>Track Your First Habit</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </main>

        {/* ============================================================================ */}
        {/* MODALS */}
        {/* ============================================================================ */}
        <AddHabitModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onHabitAdded={handleHabitAdded}
        />

        <RelapseModal
          isOpen={isRelapseModalOpen}
          habit={activeHabit}
          onClose={() => setIsRelapseModalOpen(false)}
          onRelapseLogged={handleRelapseLogged}
        />
      </div>
    </ClerkAuthWrapper>
  );
}
