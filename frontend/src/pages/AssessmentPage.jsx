// frontend/src/pages/AssessmentPage.jsx
import { useNavigate } from 'react-router-dom'
import OnboardingForm from '../components/OnboardingForm'

export default function AssessmentPage({ profile, updateProfile, submitProfile, loading, error }) {
  const navigate = useNavigate()

  const handleSubmit = async () => {
    await submitProfile()
    navigate('/results')
  }

  return (
    <div className="min-h-screen bg-[#f0f4e8]">
      <div className="max-w-xl mx-auto">
        <OnboardingForm
          profile={profile}
          updateProfile={updateProfile}
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
        />
      </div>
    </div>
  )
}
