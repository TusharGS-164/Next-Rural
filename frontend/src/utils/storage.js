// frontend/src/utils/storage.js
/**
 * Thin wrapper around localStorage.
 * Falls back gracefully if localStorage is unavailable (e.g. private browsing).
 * Used to persist user profile and cached recommendations offline.
 */

const KEYS = {
  PROFILE:         'ryp_profile',
  RECOMMENDATIONS: 'ryp_recommendations',
  PROFILE_ID:      'ryp_profile_id',
}

function safe(fn, fallback = null) {
  try { return fn() } catch { return fallback }
}

export const storage = {
  saveProfile: (profile) =>
    safe(() => localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile))),

  loadProfile: () =>
    safe(() => JSON.parse(localStorage.getItem(KEYS.PROFILE))),

  saveProfileId: (id) =>
    safe(() => localStorage.setItem(KEYS.PROFILE_ID, String(id))),

  loadProfileId: () =>
    safe(() => localStorage.getItem(KEYS.PROFILE_ID)),

  saveRecommendations: (data) =>
    safe(() => localStorage.setItem(KEYS.RECOMMENDATIONS, JSON.stringify(data))),

  loadRecommendations: () =>
    safe(() => JSON.parse(localStorage.getItem(KEYS.RECOMMENDATIONS))),

  clearAll: () =>
    safe(() => Object.values(KEYS).forEach(k => localStorage.removeItem(k))),
}
