import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { supabaseConfigError } from './lib/supabase'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'

function MissingConfigScreen() {
  return (
    <div className="min-h-screen bg-gray-950 px-4 py-12 text-gray-100">
      <div className="mx-auto max-w-2xl rounded-2xl border border-amber-500/30 bg-gray-900/90 p-8 shadow-2xl shadow-black/30">
        <div className="mb-6 flex items-center gap-3 text-amber-300">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/10 text-lg font-semibold">
            !
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Supabase client is not configured</h1>
            <p className="text-sm text-gray-400">The React app needs Vite environment variables before it can start.</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-950/80 p-4">
          <p className="text-sm text-red-300">{supabaseConfigError}</p>
        </div>

        <div className="mt-6 space-y-4 text-sm text-gray-300">
          <p>Create client/.env with these values:</p>
          <pre className="overflow-x-auto rounded-xl border border-gray-800 bg-black/30 p-4 text-xs text-green-300">
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}
          </pre>
          <p>Copy them from Supabase Dashboard → Project Settings → API, then restart the Vite dev server.</p>
        </div>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }: Readonly<{ children: React.ReactNode }>) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="bg-gray-950 min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    )
  }

  return session ? <>{children}</> : <Navigate to="/auth" replace />
}

function PublicRoute({ children }: Readonly<{ children: React.ReactNode }>) {
  const { session, loading } = useAuth()

  if (loading) return null
  return session ? <Navigate to="/dashboard" replace /> : <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  if (supabaseConfigError) {
    return <MissingConfigScreen />
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
