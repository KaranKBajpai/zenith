"""Runs Zenith's background jobs on a timer, using APScheduler."""

from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler

from app.database import SessionLocal
from app.services.celestrak import refresh_catalog_tles
from app.services.compute import compute_all_passes

# One scheduler for the whole app. "Background" means it runs jobs on a 
# serparate thread, so the web server keeps answering requests meanwhile.
scheduler = BackgroundScheduler()


def nightly_job():
    """Fetch fresh orbital data, then recompute everyone's passes."""
    # Jobs run outside any web request, so open a session by hand,
    # the same way the see script does
    db = SessionLocal()
    try:
        # 1. Newest orbital data first
        refresh_catalog_tles(db)
        # 2. Compute passes
        total = compute_all_passes(db)
        print (f"Nightly job: saved {total} passes")
    except Exception as e:
        # If the job fails, the web server must keep running. 
        # Report it, and tomorrow's run will try again
        print(f"Nightly job failed: {e}")
    finally:
        # Anything not committed gets thrown away, so a failed
        # run never leaves half-saved passes behind.
        db.close()


def start_scheduler():
    """Register the job and start the clock."""
    scheduler.add_job(
        nightly_job,
        "cron",
        hour=4,
        minute=0,
        timezone="America/Los_Angeles", 
        id="nightly_job",
        # Also run once now, when the server starts so a new
        # server (or one that was down overnight) catches up immediately
        next_run_time=datetime.now(timezone.utc),
    )
    scheduler.start()


def stop_scheduler():
    """Stop the clock cleanly when the server shuts down."""
    scheduler.shutdown()