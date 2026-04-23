// frontend/src/components/ProgressTracker.jsx
import { useLanguage } from '../i18n/index.jsx'

const STEP_KEYS = ['assessment', 'enrolled', 'scheme', 'training', 'job']

export default function ProgressTracker({ currentStep = 1 }) {
  const { t } = useLanguage()

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6">
      <h3 className="font-semibold text-gray-800 mb-5">{t('progress.title')}</h3>
      <div className="space-y-5">
        {STEP_KEYS.map((key, idx) => {
          const stepNum = idx + 1
          const done    = stepNum < currentStep
          const active  = stepNum === currentStep
          const todo    = stepNum > currentStep
          return (
            <div key={key} className="flex gap-4 relative">
              {idx < STEP_KEYS.length - 1 && (
                <div className="absolute left-4 top-10 w-0.5 h-5 bg-green-100" />
              )}
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold z-10
                ${done   ? 'bg-green-800 text-white' : ''}
                ${active ? 'bg-green-50 border-2 border-green-800 text-green-800' : ''}
                ${todo   ? 'bg-gray-100 border-2 border-gray-200 text-gray-400' : ''}
              `}>
                {done ? '✓' : stepNum}
              </div>
              <div className="pt-0.5">
                <p className={`text-sm font-medium ${todo ? 'text-gray-400' : 'text-gray-800'}`}>
                  {t(`progress.steps.${key}`)}
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold mt-1 inline-block
                  ${done   ? 'bg-green-50 text-green-700' : ''}
                  ${active ? 'bg-amber-50 text-amber-600' : ''}
                  ${todo   ? 'bg-gray-100 text-gray-400'  : ''}
                `}>
                  {done ? t('progress.done') : active ? t('progress.active') : t('progress.upcoming')}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
