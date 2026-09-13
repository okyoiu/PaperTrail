import { useEffect } from 'react'
import { useAchievements } from '../../hooks/useAchievements'

// How long a toast stays up; matches the achievement-toast animation in
// index.css. A timer rather than animationend, which a browser can hold back
// while it isn't drawing frames - that would leave an invisible toast sitting
// over the middle of the screen and the rest of the queue stuck behind it.
const TOAST_MS = 3200

// A newly earned achievement, centered on screen: its icon, then
// "title : description" in Darumadrop One on a paper card. Shows for
// TOAST_MS, then makes way for the next queued one; tapping it skips ahead.
export function AchievementToast() {
  const { queue, dismissAchievement } = useAchievements()
  const achievement = queue[0]

  useEffect(() => {
    if (!achievement) return
    const timer = setTimeout(dismissAchievement, TOAST_MS)
    return () => clearTimeout(timer)
  }, [achievement, dismissAchievement])

  if (!achievement) return null

  return (
    <div key={achievement.id} className="achievement-toast" role="status" onClick={dismissAchievement}>
      <img className="achievement-toast-icon" src={achievement.icon} alt="" />
      <p className="achievement-toast-text">
        <span className="achievement-toast-title">{achievement.title}</span>
        {achievement.description && (
          <span className="achievement-toast-description"> : {achievement.description}</span>
        )}
      </p>
    </div>
  )
}
