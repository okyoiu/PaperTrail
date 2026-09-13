import { useAuth } from '../hooks/useAuth'
import { isSupabaseConfigured } from '../services/supabaseClient'
import { hasChosenUsername, signOut } from '../features/backend/api'
import { LocationVisibility } from '../features/social/LocationVisibility'
import { PlayerCard } from '../features/social/PlayerCard'
import { ProfileSetup } from '../features/social/ProfileSetup'
import { SignIn } from '../features/social/SignIn'

export function LoginPage() {
  const { user, profile, setProfile } = useAuth()

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
        {profile ? (
          <>
            <PlayerCard profile={profile} email={user.email} />
            <ProfileSetup
              // Remount when the username changes elsewhere (e.g. the
              // first-sign-in popup) so the form shows the saved name.
              key={profile.username}
              profile={profile}
              title={hasChosenUsername(profile) ? 'Edit your explorer' : 'Pick a username'}
              onSaved={setProfile}
            />
            <LocationVisibility profile={profile} onSaved={setProfile} />
          </>
        ) : (
          <p>Loading your explorer…</p>
        )}
        <button
          type="button"
          className="sign-out-button"
          onClick={() => signOut().catch((err) => console.error('Sign out failed:', err))}
        >
          Sign out
        </button>
      </section>
    )
  }

  return (
    <section className="page login-page">
      <h2>Join the map</h2>
      <p>Sign in to walk the map as your explorer, see other players, leave reviews, and earn XP.</p>
      <SignIn />
    </section>
  )
}
