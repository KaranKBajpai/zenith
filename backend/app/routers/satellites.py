from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Satellite
from app.schemas import SatelliteListResponse

router = APIRouter()


@router.get("/api/satellites", response_model=SatelliteListResponse)
def list_satellites(db: Session = Depends(get_db)):
    satellites = db.scalars(select(Satellite).order_by(Satellite.name)).all()
    return {"satellites": satellites}