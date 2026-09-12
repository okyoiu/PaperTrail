import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { isSupabaseConfigured } from '../services/supabaseClient'
import { FriendsPanel } from '../features/social/FriendsPanel'

export function AddFriendPage() {
  const { user } = useAuth()

  if (!isSupabaseConfigured) {
    return (
      <section className="page">
        <h2>Add friend</h2>
        <p>Backend not configured yet — add VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY to .env.</p>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="page">
        <h2>Add friend</h2>
        <p>
          <Link to="/login">Sign in</Link> to add friends and see them on the map.
        </p>
      </section>
    )
  }

  return (
    <section className="page">
      <FriendsPanel userId={user.id} />
    </section>
  )
}
