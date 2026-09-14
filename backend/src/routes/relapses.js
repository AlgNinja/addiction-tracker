// ==============================================================================
// RELAPSE ROUTES WITH USER PRIVACY (backend/src/routes/relapses.js)
// ==============================================================================
// HOW USER PRIVACY WORKS:
// Whenever a user logs a relapse or views relapse history, we verify that the
// habit ID corresponds to a habit OWNED by the authenticated Clerk user (req.userId).
// If a user tries to log or read relapses for someone else's habit ID, the backend
// rejects the request with HTTP 404/403.
// ==============================================================================

const express = require('express');
const router = express.Router();
const { query, pool } = require('../db');
const { requireUserAuth } = require('../middleware/auth');

// Apply auth middleware
router.use(requireUserAuth);

/**
 * POST /api/habits/:habitId/relapse
 * Record a broken streak and reset streak counter (verified by user_id).
 */
router.post('/habits/:habitId/relapse', async (req, res) => {
  const habitId = parseInt(req.params.habitId, 10);
  const userId = req.userId;
  const { relapse_time, activity, feeling, trigger_reason, notes } = req.body;

  if (isNaN(habitId)) {
    return res.status(400).json({ error: 'Invalid habit ID.' });
  }

  if (!activity || activity.trim() === '') {
    return res.status(400).json({ error: 'Please specify what you were doing when the streak broke.' });
  }

  if (!feeling || feeling.trim() === '') {
    return res.status(400).json({ error: 'Please specify what you were feeling (e.g. stressed, bored, anxious).' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Verify that this habit belongs to the authenticated user
    const habitResult = await client.query(
      'SELECT id, name, current_streak_started_at FROM habits WHERE id = $1 AND user_id = $2',
      [habitId, userId]
    );

    if (habitResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Habit not found or unauthorized.' });
    }

    const habit = habitResult.rows[0];
    const relapseDate = relapse_time ? new Date(relapse_time) : new Date();
    const streakStartDate = new Date(habit.current_streak_started_at);

    // Calculate how many seconds the streak lasted
    const durationSeconds = Math.max(0, Math.floor((relapseDate.getTime() - streakStartDate.getTime()) / 1000));

    // 2. Insert the relapse questionnaire record
    const insertRelapseSql = `
      INSERT INTO relapses (
        habit_id, 
        relapse_time, 
        activity, 
        feeling, 
        trigger_reason, 
        notes, 
        streak_broken_seconds
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;

    const relapseValues = [
      habitId,
      relapseDate,
      activity.trim(),
      feeling.trim(),
      trigger_reason ? trigger_reason.trim() : null,
      notes ? notes.trim() : null,
      durationSeconds
    ];

    const relapseResult = await client.query(insertRelapseSql, relapseValues);
    const newRelapse = relapseResult.rows[0];

    // 3. Reset the habit's current streak start time to the relapse time
    const updateHabitSql = `
      UPDATE habits
      SET current_streak_started_at = $1
      WHERE id = $2 AND user_id = $3
      RETURNING *;
    `;
    const updatedHabitResult = await client.query(updateHabitSql, [relapseDate, habitId, userId]);
    const updatedHabit = updatedHabitResult.rows[0];

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Relapse check-in saved and streak reset.',
      relapse: newRelapse,
      habit: updatedHabit,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error logging relapse in transaction:', error);
    res.status(500).json({ error: 'Failed to record relapse and reset streak.' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/habits/:habitId/relapses
 * Retrieve full relapse history for a habit (verified by user ownership).
 */
router.get('/habits/:habitId/relapses', async (req, res) => {
  const habitId = parseInt(req.params.habitId, 10);
  const userId = req.userId;

  if (isNaN(habitId)) {
    return res.status(400).json({ error: 'Invalid habit ID.' });
  }

  try {
    // 1. Verify user owns the habit
    const checkHabit = await query('SELECT id FROM habits WHERE id = $1 AND user_id = $2', [habitId, userId]);
    if (checkHabit.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found or unauthorized.' });
    }

    // 2. Fetch relapse history
    const sql = `
      SELECT *
      FROM relapses
      WHERE habit_id = $1
      ORDER BY relapse_time DESC;
    `;
    const result = await query(sql, [habitId]);
    res.json(result.rows);
  } catch (error) {
    console.error(`Error fetching relapses for habit ${habitId}:`, error);
    res.status(500).json({ error: 'Failed to retrieve relapse history.' });
  }
});

/**
 * DELETE /api/relapses/:id
 * Delete a specific relapse entry (only if the parent habit is owned by current user).
 */
router.delete('/relapses/:id', async (req, res) => {
  const relapseId = parseInt(req.params.id, 10);
  const userId = req.userId;

  if (isNaN(relapseId)) {
    return res.status(400).json({ error: 'Invalid relapse ID.' });
  }

  try {
    const deleteSql = `
      DELETE FROM relapses
      WHERE id = $1
        AND habit_id IN (SELECT id FROM habits WHERE user_id = $2)
      RETURNING *;
    `;
    const result = await query(deleteSql, [relapseId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Relapse record not found or unauthorized.' });
    }

    res.json({ message: 'Relapse record removed.', deleted: result.rows[0] });
  } catch (error) {
    console.error(`Error deleting relapse ${relapseId}:`, error);
    res.status(500).json({ error: 'Failed to delete relapse log.' });
  }
});

module.exports = router;
