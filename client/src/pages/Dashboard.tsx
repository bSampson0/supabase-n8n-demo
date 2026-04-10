import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase, Deployment } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventLogEntry {
  id: string
  timestamp: string
  text: string
  type: 'info' | 'success' | 'error'
}

function isMissingDeploymentsTable(message?: string) {
  return Boolean(
    message && (
      message.includes("Could not find the table 'public.deployments' in the schema cache") ||
      message.includes('relation "public.deployments" does not exist')
    )
  )
}

// ─── Seed data shown when the table is empty or not yet created ───────────────

const SEED_DEPLOYMENTS: Deployment[] = [
  { id: 'seed-1', service: 'api-gateway',         version: 'v2.4.1', environment: 'production', status: 'success', triggered_by: 'github-actions',  deployed_at: '2026-04-10T09:12:00Z' },
  { id: 'seed-2', service: 'auth-service',         version: 'v1.9.0', environment: 'production', status: 'success', triggered_by: 'manuel@devops.io', deployed_at: '2026-04-10T08:45:00Z' },
  { id: 'seed-3', service: 'data-pipeline',        version: 'v3.1.2', environment: 'staging',    status: 'failed',  triggered_by: 'github-actions',  deployed_at: '2026-04-09T23:30:00Z' },
  { id: 'seed-4', service: 'metrics-collector',    version: 'v1.0.8', environment: 'production', status: 'success', triggered_by: 'n8n-workflow',     deployed_at: '2026-04-09T18:00:00Z' },
  { id: 'seed-5', service: 'notification-worker',  version: 'v2.0.0', environment: 'staging',    status: 'running', triggered_by: 'jenkins',          deployed_at: '2026-04-09T14:22:00Z' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, trend, trendColor }: Readonly<{
  label: string
  value: string
  trend: string
  trendColor: 'green' | 'yellow' | 'red'
}>) {
  const colors = { green: 'text-green-400', yellow: 'text-yellow-400', red: 'text-red-400' }
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className={`${colors[trendColor]} text-xs mt-1`}>{trend}</p>
    </div>
  )
}

