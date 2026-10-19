from pydantic import BaseModel, Field 
from datetime import datetime

class LocationCreate(BaseModel):
    nickname: str = Field(min_length=1, max_length=100)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    place_name: str | None = None


class LocationResponse(BaseModel):
    id: int
    nickname: str
    latitude: float
    longitude: float
    place_name: str | None
    # IANA name like "America/Los_Angeles". The frontend uses it to show 
    # pass times in the location's local time.
    timezone: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SatelliteResponse(BaseModel):
    id: int
    norad_id: int
    name: str

    model_config = {"from_attributes": True}


class SatelliteListResponse(BaseModel):
    satellites: list[SatelliteResponse]