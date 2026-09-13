import { useEffect, useState } from 'react'
import { levelForXp, XP_BAR_FRAMES, XP_PER_LEVEL, xpBarFrame, xpIntoCurrentLevel } from './xp'

const frameSrc = (frame) => `/icons/loading-bar-${frame}.svg`
const LEVEL_UP_SRC = '/icons/chevron-up.svg'
// How long a level-up shows the bar full before it resets to the new level.
const LEVEL_UP_FULL_MS = 1000

// Fetch every frame and the (~550 KB) chevron up front, so a level-up doesn't
// flash a blank bar or pop the chevron in late while they download.
for (let frame = 0; frame <= XP_BAR_FRAMES; frame++) new Image().src = frameSrc(frame)
new Image().src = LEVEL_UP_SRC

// The HUD's XP bar: a hand-drawn loading-bar frame for progress through the
// current level, with the level number in a matching white card underneath.
// xp is null when there's no profile to read it from (signed out, or no
// backend configured), which shows an empty bar and a "Lv. ##" placeholder.
// On a level-up the bar shows full (still at the old level) for a second, then
// resets to the new level, while a chevron pops up to its right and fades away.
export function XpBar({ xp }) {
  const known = xp != null
  const level = known ? levelForXp(xp) : null
  const progress = known ? `${xpIntoCurrentLevel(xp)}/${XP_PER_LEVEL} XP` : 'Sign in to earn XP'

  // levelUp is bumped on each level-up to (re)start the chevron, and reset to
  // 0 when its animation ends; completedLevel is the level just finished, set
  // while the bar shows full. Both are set during render rather than in an
  // effect so the bar fills on the same frame the new level arrives.
  const [seenLevel, setSeenLevel] = useState(level)
  const [levelUp, setLevelUp] = useState(0)
  const [completedLevel, setCompletedLevel] = useState(null)
  if (level !== seenLevel) {
    setSeenLevel(level)
    // Only a rise from a known level counts, not the profile first loading in.
    if (seenLevel != null && level > seenLevel) {
      setLevelUp((n) => n + 1)
      setCompletedLevel(seenLevel)
    }
  }

  useEffect(() => {
    if (completedLevel == null) return
    const timer = setTimeout(() => setCompletedLevel(null), LEVEL_UP_FULL_MS)
    return () => clearTimeout(timer)
  }, [completedLevel, levelUp])

  const filling = completedLevel != null
  const frame = filling ? XP_BAR_FRAMES : known ? xpBarFrame(xp) : 0
  const shownLevel = filling ? completedLevel : known ? level : '##'

  return (
    <div className="xp-bar" title={progress}>
      <img className="xp-bar-frame" src={frameSrc(frame)} alt={progress} />
      <span className="xp-bar-level">Lv. {shownLevel}</span>
      {levelUp > 0 && (
        <img
          key={levelUp}
          className="xp-bar-level-up"
          src={LEVEL_UP_SRC}
          alt="Level up!"
          onAnimationEnd={() => setLevelUp(0)}
        />
      )}
    </div>
  )
}
