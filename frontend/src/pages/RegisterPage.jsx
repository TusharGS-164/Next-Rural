// frontend/src/pages/RegisterPage.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth }     from '../hooks/useAuth'
import { useLanguage } from '../i18n/index.jsx'

function PasswordStrength({ password, t }) {
  const score = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length
  const labels  = ['', t('auth.register.strength.weak'), t('auth.register.strength.fair'), t('auth.register.strength.good'), t('auth.register.strength.strong')]
  const colors  = ['', 'bg-red-400', 'bg-amber-400', 'bg-yellow-400', 'bg-green-500']
  const txColor = ['', 'text-red-500', 'text-gray-500', 'text-gray-500', 'text-green-600']
  if (!password) return null
  return (
    <div className="mt-1.5">
      <div className="flex gap-1 mb-1">
        {[1,2,3,4].map(i => <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= score ? colors[score] : 'bg-gray-200'}`} />)}
      </div>
      <p className={`text-xs ${txColor[score]}`}>{labels[score]}</p>
    </div>
  )
}

export default function RegisterPage() {
  const { register, loading, error, clearError } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [form, setForm]       = useState({ email: '', password: '', confirm: '', phone: '' })
  const [localErr, setLocalErr] = useState('')

  const handleChange = e => { clearError(); setLocalErr(''); setForm(p => ({ ...p, [e.target.name]: e.target.value })) }

  const validate = () => {
    if (!form.email)                      return t('auth.register.errors.emailRequired')
    if (form.password.length < 8)         return t('auth.register.errors.passwordShort')
    if (form.password !== form.confirm)   return t('auth.register.errors.passwordMismatch')
    return null
  }

  const handleSubmit = async e => {
    e.preventDefault()
    const err = validate()
    if (err) { setLocalErr(err); return }
    try { await register({ email: form.email, password: form.password, phone: form.phone || undefined }); navigate('/assessment') } catch {}
  }

  const displayErr = localErr || error
  const inputClass = "w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all"

  return (
    <div className="min-h-[calc(100vh-68px)] bg-[#f0f4e8] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-green-800 rounded-full flex items-center justify-center text-white text-xl mx-auto mb-4">◎</div>
            <h1 className="text-2xl font-bold font-serif text-gray-900">{t('auth.register.title')}</h1>
            <p className="text-gray-500 text-sm mt-1">{t('auth.register.subtitle')}</p>
          </div>
          {displayErr && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-sm text-red-600">⚠️ {displayErr}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.register.emailLabel')} *</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" autoComplete="email" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.register.phoneLabel')} <span className="text-gray-400 font-normal">{t('auth.register.phoneOptional')}</span>
              </label>
              <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder={t('auth.register.phonePlaceholder')} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.register.passwordLabel')} *</label>
              <input type="password" name="password" value={form.password} onChange={handleChange} placeholder={t('auth.register.passwordHolder')} autoComplete="new-password" className={inputClass} />
              <PasswordStrength password={form.password} t={t} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.register.confirmLabel')} *</label>
              <input type="password" name="confirm" value={form.confirm} onChange={handleChange} placeholder={t('auth.register.confirmHolder')} autoComplete="new-password"
                className={`${inputClass} ${form.confirm && form.confirm !== form.password ? 'border-red-300' : ''}`} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-green-800 text-white py-3 rounded-xl font-medium text-sm hover:bg-green-700 disabled:opacity-50 active:scale-[0.99] transition-all mt-2">
              {loading ? t('auth.register.submitting') : t('auth.register.submit')}
            </button>
          </form>
          <p className="text-center text-xs text-gray-400 mt-5">{t('auth.register.terms')}</p>
          <p className="text-center text-sm text-gray-500 mt-4">
            {t('auth.register.haveAccount')}{' '}
            <Link to="/login" className="text-green-800 font-semibold hover:underline">{t('auth.register.signIn')}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
