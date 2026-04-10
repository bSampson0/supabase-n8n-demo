import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in client/.env')
}

export const supabase = createClient(url, key)

export interface Deployment {
  id: string
  service: string
  version: string
  environment: string
  status: 'success' | 'failed' | 'running' | 'pending'
  triggered_by: string
  deployed_at: string
}
