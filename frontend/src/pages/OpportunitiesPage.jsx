// frontend/src/pages/OpportunitiesPage.jsx
import { useEffect, useState } from 'react'
import { fetchOpportunities } from '../utils/api'
import OpportunityCard from '../components/OpportunityCard'
import { Spinner, ErrorMessage } from '../components/ui/index.jsx'
import { useLanguage } from '../i18n/index.jsx'
import options from '../data/options.json'

const TYPES = ['All', 'iti', 'scheme', 'apprenticeship', 'job']

export default function OpportunitiesPage({ profile }) {
  const { t } = useLanguage()
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [district,setDistrict]= useState(profile?.district || '')
  const [type,    setType]    = useState('All')

  const load = () => {
    setLoading(true)
    fetchOpportunities(district || null, type === 'All' ? null : type)
      .then(d => { setItems(d); setError(null) })
      .catch(() => setError(t('common.error')))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [district, type])

  return (
    <div className="px-8 md:px-16 py-12">
      <h1 className="text-3xl font-bold font-serif text-gray-900 mb-1">{t('opportunities.title')}</h1>
      <p className="text-gray-500 text-sm mb-8">{t('opportunities.subtitle')}</p>
      <div className="flex flex-wrap gap-4 mb-8 items-end">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">{t('nav.opportunities')}</label>
          <select value={district} onChange={e => setDistrict(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:border-green-500 outline-none">
            <option value="">{t('opportunities.allDistricts')}</option>
            {options.districts.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div className="flex gap-2 flex-wrap">
          {TYPES.map(tp => (
            <button key={tp} onClick={() => setType(tp)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all capitalize
                ${type === tp ? 'bg-green-800 text-white border-green-800' : 'border-gray-200 text-gray-600 hover:border-green-400'}`}>
              {tp === 'All' ? t('opportunities.all') : tp}
            </button>
          ))}
        </div>
      </div>
      {loading && <Spinner label={t('opportunities.loading')} />}
      {error   && <ErrorMessage message={error} onRetry={load} />}
      <div className="grid md:grid-cols-3 gap-5">
        {items.map(o => <OpportunityCard key={o.id} opportunity={o} />)}
      </div>
      {!loading && items.length === 0 && <p className="text-center text-gray-400 py-12">{t('opportunities.noResults')}</p>}
    </div>
  )
}
