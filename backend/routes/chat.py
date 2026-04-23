'''
import os
import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict

router = APIRouter()

# Lazy-load Gemini model
_model = None


def get_model():
    global _model

    if _model is None:
        try:
            import google.generativeai as genai

            api_key = os.environ.get("GEMINI_API_KEY")
            if not api_key:
                raise HTTPException(
                    status_code=500,
                    detail="GEMINI_API_KEY not set in environment"
                )

            genai.configure(api_key=api_key)

            _model = genai.GenerativeModel(
                "gemini-2.5-flash",
                generation_config={"temperature": 0.7}
            )

        except ImportError:
            raise HTTPException(
                status_code=503,
                detail="google-generativeai not installed. Run: pip install google-generativeai"
            )

    return _model


class ChatRequest(BaseModel):
    message: str
    profile: Optional[Dict] = None
    history: Optional[List[Dict]] = None


class ChatResponse(BaseModel):
    reply: str


# System prompt
SYSTEM_PROMPT = """
You are a friendly, practical career mentor for rural youth in Karnataka, India.

Your role:

* Guide users towards realistic, local career paths (ITI trades, PMKVY, NAPS, healthcare, govt jobs)
* Give step-by-step advice on applications, documents required, deadlines
* Recommend specific institutes (e.g. "Government ITI Dharwad, call 0836-2447123")
* If the user writes in Kannada, Hindi, or Telugu — reply in that same language
* Keep all responses under 200 words, simple vocabulary, no jargon
* Always end with one clear next-action the user can take today

Key facts you know:

* PMKVY 4.0: free training + ₹8,000 stipend, apply at pmkvyofficial.org
* NAPS: earn ₹5,000-10,000/month while learning, register at apprenticeshipindia.org
* Government ITI Dharwad: Electrician, Welder, COPA trades, phone 0836-2447123
* ANM Nursing training: 2 years, 100% PHC posting, KIMS Hubli 0836-2370444
* KSP Constable exam: 10th/12th pass, physical + written test
* KVK Gadag: free agri-entrepreneurship training, 08372-220221

Do NOT make up scheme names, phone numbers, or URLs.
Do NOT give medical or legal advice.
"""


@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest):
    # Validate input
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    model = get_model()

    # Build profile context
    profile_ctx = ""
    if body.profile:
        p = body.profile
        profile_ctx = (
            f"\nUser profile: name={p.get('name','')}, "
            f"education={p.get('education','')}, "
            f"interest={p.get('interest','')}, "
            f"district={p.get('district','')}, "
            f"goal={p.get('goal','')}"
        )

    # Build history for Gemini
    history_for_gemini = []
    for turn in (body.history or []):
        role = "model" if turn.get("role") == "bot" else "user"
        history_for_gemini.append({
            "role": role,
            "parts": [turn.get("text", "")]
        })

    # Trim history (avoid token overflow)
    history_for_gemini = history_for_gemini[-6:]

    # Inject system prompt only once
    if not history_for_gemini:
        history_for_gemini.append({
            "role": "user",
            "parts": [SYSTEM_PROMPT + profile_ctx]
        })

    try:
        chat_session = model.start_chat(history=history_for_gemini)

        response = await asyncio.wait_for(
            asyncio.to_thread(chat_session.send_message, body.message),
            timeout=30
        )

        reply = response.text.strip() if response.text else "Sorry, I couldn't respond."

        return ChatResponse(reply=reply)

    except asyncio.TimeoutError:
         return ChatResponse(
        reply="⏳ AI is taking too long. Showing quick offline guidance:\n\nTry ITI Electrician or PMKVY courses near you. Visit your nearest ITI or check pmkvyofficial.org today."
    )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API error: {str(e)}")
      '''  

# backend/routes/chat.py
"""
POST /api/chat
Google Gemini-powered conversational career mentor with:
  - Automatic language detection (langdetect)
  - Multilingual input: non-English text translated to English for Gemini
  - Multilingual output: Gemini reply translated back to user's language
  - Graceful fallback if translation is unavailable (Gemini handles Indian
    languages reasonably well without explicit translation)
"""

import os
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Gemini setup ──────────────────────────────────────────────
_gemini_model = None

def _get_gemini():
    global _gemini_model
    if _gemini_model is None:
        try:
            import google.generativeai as genai
            api_key = os.environ.get("GEMINI_API_KEY")
            if not api_key:
                raise ValueError("GEMINI_API_KEY not set in .env")
            genai.configure(api_key=api_key)
            _gemini_model = genai.GenerativeModel("gemini-2.5-flash")
        except ImportError:
            raise RuntimeError("google-generativeai not installed")
    return _gemini_model


