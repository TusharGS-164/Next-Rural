# backend/models/schemas.py
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# ── Auth ─────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str           # plain-text; hashed in the service layer
    phone: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshRequest(BaseModel):
    refresh_token: str

class AuthUserOut(BaseModel):
    id: int
    email: str
    phone: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── UserProfile ──────────────────────────────────────────────

class UserProfileCreate(BaseModel):
    name: str
    age: Optional[int] = None
    education: str
    interest: str
    district: str
    language: Optional[str] = "en"
    travel_range: Optional[str] = "20km"
    goal: Optional[str] = "certificate"

class UserProfileOut(UserProfileCreate):
    id: int
    user_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Career ───────────────────────────────────────────────────

class CareerOut(BaseModel):
    id: int
    title: str
    category: str
    education_min: str
    duration: str
    salary_range: str
    description: str
    skills: str
    match_score: Optional[float] = None

    class Config:
        from_attributes = True


# ── Opportunity ──────────────────────────────────────────────

class OpportunityOut(BaseModel):
    id: int
    name: str
    type: str
    district: str
    description: str
    benefit: str
    apply_url: Optional[str] = None
    phone: Optional[str] = None

    class Config:
        from_attributes = True


# ── Recommendation ───────────────────────────────────────────

class RecommendRequest(BaseModel):
    education: str
    interest: str
    district: str
    goal: Optional[str] = None
    travel_range: Optional[str] = None