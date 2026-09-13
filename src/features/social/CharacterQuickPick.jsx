import { useState } from 'react'
import { updateProfile } from '../backend/api'
import { CHARACTERS, getCharacter } from '../map/characters'
import { CharacterFigure } from './CharacterFigure'

// Character switcher on the map HUD. The Profile tab can change this too, but
// only alongside the username - this is the one-tap version so a player (or a
// judge being handed the phone) can swap look without leaving the map.
export function CharacterQuickPick({ profile, onSaved }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(null) // id being saved
  const current = getCharacter(profile.character_id)

  async function choose(characterId) {
    if (characterId === current.id) {
      setOpen(false)
      return
    }
    setSaving(characterId)
    try {
      onSaved(await updateProfile(profile.id, { character_id: characterId }))
      setOpen(false)
    } catch {
      // Non-fatal: keep the sheet open so the player can just tap again.
    } finally {
      setSaving(null)
    }
  }

  return (
    <>
      <button
        type="button"
        className="character-quick-button"
        style={{ '--avatar-accent': current.accent }}
        aria-label={`Change character (currently ${current.name})`}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
      >
        <CharacterFigure characterId={current.id} crop />
      </button>

      {open && (
        <div className="character-quick-sheet" role="dialog" aria-label="Pick a character">
          {CHARACTERS.map((character) => (
            <button
              key={character.id}
              type="button"
              className={
                character.id === current.id
                  ? 'character-option is-selected'
                  : 'character-option'
              }
              style={{ '--avatar-accent': character.accent }}
              aria-pressed={character.id === current.id}
              disabled={saving !== null}
              onClick={() => choose(character.id)}
            >
              <CharacterFigure characterId={character.id} />
              {saving === character.id ? '…' : character.name}
            </button>
          ))}
        </div>
      )}
    </>
  )
}
