import { useState } from 'react'
import { hasChosenUsername } from '../backend/api'
import { useAuth } from '../../hooks/useAuth'
import { ProfileSetup } from './ProfileSetup'

// Pops up over whichever page you land on after signing in (e.g. from the
// magic link) until a username is picked. "Skip for now" hides it for this
// visit; the Profile tab can still set both later.
export function ProfileSetupModal() {
  const { user, profile, setProfile } = useAuth()
  const [skippedUserId, setSkippedUserId] = useState(null)

  if (!user || !profile || hasChosenUsername(profile) || skippedUserId === user.id) return null

  return (
    <div className="profile-setup-modal" role="dialog" aria-modal="true" aria-label="Pick a username and character">
      <ProfileSetup
        profile={profile}
        title="Welcome! Pick a username and character"
        onSaved={setProfile}
        onSkip={() => setSkippedUserId(user.id)}
      />
    </div>
  )
}
