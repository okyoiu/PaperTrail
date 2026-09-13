import { useId, useState } from 'react'
import { signInWithEmail } from '../backend/api'
import { CHARACTERS, getCharacter } from '../map/characters'
import { CharacterFigure } from './CharacterFigure'
import { CharacterPicker } from './CharacterPicker'
import { getPendingCharacterId, setPendingCharacterId } from './pendingCharacter'

// Character-select sign-in: pick the explorer you'll walk the map as, then get
// a magic link by email. Tapping the link signs you in and returns here; the
// chosen explorer is written to the profile once the session arrives (see
// pendingCharacter.js). Kept link-only on purpose - the 6-digit code path
// needs a custom email template that isn't set up.
export function SignIn() {
  const [characterId, setCharacterId] = useState(() => getPendingCharacterId() ?? CHARACTERS[0].id)
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState(null) // the address the link went to
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const pickerLabelId = useId()
  const character = getCharacter(characterId)

  function chooseCharacter(id) {
    setCharacterId(id)
    setPendingCharacterId(id)
  }

  async function handleSend(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signInWithEmail(email)
      setSentTo(email)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const hero = (
    <div className="sign-in-hero" style={{ '--avatar-accent': character.accent }}>
      <CharacterFigure characterId={character.id} />
      <div>
        <p className="sign-in-hero-label">Your explorer</p>
        <h2>{character.name}</h2>
      </div>
    </div>
  )

  if (sentTo) {
    return (
      <div className="sign-in">
        {hero}
        <p>
          We emailed a sign-in link to <strong>{sentTo}</strong>. Tap it to sign in as{' '}
          {character.name}, then come back to this page.
        </p>
        <div className="sign-in-links">
          <button type="button" className="link-button" onClick={handleSend} disabled={busy}>
            {busy ? 'Sending…' : 'Resend link'}
          </button>
          <button type="button" className="link-button" onClick={() => setSentTo(null)} disabled={busy}>
            Use a different email
          </button>
        </div>
        {error && <p className="review-form-error">{error}</p>}
      </div>
    )
  }

  return (
    <form className="sign-in" onSubmit={handleSend}>
      {hero}
      <span className="profile-setup-label" id={pickerLabelId}>
        Choose your explorer
      </span>
      <CharacterPicker value={characterId} onChange={chooseCharacter} labelledBy={pickerLabelId} />
      <p className="profile-setup-hint">
        Returning? Your saved explorer stays unless you pick a new one here.
      </p>
      <label>
        Email
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </label>
      <button type="submit" disabled={busy}>
        {busy ? 'Sending…' : 'Email me a sign-in link'}
      </button>
      {error && <p className="review-form-error">{error}</p>}
    </form>
  )
}
