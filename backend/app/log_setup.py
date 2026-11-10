"""Logging.

Called when the server starts (main.py), and by any script run by hand that
logs, so its messages show up too.
"""

import logging

from app.config import settings


def setup_logging() -> None:
    logging.basicConfig(
        # Only messages at this level or above are shown. INFO hides DEBUG.
        level=settings.log_level.upper(),
        # e.g. 2026-11-09 14:40:12 INFO    app.services.celestrak: Updated ISS
        format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )