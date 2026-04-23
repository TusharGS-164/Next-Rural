#!/usr/bin/env python3
"""
backend/test_api.py
Smoke-tests for all API endpoints including JWT auth.

Run with the server already running:
  python test_api.py

No pytest needed — plain requests + print output.
"""

import sys
import requests

BASE  = "http://localhost:8000"
PASS  = "✅"
FAIL  = "❌"
results = []

# Unique test email so re-runs don't conflict
import time
TEST_EMAIL    = f"testuser_{int(time.time())}@example.com"
TEST_PASSWORD = "SecurePass123!"

def check(label, condition, detail=""):
    status = PASS if condition else FAIL
    print(f"  {status}  {label}" + (f"  →  {detail}" if detail else ""))
    results.append(condition)
    return condition

def sep(title):
    print(f"\n{'─'*52}\n  {title}\n{'─'*52}")


# ── Health ────────────────────────────────────────────────────
sep("Health")
try:
    r = requests.get(f"{BASE}/health", timeout=5)
    check("GET /health → 200",        r.status_code == 200)
    check("status is 'ok'",           r.json().get("status") == "ok")
except Exception as e:
    print(f"  {FAIL}  Server unreachable: {e}")
    print("\n  Start the server first:  uvicorn main:app --reload --port 8000")
    sys.exit(1)


# ── Register ──────────────────────────────────────────────────
sep("POST /api/auth/register")
r = requests.post(f"{BASE}/api/auth/register", json={
    "email": TEST_EMAIL, "password": TEST_PASSWORD,
})
check("Status 201",                   r.status_code == 201, str(r.status_code))
data = r.json()
check("Has access_token",             "access_token" in data)
check("Has refresh_token",            "refresh_token" in data)
check("token_type is bearer",         data.get("token_type") == "bearer")

ACCESS_TOKEN  = data.get("access_token", "")
REFRESH_TOKEN = data.get("refresh_token", "")

# Duplicate registration must fail
r2 = requests.post(f"{BASE}/api/auth/register", json={
    "email": TEST_EMAIL, "password": TEST_PASSWORD,
})
check("Duplicate email → 400",        r2.status_code == 400, str(r2.status_code))


# ── Login ─────────────────────────────────────────────────────
sep("POST /api/auth/login")
r = requests.post(f"{BASE}/api/auth/login", json={
    "email": TEST_EMAIL, "password": TEST_PASSWORD,
})
check("Status 200",                   r.status_code == 200)
check("Returns access_token",         "access_token" in r.json())
ACCESS_TOKEN = r.json().get("access_token", ACCESS_TOKEN)  # use fresh token

r_bad = requests.post(f"{BASE}/api/auth/login", json={
    "email": TEST_EMAIL, "password": "wrongpassword",
})
check("Wrong password → 401",         r_bad.status_code == 401)

r_notexist = requests.post(f"{BASE}/api/auth/login", json={
    "email": "nobody@nowhere.com", "password": "anything",
})
check("Unknown email → 401",          r_notexist.status_code == 401)


# ── Auth /me ──────────────────────────────────────────────────
sep("GET /api/auth/me")
AUTH_HEADERS = {"Authorization": f"Bearer {ACCESS_TOKEN}"}

r = requests.get(f"{BASE}/api/auth/me", headers=AUTH_HEADERS)
check("Status 200 with token",        r.status_code == 200)
check("Email matches",                r.json().get("email") == TEST_EMAIL)
check("is_active is True",            r.json().get("is_active") is True)

r_no_token = requests.get(f"{BASE}/api/auth/me")
check("No token → 403/401",           r_no_token.status_code in (401, 403))

r_bad_token = requests.get(f"{BASE}/api/auth/me",
                            headers={"Authorization": "Bearer this.is.invalid"})
check("Bad token → 401",              r_bad_token.status_code == 401)


# ── Refresh ───────────────────────────────────────────────────
sep("POST /api/auth/refresh")
r = requests.post(f"{BASE}/api/auth/refresh", json={"refresh_token": REFRESH_TOKEN})
check("Status 200",                   r.status_code == 200)
check("Returns new access_token",     "access_token" in r.json())
NEW_ACCESS = r.json().get("access_token", "")
check("New token is different",       NEW_ACCESS != ACCESS_TOKEN)
ACCESS_TOKEN  = NEW_ACCESS
AUTH_HEADERS  = {"Authorization": f"Bearer {ACCESS_TOKEN}"}

r_bad_rt = requests.post(f"{BASE}/api/auth/refresh", json={"refresh_token": "invalid"})
check("Bad refresh token → 401",      r_bad_rt.status_code == 401)


