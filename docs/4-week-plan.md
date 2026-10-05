# Zenith — 4-Week MVP Build Plan

**Target:** working, deployed v1 in 4 weeks
**Starting point:** architecture, spike validation, and full screen design already complete
**Target date:** MVP by ~Oct 25

---

## Week 1 — Backend foundation + API design ✅ COMPLETE

- [x] Repo cloned, project structure created
- [x] Postgres running locally in Docker
- [x] Database connection working (`database.py`, `.env`, tested)
- [x] Database models: User, Satellite, Location, Pass, FollowedSatellite (join table)
- [x] Tables created in Postgres and verified
- [x] API design finalized for Week 1 endpoints (designed from the built screens)
- [x] `GET /api/passes` working (mock data)
- [x] `POST /api/locations` working (real, validated with Pydantic)
- [x] `GET /api/satellites` working (real catalog from the database)
- [x] Routes split into `app/routers/` (Donovan's review feedback)

**Moved to Week 2:** Clerk. Sign-in happens in the frontend, which doesn't exist until Week 2, so both halves get built together.

---

## Week 2 — Core logic + real data

- [ ] **FIRST: Brightness.** Magnitude lookup table for the curated satellites, `magnitude` column on Satellite, per-pass brightness computed in the pass logic. Swap quality label from max altitude to real brightness
- [ ] Skyfield integration wired into backend (reusing validated spike logic)
- [ ] **Decide the partial-pass rule** — a pass can be sunlit at rise and shadowed seconds later. Counts as visible? Minimum visible duration? Show only the visible portion?
- [ ] Seed script for the satellite catalog (replaces the hand-typed psql inserts, so Railway can be seeded too)
- [ ] Scheduled job (APScheduler) fetching CelesTrak data
- [ ] Scheduled job computing real passes
- [ ] Passes table populated with real, computed data — `GET /api/passes` switched from mock to real
- [ ] Location CRUD fully working against the real database, including switching the active location
- [ ] Followed satellites: get my list, follow, unfollow — each one triggering a recompute of that user's passes
- [ ] Frontend project scaffolded: Vite + React + TypeScript, connected to backend
- [ ] **CORS configured for local development** so the frontend can call the backend
- [ ] **Clerk** — sign up / log in in the frontend, token checked in the backend, `TEST_USER_ID` replaced with the real user

---

## Week 3 — Frontend build-out

- [ ] Navigation pattern (navbar) built as a shared component first
- [ ] Signed-Out Landing built
- [ ] Home (week view) built
- [ ] Pass Detail built
- [ ] Sky Map built
- [ ] Onboarding built
- [ ] Followed Satellites built
- [ ] Saved Locations built
- [ ] Settings built
- [ ] **Desktop / wide-screen layout** — mobile layout first, then widen each screen
- [ ] Frontend wired to real backend endpoints, not mock data

---

## Week 4 — Deploy, test, polish

- [ ] **Spending limit set in Railway dashboard at signup**
- [ ] Backend + Postgres deployed on Railway
- [ ] Frontend deployed on Vercel
- [ ] **CORS updated for the deployed frontend and backend URLs**
- [ ] Automated tests for pass computation (validated against known-good spike values)
- [ ] Empty state handled
- [ ] Error state handled
- [ ] README finalized
- [ ] Demo account seeded, credentials in README
- [ ] **License added to repo (likely MIT)**
- [ ] Architecture doc updated to reflect final implementation
