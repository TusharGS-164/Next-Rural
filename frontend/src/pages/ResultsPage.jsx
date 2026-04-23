// frontend/src/pages/ResultsPage.jsx
import { Link } from 'react-router-dom'
import CareerCard from '../components/CareerCard'
import OpportunityCard from '../components/OpportunityCard'
import ProgressTracker from '../components/ProgressTracker'
import { Spinner } from '../components/ui/index.jsx'
import { useLanguage } from '../i18n/index.jsx'

export default function ResultsPage({ profile, recommendations, loading }) {
  const { t } = useLanguage()
  if (loading) return <Spinner label={t('common.loading')} />
  if (!recommendations) return (
    <div className="text-center py-20 px-6">
      <p className="text-gray-500 mb-4">{t('results.noResults')}</p>
      <Link to="/assessment" className="bg-green-800 text-white px-6 py-2.5 rounded-xl text-sm font-medium">{t('results.startAssessment')}</Link>
    </div>
  )
  const { careers = [], opportunities = [] } = recommendations
  return (
    <div>
      <div className="bg-gradient-to-br from-green-50 to-[#d4e8c0] px-8 md:px-16 py-12 border-b border-gray-200">
        <span className="bg-green-800 text-white text-xs font-semibold px-3 py-1 rounded-full">{t('results.badge')}</span>
        <h1 className="text-3xl font-bold font-serif text-gray-900 mt-3 mb-1">{t('results.title')}, {profile.name}</h1>
        <p className="text-gray-500 text-sm">{t('results.subtitle')} — {profile.education} · {profile.interest} · {profile.district}</p>
      </div>
      <div className="px-8 md:px-16 py-10 grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <h2 className="text-xl font-semibold text-gray-900 mb-5">{t('results.recommended')}</h2>
          <div className="grid md:grid-cols-2 gap-5">
            {careers.map((c, i) => <CareerCard key={c.id} career={c} isTop={i === 0} />)}
          </div>
          {opportunities.length > 0 && (
            <div className="mt-10">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-semibold text-gray-900">{t('results.nearYou')} {profile.district}</h2>
                <Link to="/opportunities" className="text-sm text-green-700 font-medium hover:underline">{t('results.seeAll')}</Link>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {opportunities.slice(0, 4).map(o => <OpportunityCard key={o.id} opportunity={o} />)}
              </div>
            </div>
          )}
        </div>
        <div className="space-y-5">
          <ProgressTracker currentStep={2} />
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-sm text-green-800">
            <p className="font-semibold mb-1">{t('results.talkMentor')}</p>
            <p className="text-xs text-green-700 mb-3">{t('results.mentorDesc')}</p>
            <Link to="/mentor" className="block w-full text-center bg-green-800 text-white py-2 rounded-xl text-sm font-medium">{t('results.openMentor')}</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
