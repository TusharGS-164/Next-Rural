// frontend/src/hooks/useProfile.js
/**
 * Manages the user's career profile and recommendations.
 *
 * Auth-awareness:
 *   - If the user is logged in (JWT present), profile is saved to
 *     POST /api/profile/authenticated → linked to their account server-side.
 *   - If guest, saved to POST /api/profile → anonymous.
 *   - Recommendations are always cached in localStorage for offline use.
 */
import { useState, useCallback } from 'react'
import { saveProfile, saveAuthenticatedProfile, fetchRecommendations } from '../utils/api'
import { storage } from '../utils/storage'
import { tokenStore } from './useAuth'

const INITIAL_PROFILE = {
  name: '', age: '', education: '', interest: '',
  district: '', language: 'en', travelRange: '20km', goal: '',
}

export function useProfile() {
  const [profile,         setProfile]         = useState(storage.loadProfile() || INITIAL_PROFILE)
  const [recommendations, setRecommendations] = useState(storage.loadRecommendations())
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState(null)
  const [step,            setStep]            = useState(
    profile.education ? 'results' : 'onboarding'
  )

  const updateProfile = useCallback((fields) => {
    setProfile(prev => {
      const updated = { ...prev, ...fields }
      storage.saveProfile(updated)
      return updated
    })
  }, [])

  const submitProfile = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // ── 1. Save profile to backend ───────────────────────────
      // Use the auth-linked endpoint if a token exists, otherwise guest endpoint.
      const isLoggedIn = !!tokenStore.getAccess()
      const saveFn     = isLoggedIn ? saveAuthenticatedProfile : saveProfile

      try {
        const saved = await saveFn(profile)
        storage.saveProfileId(saved.id)
      } catch (saveErr) {
        // Network error → still allow offline flow (recommendations come from cache)
        if (!navigator.onLine) {
          console.warn('Offline — skipping profile save, using cached data')
        } else {
          // Online but save failed (e.g. validation error) → re-throw to user
          throw saveErr
        }
      }

      // ── 2. Fetch recommendations ─────────────────────────────
      try {
        const data = await fetchRecommendations(profile)
        setRecommendations(data)
        storage.saveRecommendations(data)
      } catch {
        // Fall back to cached recommendations when offline
        const cached = storage.loadRecommendations()
        if (cached) {
          setRecommendations(cached)
        } else {
          throw new Error(
            'No internet connection and no cached results. ' +
            'Please connect once to load your personalised recommendations.'
          )
        }
      }

      setStep('results')
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        'Something went wrong. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [profile])

  const resetProfile = useCallback(() => {
    storage.clearAll()
    setProfile(INITIAL_PROFILE)
    setRecommendations(null)
    setStep('onboarding')
    setError(null)
  }, [])

  return {
    profile, updateProfile, submitProfile, resetProfile,
    recommendations, loading, error, step, setStep,
  }
}