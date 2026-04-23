# backend/routes/opportunities.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models.db_models import Opportunity
from models.schemas import OpportunityOut
from typing import List, Optional

router = APIRouter()

@router.get("/opportunities", response_model=List[OpportunityOut])
def list_opportunities(
    district: Optional[str] = Query(None, description="Filter by district name"),
    type: Optional[str]     = Query(None, description="Filter by type: iti, scheme, job, apprenticeship"),
    db: Session = Depends(get_db)
):
    """
    Returns local opportunities filtered by district and/or type.
    Example: GET /api/opportunities?district=Dharwad&type=iti
    """
    query = db.query(Opportunity)
    if district:
        # Case-insensitive partial match so "dharwad" matches "Dharwad"
        query = query.filter(Opportunity.district.ilike(f"%{district}%"))
    if type:
        query = query.filter(Opportunity.type == type)
    return query.all()
