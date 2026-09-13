import { useId, useState } from 'react'
import { signInWithEmail, verifyEmailCode } from '../backend/api'
import { CHARACTERS, getCharacter } from '../map/characters'
import { CharacterFigure } from './CharacterFigure'
import { CharacterPicker } from './CharacterPicker'
import { getPendingCharacterId, setPendingCharacterId } from './pendingCharacter'

// Character-select style sign-in: pick the explorer you'll walk the map as,
// then enter your email. Supabase sends one email holding a magic link and a
// 6-digit code; typing the code here signs in without leaving the page (or
// the installed PWA), and the link still works as a fallback. The chosen
// explorer is written to the profile once the session arrives (see
// pendingCharacter.js).
export function SignIn() {
  const [characterId, setCharacterId] = useState(() => getPendingCharacterId() ?? CHARACTERS[0].id)
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState(null) // the address the code went to
  const [code, setCode] = useState('')
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
      setCode('')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleVerify(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      // On success the auth listener in AuthProvider swaps this screen out.
      await verifyEmailCode(sentTo, code)
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
      <form className="sign-in" onSubmit={handleVerify}>
        {hero}
        <p>
          We emailed <strong>{sentTo}</strong>. Enter the 6-digit code from that email, or tap the link
          in it.
        </p>
        <label>
          Sign-in code
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            placeholder="123456"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            minLength={6}
            maxLength={10}
            required
            autoFocus
          />
        </label>
        <button type="submit" disabled={busy || code.length < 6}>
          {busy ? 'Signing in…' : `Play as ${character.name}`}
        </button>
        <div className="sign-in-links">
          <button type="button" className="link-button" onClick={handleSend} disabled={busy}>
            Resend email
          </button>
          <button type="button" className="link-button" onClick={() => setSentTo(null)} disabled={busy}>
            Use a different email
          </button>
        </div>
        {error && <p className="review-form-error">{error}</p>}
      </form>
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
        {busy ? 'Sending…' : 'Email me a sign-in code'}
      </button>
      {error && <p className="review-form-error">{error}</p>}
    </form>
  )
}
