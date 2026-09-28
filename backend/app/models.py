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

    id: Mapped[int] = mapped_column (primary_key=True)
    norad_id: Mapped[int] = mapped_column (unique=True, index=True)
    name: Mapped[str] = mapped_column (String(255))
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

    rise_time: Mapped[datetime] = mapped_column (DateTime(timezone=True), index=True)
    culminate_time: Mapped[datetime] = mapped_column (DateTime(timezone=True))
    set_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    rise_azimuth: Mapped[float] = mapped_column (Float)
    culminate_azimuth: Mapped[float] = mapped_column (Float)
    set_azimuth: Mapped[float] = mapped_column (Float)
    max_altitude: Mapped[float] = mapped_column (Float)

    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class FollowedSatellite(Base):
    __tablename__ = "followed_satellites"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    satellite_id: Mapped[int] = mapped_column(ForeignKey("satellites.id"), primary_key=True)
    followed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

