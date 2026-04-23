# backend/routes/recommend.py
"""
POST /api/recommend
Returns personalised career recommendations + local opportunities.

AI mode selection (automatic):
  - If sentence-transformers is installed → uses embedding-based scoring (better)
  - Otherwise → falls back to rule-based scoring (always works, no dependencies)

The frontend doesn't need to know which mode is active.
GET /api/recommend/status tells you which engine is running.
"""

import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models.schemas import RecommendRequest
from models.db_models import Career
from services.recommend_service import get_recommendations, get_local_opportunities
from services.ai.embeddings import (
    score_careers_with_embeddings,
    is_available as embeddings_available,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _format_opportunity(o) -> dict:
    return {
        "id":          o.id,
        "name":        o.name,
        "type":        o.type,
        "district":    o.district,
        "description": o.description,
        "benefit":     o.benefit,
        "apply_url":   o.apply_url,
        "phone":       o.phone,
    }


@router.post("/recommend")
def recommend(
    request: RecommendRequest,
    db: Session = Depends(get_db),
    engine: str = Query(
        default="auto",
        description="Recommendation engine: 'auto' | 'embedding' | 'rule'",
    ),
):
    """
    Returns top 5 career recommendations + local opportunities.

    engine=auto  → use embeddings if available, else rule-based
    engine=embedding → force embedding (returns 503 if not installed)
    engine=rule  → force rule-based (always works)
    """
    careers = db.query(Career).all()

    use_embeddings = False
    if engine == "embedding":
        if not embeddings_available():
            from fastapi import HTTPException
            raise HTTPException(
                status_code=503,
                detail="sentence-transformers not installed. Run: pip install sentence-transformers",
            )
        use_embeddings = True
    elif engine == "auto":
        use_embeddings = embeddings_available()
    # engine == "rule" → use_embeddings stays False

    # ── Score careers ──────────────────────────────────────────
    if use_embeddings:
        logger.debug("Using embedding-based recommendation engine")
        scored_careers = score_careers_with_embeddings(
            careers      = careers,
            education    = request.education,
            interest     = request.interest,
            goal         = request.goal,
            district     = request.district,
            language     = getattr(request, "language", "en"),
        )
    else:
        logger.debug("Using rule-based recommendation engine")
        scored_careers = get_recommendations(
            db           = db,
            education    = request.education,
            interest     = request.interest,
            district     = request.district,
            goal         = request.goal,
            travel_range = request.travel_range,
        )

    # ── Local opportunities ────────────────────────────────────
    top_category   = scored_careers[0]["category"] if scored_careers else None
    opportunities  = get_local_opportunities(db, request.district, top_category)

    return {
        "careers":       scored_careers,
        "opportunities": [_format_opportunity(o) for o in opportunities],
        "engine_used":   "embedding" if use_embeddings else "rule",
    }


@router.get("/recommend/status")
def recommend_status():
    """Reports which recommendation engine is active."""
    emb_avail = embeddings_available()
    return {
        "embedding_engine_available": emb_avail,
        "active_engine":              "embedding" if emb_avail else "rule",
        "model":                      "paraphrase-multilingual-MiniLM-L12-v2" if emb_avail else None,
        "supported_languages":        ["en", "kn", "hi", "te", "mr"] if emb_avail else ["en"],
    }