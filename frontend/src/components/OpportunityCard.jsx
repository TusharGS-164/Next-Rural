// frontend/src/components/OpportunityCard.jsx
import { Badge } from './ui/index.jsx'

const TYPE_CONFIG = {
  iti:            { label: 'ITI Center',      variant: 'blue',  icon: '🏫' },
  scheme:         { label: 'Govt Scheme',     variant: 'green', icon: '🏛️' },
  apprenticeship: { label: 'Apprenticeship',  variant: 'amber', icon: '🔧' },
  job:            { label: 'Job Opening',     variant: 'amber', icon: '💼' },
}

export default function OpportunityCard({ opportunity }) {
  const cfg = TYPE_CONFIG[opportunity.type] || { label: opportunity.type, variant: 'gray', icon: '📍' }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-green-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="text-xl">{cfg.icon}</span>
        <Badge variant={cfg.variant}>{cfg.label}</Badge>
      </div>

      <h3 className="font-semibold text-gray-900 mb-1">{opportunity.name}</h3>
      {opportunity.district && (
        <p className="text-xs text-gray-400 mb-2">📍 {opportunity.district}</p>
      )}
      <p className="text-sm text-gray-500 leading-relaxed mb-3">
        {opportunity.description}
      </p>

      {/* Benefit highlight */}
      <div className="flex items-center gap-1.5 text-sm text-green-700 font-medium mb-4">
        <span>✓</span>
        <span>{opportunity.benefit}</span>
      </div>

      <div className="flex gap-2">
        {opportunity.apply_url && (
          <a
            href={opportunity.apply_url}
            target="_blank"
            rel="noreferrer"
            className="flex-1 text-center text-sm font-medium bg-green-800 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Apply Now
          </a>
        )}
        {opportunity.phone && (
          <a
            href={`tel:${opportunity.phone}`}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:border-green-400 transition-colors"
          >
            📞 Call
          </a>
        )}
      </div>
    </div>
  )
}
