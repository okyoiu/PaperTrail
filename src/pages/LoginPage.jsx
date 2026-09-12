import { useAuth } from '../hooks/useAuth'
import { isSupabaseConfigured } from '../services/supabaseClient'
import { signOut } from '../features/backend/api'
import { SignIn } from '../features/social/SignIn'

export function LoginPage() {
  const { user, profile } = useAuth()

  if (!isSupabaseConfigured) {
    return (
      <section className="page login-page">
        <h2>Login</h2>
        <p>Backend not configured yet — add VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY to .env.</p>
      </section>
    )
  }

  if (user) {
    return (
      <section className="page login-page">
        <h2>Account</h2>
        <p>Signed in as {profile?.username ?? user.email}</p>
        <button type="button" onClick={signOut}>
          Sign out
        </button>
      </section>
    )
  }

  return (
    <section className="page login-page">
      <h2>Login</h2>
      <p>Sign in to save your progress and see friends on the map.</p>
      <SignIn />
    </section>
  )
}
