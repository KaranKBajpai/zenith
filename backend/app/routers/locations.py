from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Location, Pass, User
from app.schemas import (
    LocationCreate,
    LocationListItem,
    LocationListResponse,
    LocationResponse,
    LocationUpdate,
)
from app.services.compute import compute_passes_for_location
from app.services.timezones import timezone_for, week_window

router = APIRouter()

#Temporary placeholder until Clerk auth is added
TEST_USER_ID = 1

def get_owned_location (db: Session, location_id: int) -> Location:
    """Return the location if it exists AND belongs to this user.
    
    Missing or someone else's: same 404 either way, so we never reveal
    that another user's location exists. Used by every endpoint that changes one specific location.
    """
    location = db.get(Location, location_id)
    if location is None or location.user_id != TEST_USER_ID:
        raise HTTPException(status_code=404, detail="Location not found")
    return location


@router.post("/api/locations", response_model=LocationResponse, status_code=201)
def create_location(location: LocationCreate, db: Session = Depends(get_db)):
    # Step 1: build the new location row 
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

    # Step 2: if the user has no active location yet, make this one active
    user = db.get(User, TEST_USER_ID)
    if user is not None and user.active_location_id is None:
        # flush() sends the INSERT to Postgres WITHOUT committing, so 
        # Postgres assigns new_location.id. We need that id right now.
        db.flush()
        user.active_location_id = new_location.id

    # Save the location for good 
    db.commit()
    db.refresh(new_location)

    # Step 3: compute its passes now, so it ins't empty until 4 AM.
    # If the math fails, the location stays saved and the nightly job
    # will fill it in later
    try:
        compute_passes_for_location(db, new_location)
        db.commit()
    except Exception as error:
        # Throw away any half-written passes from the failed attempt
        db.rollback()
        print(f"Pass compute failed for location {new_location.id}: {error}")

    # Reload the row so the response has its saved values.
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


@router.put("/api/locations/{location_id}/active", response_model=LocationResponse)
def set_active_location(location_id: int, db: Session = Depends(get_db)):
    # FastAPI fills location_id from the URL: /api/locations/3/active -> 3
    location = get_owned_location(db, location_id)

    user = db.get(User, TEST_USER_ID)
    if user is None:
        raise HTTPException(status_code=404,  detail="User not found")


    # The actual switch. Passes already exist for every saved location,
    # so nothing needs computing.
    user.active_location_id = location.id
    db.commit()
    db.refresh(location)
    return location

@router.patch("/api/locations/{location_id}", response_model=LocationResponse)
def rename_location(
    location_id: int,
    changes: LocationUpdate,
    db: Session = Depends(get_db),
):
    # A blank or too-long name never reaches this line: FastAPI rejects
    # it with a 422 first, bases on the LocationUpdate rules.
    location = get_owned_location(db, location_id)

    location.nickname = changes.nickname
    db.commit()
    db.refresh(location)
    return location


@router.delete("/api/locations/{location_id}", status_code=204)
def delete_location(location_id: int, db: Session = Depends(get_db)):
    location = get_owned_location(db, location_id)

    location_count = (
        db.query(Location).filter(Location.user_id == TEST_USER_ID).count()
    )
    if location_count <= 1:
        raise HTTPException(
            status_code=409, detail="You need at least one location"
        )

    user = db.get(User, TEST_USER_ID)
    if user is not None and user.active_location_id == location.id:
        replacement = (
            db.query(Location)
            .filter(
                Location.user_id == TEST_USER_ID,
                Location.id != location.id,
            )
            .order_by(Location.created_at.desc())
            .first()
        )
        user.active_location_id = replacement.id
        # Send the switch to Postgres NOW. Otherwise the user row still
        # points at this location when we try to delete it, and the 
        # foreign key blocks the delete.
        db.flush()

    # Passes point at this location too, so they go first.
    db.execute(delete(Pass).where(Pass.location_id == location.id))
    db.delete(location)

    # One commit for everything: all of it happens, or none of it does.
    db.commit()

    # 204 = success, nothing to send back.
    return Response(status_code=204)