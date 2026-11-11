from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.log_setup import setup_logging
from app.routers import geocode, health, locations, passes, satellites
from app.scheduler import start_scheduler, stop_scheduler

# Set up logging before anything else runs, so every message is formatted.
setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Everything before yield runs once, when the server starts
    start_scheduler()
    yield
    # Everything after yield runs once, when the server shuts down
    stop_scheduler()


app = FastAPI(title="Zenith API", lifespan=lifespan)

# Which websites (origins) are allowed to call this API from a browser.
# Set in config.py from FRONTEND_ORIGINS, so the deployed frontend's address
# can be added later without changing code.
allowed_origins = settings.frontend_origin_list

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins, # Only these sites, never "anyone"
    allow_credentials=True, # lets the browser send the login token along (for Clerk)
    allow_methods=["*"], # GET, POST, PATCH, DELETE...
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(passes.router)
app.include_router(locations.router)
app.include_router(satellites.router)
app.include_router(geocode.router)