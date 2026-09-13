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
export function XpBar({ xp, onClick }) {
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
    <div className="xp-bar" title={progress} onClick={onClick}>
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

      {/* Turns the level card's white fill into a paper scrap like the frame's
          card: ragged edges, faint grain, and a soft pencil-shaded shadow. */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <filter id="xp-paper" x="-20%" y="-40%" width="140%" height="180%">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" seed="7" result="edgeNoise" />
          <feDisplacementMap in="SourceGraphic" in2="edgeNoise" scale="4" result="rough" />
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="2" result="grain" />
          <feColorMatrix
            in="grain"
            type="matrix"
            values="0 0 0 0 0.45  0 0 0 0 0.45  0 0 0 0 0.45  0 0 0 0.14 0"
            result="greyGrain"
          />
          <feComposite in="greyGrain" in2="rough" operator="in" result="grainOnPaper" />
          <feMerge result="paper">
            <feMergeNode in="rough" />
            <feMergeNode in="grainOnPaper" />
          </feMerge>
          <feDropShadow in="paper" dx="0" dy="1" stdDeviation="1.2" floodColor="#000" floodOpacity="0.35" />
        </filter>
      </svg>
    </div>
  )
}
