-- ==============================================================================
-- DATABASE INITIALIZATION SCRIPT (PostgreSQL)
-- ==============================================================================
-- This script is automatically executed by PostgreSQL when the Docker container
-- starts for the first time (mounted in /docker-entrypoint-initdb.d/).
--
-- WHAT IS POSTGRESQL?
-- PostgreSQL is a powerful, open-source relational database system.
-- It stores information in tables made of rows and columns, with clear rules
-- and relationships between them.
-- ==============================================================================

-- 1. HABITS TABLE
-- Stores each habit/addiction that the user wants to overcome.
CREATE TABLE IF NOT EXISTS habits (
    -- Unique identifier for each habit. SERIAL automatically increments (1, 2, 3...)
    id SERIAL PRIMARY KEY,

    -- Clerk User ID: Ensures every user only sees their OWN private trackers.
    -- Example Clerk ID: "user_2aBcDeFg123456"
    user_id VARCHAR(255) NOT NULL,

    -- The name of the habit (e.g., "Smoking", "Binge Eating", "Doomscrolling")
    name VARCHAR(255) NOT NULL,

    -- The user's personal motivation for quitting (e.g., "Better health and save money")
    reason_to_quit TEXT,

    -- Optional visual identifier/category (e.g., "health", "screen", "substance")
    category VARCHAR(50) DEFAULT 'general',

    -- Timestamp when the CURRENT streak began.
    -- When a habit is first created, it defaults to the current date/time.
    -- Whenever a relapse occurs, this timestamp is reset to the relapse time.
    current_streak_started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Timestamp when this record was created in the database.
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index on user_id ensures fast lookup when querying a specific user's habits
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);

-- 2. RELAPSES TABLE
-- Stores every recorded slip-up/streak break, along with the psychological context
-- (what the user was doing, how they felt, what triggered it).
CREATE TABLE IF NOT EXISTS relapses (
    -- Unique identifier for each relapse entry
    id SERIAL PRIMARY KEY,

    -- Foreign Key: Links this relapse directly to a specific habit in the 'habits' table.
    -- ON DELETE CASCADE: If a habit is deleted, all its relapse history is automatically cleaned up.
    habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,

    -- The exact moment the relapse happened (user can pick past time or default to now)
    relapse_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- QUESTION 1: What was the person doing when they broke the streak?
    -- Example: "Working late on a stressful deadline", "Hanging out at a bar"
    activity TEXT NOT NULL,

    -- QUESTION 2: What emotional state or feelings were present?
    -- Example: "Anxious, exhausted, craving comfort"
    feeling TEXT NOT NULL,

    -- QUESTION 3: What specific trigger or reason caused it?
    -- Example: "Saw someone smoking outside", "Felt overwhelmed by an argument"
    trigger_reason TEXT,

    -- QUESTION 4: Reflection or strategy for next time
    -- Example: "Next time I feel overwhelmed, take a 10-minute walk instead"
    notes TEXT,

    -- Duration of the streak that was broken, stored in seconds for precise calculations
    streak_broken_seconds BIGINT NOT NULL DEFAULT 0,

    -- When this log entry was recorded
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes improve the speed of queries when looking up relapses by habit_id or date
CREATE INDEX IF NOT EXISTS idx_relapses_habit_id ON relapses(habit_id);
CREATE INDEX IF NOT EXISTS idx_relapses_relapse_time ON relapses(relapse_time DESC);

-- Database tables are initialized and ready for real authenticated Clerk users!
