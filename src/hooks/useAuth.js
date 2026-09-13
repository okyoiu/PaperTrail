import { createContext, createElement, useContext, useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../services/supabaseClient'
import { ensureProfile, onAuthStateChange } from '../features/backend/api'

const AuthContext = createContext({ user: null, profile: null, setProfile: () => {} })

// Tracks the signed-in user and their profile row, creating the profile the
// first time a given auth user is seen (see api.ensureProfile). Mounted once
// at the app root so every page and the first-sign-in popup share one profile:
// saving a username/character anywhere shows up everywhere right away.
export function AuthProvider({ children }) {
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

  return createElement(AuthContext.Provider, { value: { user, profile, setProfile } }, children)
}

export function useAuth() {
  return useContext(AuthContext)
}
