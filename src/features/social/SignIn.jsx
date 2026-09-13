import { useId, useState } from 'react'
import { signInAsGuest } from '../backend/api'
import { CHARACTERS, getCharacter } from '../map/characters'
import { CharacterFigure } from './CharacterFigure'
import { CharacterPicker } from './CharacterPicker'
import { getPendingCharacterId, setPendingCharacterId } from './pendingCharacter'

// One-tap guest sign-in: pick the explorer you'll walk the map as, then start
// playing. No email or magic link - so it works in the installed home-screen
// app on iOS, where a tapped email link would open the browser instead. The
// account is created instantly; the username popup (ProfileSetupModal) follows
// so friends can add you. The chosen explorer is applied once the session
// arrives (see pendingCharacter.js).
export function SignIn() {
  const [characterId, setCharacterId] = useState(() => getPendingCharacterId() ?? CHARACTERS[0].id)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const pickerLabelId = useId()
  const character = getCharacter(characterId)

  function chooseCharacter(id) {
    setCharacterId(id)
    setPendingCharacterId(id)
  }

  async function start() {
    setBusy(true)
    setError(null)
    try {
      setPendingCharacterId(characterId)
      // On success the auth listener in AuthProvider swaps this screen out.
      await signInAsGuest()
    } catch (err) {
      setError(
        /anonymous/i.test(err.message)
          ? 'Guest play isn’t switched on yet. In Supabase → Authentication → Sign In / Providers, enable “Anonymous sign-ins”.'
          : err.message,
      )
      setBusy(false)
    }
  }

  return (
    <div className="sign-in">
      <div className="sign-in-hero" style={{ '--avatar-accent': character.accent }}>
        <CharacterFigure characterId={character.id} />
        <div>
          <p className="sign-in-hero-label">Your explorer</p>
          <h2>{character.name}</h2>
        </div>
      </div>

      <span className="profile-setup-label" id={pickerLabelId}>
        Choose your explorer
      </span>
      <CharacterPicker value={characterId} onChange={chooseCharacter} labelledBy={pickerLabelId} />

      <button type="button" onClick={start} disabled={busy}>
        {busy ? 'Starting…' : `Start exploring as ${character.name}`}
      </button>
      <p className="profile-setup-hint">
        No email needed. You’ll pick a username next so friends can add you.
      </p>
      {error && <p className="review-form-error">{error}</p>}
    </div>
  )
}
