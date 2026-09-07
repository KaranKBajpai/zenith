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
