# backend/services/ai/language.py
"""
Lightweight language detection and normalisation.

Used to:
  1. Detect which language the user typed in (for chat routing)
  2. Build the right profile text vector for embeddings
  3. Decide which Whisper language hint to pass

We use langdetect (fast, no model download) for text language detection.
For translation, we call Google Translate API via the googletrans library
(unofficial, free) as a best-effort fallback — the paid Cloud Translation
API is preferred for production.
"""

from __future__ import annotations
import logging

logger = logging.getLogger(__name__)

# ISO 639-1 codes we actively support
SUPPORTED_CODES = {"en", "kn", "hi", "te", "mr", "ta", "ml"}

LANG_NAMES = {
    "en": "English",
    "kn": "Kannada",
    "hi": "Hindi",
    "te": "Telugu",
    "mr": "Marathi",
    "ta": "Tamil",
    "ml": "Malayalam",
}


def detect_language(text: str) -> str:
    """
    Detect the language of a text string.
    Returns ISO 639-1 code (e.g. "kn", "hi", "en").
    Falls back to "en" on any error.

    Requires: pip install langdetect
    """
    if not text or len(text.strip()) < 3:
        return "en"
    try:
        from langdetect import detect, DetectorFactory
        DetectorFactory.seed = 42   # deterministic results
        code = detect(text)
        return code if code in SUPPORTED_CODES else "en"
    except Exception:
        return "en"


def normalise_to_english(text: str, source_lang: str = None) -> str:
    """
    Translate text to English for Gemini chat (which reasons better in English).
    The translated English is used as the prompt; the reply is then translated back.

    This is best-effort — if translation fails, the original text is returned
    and Gemini handles it directly (it understands Indian languages natively).

    Requires: pip install googletrans==4.0.0-rc1
    Note: Use Google Cloud Translation API in production for reliability.
    """
    if not source_lang:
        source_lang = detect_language(text)

    if source_lang == "en":
        return text

    try:
        from googletrans import Translator
        translator = Translator()
        result     = translator.translate(text, src=source_lang, dest="en")
        return result.text
    except Exception as e:
        logger.warning(f"Translation failed ({source_lang}→en): {e}. Using original text.")
        return text


def translate_response(text: str, target_lang: str) -> str:
    """
    Translate an English response back to the user's language.
    Used after Gemini generates an English reply.
    """
    if target_lang == "en" or not target_lang:
        return text
    try:
        from googletrans import Translator
        translator = Translator()
        result     = translator.translate(text, src="en", dest=target_lang)
        return result.text
    except Exception as e:
        logger.warning(f"Translation failed (en→{target_lang}): {e}. Using English.")
        return text


def get_language_name(code: str) -> str:
    """Human-readable name for an ISO code."""
    return LANG_NAMES.get(code, code.upper())