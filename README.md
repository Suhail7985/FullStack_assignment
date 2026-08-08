# PulseReview

**Multi-tenant monthly performance feedback for managers, employees, and HR.**

One login. Many companies. Strict tenant isolation. Flexible org hierarchies. Immutable monthly history.

> **What this evaluates:** whether the data model holds up for real org shapes — not just whether demo screens look right.

---

## Why this model

Pilot users described two very different companies:

| Company | Shape |
| --- | --- |
| **Ashoka Textiles** | Multi-level: `COO → Rohan → Priya → 6 employees` |
| **Bright Path Consulting** | Flat: `Founder → 8 employees` (no middle layer) |

Plus HR needs “who hasn’t submitted yet?” and employees need scores over time per parameter.

Hard-coding hierarchy depth, or storing scores on the employee document, would break under either scenario. This design does not.

---

## Quick start

**Prerequisites:** Node.js 18+, MongoDB running locally.

```bash
# 1. Install
cd server && npm install && cp .env.example .env
cd ../client && npm install

# 2. Seed demo data
cd ../server && npm run seed

# 3. Run API (terminal 1)
npm run dev

# 4. Run UI (terminal 2)
cd ../client && npm run dev
```

Open **http://localhost:5173**

| | |
| --- | --- |
| API | http://localhost:5000 |
| Password (all demo users) | `Password123!` |

---

## Deploy to Vercel

The app is set up as **one Vercel project**: Vite frontend + Express API as a serverless function under `/api`. MongoDB must be hosted in the cloud (free **MongoDB Atlas** cluster).

### 1. Create a free Atlas database

1. Sign up at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a **free M0** cluster
3. **Database Access** → create a user + password
4. **Network Access** → add IP `0.0.0.0/0` (allow Vercel)
5. **Connect** → Drivers → copy the URI, e.g.  
   `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/performance_eval?retryWrites=true&w=majority`

### 2. Seed Atlas (from your machine)

```bash
# In server/.env temporarily point at Atlas, then seed
cd server
# set MONGO_URI to your Atlas URI in .env
npm run seed
```

### 3. Deploy

```bash
# from repo root
npm install
vercel login
vercel
```

When prompted, accept defaults (link to existing project or create new).

Then set production env vars:

```bash
vercel env add MONGO_URI
vercel env add JWT_SECRET
vercel env add CLIENT_ORIGIN
vercel env add JWT_EXPIRES_IN
vercel env add NODE_ENV
```

Suggested values:

| Variable | Value |
| --- | --- |
| `MONGO_URI` | your Atlas connection string |
| `JWT_SECRET` | a long random string |
| `CLIENT_ORIGIN` | your Vercel URL, e.g. `https://your-app.vercel.app` (or `*` for demos) |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |

Redeploy so env vars apply:

```bash
vercel --prod
```

The live app will be at `https://<project>.vercel.app`. API health: `https://<project>.vercel.app/api/health`.

> Frontend calls `/api` on the **same domain**, so no separate backend URL is required.

---

## Demo accounts

### Ashoka Textiles

| Role | Email |
| --- | --- |
| HR (Kavita) | `hr@ashoka.test` |
| Manager (Rohan) | `rohan@ashoka.test` |
| Manager (Priya) | `priya@ashoka.test` |
| Employee | `employee1@ashoka.test` |
| COO | `coo@ashoka.test` |

### Bright Path Consulting

| Role | Email |
| --- | --- |
| Founder | `founder@brightpath.test` |
| HR | `hr@brightpath.test` |
| Employee | `bp.employee1@brightpath.test` |

### Seeded pending state (August 2026)

- Ashoka: **Priya → Employee 6**
- Bright Path: **Founder → BP Employee 7 & 8**

History is seeded for **May–August 2026** so performance charts are meaningful out of the box.

---

## 5-minute demo path

