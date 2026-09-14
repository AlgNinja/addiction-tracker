// ==============================================================================
// RELAPSE HISTORY & PATTERN INSIGHTS COMPONENT (frontend/src/components/RelapseHistory.jsx)
// ==============================================================================
// WHAT IS THIS COMPONENT?
// This component displays the chronological record of every streak break, showing
// the answers to the questions asked during check-in.
//
// WHY IS THIS VALUABLE?
// Real recovery and habit change happens when we detect recurring patterns.
// This component surfaces:
// 1. Common emotional triggers (e.g. 70% of slips happen when "Stressed" or "Bored")
// 2. High-risk activities/environments (e.g. "Late night alone in bed")
// 3. User's planned solutions for future cravings
// ==============================================================================

import React from 'react';
import { Calendar, AlertCircle, Sparkles, Trash2, Clock, Brain, Activity, Compass } from 'lucide-react';
import { deleteRelapse } from '../api';

/**
 * Helper function to format duration in seconds into human-readable string.
 * Example: 90000 seconds -> "1 day, 1 hour"
 */
function formatSeconds(seconds) {
  if (!seconds || seconds <= 0) return '0 minutes';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hr${hours !== 1 ? 's' : ''}`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} min${minutes !== 1 ? 's' : ''}`);

  return parts.slice(0, 2).join(', ');
}

/**
 * Formats ISO date string into readable local date and time.
 */
function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function RelapseHistory({ relapses, onRelapseDeleted }) {
  // Handle deleting a single relapse entry (with confirmation)
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this relapse entry?')) {
      return;
    }
    try {
      await deleteRelapse(id);
      if (onRelapseDeleted) {
        onRelapseDeleted(id);
      }
    } catch (err) {
      alert(`Could not delete entry: ${err.message}`);
    }
  };

  // If no relapses have been logged yet:
  if (!relapses || relapses.length === 0) {
    return (
      <div className="empty-history-card">
        <div className="empty-icon">🛡️</div>
        <h4>No Broken Streaks Logged</h4>
        <p>
          You have zero streak breaks recorded for this habit. Keep up the strong discipline!
          If you do slip, use the "I Broke My Streak" button to reflect and learn.
        </p>
      </div>
    );
  }

  // ==============================================================================
  // PATTERN INSIGHTS CALCULATION
  // Simple algorithm to find top recurring emotions from user's logs
  // ==============================================================================
  const feelingFrequency = {};
  relapses.forEach((r) => {
    if (r.feeling) {
      // Split by comma or semicolon
      const tokens = r.feeling.split(/[,;]+/).map((t) => t.trim().toLowerCase());
      tokens.forEach((token) => {
        if (token) {
          feelingFrequency[token] = (feelingFrequency[token] || 0) + 1;
        }
      });
    }
  });

  // Sort feelings by frequency
  const sortedFeelings = Object.entries(feelingFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div className="relapse-history-wrapper">
      {/* Pattern Insights Summary Header */}
      <div className="pattern-insights-box">
        <div className="insights-header">
          <Sparkles size={18} className="insights-icon" />
          <h5>Pattern Recognition Insights ({relapses.length} slip{relapses.length !== 1 ? 's' : ''} analyzed)</h5>
        </div>

        <div className="insights-grid">
          <div className="insight-item">
            <span className="insight-label">Primary Triggers Detected:</span>
            <div className="insight-tags">
              {sortedFeelings.length > 0 ? (
                sortedFeelings.map(([feel, count]) => (
                  <span key={feel} className="insight-badge">
                    {feel} <span className="badge-count">({count}x)</span>
                  </span>
                ))
              ) : (
                <span className="text-muted">Not enough data yet</span>
              )}
            </div>
          </div>
          <div className="insight-item">
            <span className="insight-label">Key Advice:</span>
            <p className="insight-text">
              Notice the common thread above. When you feel these emotions in daily life, pause and
              substitute an alternative activity before the urge escalates.
            </p>
          </div>
        </div>
      </div>

      {/* Relapse Timeline Cards */}
      <div className="history-timeline">
        {relapses.map((entry, index) => (
          <div key={entry.id} className="relapse-card">
            {/* Card Header: Timestamp and Broken Streak Duration */}
            <div className="relapse-card-header">
              <div className="relapse-time-pill">
                <Calendar size={14} />
                <span>{formatDate(entry.relapse_time)}</span>
              </div>
              <div className="streak-was-pill">
                <Clock size={14} />
                <span>Streak was: <strong>{formatSeconds(entry.streak_broken_seconds)}</strong></span>
              </div>
              <button
                className="btn-delete-entry"
                onClick={() => handleDelete(entry.id)}
                title="Delete this record"
                aria-label="Delete entry"
              >
                <Trash2 size={15} />
              </button>
            </div>

            {/* Questions and Answers Grid */}
            <div className="relapse-card-body">
              {/* Question: What were you doing? */}
              <div className="qa-item">
                <div className="qa-label">
                  <Activity size={14} />
                  <span>Activity / Context:</span>
                </div>
                <div className="qa-value">{entry.activity}</div>
              </div>

              {/* Question: What were you feeling? */}
              <div className="qa-item">
                <div className="qa-label">
                  <Brain size={14} />
                  <span>Feelings & Emotions:</span>
                </div>
                <div className="qa-value emotion-highlight">{entry.feeling}</div>
              </div>

              {/* Question: Trigger / Reason */}
              {entry.trigger_reason && (
                <div className="qa-item">
                  <div className="qa-label">
                    <AlertCircle size={14} />
                    <span>Trigger Reason:</span>
                  </div>
                  <div className="qa-value">{entry.trigger_reason}</div>
                </div>
              )}

              {/* Question: Action Plan / Notes */}
              {entry.notes && (
                <div className="qa-item qa-plan">
                  <div className="qa-label">
                    <Compass size={14} />
                    <span>Plan for Next Time:</span>
                  </div>
                  <div className="qa-value italic">"{entry.notes}"</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
