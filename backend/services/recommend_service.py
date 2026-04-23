# backend/services/recommend_service.py
"""
Rule-based recommendation engine.
Scores careers by matching user's education, interest, and goal.
Each rule adds points — highest total score = best match.
Easy to extend later with ML embeddings (see comments).
"""
from sqlalchemy.orm import Session
from models.db_models import Career, Opportunity

# Education hierarchy: higher index = more qualified
EDUCATION_RANK = {
    "8th": 0,
    "10th": 1,
    "12th": 2,
    "graduate": 3,
}

def get_recommendations(
    db: Session,
    education: str,
    interest: str,
    district: str,
    goal: str = None,
    travel_range: str = None
) -> list:
    """
    Returns careers sorted by match score (0–100).
    Scoring rules:
      +40  if career matches user's interest category
      +30  if user meets minimum education requirement
      +20  if career goal matches user's stated goal
      +10  base score (everyone gets this)
    """
    careers = db.query(Career).all()
    scored = []

    user_edu_rank = EDUCATION_RANK.get(education, 0)

    for career in careers:
        score = 10  # base score

        # Match interest
        career_interests = [i.strip() for i in career.match_interests.split(",")]
        if interest in career_interests:
            score += 40

        # Check education eligibility
        min_edu_rank = EDUCATION_RANK.get(career.education_min, 0)
        if user_edu_rank >= min_edu_rank:
            score += 30
        else:
            score -= 20  # below minimum, still show but penalise

        # Goal alignment bonus
        goal_map = {
            "quick_earn":   ["trade", "tech"],
            "certificate":  ["trade", "health", "tech"],
            "govt_job":     ["govt"],
            "business":     ["agri", "tech"],
        }
        if goal and career.category in goal_map.get(goal, []):
            score += 20

        scored.append({
            "id":           career.id,
            "title":        career.title,
            "category":     career.category,
            "education_min":career.education_min,
            "duration":     career.duration,
            "salary_range": career.salary_range,
            "description":  career.description,
            "skills":       career.skills,
            "match_score":  min(score, 100),  # cap at 100
        })

    # Sort by score descending, return top 5
    scored.sort(key=lambda x: x["match_score"], reverse=True)
    return scored[:5]


def get_local_opportunities(db: Session, district: str, career_category: str = None):
    """
    Returns opportunities filtered by district.
    Optionally filters by career_category tag.
    """
    query = db.query(Opportunity).filter(
        Opportunity.district.ilike(f"%{district}%")
    )
    results = query.all()

    # If a career category is given, further filter by career_tags
    if career_category:
        results = [
            o for o in results
            if career_category in (o.career_tags or "")
        ]
    return results


# ─────────────────────────────────────────────────────────────
# FUTURE AI EXTENSION (design stub — not active yet)
# ─────────────────────────────────────────────────────────────
# def get_recommendations_ai(user_profile_text: str):
#     """
#     Future: embed user profile text using sentence-transformers,
#     compare cosine similarity against pre-embedded career descriptions.
#     Replace rule-based scoring above with this for better accuracy.
#
#     from sentence_transformers import SentenceTransformer, util
#     model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
#     # supports Hindi, Kannada, Telugu out of the box
#     user_vec = model.encode(user_profile_text)
#     career_vecs = [model.encode(c.description) for c in careers]
#     scores = util.cos_sim(user_vec, career_vecs)
#     """
#     pass
