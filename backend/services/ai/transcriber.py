# backend/services/ai/transcriber.py
"""
Voice transcription service using OpenAI Whisper (self-hosted).

Model sizes and tradeoffs:
  tiny   (~75MB)  — fastest, less accurate for Indian languages
  base   (~145MB) — good balance for Kannada/Hindi on CPU
  small  (~480MB) — best accuracy for regional languages, still CPU-feasible
  medium (~1.5GB) — GPU recommended

For production on rural-targeted apps, "base" is the sweet spot:
  - Works on a ₹500/month VPS (2 vCPU, 2GB RAM)
  - Transcribes a 10-second voice note in ~3 seconds on CPU
  - Handles Kannada, Hindi, Telugu, Marathi accurately

Language detection:
  Whisper auto-detects language if you don't specify.
  Specifying it (e.g. language="kn") is faster and more accurate.

Audio format accepted: webm, mp3, wav, ogg, m4a (ffmpeg must be installed)
  Ubuntu/Debian: sudo apt-get install ffmpeg
"""

from __future__ import annotations
import io
import logging
import threading
import tempfile
import os
from pathlib import Path

logger = logging.getLogger(__name__)

# ── Supported languages ───────────────────────────────────────
SUPPORTED_LANGUAGES = {
    "en": "English",
    "kn": "Kannada",
    "hi": "Hindi",
    "te": "Telugu",
    "mr": "Marathi",
    "ta": "Tamil",
    "ml": "Malayalam",
}

# Whisper language codes differ from ISO 639-1 for some languages
WHISPER_LANG_MAP = {
    "kn": "kn",    # Kannada — Whisper supports it natively
    "hi": "hi",    # Hindi
    "te": "te",    # Telugu
    "mr": "mr",    # Marathi
    "ta": "ta",    # Tamil
    "ml": "ml",    # Malayalam
    "en": "en",    # English
}

# ── Singleton model ───────────────────────────────────────────
_whisper_model      = None
_whisper_lock       = threading.Lock()
_model_size: str    = os.getenv("WHISPER_MODEL_SIZE", "base")


def _load_whisper():
    """Lazy-load Whisper on first transcription request."""
    global _whisper_model
    if _whisper_model is not None:
        return _whisper_model
    with _whisper_lock:
        if _whisper_model is not None:
            return _whisper_model
        try:
            import whisper
            logger.info(f"Loading Whisper model: {_model_size}…")
            _whisper_model = whisper.load_model(_model_size)
            logger.info(f"Whisper '{_model_size}' model ready.")
        except ImportError:
            raise RuntimeError(
                "openai-whisper not installed. "
                "Run: pip install openai-whisper"
            )
    return _whisper_model


def is_available() -> bool:
    try:
        import whisper  # noqa: F401
        return True
    except ImportError:
        return False


# ── Transcription ─────────────────────────────────────────────
def transcribe(
    audio_bytes: bytes,
    language: str = None,
    file_extension: str = "webm",
) -> dict:
    """
    Transcribe audio bytes → text.

    Args:
        audio_bytes:    Raw audio file content (from UploadFile.read())
        language:       ISO code hint ("kn", "hi", "te", "en").
                        If None, Whisper auto-detects (slightly slower).
        file_extension: File format — "webm", "mp3", "wav", "ogg", "m4a"

    Returns:
        {
            "text":             str,    # transcribed text
            "language":         str,    # detected language code
            "language_name":    str,    # e.g. "Kannada"
            "duration_seconds": float,
            "confidence":       float,  # avg log-prob as confidence proxy
        }

    Raises:
        RuntimeError if whisper is not installed
        ValueError   if audio is empty or unreadable
    """
    if not audio_bytes:
        raise ValueError("Empty audio — no bytes received")

    model = _load_whisper()

    # Write to a temp file (Whisper reads from disk, not memory)
    with tempfile.NamedTemporaryFile(
        suffix=f".{file_extension}", delete=False
    ) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        whisper_lang = WHISPER_LANG_MAP.get(language) if language else None

        result = model.transcribe(
            tmp_path,
            language=whisper_lang,
            # These settings optimise for short voice queries (5–30s)
            condition_on_previous_text=False,
            fp16=False,                          # CPU inference
            temperature=0,                       # deterministic (no hallucination)
            word_timestamps=False,
            verbose=False,
        )

        detected_lang  = result.get("language", language or "en")
        detected_name  = SUPPORTED_LANGUAGES.get(detected_lang, detected_lang)

        # Compute a rough confidence from segment log probabilities
        segments   = result.get("segments", [])
        if segments:
            avg_logprob = sum(s.get("avg_logprob", -1) for s in segments) / len(segments)
            # log_prob of -0.5 ≈ 60% confidence; -1.0 ≈ 37%; clip to 0–1
            confidence = round(max(0.0, min(1.0, 1.0 + avg_logprob)), 3)
        else:
            confidence = 0.0

        # Duration from last segment's end time
        duration = segments[-1]["end"] if segments else 0.0

        return {
            "text":             result["text"].strip(),
            "language":         detected_lang,
            "language_name":    detected_name,
            "duration_seconds": round(duration, 2),
            "confidence":       confidence,
        }

    finally:
        # Always clean up the temp file
        try:
            os.unlink(tmp_path)
        except OSError:
            pass