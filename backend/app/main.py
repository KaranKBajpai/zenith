from fastapi import Depends, FastAPI
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Location, Satellite
from app.schemas import LocationCreate, LocationResponse, SatelliteListResponse

app = FastAPI(title="Zenith API")

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

@app.get("/api/passes")
def get_passes():
    return {
        "location": {
            "id": 4,
            "nickname": "Tunnel Creek Campsite",
            "latitude": 44.4280,
            "longitude": -110.5885,
            "timezone": "America/Denver",
        },
        "nights": [
            {
                "date": "2026-09-28",
                "darkness_start": "2026-09-29T03:14:00Z",
                "passes": [
                    {
                        "id": 1021,
                        "satellite": {
                            "id": 1,
                            "norad_id": 25544,
                            "name": "ISS (Zarya)",
                        },
                        "rise_time": "2026-09-29T04:05:00Z",
                        "culminate_time": "2026-09-29T04:08:00Z",
                        "set_time": "2026-09-29T04:11:00Z",
                        "rise_azimuth": 247.0,
                        "culminate_azimuth": 190.0,
                        "set_azimuth": 120.0,
                        "max_altitude": 64.0,
                    }
                ],
            },
            {
                "date": "2026-09-29",
                "darkness_start": "2026-09-30T03:12:00Z",
                "passes": [
                    {
                        "id": 1022,
                        "satellite": {
                            "id": 1,
                            "norad_id": 25544,
                            "name": "ISS (Zarya)",
                        },
                        "rise_time": "2026-09-30T03:24:00Z",
                        "culminate_time": "2026-09-30T03:26:00Z",
                        "set_time": "2026-09-30T03:28:00Z",
                        "rise_azimuth": 270.0,
                        "culminate_azimuth": 225.0,
                        "set_azimuth": 180.0,
                        "max_altitude": 27.0,
                    }
                ],
            },
            {
                "date": "2026-09-30",
                "darkness_start": "2026-10-01T03:10:00Z",
                "passes": [],
            },
        ],
    }

# Temporary placeholder until Clerk auth is added
TEST_USER_ID = 1


@app.post("/api/locations", response_model=LocationResponse, status_code=201)
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


@app.get("/api/satellites", response_model=SatelliteListResponse)
def list_satellites(db: Session = Depends(get_db)):
    satellites = db.scalars(select(Satellite).order_by(Satellite.name)).all()
    return {"satellites": satellites}

