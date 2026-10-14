import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import health, locations, passes, satellites

load_dotenv()

app = FastAPI(title="Zenith API")

# Which websites (origins) are allowed to call this API from a browser.
# Read from .env, so the deployed frontend's address can be added at a later date
# without changing any code. If it's not set, default to the vite dev server on 
# mac. Multiple origins can be listed, separated by commas.
allowed_origins = os.getenv("FRONTEND_ORIGINS", "http://localhost:5173").split(",")

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