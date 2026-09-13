import { characterSvg, getCharacter } from '../map/characters'

// A player's map character. `crop` shows just the head and shoulders in a
// round badge (friend lists); otherwise the whole figure. The markup is static
// (see characters.js), so dangerouslySetInnerHTML never sees user input.
export function CharacterFigure({ characterId, crop = false }) {
  const character = getCharacter(characterId)
  return (
    <span
      className={crop ? 'character-avatar' : 'character-figure'}
      style={{ '--avatar-accent': character.accent }}
      dangerouslySetInnerHTML={{ __html: characterSvg(character) }}
    />
  )
}
