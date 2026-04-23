// frontend/src/utils/api.js
/**
 * All HTTP calls to the FastAPI backend live here.
 *
 * Auth is handled globally via the axios interceptor in useAuth.js —
 * the Bearer token is attached automatically to every request,
 * and a 401 triggers a silent token refresh before retrying.
 * No manual header management needed in these functions.
 */
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Shared axios instance — interceptors from useAuth.js attach to global axios,
// which is the same instance, so auth works automatically.
const api = axios.create({ baseURL: BASE_URL })

// ── Auth ─────────────────────────────────────────────────────
export const authRegister = (body) =>
  api.post('/auth/register', body).then(r => r.data)

export const authLogin = (body) =>
  api.post('/auth/login', body).then(r => r.data)

export const authRefresh = (refreshToken) =>
  api.post('/auth/refresh', { refresh_token: refreshToken }).then(r => r.data)

export const authMe = () =>
  api.get('/auth/me').then(r => r.data)

export const authLogout = () =>
  api.post('/auth/logout').then(r => r.data)


// ── Profile ──────────────────────────────────────────────────

/**
 * Save profile — auto-detects if user is logged in.
 * When a JWT is present (via interceptor), the backend links
 * the profile to that account. When absent, saves as guest.
 */
export const saveProfile = (profileData) =>
  api.post('/profile', profileData).then(r => r.data)

/**
 * Upsert profile linked to the authenticated user.
 * Requires JWT. Creates or updates — never duplicates.
 */
export const saveAuthenticatedProfile = (profileData) =>
  api.post('/profile/authenticated', profileData).then(r => r.data)

export const fetchMyProfile = () =>
  api.get('/profile/me').then(r => r.data)

export const fetchProfile = (id) =>
  api.get(`/profile/${id}`).then(r => r.data)


// ── Recommendations ──────────────────────────────────────────
export const fetchRecommendations = (profileData) =>
  api.post('/recommend', {
    education:    profileData.education,
    interest:     profileData.interest,
    district:     profileData.district,
    goal:         profileData.goal,
    travel_range: profileData.travelRange,
  }).then(r => r.data)


// ── Careers ──────────────────────────────────────────────────
export const fetchCareers = () =>
  api.get('/careers').then(r => r.data)


// ── Opportunities ─────────────────────────────────────────────
export const fetchOpportunities = (district, type) => {
  const params = new URLSearchParams()
  if (district) params.append('district', district)
  if (type)     params.append('type', type)
  return api.get(`/opportunities?${params}`).then(r => r.data)
}


// ── Chat ─────────────────────────────────────────────────────
export const sendChatMessage = (message, profile, history = []) =>
  api.post('/chat', { message, profile, history }).then(r => r.data)