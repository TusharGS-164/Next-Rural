# backend/services/dependencies.py
"""
FastAPI dependency functions for JWT auth.

Usage in any route:
    from services.dependencies import get_current_user, require_active_user

    @router.get("/me")
    def me(current_user = Depends(get_current_user)):
        return current_user

    @router.post("/protected")
    def protected(current_user = Depends(require_active_user)):
        ...
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from database import get_db
from models.db_models import User
from services.auth_service import decode_access_token, get_user_by_id

# Extracts "Bearer <token>" from the Authorization header automatically
bearer_scheme = HTTPBearer(auto_error=True)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Decodes the JWT from the Authorization header and returns
    the matching User row from the database.
    Raises 401 if token is invalid or user not found.
    """
    token_data = decode_access_token(credentials.credentials)
    user = get_user_by_id(db, token_data["user_id"])
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found — token may be stale",
        )
    return user


def require_active_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Same as get_current_user but also checks is_active flag.
    Use this on routes that should be blocked for disabled accounts.
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )
    return current_user