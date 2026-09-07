# Zenith — Architecture Decisions

**Author:** Karan Bajpai
**Last updated:** September 1, 2026
**Status:** All core decisions made. API design and UI design still to come.

---

## What Zenith is

A web app that tells you what's visible in the sky above your location and when to look up.

**v1 scope:** satellite passes. You create an account, set your location, choose satellites to follow, and see when each one will be visible from where you are — including which direction to look and how long it lasts — with a notification before it happens.

**Why it isn't an API wrapper:** no data source returns "the ISS passes over Portland at 9:42pm tonight." The sources publish raw orbital element sets. The app computes the answer — propagating orbits forward in time, converting positions into what an observer at a specific location would see, and filtering for genuine visibility (the satellite must be sunlit *and* the observer in darkness at the same moment).

---

## Architecture at a glance

Three pieces in three places:

| Piece | What it is | Where it runs |
|---|---|---|
| **Frontend** | React + TypeScript, built with Vite → static files | Vercel |
| **Backend** | Python + FastAPI, always-on service | Railway |
| **Database** | PostgreSQL (managed) | Railway |

The browser loads static files from Vercel, then makes requests over the internet to the backend on Railway. Because they sit on different domains, CORS configuration is required.

---

## Decision 1 — Client platform: **web app (PWA, mobile responsive)**

### Options evaluated

**Native Swift (iOS only)** — rejected. Covers one platform; Android would need a separate Kotlin app. Two codebases, two builds, two notification integrations for a solo developer. A coverage argument, not a difficulty one.

**Cross-platform native (Flutter or React Native/Expo)** — evaluated in depth and initially chosen, then reversed. Flutter was rejected within that branch because Dart is used almost exclusively inside Flutter and rarely appears in job listings, while Expo/React Native uses TypeScript. Expo was then rejected too, for the reasons below.

**Web app (PWA)** — **chosen.**

### Why web won

- **Far simpler to build.** React Native has enough differences from React to add real friction.
- **Lower friction for reviewers.** A hiring manager opens a link. With a native app they'd have to find it in an app store and install it.
- **No App Store submission**, no review delays, no developer account fee.
- **Expo would lock the project into the Expo ecosystem.**
- Users are rarely far from cell service, so offline support — a substantially harder problem — isn't needed.

### What this cost

Push notifications were the original reason for going native, because on iOS web push only works after a user adds the site to their home screen. Building as a **PWA with an install prompt in onboarding** addresses this, and notifications were deprioritized (see supporting decisions).

### Frontend stack

**TypeScript + React + Vite**, hosted on **Vercel**.

Vite is the build tool and development server; React is the UI library. Next.js was considered and rejected — it's designed for apps without a separate backend, and Zenith has a Python backend.

TypeScript specifically because it appears constantly on job listings, and because it makes the code reviewable by my mentor, who works in TypeScript daily.

---

## Decision 2 — Backend: **Python + FastAPI, using Skyfield**

### Options evaluated

**Node.js + TypeScript with satellite.js** — rejected, though genuinely viable. It would have meant one language across the whole project. satellite.js is mature, supports the newer OMM data format, and its accuracy is effectively identical to the Python equivalent (differences measured around a metre, irrelevant for naked-eye viewing). The open-source `satvis` project proves pass prediction works in JavaScript.

Rejected because satellite.js has **no built-in pass finder** — I'd write the time-stepping search myself — and **no observer sun-position calculation**, requiring a second library.

**Python + FastAPI with Skyfield** — **chosen.**

### Why

Skyfield provides all three pieces the hardest part of this app needs:
- A built-in pass finder (`find_events`) returning rise, peak, and set times for a satellite at a location
- A built-in check for whether a satellite is sunlit
- Sun-position calculation for the observer

Its documentation walks through pass-finding as a worked example. Accuracy matches the official reference implementation to a fraction of a millimetre.

**The principle:** use the best tool for the hardest part of the system. The visibility calculation is the most error-prone piece of Zenith, and Skyfield removes the most risk from it.

Secondary benefit: I already know FastAPI from a previous project, so my entire learning budget goes to TypeScript and React on the frontend instead of being split.

### What this cost

Two languages in one project — two toolchains, two test setups, two deployment configurations. Skyfield also downloads a ~17MB planetary-positions file on first run, which needs handling in deployment.

---

## Decision 3 — Database: **PostgreSQL**

### Options evaluated

**SQLite** — rejected. It's a single file, and a write locks it while other writers wait. Zenith has **two server-side processes writing concurrently**: the web server answering requests, and the scheduled worker refreshing orbital data and computing passes. Additionally, many hosting platforms rebuild the server on each deploy, which would wipe a local file. SQLite is an excellent database — it's simply the wrong shape for a two-writer setup.

**MongoDB** — rejected. Document databases encourage copying data into each document rather than linking to it, so updating shared orbital data would mean rewriting many records instead of one row. No true joins, so "passes for the satellites this user follows" requires multiple round trips.

