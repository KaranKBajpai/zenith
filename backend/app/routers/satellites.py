from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import FollowedSatellite, Satellite
from app.schemas import SatelliteListItem, SatelliteListResponse, SatelliteResponse

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