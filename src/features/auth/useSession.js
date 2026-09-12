import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

// undefined = still checking for an existing session, null = signed out
export function useSession() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  return session
}
