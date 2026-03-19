import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLoadingText } from '@/hooks/useLoadingText'
import { Loader2 } from 'lucide-react'
import HomePage from '@/pages/HomePage'
import HowItWorks from '@/pages/HowItWorks'
import Settings from '@/pages/Settings'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const loadingText = useLoadingText()
  if (loading) return (
    <div className="h-screen w-screen bg-background flex items-center justify-center gap-3">
      <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
      <span className="text-sm text-muted-foreground">{loadingText}</span>
    </div>
  )
  if (!user) return <Navigate to="/" replace />
  return <>{children}</>
}

function App() {
  const { loading } = useAuth()
  const loadingText = useLoadingText()

  if (loading) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center gap-3">
        <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
        <span className="text-sm text-muted-foreground">{loadingText}</span>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Globe homepage — public, adapts to auth state */}
        <Route path="/" element={<HomePage />} />

        {/* Public */}
        <Route path="/how-it-works" element={<HowItWorks />} />

        {/* Protected */}
        <Route path="/settings" element={
          <ProtectedRoute><Settings /></ProtectedRoute>
        } />

        {/* Legacy redirects */}
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/create" element={<Navigate to="/" replace />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
