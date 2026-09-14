// ==============================================================================
// ADD HABIT MODAL COMPONENT (frontend/src/components/AddHabitModal.jsx)
// ==============================================================================
// WHAT IS A MODAL?
// A modal is a dialog box/popup window that appears on top of the main screen.
//
// WHAT REACT CONCEPTS ARE USED HERE?
// 1. useState: Stores what the user types into each input field.
// 2. Controlled Inputs: The <input value={name} onChange={(e) => setName(e.target.value)} />
//    pattern links the text in the HTML element directly to React's state memory.
// 3. Form Submission: e.preventDefault() stops the web browser from reloading the page,
//    allowing us to send the data via JavaScript (AJAX / Fetch API) smoothly.
// ==============================================================================

import React, { useState } from 'react';
import { PlusCircle, X, Sparkles, Target, Calendar } from 'lucide-react';
import { createHabit } from '../api';

export default function AddHabitModal({ isOpen, onClose, onHabitAdded }) {
  // If isOpen is false, don't render anything onto the screen
  if (!isOpen) return null;

  // React State: Stores the form inputs
  const [name, setName] = useState('');
  const [reasonToQuit, setReasonToQuit] = useState('');
  const [category, setCategory] = useState('health');
  // Allows user to pick when their streak started: 'now' or a custom past date
  const [startType, setStartType] = useState('now');
  const [customStartDate, setCustomStartDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Pre-set categories to make selection quick and intuitive
  const categories = [
    { id: 'health', label: 'Health & Wellness', emoji: '🍎' },
    { id: 'substance', label: 'Substance & Vaping', emoji: '🚫' },
    { id: 'screen', label: 'Screen & Social Media', emoji: '📱' },
    { id: 'spending', label: 'Spending & Shopping', emoji: '💳' },
    { id: 'productivity', label: 'Procrastination & Focus', emoji: '⏳' },
    { id: 'other', label: 'Other Habit', emoji: '🌱' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Please provide a name for the addiction/habit you want to overcome.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Determine streak start timestamp
      let streakStartTime = new Date().toISOString();
      if (startType === 'custom' && customStartDate) {
        streakStartTime = new Date(customStartDate).toISOString();
      }

      const habitPayload = {
        name: name.trim(),
        reason_to_quit: reasonToQuit.trim() || null,
        category,
        current_streak_started_at: streakStartTime,
      };

      // Call our API client function (which calls POST /api/habits)
      const newHabit = await createHabit(habitPayload);

      // Notify parent component so it can update the habits list in UI
      onHabitAdded(newHabit);

      // Reset form and close modal
      setName('');
      setReasonToQuit('');
      setCategory('health');
      setStartType('now');
      setCustomStartDate('');
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create habit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* stopPropagation prevents clicks inside the modal card from closing it */}
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <PlusCircle size={22} />
            </div>
            <div>
              <h3>Track New Addiction / Habit</h3>
              <p>Commit to a fresh start. Track streaks and understand your triggers.</p>
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
          {/* 1. Habit Name */}
          <div className="form-group">
            <label htmlFor="habit-name">
              Addiction / Habit Name <span className="required">*</span>
            </label>
            <input
              id="habit-name"
              type="text"
              placeholder="e.g. Nicotine Vaping, Late Night Snacking, Doomscrolling..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          {/* 2. Category Selection */}
          <div className="form-group">
            <label>Category</label>
            <div className="category-chips">
              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  className={`chip ${category === cat.id ? 'chip-active' : ''}`}
                  onClick={() => setCategory(cat.id)}
                >
                  <span className="chip-emoji">{cat.emoji}</span> {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Reason to Quit */}
          <div className="form-group">
            <label htmlFor="reason-quit">
              Your Deeper "Why" (Why do you want to break this?)
            </label>
            <textarea
              id="reason-quit"
              rows={3}
              placeholder="e.g. Better lung health, saving $200 a month, and being fully present with family."
              value={reasonToQuit}
              onChange={(e) => setReasonToQuit(e.target.value)}
            />
            <span className="form-hint">
              Reminding yourself of your core motivation helps strengthen willpower during cravings.
            </span>
          </div>

          {/* 4. Streak Start Time */}
          <div className="form-group">
            <label>When did your streak start?</label>
            <div className="radio-options">
              <label className={`radio-pill ${startType === 'now' ? 'radio-pill-selected' : ''}`}>
                <input
                  type="radio"
                  name="startType"
                  value="now"
                  checked={startType === 'now'}
                  onChange={() => setStartType('now')}
                />
                Right Now (Starting today)
              </label>
              <label className={`radio-pill ${startType === 'custom' ? 'radio-pill-selected' : ''}`}>
                <input
                  type="radio"
                  name="startType"
                  value="custom"
                  checked={startType === 'custom'}
                  onChange={() => setStartType('custom')}
                />
                I already started earlier
              </label>
            </div>

            {startType === 'custom' && (
              <div className="custom-date-input-wrap">
                <input
                  type="datetime-local"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 16)}
                  required={startType === 'custom'}
                />
                <span className="form-hint">Select the date and time you took your last slip-up.</span>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating Habit...' : 'Start Tracking Streak'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