**Firebase Firestore** — rejected. Same relational mismatch, plus no built-in text search (needed for satellite search), no cross-collection joins, and per-operation pricing. The scheduled pass-recalculation job is exactly the write-heavy pattern that makes per-read/write billing unpredictable. Its real strength — real-time sync — is a feature Zenith doesn't need, since data updates on a schedule.

**PostgreSQL** — **chosen.**

### Why

The data is genuinely relational:
- **Users ↔ satellites is many-to-many** — one user follows many satellites, one satellite is followed by many users
- **Passes reference both a satellite and a location**

The core query is a **join plus a time-range filter**: "visible passes in the next 7 days for the satellites this user follows." That's precisely what relational databases are built for.

It also handles concurrent writers correctly, is free and hosted everywhere, and is the most-requested database on job listings.

### What this cost

Requires a running database server rather than a file — roughly 30 minutes of one-time setup. Managed Postgres on the host handles backups, patching, and upgrades, so database administration isn't part of this project.

---

## Decision 4 — Pass computation: **precompute on a schedule**

### Options evaluated

**Compute on demand** — the server runs Skyfield when a user opens the app; nothing is stored. Genuinely simpler in every other respect: no passes table, no invalidation logic, no staleness, always uses the freshest data.

Rejected because it makes **notifications impossible**, not merely harder. At 9:27pm the user's app is closed and nobody has opened it, so nothing in the system knows a 9:42pm pass exists. There is nothing to trigger a notification from.

**Precompute on a schedule** — **chosen.**

### How it works

A scheduled job calculates passes ahead of time and stores them. The server reads rows when the app opens, which is fast. A separate lightweight job looks ahead in that table to fire notifications.

**Cadence: once or twice daily.** This is constrained by the source — CelesTrak only publishes new orbital data every 2 hours, so refreshing more often cannot produce fresher results.

**Scope:** only compute passes for satellites users actually follow, and only for locations users actually have. Fetching orbital data happens regardless (one shared download); pass computation is demand-driven.

**Invalidation:** recompute a single user's passes on exactly three events — they add a satellite, remove a satellite, or change location.

### Concerns considered and dismissed

- **Staleness** — orbital element sets are accurate for roughly two weeks either side of their epoch, so being a few hours behind shifts a pass time by a second or two. Invisible to someone standing outside looking for a moving dot.
- **"Computing for users who don't open the app"** — that isn't waste, it's the product. The notification exists precisely for the person who doesn't open the app.
- **Storage growth** — rows are cheap, and past passes are deleted.

### Bonus

If a data source is unreachable when a user opens the app, stored passes are still there.

---

## Decision 5 — Scheduled jobs: **APScheduler**

Zenith needs **two timers**:
- **Daily job** — fetch fresh orbital data, recompute passes (once or twice a day)
- **Notification checker** — "any passes starting in the next 15 minutes?" (every few minutes, all day)

### Options evaluated

**Celery + Redis** — rejected as over-engineering. Would mean running Redis and a worker pool for two scheduled tasks. Its real benefits — retries, job history, horizontal scale — don't apply at this size.

**Platform cron** — rejected as the primary mechanism, though solid for the daily job. Some platforms cold-start a fresh container per run (10–30 seconds), which is wasteful and potentially billable on a five-minute interval. Would also mean maintaining two different scheduling mechanisms.

**APScheduler** — **chosen.** A Python library running inside the FastAPI server. Handles both cadences with one mechanism, the schedule lives in version-controlled code, and nothing extra needs deploying.

### Concerns and mitigations

- **Shares a process with the web server** — mitigated by only computing passes for followed satellites. At this scale that's seconds of work once a day, schedulable for ~4am. The notification checker is a single indexed query.
- **A server restart mid-job loses that run** — guarded by having the job check whether today's data already exists and catch up if not.
- **Duplicate runs across multiple server instances** — doesn't apply; Zenith runs a single instance.

---

## Decision 6 — Backend hosting: **Railway**

### The requirement driving this

The backend must be a **persistent always-on service**, not serverless, because:

1. APScheduler needs a continuously running program to watch its clock
2. Skyfield's ~17MB ephemeris file would reload on serverless cold starts
3. Pass computation can exceed serverless execution time limits
4. Serverless functions each open their own database connection and accumulate

### Options evaluated

**Fly.io** — rejected. The most capable of the three and genuinely good at always-on services, but the most configuration to learn and more hands-on database management. Wrong time for a steep infrastructure learning curve while also picking up TypeScript and React.

**Render** — rejected for now. Its free tier spins down after ~15 minutes of inactivity and takes 30–50 seconds to wake, which breaks a scheduler outright. Its paid tier never sleeps and offers flat, forecastable billing — a real advantage.

**Railway** — **chosen.** A 30-day trial with credit and no credit card required, letting me build and deploy while learning without paying. Then a low flat floor with usage included, billed per second on CPU and RAM. Postgres is billed within the same pricing rather than as a separate service. Best developer experience of the three.

### What this cost

Per-second billing means a variable invoice; Render's flat rate is more predictable. Some users report poor cost visibility on Railway, so a spending limit is set in the dashboard.

**The reasoning behind accepting that:** migrating to Render later is a weekend of work, not a rewrite. Choosing the reversible option when reversal is cheap.

