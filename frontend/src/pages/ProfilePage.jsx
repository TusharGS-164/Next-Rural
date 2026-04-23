// frontend/src/pages/ProfilePage.jsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../i18n/index.jsx'
import { fetchMyProfile } from '../utils/api'
import { Spinner } from '../components/ui/index.jsx'
import ProgressTracker from '../components/ProgressTracker'

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    fetchMyProfile().then(setProfile)
      .catch(() => setError(t('profile.noProfile')))
      .finally(() => setLoading(false))
  }, [])

  const PROFILE_FIELDS = [
    { label: t('profile.fields.name'),      value: profile?.name },
    { label: t('profile.fields.education'), value: profile?.education },
    { label: t('profile.fields.interest'),  value: profile?.interest },
    { label: t('profile.fields.district'),  value: profile?.district },
    { label: t('profile.fields.goal'),      value: profile?.goal?.replace('_', ' ') },
    { label: t('profile.fields.travel'),    value: profile?.travel_range },
    { label: t('profile.fields.language'),  value: profile?.language?.toUpperCase() },
    { label: t('profile.fields.age'),       value: profile?.age },
  ]

  return (
    <div className="min-h-[calc(100vh-68px)] bg-[#f0f4e8] px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-green-800 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-lg">{profile?.name || t('profile.title')}</h1>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
            <span className="ml-auto bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">{t('profile.verified')}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-gray-400 text-xs mb-1">{t('profile.memberSince')}</p>
              <p className="font-medium text-gray-800">{user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '—'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-gray-400 text-xs mb-1">{t('profile.status')}</p>
              <p className="font-medium text-green-700">{t('profile.active')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900">{t('profile.careerProfile')}</h2>
            <Link to="/assessment" className="text-xs text-green-700 font-medium hover:underline">{t('profile.updateProfile')}</Link>
          </div>
          {loading && <Spinner label={t('profile.loading')} />}
          {error && (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm mb-4">{error}</p>
              <Link to="/assessment" className="bg-green-800 text-white px-5 py-2.5 rounded-xl text-sm font-medium">{t('profile.startAssessment')}</Link>
            </div>
          )}
          {profile && !loading && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              {PROFILE_FIELDS.map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-400 text-xs mb-1">{label}</p>
                  <p className="font-medium text-gray-800 capitalize">{value || '—'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <ProgressTracker currentStep={profile ? 2 : 1} />

        <div className="grid grid-cols-2 gap-3">
          <Link to="/results" className="bg-green-800 text-white rounded-2xl p-4 text-center font-medium text-sm hover:bg-green-700 transition-colors">{t('profile.viewRecs')}</Link>
          <Link to="/mentor"  className="bg-white border border-gray-200 rounded-2xl p-4 text-center font-medium text-sm text-gray-700 hover:border-green-300 transition-colors">{t('profile.openMentor')}</Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="font-semibold text-gray-900 mb-1 text-sm">{t('profile.actions')}</h3>
          <p className="text-xs text-gray-400 mb-4">{t('profile.signoutDesc')}</p>
          <button onClick={logout} className="px-4 py-2 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors">{t('profile.signout')}</button>
        </div>
      </div>
    </div>
  )
}
