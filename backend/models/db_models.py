# backend/models/db_models.py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    """
    Authentication table — stores login credentials only.
    Linked 1-to-1 with UserProfile via user_id foreign key.
    Keeping auth and profile data separate makes it easy to
    add OAuth / OTP login later without touching profile logic.
    """
    __tablename__ = "auth_users"

    id               = Column(Integer, primary_key=True, index=True)
    email            = Column(String(255), unique=True, index=True, nullable=False)
    phone            = Column(String(20),  unique=True, index=True, nullable=True)
    hashed_password  = Column(String(255), nullable=False)
    is_active        = Column(Boolean, default=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), onupdate=func.now())

    # One auth user → one profile (uselist=False = one-to-one)
    profile = relationship("UserProfile", back_populates="auth_user", uselist=False)


class UserProfile(Base):
    __tablename__ = "users"

    id           = Column(Integer, primary_key=True, index=True)
    # FK to auth_users — nullable so anonymous/guest profiles still work
    user_id      = Column(Integer, ForeignKey("auth_users.id"), nullable=True, index=True)
    name         = Column(String(100), nullable=False)
    age          = Column(Integer)
    education    = Column(String(50))
    interest     = Column(String(100))
    district     = Column(String(100))
    language     = Column(String(20), default="en")
    travel_range = Column(String(20))
    goal         = Column(String(50))
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    auth_user = relationship("User", back_populates="profile")


class Career(Base):
    __tablename__ = "careers"

    id              = Column(Integer, primary_key=True, index=True)
    title           = Column(String(150), nullable=False)
    category        = Column(String(50))
    education_min   = Column(String(20))
    duration        = Column(String(50))
    salary_range    = Column(String(50))
    description     = Column(Text)
    skills          = Column(Text)
    match_interests = Column(Text)


class Opportunity(Base):
    __tablename__ = "opportunities"

    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(150), nullable=False)
    type        = Column(String(50))
    district    = Column(String(100))
    address     = Column(String(255))
    phone       = Column(String(20))
    description = Column(Text)
    benefit     = Column(String(200))
    apply_url   = Column(String(255))
    career_tags = Column(Text)