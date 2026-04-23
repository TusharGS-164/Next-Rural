// frontend/src/components/CooldownScreen.jsx
/**
 * Full-panel cooldown overlay — shown when the session token limit is hit.
 *
 * Behaviour (mirrors Claude AI's rate-limit UX):
 *   1. Covers the message input area completely — user cannot type or click send.
 *   2. Shows a live countdown timer that ticks every second.
 *   3. When the timer reaches 0:00, calls onUnlock() automatically.
 *      The parent resets the session and resumes the chat.
 *   4. The countdown survives page refresh because the unlock timestamp
 *      is read from localStorage (set by startCooldown() in tokenCounter.js).
 *
 * Props:
 *   remainingMs  {number}   — initial ms remaining, passed from parent
 *   onUnlock     {function} — called when countdown reaches 0
 *   t            {function} — i18n translation function
 */

import { useState, useEffect, useCallback } from 'react'
import { formatCountdown } from '../utils/tokenCounter'

// Animated arc — SVG circle that depletes as time passes
function CountdownRing({ percent }) {
  const radius      = 52
  const circumference = 2 * Math.PI * radius
  // strokeDashoffset drives the arc from full → empty as percent goes 100 → 0
  const offset      = circumference * (1 - percent / 100)

  return (
    <svg width="128" height="128" className="rotate-[-90deg]" aria-hidden="true">
      {/* Background track */}
      <circle
        cx="64" cy="64" r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="8"
      />
      {/* Depleting arc */}
      <circle
        cx="64" cy="64" r={radius}
        fill="none"
        stroke="#2d5a27"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-1000 ease-linear"
      />
    </svg>
  )
}

export default function CooldownScreen({ remainingMs: initialMs, onUnlock, t }) {
  const [remainingMs,  setRemainingMs]  = useState(initialMs)
  const [unlocking,    setUnlocking]    = useState(false)

  // Total cooldown duration — computed once so the ring depletes correctly
  // We read COOLDOWN_MINUTES from config rather than importing to keep the
  // component self-contained. The ring goes from 100% → 0% over the full window.
  const TOTAL_MS = remainingMs <= 0 ? 1 : initialMs  // guard against zero division

  const handleUnlock = useCallback(() => {
    setUnlocking(true)
    // Small delay so user sees the "resuming" message before the UI changes
    setTimeout(() => onUnlock(), 1500)
  }, [onUnlock])

  // Live countdown — ticks every second
  useEffect(() => {
    if (remainingMs <= 0) { handleUnlock(); return }

    const interval = setInterval(() => {
      setRemainingMs(prev => {
        const next = prev - 1000
        if (next <= 0) {
          clearInterval(interval)
          handleUnlock()
          return 0
        }
        return next
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])   // intentional empty deps — we only want one interval

  const displayMs  = Math.max(0, remainingMs)
  const percent    = Math.min(100, Math.round((displayMs / TOTAL_MS) * 100))
  const timeString = formatCountdown(displayMs)

  return (
    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-30 flex flex-col items-center justify-center px-6 text-center">

      {/* Icon + ring */}
      <div className="relative mb-6">
        <CountdownRing percent={percent} />
        {/* Clock icon centred inside the ring */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl" role="img" aria-label="timer">⏳</span>
        </div>
      </div>

      {/* Countdown display */}
      <div className="mb-2">
        <span className={`font-mono text-5xl font-bold tabular-nums tracking-tight
          ${displayMs < 30_000 ? 'text-amber-500' : 'text-green-800'}`}>
          {unlocking ? '✓' : timeString}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-gray-900 mb-2">
        {unlocking ? t('mentor.cooldownResume') : t('mentor.cooldownTitle')}
      </h3>

      {/* Description */}
      {!unlocking && (
        <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
          {t('mentor.cooldownDesc')}
        </p>
      )}

      {/* Progress dots — subtle visual rhythm */}
      {!unlocking && (
        <div className="flex gap-2 mt-6">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full animate-bounce
                ${displayMs < 30_000 ? 'bg-amber-400' : 'bg-green-300'}`}
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      )}

      {/* Spinning checkmark when unlocking */}
      {unlocking && (
        <div className="mt-4 text-green-600 text-sm font-medium animate-pulse">
          {t('mentor.cooldownResume')}
        </div>
      )}
    </div>
  )
}
