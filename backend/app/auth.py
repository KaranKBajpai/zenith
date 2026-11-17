"""Who is making this request? Checks the Clerk session token and returns
the matching row from our users table."""

import logging

import jwt
from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User

logger = logging.getLogger(__name__)

# Downloads Clerk's public keys from the JWKS URL the first time it's
# needed, then keeps them cached so we don't fetch them on every request.
_jwks_client = jwt.PyJWKClient(settings.clerk_jwks_url)


def _not_signed_in() -> HTTPException:
    # 401 = "who are you?" (not signed in / bad token).
    # The WWW-Authenticate header is the standard way to say "send a Bearer token".
    return HTTPException(
        status_code=401,
        detail="Not signed in",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    # Step 1: read "Authorization: Bearer <token>".
    # partition(" ") splits at the first space: ("Bearer", " ", "<token>")
    header = request.headers.get("Authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme != "Bearer" or not token:
        raise _not_signed_in()

    # Step 2: check the token.
    try:
        # The token's header names which of Clerk's keys signed it; get that key.
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            # Only accept Clerk's algorithm. Never let the token choose.
            algorithms=["RS256"],
            # These must be present. decode() also checks exp (expired?)
            # and nbf (not valid yet?) automatically.
            options={"require": ["exp", "nbf", "sub"]},
            # Allow 5 seconds of clock difference between Clerk and this computer.
            leeway=5,
        )
    except jwt.PyJWTError as error:
        # Bad signature, expired, malformed, or Clerk's keys unreachable.
        logger.info("Rejected a session token: %s", error)
        raise _not_signed_in()

    # Step 3: azp = the website that asked Clerk for this token.
    # It must be one of OUR frontends. Clerk's docs say to always check it.
    azp = claims.get("azp")
    if azp is not None and azp not in settings.frontend_origin_list:
        logger.warning("Rejected a token for an unknown origin: %s", azp)
        raise _not_signed_in()

    # Step 4: find our user for this Clerk user ("sub" = Clerk's user id),
    # or create one the first time this account makes a request.
    clerk_id = claims["sub"]
    user = db.scalars(select(User).where(User.clerk_user_id == clerk_id)).first()
    if user is None:
        user = User(
            clerk_user_id=clerk_id,
            # From the custom claim set in Clerk's dashboard (Sessions).
            email=claims.get("email", ""),
        )
        db.add(user)
        try:
            db.commit()
            logger.info("Created user %s for Clerk user %s", user.id, clerk_id)
        except IntegrityError:
            # A brand-new account's first two requests can arrive at the same
            # moment (Home sends two at once). The other request created the
            # row first, and the unique rule on clerk_user_id blocked ours.
            # Throw ours away and use theirs.
            db.rollback()
            user = db.scalars(select(User).where(User.clerk_user_id == clerk_id)).one()

    return user