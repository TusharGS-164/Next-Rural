// frontend/src/pages/HomePage.jsx
import { Link } from 'react-router-dom'
import { useLanguage } from '../i18n/index.jsx'

export default function HomePage() {
  const { t } = useLanguage()

  const FEATURES = [
    { icon: '◎', key: 'interests' },
    { icon: '🎓', key: 'skills'    },
    { icon: '📖', key: 'careers'   },
    { icon: '📍', key: 'connect'   },
  ]

  const STATS = [
    { num: '12K+', key: 'youth'     },
    { num: '340+', key: 'itis'      },
    { num: '8',    key: 'languages' },
    { num: '73%',  key: 'employed'  },
  ]

  const STORIES = [
    { initials: 'RK', name: 'Raju Kamble',       location: 'Gadag, North Karnataka',   color: 'bg-green-800', text: 'I didn\'t know ITI existed near my village. The platform showed me Dharwad ITI\'s electrician course. I\'m now earning ₹18,000/month.' },
    { initials: 'SH', name: 'Savitha Hosamani',  location: 'Haveri, Karnataka',         color: 'bg-blue-500',  text: 'The voice guide helped me understand everything. I passed my nursing entrance and got selected for PMKVY training in Hubli.' },
    { initials: 'BP', name: 'Basavaraj Patil',   location: 'Koppal, Karnataka',         color: 'bg-amber-500', text: 'Government scheme applications felt impossible. The step-by-step guide helped me apply within 3 days. I\'m now a certified welder.' },
  ]

  const IMPACT = [
    { num: '73%',  key: 'employed'  },
    { num: '4.8x', key: 'income'    },
    { num: '18',   key: 'districts' },
    { num: '92%',  key: 'complete'  },
  ]

  return (
    <div>
      {/* Hero */}
      <section className="grid md:grid-cols-2 min-h-[88vh] bg-[#f0f4e8]">
        <div className="flex flex-col justify-center px-8 md:px-16 py-16">
          <span className="inline-block mb-5 text-xs font-bold uppercase tracking-widest text-green-800 bg-green-100 border border-green-200 px-4 py-1.5 rounded-full w-fit">
            {t('home.tag')}
          </span>
          <h1 className="font-serif text-4xl md:text-5xl font-bold leading-tight text-gray-900 mb-2">
            {t('home.title')}
          </h1>
          <h2 className="font-serif text-4xl md:text-5xl font-bold italic text-green-800 mb-5">
            {t('home.subtitle')}
          </h2>
          <p className="text-gray-500 text-lg leading-relaxed max-w-md mb-8">
            {t('home.description')}
          </p>
          <div className="flex gap-3 flex-wrap mb-10">
            <Link to="/assessment"
              className="bg-green-800 text-white px-7 py-3.5 rounded-xl font-medium hover:bg-green-700 transition-all active:scale-95">
              {t('home.startAssessment')}
            </Link>
            <Link to="/careers"
              className="bg-white text-gray-800 px-7 py-3.5 rounded-xl font-medium border border-gray-200 hover:border-green-400 transition-all">
              {t('home.explorePaths')}
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-4 max-w-md">
            {STATS.map(s => (
              <div key={s.key}>
                <div className="text-2xl font-bold text-green-800 font-serif">{s.num}</div>
                <div className="text-xs text-gray-500">{t(`home.stats.${s.key}`)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#8aab6e] hidden md:flex items-center justify-center">
          <div className="text-center text-white p-12">
            <div className="w-20 h-20 border-2 border-white/60 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">◎</div>
            <h3 className="text-2xl font-semibold mb-2">{t('home.heroCard.title')}</h3>
            <p className="text-white/80 mb-7 text-sm">{t('home.heroCard.subtitle')}</p>
            <Link to="/assessment"
              className="border border-white/50 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-white/20 transition-all">
              {t('home.heroCard.startNow')}
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-8 md:px-16 py-20 bg-white">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-bold text-gray-900 font-serif mb-3">{t('home.howWeHelp.title')}</h2>
          <p className="text-gray-500 max-w-lg mx-auto">{t('home.howWeHelp.subtitle')}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 max-w-5xl mx-auto">
          {FEATURES.map(f => (
            <div key={f.key}
              className="border border-gray-200 rounded-2xl p-6 hover:border-green-300 hover:-translate-y-1 hover:shadow-md transition-all">
              <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center text-xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{t(`home.howWeHelp.features.${f.key}.title`)}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{t(`home.howWeHelp.features.${f.key}.desc`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stories */}
      <section className="px-8 md:px-16 py-20 bg-gray-50">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 font-serif mb-3">{t('home.stories.title')}</h2>
          <p className="text-gray-500">{t('home.stories.subtitle')}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {STORIES.map(s => (
            <div key={s.initials} className="bg-white border border-gray-200 rounded-2xl p-6 relative">
              <span className="absolute top-4 left-6 font-serif text-6xl text-green-50 leading-none select-none">"</span>
              <p className="text-sm text-gray-600 italic leading-relaxed mt-8 mb-5">{s.text}</p>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${s.color} flex items-center justify-center text-white font-semibold text-sm`}>{s.initials}</div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Impact */}
      <section className="px-8 md:px-16 py-20 bg-white">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold text-gray-900 font-serif mb-3">{t('home.impact.title')}</h2>
          <p className="text-gray-500 max-w-xl mx-auto">{t('home.impact.subtitle')}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 max-w-4xl mx-auto">
          {IMPACT.map(i => (
            <div key={i.key} className="bg-green-50 rounded-2xl p-6 text-center">
              <div className="text-3xl font-bold text-green-800 font-serif">{i.num}</div>
              <div className="text-sm text-gray-500 mt-2">{t(`home.impact.${i.key}`)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-green-800 text-white text-center px-8 py-20">
        <h2 className="text-4xl font-bold font-serif mb-3">{t('home.cta.title')}</h2>
        <p className="text-white/80 max-w-md mx-auto mb-8">{t('home.cta.subtitle')}</p>
        <Link to="/assessment"
          className="bg-white text-green-800 font-semibold px-8 py-3.5 rounded-xl hover:shadow-lg transition-all inline-block">
          {t('home.cta.button')}
        </Link>
      </section>
    </div>
  )
}
