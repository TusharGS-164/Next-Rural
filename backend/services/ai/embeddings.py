# backend/services/ai/embeddings.py
"""
Embedding-based recommendation engine using sentence-transformers.

Model: paraphrase-multilingual-MiniLM-L12-v2
  - 50 languages including Kannada, Hindi, Telugu, Marathi
  - 384-dimensional vectors
  - ~120MB download on first use, then cached in ~/.cache/huggingface
  - Fast: ~50ms per encode on CPU

Strategy:
  1. At startup (or first call), encode all career descriptions → cache in memory
  2. On each /recommend request, encode the user's profile text in their language
  3. Compute cosine similarity → rank careers
  4. Blend with rule-based score (70% embedding + 30% rule) for robustness

The blended approach means:
  - If the ML model is confident → it dominates
  - Hard rules (education minimum) still gate results
  - Cold-start works even before the model warms up
"""

from __future__ import annotations
import logging
import threading
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

# ── Singleton model ───────────────────────────────────────────
# Loaded lazily on first use so the server starts instantly.
# Thread-safe via a lock — only one thread downloads the model.

_model      = None
_model_lock = threading.Lock()
_career_vecs: Optional[np.ndarray] = None   # cached career embeddings
_career_ids:  Optional[list]        = None   # matching career ids


def _load_model():
    """Load the multilingual model once, cache it in the module global."""
    global _model
    if _model is not None:
        return _model
    with _model_lock:
        if _model is not None:   # double-checked after acquiring lock
            return _model
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("Loading multilingual embedding model…")
            _model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
            logger.info("Embedding model ready.")
        except ImportError:
            raise RuntimeError(
                "sentence-transformers not installed. "
                "Run: pip install sentence-transformers"
            )
    return _model


def is_available() -> bool:
    """Returns True if sentence-transformers is installed."""
    try:
        import sentence_transformers  # noqa: F401
        return True
    except ImportError:
        return False


# ── Profile → text ────────────────────────────────────────────
# We turn the structured profile into a natural-language sentence.
# This lets the multilingual model understand context rather than
# just matching keywords.

INTEREST_LABELS = {
    "trade":  "electrical mechanical repair welding fabrication ITI trade",
    "health": "nursing healthcare ANM community health worker medical",
    "agri":   "farming agriculture horticulture crop livestock FPO",
    "tech":   "computer programming software IT digital data entry",
    "govt":   "government job police army railway civil services exam",
}

GOAL_LABELS = {
    "quick_earn":  "want to earn money quickly short course immediate job",
    "certificate": "want a skill certificate diploma qualification",
    "govt_job":    "want a permanent government job with pension",
    "business":    "want to start my own business self-employment entrepreneur",
}

def profile_to_text(
    education: str,
    interest: str,
    goal: str | None,
    district: str,
    language: str = "en",
) -> str:
    """
    Convert structured profile fields into a rich natural-language string.
    The richer the text, the better the embedding captures meaning.
    """
    interest_text = INTEREST_LABELS.get(interest, interest)
    goal_text     = GOAL_LABELS.get(goal or "", "")

    # Build sentence — works for any language the model supports
    text = (
        f"I am from {district}. "
        f"I have completed {education} education. "
        f"I am interested in {interest_text}. "
        f"{goal_text}."
    )
    return text


# ── Career → text ─────────────────────────────────────────────
def career_to_text(career) -> str:
    """
    Enrich a Career DB object into a text that captures all its semantics.
    Skills and category are repeated to give them more weight.
    """
    skills = (career.skills or "").replace(",", " ")
    return (
        f"{career.title}. "
        f"Category: {career.category}. "
        f"{career.description} "
        f"Skills needed: {skills}. "
        f"Minimum education: {career.education_min}. "
        f"Salary: {career.salary_range}."
    )


# ── Embedding cache ───────────────────────────────────────────
def build_career_embeddings(careers: list) -> tuple[np.ndarray, list]:
    """
    Encode all career descriptions into vectors.
    Call this once after DB is seeded; results are cached in module globals.
    Returns (matrix of shape [n_careers, 384], list of career ids).
    """
    global _career_vecs, _career_ids
    model = _load_model()
    texts = [career_to_text(c) for c in careers]
    vecs  = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
    _career_vecs = vecs
    _career_ids  = [c.id for c in careers]
    logger.info(f"Career embeddings built: {len(careers)} careers, shape {vecs.shape}")
    return vecs, _career_ids


