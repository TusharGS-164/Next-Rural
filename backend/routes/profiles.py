# backend/routes/profiles.py
"""
Profile routes support two modes:

1. Guest mode  — POST /api/profile
   No JWT needed. Profile saved anonymously. Works for offline-first users.

2. Auth mode   — POST /api/profile/authenticated  |  GET /api/profile/me
   JWT required. Profile is linked to the logged-in account.
   If the user already has a profile it's updated (upsert), not duplicated.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models.db_models import UserProfile, User
from models.schemas import UserProfileCreate, UserProfileOut
from services.dependencies import get_current_user
from services.auth_service import decode_access_token, get_user_by_id

router = APIRouter()

# Optional bearer — doesn't raise 403 when the header is absent
_optional_bearer = HTTPBearer(auto_error=False)


def _optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_optional_bearer),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Returns the User if a valid Bearer token is present, otherwise None.
    This lets guest and logged-in users hit the same endpoint.
    """
    if not credentials:
        return None
    try:
        data = decode_access_token(credentials.credentials)
        return get_user_by_id(db, data["user_id"])
    except Exception:
        return None  # invalid token → treat as guest


# ── Guest-friendly profile creation ──────────────────────────
@router.post("/profile", response_model=UserProfileOut, status_code=201)
def create_profile(
    profile: UserProfileCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(_optional_user),
):
    """
    Create a profile.
    - If called with a valid JWT → links profile to that user account.
    - If called without JWT (guest) → saves anonymously (user_id=None).
    """
    user_id    = current_user.id if current_user else None
    db_profile = UserProfile(**profile.model_dump(), user_id=user_id)
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile


# ── Auth-required upsert ──────────────────────────────────────
@router.post("/profile/authenticated", response_model=UserProfileOut, status_code=201)
def upsert_authenticated_profile(
    profile: UserProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create or update the profile belonging to the authenticated user.
    Calling this multiple times won't duplicate the profile.
    """
    existing = (
        db.query(UserProfile)
        .filter(UserProfile.user_id == current_user.id)
        .first()
    )
    if existing:
        for field, value in profile.model_dump().items():
            setattr(existing, field, value)
        db.commit()
        db.refresh(existing)
        return existing

    db_profile = UserProfile(**profile.model_dump(), user_id=current_user.id)
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile


# ── My profile ────────────────────────────────────────────────
@router.get("/profile/me", response_model=UserProfileOut)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns the profile linked to the logged-in user."""
    p = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not p:
        raise HTTPException(
            status_code=404,
            detail="Profile not found. Complete the assessment first.",
        )
    return p


# ── Fetch by ID (public) ──────────────────────────────────────
@router.get("/profile/{profile_id}", response_model=UserProfileOut)
def get_profile(profile_id: int, db: Session = Depends(get_db)):
    p = db.query(UserProfile).filter(UserProfile.id == profile_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Profile not found")
    return p