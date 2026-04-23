// frontend/src/utils/tokenCounter.js
/**
 * Client-side token estimation + cooldown enforcement for the AI Mentor.
 *
 * Token estimation:
 *   1 token ≈ 4 chars  (English / Latin scripts)
 *   1 token ≈ 2.5 chars (Indic scripts — Kannada, Hindi, Telugu)
 *   Accurate to within ~10% without a real tokenizer.
 *
 * Cooldown system (mirrors Claude AI's rate-limit UX):
 *   - When the session token HARD_LIMIT is hit, a cooldown is imposed.
 *   - The unlock timestamp is saved to localStorage so it survives
 *     page refresh and tab close — the user cannot bypass it.
 *   - On unlock: token count resets, session clears, chat resumes.
 *   - COOLDOWN_MINUTES is configurable below.
 */

// ── Config ────────────────────────────────────────────────────
export const TOKEN_CONFIG = {
  HARD_LIMIT:            500,  // blocks sending + starts cooldown
  WARN_LIMIT:            501,  // shows yellow warning banner
  MAX_HISTORY_TOKENS:    1500,  // max history tokens sent per API call
  SYSTEM_PROMPT_TOKENS:   400,  // backend system prompt estimate
  COOLDOWN_MINUTES:          60,  // lockout duration after HARD_LIMIT hit
}

// localStorage key for the cooldown unlock timestamp
const COOLDOWN_KEY = 'ryp_mentor_cooldown_until'

// ── Script detection ──────────────────────────────────────────
const INDIC_RANGES = [
  [0x0900, 0x097F],  // Devanagari (Hindi, Marathi)
  [0x0C80, 0x0CFF],  // Kannada
  [0x0C00, 0x0C7F],  // Telugu
  [0x0B80, 0x0BFF],  // Tamil
  [0x0D00, 0x0D7F],  // Malayalam
]
function isIndicChar(code) {
  return INDIC_RANGES.some(([s, e]) => code >= s && code <= e)
}
function detectIndicRatio(text) {
  if (!text || text.length === 0) return 0
  const sample = text.slice(0, 200)
  const count  = [...sample].filter(c => isIndicChar(c.codePointAt(0))).length
  return count / sample.length
}

// ── Token estimators ──────────────────────────────────────────
export function estimateTokens(text) {
  if (!text) return 0
  const indicRatio    = detectIndicRatio(text)
  const charsPerToken = indicRatio > 0.3 ? 2.5 : 4
  return Math.ceil(text.length / charsPerToken)
}

export function estimateConversationTokens(messages) {
  return messages.reduce((sum, msg) =>
    sum + estimateTokens(msg.text || '') + 4, 0)
}

// ── Usage status ──────────────────────────────────────────────
export function getTokenStatus(used) {
  const { HARD_LIMIT, WARN_LIMIT } = TOKEN_CONFIG
  const remaining = Math.max(0, HARD_LIMIT - used)
  const percent   = Math.min(100, Math.round((used / HARD_LIMIT) * 100))
  const status    = used >= HARD_LIMIT ? 'exceeded'
                  : used >= WARN_LIMIT ? 'warning'
                  : 'ok'
  return { used, limit: HARD_LIMIT, remaining, percent, status }
}

// ── History trimmer ───────────────────────────────────────────
export function trimHistoryForAPI(messages) {
  const { MAX_HISTORY_TOKENS } = TOKEN_CONFIG
  const history = messages.slice(1)  // skip greeting
  let tokenCount = 0
  const kept = []
  for (let i = history.length - 1; i >= 0; i--) {
    const t = estimateTokens(history[i].text || '') + 4
    if (tokenCount + t > MAX_HISTORY_TOKENS) break
    kept.unshift(history[i])
    tokenCount += t
  }
  return kept
}

// ── Debug breakdown ───────────────────────────────────────────
export function getTokenBreakdown(messages) {
  const { SYSTEM_PROMPT_TOKENS } = TOKEN_CONFIG
  const conversation = estimateConversationTokens(messages)
  return {
    systemPrompt: SYSTEM_PROMPT_TOKENS,
    conversation,
    total:        conversation + SYSTEM_PROMPT_TOKENS,
    messages: messages.map((msg, i) => ({
      index:  i,
      role:   msg.role,
      chars:  (msg.text || '').length,
      tokens: estimateTokens(msg.text || ''),
    })),
  }
}

// ── Cooldown management ───────────────────────────────────────

/**
 * Start a cooldown. Saves the unlock timestamp to localStorage.
 * Call this the moment HARD_LIMIT is exceeded.
 */
export function startCooldown() {
  const unlockAt = Date.now() + TOKEN_CONFIG.COOLDOWN_MINUTES * 60 * 1000
  localStorage.setItem(COOLDOWN_KEY, String(unlockAt))
  return unlockAt
}

/**
 * Check if the user is currently in cooldown.
 * Returns { active: bool, unlockAt: number|null, remainingMs: number }
 */
export function getCooldownState() {
  const raw = localStorage.getItem(COOLDOWN_KEY)
  if (!raw) return { active: false, unlockAt: null, remainingMs: 0 }

  const unlockAt    = parseInt(raw, 10)
  const remainingMs = unlockAt - Date.now()

  if (remainingMs <= 0) {
    // Cooldown has expired — clean up
    localStorage.removeItem(COOLDOWN_KEY)
    return { active: false, unlockAt: null, remainingMs: 0 }
  }

  return { active: true, unlockAt, remainingMs }
}

/**
 * Clear cooldown early (e.g. if an admin resets it).
 * Not exposed in UI — just a utility for development.
 */
export function clearCooldown() {
  localStorage.removeItem(COOLDOWN_KEY)
}

/**
 * Format milliseconds into a human-readable countdown string.
 * e.g. 125000ms → "2:05"  |  3600000ms → "1:00:00"
 */
export function formatCountdown(ms) {
  if (ms <= 0) return '0:00'
  const totalSecs = Math.ceil(ms / 1000)
  const hours     = Math.floor(totalSecs / 3600)
  const mins      = Math.floor((totalSecs % 3600) / 60)
  const secs      = totalSecs % 60

  const mm = String(mins).padStart(2, '0')
  const ss = String(secs).padStart(2, '0')

  return hours > 0
    ? `${hours}:${mm}:${ss}`
    : `${mins}:${ss}`
}
