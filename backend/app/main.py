from fastapi import FastAPI

from app.routers import health, locations, passes, satellites

app = FastAPI(title="Zenith API")

app.include_router(health.router)
app.include_router(passes.router)
app.include_router(locations.router)
app.include_router(satellites.router)