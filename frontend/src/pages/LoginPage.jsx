// frontend/src/pages/LoginPage.jsx
import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth }     from '../hooks/useAuth'
import { useLanguage } from '../i18n/index.jsx'

export default function LoginPage() {
  const { login, loading, error, clearError } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const from     = location.state?.from || '/'
  const [form, setForm]       = useState({ email: '', password: '' })
  const [localErr, setLocalErr] = useState('')

  const handleChange = e => { clearError(); setLocalErr(''); setForm(p => ({ ...p, [e.target.name]: e.target.value })) }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.email || !form.password) { setLocalErr(t('auth.login.errorRequired')); return }
    try { await login(form); navigate(from, { replace: true }) } catch { }
  }

  const displayErr = localErr || error

  return (
    <div className="min-h-[calc(100vh-68px)] bg-[#f0f4e8] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-green-800 rounded-full flex items-center justify-center text-white text-xl mx-auto mb-4">◎</div>
            <h1 className="text-2xl font-bold font-serif text-gray-900">{t('auth.login.title')}</h1>
            <p className="text-gray-500 text-sm mt-1">{t('auth.login.subtitle')}</p>
          </div>
          {displayErr && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-sm text-red-600">⚠️ {displayErr}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.login.emailLabel')}</label>
              <input type="email" name="email" value={form.email} onChange={handleChange}
                placeholder={t('auth.login.emailHolder')} autoComplete="email"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.login.passwordLabel')}</label>
              <input type="password" name="password" value={form.password} onChange={handleChange}
                placeholder={t('auth.login.passwordHolder')} autoComplete="current-password"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-green-800 text-white py-3 rounded-xl font-medium text-sm hover:bg-green-700 disabled:opacity-50 active:scale-[0.99] transition-all mt-2">
              {loading ? t('auth.login.submitting') : t('auth.login.submit')}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">
            {t('auth.login.noAccount')}{' '}
            <Link to="/register" className="text-green-800 font-semibold hover:underline">{t('auth.login.createOne')}</Link>
          </p>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">
          {t('auth.login.guestPrompt')}{' '}
          <Link to="/assessment" className="text-green-700 hover:underline">{t('auth.login.guestLink')}</Link>
        </p>
      </div>
    </div>
  )
}
