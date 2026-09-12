import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../services/supabaseClient'
import { ensureProfile, onAuthStateChange } from '../features/backend/api'

// Tracks the signed-in user and their profile row, creating the profile the
// first time a given auth user is seen (see api.ensureProfile).
export function useAuth() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    return onAuthStateChange(setUser)
  }, [])

  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }
    ensureProfile(user).then(setProfile)
  }, [user])

  return { user, profile, setProfile }
}
