from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Location
from app.schemas import LocationCreate, LocationResponse

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
    )
    db.add(new_location)
    db.commit()
    db.refresh(new_location)
    return new_location