"""Work out a location's timezone from its latitude and longitude."""

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