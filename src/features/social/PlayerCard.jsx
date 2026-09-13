import { hasChosenUsername } from '../backend/api'
import { levelForXp, XP_PER_LEVEL, xpIntoCurrentLevel } from '../game/xp'
import { getCharacter } from '../map/characters'
import { CharacterFigure } from './CharacterFigure'

// The signed-in player at a glance: their explorer, username, level, and XP
// toward the next level. Sits at the top of the Profile tab.
export function PlayerCard({ profile, email }) {
  const character = getCharacter(profile.character_id)
  const level = levelForXp(profile.xp)
  const xpIntoLevel = xpIntoCurrentLevel(profile.xp)

  return (
    <section className="player-card" style={{ '--avatar-accent': character.accent }}>
      <CharacterFigure characterId={character.id} />
      <div className="player-card-body">
        <h2>{hasChosenUsername(profile) ? profile.username : 'New explorer'}</h2>
        <p className="player-card-meta">
          {character.name} · Level {level}
        </p>
        <div
          className="xp-bar"
          role="progressbar"
          aria-label="XP toward the next level"
          aria-valuemin={0}
          aria-valuemax={XP_PER_LEVEL}
          aria-valuenow={xpIntoLevel}
        >
          <div className="xp-bar-fill" style={{ width: `${(xpIntoLevel / XP_PER_LEVEL) * 100}%` }} />
        </div>
        <p className="player-card-meta">
          {xpIntoLevel} / {XP_PER_LEVEL} XP to level {level + 1} · {profile.xp} XP total
        </p>
        {email && <p className="player-card-email">{email}</p>}
      </div>
    </section>
  )
}
