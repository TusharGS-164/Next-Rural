# backend/main.py
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routes import profiles, careers, opportunities, recommend, chat, auth, transcribe

logging.basicConfig(level=logging.INFO, format="%(name)s - %(levelname)s - %(message)s")

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Rural Youth Pathways API",
    description="Career guidance for rural youth — North Karnataka",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://your-production-domain.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,        prefix="/api", tags=["Auth"])
app.include_router(profiles.router,    prefix="/api", tags=["Profiles"])
app.include_router(careers.router,     prefix="/api", tags=["Careers"])
app.include_router(opportunities.router,prefix="/api",tags=["Opportunities"])
app.include_router(recommend.router,   prefix="/api", tags=["Recommendations"])
app.include_router(chat.router,        prefix="/api", tags=["Chat"])
app.include_router(transcribe.router,  prefix="/api", tags=["Transcription"])


@app.on_event("startup")
async def startup_event():
    """
    Pre-warm AI models on startup so the first request isn't slow.
    Models are loaded lazily — this just triggers the lazy load early.
    """
    from services.ai.embeddings import is_available, _load_model
    from services.ai.transcriber import is_available as whisper_available

    if is_available():
        try:
            _load_model()
            logging.info("✓ Embedding model pre-warmed")
        except Exception as e:
            logging.warning(f"Embedding model pre-warm failed: {e}")

    if whisper_available():
        logging.info("✓ Whisper available (loads on first transcription request)")
    else:
        logging.info("ℹ Whisper not installed — voice transcription disabled")


@app.get("/")
def root():
    return {"message": "Rural Youth Pathways API v2", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "ok"}