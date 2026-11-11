"""Place search and reverse lookup, using Nominatim (OpenStreetMap)."""

import logging
import threading
import time
from functools import lru_cache

import requests

from app.config import settings

logger = logging.getLogger(__name__)

NOMINATIM_URL = "https://nominatim.openstreetmap.org"
REPO_URL = "https://github.com/KaranKBajpai/zenith"

# Identify the app and how to reach its developer, as the policy requires.
_contact = f"; {settings.nominatim_contact_email}" if settings.nominatim_contact_email else ""
USER_AGENT = f"Zenith/0.1 (+{REPO_URL}{_contact})"

# Shared by every request, so all users together stay at 1 request/second.
_lock = threading.Lock()
_last_request_at = 0.0


def _wait_for_turn() -> None:
    """Block until at least 1 second has passed since the last Nominatim request."""
    global _last_request_at
    # The lock makes requests take turns: if two arrive together,
    # the second waits here until the first has gone.
    with _lock:
        wait = 1.0 - (time.monotonic() - _last_request_at)
        if wait > 0:
            time.sleep(wait)
        _last_request_at = time.monotonic()

def _get(path: str, params: dict) -> dict | list:
    """One polite request to Nominatim. Raises requests.RequestException on failure."""
    _wait_for_turn()
    logger.info("Nominatim request: %s %s", path, params)
    response = requests.get(
        f"{NOMINATIM_URL}{path}",
        params={**params, "format": "jsonv2"},
        headers={"User-Agent": USER_AGENT},
        timeout=10,
    )
    response.raise_for_status() # turns a 4xx/5xx reply into an exception
    return response.json()


def _place_name(address: dict) -> str | None:
    """Build"""
    town = (
        address.get("city")
        or address.get("town")
        or address.get("village")
        or address.get("hamlet")
        or address.get("county")
    )
    region = address.get("state")
    country = (address.get("country_code") or "").upper() or None
    parts = [part for part in (town, region, country) if part]
    return ", ".join(parts) or None


# lru_cache remembers the last 256 answers. Results are tuples (which can't
# be changed), so no code can accidentally edit a remembered answer.
@lru_cache(maxsize=256)
def _search(query: str) -> tuple[tuple[str, float, float], ...]:
    data = _get("/search", {"q": query, "addressdetails": 1, "limit": 5})
    return tuple(
        (
            _place_name(item.get("address", {})) or item.get("display_name", query),
            float(item["lat"]),
            float(item["lon"]),
        )
        for item in data
    )


def search_places(query: str) -> list[dict]:
    """Up to 5 places matching a name or postcode."""
    # Clean up text
    key = " ".join(query.split()).lower()
    return [
        {"name": name, "latitude": lat, "longitude": lon}
        for name, lat, lon in _search(key)
    ]


@lru_cache(maxsize=256)
def _reverse(latitude: float, longitude: float) -> str | None:
    # zoom=10 asks for a city-level name, not a street address
    data = _get(
        "/reverse",
        {"lat": latitude, "lon": longitude, "zoom": 10, "addressdetails": 1},
    )
    return _place_name(data.get("address", {}))


def reverse_place(latitude: float, longitude: float) -> str | None:
    """The town name for a spot, like "New York City, New York, US" or None."""
    # Round to 2 decimals (about 1 km): nearby lookups share a cache entry,
    # and we never send anyone's exact position.
    return _reverse(round(latitude, 2), round(longitude, 2))