# backend/services/auth_service.py
"""
JWT authentication service.

Token strategy:
  - Access token:  short-lived (30 min), used on every API request
  - Refresh token: long-lived (7 days), used only to get a new access token
  - Both are signed with HS256 using JWT_SECRET from .env

Password hashing: bcrypt via passlib (never stored plain-text)
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional
import hashlib


from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from models.db_models import User
from models.schemas import RegisterRequest

# ── Config ────────────────────────────────────────────────────
JWT_SECRET      = os.getenv("JWT_SECRET", "change-this-in-production-use-a-long-random-string")
ALGORITHM   = "HS256"
ACCESS_EXPIRE   = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))    # minutes
REFRESH_EXPIRE  = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS",   "7"))     # days

# ── Password hashing ─────────────────────────────────────────
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain: str):
    digest = hashlib.sha256(plain.encode()).hexdigest()
    return pwd_ctx.hash(digest)

def verify_password(plain: str, hashed: str) -> bool:
    digest = hashlib.sha256(plain.encode()).hexdigest()
    return pwd_ctx.verify(digest, hashed)


# ── Token creation ────────────────────────────────────────────
def _create_token(data: dict, expires_delta: timedelta) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + expires_delta
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)

def create_access_token(user_id: str):
    payload = {
        "sub": user_id,
        "type" : "access",
        "exp": datetime.utcnow() + timedelta(minutes=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)



def create_refresh_token(user_id: str):
    payload = {
        "sub": user_id,
        "type":"refresh",
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)

def create_token_pair(user_id: int, email: str):
    access_token = create_access_token(str(user_id))
    refresh_token = create_refresh_token(str(user_id))

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


# ── Token verification ────────────────────────────────────────
def decode_access_token(token: str) -> dict:
    """
    Decodes and validates an access token.
    Raises 401 HTTPException on any failure.
    """
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            raise credentials_exc
        user_id: str = payload.get("sub")
        if not user_id:
            raise credentials_exc
        return {"user_id": int(user_id), "email": payload.get("email")}
    except JWTError:
        raise credentials_exc

def decode_refresh_token(token: str) -> int:
    """Returns user_id from a valid refresh token, raises 401 otherwise."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise ValueError("Not a refresh token")
        return int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )


# ── DB operations ─────────────────────────────────────────────
def register_user(db: Session, req: RegisterRequest) -> User:
    """
    Creates a new auth_users row.
    Raises 400 if email already exists.
    """
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists",
        )
    user = User(
        email           = req.email,
        phone           = req.phone,
        hashed_password = hash_password(req.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def authenticate_user(db: Session, email: str, password: str) -> User:
    """
    Looks up user by email and verifies password.
    Raises 401 on any failure (intentionally vague to prevent enumeration).
    """
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled. Contact support.",
        )
    return user

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()