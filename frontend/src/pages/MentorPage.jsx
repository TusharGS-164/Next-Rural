// frontend/src/pages/MentorPage.jsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { sendChatMessage }  from '../utils/api'
import { useLanguage }      from '../i18n/index.jsx'
import VoiceRecorder        from '../components/VoiceRecorder'
import CooldownScreen       from '../components/CooldownScreen'
import {
  estimateTokens,
  estimateConversationTokens,
  getTokenStatus,
  trimHistoryForAPI,
  getTokenBreakdown,
  getCooldownState,
  startCooldown,
  clearCooldown,
  TOKEN_CONFIG,
} from '../utils/tokenCounter.js'

// ── Static data ───────────────────────────────────────────────
const TOPIC_KEYS = ['career', 'iti', 'schemes', 'apprentice', 'exams', 'financial', 'resume']
const TOPIC_PROMPTS = {
  career:     'What career is best for me?',
  iti:        'How do I join an ITI? What documents do I need?',
  schemes:    'What government schemes am I eligible for?',
  apprentice: 'Tell me about NAPS apprenticeship near me.',
  exams:      'What government exams can I appear for with 10th pass?',
  financial:  'How can I get financial help for ITI training?',
  resume:     'Help me write a simple resume for an ITI job.',
}
const OFFLINE_REPLIES = {
  career:  'For 10th pass in Karnataka: ITI Electrician (Dharwad ITI, ₹15K–30K/mo) or PMKVY COPA (3 months, free).',
  iti:     'ITI admission needs: Aadhaar, 10th marksheet, caste certificate, 2 photos. Dharwad ITI: 0836-2447123.',
  default: 'I\'m offline. Connect to internet for AI-powered guidance.',
}
function offlineReply(text) {
  const l = text.toLowerCase()
  if (l.includes('career') || l.includes('job')) return OFFLINE_REPLIES.career
  if (l.includes('iti'))                          return OFFLINE_REPLIES.iti
  return OFFLINE_REPLIES.default
}