1. **Priya** (`priya@ashoka.test`) → Team Feedback → submit all 5 scores for Employee 6  
2. **Rohan** (`rohan@ashoka.test`) → confirm Priya is his review target (multi-level hierarchy)  
3. **Founder** (`founder@brightpath.test`) → 8 direct reports, no middle manager  
4. **HR** (`hr@ashoka.test`) → August cycle → expected / submitted / pending + drill-down  
5. **Employee** (`employee1@ashoka.test`) → My Performance → history table + parameter chart  

---

## Architecture

```text
React (Vite + Tailwind + Recharts)
              │
         REST + JWT
              │
         Express.js
              │
     MongoDB (Mongoose)
```

| Layer | Stack |
| --- | --- |
| Frontend | React, Vite, React Router, Tailwind CSS, Axios, Recharts |
| Backend | Node.js, Express, JWT, bcryptjs, express-validator |
| Database | MongoDB |

---

## Data model (core of the assignment)

```text
Company
   └── Employee  (managerId → Employee | null)
          │
FeedbackCycle (company + year + month)
   ├── FeedbackAssignment  (expected reviewer → employee)
   └── Feedback            (one row per parameter score)
          └── PerformanceParameter  (5 global fixed params)
```

### Collections

| Model | Purpose |
| --- | --- |
| **Company** | Tenant. Unique `name` / `slug`. |
| **Employee** | Belongs to one company. Optional `managerId` drives who reviews whom. |
| **PerformanceParameter** | Five fixed params shared by all companies (not per-tenant). |
| **FeedbackCycle** | Company-specific monthly period (`open` / `closed`). |
| **Feedback** | One document: cycle + reviewer + employee + parameter → score + reason. |
| **FeedbackAssignment** | Expected review pairs for a cycle (HR completion math). |

### Design decisions that matter

**1. Who reviews whom comes from `managerId`, not role**

```text
Ashoka:     COO → Rohan → Priya → Employee 1..6
Bright Path: Founder → Employee 1..8
```

Same schema. No hard-coded hierarchy levels. `managerId = null` is valid (top of tree / HR).

Roles (`employee`, `manager`, `hr`, `founder`, …) gate screens (e.g. HR dashboard). Authorization to *submit* feedback always checks:

```text
employee.managerId === authenticatedReviewer
AND same companyId
```

**2. Scores live on Feedback rows, never on Employee**

Bad (breaks history):

```text
employee.ownershipScore = 4
```

Good (scales forever):

```text
Priya → Rahul → July    → Ownership → 4
Priya → Rahul → August  → Ownership → 5
```

Historical months are never overwritten. Closed cycles reject new submissions.

**3. Why `FeedbackAssignment` exists**

HR asks: expected / submitted / pending — without hard-coded names.

Assignments are snapshotted from `managerId` when a cycle is created. If the org chart changes later, **past cycles keep their expected set**. Completion = all 5 parameter Feedback rows present.

**4. Multi-tenancy is backend-enforced**

```text
JWT → employeeId, companyId, role
         │
         ▼
Every query filters by req.user.companyId
companyId / reviewerId from the client body are never trusted
```

Ashoka users cannot touch Bright Path data (and vice versa), even with forged URL params.

---

## Scenarios covered

| # | Scenario | How the model handles it |
| --- | --- | --- |
| 1 | Ashoka multi-level hierarchy | Self-referencing `managerId` chain |
| 2 | Priya reviews 6 reports | Assignments where `reviewerId = Priya` |
| 3 | Rohan reviews Priya | Same mechanism, one level up |
| 4 | Founder reviews 8 people flat | Direct `managerId` links, no middle manager required |
| 5 | HR pending tracking | Aggregate `FeedbackAssignment` by status |
| 6 | Employee score history | Query Feedback by employee across cycles |

Adding Company 3, a 4-level org, or 50 direct reports does not require a schema change.

---

## Apps

### Employee app
- Login (shared across companies)
- Dashboard + direct team
- Give feedback (all 5 params, score 1–5 + required reason)
- Received feedback by month
- Performance history table + optional parameter trend chart

### HR app
- Cycle selector
- Expected / completed / pending / completion %
- Per-reviewer breakdown
- Pending drill-down (`Reviewer → Employee`)

