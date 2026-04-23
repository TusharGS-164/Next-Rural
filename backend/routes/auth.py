# backend/routes/auth.py
"""
Auth routes:
  POST /api/auth/register  — create account → returns token pair
  POST /api/auth/login     — sign in → returns token pair
  POST /api/auth/refresh   — exchange refresh token → new access token
  GET  /api/auth/me        — returns current user (protected)
  POST /api/auth/logout    — client-side only (just drop the tokens)
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.schemas import (
    RegisterRequest, LoginRequest,
    TokenResponse, RefreshRequest, AuthUserOut,
)
from services.auth_service import (
    register_user, authenticate_user,
    create_token_pair, decode_refresh_token,
    get_user_by_id,
)
from services.dependencies import get_current_user
from models.db_models import User

router = APIRouter(prefix="/auth")

# backend/routes/auth.py

@router.post("/register", response_model=TokenResponse, status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    user = register_user(db, body)

    tokens = create_token_pair(user.id, user.email)

    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "token_type": "bearer"
    }


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, body.email, body.password)

    tokens = create_token_pair(user.id, user.email)

    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "token_type": "bearer"
    }


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    user_id = decode_refresh_token(body.refresh_token)
    user = get_user_by_id(db, user_id)

    if not user or not user.is_active:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or disabled"
        )

    tokens = create_token_pair(user.id, user.email)

    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "token_type": "bearer"
    }


@router.get("/me", response_model=AuthUserOut)
def me(current_user: User = Depends(get_current_user)):
    """
    Returns the currently authenticated user.
    Protected — requires valid Bearer token.
    """
    return current_user


@router.post("/logout")
def logout():
    """
    JWT is stateless — logout is handled client-side by deleting tokens.
    This endpoint exists so the frontend has a clean API call to make.
    In production you'd add a token blacklist (Redis) here.
    """
    return {"message": "Logged out. Delete your tokens on the client."}