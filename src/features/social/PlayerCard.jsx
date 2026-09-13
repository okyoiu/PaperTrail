import { hasChosenUsername } from '../backend/api'
import { XpBar } from '../game/XpBar'
import { levelForXp, XP_PER_LEVEL, xpIntoCurrentLevel } from '../game/xp'
import { getCharacter } from '../map/characters'
import { CharacterFigure } from './CharacterFigure'

// The signed-in player at a glance: their explorer, username, and the same
// hand-drawn XP bar the map HUD shows (see game/XpBar.jsx), so the two read as
// one game. Sits at the top of the Profile tab.
export function PlayerCard({ profile, email }) {
  const character = getCharacter(profile.character_id)
  const level = levelForXp(profile.xp)
  const xpIntoLevel = xpIntoCurrentLevel(profile.xp)

  return (
    <section className="player-card" style={{ '--avatar-accent': character.accent }}>
      <CharacterFigure characterId={character.id} />
      <div className="player-card-body">
        <h2>{hasChosenUsername(profile) ? profile.username : 'New explorer'}</h2>
        <p className="player-card-meta">{character.name}</p>
        <XpBar xp={profile.xp} />
        <p className="player-card-meta">
          {xpIntoLevel} / {XP_PER_LEVEL} XP to level {level + 1} · {profile.xp} XP total
        </p>
        {email && <p className="player-card-email">{email}</p>}
      </div>
    </section>
  )
}