---

## API

Consistent response shape:

```json
{ "success": true, "data": {} }
```

```json
{ "success": false, "message": "Feedback already submitted" }
```

| Method | Path | Access |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Public |
| `GET` | `/api/auth/me` | Auth |
| `GET` | `/api/employees/me` | Auth |
| `GET` | `/api/employees/team` | Auth (direct reports) |
| `GET` | `/api/employees/:id` | Auth + authorization |
| `GET` | `/api/parameters` | Auth |
| `GET` | `/api/feedback/cycles` | Auth |
| `GET` | `/api/feedback/to-give` | Auth (reviewer) |
| `POST` | `/api/feedback` | Auth (must be manager of employee) |
| `GET` | `/api/feedback/received` | Auth (own) |
| `GET` | `/api/performance/history` | Auth (own) |
| `GET` | `/api/performance/history/:employeeId` | Self / manager / HR |
| `GET` | `/api/hr/feedback-status` | HR |
| `GET` | `/api/hr/pending-feedback` | HR |
| `GET` | `/api/hr/feedback-summary` | HR |

---

## Integrity & edge cases

| Case | Behavior |
| --- | --- |
| Duplicate feedback | Blocked — unique index on `cycle + reviewer + employee + parameter` → **409** |
| Incomplete review (e.g. 3 of 5 params) | Rejected → **400** |
| Unauthorized reviewer | Rejected → **403** |
| Cross-company access | Impossible — tenant filter → **403/404** |
| Closed cycle | Submissions rejected → **403** |
| Empty history | Clear empty state in UI |
| Missing manager (`managerId = null`) | Valid |

---

## Indexes

| Collection | Indexes |
| --- | --- |
| Employee | `companyId`, `companyId + managerId`, unique `email` |
| FeedbackCycle | unique `companyId + year + month` |
| Feedback | unique `cycleId + reviewerId + employeeId + parameterId` (+ company/cycle/reviewer/employee/parameter lookups) |
| FeedbackAssignment | unique `cycleId + reviewerId + employeeId`; `companyId + cycleId + status` |

---

## Environment

`server/.env.example`:

```env
MONGO_URI=mongodb://127.0.0.1:27017/performance_eval
JWT_SECRET=change-me-to-a-long-random-secret
JWT_EXPIRES_IN=7d
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
```

Do not commit real secrets. `server/.env` is gitignored.

---

## Tests

```bash
cd server && npm test
```

Covers the scenarios the data model must prove:

1. Priya can review her reports  
2. Rohan can review Priya  
3. Founder can review employees directly  
4. Priya cannot review Bright Path employees  
5. Duplicate feedback blocked  
6. Incomplete review blocked  
7. Historical feedback remains accessible  
8. HR can see pending feedback  
9. Non-HR cannot access HR endpoints  
10. Employee can only access own performance history  

Uses DB `performance_eval_test` (override with `MONGO_URI_TEST`).

---

## Assumptions

- Each employee belongs to **exactly one** company.
- An employee has **zero or one** direct manager; chains can be arbitrarily deep.
- A reviewer may submit feedback only for **direct reports** (`employee.managerId === reviewer`).
- Every monthly review uses the **same five** global parameters; scores are integers **1–5** with a required written reason.
- A review is complete only when **all five** parameter responses are submitted.
- Feedback cycles are **company-specific**; closed cycles are immutable.
- Historical reviews are never overwritten.
- One shared login serves all tenants; isolation is enforced on the **backend**, not the UI.
- Feedback assignments are created from the org chart at cycle creation time (so past HR stats stay accurate if the chart changes later).

---

## Project layout

```text
FullStack_Asignment/
├── README.md
├── package.json          # convenience scripts
├── .env.example
├── server/
│   ├── .env.example
│   ├── src/
│   │   ├── models/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── seed/
│   │   └── utils/
│   └── tests/
└── client/
    └── src/
        ├── pages/
        ├── components/
        ├── context/
        └── api/
```

---

## License

Take-home assignment sample.
