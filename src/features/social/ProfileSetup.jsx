import { useId, useState } from 'react'
import { hasChosenUsername, updateProfile } from '../backend/api'
import { getCharacter } from '../map/characters'
import { CharacterPicker } from './CharacterPicker'

// No "@", so a chosen username can never be mistaken for the email address
// new profiles start with (see api.hasChosenUsername).
const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/

// Username + map character. Shown in a popup after a first sign-in (see
// ProfileSetupModal) and on the Profile tab for changing either later.
// onSkip is optional; when given, a "Skip for now" button calls it.
export function ProfileSetup({ profile, title, onSaved, onSkip }) {
  const [username, setUsername] = useState(hasChosenUsername(profile) ? profile.username : '')
  const [characterId, setCharacterId] = useState(getCharacter(profile.character_id).id)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const pickerLabelId = useId()

  async function handleSubmit(event) {
    event.preventDefault()
    if (!USERNAME_PATTERN.test(username)) {
      setMessage({ error: true, text: 'Usernames are 3–20 lowercase letters, numbers, or underscores.' })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const saved = await updateProfile(profile.id, { username, character_id: characterId })
      setMessage({ error: false, text: 'Saved!' })
      onSaved(saved)
    } catch (err) {
      setMessage({ error: true, text: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="profile-setup" onSubmit={handleSubmit}>
      <h3>{title}</h3>

      <label>
        Username
        <input
          type="text"
          placeholder="e.g. owl_explorer"
          value={username}
          onChange={(event) => setUsername(event.target.value.trim().toLowerCase())}
          maxLength={20}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
        />
      </label>
      <p className="profile-setup-hint">Friends add you by this name.</p>

      <span className="profile-setup-label" id={pickerLabelId}>
        Map character
      </span>
      <CharacterPicker value={characterId} onChange={setCharacterId} labelledBy={pickerLabelId} />

      <button type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      {onSkip && (
        <button type="button" className="profile-setup-skip" onClick={onSkip} disabled={saving}>
          Skip for now
        </button>
      )}
      {message && (
        <p className={message.error ? 'review-form-error' : 'profile-setup-hint'}>{message.text}</p>
      )}
    </form>
  )
}
