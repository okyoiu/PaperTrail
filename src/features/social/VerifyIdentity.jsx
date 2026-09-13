import { useState } from 'react'
import { setPersonaId } from '../backend/api'
import { isPersonaConfigured, isVerified, startPersonaVerification } from '../../services/persona'

// Profile-tab entry point for the Persona identity challenge (see
// services/persona.js). Three states: not configured (hidden in production, a
// setup hint in dev), configured-but-unverified (a Verify button that opens the
// Persona flow and saves the inquiry id), and verified (a badge).
export function VerifyIdentity({ profile, onSaved }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  if (!isPersonaConfigured) {
    // Nothing to show players until the track is wired up; a quiet dev-only note.
    if (!import.meta.env.DEV) return null
    return (
      <section className="profile-section">
        <h3>Verified explorer</h3>
        <p className="profile-setup-hint">
          Persona isn’t configured yet. Add VITE_PERSONA_TEMPLATE_ID and
          VITE_PERSONA_ENVIRONMENT_ID to .env to enable identity verification.
        </p>
      </section>
    )
  }

  if (isVerified(profile)) {
    return (
      <section className="profile-section">
        <h3>Verified explorer</h3>
        <p className="verified-line">
          <span className="verified-badge">✓ Verified</span>
          Your identity is confirmed with Persona.
        </p>
      </section>
    )
  }

  async function verify() {
    setBusy(true)
    setError(null)
    try {
      const result = await startPersonaVerification({ referenceId: profile.id })
      // null = the player closed the flow without finishing; leave them unverified.
      if (result?.inquiryId) onSaved(await setPersonaId(profile.id, result.inquiryId))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="profile-section">
      <h3>Verified explorer</h3>
      <p className="profile-setup-hint">
        Verify your identity with Persona to earn a verified badge on the map.
      </p>
      <button type="button" className="verify-button" onClick={verify} disabled={busy}>
        {busy ? 'Opening Persona…' : 'Verify with Persona'}
      </button>
      {error && <p className="review-form-error">{error}</p>}
    </section>
  )
}
