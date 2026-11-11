import logging

import requests
from fastapi import APIRouter, HTTPException, Query

from app.config import settings
from app.schemas import GeocodeResult, GeocodeSearchResponse, ReverseGeocodeResponse
from app.services.geocoding import reverse_place, search_places

router = APIRouter()
logger = logging.getLogger(__name__)

UNAVAILABLE = "Location search isn't available right now. Try again in a moment."

def _check_enabled() -> None:
    # The off switch Nominatim's policy asks for: GEOCODING_ENABLED=false
    if not settings.geocoding_enabled:
        raise HTTPException(status_code=503, detail="Location search is turned off right now.")


@router.get("/api/geocode/search", response_model=GeocodeSearchResponse)
def geocode_search(q: str = Query(min_length=2, max_length=200)):
    # Query(...) validates the ?q= part of the URL: 2 to 200 characters
    _check_enabled()
    try:
        results = search_places(q)
    except requests.RequestException:
        logger.exception("Nominatim search failed for %r", q)
        raise HTTPException(status_code=502, detail=UNAVAILABLE)
    return GeocodeSearchResponse(results=[GeocodeResult(**r) for r in results])


@router.get("/api/geocode/reverse", response_model=ReverseGeocodeResponse)
def geocode_reverse(
    lat: float = Query(ge=-30, le=90),
    lon: float = Query(ge=-180, le=180),
):
    _check_enabled()
    try:
        name = reverse_place(lat, lon)
    except requests.RequestException:
        logger.exception("Nominatim reverse lookup failed")
        raise HTTPException(status_code=502, detail=UNAVAILABLE)
    return ReverseGeocodeResponse(name=name)