**Precision note:** Railway is cheaper for low-traffic, bursty workloads because per-second billing rewards idle time. Zenith isn't idle — the scheduler keeps it running. So the accurate claim is "cheaper at my expected scale," not "cheaper in general."

---

## Decision 7 — Authentication: **built in-house (FastAPI + bcrypt + JWT)**

Zenith needs **authentication** (proving who you are) but not **authorization** (permission tiers) — every logged-in user can do the same things.

### Options evaluated

**Auth0** — rejected. Enterprise-focused, most expensive per user, built for SAML and compliance features Zenith doesn't need.

**Supabase Auth** — rejected. Its free tier covers database and auth together, and keeping users in the same Postgres as app data would allow clean foreign keys. But Supabase replaces the *database*, not the host — the FastAPI backend still needs Railway. That means two services, two dashboards, and a database sitting away from the backend. Getting Supabase Auth working with a separate FastAPI backend is also fiddlier than the alternative.

**Clerk** — rejected, but **retained as the fallback**. Best developer experience for React, drop-in UI components, a large free tier, and it works cleanly with a separate FastAPI backend by verifying JWTs server-side. It handles password reset, email verification, and social login. The cost is a third-party dependency on the critical path — and less understanding of how any of it works.

**Build it in-house** — **chosen.**

### Why

Authentication is one of the most common backend interview topics. "A service handles it" is a dead end in that conversation; being able to explain password hashing, token issuing, and protected routes is not.

This isn't reckless: FastAPI's official documentation walks through this exact pattern — OAuth2 with JWT, password hashing via established libraries. Using vetted libraries in the documented way is different from inventing cryptography.

### What this cost

Security responsibility sits with me: token expiry, rate limiting on login attempts, password reset flows. Password reset also requires email sending, a separate integration. Roughly 2–3 days of work versus about half a day with Clerk.

**Exit condition:** if this starts consuming the schedule, switching to Clerk is a half-day change, not a rewrite.

---

## Supporting decisions

**Notifications — web push, deprioritized.** Still wanted, but no longer top priority now that Zenith is a web app. The notification channel will be built so a second channel (email or SMS) can be added later without rework.

**Access — account-gated.** No anonymous quick-check path. One code path, it matches the MVP description, and it demonstrates auth and account management. Reviewer friction is handled by seeding a demo account and putting the credentials in the README, so anyone can log straight in without signing up.

**Locations — multiple, saved.** Start with the user's current location, and let them save named places (a favourite campsite, for example). Cheap to support: the same table with extra rows, plus a way to select the active location.

**Satellite range — curated list first.** Most of the ~4,000 catalogued satellites aren't visible to the naked eye, so starting with the bright ones is both easier to build and better for the user. Expand later.

**Location input — simple.** Pass prediction needs only city-level precision, so a full multi-line street address would be onboarding friction that buys no accuracy.

---

## Data sources

**Orbital data chain:** US Space Force → Space-Track.org (authoritative, account required, 200 requests/hour) → CelesTrak (public, bulk files) → TLE API at tle.ivanstanojevic.me (pulls from CelesTrak daily, serves JSON).

**Plan:** start with the JSON TLE API for v1 — two endpoints, easy to consume, adequate for a handful of satellites. Move to CelesTrak bulk files when scaling beyond that.

**N2YO** provides finished pass predictions. Deliberately **not** used as a data source — that would mean displaying someone else's computed output rather than computing anything. Used only to validate my own math.

### Important: the TLE format is being retired

The TLE format was designed for punch-card and fax-era bandwidth and has a **5-digit catalog number field**. CelesTrak ran out of 5-digit numbers on **2026-07-11**. New objects receive 6-digit numbers and **cannot be represented in TLE format at all**.

The successor is **OMM** (Orbit Mean-Elements Message), part of CCSDS 502.0-B-3, available in XML, KVN, JSON, and CSV. It also resolves a Y2K-style problem returning in 2057 and supports Unicode satellite names.

**Consequence for Zenith:** build on the JSON/OMM feed rather than the legacy TLE text format. Skyfield supports OMM via `EarthSatellite.from_omm()`.

### Fetch job rules (enforced by CelesTrak)

- New data appears only every 2 hours. Do not poll more often.
- Cache locally, check the file timestamp, re-download only if older than 2 hours.
- On a non-200 response, retry 2–3 times maximum, then stop and alert. Blind retrying gets an IP blocked — 100 errors in 2 hours triggers limits, 1,000 in a day means firewall review.
- Use `celestrak.org`, not `.com` — the `.com` domain issues a redirect many scripts mishandle.

---

## Future phases (not in v1)

- **Aurora forecasting** — NASA DONKI (solar flares and coronal mass ejections) plus NOAA SWPC (geomagnetic conditions). A CME takes 1–3 days to reach Earth, making arrival estimable.
- **Visible rocket launches** — Launch Library 2, filtered by distance from the pad and time of day.
- **Asteroid close approaches** — NASA NeoWs.
- **Unified feed** — one view of everything happening overhead in the next few days.

DONKI, NeoWs, and APOD share a single API key from api.nasa.gov.
