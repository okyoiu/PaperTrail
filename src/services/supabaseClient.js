import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

// Falls back to a dummy client instead of throwing at import time, so the
// rest of the app (e.g. the plain Visit Tracker) still works before .env is
// filled in. Anything that actually calls supabase.* while unconfigured will
// fail fast on that call instead.
export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-anon-key')
