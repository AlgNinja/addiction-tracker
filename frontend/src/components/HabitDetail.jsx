// ==============================================================================
// HABIT DETAIL & LIVE STREAK COUNTER (frontend/src/components/HabitDetail.jsx)
// ==============================================================================
// WHAT REACT CONCEPTS ARE USED HERE?
// 1. useEffect + setInterval: Runs a timer every second (1000ms) to tick the live
//    streak counter so the user sees seconds, minutes, and hours advancing in real-time.
// 2. Props: Receives `habit`, `relapses`, `onOpenRelapseModal`, and `onDeleteHabit`
//    from the parent App.jsx component.
// 3. Clean State Cleanup: `clearInterval(timer)` in the useEffect cleanup function
//    prevents memory leaks when the component unmounts.
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Trophy, 
  AlertTriangle, 
  RotateCcw, 
  Trash2, 
  Clock, 
  Target, 
  BookOpen, 
  Award, 
  CheckCircle2 
} from 'lucide-react';
import RelapseHistory from './RelapseHistory';

export default function HabitDetail({ 
  habit, 
  relapses, 
  onOpenRelapseModal, 
  onDeleteHabit,
  onRelapseDeleted 
}) {
  // Store the live streak duration in seconds
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeTab, setActiveTab] = useState('journal'); // 'journal' or 'milestones'

  // ==============================================================================
  // LIVE TIMER EFFECT
  // Recalculates elapsed time from 'current_streak_started_at' every 1000ms (1 second)
  // ==============================================================================
  useEffect(() => {
    if (!habit || !habit.current_streak_started_at) return;

    const calculateElapsed = () => {
      const startMs = new Date(habit.current_streak_started_at).getTime();
      const nowMs = Date.now();
      const diffSeconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      setElapsedSeconds(diffSeconds);
    };

    // Calculate immediately on mount or habit change
    calculateElapsed();

    // Tick every 1 second
    const interval = setInterval(calculateElapsed, 1000);

    // Cleanup: Stop the interval when habit changes or component unmounts
    return () => clearInterval(interval);
  }, [habit]);

  if (!habit) {
    return (
      <div className="habit-detail-empty">
        <Target size={48} className="icon-subtle" />
        <h3>Select a habit or addiction to view streak details</h3>
        <p>Choose one from the sidebar or click "Track New Addiction".</p>
      </div>
    );
  }

  // Current Streak breakdown (resets to 0 upon relapse)
  const days = Math.floor(elapsedSeconds / 86400);
  const hours = Math.floor((elapsedSeconds % 86400) / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  // All-time longest streak in days (stored & preserved across all past relapses)
  const longestSeconds = Math.max(elapsedSeconds, habit.longest_streak_seconds || 0);
  const longestDays = Math.floor(longestSeconds / 86400);
  const longestHours = Math.floor((longestSeconds % 86400) / 3600);

  // Milestone targets
  const milestones = [
    { label: '24 Hours', targetSeconds: 86400, desc: 'The hardest day conquered' },
    { label: '3 Days', targetSeconds: 3 * 86400, desc: 'Peak physical cravings recede' },
    { label: '1 Week', targetSeconds: 7 * 86400, desc: 'Forming new automatic routines' },
    { label: '2 Weeks', targetSeconds: 14 * 86400, desc: 'Noticeable mental clarity' },
    { label: '30 Days', targetSeconds: 30 * 86400, desc: 'Brain neurochemistry reset' },
    { label: '90 Days', targetSeconds: 90 * 86400, desc: 'Lifestyle transformation' },
  ];

  return (
    <div className="habit-detail-view">
      {/* Top Banner: Habit Title, Motivation, & Delete Action */}
      <div className="detail-header-card">
        <div className="detail-header-main">
          <div className="habit-badge-tag">{habit.category || 'habit'}</div>
          <h2>{habit.name}</h2>
          {habit.reason_to_quit && (
            <div className="motivation-quote">
              <span className="quote-icon">🎯</span>
              <span><strong>Your Motivation:</strong> {habit.reason_to_quit}</span>
            </div>
          )}
        </div>
        <div className="detail-header-actions">
          <button 
            className="btn-danger-outline" 
            onClick={() => onDeleteHabit(habit.id)}
            title="Delete this habit and all history"
          >
            <Trash2 size={16} /> Delete Habit
          </button>
        </div>
      </div>

      {/* ============================================================================ */}
      {/* LIVE STREAK COUNTER DISPLAY */}
      {/* ============================================================================ */}
      <div className="streak-hero-card">
        <div className="streak-hero-label">
          <Flame size={24} className="flame-icon animated-flame" />
          <span>CURRENT CLEAN STREAK</span>
        </div>

        {/* Live Numbers Grid */}
        <div className="countdown-grid">
          <div className="countdown-box">
            <div className="countdown-num">{days}</div>
            <div className="countdown-tag">DAYS</div>
          </div>
          <div className="countdown-separator">:</div>
          <div className="countdown-box">
            <div className="countdown-num">{String(hours).padStart(2, '0')}</div>
            <div className="countdown-tag">HOURS</div>
          </div>
          <div className="countdown-separator">:</div>
          <div className="countdown-box">
            <div className="countdown-num">{String(minutes).padStart(2, '0')}</div>
            <div className="countdown-tag">MINUTES</div>
          </div>
          <div className="countdown-separator">:</div>
          <div className="countdown-box">
            <div className="countdown-num">{String(seconds).padStart(2, '0')}</div>
            <div className="countdown-tag">SECONDS</div>
          </div>
        </div>

        <div className="streak-meta-info">
          <span>Started: {new Date(habit.current_streak_started_at).toLocaleString()}</span>
        </div>

        {/* Big Action Button: Log Relapse / Break Streak */}
        <div className="streak-break-cta">
          <button 
            className="btn-relapse-break" 
            onClick={() => onOpenRelapseModal(habit)}
          >
            <AlertTriangle size={18} />
            <span>I Broke My Streak (Reflect & Check-In)</span>
          </button>
          <span className="btn-subtext">
            Don't worry, slip-ups happen. Documenting what you felt will help prevent it next time.
          </span>
        </div>
      </div>

      {/* ============================================================================ */}
      {/* QUICK STATISTICS ROW */}
      {/* ============================================================================ */}
      <div className="stats-cards-row">
        {/* Card 1: Days Clean Total (Resets to 0 on relapse) */}
        <div className="stat-card">
          <div className="stat-card-icon clock">
            <Clock size={20} />
          </div>
          <div>
            <div className="stat-card-title">Days Clean Total</div>
            <div className="stat-card-value">
              {days} {days === 1 ? 'Day' : 'Days'}
            </div>
            <div className="stat-card-subtext">Resets on relapse ({days}d {hours}h)</div>
          </div>
        </div>

        {/* Card 2: Longest Streak in Days (Stored & Preserved permanently) */}
        <div className="stat-card">
          <div className="stat-card-icon trophy">
            <Trophy size={20} />
          </div>
          <div>
            <div className="stat-card-title">Longest Streak</div>
            <div className="stat-card-value">
              {longestDays} {longestDays === 1 ? 'Day' : 'Days'}
            </div>
            <div className="stat-card-subtext">Best record ({longestDays}d {longestHours}h)</div>
          </div>
        </div>

        {/* Card 3: Relapses Logged */}
        <div className="stat-card">
          <div className="stat-card-icon history">
            <RotateCcw size={20} />
          </div>
          <div>
            <div className="stat-card-title">Relapses Logged</div>
            <div className="stat-card-value">{relapses ? relapses.length : 0}</div>
            <div className="stat-card-subtext">Journal entries</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs: Relapse Journal vs Milestones */}
      <div className="section-tabs">
        <button
          className={`tab-btn ${activeTab === 'journal' ? 'tab-btn-active' : ''}`}
          onClick={() => setActiveTab('journal')}
        >
          <BookOpen size={16} /> Relapse Journal & Why Streaks Broke ({relapses ? relapses.length : 0})
        </button>
        <button
          className={`tab-btn ${activeTab === 'milestones' ? 'tab-btn-active' : ''}`}
          onClick={() => setActiveTab('milestones')}
        >
          <Award size={16} /> Milestone Badges
        </button>
      </div>

      {/* Tab 1: Relapse History and Questionnaire Answers */}
      {activeTab === 'journal' && (
        <RelapseHistory 
          relapses={relapses} 
          onRelapseDeleted={onRelapseDeleted} 
        />
      )}

      {/* Tab 2: Milestone Badges */}
      {activeTab === 'milestones' && (
        <div className="milestones-grid">
          {milestones.map((m) => {
            const isAchieved = elapsedSeconds >= m.targetSeconds;
            return (
              <div 
                key={m.label} 
                className={`milestone-card ${isAchieved ? 'milestone-unlocked' : 'milestone-locked'}`}
              >
                <div className="milestone-status-icon">
                  {isAchieved ? <CheckCircle2 size={24} className="text-success" /> : <Clock size={24} className="text-muted" />}
                </div>
                <div className="milestone-info">
                  <h4>{m.label}</h4>
                  <p>{m.desc}</p>
                  <span className="milestone-badge-pill">
                    {isAchieved ? '✨ Achieved' : 'In Progress'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
