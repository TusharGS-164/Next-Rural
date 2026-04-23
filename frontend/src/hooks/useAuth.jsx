// frontend/src/hooks/useAuth.js
/**
 * Central auth state manager.
 *
 * Token storage:
 *   access_token  → sessionStorage  (cleared when tab closes, reduces XSS window)
 *   refresh_token → localStorage    (persists across sessions)
 *
 * On app boot, if a refresh token exists but no access token,
 * we silently exchange it for a fresh access token — transparent re-auth.
 *
 * Axios interceptors (defined once here, apply globally):
 *   REQUEST  → attach Bearer token to every outgoing request
 *   RESPONSE → on 401, try refresh once, then redirect to /login
 */
import {
  useState, useCallback, useEffect,
  createContext, useContext,
} from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

// ── Token helpers ─────────────────────────────────────────────
const KEYS = {
  access:  'ryp_access_token',
  refresh: 'ryp_refresh_token',
  user:    'ryp_user',
}

export const tokenStore = {
  setTokens({ access_token, refresh_token }) {
    sessionStorage.setItem(KEYS.access,  access_token)
    localStorage.setItem(KEYS.refresh, refresh_token)
  },
  getAccess()  { return sessionStorage.getItem(KEYS.access)  },
  getRefresh() { return localStorage.getItem(KEYS.refresh)   },
  clear() {
    sessionStorage.removeItem(KEYS.access)
    localStorage.removeItem(KEYS.refresh)
    localStorage.removeItem(KEYS.user)
  },
  saveUser(u)  { localStorage.setItem(KEYS.user, JSON.stringify(u)) },
  loadUser()   {
    try { return JSON.parse(localStorage.getItem(KEYS.user)) }
    catch { return null }
  },
}

// ── Axios interceptors (registered once at module load) ───────
let _refreshing = false
let _refreshPromise = null

// REQUEST — attach Bearer token
axios.interceptors.request.use((config) => {
  const token = tokenStore.getAccess()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// RESPONSE — silent refresh on 401
axios.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    const is401    = err.response?.status === 401
    const notRetry = !original._retried
    const notAuth  = !original.url?.includes('/auth/refresh')

    if (is401 && notRetry && notAuth) {
      original._retried = true

      if (!_refreshing) {
        _refreshing = true
        _refreshPromise = (async () => {
          try {
            const rt = tokenStore.getRefresh()
            if (!rt) throw new Error('No refresh token')
            const { data } = await axios.post(
              `${API_BASE}/auth/refresh`,
              { refresh_token: rt },
            )
            tokenStore.setTokens(data)
            return data.access_token
          } catch {
            tokenStore.clear()
            window.location.href = '/login'
            throw new Error('Session expired')
          } finally {
            _refreshing    = false
            _refreshPromise = null
          }
        })()
      }

      // All concurrent 401s wait for the same refresh
      await _refreshPromise
      original.headers.Authorization = `Bearer ${tokenStore.getAccess()}`
      return axios(original)
    }

    return Promise.reject(err)
  }
)

// ── Context ───────────────────────────────────────────────────
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(() => tokenStore.loadUser())
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  // Silent re-auth on boot: refresh token exists but no access token
  useEffect(() => {
    const rt = tokenStore.getRefresh()
    const at = tokenStore.getAccess()
    if (rt && !at) {
      axios
        .post(`${API_BASE}/auth/refresh`, { refresh_token: rt })
        .then(({ data }) => {
          tokenStore.setTokens(data)
          return axios.get(`${API_BASE}/auth/me`)
        })
        .then(({ data: me }) => {
          setUser(me)
          tokenStore.saveUser(me)
        })
        .catch(() => tokenStore.clear())
    }
  }, [])

  // ── register ────────────────────────────────────────────────
  const register = useCallback(async ({ email, password, phone }) => {
    setLoading(true)
    setError(null)
    try {
      const { data: tokens } = await axios.post(
        `${API_BASE}/auth/register`,
        { email, password, phone },
      )
      tokenStore.setTokens(tokens)
      const { data: me } = await axios.get(`${API_BASE}/auth/me`)
      setUser(me)
      tokenStore.saveUser(me)
      return me
    } catch (err) {
      const msg = err.response?.data?.detail || 'Registration failed. Please try again.'
      setError(msg)
      throw new Error(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── login ───────────────────────────────────────────────────
  const login = useCallback(async ({ email, password }) => {
    setLoading(true)
    setError(null)
    try {
      const { data: tokens } = await axios.post(
        `${API_BASE}/auth/login`,
        { email, password },
      )
      tokenStore.setTokens(tokens)
      const { data: me } = await axios.get(`${API_BASE}/auth/me`)
      setUser(me)
      tokenStore.saveUser(me)
      return me
    } catch (err) {
      const msg = err.response?.data?.detail || 'Incorrect email or password.'
      setError(msg)
      throw new Error(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── logout ──────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await axios.post(`${API_BASE}/auth/logout`)
    } catch { /* ignore — token already invalid */ }
    tokenStore.clear()
    setUser(null)
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return (
    <AuthContext.Provider
      value={{ user, loading, error, register, login, logout, clearError }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}