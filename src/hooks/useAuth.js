import { createContext, createElement, useContext, useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../services/supabaseClient'
import { ensureProfile, onAuthStateChange } from '../features/backend/api'
import { clearPendingCharacterId, getPendingCharacterId } from '../features/social/pendingCharacter'

const AuthContext = createContext({ user: null, profile: null, setProfile: () => {} })

// Tracks the signed-in user and their profile row, creating the profile the
// first time a given auth user is seen (see api.ensureProfile) with whatever
// explorer was picked on the sign-in screen. Mounted once at the app root so
// every page and the first-sign-in popup share one profile: saving a
// username/character anywhere shows up everywhere right away.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loadedProfile, setLoadedProfile] = useState(null)
  // Auth events (token refreshes included) hand back a fresh user object each
  // time, so the profile load keys on the id rather than the object.
  const userId = user?.id ?? null
  const userEmail = user?.email ?? null

  useEffect(() => {
    if (!isSupabaseConfigured) return
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    return onAuthStateChange(setUser)
  }, [])

  useEffect(() => {
    if (!userId) return
    const characterId = getPendingCharacterId()
    let stale = false
    ensureProfile({ id: userId, email: userEmail }, { characterId })
      .then((profile) => {
        if (stale) return
        if (characterId) clearPendingCharacterId()
        setLoadedProfile(profile)
      })
      .catch((err) => console.error('Failed to load profile:', err))
    return () => {
      stale = true
    }
  }, [userId, userEmail])

  // Never hand out a previous user's profile while the next one loads.
  const profile = loadedProfile?.id === userId ? loadedProfile : null

  return createElement(
    AuthContext.Provider,
    { value: { user, profile, setProfile: setLoadedProfile } },
    children,
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
