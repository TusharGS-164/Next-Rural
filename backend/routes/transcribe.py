# backend/routes/transcribe.py
"""
POST /api/transcribe
Accepts an audio file, returns transcribed text + detected language.

Frontend sends: multipart/form-data with fields:
  file:     audio file (webm/mp3/wav/ogg)
  language: optional language hint ("kn", "hi", "te", "en")

Flow:
  Browser MediaRecorder → webm blob → POST /api/transcribe
  → Whisper → {"text": "...", "language": "kn"} → chat input pre-filled

Rate limiting note: transcription is CPU-heavy (~3s per 10s audio on 2 vCPU).
In production, add a simple semaphore or queue to avoid overload.
"""

import os
import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Optional

logger = logging.getLogger(__name__)

router = APIRouter()

# Max audio size: 10MB (covers ~10 minutes of compressed audio)
MAX_AUDIO_BYTES = int(os.getenv("MAX_AUDIO_MB", "10")) * 1024 * 1024

ALLOWED_EXTENSIONS = {"webm", "mp3", "wav", "ogg", "m4a", "flac"}


class TranscribeResponse(BaseModel):
    text:             str
    language:         str
    language_name:    str
    duration_seconds: float
    confidence:       float
    is_model_available:  bool


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(
    file:     UploadFile = File(..., description="Audio file (webm, mp3, wav, ogg, m4a)"),
    language: Optional[str] = Form(None, description="Language hint: en, kn, hi, te, mr"),
):
    """
    Transcribe a voice recording to text using Whisper.

    Returns the transcribed text and detected language.
    If Whisper is not installed, returns a 503 with install instructions.
    """
    from services.ai.transcriber import transcribe, is_available

    # Check availability first — friendly error if not installed
    if not is_available():
        raise HTTPException(
            status_code=503,
            detail=(
                "Whisper is not installed. "
                "Run: pip install openai-whisper && sudo apt-get install ffmpeg"
            ),
        )

    # Validate file extension
    filename  = file.filename or "audio.webm"
    extension = filename.rsplit(".", 1)[-1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format '{extension}'. Accepted: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Read and size-check
    audio_bytes = await file.read()
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Audio too large. Max size: {MAX_AUDIO_BYTES // (1024*1024)}MB",
        )
    if len(audio_bytes) < 100:
        raise HTTPException(status_code=400, detail="Audio file is empty or too short")

    # Transcribe
    try:
        result = transcribe(
            audio_bytes=audio_bytes,
            language=language,
            file_extension=extension,
        )
        return TranscribeResponse(**result, is_model_available=True)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Transcription error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Transcription failed. Check server logs.")


@router.get("/transcribe/status")
def transcribe_status():
    """Check if Whisper is installed and which model is loaded."""
    from services.ai.transcriber import is_available, _model_size
    return {
        "whisper_available": is_available(),
        "model_size":        _model_size,
        "supported_languages": ["en", "kn", "hi", "te", "mr", "ta", "ml"],
        "accepted_formats":  ["webm", "mp3", "wav", "ogg", "m4a"],
    }