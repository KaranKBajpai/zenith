from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    clerk_user_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255))
    active_location_id: Mapped[int | None] = mapped_column(
        ForeignKey("locations.id", use_alter=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Satellite(Base):
    __tablename__ = "satellites"

    id: Mapped[int] = mapped_column(primary_key=True)
    norad_id: Mapped[int] = mapped_column(unique=True, index=True)

    # Friendly name shown in the app, like "Hubble"
    name: Mapped[str] = mapped_column(String(255))

    # Official name used by tracking catalogs, like "HST" or "CSS (TIANHE-1)"
    # Nullable so a satellite can be added before this is looked up
    catalog_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Standard magnitude: how bright it looks at 1,000 km, 50% lit
    # Lower = brighter. Values come from Heavens-Above.
    # Nullable because a newly added satellite may not have a known value yet
    magnitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    tle_line1: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tle_line2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tle_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    nickname: Mapped[str] = mapped_column(String(100))
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    place_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Pass(Base):
    __tablename__ = "passes"

    id: Mapped[int] = mapped_column (primary_key=True)
    satellite_id: Mapped[int] = mapped_column (ForeignKey("satellites.id"), index=True)
    location_id: Mapped[int] = mapped_column (ForeignKey("locations.id"), index=True)

    # When it crosses 10 degrees going up, reaches its highest point, and drops below 10 degrees
    rise_time: Mapped[datetime] = mapped_column (DateTime(timezone=True), index=True)
    culminate_time: Mapped[datetime] = mapped_column (DateTime(timezone=True))
    set_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    # When you actually see it: lit by the sun, under a dark sky.
    # Not nullable: only passes that are visible at some point get saved,
    # so every saved pass has both of these
    appear_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    fade_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    rise_azimuth: Mapped[float] = mapped_column (Float)
    culminate_azimuth: Mapped[float] = mapped_column (Float)
    set_azimuth: Mapped[float] = mapped_column (Float)
    max_altitude: Mapped[float] = mapped_column (Float)

    # Estimated brightness at its brightest moment. Lower = brighter.
    # Nullable: a satellite with no known standard magnitude
    # can't have its brightness estimated
    magnitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class FollowedSatellite(Base):
    __tablename__ = "followed_satellites"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    satellite_id: Mapped[int] = mapped_column(ForeignKey("satellites.id"), primary_key=True)
    followed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

