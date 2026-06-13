# Investment & Referral Management Platform

A full-stack MERN application for managing investments and a 5-level referral commission system.

---

## Table of Contents

1. [Project Setup Steps](#1-project-setup-steps)
2. [Environment Variables](#2-environment-variables)
3. [API Documentation](#3-api-documentation)
4. [Assumptions Made During Development](#4-assumptions-made-during-development)

---

## 1. Project Setup Steps

### Prerequisites

- Node.js v18+
- MongoDB (local instance or MongoDB Atlas)
- npm

---

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in your values — see Section 2
npm run dev
# Server starts at http://localhost:5000
```

> To test the ROI cron job without waiting for midnight, set `ENABLE_CRON=true` in `backend/.env`.

---

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Ensure VITE_API_URL=http://localhost:5000/api
npm run dev
# App starts at http://localhost:3000
```

---

### Test Data / Seeding

No seed scripts required. Use the Register page to create test users:

1. Register **User A** with no referral code — note their referral code from the Referrals page.
2. Register **User B** using User A's referral code → B becomes User A's Level 1 referral.
3. Register **User C** using User B's referral code → C is Level 2 for A, Level 1 for B.
4. Create investments as each user to trigger the 5-level commission distribution.

---

### Manual ROI Trigger (for testing)

The cron job runs at `00:00` UTC daily. To trigger ROI processing immediately:

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
node backend/testRoi.js
```

---

## 2. Environment Variables

### Backend — `backend/.env`

| Variable | Description | Example |
|---|---|---|
| `PORT` | Express server port | `5000` |
| `NODE_ENV` | Environment | `development` / `production` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/investment-platform` |
| `JWT_SECRET` | Access token signing secret (32+ chars) | `your_super_secret_key_32_chars` |
| `JWT_EXPIRY` | Access token lifetime | `7d` |
| `JWT_REFRESH_SECRET` | Refresh token signing secret | `your_refresh_secret_key` |
| `JWT_REFRESH_EXPIRY` | Refresh token lifetime | `30d` |
| `CORS_ORIGIN` | Comma-separated allowed origins | `http://localhost:3000` |
| `ROI_CRON_TIME` | Cron expression for ROI job | `0 0 * * *` |
| `CRON_TIMEZONE` | Timezone for cron | `UTC` |
| `ENABLE_CRON` | Force-enable cron in development | `true` / `false` |
| `RATE_LIMIT_WINDOW_MS` | Rate-limit window in ms | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window per IP | `100` |
| `LOG_LEVEL` | Logger output level | `debug` / `info` |

### Frontend — `frontend/.env`

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `http://localhost:5000/api` |
| `VITE_API_TIMEOUT` | Axios request timeout in ms | `10000` |
| `VITE_APP_NAME` | App display name | `Investment Platform` |
| `VITE_ENABLE_DARK_MODE` | Enable dark mode toggle | `true` |
| `VITE_ENABLE_NOTIFICATIONS` | Enable notification bell | `true` |

---

## 3. API Documentation

**Base URL:** `http://localhost:5000/api`

All protected routes require the header:
```
Authorization: Bearer <accessToken>
```

---

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | No | Register a new user |
| POST | `/login` | No | Login and receive tokens |
| POST | `/refresh-token` | No | Get a new access token using refresh token |
| POST | `/forgot-password` | No | Request a password reset email |
| POST | `/reset-password` | No | Reset password using the emailed token |
| GET | `/profile` | Yes | Get the authenticated user's profile |
| PUT | `/profile` | Yes | Update `fullName` / `mobileNumber` |
| POST | `/change-password` | Yes | Change password |
| POST | `/logout` | Yes | Logout and invalidate refresh token |

#### POST `/api/auth/register`

**Request body:**
```json
{
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "mobileNumber": "9876543210",
  "password": "Passw0rd",
  "referralCode": "AB12CD"
}
```

**Response `201`:**
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

#### POST `/api/auth/login`

**Request body:**
```json
{
  "email": "jane@example.com",
  "password": "Passw0rd"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "user": { "_id": "65f...", "fullName": "Jane Doe", "email": "jane@example.com" },
    "tokens": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi..."
    }
  }
}
```

---

### Investments — `/api/investments` *(all require auth)*

| Method | Endpoint | Description |
|---|---|---|
| GET | `/plans` | List all available investment plans |
| POST | `/calculate-roi` | Preview expected ROI before investing |
| POST | `/create` | Create a new investment |
| GET | `/my-investments` | Paginated list of user's investments |
| GET | `/summary` | Aggregate investment summary |
| GET | `/:id` | Investment details + ROI history |
| POST | `/:id/cancel` | Cancel an active investment |

#### GET `/api/investments/plans`

**Response `200`:**
```json
{
  "success": true,
  "data": [
    { "name": "basic",    "minAmount": 100,    "maxAmount": 50000,    "dailyROI": 0.5, "duration": 30  },
    { "name": "standard", "minAmount": 50001,  "maxAmount": 200000,   "dailyROI": 1.0, "duration": 60  },
    { "name": "premium",  "minAmount": 200001, "maxAmount": 500000,   "dailyROI": 1.5, "duration": 90  },
    { "name": "elite",    "minAmount": 500001, "maxAmount": 10000000, "dailyROI": 2.0, "duration": 180 }
  ]
}
```

#### POST `/api/investments/create`

**Request body:**
```json
{
  "investmentAmount": 50000,
  "planName": "standard"
}
```

**Response `201`:**
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

#### GET `/api/investments/my-investments`

**Query params:** `status` (active/completed/cancelled), `page` (default 1), `limit` (default 10)

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "investments": [ { "...": "..." } ],
    "pagination": { "total": 5, "page": 1, "limit": 10, "pages": 1 }
  }
}
```

---

### Dashboard — `/api/dashboard` *(all require auth)*

| Method | Endpoint | Description |
|---|---|---|
| GET | `/summary` | Wallet, investments, ROI, referrals overview + recent transactions |
| GET | `/roi-stats` | ROI totals and monthly breakdown |
| GET | `/referral-stats` | Level-wise referral income breakdown |
| GET | `/monthly-breakdown` | ROI/referral/transaction data for a given month |
| GET | `/analytics` | Time-series data for charts |
| GET | `/transaction-history` | Paginated transaction audit log |

#### GET `/api/dashboard/summary`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "user": { "fullName": "Jane Doe", "referralCode": "9F3A21", "accountStatus": "active" },
    "wallet": {
      "balance": 1250.50,
      "totalROIEarned": 1000.50,
      "totalLevelIncomeEarned": 250.00,
      "totalEarnings": 1250.50
    },
    "investments": {
      "totalInvested": 50000,
      "totalROIGenerated": 1000.50,
      "activeCount": 1,
      "completedCount": 0,
      "cancelledCount": 0
    },
    "roi": {
      "todayROI": 500,
      "thisMonthROI": 1000.50,
      "totalROIEarned": 1000.50
    },
    "referrals": {
      "directReferrals": 2,
      "totalReferrals": 5,
      "totalReferralIncome": 250
    },
    "recentTransactions": []
  }
}
```

#### GET `/api/dashboard/analytics`

**Query params:** `type` (roi / referral), `days` (default 30)

#### GET `/api/dashboard/transaction-history`

**Query params:** `page`, `limit`, `type` (roi_credit / referral_income / investment / withdrawal)

---

### Referrals — `/api/referrals` *(all require auth)*

| Method | Endpoint | Description |
|---|---|---|
| GET | `/direct` | Level 1 referrals with their investment stats (paginated) |
| GET | `/tree` | Full nested referral tree up to 5 levels |
| GET | `/income-history` | Referral income ledger with filters |
| GET | `/summary` | Totals and per-level income breakdown |
| GET | `/statistics` | Per-level member count and income |
| GET | `/link` | Referral code and shareable registration link |
| GET | `/levels` | Commission structure (10/5/3/2/1%) |

#### GET `/api/referrals/tree`

**Query params:** `depth` (1–5, default 5)

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "_id": "65e...",
    "fullName": "Jane Doe",
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

#### GET `/api/referrals/levels`

**Response `200`:**
```json
{
  "success": true,
  "data": [
    { "level": 1, "percentage": 10, "label": "Direct Referral" },
    { "level": 2, "percentage": 5,  "label": "Level 2" },
    { "level": 3, "percentage": 3,  "label": "Level 3" },
    { "level": 4, "percentage": 2,  "label": "Level 4" },
    { "level": 5, "percentage": 1,  "label": "Level 5" }
  ]
}
```

---

### Error Response Format

All errors follow this structure:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Investment amount must be between 100 and 10000000",
  "errorCode": "BAD_REQUEST",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

---

## 4. Assumptions Made During Development

1. **Investment plans are fixed tiers.** Basic / Standard / Premium / Elite are defined in `investmentService.js` rather than a separate editable `Plan` collection, since plan management was not listed as a required deliverable. Switching to a DB-driven model only requires adding a `Plan` schema and reading from it in `getPlanDetails()`.

2. **Withdrawals are out of scope.** The `Transaction` model includes a `withdrawal` type for future use, and `walletBalance` tracks available funds, but no withdrawal endpoint or UI was built as it was not listed in the required APIs.

3. **Referral income is credited once, at investment creation.** Commission is distributed to up to 5 ancestors at the moment a new investment is made — not on each daily ROI payout. This matches the assessment wording that ties the referral credit event to the investment.

4. **Inactive ancestors are skipped but the chain continues.** If an ancestor's `accountStatus` is not `active`, that level is skipped and the traversal moves to the next ancestor upward. This prevents a single suspended mid-level user from blocking commissions for higher-level uplines.

5. **Referral codes are auto-generated.** A 12-character uppercase hex string is generated via `crypto.randomBytes(6)` at registration rather than allowing user-chosen codes, ensuring uniqueness without additional validation.

6. **Email delivery is stubbed.** Token generation and expiry logic for email verification and password reset are implemented, but no SMTP provider is wired up since none was specified in the brief.

7. **Currency is INR (₹).** All amounts are formatted in Indian Rupees based on the assessment's example figures (₹10,000 investment → ₹100/day at 1% daily ROI).

8. **In-app notifications are derived from transactions.** The notification bell reads from `/api/dashboard/transaction-history` rather than a separate `Notification` collection, since every relevant event (ROI credit, referral income, investment creation) already produces a `Transaction` record.

9. **Cron job is disabled by default in development.** The daily ROI job only runs automatically when `NODE_ENV=production` or `ENABLE_CRON=true` is explicitly set, preventing unexpected wallet balance changes during manual testing.

10. **MongoDB transactions require a replica set.** ACID session/transaction wrapping (used in ROI and referral distribution) requires a replica set or MongoDB Atlas. For a standalone local instance, connect with `?replicaSet=rs0` or use MongoDB Atlas to get full transactional behaviour.