def get_career_embeddings(careers: list) -> tuple[np.ndarray, list]:
    """Return cached embeddings, or build them if not yet cached."""
    if _career_vecs is None or len(_career_vecs) != len(careers):
        return build_career_embeddings(careers)
    return _career_vecs, _career_ids


# ── Cosine similarity ─────────────────────────────────────────
def cosine_similarity(vec_a: np.ndarray, matrix_b: np.ndarray) -> np.ndarray:
    """
    Compute cosine similarity between one vector and a matrix of vectors.
    Returns array of shape [n] with values in [-1, 1].
    Pure numpy — no torch dependency at inference time.
    """
    norm_a = vec_a / (np.linalg.norm(vec_a) + 1e-9)
    norms_b = matrix_b / (np.linalg.norm(matrix_b, axis=1, keepdims=True) + 1e-9)
    return norms_b @ norm_a


# ── Main scoring function ─────────────────────────────────────
EDUCATION_RANK = {"8th": 0, "10th": 1, "12th": 2, "graduate": 3}


def score_careers_with_embeddings(
    careers: list,
    education: str,
    interest: str,
    goal: str | None,
    district: str,
    language: str = "en",
    rule_weight: float = 0.30,
) -> list[dict]:
    """
    Hybrid scorer: 70% embedding cosine similarity + 30% rule-based.

    Args:
        careers:      List of Career ORM objects from DB
        education:    "8th" | "10th" | "12th" | "graduate"
        interest:     "trade" | "health" | "agri" | "tech" | "govt"
        goal:         "quick_earn" | "certificate" | "govt_job" | "business"
        district:     User's district name
        language:     ISO code — "en" | "kn" | "hi" | "te"
        rule_weight:  How much weight to give rule-based score (0–1)

    Returns:
        List of dicts sorted by blended score descending (top 5).
    """
    model = _load_model()

    # 1. Encode user profile
    profile_text = profile_to_text(education, interest, goal, district, language)
    user_vec     = model.encode(profile_text, convert_to_numpy=True)

    # 2. Get cached career embeddings
    career_vecs, career_id_list = get_career_embeddings(careers)

    # 3. Cosine similarity (values 0–1 after clipping)
    sim_scores = cosine_similarity(user_vec, career_vecs)
    sim_scores = np.clip(sim_scores, 0, 1)

    # 4. Rule-based scores (0–1 normalised)
    user_edu_rank = EDUCATION_RANK.get(education, 0)
    goal_map = {
        "quick_earn":  ["trade", "tech"],
        "certificate": ["trade", "health", "tech"],
        "govt_job":    ["govt"],
        "business":    ["agri", "tech"],
    }

    results = []
    for idx, career in enumerate(careers):
        # Education gate — hard filter: don't recommend if user is underqualified
        min_rank = EDUCATION_RANK.get(career.education_min, 0)
        if user_edu_rank < min_rank:
            embedding_penalty = 0.5  # heavily penalise but still show
        else:
            embedding_penalty = 1.0

        # Rule score (0–1)
        rule_score = 0.0
        career_interests = [i.strip() for i in (career.match_interests or "").split(",")]
        if interest in career_interests:
            rule_score += 0.5
        if goal and career.category in goal_map.get(goal, []):
            rule_score += 0.5

        # Blend
        emb_score    = float(sim_scores[idx]) * embedding_penalty
        blended      = (1 - rule_weight) * emb_score + rule_weight * rule_score
        match_pct    = round(min(blended * 100, 100), 1)

        results.append({
            "id":            career.id,
            "title":         career.title,
            "category":      career.category,
            "education_min": career.education_min,
            "duration":      career.duration,
            "salary_range":  career.salary_range,
            "description":   career.description,
            "skills":        career.skills,
            "match_score":   match_pct,
            "_embedding_sim": round(float(sim_scores[idx]), 4),  # for debugging
        })

    results.sort(key=lambda x: x["match_score"], reverse=True)
    return results[:5]