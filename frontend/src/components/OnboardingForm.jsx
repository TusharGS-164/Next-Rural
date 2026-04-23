// frontend/src/components/OnboardingForm.jsx
import { useState } from 'react'
import { useLanguage } from '../i18n/index.jsx'
import options from '../data/options.json'
import { Button, ErrorMessage } from './ui/index.jsx'

// Map option values to i18n label keys
const OPTION_LABEL_KEYS = {
  education:  { '8th': '8th or below', '10th': '10th pass', '12th': '12th pass', 'graduate': 'Graduate' },
  interest:   { trade: 'Repair & Trade', health: 'Healthcare', agri: 'Farming & Nature', tech: 'Computers & Tech', govt: 'Government Jobs' },
  goal:       { quick_earn: 'Earn money quickly', certificate: 'Get a certificate', govt_job: 'Government job', business: 'Start own business' },
  travelRange:{ '5km': 'Within 5 km', '20km': '5–20 km', '50km': '20–50 km', hostel: 'Can stay in hostel' },
}

// Steps — question keys map to both the i18n key and the options list
const STEPS = [
  { key: 'education',   optionsKey: 'education',   questionKey: 'assessment.questions.education' },
  { key: 'interest',    optionsKey: 'interest',     questionKey: 'assessment.questions.interest'  },
  { key: 'goal',        optionsKey: 'goal',         questionKey: 'assessment.questions.goal'      },
  { key: 'travelRange', optionsKey: 'travelRange',  questionKey: 'assessment.questions.travel'    },
]

export default function OnboardingForm({ profile, updateProfile, onSubmit, loading, error }) {
  const { t, lang, setLang, languages } = useLanguage()
  const [stepIdx, setStepIdx] = useState(0)
  const [showIntro, setShowIntro] = useState(!profile.name)

  const step       = STEPS[stepIdx]
  const isLastStep = stepIdx === STEPS.length - 1
  const progress   = Math.round(((stepIdx + 1) / (STEPS.length + 1)) * 100)
  const stepOpts   = options[step.optionsKey] || []

  const getLabel = (opt) => {
    // Use Kannada labelKn for backward compat, otherwise use i18n
    if (lang === 'kn' && opt.labelKn) return opt.labelKn
    return opt.label
  }

  const handleNext = () => {
    if (!profile[step.key]) return
    if (isLastStep) { onSubmit() }
    else { setStepIdx(i => i + 1) }
  }

  // ── Intro screen ──────────────────────────────────────────
  if (showIntro) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('assessment.intro.welcome')}</h1>
        <p className="text-gray-500 text-sm mb-6">{t('assessment.intro.subtitle')}</p>

        {/* Language pills */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {languages.map(l => (
            <button key={l.value} onClick={() => setLang(l.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all
                ${lang === l.value ? 'bg-green-800 text-white border-green-800' : 'border-gray-200 text-gray-500 hover:border-green-400'}`}>
              {l.nativeLabel}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('assessment.intro.nameLabel')}</label>
            <input type="text" value={profile.name} onChange={e => updateProfile({ name: e.target.value })}
              placeholder={t('assessment.intro.namePlaceholder')}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-500 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('assessment.intro.districtLabel')}</label>
            <select value={profile.district} onChange={e => updateProfile({ district: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-500 bg-white">
              <option value="">{t('assessment.intro.districtPlaceholder')}</option>
              {options.districts.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <Button className="w-full mt-8"
          disabled={!profile.name || !profile.district}
          onClick={() => setShowIntro(false)}>
          {t('assessment.intro.continue')}
        </Button>
      </div>
    )
  }

  // ── Quiz steps ────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="h-1.5 bg-green-100 rounded-full mb-2 overflow-hidden">
        <div className="h-full bg-green-800 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-xs text-gray-400 mb-8">
        {t('assessment.question')} {stepIdx + 1} {t('assessment.of')} {STEPS.length}
      </p>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-4">
        <p className="text-xs font-semibold text-green-700 uppercase tracking-widest mb-2">
          {t('assessment.question')} {stepIdx + 1}
        </p>
        <h2 className="text-xl font-semibold text-gray-900 leading-snug mb-6">
          {t(step.questionKey)}
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {stepOpts.map(opt => {
            const selected = profile[step.key] === opt.value
            return (
              <button key={opt.value} onClick={() => updateProfile({ [step.key]: opt.value })}
                className={`flex items-center gap-2.5 px-4 py-3.5 rounded-xl border text-left text-sm transition-all
                  ${selected ? 'border-green-700 bg-green-50 text-green-800 font-semibold' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-green-300'}`}>
                <span className="text-xl">{opt.icon}</span>
                <span>{getLabel(opt)}</span>
              </button>
            )
          })}
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="flex justify-between mt-4">
        {stepIdx > 0
          ? <Button variant="outline" onClick={() => setStepIdx(i => i - 1)}>{t('assessment.back_btn')}</Button>
          : <Button variant="ghost"   onClick={() => setShowIntro(true)}>{t('assessment.back_btn')}</Button>
        }
        <Button disabled={!profile[step.key] || loading} onClick={handleNext}>
          {loading ? t('assessment.finding') : isLastStep ? t('assessment.seeResults') : t('assessment.next')}
        </Button>
      </div>
    </div>
  )
}