// ── Token usage bar ───────────────────────────────────────────
function TokenUsageBar({ used, t }) {
  const s = getTokenStatus(used)
  const bar =
    s.status === 'exceeded' ? 'bg-red-500' :
    s.status === 'warning'  ? 'bg-amber-400' :
    s.percent > 50          ? 'bg-yellow-400' : 'bg-green-500'
  const text =
    s.status === 'exceeded' ? 'text-red-600' :
    s.status === 'warning'  ? 'text-amber-600' : 'text-gray-500'

  return (
    <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 shrink-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          {t('mentor.label')}
        </span>
        <span className={`text-[10px] font-medium ${text}`}>
          {used.toLocaleString()} / {TOKEN_CONFIG.HARD_LIMIT.toLocaleString()} {t('mentor.used')}
          {' · '}
          <span className="font-semibold">{s.remaining.toLocaleString()} {t('mentor.remaining')}</span>
        </span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${bar}`} style={{ width: `${s.percent}%` }} />
      </div>
    </div>
  )
}

// ── Reset confirmation modal ──────────────────────────────────
function ResetModal({ onConfirm, onCancel, t }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
        <div className="text-center mb-5">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">🔄</div>
          <p className="text-gray-800 text-sm leading-relaxed font-medium">{t('mentor.confirmReset')}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium">
            {t('mentor.cancel')}
          </button>
          <button onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-green-800 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors">
            {t('mentor.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Dev debug panel ───────────────────────────────────────────
function TokenDebugPanel({ messages, t }) {
  const b = getTokenBreakdown(messages)
  return (
    <div className="mx-4 mb-3 bg-gray-900 text-green-400 rounded-xl p-3 text-xs font-mono shrink-0">
      <p className="font-bold text-green-300 mb-2">📊 {t('mentor.debugTitle')}</p>
      <p>🔧 {t('mentor.system')}: ~{b.systemPrompt}t</p>
      <p>💬 {t('mentor.conversation')}: ~{b.conversation}t</p>
      <p className="font-bold border-t border-gray-700 mt-1 pt-1">Σ {t('mentor.total')}: ~{b.total} / {TOKEN_CONFIG.HARD_LIMIT}</p>
      <div className="mt-2 space-y-0.5 max-h-20 overflow-y-auto">
        {b.messages.map(m => (
          <p key={m.index} className="text-gray-500">[{m.role[0].toUpperCase()}] ~{m.tokens}t · {m.chars}ch</p>
        ))}
      </div>
    </div>
  )
}

// ── Main MentorPage ───────────────────────────────────────────
export default function MentorPage({ profile }) {
  const { t, lang, setLang, languages } = useLanguage()

  const makeGreeting = useCallback(() => ({
    role: 'bot',
    text: t('mentor.greeting').replace(/\\n/g, '\n'),
    tokens: 0,
  }), [t])

  // ── Cooldown init: check localStorage on mount ────────────
  const initialCooldown = getCooldownState()

  const [messages,   setMessages]   = useState([makeGreeting()])
  const [input,      setInput]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [isOnline,   setIsOnline]   = useState(navigator.onLine)
  const [tokenUsed,  setTokenUsed]  = useState(TOKEN_CONFIG.SYSTEM_PROMPT_TOKENS)
  const [showReset,  setShowReset]  = useState(false)
  const [showDebug,  setShowDebug]  = useState(false)

  // Cooldown state — { active: bool, remainingMs: number }
  const [cooldown,   setCooldown]   = useState({
    active:      initialCooldown.active,
    remainingMs: initialCooldown.remainingMs,
  })

  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // Online/offline
  useEffect(() => {
    const on  = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Debug shortcut Ctrl+Shift+T
  useEffect(() => {
    const h = (e) => { if (e.ctrlKey && e.shiftKey && e.key === 'T') { e.preventDefault(); setShowDebug(v => !v) } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  // Recompute token total on every message change
  useEffect(() => {
    setTokenUsed(TOKEN_CONFIG.SYSTEM_PROMPT_TOKENS + estimateConversationTokens(messages))
  }, [messages])

  const tokenStatus = getTokenStatus(tokenUsed)

  // ── Session reset (called by modal OR by cooldown expiry) ─
  const resetSession = useCallback(() => {
    clearCooldown()
    setMessages([makeGreeting()])
    setTokenUsed(TOKEN_CONFIG.SYSTEM_PROMPT_TOKENS)
    setCooldown({ active: false, remainingMs: 0 })
    setShowReset(false)
    setInput('')
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [makeGreeting])

  // ── Called by CooldownScreen when timer hits 0 ────────────
  const handleCooldownUnlock = useCallback(() => {
    resetSession()
  }, [resetSession])

  // ── Send ──────────────────────────────────────────────────
  const send = useCallback(async (text, detectedLang = null) => {
    const tx = (text || input).trim()
    if (!tx || loading || cooldown.active) return

    // Check if this message would push us over the limit
    const incoming = estimateTokens(tx) + 4
    if (tokenUsed + incoming >= TOKEN_CONFIG.HARD_LIMIT) {
      // Post the limit-hit message, then start cooldown
      setMessages(prev => [...prev, {
        role: 'bot',
        text: t('mentor.exceeded'),
        tokens: 0,
        isLimit: true,
      }])

      const { remainingMs } = { remainingMs: TOKEN_CONFIG.COOLDOWN_MINUTES * 60 * 1000 }
      startCooldown()
      setCooldown({ active: true, remainingMs })
      return
    }

    setInput('')
    inputRef.current?.focus()

    const userMsg = { role: 'user', text: tx, lang: detectedLang, tokens: incoming }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      let reply, replyTokens
      if (isOnline) {
        const history = trimHistoryForAPI([...messages, userMsg])
        const data    = await sendChatMessage(tx, profile || {}, history)
        reply         = data.reply
        replyTokens   = estimateTokens(reply) + 4
      } else {
        await new Promise(r => setTimeout(r, 400))
        reply         = offlineReply(tx)
        replyTokens   = estimateTokens(reply) + 4
      }

      // Check if the bot's reply pushes us over (Gemini can be verbose)
      const projectedTotal = tokenUsed + incoming + replyTokens
      setMessages(prev => [...prev, { role: 'bot', text: reply, tokens: replyTokens }])

      if (projectedTotal >= TOKEN_CONFIG.HARD_LIMIT) {
        startCooldown()
        setCooldown({ active: true, remainingMs: TOKEN_CONFIG.COOLDOWN_MINUTES * 60 * 1000 })
      }
    } catch (err) {
      const errText = err?.response?.data?.detail?.includes('GEMINI_API_KEY')
        ? '⚙️ Gemini API key not configured. Add GEMINI_API_KEY to backend/.env'
        : '⚠️ Could not reach AI mentor. Check your connection.'
      setMessages(prev => [...prev, { role: 'bot', text: errText, tokens: 0 }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, cooldown.active, tokenUsed, isOnline, messages, profile, t])

  const handleTranscript = useCallback((text, dl) => {
    setInput(text)
    if (dl) setLang(dl)
    setTimeout(() => send(text, dl), 300)
  }, [send, setLang])

  const isExceeded = tokenStatus.status === 'exceeded'
  const isWarning  = tokenStatus.status === 'warning'
  const LANG_LABEL = languages.find(l => l.value === lang)?.nativeLabel || 'English'
  const isLocked   = cooldown.active || isExceeded

  return (
    <div className="flex h-[calc(100vh-68px)]">

      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-60 border-r border-gray-200 bg-gray-50 p-4 shrink-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{t('mentor.quickTopics')}</p>
        <div className="flex flex-col gap-1 mb-5">
          {TOPIC_KEYS.map(k => (
            <button key={k} disabled={isLocked}
              onClick={() => send(TOPIC_PROMPTS[k])}
              className="text-left px-3 py-2 rounded-xl text-sm text-gray-600 border border-transparent hover:bg-white hover:border-gray-200 hover:text-green-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
              {t(`mentor.topics.${k}`)}
            </button>
          ))}
        </div>

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">{t('mentor.language')}</p>
        <div className="flex flex-col gap-1 mb-5">
          {languages.map(l => (
            <button key={l.value} onClick={() => setLang(l.value)}
              className={`text-left px-3 py-2 rounded-lg text-sm transition-all
                ${lang === l.value ? 'bg-green-800 text-white font-medium' : 'text-gray-600 hover:bg-white'}`}>
              {l.nativeLabel}
            </button>
          ))}
        </div>

        {/* Sidebar token meter */}
        <div className="mt-auto border-t border-gray-200 pt-4 space-y-3">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('mentor.label')}</span>
              <span className={`text-[10px] font-bold ${isExceeded ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-gray-400'}`}>
                {tokenStatus.percent}%
              </span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500
                ${isExceeded ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-green-500'}`}
                style={{ width: `${tokenStatus.percent}%` }} />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              {tokenUsed.toLocaleString()} / {TOKEN_CONFIG.HARD_LIMIT.toLocaleString()} {t('mentor.used')}
            </p>
          </div>

          <button onClick={() => setShowReset(true)}
            className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-gray-500 hover:bg-white hover:text-green-800 border border-transparent hover:border-gray-200 transition-all flex items-center gap-2">
            🔄 {t('mentor.newSession')}
          </button>

          <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-amber-400'}`} />
            {isOnline ? t('mentor.geminiOnline') : t('mentor.offlineMode')}
          </div>
          {import.meta.env.DEV && <p className="text-[9px] text-gray-300">Ctrl+Shift+T: token debug</p>}
        </div>
      </aside>

      {/* ── Chat panel ───────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 relative">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-200 bg-white shrink-0 z-10">
          <div className="w-9 h-9 bg-green-800 rounded-full flex items-center justify-center text-white shrink-0">🤖</div>
          <div>
            <p className="font-semibold text-sm text-gray-900">{t('mentor.title')}</p>
            <p className="text-xs text-green-700">{t('mentor.subtitle')}</p>
          </div>
          <div className="ml-auto flex gap-1 md:hidden">
            {languages.map(l => (
              <button key={l.value} onClick={() => setLang(l.value)}
                className={`px-2 py-1 rounded-full text-xs border transition-all
                  ${lang === l.value ? 'bg-green-800 text-white border-green-800' : 'border-gray-200 text-gray-500'}`}>
                {l.value.toUpperCase()}
              </button>
            ))}
          </div>
          <button onClick={() => setShowReset(true)}
            className="hidden md:flex items-center gap-1.5 text-xs text-gray-400 hover:text-green-700 transition-colors ml-auto px-2 py-1 rounded-lg hover:bg-green-50">
            🔄 <span>{t('mentor.newSession')}</span>
          </button>
          <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-amber-400'}`} />
            {isOnline ? t('mentor.online') : t('mentor.offline')}
          </div>
        </div>

        {/* Token bar */}
        <TokenUsageBar used={tokenUsed} t={t} />

        {/* Warning banner */}
        {isWarning && !isExceeded && !cooldown.active && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center justify-between gap-3 shrink-0">
            <p className="text-xs text-amber-700 font-medium">{t('mentor.warn')}</p>
            <button onClick={() => setShowReset(true)}
              className="text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1 rounded-full transition-colors whitespace-nowrap shrink-0">
              {t('mentor.newSession')} →
            </button>
          </div>
        )}

        {/* Debug panel */}
        {showDebug && import.meta.env.DEV && <TokenDebugPanel messages={messages} t={t} />}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 bg-[#f0f4e8]">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'bot' && (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm shrink-0 mt-0.5
                  ${msg.isLimit ? 'bg-red-400' : 'bg-green-800'}`}>
                  {msg.isLimit ? '⛔' : '🤖'}
                </div>
              )}
              <div className="flex flex-col gap-1 max-w-[78%]">
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed
                  ${msg.role === 'bot'
                    ? msg.isLimit
                      ? 'bg-red-50 border border-red-200 text-red-700 rounded-tl-sm'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
                    : 'bg-green-800 text-white rounded-tr-sm'
                  }`}
                  dangerouslySetInnerHTML={{
                    __html: (msg.text || '')
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n/g, '<br/>')
                  }}
                />
                {msg.lang && msg.lang !== 'en' && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full w-fit
                    ${msg.role === 'user' ? 'bg-green-700 text-green-100 self-end' : 'bg-gray-100 text-gray-400'}`}>
                    {languages.find(l => l.value === msg.lang)?.nativeLabel || msg.lang}
                  </span>
                )}
                {showDebug && import.meta.env.DEV && msg.tokens > 0 && (
                  <span className="text-[9px] text-gray-300 font-mono">~{msg.tokens}t</span>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center text-green-800 text-sm shrink-0 mt-0.5">👤</div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-2.5">
              <div className="w-8 h-8 bg-green-800 rounded-full flex items-center justify-center text-white text-sm shrink-0">🤖</div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center h-4">
                  {[0, 0.15, 0.3].map((d, idx) => (
                    <div key={idx} className="w-2 h-2 bg-green-300 rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── Cooldown overlay — sits above the message list ── */}
        {cooldown.active && (
          <CooldownScreen
            remainingMs={cooldown.remainingMs}
            onUnlock={handleCooldownUnlock}
            t={t}
          />
        )}

        {/* Input bar */}
        <div className={`flex gap-2 items-center px-5 py-3.5 border-t border-gray-200 bg-white shrink-0 z-10
          ${isLocked ? 'opacity-50 pointer-events-none select-none' : ''}`}>
          <VoiceRecorder onTranscript={handleTranscript} language={lang} disabled={loading || isLocked} />
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            disabled={isLocked}
            placeholder={isLocked ? t('mentor.exceeded') : `${t('mentor.typePlaceholder')} ${LANG_LABEL}…`}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full text-sm bg-gray-50 outline-none focus:border-green-400 focus:bg-white transition-all min-w-0 disabled:cursor-not-allowed"
          />
          <span className={`text-[10px] font-mono hidden sm:block shrink-0
            ${isExceeded ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-gray-300'}`}>
            {tokenUsed}/{TOKEN_CONFIG.HARD_LIMIT}
          </span>
          <button onClick={() => send()} disabled={!input.trim() || loading || isLocked}
            className="w-9 h-9 bg-green-800 text-white rounded-full flex items-center justify-center hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm shrink-0">
            ➤
          </button>
        </div>
      </div>

      {/* Reset modal */}
      {showReset && <ResetModal onConfirm={resetSession} onCancel={() => setShowReset(false)} t={t} />}
    </div>
  )
}
