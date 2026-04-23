// frontend/src/components/VoiceRecorder.jsx
/**
 * Voice recorder that:
 * 1. Records audio via MediaRecorder API (webm format, Chrome/Firefox)
 * 2. POSTs the blob to POST /api/transcribe (Whisper backend)
 * 3. Falls back to Web Speech API (browser-native, no server needed)
 *    when Whisper is unavailable or the user is offline
 *
 * Props:
 *   onTranscript(text, lang) — called with the transcribed text
 *   language                 — "en" | "kn" | "hi" | "te" (hint for Whisper)
 *   disabled                 — disables the button
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

// Whisper-capable backends accept webm; Web Speech API needs no format
const MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
]

function getSupportedMimeType() {
  return MIME_TYPES.find(t => MediaRecorder.isTypeSupported(t)) || ''
}

// Language codes → Web Speech API BCP-47 codes
const SPEECH_API_LANG = {
  en: 'en-IN',
  kn: 'kn-IN',
  hi: 'hi-IN',
  te: 'te-IN',
  mr: 'mr-IN',
  ta: 'ta-IN',
  ml: 'ml-IN',
}

// States: idle → requesting → recording → transcribing → done/error
const STATE = {
  IDLE:          'idle',
  REQUESTING:    'requesting',   // waiting for mic permission
  RECORDING:     'recording',
  TRANSCRIBING:  'transcribing', // sending to Whisper
  ERROR:         'error',
}

export default function VoiceRecorder({
  onTranscript,
  language = 'en',
  disabled = false,
}) {
  const [recState,    setRecState]    = useState(STATE.IDLE)
  const [statusMsg,   setStatusMsg]   = useState('')
  const [whisperAvail, setWhisperAvail] = useState(null)  // null = not checked yet

  const mediaRecorderRef = useRef(null)
  const chunksRef        = useRef([])
  const streamRef        = useRef(null)

  // Check Whisper availability on mount
  useEffect(() => {
    axios.get(`${API_BASE}/transcribe/status`)
      .then(({ data }) => setWhisperAvail(data.whisper_available))
      .catch(() => setWhisperAvail(false))
  }, [])

  // ── Web Speech API fallback ───────────────────────────────
  const useBrowserSpeech = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setStatusMsg('Voice not supported in this browser. Use Chrome.')
      setRecState(STATE.ERROR)
      setTimeout(() => setRecState(STATE.IDLE), 3000)
      return
    }

    const rec     = new SR()
    rec.lang      = SPEECH_API_LANG[language] || 'en-IN'
    rec.continuous         = false
    rec.interimResults     = false
    rec.maxAlternatives    = 1

    setRecState(STATE.RECORDING)
    setStatusMsg('Listening… speak now')

    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      onTranscript(transcript, language)
      setStatusMsg(`✓ "${transcript.slice(0, 40)}${transcript.length > 40 ? '…' : ''}"`)
      setRecState(STATE.IDLE)
      setTimeout(() => setStatusMsg(''), 3000)
    }

    rec.onerror = (e) => {
      setStatusMsg(e.error === 'no-speech' ? 'No speech detected. Try again.' : `Error: ${e.error}`)
      setRecState(STATE.ERROR)
      setTimeout(() => setRecState(STATE.IDLE), 3000)
    }

    rec.onend = () => {
      if (recState === STATE.RECORDING) setRecState(STATE.IDLE)
    }

    rec.start()
  }, [language, onTranscript, recState])

  // ── Whisper via MediaRecorder ─────────────────────────────
  const startWhisperRecording = useCallback(async () => {
    setRecState(STATE.REQUESTING)
    setStatusMsg('Requesting microphone…')

    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
    } catch (err) {
      const msg = err.name === 'NotAllowedError'
        ? 'Microphone access denied. Allow it in browser settings.'
        : `Microphone error: ${err.message}`
      setStatusMsg(msg)
      setRecState(STATE.ERROR)
      setTimeout(() => setRecState(STATE.IDLE), 4000)
      return
    }

    const mimeType = getSupportedMimeType()
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})
    mediaRecorderRef.current = recorder
    chunksRef.current = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = async () => {
      // Stop mic tracks
      streamRef.current?.getTracks().forEach(t => t.stop())

      const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
      if (blob.size < 500) {
        setStatusMsg('Recording too short. Try again.')
        setRecState(STATE.ERROR)
        setTimeout(() => setRecState(STATE.IDLE), 3000)
        return
      }

      setRecState(STATE.TRANSCRIBING)
      setStatusMsg('Transcribing…')

      const ext      = (mimeType || 'audio/webm').split('/')[1].split(';')[0]
      const formData = new FormData()
      formData.append('file', blob, `recording.${ext}`)
      if (language) formData.append('language', language)

      try {
        const { data } = await axios.post(`${API_BASE}/transcribe`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 30_000,  // 30s max — Whisper can be slow on CPU
        })

        onTranscript(data.text, data.language)
        setStatusMsg(`✓ ${data.language_name} · "${data.text.slice(0, 40)}${data.text.length > 40 ? '…' : ''}"`)
        setRecState(STATE.IDLE)
        setTimeout(() => setStatusMsg(''), 4000)
      } catch (err) {
        const detail = err.response?.data?.detail || err.message
        if (err.response?.status === 503) {
          // Whisper not installed on this server — fall back to browser
          setStatusMsg('Falling back to browser speech recognition…')
          setTimeout(() => {
            setRecState(STATE.IDLE)
            useBrowserSpeech()
          }, 1000)
        } else {
          setStatusMsg(`Transcription failed: ${detail}`)
          setRecState(STATE.ERROR)
          setTimeout(() => setRecState(STATE.IDLE), 4000)
        }
      }
    }

    recorder.start()
    setRecState(STATE.RECORDING)
    setStatusMsg('Recording… tap again to stop')
  }, [language, onTranscript, useBrowserSpeech])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
  }, [])

  // ── Main button handler ───────────────────────────────────
  const handleClick = useCallback(() => {
    if (disabled) return

    if (recState === STATE.RECORDING) {
      stopRecording()
      return
    }

    if (recState !== STATE.IDLE) return

    // Choose backend: Whisper if available + online, else browser SR
    const useWhisper = whisperAvail && navigator.onLine
      && typeof MediaRecorder !== 'undefined'

    if (useWhisper) {
      startWhisperRecording()
    } else {
      useBrowserSpeech()
    }
  }, [disabled, recState, whisperAvail, startWhisperRecording, stopRecording, useBrowserSpeech])

  // ── Cleanup on unmount ────────────────────────────────────
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  // ── UI ─────────────────────────────────────────────────────
  const isRecording     = recState === STATE.RECORDING
  const isTranscribing  = recState === STATE.TRANSCRIBING
  const isRequesting    = recState === STATE.REQUESTING
  const isError         = recState === STATE.ERROR
  const isBusy          = isRecording || isTranscribing || isRequesting

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Main mic button */}
      <button
        onClick={handleClick}
        disabled={disabled || isTranscribing || isRequesting}
        title={isRecording ? 'Tap to stop recording' : 'Tap to speak'}
        className={`
          relative w-10 h-10 rounded-full flex items-center justify-center
          text-base transition-all duration-200 border
          ${isRecording
            ? 'bg-red-500 border-red-400 text-white shadow-lg shadow-red-200 scale-110'
            : isTranscribing || isRequesting
              ? 'bg-amber-100 border-amber-300 text-amber-600 cursor-wait'
              : isError
                ? 'bg-red-50 border-red-200 text-red-400'
                : 'border-gray-200 text-gray-400 hover:bg-green-50 hover:border-green-300 hover:text-green-700'
          }
          ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
        `}
      >
        {/* Pulsing ring when recording */}
        {isRecording && (
          <span className="absolute inset-0 rounded-full bg-red-400 opacity-30 animate-ping" />
        )}

        {/* Icon */}
        {isTranscribing || isRequesting ? (
          <span className="animate-spin text-xs">⏳</span>
        ) : isRecording ? (
          '⏹'
        ) : (
          '🎙️'
        )}
      </button>

      {/* Status text */}
      {statusMsg && (
        <p className={`text-xs text-center max-w-[160px] leading-tight
          ${isError ? 'text-red-500' : 'text-gray-500'}`}>
          {statusMsg}
        </p>
      )}

      {/* Engine indicator — shown only in development */}
      {import.meta.env.DEV && whisperAvail !== null && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full
          ${whisperAvail
            ? 'bg-green-50 text-green-600'
            : 'bg-gray-100 text-gray-400'}`}>
          {whisperAvail ? 'Whisper' : 'Browser SR'}
        </span>
      )}
    </div>
  )
}
