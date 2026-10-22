from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Location, Pass, User
from app.schemas import (
    LocationCreate,
    LocationListItem,
    LocationListResponse,
    LocationResponse,
)
from app.services.timezones import timezone_for, week_window

router = APIRouter()

#Temporary placeholder until Clerk auth is added
TEST_USER_ID = 1


@router.post("/api/locations", response_model=LocationResponse, status_code=201)
def create_location(location: LocationCreate, db: Session = Depends(get_db)):
    new_location = Location(
        user_id=TEST_USER_ID,
        nickname=location.nickname,
        latitude=location.latitude,
        longitude=location.longitude,
        place_name=location.place_name,
        # Worked out by the server from the coordinates, never sent by the
        # frontend. That way a user can't send an invalid timezone.
        timezone=timezone_for(location.latitude, location.longitude),
    )
    db.add(new_location)
    db.commit()
    db.refresh(new_location)
    return new_location


@router.get("/api/locations", response_model=LocationListResponse)
def list_locations(db: Session = Depends(get_db)):
    user = db.get(User, TEST_USER_ID)
    active_id = user.active_location_id if user else None

    locations = (
        db.query(Location)
        .filter(Location.user_id == TEST_USER_ID)
        .order_by(Location.created_at)
        .all()
    )

    items = []
    for location in locations:
        now, _, end_of_window = week_window(location.timezone)

        count = (
            db.query(Pass)
            .filter(
                Pass.location_id == location.id,
                Pass.fade_time >= now,
                Pass.appear_time < end_of_window,
            )
            .count()
        )

        base = LocationResponse.model_validate(location)
        items.append(
            LocationListItem(
                **base.model_dump(),
                is_active=(location.id == active_id),
                passes_this_week=count,
            )
        )

    return LocationListResponse(locations=items)