# Investment & Referral Management Platform

A production-grade **MERN Stack** application for managing investments and a 5-level referral
commission system, built for the NexaChain AI Technical Assessment.

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Project Setup Steps](#project-setup-steps)
5. [Environment Variables](#environment-variables)
6. [API Documentation](#api-documentation)
7. [Business Logic](#business-logic)
8. [Database Schema](#database-schema)
9. [Assumptions Made During Development](#assumptions-made-during-development)
10. [Git & GitHub Submission Guide](#git--github-submission-guide)
11. [Deployment Guide](#deployment-guide)
12. [Troubleshooting](#troubleshooting)

---

## Features

- JWT authentication (access + refresh tokens), bcrypt password hashing, account locking
- 4-tier investment plans (Basic, Standard, Premium, Elite) with configurable daily ROI
- Automated daily ROI cron job (idempotent — safe to run multiple times)
- 5-level referral income distribution (10% / 5% / 3% / 2% / 1%)
- Full audit trail via the `Transaction` collection
- Fintech-style React dashboard: stats cards, charts (Recharts), referral tree, wallet, profile
- Dark mode, skeleton loaders, error boundaries, toast notifications, in-app notification bell
- Security: Helmet, CORS, rate limiting, express-validator, Mongo injection protection

---

## Tech Stack

| Layer | Technology |
|---|---|
| Database | MongoDB + Mongoose |
| Backend | Node.js, Express.js |
| Auth | JWT, bcryptjs |
| Scheduling | node-cron |
| Frontend | React 18 (Vite), Tailwind CSS |
| Data Fetching | Axios, React Query (@tanstack/react-query) |
| Forms | React Hook Form |
| Charts | Recharts |
| Animation | Framer Motion |
| Notifications | react-hot-toast |

---

## Project Structure

```
investment-platform/
├── backend/
│   └── src/
│       ├── config/          # DB connection
│       ├── controllers/      # auth, investment, dashboard, referral
│       ├── middleware/       # JWT auth, error handler
│       ├── models/           # User, Investment, ROIHistory, ReferralIncome, Transaction
│       ├── routes/           # /api/auth, /api/investments, /api/dashboard, /api/referrals
│       ├── services/         # business logic
│       ├── validations/      # express-validator rules
│       ├── cron/              # daily ROI scheduler
│       ├── utils/             # logger
│       └── app.js
└── frontend/
    └── src/
        ├── components/
        │   ├── dashboard/     # StatsCard, WalletCard, InvestmentCard, ReferralTree
        │   ├── layout/        # Navbar, Sidebar
        │   └── ui/            # Button, Input, Skeleton, LoadingSpinner
        ├── context/           # AuthContext, ThemeContext, NotificationContext
        ├── hooks/              # useDashboard, useInvestments, useReferrals
        ├── layouts/            # AuthLayout, DashboardLayout
        ├── pages/              # Login, Register, Dashboard, Investments, Referrals, Wallet, Profile, NotFound
        ├── services/           # api.js (Axios client)
        └── utils/              # format.js, helpers.js
```

---

## Project Setup Steps

### Prerequisites
- Node.js v18+
- MongoDB (local instance or MongoDB Atlas)
- npm

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# edit .env with your values (see below)
npm run dev          # starts on http://localhost:5000
```

To enable the ROI cron job in development, set `ENABLE_CRON=true` in `.env`
(it runs automatically in `NODE_ENV=production`).

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# edit .env if your API runs on a different URL
npm run dev          # starts on http://localhost:3000
```

### 3. Seed data (optional)

You can register a few users through the UI — register your first user without a referral
code, then register subsequent users using the referral code/link from the first user's
**Referrals** page to test the multi-level commission logic end-to-end.

### 4. Trigger ROI manually (for testing)

The cron job runs at `00:00` daily. To test ROI distribution immediately without waiting,
you can call the service directly from a Node REPL or write a small script:

```js
// backend/testRoi.js
require('dotenv').config();
const { connectDB } = require('./src/config/database');
const ROIService = require('./src/services/roiService');

(async () => {
  await connectDB();
  const result = await ROIService.processDailyROI();
  console.log(result);
  process.exit(0);
})();
```

```bash
node testRoi.js
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|---|---|---|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `development` / `production` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/investment-platform` |
| `JWT_SECRET` | Secret for access tokens (32+ chars) | `your_super_secret_key...` |
| `JWT_EXPIRY` | Access token lifetime | `7d` |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens | `your_refresh_secret...` |
| `JWT_REFRESH_EXPIRY` | Refresh token lifetime | `30d` |
| `CORS_ORIGIN` | Comma-separated allowed origins | `http://localhost:3000` |
| `ROI_CRON_TIME` | Cron expression for ROI job | `0 0 * * *` (12:00 AM daily) |
| `CRON_TIMEZONE` | Timezone for cron | `UTC` |
| `ENABLE_CRON` | Force-enable cron in dev | `true` / `false` |
| `RATE_LIMIT_WINDOW_MS` | Rate-limit window | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

### Frontend (`frontend/.env`)

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `http://localhost:5000/api` |
| `VITE_API_TIMEOUT` | Axios timeout (ms) | `10000` |
| `VITE_APP_NAME` | Application name | `Investment Platform` |

---

## API Documentation

Base URL: `http://localhost:5000/api`

All protected routes require header: `Authorization: Bearer <accessToken>`

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | No | Register a new user (`fullName`, `email`, `mobileNumber`, `password`, `referralCode?`) |
| POST | `/login` | No | Login (`email`, `password`) |
| POST | `/refresh-token` | No | Get a new access token (`refreshToken`) |
| GET | `/profile` | Yes | Get current user profile |
| PUT | `/profile` | Yes | Update `fullName` / `mobileNumber` |
| POST | `/change-password` | Yes | Change password (`oldPassword`, `newPassword`, `confirmPassword`) |
| POST | `/logout` | Yes | Logout |

**Sample — POST `/api/auth/register`**

Request:
```json
{
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "mobileNumber": "9876543210",
  "password": "Passw0rd",
  "referralCode": "AB12CD"
}
```

Response `201`:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "65f...",
      "fullName": "Jane Doe",
      "email": "jane@example.com",
      "referralCode": "9F3A21",
      "walletBalance": 0,
      "totalROIEarned": 0,
      "totalLevelIncomeEarned": 0,
      "accountStatus": "active"
    },
    "tokens": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi..."
    }
  }
}
```

### Investments — `/api/investments` (all require auth)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/plans` | List available investment plans |
| POST | `/calculate-roi` | Calculate expected ROI (`investmentAmount`, `planName`) |
| POST | `/create` | Create investment (`investmentAmount`, `planName`) |
| GET | `/my-investments?status=&page=&limit=` | Paginated investment list |
| GET | `/summary` | Aggregate investment summary |
| GET | `/:id` | Investment details + ROI history |
| POST | `/:id/cancel` | Cancel an active investment |

**Sample — POST `/api/investments/create`**

Request:
```json
{ "investmentAmount": 50000, "planName": "standard" }
```

Response `201`:
```json
{
  "success": true,
  "message": "Investment created successfully",
  "data": {
    "_id": "65f...",
    "userId": "65e...",
    "investmentAmount": 50000,
    "planName": "standard",
    "dailyROIPercentage": 1,
    "status": "active",
    "startDate": "2024-01-15T00:00:00.000Z",
    "endDate": "2024-03-15T00:00:00.000Z",
    "totalROIGenerated": 0
  }
}
```

### Dashboard — `/api/dashboard` (all require auth)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/summary` | Wallet, investment, ROI, referral overview + recent transactions |
| GET | `/roi-stats` | ROI totals and monthly breakdown |
| GET | `/referral-stats` | Level-wise referral income breakdown |
| GET | `/monthly-breakdown?month=&year=` | ROI / referral / transaction breakdown for a month |
| GET | `/analytics?type=roi\|referral&days=30` | Time-series data for charts |
| GET | `/transaction-history?page=&limit=&type=` | Paginated transaction log |

**Sample — GET `/api/dashboard/summary`**

Response `200`:
```json
{
  "success": true,
  "data": {
    "user": { "fullName": "Jane Doe", "referralCode": "9F3A21", "accountStatus": "active" },
    "wallet": {
      "balance": 1250.50,
      "totalROIEarned": 1000.50,
      "totalLevelIncomeEarned": 250,
      "totalEarnings": 1250.50
    },
    "investments": {
      "totalInvested": 50000,
      "totalROIGenerated": 1000.50,
      "activeCount": 1,
      "completedCount": 0,
      "cancelledCount": 0,
      "totalActiveInvestment": 50000
    },
    "roi": { "todayROI": 500, "thisMonthROI": 1000.50, "totalROIEarned": 1000.50 },
    "referrals": { "directReferrals": 2, "totalReferrals": 5, "totalReferralIncome": 250 },
    "recentTransactions": [ ]
  }
}
```

### Referrals — `/api/referrals` (all require auth)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/direct?page=&limit=` | Direct (Level 1) referrals with investment stats |
| GET | `/tree?depth=5` | Full nested referral tree (up to 5 levels) |
| GET | `/income-history?level=&startDate=&endDate=&page=&limit=` | Referral income ledger |
| GET | `/summary` | Totals + per-level breakdown |
| GET | `/statistics` | Per-level count & income |
| GET | `/link` | Referral code + shareable link |
| GET | `/levels` | Static commission structure (10/5/3/2/1%) |

**Sample — GET `/api/referrals/tree`**

Response `200`:
```json
{
  "success": true,
  "data": {
    "_id": "65e...",
    "fullName": "Jane Doe",
    "email": "jane@example.com",
    "referralCode": "9F3A21",
    "level": 1,
    "childrenCount": 2,
    "children": [
      {
        "_id": "65f...",
        "fullName": "Referral A",
        "level": 2,
        "children": []
      }
    ]
  }
}
```

### Error Response Format

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Investment amount must be between 100 and 10000000",
  "errorCode": "BAD_REQUEST",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

### Postman Collection

Import the routes above into Postman by creating a collection with:
1. An **environment** containing `baseUrl = http://localhost:5000/api` and `accessToken`.
2. A pre-request script on protected requests: `Authorization: Bearer {{accessToken}}`.
3. Run `Login` first, then save `data.tokens.accessToken` into the `accessToken` variable
   (Postman → Tests tab: `pm.environment.set("accessToken", pm.response.json().data.tokens.accessToken)`).

---

## Business Logic

### Investment Plans

| Plan | Min | Max | Daily ROI | Duration |
|---|---|---|---|---|
| Basic | ₹100 | ₹50,000 | 0.5% | 30 days |
| Standard | ₹50,001 | ₹200,000 | 1% | 60 days |
| Premium | ₹200,001 | ₹500,000 | 1.5% | 90 days |
| Elite | ₹500,001 | ₹10,000,000 | 2% | 180 days |

### Daily ROI Distribution (Cron — `0 0 * * *`)

1. Find all `status: 'active'` investments where `startDate <= today < endDate`.
2. For each, check `ROIHistory` for an existing **credited** record with the same
   `(userId, investmentId, creditDate)` — if found, **skip** (idempotency guard, backed by a
   unique compound index).
3. Calculate `dailyROI = investmentAmount * dailyROIPercentage / 100`.
4. Write a new `ROIHistory` record, increment `investment.totalROIGenerated`, increment
   `user.walletBalance` and `user.totalROIEarned`, and write a `Transaction` record — all
   inside a single MongoDB session/transaction.

### Referral Income Distribution (on investment creation)

1. Starting from the investor, walk up the `referredBy` chain for up to **5 levels**.
2. At each level, if the ancestor's account is `active`, credit:
   `incomeAmount = investmentAmount * levelPercentage / 100`
   where `levelPercentage` = `[10, 5, 3, 2, 1]` for levels `[1, 2, 3, 4, 5]`.
3. Each credit creates a `ReferralIncome` record (status `credited`), increments
   `user.walletBalance` and `user.totalLevelIncomeEarned`, and writes a `Transaction` record —
   all inside a MongoDB session/transaction for consistency.

---

## Database Schema

- **User**: `fullName`, `email`, `mobileNumber`, `password` (hashed), `referralCode` (unique,
  auto-generated), `referredBy` (ref User), `walletBalance`, `totalROIEarned`,
  `totalLevelIncomeEarned`, `accountStatus`. Indexes: `email`, `referralCode`, `referredBy`,
  `accountStatus`, `createdAt`.
- **Investment**: `userId` (ref), `investmentAmount`, `planName`, `dailyROIPercentage`,
  `startDate`, `endDate`, `status`, `totalROIGenerated`, `lastROIDate`. Indexes:
  `userId+status`, `status+endDate`, `createdAt`.
- **ROIHistory**: `userId`, `investmentId`, `roiAmount`, `roiPercentage`, `creditDate`,
  `status`. **Unique compound index**: `(userId, investmentId, creditDate)` — guarantees
  idempotency.
- **ReferralIncome**: `receiverUserId`, `sourceUserId`, `level` (1-5), `incomeAmount`,
  `incomePercentage`, `investmentId`, `creditDate`, `status`, `transactionId`.
- **Transaction**: `userId`, `transactionType` (`roi_credit` / `referral_income` /
  `investment` / `withdrawal` / `refund` / ...), `amount`, `balanceBefore`, `balanceAfter`,
  `description`, `source`, `relatedDocuments`, `status`, `processedAt`. Acts as the full
  audit trail.

---

## Assumptions Made During Development

1. **Investment plans are fixed tiers** (Basic/Standard/Premium/Elite) defined in
   `investmentService.js` rather than a separate editable `Plan` collection, since the
   assessment didn't specify plan management as a deliverable. Switching to a DB-driven
   model would only require adding a `Plan` schema and reading from it in
   `getPlanDetails()`.
2. **Withdrawals are out of scope** for this assessment (not listed in required APIs), so
   the `Transaction` model supports a `withdrawal` type for future use but no withdrawal
   endpoint/UI is implemented yet.
3. **Referral income is credited once, at investment creation time**, based on the
   investment amount — not recurring on every daily ROI payout. This matches "Credit
   earnings to eligible ancestors" being tied to the investment event in Task 3.
4. **An inactive/suspended ancestor in the referral chain is skipped (not paid) but the
   traversal continues** to the next ancestor up the chain, rather than breaking the
   distribution entirely — this keeps the system fair to higher-level uplines.
5. **Referral codes are auto-generated** (12-character hex) at user creation rather than
   user-chosen, for uniqueness guarantees.
6. **The cron job is disabled by default in development** (`NODE_ENV !== 'production'`)
   unless `ENABLE_CRON=true` is set, to avoid unexpected wallet changes while developing.
   It is always enabled in production.
7. **Email verification and password-reset email delivery** are stubbed (token generation
   works, but no email service is wired up) since no SMTP provider was specified.
8. **Currency is INR (₹)** for all formatting, based on the assessment's example
   (`₹10,000 → ₹100/day`).
9. **In-app notifications** (the bell icon) are derived from the user's recent
   `Transaction` history rather than a separate `Notification` collection, since all
   relevant events (ROI credits, referral income, investments) already produce transaction
   records.

---

## Git & GitHub Submission Guide

From the project root (`investment-platform/`):

```bash
# 1. Initialize the repository (skip if already a git repo)
git init

# 2. Add a .gitignore (if not already present)
cat > .gitignore << 'EOF'
node_modules/
dist/
.env
logs/
*.log
.DS_Store
EOF

# 3. Stage and commit
git add .
git commit -m "Initial commit: Investment & Referral Management Platform"

# 4. Create the GitHub repository (via GitHub CLI) and push
gh repo create investment-referral-platform --public --source=. --remote=origin
git branch -M main
git push -u origin main
```

If you prefer to create the repo manually on GitHub.com first:

```bash
git remote add origin https://github.com/<your-username>/investment-referral-platform.git
git branch -M main
git push -u origin main
```

### Recommended commit history (optional, for clarity)

```bash
git add backend/src/models
git commit -m "feat: add Mongoose schemas with indexes (User, Investment, ROIHistory, ReferralIncome, Transaction)"

git add backend/src/services backend/src/controllers backend/src/routes backend/src/middleware backend/src/validations
git commit -m "feat: implement auth, investment, dashboard and referral APIs with JWT, validation and error handling"

git add backend/src/cron
git commit -m "feat: add idempotent daily ROI cron job"

git add frontend
git commit -m "feat: build React dashboard with auth, investments, referrals, wallet and profile pages"

git add README.md
git commit -m "docs: add full README with setup, env vars, API docs and assumptions"
```

### Submission checklist

- [ ] GitHub repository link (public or shared with reviewer)
- [ ] Database schema files — `backend/src/models/*.js`
- [ ] API source code — `backend/src/controllers`, `routes`, `middleware`
- [ ] Business logic — `backend/src/services/*.js`
- [ ] React dashboard — `frontend/src`
- [ ] Cron job — `backend/src/cron/scheduler.js`
- [ ] README — this file (setup, env vars, API docs, assumptions)

---

## Deployment Guide

### Backend (Render / Railway / Heroku / VPS)

```bash
# Set required environment variables on your platform of choice, then:
npm install --omit=dev
npm start
```

Ensure `MONGODB_URI` points to a reachable MongoDB instance (e.g. MongoDB Atlas) and
`NODE_ENV=production` so the cron job runs automatically.

### Frontend (Vercel / Netlify)

```bash
npm install
npm run build      # outputs to dist/
```

Set `VITE_API_URL` to your deployed backend's `/api` URL as an environment variable in the
hosting dashboard before building.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `MongoServerError: connect ECONNREFUSED` | Ensure MongoDB is running and `MONGODB_URI` is correct |
| CORS error in browser console | Add your frontend URL to `CORS_ORIGIN` in backend `.env` |
| `401 Unauthorized` after some time | Access token expired — the Axios interceptor auto-refreshes using `refreshToken`; if both are invalid, log in again |
| Cron job never runs in dev | Set `ENABLE_CRON=true` in backend `.env` |
| Notification bell shows nothing | It reads from `/api/dashboard/transaction-history` — create an investment first to generate transactions |
| Sidebar/Navbar not rendering | Run `npm install` in `frontend/` to ensure `framer-motion`, `react-hook-form`, `lucide-react`, and `clsx` are installed |

---

**Status**: Production-ready MVP — Version 1.0.0
