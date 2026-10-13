"""Fill the satellites table with Zenith's curated catalog.

Safe to run more than once: satellites already in the table get updated,
new ones get added. Nothing is ever duplicated.

Run from backend/ with: python -m app.seed
"""

from sqlalchemy import select

from app.database import SessionLocal
from app.models import Satellite

# The curated catalog: one dictionary per satellite.
# magnitude = standard (intrinsic) magnitude from Heavens-Above:
# brightness at 1,000 km, 50% illuminated. Lower = brighter.
# To add a satellite to Zenith later, add one line here and re-run.
CATALOG = [
    {"norad_id": 25544, "name": "ISS (Zarya)", "catalog_name": "ISS (ZARYA)", "magnitude": -1.8},
    {"norad_id": 48274, "name": "Tiangong (CSS)", "catalog_name": "CSS (TIANHE-1)", "magnitude": 0.0},
    {"norad_id": 20580, "name": "Hubble", "catalog_name": "HST", "magnitude": 2.2},
]


def seed_satellites():
    # Open a database session by hand. There's no web request here,
    # so FastAPI's Depends(get_db) isn't available to do it for us.
    db = SessionLocal()
    try:
        for entry in CATALOG:
            # Look for a satellite with this NORAD number
            # .first() gives the match, or None if there isn't one
            existing = db.scalars(
                select(Satellite).where(Satellite.norad_id == entry["norad_id"])
            ).first()

            if existing:
                # Already in the table: update it to match the catalog
                existing.name = entry["name"]
                existing.catalog_name = entry["catalog_name"]
                existing.magnitude = entry["magnitude"]
                print(f"Updated {entry['name']}")
            else:
                # Not in the table yet: add it
                db.add(Satellite(
                    norad_id=entry["norad_id"],
                    name=entry["name"],
                    catalog_name=entry["catalog_name"],
                    magnitude=entry["magnitude"],
                ))
                print(f"Added {entry['name']}")

        # Save everything at once
        db.commit()
    finally:
        # close the session
        db.close()


# Only runs when you start this file directly, not when another file imports it
if __name__ == "__main__":
    seed_satellites()

