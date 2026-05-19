# Immersyte Quiz

Multi-tenant SaaS web application for a VR training company. VR training clients
evaluate learners after immersive headset sessions via a QR code → mobile-friendly
quiz flow.

- **Backend**: FastAPI + PostgreSQL + SQLAlchemy + Alembic
- **Frontend**: React (Vite) + Tailwind CSS
- **Auth**: JWT (access + refresh), bcrypt password hashing
- **QR codes**: generated server-side as printable PNG

---

## Architecture

Each client is an isolated **tenant** with its own slug, branding (logo + primary
color), modules, questionnaires, and learner responses. All authenticated database
queries are scoped by `tenant_id`.

Public quiz URL pattern:

```
https://quiz.immersyte.com/{tenant_slug}/{module_slug}
```

### Roles

| Role | Access |
|------|--------|
| **Super Admin** (Immersyte) | Manages tenants, modules, questionnaires; views all results; generates QR codes. Created via the seed script. |
| **Tenant Admin** | Logs in with email + password; views/filters/exports results for their tenant only. Cannot edit questionnaires. |
| **Learner** | Anonymous. Scans QR → enters name → answers quiz → sees score. No account. |

---

## Local development (Docker Compose)

Requirements: Docker + Docker Compose.

```bash
# Start all services (postgres, api, frontend)
docker compose up --build
```

On first start the API container automatically:
1. runs Alembic migrations (`alembic upgrade head`)
2. runs the seed script (`python seed.py`)

Services:

| Service | URL |
|---------|-----|
| Frontend | http://localhost:15173 |
| API | http://localhost:18000 |
| API docs (Swagger) | http://localhost:18000/docs |
| PostgreSQL | localhost:15432 |

> Host ports are deliberately non-standard (`15173`, `18000`, `15432`) to
> avoid clashing with services already running on the machine. Container
> ports are unchanged.

### Seeded accounts

| Account | Email | Password |
|---------|-------|----------|
| Super Admin | `florian@immersyte.com` | `ChangeMe123!` |
| Demo Tenant Admin | `formateur@logistique-dupont.fr` | `Formateur123!` |

Demo tenant `logistique-dupont` ships with a module `securite-chariot` and an
active questionnaire. Public quiz: http://localhost:15173/logistique-dupont/securite-chariot

---

## Running without Docker

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # edit values as needed
alembic upgrade head
python seed.py
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env          # set VITE_API_URL
npm run dev
```

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign JWTs — set a long random value |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime (default 30) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifetime (default 7) |
| `PUBLIC_QUIZ_BASE_URL` | Base URL encoded into QR codes |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins |
| `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` / `SUPER_ADMIN_NAME` | Seed Super Admin account |

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Base URL of the backend API |

---

## Key API endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/auth/login` | — | Login (Super Admin or Tenant Admin) |
| `POST` | `/auth/refresh` | — | Exchange a refresh token |
| `GET/POST/PATCH/DELETE` | `/tenants` | Super Admin | Tenant CRUD |
| `POST/DELETE` | `/tenants/{id}/admins` | Super Admin | Tenant admin management |
| `GET/POST/PATCH/DELETE` | `/modules`, `/tenants/{id}/modules` | Super Admin | Module CRUD |
| `GET` | `/modules/{id}/qr` | Super Admin | Download QR code PNG |
| `GET/POST/PUT/DELETE` | `/questionnaires` | Super Admin | Questionnaire builder |
| `GET` | `/public/quiz/{tenant}/{module}` | — (rate-limited) | Load public quiz |
| `POST` | `/public/quiz/start` | — (rate-limited) | Start a quiz session |
| `POST` | `/public/quiz/submit` | — (rate-limited) | Submit answers, get score |
| `GET` | `/results` | Tenant/Super Admin | List results (filterable) |
| `GET` | `/results/export.csv` | Tenant/Super Admin | CSV export |
| `GET` | `/results/{id}` | Tenant/Super Admin | Result detail |

Public quiz endpoints are rate-limited to **30 requests/min per IP**.

---

## Scoring

- MCQ questions are auto-scored (correct choice = 1 point).
- Open-text answers are not auto-scored — they are stored and shown in results
  for manual review.
- `score_percent = (correct MCQ answers / total MCQ questions) × 100`.

---

## Deployment

### Backend + PostgreSQL → Railway

1. Create a new Railway project and add a **PostgreSQL** plugin.
2. Add a new service from this repo, root directory `backend/`.
   Railway detects the `Dockerfile` automatically.
3. Set environment variables on the service:
   - `DATABASE_URL` → Railway's PostgreSQL URL, with the scheme changed to
     `postgresql+psycopg2://` (Railway provides `postgresql://`).
   - `JWT_SECRET` → a long random string.
   - `PUBLIC_QUIZ_BASE_URL` → your frontend URL (e.g. `https://quiz.immersyte.com`).
   - `CORS_ORIGINS` → your frontend URL.
   - `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` / `SUPER_ADMIN_NAME`.
4. The container's `entrypoint.sh` runs migrations + seed on every boot, then
   starts uvicorn on `$PORT` (Railway injects `PORT`).

### Frontend → Vercel

1. Import the repo into Vercel; set the **Root Directory** to `frontend/`.
2. Framework preset: **Vite**. Build command `npm run build`, output `dist`.
3. Set environment variable `VITE_API_URL` → your Railway backend URL.
4. `frontend/vercel.json` rewrites all routes to `index.html` so client-side
   routing (including `/{tenant}/{module}`) works.
5. Point your `quiz.immersyte.com` domain at the Vercel project.

---

## Project structure

```
backend/
  app/
    main.py          FastAPI app + middleware
    config.py        Settings (pydantic-settings)
    database.py      SQLAlchemy engine/session
    models.py        ORM models
    schemas.py       Pydantic schemas
    auth.py          Password hashing + JWT
    deps.py          Auth dependencies (role guards)
    qr.py            QR code PNG generation
    ratelimit.py     slowapi limiter
    routers/         auth, tenants, modules, questionnaires, public, results
  alembic/           Migrations (0001_initial)
  seed.py            Seeds Super Admin + demo tenant
  Dockerfile
frontend/
  src/
    api.js           Fetch wrapper with token refresh
    auth.jsx         Auth context
    App.jsx          Routes
    pages/           Login, PublicQuiz, super/*, tenant/*
    components/      Modal, ResultsView
  Dockerfile
docker-compose.yml
```
