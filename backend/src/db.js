// ==============================================================================
// DATABASE CONNECTION MODULE (PostgreSQL with 'pg' Pool)
// ==============================================================================
// HOW THIS WORKS:
// - Local Environment: Uses host, port, user, password from docker-compose.
// - Cloud Hosting (Render / Railway / Supabase): Uses DATABASE_URL connection string!
// - Automatic Migration: Automatically creates 'habits' and 'relapses' tables on
//   startup if they do not exist yet, making Render deployments 100% plug-and-play.
// ==============================================================================

const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load settings from .env file into process.env
dotenv.config();

// Configuration: Prefer DATABASE_URL if available (standard on Render and cloud hosts)
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      // Render PostgreSQL requires SSL in production
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'tracker_user',
      password: process.env.DB_PASSWORD || 'tracker_password',
      database: process.env.DB_NAME || 'addiction_tracker',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

const pool = new Pool(poolConfig);

// Event listener: Logs unexpected errors on idle pool clients
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

/**
 * Helper function to run SQL queries safely with parameterized values.
 *
 * @param {string} text - SQL statement
 * @param {Array} params - Array of parameter values
 * @returns {Promise<import('pg').QueryResult>} - Query result object
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'production') {
      console.log(`[SQL Query] (${duration}ms):`, text.replace(/\s+/g, ' ').trim());
    }
    return res;
  } catch (error) {
    console.error('[SQL Error]:', error.message, 'in query:', text);
    throw error;
  }
};

/**
 * Ensures required database tables exist on startup.
 * Crucial for Render hosting so you don't have to run SQL scripts manually!
 */
const initDatabase = async () => {
  const schemaSql = `
    CREATE TABLE IF NOT EXISTS habits (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      reason_to_quit TEXT,
      category VARCHAR(50) DEFAULT 'general',
      current_streak_started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);

    CREATE TABLE IF NOT EXISTS relapses (
      id SERIAL PRIMARY KEY,
      habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      relapse_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      activity TEXT NOT NULL,
      feeling TEXT NOT NULL,
      trigger_reason TEXT,
      notes TEXT,
      streak_broken_seconds BIGINT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_relapses_habit_id ON relapses(habit_id);
    CREATE INDEX IF NOT EXISTS idx_relapses_relapse_time ON relapses(relapse_time DESC);
  `;

  try {
    await pool.query(schemaSql);
    console.log('✅ Database schema verified (tables & indexes ready).');
  } catch (err) {
    console.error('⚠️ Could not verify database schema:', err.message);
  }
};

/**
 * Verifies that the database is reachable on server startup.
 */
const testConnection = async () => {
  try {
    const res = await pool.query('SELECT NOW() as current_time, current_database() as db_name');
    console.log(`✅ Connected to PostgreSQL database "${res.rows[0].db_name}"`);
    await initDatabase();
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL database:');
    console.error('   Error details:', error.message);
    console.error('   👉 Tip: Ensure PostgreSQL is running locally or DATABASE_URL is set.');
    return false;
  }
};

module.exports = {
  pool,
  query,
  testConnection,
};
