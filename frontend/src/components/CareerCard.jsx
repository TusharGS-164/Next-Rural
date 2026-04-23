// frontend/src/components/CareerCard.jsx
import { useLanguage } from '../i18n/index.jsx'
import { Badge, Button } from './ui/index.jsx'

export default function CareerCard({ career, isTop = false, onSelect }) {
  const { t } = useLanguage()
  const skills  = career.skills?.split(',') || []
  const score   = career.match_score ?? null
  return (
    <div className={`bg-white rounded-2xl p-5 border transition-all
      ${isTop ? 'border-green-700 shadow-md' : 'border-gray-200 hover:border-green-300 hover:shadow-sm'}`}>
      {isTop && <Badge variant="dark" className="mb-3">★ {t('career.bestMatch')} {score !== null ? `— ${score}%` : ''}</Badge>}
      {!isTop && score !== null && <Badge variant="green" className="mb-3">{score}{t('career.match')}</Badge>}
      <h3 className="font-semibold text-gray-900 text-lg leading-snug mb-1">{career.title}</h3>
      <p className="text-sm text-gray-500 mb-3 leading-relaxed">{career.description}</p>
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">⏱ {career.duration}</span>
        <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">💰 {career.salary_range}</span>
        <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full capitalize">📂 {career.category}</span>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {skills.slice(0, 4).map(s => <Badge key={s} variant="green">{s.trim()}</Badge>)}
      </div>
      <Button variant={isTop ? 'primary' : 'outline'} className="w-full" onClick={() => onSelect?.(career)}>
        {isTop ? t('career.viewRoadmap') : t('career.explorePath')}
      </Button>
    </div>
  )
}
