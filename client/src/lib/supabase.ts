import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && key)

export const supabaseConfigError = isSupabaseConfigured
  ? null
  : 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in client/.env'

// Use a placeholder client so the module can load; App.tsx blocks the auth UI until config exists.
export const supabase = createClient(
  url ?? 'https://placeholder.supabase.co',
  key ?? 'placeholder-anon-key'
)

export interface Deployment {
  id: string
  service: string
  version: string
  environment: string
  status: 'success' | 'failed' | 'running' | 'pending'
  triggered_by: string
  deployed_at: string
}
