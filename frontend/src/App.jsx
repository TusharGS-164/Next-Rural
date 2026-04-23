// frontend/src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider }     from './hooks/useAuth'
import { LanguageProvider } from './i18n/index.jsx'
import { useProfile }       from './hooks/useProfile'

import Navbar            from './components/Navbar'
import ProtectedRoute    from './components/ProtectedRoute'
import HomePage          from './pages/HomePage'
import LoginPage         from './pages/LoginPage'
import RegisterPage      from './pages/RegisterPage'
import AssessmentPage    from './pages/AssessmentPage'
import ResultsPage       from './pages/ResultsPage'
import CareersPage       from './pages/CareersPage'
import OpportunitiesPage from './pages/OpportunitiesPage'
import MentorPage        from './pages/MentorPage'
import ProfilePage       from './pages/ProfilePage'

function AppRoutes() {
  const {
    profile, updateProfile, submitProfile, resetProfile,
    recommendations, loading, error,
  } = useProfile()
  const profileProps = { profile, updateProfile, submitProfile, recommendations, loading, error }

  return (
    <>
      <Navbar onReset={resetProfile} />
      <Routes>
        <Route path="/"              element={<HomePage />} />
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/register"      element={<RegisterPage />} />
        <Route path="/careers"       element={<CareersPage />} />
        <Route path="/assessment"    element={<AssessmentPage {...profileProps} />} />
        <Route path="/opportunities" element={<OpportunitiesPage profile={profile} />} />
        <Route path="/results"       element={<ProtectedRoute><ResultsPage {...profileProps} /></ProtectedRoute>} />
        <Route path="/mentor"        element={<ProtectedRoute><MentorPage profile={profile} /></ProtectedRoute>} />
        <Route path="/profile/me"    element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      {/* LanguageProvider must wrap everything so any component can call useLanguage() */}
      <LanguageProvider>
        <AuthProvider>
          <div className="min-h-screen bg-white text-gray-900 font-sans">
            <AppRoutes />
          </div>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  )
}
