from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo # Built into Python 

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Location, Pass, User
from app.schemas import DayResponse, LocationResponse, PassesResponse, PassResponse

router = APIRouter()

# Temporary placeholder untl Clerk auth is added
TEST_USER_ID = 1

# How many calender days to show, counting today
DAYS_TO_SHOW = 7


@router.get("/api/passes", response_model=PassesResponse)
def get_passes(db: Session = Depends(get_db)):
    # Step 1: Find the user's active location.
    # db.get() looks a row up but its primary key (id). Returns None if missing.
    user = db.get(User, TEST_USER_ID)
    if user is None or user.active_location_id is None:
        raise HTTPException(status_code=404, detail="No active location set")

    location = db.get(Location, user.active_location_id)
    if location is None:
        raise HTTPException(status_code=404, detail="Active location not found")

    # Step 2: work out "today" in the location's timezone, not the server's
    tz = ZoneInfo(location.timezone)
    now = datetime.now(timezone.utc)
    today = now.astimezone(tz).date()

    # Today plus the next 6 days
    days = [today + timedelta(days=i) for i in range(DAYS_TO_SHOW)]

    # Midnight (local time) right after the last day. Passes must 
    # appear before this to be included
    end_of_window = datetime.combine(days[-1] + timedelta(days=1), time(0), tzinfo=tz)


    # Step 3: fetch this location's passes in one window, earliest first.
    passes = (
        db.query(Pass)
        # Load each pass's satellite in the SAME query (avoids N+1 queries)
        .options(joinedload(Pass.satellite))
        .filter(
            Pass.location_id == location.id,
            # Leave out passes that already finished
            Pass.fade_time >= now,
            Pass.appear_time < end_of_window,
        )
        .order_by(Pass.appear_time)
        .all()
    )

    # Step 4: group passes by their local calender date
    # Start every day with an empty list, so empty days still show up
    by_day = {day: [] for day in days}
    for p in passes:
        local_day = p.appear_time.astimezone(tz).date()
        if local_day in by_day:
            # Convert the database row into the PassResponse shape
            by_day[local_day].append(PassResponse.model_validate(p))

    # Step 5: build the response, keeping the days in order
    return PassesResponse(
        location=LocationResponse.model_validate(location),
        days=[DayResponse(date=day, passes=by_day[day]) for day in days],
    )