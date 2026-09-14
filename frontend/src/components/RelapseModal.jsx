// ==============================================================================
// RELAPSE QUESTIONNAIRE MODAL (frontend/src/components/RelapseModal.jsx)
// ==============================================================================
// WHAT IS THIS COMPONENT?
// This is the core psychological tool of the tracker. When someone breaks their
// streak, shame and frustration often cause people to give up.
//
// Instead of just resetting the counter, this modal asks compassionate, structured
// questions about:
// 1. Time of relapse
// 2. What they were doing (Context)
// 3. What they were feeling (Emotions)
// 4. What the specific trigger was (Root Cause)
// 5. How to handle it next time (Actionable Reflection)
//
// All of this is sent to Express (POST /api/habits/:id/relapse), saved to PostgreSQL,
// and used to display pattern insights to the user.
// ==============================================================================

import React, { useState } from 'react';
import { ShieldAlert, X, HeartHandshake, Clock, Activity, Smile, AlertCircle, Compass } from 'lucide-react';
import { logRelapse } from '../api';

export default function RelapseModal({ isOpen, habit, onClose, onRelapseLogged }) {
  if (!isOpen || !habit) return null;

  // Question 1: Time of relapse (defaults to current time in YYYY-MM-DDTHH:MM local format)
  const [relapseTime, setRelapseTime] = useState(() => {
    const now = new Date();
    // Offset local timezone for standard datetime-local HTML input
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  });

  // Question 2: What were you doing?
  const [activity, setActivity] = useState('');
  // Question 3: What were you feeling?
  const [feeling, setFeeling] = useState('');
  // Question 4: What triggered it?
  const [triggerReason, setTriggerReason] = useState('');
  // Question 5: What can you do differently next time?
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Common contexts to click for quick auto-fill
  const commonActivities = [
    'Lying in bed',
    'Working on a stressful task',
    'Scrolling phone / social media',
    'At a social gathering / party',
    'Alone at home',
    'Binge watching TV',
    'Driving or commuting',
    'Taking a study/work break',
  ];

  // Common emotional states to click for quick auto-fill
  const commonFeelings = [
    { label: 'Stressed', emoji: '😫' },
    { label: 'Bored', emoji: '🥱' },
    { label: 'Anxious', emoji: '😰' },
    { label: 'Lonely', emoji: '🥺' },
    { label: 'Exhausted', emoji: '😴' },
    { label: 'Frustrated / Angry', emoji: '😤' },
    { label: 'Restless', emoji: '🌀' },
    { label: 'Craving comfort', emoji: '🍫' },
  ];

  // Helper to append or toggle feelings
  const handleToggleFeeling = (feelLabel) => {
    if (!feeling) {
      setFeeling(feelLabel);
    } else if (feeling.includes(feelLabel)) {
      // Remove if already included
      const updated = feeling
        .split(', ')
        .filter((f) => f !== feelLabel)
        .join(', ');
      setFeeling(updated);
    } else {
      // Append with comma
      setFeeling(`${feeling}, ${feelLabel}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!activity.trim()) {
      setErrorMessage('Please describe what you were doing when the streak broke.');
      return;
    }

    if (!feeling.trim()) {
      setErrorMessage('Please note what you were feeling emotionally.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        relapse_time: new Date(relapseTime).toISOString(),
        activity: activity.trim(),
        feeling: feeling.trim(),
        trigger_reason: triggerReason.trim() || null,
        notes: notes.trim() || null,
      };

      // Send to backend via our api.js helper
      const response = await logRelapse(habit.id, payload);

      // Notify parent to refresh habit statistics & history
      onRelapseLogged(response);

      // Reset and close
      setActivity('');
      setFeeling('');
      setTriggerReason('');
      setNotes('');
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save relapse log. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container modal-lg" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header relapse-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge badge-warning">
              <HeartHandshake size={24} />
            </div>
            <div>
              <h3>Streak Check-In: {habit.name}</h3>
              <p>
                A slip is data, not defeat. Documenting what happened helps you break the pattern.
              </p>
            </div>
          </div>
          <button className="btn-icon-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {errorMessage && (
          <div className="alert-error">
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Question 1: When did it happen? */}
          <div className="form-group">
            <label htmlFor="relapse-time">
              <Clock size={16} className="label-icon" /> 1. When did this happen?
            </label>
            <input
              id="relapse-time"
              type="datetime-local"
              value={relapseTime}
              onChange={(e) => setRelapseTime(e.target.value)}
              max={new Date().toISOString().slice(0, 16)}
              required
            />
            <span className="form-hint">Defaults to right now, or select an earlier time if reporting after the fact.</span>
          </div>

          {/* Question 2: What were you doing? */}
          <div className="form-group">
            <label htmlFor="relapse-activity">
              <Activity size={16} className="label-icon" /> 2. What were you doing? <span className="required">*</span>
            </label>
            <div className="chip-picker">
              {commonActivities.map((act) => (
                <button
                  type="button"
                  key={act}
                  className={`chip ${activity === act ? 'chip-active' : ''}`}
                  onClick={() => setActivity(act)}
                >
                  {act}
                </button>
              ))}
            </div>
            <input
              id="relapse-activity"
              type="text"
              placeholder="Or type custom activity (e.g. studying late at night alone)..."
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              required
            />
          </div>

          {/* Question 3: What were you feeling? */}
          <div className="form-group">
            <label htmlFor="relapse-feeling">
              <Smile size={16} className="label-icon" /> 3. What were you feeling inside? <span className="required">*</span>
            </label>
            <div className="chip-picker">
              {commonFeelings.map((item) => (
                <button
                  type="button"
                  key={item.label}
                  className={`chip ${feeling.includes(item.label) ? 'chip-active' : ''}`}
                  onClick={() => handleToggleFeeling(item.label)}
                >
                  <span className="chip-emoji">{item.emoji}</span> {item.label}
                </button>
              ))}
            </div>
            <input
              id="relapse-feeling"
              type="text"
              placeholder="Describe your emotional state (e.g. overwhelmed by work deadlines, restless)..."
              value={feeling}
              onChange={(e) => setFeeling(e.target.value)}
              required
            />
            <span className="form-hint">Addictions are usually coping mechanisms for uncomfortable feelings.</span>
          </div>

          {/* Question 4: What was the main trigger or reason? */}
          <div className="form-group">
            <label htmlFor="relapse-trigger">
              <AlertCircle size={16} className="label-icon" /> 4. What was the specific trigger or reason?
            </label>
            <textarea
              id="relapse-trigger"
              rows={2}
              placeholder="e.g. Had an argument with a friend; Saw a vaping ad on Instagram; Felt unable to focus on writing code..."
              value={triggerReason}
              onChange={(e) => setTriggerReason(e.target.value)}
            />
          </div>

          {/* Question 5: Action plan for next time */}
          <div className="form-group">
            <label htmlFor="relapse-notes">
              <Compass size={16} className="label-icon" /> 5. What will you do differently next time? (Action Plan)
            </label>
            <textarea
              id="relapse-notes"
              rows={2}
              placeholder="e.g. Next time I feel overwhelmed, step away from the computer for 10 minutes and drink ice water..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Action buttons */}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-danger-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Logging & Resetting...' : 'Log Break & Reset Streak'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
