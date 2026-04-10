import { useState, FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type Tab = 'login' | 'signup'
type MessageType = 'error' | 'success'

interface Message {
  text: string
  type: MessageType
}

export default function AuthPage() {
  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)

  function switchTab(next: Tab) {
    setTab(next)
    setMessage(null)
    setEmail('')
    setPassword('')
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setMessage({ text: error.message, type: 'error' })
      setLoading(false)
    }
    // On success, AuthContext will update session → App.tsx redirects to /dashboard
  }

  async function handleSignup(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setMessage({ text: error.message, type: 'error' })
      setLoading(false)
      return
    }

    // If email confirmation is disabled, session is returned immediately
    if (data.session) {
      // AuthContext picks up the session and redirects automatically
      return
    }

    // Email confirmation required
    setMessage({
      text: 'Account created! Check your email for a confirmation link, then log in.',
      type: 'success',
    })
    setLoading(false)
    switchTab('login')
  }

  const tabBtn = (t: Tab, label: string) =>
    `flex-1 py-2 text-sm rounded-md transition-all font-medium ${
      tab === t
        ? 'bg-green-500 text-gray-950 font-semibold'
        : 'text-gray-400 hover:text-gray-200'
    }`

  return (
    <div className="bg-gray-950 min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-green-400 text-2xl font-bold tracking-tight">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            DevOps Hub
          </div>
          <p className="text-gray-500 text-sm mt-1">Deployment monitoring & automation</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">

          {/* Tabs */}
          <div className="flex mb-6 bg-gray-800 rounded-lg p-1 gap-1">
            <button onClick={() => switchTab('login')} className={tabBtn('login', 'Login')}>
              Login
            </button>
            <button onClick={() => switchTab('signup')} className={tabBtn('signup', 'Sign Up')}>
              Sign Up
            </button>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-5 px-4 py-3 rounded-lg text-sm ${
              message.type === 'error'
                ? 'bg-red-900/40 border border-red-700 text-red-300'
                : 'bg-green-900/40 border border-green-700 text-green-300'
            }`}>
              {message.text}
            </div>
          )}

          {/* Form */}
          <form onSubmit={tab === 'login' ? handleLogin : handleSignup} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-xs mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-100
                           text-sm focus:outline-none focus:border-green-500 transition-colors
                           placeholder:text-gray-600"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-xs mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                required
                minLength={tab === 'signup' ? 6 : undefined}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={tab === 'signup' ? 'Min. 6 characters' : '••••••••'}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-100
                           text-sm focus:outline-none focus:border-green-500 transition-colors
                           placeholder:text-gray-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-400 disabled:bg-green-800 disabled:cursor-not-allowed
                         text-gray-950 font-semibold py-3 rounded-lg text-sm transition-colors mt-1
                         flex items-center justify-center gap-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
              )}
              {loading
                ? tab === 'login' ? 'Logging in...' : 'Creating account...'
                : tab === 'login' ? 'Login →' : 'Create Account →'
              }
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Powered by Supabase + n8n
        </p>
      </div>
    </div>
  )
}
