# backend/routes/careers.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models.db_models import Career
from models.schemas import CareerOut
from typing import List

router = APIRouter()

@router.get("/careers", response_model=List[CareerOut])
def list_careers(db: Session = Depends(get_db)):
    """Return all careers. Used for the Explore Pathways page."""
    return db.query(Career).all()