# ── Authenticated Profile ─────────────────────────────────────
sep("POST /api/profile/authenticated")
r = requests.post(f"{BASE}/api/profile/authenticated", json={
    "name": "Auth Test User", "age": 20,
    "education": "10th", "interest": "trade",
    "district": "Dharwad", "language": "en",
    "travel_range": "20km", "goal": "certificate",
}, headers=AUTH_HEADERS)
check("Status 201",                   r.status_code == 201, str(r.status_code))
profile_data = r.json()
check("user_id is set",               profile_data.get("user_id") is not None,
                                       str(profile_data.get("user_id")))

# Calling again = upsert, not duplicate
r2 = requests.post(f"{BASE}/api/profile/authenticated", json={
    "name": "Updated Name", "age": 21,
    "education": "12th", "interest": "tech",
    "district": "Dharwad", "language": "en",
    "travel_range": "50km", "goal": "govt_job",
}, headers=AUTH_HEADERS)
check("Upsert → 201 (no duplicate)",  r2.status_code == 201)
check("Name updated",                 r2.json().get("name") == "Updated Name")


sep("GET /api/profile/me")
r = requests.get(f"{BASE}/api/profile/me", headers=AUTH_HEADERS)
check("Status 200",                   r.status_code == 200)
check("Profile linked to user",       r.json().get("user_id") is not None)

r_anon = requests.get(f"{BASE}/api/profile/me")
check("No token → 403/401",           r_anon.status_code in (401, 403))


# ── Guest Profile (no token) ──────────────────────────────────
sep("POST /api/profile (guest mode)")
r = requests.post(f"{BASE}/api/profile", json={
    "name": "Guest User", "education": "8th",
    "interest": "agri", "district": "Gadag",
})
check("Status 201",                   r.status_code == 201)
check("user_id is None (guest)",      r.json().get("user_id") is None)


# ── Careers ───────────────────────────────────────────────────
sep("GET /api/careers")
r = requests.get(f"{BASE}/api/careers")
check("Status 200",                   r.status_code == 200)
careers = r.json()
check("Returns list",                 isinstance(careers, list), f"{len(careers)} careers")
check("Careers have required fields", all("title" in c and "category" in c for c in careers))


# ── Opportunities ─────────────────────────────────────────────
sep("GET /api/opportunities")
r = requests.get(f"{BASE}/api/opportunities")
check("Status 200",                   r.status_code == 200)

r_d = requests.get(f"{BASE}/api/opportunities?district=Dharwad")
check("District filter → 200",        r_d.status_code == 200)

r_t = requests.get(f"{BASE}/api/opportunities?type=iti")
check("Type filter → 200",            r_t.status_code == 200)
check("All results are type=iti",     all(o["type"] == "iti" for o in r_t.json()))


# ── Recommend ─────────────────────────────────────────────────
sep("POST /api/recommend")
r = requests.post(f"{BASE}/api/recommend", json={
    "education": "10th", "interest": "trade",
    "district": "Dharwad", "goal": "certificate",
})
check("Status 200",                   r.status_code == 200)
rec = r.json()
check("Has 'careers'",                "careers" in rec)
check("Has 'opportunities'",          "opportunities" in rec)
check("Returns careers",              len(rec.get("careers", [])) > 0)
top = rec["careers"][0]
check("Top career has match_score",   "match_score" in top)
check("match_score 0–100",            0 <= top["match_score"] <= 100, str(top["match_score"]))
check("trade+10th top score ≥ 70",    top["match_score"] >= 70, str(top["match_score"]))
check("Top career is trade",          top["category"] == "trade",
                                       f"got '{top['category']}'")


# ── Logout ────────────────────────────────────────────────────
sep("POST /api/auth/logout")
r = requests.post(f"{BASE}/api/auth/logout", headers=AUTH_HEADERS)
check("Status 200",                   r.status_code == 200)


# ── Summary ───────────────────────────────────────────────────
passed = sum(results)
total  = len(results)
emoji  = "🎉" if passed == total else "⚠️ "
print(f"\n{'═'*52}")
print(f"  {emoji}  {passed}/{total} tests passed")
print('═'*52)

if passed < total:
    print("\n  If tests fail, check:")
    print("  1. DB seeded?        python -m data.seed")
    print("  2. .env configured?  JWT_SECRET set?")
    print("  3. Server running?   uvicorn main:app --reload --port 8000")
    sys.exit(1)
else:
    print("\n  All tests passed! Auth + API fully working.\n")