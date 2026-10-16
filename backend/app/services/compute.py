"""Compute passes and save them to the database.

This is where the pass math (passes.py) meets the database:
it reads satellites and locations, computes passes, and saves Pass rows.
"""

from datetime import timedelta

from skyfield.api import EarthSatellite, wgs84
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import FollowedSatellite, Location, Pass, Satellite
from app.services.passes import (
    ts,
    find_passes,
    describe_pass,
    find_visible_window,
    find_brightest_magnitude,
)

# How far ahead to compute: your 7-day pass window
DAYS_AHEAD = 7

# Passes visible for less than this get skipped.
# Nobody can get outside in time for a 4-second sighting
MIN_VISIBLE_SECONDS = 60


def compute_passes_for(db: Session, location: Location, satellite: Satellite) -> int:
    """Replace one satellite's passes over one location with fresh ones.
    
    Returns how many passes were saved. Doesn't commit: the caller decides
    when to save, so a whole batch can be saved together.
    """
    # Never fetched from CelesTrak: no orbital data, nothing to compute
    if satellite.tle_line1 is None or satellite.tle_line2 is None:
        return 0

    # Delete this pair's old passes first, so running it again never creates
    # duplicates. Same "safe to run twice" idea as the seed script.
    db.execute(
        delete(Pass).where(
            Pass.location_id == location.id,
            Pass.satellite_id == satellite.id,
        )
    )

    # Turn database rows into the Skyfield objects the pass math expects
    sky_satellite = EarthSatellite(satellite.tle_line1, satellite.tle_line2, satellite.name, ts)
    observer = wgs84.latlon(location.latitude, location.longitude)

    start = ts.now()
    end = ts.now() + timedelta(days=DAYS_AHEAD)

    saved = 0
    for p in find_passes(sky_satellite, observer, start, end):
        appears, fades = find_visible_window(sky_satellite, observer, p)

        # Never visible during this pass: skip it
        if appears is None:
            continue

        # Visible, but too briefly to be worth going outside for: skip it.
        # Skyfield gives time differences in days, so x 24 x 60 x 60 for seconds.
        visible_seconds = (fades - appears) * 24 * 60 * 60
        if visible_seconds < MIN_VISIBLE_SECONDS:
            continue

        details = describe_pass(sky_satellite, observer, p)
        magnitude = find_brightest_magnitude(
            sky_satellite, observer, satellite.magnitude, appears, fades
        )

        # One new row in the passes table. Each name on the left
        # is a column in your Pass model.
        db.add(Pass(
            satellite_id=satellite.id,
            location_id=location.id,
            rise_time=details["rise_time"],
            culminate_time=details["culminate_time"],
            set_time=details["set_time"],
            appear_time=appears.utc_datetime(),
            fade_time=fades.utc_datetime(),
            rise_azimuth=details["rise_azimuth"],
            culminate_azimuth=details["culminate_azimuth"],
            set_azimuth=details["set_azimuth"],
            max_altitude=details["max_altitude"],
            magnitude=magnitude,
        ))
        saved += 1

    return saved


def compute_passes_for_location(db: Session, location: Location) -> int:
    """Recompute passes over one location, for every satellite its owner follows.
    
    This is what runs when a user changes or adds a location.
    """
    # The satellites this location's owner follows. This is a JOIN:
    # go through the followed_satellites table to find which satellite rows
    # belong to this user. The same join explaiened back when the models were built
    followed = db.scalars(
        select(Satellite)
        .join(FollowedSatellite, FollowedSatellite.satellite_id == Satellite.id)
        .where(FollowedSatellite.user_id == location.user_id)
    ).all()

    total = 0
    for satellite in followed:
        total += compute_passes_for(db, location, satellite)
    return total

def compute_all_passes(db: Session) -> int:
    """The night work: recompute passes for every saved location.
    
    Saves everything in one commit. Crash halfway saves nothing
    """
    total = 0
    for location in db.scalars(select(Location)).all():
        total += compute_passes_for_location(db, location)

    # This is the "caller" that decides when to save
    db.commit()
    return total


# Lets you run this by hand: python -m app.services.compute
if __name__ == "__main__":
    db = SessionLocal()
    try:
        total = compute_all_passes(db)
        print(f"Saved {total} passes")
    finally:
        db.close()

