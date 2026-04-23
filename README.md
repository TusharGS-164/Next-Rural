# 🌾 Rural Youth Pathways — Full-Stack Platform

A career guidance platform for rural youth in Tier 3 towns and villages.

**Stack:** React 18 + Tailwind CSS (PWA) · Python FastAPI · SQLite (→ PostgreSQL) · Google Gemini AI

---

## 📁 Folder Structure

```
rural-pathways/
│
├── frontend/                        # React PWA
│   ├── index.html
│   ├── vite.config.js               # Vite + PWA plugin
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx                 # React entry point
│       ├── App.jsx                  # Router + global state wiring
│       ├── index.css                # Tailwind directives
│       │
│       ├── components/
│       │   ├── Navbar.jsx           # Sticky top nav with route links
│       │   ├── CareerCard.jsx       # Career recommendation card
│       │   ├── OpportunityCard.jsx  # ITI / scheme / job card
│       │   ├── OnboardingForm.jsx   # Multi-step visual quiz
│       │   ├── ProgressTracker.jsx  # Roadmap step tracker
│       │   └── ui/
│       │       └── index.jsx        # Card, Badge, Button, Spinner, ErrorMessage
│       │
│       ├── pages/
│       │   ├── HomePage.jsx         # Landing page
│       │   ├── AssessmentPage.jsx   # Wraps OnboardingForm
│       │   ├── ResultsPage.jsx      # Shows AI-matched careers + opportunities
│       │   ├── CareersPage.jsx      # All careers with category filter
│       │   ├── OpportunitiesPage.jsx# Local ITIs/schemes with district filter
│       │   └── MentorPage.jsx       # AI chat interface
│       │
│       ├── hooks/
│       │   └── useProfile.js        # Core state: profile + recommendations + offline logic
│       │
│       ├── utils/
│       │   ├── api.js               # All axios calls to FastAPI
│       │   └── storage.js           # localStorage wrapper with safe fallback
│       │
│       └── data/
│           └── options.json         # All dropdown options (education, interest, etc.)
│
└── backend/                         # FastAPI server
    ├── main.py                      # App factory + CORS + route registration
    ├── database.py                  # SQLAlchemy engine + session + get_db()
    ├── requirements.txt
    │
    ├── models/
    │   ├── db_models.py             # SQLAlchemy ORM: UserProfile, Career, Opportunity
    │   └── schemas.py               # Pydantic request/response schemas
    │
    ├── routes/
    │   ├── profiles.py              # POST /profile, GET /profile/:id
    │   ├── careers.py               # GET /careers
    │   ├── opportunities.py         # GET /opportunities?district=&type=
    │   └── recommend.py             # POST /recommend → scored careers + local opps
    │
    ├── services/
    │   └── recommend_service.py     # Rule-based scoring engine (AI-extensible)
    │
    └── data/
        └── seed.py                  # Seed DB with 6 careers + 6 opportunities
```

---

## 🚀 Quick Start

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Seed the database with sample data
python -m data.seed

# Start FastAPI server
uvicorn main:app --reload --port 8000
```

API docs auto-generated at: **http://localhost:8000/docs**

---

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (proxies /api → FastAPI on :8000)
npm run dev
```

Open: **http://localhost:5173**

---

## 🔄 Request Flow

```
User fills assessment (OnboardingForm)
        │
        ▼
useProfile.submitProfile()
        │
        ├── POST /api/profile         → saves to SQLite users table
        │
        └── POST /api/recommend       → recommend_service.py scores careers
                │                        by (education + interest + goal)
                └── returns {
                      careers: [scored, sorted, top 5],
                      opportunities: [filtered by district]
                    }
                            │
                            ▼
                    stored in localStorage (offline cache)
                            │
                            ▼
                    ResultsPage renders CareerCards + OpportunityCards
```

---

## 🗄️ Database Schema

```sql
-- users
CREATE TABLE users (
  id           INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  age          INTEGER,
  education    TEXT,     -- "8th" | "10th" | "12th" | "graduate"
  interest     TEXT,     -- "tech" | "health" | "trade" | "agri" | "govt"
  district     TEXT,
  language     TEXT DEFAULT 'en',
  travel_range TEXT,
  goal         TEXT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- careers
CREATE TABLE careers (
  id              INTEGER PRIMARY KEY,
  title           TEXT NOT NULL,
  category        TEXT,     -- "trade" | "health" | "agri" | "tech" | "govt"
  education_min   TEXT,     -- minimum education required
  duration        TEXT,
  salary_range    TEXT,
  description     TEXT,
  skills          TEXT,     -- comma-separated
  match_interests TEXT      -- comma-separated interests this matches
);

-- opportunities
CREATE TABLE opportunities (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT,     -- "iti" | "scheme" | "apprenticeship" | "job"
  district    TEXT,
  address     TEXT,
  phone       TEXT,
  description TEXT,
  benefit     TEXT,
  apply_url   TEXT,
  career_tags TEXT      -- comma-separated categories
);
```

