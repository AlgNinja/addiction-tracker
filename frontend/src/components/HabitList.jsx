// ==============================================================================
// HABIT LIST SIDEBAR COMPONENT (frontend/src/components/HabitList.jsx)
// ==============================================================================
// WHAT REACT CONCEPTS ARE USED HERE?
// 1. Lists & Keys: We use array.map() to turn an array of habit objects into
//    HTML buttons. Every list item needs a unique `key={habit.id}` for React
//    to optimize rendering.
// 2. Conditional CSS Classes: `className={`habit-card ${isSelected ? 'active' : ''}`}`
//    dynamically changes the card's appearance when selected.
// ==============================================================================

import React from 'react';
import { Plus, Flame, Shield, Sparkles } from 'lucide-react';

/**
 * Quick helper to format seconds into short days/hours display.
 */
function formatShortStreak(seconds) {
  if (!seconds || seconds <= 0) return '0h';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);

  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

export default function HabitList({
  habits,
  selectedHabitId,
  onSelectHabit,
  onOpenAddModal,
}) {
  return (
    <aside className="habits-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title-area">
          <Shield size={22} className="text-primary-blue" />
          <h3>Tracked Addictions</h3>
        </div>
        <button
          className="btn-add-habit"
          onClick={onOpenAddModal}
          title="Add a new habit or addiction to track"
        >
          <Plus size={18} />
          <span>New</span>
        </button>
      </div>

      <div className="habits-scroll-list">
        {habits.length === 0 ? (
          <div className="sidebar-empty">
            <Sparkles size={28} className="text-muted" />
            <p>No habits tracked yet.</p>
            <button className="btn-primary-sm" onClick={onOpenAddModal}>
              Track your first habit
            </button>
          </div>
        ) : (
          habits.map((h) => {
            const isSelected = selectedHabitId === h.id;
            return (
              <button
                key={h.id}
                type="button"
                className={`sidebar-habit-item ${isSelected ? 'sidebar-habit-active' : ''}`}
                onClick={() => onSelectHabit(h.id)}
              >
                <div className="habit-item-header">
                  <span className="habit-item-title">{h.name}</span>
                  <span className="habit-category-pill">{h.category || 'habit'}</span>
                </div>

                <div className="habit-item-footer">
                  <div className="streak-tag">
                    <Flame size={14} className="flame-mini" />
                    <span>{formatShortStreak(h.current_streak_seconds)}</span>
                  </div>
                  <div className="relapse-count-tag">
                    {h.total_relapses} slip{h.total_relapses !== 1 ? 's' : ''}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="sidebar-footer-tip">
        💡 <strong>Recovery Rule:</strong> Awareness of triggers is 80% of overcoming an addiction.
      </div>
    </aside>
  );
}
