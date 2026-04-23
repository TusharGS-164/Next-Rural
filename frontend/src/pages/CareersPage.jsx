// frontend/src/pages/CareersPage.jsx
import { useEffect, useState } from 'react'
import { fetchCareers } from '../utils/api'
import CareerCard from '../components/CareerCard'
import { Spinner, ErrorMessage } from '../components/ui/index.jsx'
import { useLanguage } from '../i18n/index.jsx'

const CATEGORIES = ['All', 'trade', 'health', 'tech', 'agri', 'govt']

export default function CareersPage() {
  const { t } = useLanguage()
  const [careers,  setCareers]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [category, setCategory] = useState('All')

  useEffect(() => {
    fetchCareers().then(setCareers).catch(() => setError(t('common.error'))).finally(() => setLoading(false))
  }, [])

  const visible = category === 'All' ? careers : careers.filter(c => c.category === category)

  return (
    <div className="px-8 md:px-16 py-12">
      <h1 className="text-3xl font-bold font-serif text-gray-900 mb-1">{t('careers.title')}</h1>
      <p className="text-gray-500 text-sm mb-8">{t('careers.subtitle')}</p>
      <div className="flex gap-2 flex-wrap mb-8">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-all capitalize
              ${category === cat ? 'bg-green-800 text-white border-green-800' : 'border-gray-200 text-gray-600 hover:border-green-400'}`}>
            {cat === 'All' ? t('careers.all') : cat}
          </button>
        ))}
      </div>
      {loading && <Spinner label={t('careers.loading')} />}
      {error   && <ErrorMessage message={error} onRetry={() => window.location.reload()} />}
      <div className="grid md:grid-cols-3 gap-5">
        {visible.map(c => <CareerCard key={c.id} career={c} />)}
      </div>
      {!loading && visible.length === 0 && <p className="text-center text-gray-400 py-12">{t('careers.noResults')}</p>}
    </div>
  )
}
