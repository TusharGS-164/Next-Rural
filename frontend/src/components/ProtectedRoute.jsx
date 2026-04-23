// frontend/src/components/ProtectedRoute.jsx
/**
 * Wraps any route that requires authentication.
 * If not logged in → redirects to /login, preserving the intended URL
 * so the user lands back here after signing in.
 *
 * Usage in App.jsx:
 *   <Route path="/results" element={
 *     <ProtectedRoute><ResultsPage /></ProtectedRoute>
 *   } />
 */
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute({ children }) {
  const { user }   = useAuth()
  const location   = useLocation()

  if (!user) {
    // Save the attempted URL so login can redirect back
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return children
}