# ── System prompt ─────────────────────────────────────────────
SYSTEM_PROMPT = """
You are a friendly, practical career mentor for rural youth in Karnataka, India.

Your role:
- Guide users towards realistic, local career paths
- Focus on: ITI trades, PMKVY, NAPS apprenticeships, healthcare, government jobs
- Give step-by-step advice: documents needed, deadlines, registration links
- Recommend specific institutes with phone numbers when relevant
- Keep all responses under 200 words, plain language, no jargon
- End every response with one clear next action the user can take today

Key facts:
- PMKVY 4.0: free training + ₹8,000 stipend → pmkvyofficial.org
- NAPS: earn ₹5,000–10,000/month while learning → apprenticeshipindia.org
- Govt ITI Dharwad: Electrician/Welder/COPA → 0836-2447123
- ANM Nursing KIMS Hubli: 2 yr, 100% PHC posting → 0836-2370444
- KSP Constable: 10th/12th pass, physical + written exam
- KVK Gadag: free agri training → 08372-220221

Do NOT make up phone numbers, URLs, or scheme names.
Do NOT give medical or legal advice.
Respond in the same language the user wrote in.
"""


# ── Request / Response schemas ─────────────────────────────────
class ChatRequest(BaseModel):
    message:  str
    profile:  Optional[dict] = None
    history:  Optional[list] = []   # [{role, text}, ...]
    language: Optional[str]  = None  # override detected language


class ChatResponse(BaseModel):
    reply:           str
    detected_lang:   str
    language_name:   str
    translated_input: Optional[str] = None   # English version sent to Gemini


# ── Chat endpoint ─────────────────────────────────────────────
@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest):
    model = _get_gemini()

    # 1. Detect language of the user's message
    from services.ai.language import (
        detect_language, normalise_to_english,
        translate_response, get_language_name,
    )

    detected_lang = body.language or detect_language(body.message)
    lang_name     = get_language_name(detected_lang)

    # 2. Translate non-English input to English for Gemini
    #    (Gemini reasons better in English; reply is translated back)
    if detected_lang != "en":
        english_message = normalise_to_english(body.message, detected_lang)
        logger.debug(f"Translated [{detected_lang}→en]: {body.message!r} → {english_message!r}")
    else:
        english_message = body.message

    # 3. Build profile context string
    profile_ctx = ""
    if body.profile:
        p = body.profile
        profile_ctx = (
            f"\nUser profile: name={p.get('name','')}, "
            f"education={p.get('education','')}, "
            f"interest={p.get('interest','')}, "
            f"district={p.get('district','')}, "
            f"goal={p.get('goal','')}, "
            f"language={detected_lang}"
        )

    # 4. Build Gemini conversation history
    history_for_gemini = []
    for turn in (body.history or []):
        role = "model" if turn.get("role") == "bot" else "user"
        history_for_gemini.append({
            "role":  role,
            "parts": [turn.get("text", "")],
        })

    # 5. Call Gemini
    try:
        session  = model.start_chat(history=history_for_gemini)
        prompt   = SYSTEM_PROMPT + profile_ctx + f"\n\nUser message (in English): {english_message}"
        response = session.send_message(prompt)
        english_reply = response.text.strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini error: {e}")

    # 6. Translate reply back to the user's language
    if detected_lang != "en":
        final_reply = translate_response(english_reply, detected_lang)
    else:
        final_reply = english_reply

    return ChatResponse(
        reply            = final_reply,
        detected_lang    = detected_lang,
        language_name    = lang_name,
        translated_input = english_message if detected_lang != "en" else None,
    )


@router.get("/chat/status")
def chat_status():
    """Check which AI features are available."""
    from services.ai.transcriber import is_available as whisper_ok
    from services.ai.embeddings  import is_available as embed_ok

    gemini_ok = bool(os.environ.get("GEMINI_API_KEY"))

    try:
        from langdetect import detect  # noqa
        langdetect_ok = True
    except ImportError:
        langdetect_ok = False

    try:
        from googletrans import Translator  # noqa
        translate_ok = True
    except ImportError:
        translate_ok = False

    return {
        "gemini":             gemini_ok,
        "whisper_transcribe": whisper_ok(),
        "embedding_recommend":embed_ok(),
        "language_detection": langdetect_ok,
        "translation":        translate_ok,
    }      