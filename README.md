# Zenith

A web app that tells you what's visible in the sky above your location and when to look up.

## Status
Design phase. Core prediction logic validated (see `docs/spike-results.md` if present, or ask — validated against Heavens-Above within 2 minutes). Currently working through UI design.

## Stack
- Frontend: React, TypeScript, Vite (Vercel)
- Backend: Python, FastAPI, Skyfield (Railway)
- Database: PostgreSQL

## Docs
- `docs/architecture.md` — architecture decisions and reasoning
- `docs/user-stories.md` — user stories and happy path

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
```

Set up the tables, the satellite catalog and a test user, then start the server:
```bash
alembic upgrade head
python -m app.seed
docker exec -it zenith-db psql -U postgres -d zenith -c "INSERT INTO users (clerk_user_id, email) VALUES ('test_user_1', 'test@example.com');"
uvicorn app.main:app --reload
```
The API runs at http://localhost:8000 (interactive docs at http://localhost:8000/docs). On startup it fetches orbit data from CelesTrak and computes passes.

### 3. Add a location
Until sign-in is added, the app uses a single test user. Give it a location (this one becomes the active location):
```bash
curl -X POST http://localhost:8000/api/locations -H "Content-Type: application/json" -d '{"nickname": "Portland", "latitude": 45.52, "longitude": -122.68, "place_name": "Portland, OR"}'
```

### 4. Start the frontend
In a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173, go to **Manage satellites → + Add**, and follow a satellite to see its passes.