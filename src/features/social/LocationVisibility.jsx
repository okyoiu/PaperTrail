import { useState } from 'react'
import { updateProfile } from '../backend/api'

// Mirrors the check constraint on profiles.location_visibility and the
// live_locations select policy in supabase/schema.sql.
const OPTIONS = [
  {
    value: 'everyone',
    label: 'Everyone',
    hint: 'Any signed-in explorer can see your character on the map.',
  },
  {
    value: 'friends',
    label: 'Friends only',
    hint: 'Only accepted friends can see where your character is.',
  },
]

export const DEFAULT_VISIBILITY = 'everyone'

function friendlyError(err) {
  // PostgREST's message when the column isn't in the database yet.
  if (/location_visibility/.test(err.message)) {
    return 'The database is missing this setting - re-run supabase/schema.sql in the Supabase SQL editor.'
  }
  return err.message
}

// Who can see this player on the map. Saved straight to the profile on tap.
export function LocationVisibility({ profile, onSaved }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const current = profile.location_visibility ?? DEFAULT_VISIBILITY

  async function choose(value) {
    if (value === current) return
    setSaving(true)
    setError(null)
    try {
      onSaved(await updateProfile(profile.id, { location_visibility: value }))
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="profile-section">
      <h3>Who can see you on the map</h3>
      <div className="segmented" role="radiogroup" aria-label="Location visibility">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={option.value === current}
            className={option.value === current ? 'is-selected' : undefined}
            disabled={saving}
            onClick={() => choose(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="profile-setup-hint">{OPTIONS.find((option) => option.value === current).hint}</p>
      {error && <p className="review-form-error">{error}</p>}
    </section>
  )
}
