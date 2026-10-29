from pydantic import BaseModel, Field 
from datetime import datetime, date as date_type

class LocationCreate(BaseModel):
    nickname: str = Field(min_length=1, max_length=100)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    place_name: str | None = None

    model_config = {"str_strip_whitespace": True}

class LocationUpdate(BaseModel):
    nickname: str = Field(min_length=1, max_length=100)
    model_config = {"str_strip_whitespace": True}


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


class LocationListItem(LocationResponse):
    # Inherits every field from LocationResponse, then adds these two
    is_active: bool
    # Same 7-day window as the home screen. Numbers should always match
    passes_this_week: int


class LocationListResponse(BaseModel):
    locations: list[LocationListItem]


class SatelliteResponse(BaseModel):
    id: int
    norad_id: int
    name: str

    model_config = {"from_attributes": True}


class SatelliteListItem(SatelliteResponse):
    # Adds whether this user follows the specific satellite
    is_followed: bool


class SatelliteListResponse(BaseModel):
    satellites: list[SatelliteListItem]


class PassResponse(BaseModel):
    id: int
    satellite: SatelliteResponse

    # The full pass: satellite above 10 degrees, sunlit or not
    rise_time: datetime
    set_time: datetime
    rise_azimuth: float
    set_azimuth: float

    # The part you can actually see (sunlit & dark sky)
    appear_time: datetime
    fade_time: datetime
    appear_azimuth: float
    fade_azimuth: float

    # Highest point while visible
    culminate_time: datetime
    culminate_azimuth: float
    max_altitude: float

    # Brightest moment. Lower = brighter. Empty if no magnitude data.
    magnitude: float | None

    model_config = {"from_attributes": True}


class DayResponse(BaseModel):
    # The calender date in the location's timezone
    date: date_type
    # Empty list = nothing visible that day. Day will still show up
    passes: list[PassResponse]


class PassesResponse(BaseModel):
    location: LocationResponse
    days: list[DayResponse]

    