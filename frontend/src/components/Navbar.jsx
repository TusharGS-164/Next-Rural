// frontend/src/components/Navbar.jsx
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth }     from '../hooks/useAuth'
import { useLanguage } from '../i18n/index.jsx'

export default function Navbar({ onReset }) {
  const { pathname }        = useLocation()
  const { user, logout }    = useAuth()
  const { t, lang, setLang, languages } = useLanguage()
  const navigate            = useNavigate()
  const [menuOpen, setMenu] = useState(false)
  const [langOpen, setLangOpen] = useState(false)

  const NAV_LINKS = [
    { to: '/',              label: t('nav.home') },
    { to: '/assessment',    label: t('nav.assessment') },
    { to: '/careers',       label: t('nav.careers') },
    { to: '/opportunities', label: t('nav.opportunities') },
    { to: '/mentor',        label: t('nav.mentor') },
  ]

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const currentLang = languages.find(l => l.value === lang)

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 px-5 md:px-14 py-3.5 flex items-center justify-between gap-3">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 font-semibold text-gray-900 text-[15px] shrink-0">
        <span className="w-8 h-8 rounded-full bg-green-800 text-white flex items-center justify-center text-sm select-none">◎</span>
        <span className="hidden sm:block">Rural Youth Pathways</span>
      </Link>

      {/* Desktop nav links */}
      <div className="hidden md:flex gap-6">
        {NAV_LINKS.map(({ to, label }) => (
          <Link key={to} to={to}
            className={`text-sm font-medium transition-colors whitespace-nowrap ${
              pathname === to ? 'text-green-800 font-semibold' : 'text-gray-500 hover:text-green-700'
            }`}>
            {label}
          </Link>
        ))}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 shrink-0">

        {/* Language picker */}
        <div className="relative">
          <button
            onClick={() => setLangOpen(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:border-green-300 transition-all"
          >
            <span className="text-base">🌐</span>
            <span className="hidden sm:block font-medium">{currentLang?.nativeLabel}</span>
            <span className="text-xs text-gray-400">▾</span>
          </button>

          {langOpen && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
              <div className="absolute right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg z-50 min-w-[140px] overflow-hidden">
                {languages.map(l => (
                  <button
                    key={l.value}
                    onClick={() => { setLang(l.value); setLangOpen(false) }}
                    className={`block w-full text-left px-4 py-2.5 text-sm transition-colors
                      ${lang === l.value
                        ? 'bg-green-50 text-green-800 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    <span className="mr-2">{l.nativeLabel}</span>
                    {lang === l.value && <span className="text-green-600 text-xs">✓</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Auth buttons */}
        {user ? (
          <div className="flex items-center gap-2">
            <Link to="/profile/me"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 text-sm text-gray-700 hover:border-green-300 transition-all max-w-[150px]">
              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-green-800 text-xs font-bold shrink-0">
                {user.email[0].toUpperCase()}
              </div>
              <span className="truncate text-xs">{user.email}</span>
            </Link>
            <button onClick={handleLogout}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50 hidden sm:block">
              {t('nav.signOut')}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login"
              className="text-sm font-medium text-gray-600 hover:text-green-800 px-3 py-1.5 transition-colors hidden sm:block">
              {t('nav.login')}
            </Link>
            <Link to="/register"
              className="bg-green-800 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap">
              {t('nav.getStarted')}
            </Link>
          </div>
        )}

        {/* Mobile menu toggle */}
        <button onClick={() => setMenu(v => !v)}
          className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-sm md:hidden px-5 pb-4 pt-2 flex flex-col gap-0.5 z-50">
          {NAV_LINKS.map(({ to, label }) => (
            <Link key={to} to={to} onClick={() => setMenu(false)}
              className={`py-2.5 text-sm font-medium border-b border-gray-100 last:border-0
                ${pathname === to ? 'text-green-800' : 'text-gray-600'}`}>
              {label}
            </Link>
          ))}
          {/* Mobile language selector */}
          <div className="pt-2 flex gap-2 flex-wrap">
            {languages.map(l => (
              <button key={l.value} onClick={() => { setLang(l.value); setMenu(false) }}
                className={`px-3 py-1.5 rounded-full text-xs border font-medium transition-all
                  ${lang === l.value ? 'bg-green-800 text-white border-green-800' : 'border-gray-200 text-gray-600'}`}>
                {l.nativeLabel}
              </button>
            ))}
          </div>
          {user ? (
            <button onClick={handleLogout} className="py-2.5 text-sm text-red-500 text-left">
              {t('nav.signOut')}
            </button>
          ) : (
            <Link to="/login" onClick={() => setMenu(false)} className="py-2.5 text-sm text-green-800 font-semibold">
              {t('nav.login')} / {t('nav.getStarted')}
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
