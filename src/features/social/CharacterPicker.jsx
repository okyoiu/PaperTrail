import { CHARACTERS } from '../map/characters'
import { CharacterFigure } from './CharacterFigure'

// The grid of explorers a player can walk the map as, as a radio group where
// `value` is the selected character id. Shared by the sign-in screen, the
// first-sign-in popup, and the Profile tab so they all look and behave alike.
export function CharacterPicker({ value, onChange, labelledBy, disabled = false }) {
  return (
    <div className="character-picker" role="radiogroup" aria-labelledby={labelledBy}>
      {CHARACTERS.map((character) => (
        <button
          key={character.id}
          type="button"
          role="radio"
          aria-checked={character.id === value}
          className={character.id === value ? 'character-option is-selected' : 'character-option'}
          style={{ '--avatar-accent': character.accent }}
          disabled={disabled}
          onClick={() => onChange(character.id)}
        >
          <CharacterFigure characterId={character.id} />
          {character.name}
        </button>
      ))}
    </div>
  )
}
