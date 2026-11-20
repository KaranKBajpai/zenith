# Zenith

A web app that tells you what's visible in the sky above your location and when to look up.

## Status
In active development. Working today: accounts (Clerk), onboarding, the week view of passes, pass details, followed satellites, and saved locations with place search. Pass predictions are computed from live CelesTrak orbital data with Skyfield, and were validated against Heavens-Above (within 2 minutes). See `docs/build-plan.md` for what's built and what's next.

## Stack
- Frontend: React, TypeScript, Vite (Vercel)
- Backend: Python, FastAPI, Skyfield (Railway)
- Database: PostgreSQL

## Docs
- `docs/architecture.md` — architecture decisions and reasoning
- `docs/user-stories.md` — user stories and happy path
- `docs/build-plan.md` — what's built and what's next

## Spike
`spike/spike.py` — standalone script validating the core pass-prediction logic (fetches real orbital data, computes visible satellite passes, checked against Heavens-Above)

## Running locally

### Prerequisites
- Docker Desktop
- Python 3.12+
- Node.js 20.19+

### 1. Start the database
```bash
docker run --name zenith-db -e POSTGRES_PASSWORD=devpassword -e POSTGRES_DB=zenith -p 5432:5432 -d postgres
```

### 2. Start the backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:
```
DATABASE_URL=postgresql://postgres:devpassword@localhost:5432/zenith
CLERK_JWKS_URL=https://fun-ray-2730.clerk.accounts.dev/.well-known/jwks.json
```
(`CLERK_JWKS_URL` is where the backend gets Clerk's public keys to check sign-in tokens. It's public, not a secret.)

Set up the tables and the satellite catalog, then start the server:
```bash
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```
The API runs at http://localhost:8000 (interactive docs at http://localhost:8000/docs). On startup it fetches orbit data from CelesTrak and computes passes.

### 3. Start the frontend
In a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173 and create an account. Onboarding walks you through picking a place and the satellites to follow, then shows your week.

## Credits

- **Place search and town names:** © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), via [Nominatim](https://nominatim.org/). Map data is available under the Open Database License (ODbL).
- **Satellite orbit data:** [CelesTrak](https://celestrak.org/).