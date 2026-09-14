// ==============================================================================
// HABITS ROUTES WITH USER PRIVACY (backend/src/routes/habits.js)
// ==============================================================================
// HOW USER PRIVACY WORKS:
// Each request passes through `requireUserAuth`, which sets `req.userId` from
// the Clerk session token.
//
// In every SQL query, we include:
//   `WHERE h.user_id = $1`
// This strictly ensures that:
// - User A can NEVER see User B's tracked addictions.
// - User A can NEVER modify or delete User B's habits.
// ==============================================================================

const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { requireUserAuth } = require('../middleware/auth');

// Apply auth middleware to all habit routes
router.use(requireUserAuth);

/**
 * GET /api/habits
 * Fetch all habits owned by the authenticated Clerk user.
 */
router.get('/', async (req, res) => {
  const userId = req.userId;

  try {
    const sql = `
      SELECT 
        h.id,
        h.user_id,
        h.name,
        h.reason_to_quit,
        h.category,
        h.current_streak_started_at,
        h.created_at,
        ROUND(EXTRACT(EPOCH FROM (NOW() - h.current_streak_started_at))) AS current_streak_seconds,
        COUNT(r.id)::INTEGER AS total_relapses,
        GREATEST(
          COALESCE(MAX(r.streak_broken_seconds), 0),
          ROUND(EXTRACT(EPOCH FROM (NOW() - h.current_streak_started_at)))
        ) AS longest_streak_seconds,
        COALESCE(SUM(r.streak_broken_seconds), 0) + ROUND(EXTRACT(EPOCH FROM (NOW() - h.current_streak_started_at))) AS cumulative_clean_seconds
      FROM habits h
      LEFT JOIN relapses r ON r.habit_id = h.id
      WHERE h.user_id = $1
      GROUP BY h.id
      ORDER BY h.created_at ASC;
    `;

    const result = await query(sql, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching habits for user:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve habits from the database.',
      message: error.message 
    });
  }
});

/**
 * GET /api/habits/:id
 * Retrieve single habit details and its relapse logs (verified by user_id).
 */
router.get('/:id', async (req, res) => {
  const habitId = parseInt(req.params.id, 10);
  const userId = req.userId;

  if (isNaN(habitId)) {
    return res.status(400).json({ error: 'Invalid habit ID parameter.' });
  }

  try {
    // 1. Fetch the habit and verify that it belongs to the authenticated user
    const habitSql = `
      SELECT 
        h.id,
        h.user_id,
        h.name,
        h.reason_to_quit,
        h.category,
        h.current_streak_started_at,
        h.created_at,
        ROUND(EXTRACT(EPOCH FROM (NOW() - h.current_streak_started_at))) AS current_streak_seconds,
        GREATEST(
          COALESCE((SELECT MAX(streak_broken_seconds) FROM relapses WHERE habit_id = h.id), 0),
          ROUND(EXTRACT(EPOCH FROM (NOW() - h.current_streak_started_at)))
        ) AS longest_streak_seconds
      FROM habits h
      WHERE h.id = $1 AND h.user_id = $2;
    `;
    const habitResult = await query(habitSql, [habitId, userId]);

    if (habitResult.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found or you do not have permission to view it.' });
    }

    // 2. Fetch all relapse logs for this habit
    const relapsesSql = `
      SELECT *
      FROM relapses
      WHERE habit_id = $1
      ORDER BY relapse_time DESC;
    `;
    const relapsesResult = await query(relapsesSql, [habitId]);

    const habit = habitResult.rows[0];
    habit.relapses = relapsesResult.rows;

    res.json(habit);
  } catch (error) {
    console.error(`Error fetching habit ${habitId}:`, error);
    res.status(500).json({ error: 'Failed to retrieve habit details.' });
  }
});

/**
 * POST /api/habits
 * Create a new habit / addiction tied to the authenticated user's Clerk ID.
 */
router.post('/', async (req, res) => {
  const userId = req.userId;
  const { name, reason_to_quit, category, current_streak_started_at } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Habit name is required.' });
  }

  try {
    const streakStart = current_streak_started_at ? new Date(current_streak_started_at) : new Date();

    const sql = `
      INSERT INTO habits (user_id, name, reason_to_quit, category, current_streak_started_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const values = [
      userId,
      name.trim(),
      reason_to_quit ? reason_to_quit.trim() : null,
      category || 'general',
      streakStart
    ];

    const result = await query(sql, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating habit:', error);
    res.status(500).json({ error: 'Failed to create new habit.' });
  }
});

/**
 * PUT /api/habits/:id
 * Update habit metadata (only if owned by current user).
 */
router.put('/:id', async (req, res) => {
  const habitId = parseInt(req.params.id, 10);
  const userId = req.userId;
  const { name, reason_to_quit, category, current_streak_started_at } = req.body;

  if (isNaN(habitId)) {
    return res.status(400).json({ error: 'Invalid habit ID.' });
  }

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Habit name cannot be empty.' });
  }

  try {
    const sql = `
      UPDATE habits
      SET 
        name = $1,
        reason_to_quit = $2,
        category = $3,
        current_streak_started_at = COALESCE($4, current_streak_started_at)
      WHERE id = $5 AND user_id = $6
      RETURNING *;
    `;

    const values = [
      name.trim(),
      reason_to_quit ? reason_to_quit.trim() : null,
      category || 'general',
      current_streak_started_at ? new Date(current_streak_started_at) : null,
      habitId,
      userId
    ];

    const result = await query(sql, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found or unauthorized to edit.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error updating habit ${habitId}:`, error);
    res.status(500).json({ error: 'Failed to update habit.' });
  }
});

/**
 * DELETE /api/habits/:id
 * Delete a habit (only if owned by current user).
 */
router.delete('/:id', async (req, res) => {
  const habitId = parseInt(req.params.id, 10);
  const userId = req.userId;

  if (isNaN(habitId)) {
    return res.status(400).json({ error: 'Invalid habit ID.' });
  }

  try {
    const result = await query(
      'DELETE FROM habits WHERE id = $1 AND user_id = $2 RETURNING id, name;',
      [habitId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found or unauthorized to delete.' });
    }

    res.json({ message: 'Habit deleted successfully.', deleted: result.rows[0] });
  } catch (error) {
    console.error(`Error deleting habit ${habitId}:`, error);
    res.status(500).json({ error: 'Failed to delete habit.' });
  }
});

module.exports = router;
