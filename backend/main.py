import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routes import profiles, careers, opportunities, recommend, chat, auth, transcribe

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

# Avoid in production
if os.getenv("ENV") == "development":
    Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Rural Youth Pathways API",
    description="Career guidance for rural youth — North Karnataka",
    version="2.0.0",
)

origins = os.getenv("CORS_ORIGINS", "").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(profiles.router, prefix="/api", tags=["Profiles"])
app.include_router(careers.router, prefix="/api", tags=["Careers"])
app.include_router(opportunities.router, prefix="/api", tags=["Opportunities"])
app.include_router(recommend.router, prefix="/api", tags=["Recommendations"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(transcribe.router, prefix="/api", tags=["Transcription"])


@app.on_event("startup")
async def startup_event():
    from services.ai.embeddings import is_available
    from services.ai.transcriber import is_available as whisper_available

    if is_available():
        logging.info("Embedding model ready (lazy load)")

    if whisper_available():
        logging.info("Whisper installed — will load on first use")
    else:
        logging.info("Whisper not installed")


@app.get("/")
def root():
    return {"message": "Rural Youth Pathways API v2", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}