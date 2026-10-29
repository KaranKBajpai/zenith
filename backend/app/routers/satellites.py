from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select, delete
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import FollowedSatellite, Satellite, Location, Pass
from app.schemas import SatelliteListItem, SatelliteListResponse, SatelliteResponse
from app.services.compute import compute_passes_for

router = APIRouter()

# Temporary placeholder until Clerk auth is added
TEST_USER_ID = 1


@router.get("/api/satellites", response_model=SatelliteListResponse)
def list_satellites(db: Session = Depends(get_db)):
    # Query 1: the whole catalog in alphabetical order
    satellites = db.scalars(select(Satellite).order_by(Satellite.name)).all()

    # Query 2: The ids of satellites this user follows, as a set.
    # A set answers "is X in here?" instantly, however big it gets.
    followed_ids = set(
        db.scalars(
            select(FollowedSatellite.satellite_id).where(
                FollowedSatellite.user_id == TEST_USER_ID
            )
        ).all()
    )

    # Copy the satellite's fields then add one extra
    items = [
        SatelliteListItem(
            **SatelliteResponse.model_validate(s).model_dump(),
            is_followed=(s.id in followed_ids),
        )
        for s in satellites
    ]
    return SatelliteListResponse(satellites=items)


@router.put("/api/satellites/{satellite_id}/follow", response_model=SatelliteListItem)
def follow_satellite(satellite_id: int, db: Session = Depends(get_db)):
    satellite = db.get(Satellite, satellite_id)
    if satellite is None:
        raise HTTPException(status_code=404, detail="Satellite not found")

    # Find the follow row for (this user, this satellite), if it exists.
    existing = db.get(FollowedSatellite, (TEST_USER_ID, satellite_id))

    # Already following? Nothing to save or compute
    if existing is None:
        db.add(FollowedSatellite(user_id=TEST_USER_ID, satellite_id=satellite_id))
        db.commit()

        # Compute passes for just this satellite at every saved location
        try:
            locations = db.scalars(
                select(Location).where(Location.user_id == TEST_USER_ID)
            ).all()
            for location in locations:
                compute_passes_for(db, location, satellite)
            db.commit()
        except Exception as error:
            # Throw away half-written passes. Nightly job filles in the passes later.
            db.rollback()
            print(f"Pass compute failed for satellite {satellite_id}: {error}")

    return SatelliteListItem(
        **SatelliteResponse.model_validate(satellite).model_dump(),
        is_followed=True,
    )


@router.delete("/api/satellites/{satellite_id}/follow", status_code=204)
def unfollow_satellite(satellite_id: int, db: Session = Depends(get_db)):
    satellite = db.get(Satellite, satellite_id)
    if satellite is None:
        raise HTTPException(status_code=404, detail="Satellite not found")

    # Remove the follow row
    db.execute(
        delete(FollowedSatellite).where(
            FollowedSatellite.user_id == TEST_USER_ID,
            FollowedSatellite.satellite_id == satellite_id,
        )
    )

    # Remove this satellite's passes, but only at this user's locations.
    my_location_ids = select(Location.id).where(Location.user_id == TEST_USER_ID)
    db.execute(
        delete(Pass).where(
            Pass.satellite_id == satellite_id,
            Pass.location_id.in_(my_location_ids),
        )
    )

    db.commit()

    # 204 = done, nothing to send back.
    return Response(status_code=204)