function StatusBadge({ status }: Readonly<{ status: Deployment['status'] }>) {
  const styles: Record<string, string> = {
    success: 'bg-green-900/50 text-green-400 border border-green-800',
    failed:  'bg-red-900/50 text-red-400 border border-red-800',
    running: 'bg-yellow-900/50 text-yellow-400 border border-yellow-800',
    pending: 'bg-gray-800 text-gray-400 border border-gray-700',
  }
  return (
    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${styles[status] ?? styles.pending}`}>
      {status}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const [deployments, setDeployments] = useState<Deployment[]>(SEED_DEPLOYMENTS)
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([
    { id: 'init', timestamp: new Date().toLocaleTimeString(), text: 'Dashboard loaded — trigger a deployment to see n8n fire.', type: 'info' }
  ])

  // Trigger form state
  const [service, setService] = useState('api-gateway')
  const [version, setVersion] = useState('v1.0.0')
  const [environment, setEnvironment] = useState('staging')
  const [triggering, setTriggering] = useState(false)
  const [triggerMsg, setTriggerMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [tableMissing, setTableMissing] = useState(false)

  const logRef = useRef<HTMLDivElement>(null)
  let deployButtonText = 'Deploy → Trigger n8n'
  if (tableMissing) {
    deployButtonText = 'Create Table In Supabase First'
  } else if (triggering) {
    deployButtonText = 'Deploying...'
  }

  function addLog(text: string, type: EventLogEntry['type'] = 'info') {
    const entry: EventLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString(),
      text,
      type,
    }
    setEventLog(prev => [entry, ...prev].slice(0, 50))
  }

  // ── Load deployments from Supabase ──
  async function loadDeployments() {
    const { data, error } = await supabase
      .from('deployments')
      .select('*')
      .order('deployed_at', { ascending: false })
      .limit(20)

    if (error) {
      if (isMissingDeploymentsTable(error.message)) {
        setTableMissing(true)
        setTriggerMsg({ text: 'Create the public.deployments table in Supabase before using live data.', ok: false })
        addLog('Supabase table public.deployments is missing. Using seed data until schema is created.', 'error')
        return
      }

      addLog(`Using seed data (${error.message})`, 'info')
      return
    }

    setTableMissing(false)

    if (data && data.length > 0) {
      setDeployments(data as Deployment[])
      addLog(`Loaded ${data.length} deployment(s) from Supabase`, 'success')
    }
  }

  // ── Supabase Realtime subscription ──
  useEffect(() => {
    loadDeployments()

    if (tableMissing) {
      return
    }

    const channel = supabase
      .channel('deployments-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'deployments' }, payload => {
        const row = payload.new as Deployment
        setDeployments(prev => [row, ...prev])
        addLog(`Realtime: new deployment → ${row.service} ${row.version} (${row.environment})`, 'success')
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tableMissing])

  // ── SSE: listen for n8n callbacks from the backend ──
  useEffect(() => {
    // Use environment variable for API URL in production, fallback to proxy in dev
    const apiBaseUrl = import.meta.env.VITE_API_URL || ''
    const eventSourceUrl = `${apiBaseUrl}/api/events/stream`

    const es = new EventSource(eventSourceUrl)

    es.onopen = () => addLog('Connected to n8n event stream', 'success')

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'n8n_event') {
          addLog(`n8n callback received: ${JSON.stringify(data.payload)}`, 'success')
        }
      } catch {
        // ignore parse errors
      }
    }

    es.onerror = () => {
      // Server not running — silently ignore in dev
      es.close()
    }

    return () => es.close()
  }, [])

  // ── Trigger a deployment (INSERT into Supabase) ──
  async function triggerDeployment() {
    if (tableMissing) {
      setTriggerMsg({ text: 'Run supabase/deployments.sql in the Supabase SQL Editor first.', ok: false })
      addLog('Blocked INSERT because public.deployments has not been created yet.', 'error')
      return
    }

    setTriggering(true)
    setTriggerMsg(null)

    const row = {
      service,
      version,
      environment,
      status: 'running' as const,
      triggered_by: user?.email ?? 'dashboard',
      deployed_at: new Date().toISOString(),
    }

    addLog(`Inserting: ${service} ${version} → ${environment}`, 'info')

    const { error } = await supabase.from('deployments').insert([row])

    if (error) {
      if (isMissingDeploymentsTable(error.message)) {
        setTableMissing(true)
        setTriggerMsg({ text: 'Supabase is missing public.deployments. Run supabase/deployments.sql in the SQL Editor.', ok: false })
        addLog('Insert failed because public.deployments does not exist yet.', 'error')
      } else {
        setTriggerMsg({ text: error.message, ok: false })
        addLog(`Insert failed: ${error.message}`, 'error')
      }
    } else {
      setTriggerMsg({ text: 'Deployed! Supabase webhook → n8n triggered.', ok: true })
      addLog(`INSERT complete — n8n webhook should fire now`, 'success')
      setTimeout(() => setTriggerMsg(null), 4000)
    }

    setTriggering(false)
  }

  async function handleLogout() {
    await signOut()
    navigate('/auth')
  }

  function eventLogClassName(type: EventLogEntry['type']) {
    switch (type) {
      case 'success':
        return 'text-green-400'
      case 'error':
        return 'text-red-400'
      default:
        return 'text-gray-500'
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-gray-950 min-h-screen text-gray-100">

      {/* Navbar */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-green-400 font-bold tracking-tight">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          DevOps Hub
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-500 text-sm hidden sm:block">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-red-400 transition-colors border border-gray-700
                       hover:border-red-700 px-3 py-1.5 rounded-lg"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Deployments" value="142" trend="↑ 12% this week"   trendColor="green"  />
          <StatCard label="Uptime"       value="99.8%" trend="↑ Last 30 days" trendColor="green"  />
          <StatCard label="Incidents"    value="3"     trend="→ Same as last week" trendColor="yellow" />
          <StatCard label="Pipelines"    value="18"    trend="↑ 2 added this month" trendColor="green" />
        </div>

        {tableMissing && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
            <p className="font-semibold text-amber-300">Supabase table setup is incomplete</p>
            <p className="mt-1 text-amber-100/90">
              Run <span className="font-mono text-amber-200">supabase/deployments.sql</span> in the Supabase SQL Editor, then refresh this page.
            </p>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid md:grid-cols-3 gap-6">

          {/* Deployments Table */}
          <div className="md:col-span-2 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-semibold text-sm uppercase tracking-wider text-gray-300">
                Recent Deployments
              </h2>
              <span className="text-xs text-gray-500">live from database</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800">
                    <th className="text-left px-6 py-3">Service</th>
                    <th className="text-left px-6 py-3">Version</th>
                    <th className="text-left px-6 py-3">Status</th>
                    <th className="text-left px-6 py-3">Deployed At</th>
                    <th className="text-left px-6 py-3">Triggered By</th>
                  </tr>
                </thead>
                <tbody>
                  {deployments.map(d => (
                    <tr key={d.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-3 text-gray-200">{d.service}</td>
                      <td className="px-6 py-3 text-gray-400">{d.version}</td>
                      <td className="px-6 py-3"><StatusBadge status={d.status} /></td>
                      <td className="px-6 py-3 text-gray-500 text-xs">{formatDate(d.deployed_at)}</td>
                      <td className="px-6 py-3 text-gray-500 text-xs">{d.triggered_by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Trigger Panel */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl flex flex-col">
            <div className="px-6 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-sm uppercase tracking-wider text-gray-300">
                Trigger Deployment
              </h2>
              <p className="text-gray-600 text-xs mt-1">Inserts a row → fires n8n webhook</p>
            </div>

            <div className="p-6 space-y-4 flex-1">
              <div>
                <label htmlFor="deployment-service" className="block text-gray-400 text-xs mb-1.5 uppercase tracking-wider">Service</label>
                <select id="deployment-service" value={service} onChange={e => setService(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-gray-100
                             text-sm focus:outline-none focus:border-green-500">
                  <option>api-gateway</option>
                  <option>auth-service</option>
                  <option>data-pipeline</option>
                  <option>metrics-collector</option>
                  <option>notification-worker</option>
                </select>
              </div>

              <div>
                <label htmlFor="deployment-version" className="block text-gray-400 text-xs mb-1.5 uppercase tracking-wider">Version</label>
                <input id="deployment-version" type="text" value={version} onChange={e => setVersion(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-gray-100
                             text-sm focus:outline-none focus:border-green-500" />
              </div>

              <div>
                <label htmlFor="deployment-environment" className="block text-gray-400 text-xs mb-1.5 uppercase tracking-wider">Environment</label>
                <select id="deployment-environment" value={environment} onChange={e => setEnvironment(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-gray-100
                             text-sm focus:outline-none focus:border-green-500">
                  <option>staging</option>
                  <option>production</option>
                  <option>dev</option>
                </select>
              </div>

              <button
                onClick={triggerDeployment}
                disabled={triggering || tableMissing}
                className="w-full bg-green-500 hover:bg-green-400 disabled:bg-green-800 disabled:cursor-not-allowed
                           text-gray-950 font-semibold py-2.5 rounded-lg text-sm transition-colors
                           flex items-center justify-center gap-2"
              >
                {triggering && (
                  <div className="w-4 h-4 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
                )}
                {deployButtonText}
              </button>

              {triggerMsg && (
                <div className={`text-xs px-3 py-2.5 rounded-lg ${
                  triggerMsg.ok
                    ? 'bg-green-900/50 border border-green-700 text-green-300'
                    : 'bg-red-900/50 border border-red-700 text-red-300'
                }`}>
                  {triggerMsg.text}
                </div>
              )}
            </div>

            {/* n8n status indicator */}
            <div className="px-6 pb-6">
              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">n8n Webhook</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-gray-300 text-xs">
                    Listening on <code className="text-green-400">deployments</code> INSERT
                  </span>
                </div>
                <p className="text-gray-600 text-xs mt-1.5">
                  Supabase Database Webhook → n8n POST
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Event Log */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-gray-300">
              Event Log
            </h2>
            <span className="text-xs text-green-400 flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </span>
          </div>
          <div ref={logRef} className="p-4 space-y-1.5 max-h-52 overflow-y-auto">
            {eventLog.map(entry => (
              <div key={entry.id} className={`text-xs flex gap-3 ${eventLogClassName(entry.type)}`}>
                <span className="text-gray-600 shrink-0">[{entry.timestamp}]</span>
                <span>{entry.text}</span>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  )
}
