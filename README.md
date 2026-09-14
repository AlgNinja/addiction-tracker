# 🛡️ SoberTrack — Addiction & Streak Tracker with Clerk Authentication

A full-stack web application designed to help people overcome addictions and unwanted habits with **privacy and user isolation**. Users can track multiple habits, watch clean streaks tick in real-time down to the second, and conduct structured, mindful **Relapse Check-Ins** whenever a streak breaks to document root causes (context, emotions, triggers, and forward-looking action plans).

Built with **React (Vite)** on the frontend, **Express.js on Node.js** on the backend, **PostgreSQL** in **Docker**, and **Clerk Authentication** for private user accounts.

---

## 📚 Table of Contents
1. [Architecture & Clerk Auth Flow](#-architecture--clerk-auth-flow)
2. [Project Structure](#-project-structure)
3. [Prerequisites](#-prerequisites)
4. [Quick Start Guide (Step-by-Step)](#-quick-start-guide-step-by-step)
5. [How Clerk Authentication & Privacy Work](#-how-clerk-authentication--privacy-work)
6. [Database Schema with User Isolation](#-database-schema-with-user-isolation)
7. [API Endpoints Reference](#-api-endpoints-reference)
8. [Configuring Your Clerk Keys](#-configuring-your-clerk-keys)
9. [Educational File Tour](#-educational-file-tour)

---

## 🏛️ Architecture & Clerk Auth Flow

```
┌────────────────────────────────────────────────────────┐
│               FRONTEND: React + Vite                   │
│           (Runs on http://localhost:5173)              │
│  - Clerk React SDK (<ClerkProvider>, <UserButton>)     │
│  - Fetches JWT token via useAuth().getToken()          │
│  - Live ticking countdown (Days, Hours, Mins, Secs)    │
│  - Mindful Relapse Questionnaire Modal (5 questions)   │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP JSON API Requests
                            │ Header: Authorization: Bearer <clerk_jwt>
                            ▼
┌────────────────────────────────────────────────────────┐
│             BACKEND: Node.js + Express                 │
│           (Runs on http://localhost:5000)              │
│  - @clerk/express verifies cryptographic token         │
│  - Extracts authenticated req.userId                   │
│  - Strictly isolates queries: WHERE user_id = $userId  │
└───────────────────────────┬────────────────────────────┘
                            │ TCP Connection (Port 5432)
                            ▼
┌────────────────────────────────────────────────────────┐
│             DATABASE: PostgreSQL 16 (Docker)           │
│  - Table: habits (user_id, name, current_streak_start) │
│  - Table: relapses (habit_id, activity, feeling, notes)│
│  - Indexed on user_id for fast private queries         │
└────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
addiction-tracker/
├── docker-compose.yml              # Starts the PostgreSQL database container
├── package.json                    # Root scripts (db:up, backend:dev, frontend:dev)
├── init-db/
│   └── 01-init.sql                 # Database schema with user_id & seed data
│
├── backend/                        # Node.js + Express REST API
│   ├── .env.example                # Template for environment configuration
│   ├── .env                        # Database credentials & Clerk Secret Key
│   ├── package.json                # Dependencies: express, @clerk/express, pg, cors
│   └── src/
│       ├── server.js               # Express entrypoint & Clerk middleware
│       ├── db.js                   # PostgreSQL connection pool & queries
│       ├── middleware/
│       │   └── auth.js             # Clerk JWT verification & Dev Mode fallback
│       └── routes/
│           ├── habits.js           # User-scoped habit CRUD endpoints
│           └── relapses.js         # User-scoped relapse check-in routes
│
└── frontend/                       # React Single Page Application (SPA)
    ├── vite.config.js              # Vite server & API proxy configuration
    ├── index.html                  # HTML template
    ├── .env.example                # Template for Clerk publishable key
    ├── .env                        # VITE_CLERK_PUBLISHABLE_KEY
    ├── package.json                # Dependencies: react, @clerk/clerk-react, lucide-react
    └── src/
        ├── main.jsx                # Entrypoint & ClerkProvider configuration
        ├── App.jsx                 # Main component & state coordinator
        ├── App.css                 # Application layout, timer & modal styling
        ├── index.css               # Design tokens & color palette
        ├── api.js                  # HTTP client injecting Clerk Bearer tokens
        └── components/
            ├── ClerkAuthWrapper.jsx # Handles <SignedIn> / <SignedOut> screens
            ├── HabitList.jsx        # Sidebar listing current user's habits
            ├── HabitDetail.jsx      # Live ticking timer, stats & milestones
            ├── RelapseModal.jsx     # 5-question guided check-in questionnaire
            ├── RelapseHistory.jsx   # Relapse history & pattern insight cards
            └── AddHabitModal.jsx    # Modal form to register a new habit
```

---

## 📋 Prerequisites

1. **Docker & Docker Compose** installed and running.
2. **Node.js** (v18 or newer) and **npm** installed.

---

## 🚀 Quick Start Guide (Step-by-Step)

### Step 1: Start PostgreSQL (Docker)
In the project root directory, run:
```bash
docker compose up -d
```
> **What this does:** Starts a PostgreSQL 16 container, mounts a persistent volume `pgdata`, and initializes the schema from `init-db/01-init.sql`.

---

### Step 2: Start the Express Backend
Open a terminal and navigate to `backend/`:
```bash
cd backend
npm install
npm run dev
```
> Runs at **http://localhost:5000**.

---

### Step 3: Start the React Frontend
Open a **second terminal** and navigate to `frontend/`:
```bash
cd frontend
npm install
npm run dev
```
> Runs at **http://localhost:5173**. Open this URL in your web browser!

---

## 🔒 How Clerk Authentication & Privacy Work

### 1. Zero Knowledge Across Users (Row-Level Security)
Every habit row in the PostgreSQL `habits` table has a `user_id` column:
```sql
SELECT * FROM habits WHERE user_id = $1;
```
Because the `user_id` is derived strictly from the verified Clerk JWT token on the server (`req.userId`), **User A can never read, modify, or delete User B's habits or relapse logs**.

### 2. Built-in Dev Mode (Immediate Testing)
If you haven't set up a Clerk account yet, the application automatically runs in **Dev Mode**:
- A sleek top bar lets you switch between different test profiles (**Demo User**, **Alice**, **Bob**).
- You can create a habit as Alice, switch to Bob, and confirm that Bob cannot see Alice's data!
- When you are ready to use real accounts with Google/Email login, paste your Clerk API keys into `.env` and Clerk takes over automatically.

---

## 🔑 Configuring Your Clerk Keys

To enable live Google, GitHub, and email logins with Clerk:

1. Go to [https://clerk.com](https://clerk.com) and create a **Free** account.
2. Create a new Application (e.g., "SoberTrack").
3. Navigate to **API Keys** in the Clerk dashboard.
4. Copy the keys into your `.env` files:

**In `frontend/.env`:**
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_CLERK_PUBLISHABLE_KEY
```

**In `backend/.env`:**
```env
CLERK_SECRET_KEY=sk_test_YOUR_CLERK_SECRET_KEY
CLERK_PUBLISHABLE_KEY=pk_test_YOUR_CLERK_PUBLISHABLE_KEY
```

5. Restart the backend (`npm run dev`) and frontend (`npm run dev`). Your app now has enterprise-grade authentication!

---

## 🗄️ Database Schema with User Isolation

### `habits` Table
| Column | Type | Description |
|---|---|---|
| `id` | `SERIAL PRIMARY KEY` | Auto-incrementing habit ID |
| `user_id` | `VARCHAR(255) NOT NULL` | Clerk User ID (owner) |
| `name` | `VARCHAR(255) NOT NULL` | Addiction name (e.g. "Nicotine Vaping") |
| `reason_to_quit` | `TEXT` | Core motivation statement |
| `category` | `VARCHAR(50)` | Category tag (health, screen, etc.) |
| `current_streak_started_at` | `TIMESTAMPTZ NOT NULL` | Timestamp when current streak began |
| `created_at` | `TIMESTAMPTZ` | Record creation timestamp |

### `relapses` Table
| Column | Type | Description |
|---|---|---|
| `id` | `SERIAL PRIMARY KEY` | Auto-incrementing relapse ID |
| `habit_id` | `INTEGER REFERENCES habits(id) ON DELETE CASCADE` | Habit foreign key |
| `relapse_time` | `TIMESTAMPTZ NOT NULL` | Time when streak broke |
| `activity` | `TEXT NOT NULL` | What user was doing (context) |
| `feeling` | `TEXT NOT NULL` | Feelings / emotional triggers |
| `trigger_reason` | `TEXT` | Root trigger or situation |
| `notes` | `TEXT` | Action plan for next time |
| `streak_broken_seconds` | `BIGINT NOT NULL` | Broken streak length |
| `created_at` | `TIMESTAMPTZ` | Entry timestamp |

---

## 🔌 API Endpoints Reference

All endpoints automatically extract and verify the user's Clerk ID:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Backend status & whether Clerk auth is active |
| `GET` | `/api/habits` | List all habits for the logged-in user |
| `GET` | `/api/habits/:id` | Get user's habit details and its relapse logs |
| `POST` | `/api/habits` | Create a new habit owned by the user |
| `PUT` | `/api/habits/:id` | Update habit details (ownership verified) |
| `DELETE`| `/api/habits/:id` | Delete habit and cascading relapses |
| `POST` | `/api/habits/:id/relapse` | Submit 5-question check-in & reset streak |
| `GET` | `/api/habits/:id/relapses`| Fetch user's relapse history |
| `DELETE`| `/api/relapses/:id` | Delete an accidental relapse entry |

---

## 📖 Educational File Tour

To learn how this stack works:

1. **`backend/src/middleware/auth.js`**:
   Learn how incoming JWT Bearer tokens from Clerk are cryptographically validated in Node.js and attached to `req.userId`.
2. **`backend/src/routes/habits.js`**:
   See how `WHERE h.user_id = $1` enforces privacy in PostgreSQL.
3. **`frontend/src/api.js`**:
   Learn how the browser attaches the `Authorization: Bearer <token>` header to fetch calls.
4. **`frontend/src/components/ClerkAuthWrapper.jsx`**:
   Learn how `<SignedIn>` and `<SignedOut>` conditionally render landing pages or authenticated dashboards.
5. **`frontend/src/components/RelapseModal.jsx`**:
   Explore how controlled inputs and emotion chips capture psychological triggers without overwhelming the user.

---

## ☁️ Hosting on Render (Step-by-Step)

You can host this entire stack (React + Express + PostgreSQL) on [Render](https://render.com) using their Free Tier.

### Option 1: One-Click Blueprint (Recommended)
This repository includes a [`render.yaml`](file:///home/alg2x/addiction-tracker/render.yaml) file that automatically configures the PostgreSQL database and the Node web service together.

1. Push this project to your **GitHub** account.
2. Go to [https://dashboard.render.com](https://dashboard.render.com).
3. Click **New +** → **Blueprint**.
4. Select your GitHub repository.
5. Render will read `render.yaml` and prompt you to enter your **Clerk keys**:
   - `CLERK_SECRET_KEY`: `sk_test_...`
   - `CLERK_PUBLISHABLE_KEY`: `pk_test_...`
   - `VITE_CLERK_PUBLISHABLE_KEY`: `pk_test_...`
6. Click **Apply**. Render will:
   - Create your PostgreSQL database.
   - Build your React frontend (`npm run build`).
   - Run Express to serve both the API and the React frontend on your free live URL (`https://your-app.onrender.com`).
   - Automatically initialize all database tables upon startup!

---

### Option 2: Manual Setup on Render Dashboard

#### 1. Create the Database:
1. Click **New +** → **PostgreSQL**.
2. Name it `sobertrack-db` (choose the Free tier).
3. Once created, copy the **Internal Database URL**.

#### 2. Create the Web Service:
1. Click **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Configure the settings:
   - **Environment:** `Node`
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
4. Under **Environment Variables**, add:
   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | *(Paste Internal Database URL from step 1)* |
   | `CLERK_SECRET_KEY` | *(Your Clerk Secret Key)* |
   | `CLERK_PUBLISHABLE_KEY` | *(Your Clerk Publishable Key)* |
   | `VITE_CLERK_PUBLISHABLE_KEY` | *(Your Clerk Publishable Key)* |
5. Click **Create Web Service**.

Once deployed, your full-stack addiction tracker will be live on the web with SSL and Clerk authentication!
