"""Work out a location's timezone from its latitude and longitude."""

from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from timezonefinder import TimezoneFinder

# Build the finder once, when this file is first imported. It loads a map
# of the world's timezone borders, so building it again for every location
# would be wasted work. 
_finder = TimezoneFinder()


def timezone_for(latitude: float, longitude: float) -> str:
    """Return the IANA timezone name for a spot on Earth.
    
    For example, Portland gives "America/Los_Angeles".
    Falls back to "UTC" for places with no timezone, like the open ocean
    """
    name = _finder.timezone_at(lat=latitude, lng=longitude)

    # timezone_at returns None for the open ocean. 
    # "or" means: use name if there's a value. Otherwise, use "UTC".
    return name or "UTC"


# How many days this week covers, including today
DAYS_TO_SHOW = 7


def week_window(tz_name: str) -> tuple[datetime, list[date], datetime]:
    """The 7 local calender days starting today, for one timezone.
    
    Returns:
        now             - The current moment (UTC)
        days            - [Today, tomorrow, ... 6 days out] as local dates
        end_of_window   - Local midnight right after the last day
    Shared by the passes and locations endpoints so both count the same week
    """
    tz = ZoneInfo(tz_name)
    now = datetime.now(timezone.utc)
    today = now.astimezone(tz).date()
    days = [today + timedelta(days=i) for i in range(DAYS_TO_SHOW)]
    end_of_window = datetime.combine(days[-1] + timedelta(days=1), time(0), tzinfo=tz)
    return now, days, end_of_window