---

## 📡 API Reference

| Method | Endpoint | Body / Query | Returns |
|--------|----------|-------------|---------|
| `POST` | `/api/profile` | `{name, education, interest, district, ...}` | Saved profile with `id` |
| `GET` | `/api/profile/:id` | — | Profile object |
| `POST` | `/api/recommend` | `{education, interest, district, goal}` | `{careers[], opportunities[]}` |
| `GET` | `/api/careers` | — | All career objects |
| `GET` | `/api/opportunities` | `?district=Dharwad&type=iti` | Filtered opportunities |

---

## 📶 Offline-First Design

| Layer | Strategy |
|-------|----------|
| **Service Worker** (Vite PWA) | Caches all JS/CSS/HTML + API responses |
| **API cache** | `StaleWhileRevalidate` — shows cached data instantly, updates in background |
| **localStorage** | Profile + recommendations persist between sessions |
| **Graceful degradation** | If backend unreachable: uses localStorage cache; if no cache: shows clear message |
| **Sync on reconnect** | `useProfile` retries backend save next time user submits |

---

## 🔧 Switching to PostgreSQL

Only one line needs to change in `backend/database.py`:

```python
# SQLite (development)
DATABASE_URL = "sqlite:///./rural_pathways.db"

# PostgreSQL (production) — just change this line:
DATABASE_URL = "postgresql://user:password@localhost/ruraldb"
```

Everything else — models, routes, services — stays identical.

---

## 🤖 Adding Google Gemini (Chat)

In `backend/routes/`, add:

```python
# backend/routes/chat.py
from fastapi import APIRouter
import google.generativeai as genai
import os

genai.configure(api_key=os.environ["GEMINI_API_KEY"])
model = genai.GenerativeModel("gemini-1.5-flash")

router = APIRouter()

@router.post("/chat")
async def chat(body: dict):
    user_msg = body["message"]
    profile  = body.get("profile", {})

    system_ctx = f"""
    You are a career mentor for rural youth in North Karnataka, India.
    User profile: {profile}
    Answer in simple language. If user writes in Kannada/Hindi, reply in that language.
    Focus on: ITI courses, PMKVY, NAPS apprenticeships, government jobs.
    Keep responses under 150 words.
    """
    response = model.generate_content(system_ctx + "\n\nUser: " + user_msg)
    return {"reply": response.text}
```

Then in `MentorPage.jsx`, replace the stub with:
```js
const res = await axios.post('/api/chat', { message: userText, profile })
const reply = res.data.reply
```

---

## 🧠 Future AI Extension (Design)

### 1. Multilingual NLP
```python
# Use sentence-transformers with multilingual model
# Supports Kannada, Hindi, Telugu out of the box
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
```

### 2. Embedding-Based Recommendations
```python
# Replace rule-based scoring:
user_vec   = model.encode(f"{education} {interest} {goal} {district}")
career_vecs = [model.encode(c.description) for c in careers]
scores = util.cos_sim(user_vec, career_vecs)
# → much better personalisation without hand-coded rules
```

### 3. Voice Interface
```python
# Backend: POST /transcribe
# Uses OpenAI Whisper (self-hosted small model, ~150MB)
import whisper
whisper_model = whisper.load_model("small")  # supports Hindi, Kannada

@router.post("/transcribe")
async def transcribe(audio: UploadFile):
    result = whisper_model.transcribe(await audio.read(), language="kn")
    return {"text": result["text"]}
```

Frontend: `MediaRecorder API` → sends blob → gets transcript → feeds to chat.

---

## 📊 Impact Metrics to Track

- Assessment completion rate (target > 75%)
- Recommendations to application conversion
- Offline usage % (shows rural reach)
- Employment outcomes at 6 months (via SMS follow-up)

---

## 🏗️ Production Deployment (Simple)

```bash
# Backend on any Linux VPS (₹500/month tier works)
uvicorn main:app --host 0.0.0.0 --port 8000

# Frontend: build static files
npm run build
# Deploy dist/ to Netlify / Vercel (free tier)

# Set environment variable
VITE_API_URL=https://your-backend.com/api
```

No Docker, no Kubernetes needed for MVP. Scale when you need it.
