import { createContext, createElement, useCallback, useContext, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getFriends, getMyReviews } from '../features/backend/api'
import { ACHIEVEMENTS, achievementStats } from '../features/game/achievements'
import { useAuth } from './useAuth'

const AchievementsContext = createContext({
  queue: [],
  checkAchievements: () => {},
  dismissAchievement: () => {},
  previewAchievement: () => {},
})

// Dev preview: open the app with ?achiev to queue every achievement toast.
const DEV_PREVIEW =
  import.meta.env.DEV && new URLSearchParams(window.location.search).has('achiev') ? ACHIEVEMENTS : []

// Debug: which achievement the debug menu's "Show achievement" plays next.
let nextPreview = 0

// Which achievements this player has already been shown, per device. Progress
// itself is recomputed from the database each check; only the celebration is
// remembered here.
const seenKey = (userId) => `achievementsSeen:${userId}`

function loadSeen(userId) {
  try {
    return new Set(JSON.parse(localStorage.getItem(seenKey(userId))) ?? [])
  } catch {
    return new Set()
  }
}

function preload(src) {
  const img = new Image()
  img.src = src
  return img.decode().catch(() => {})
}

// Achievements this player has earned but not been shown yet, marked as shown
// before the (large) icons finish loading, so an overlapping check can't queue
// the same one twice. Waits for the icons so a toast never pops in blank.
async function takeNewAchievements(userId) {
  const [reviews, friends] = await Promise.all([getMyReviews(userId), getFriends(userId)])
  const stats = achievementStats({ reviews, friends })
  const seen = loadSeen(userId)
  const fresh = ACHIEVEMENTS.filter((achievement) => achievement.earned(stats) && !seen.has(achievement.id))
  if (fresh.length === 0) return fresh

  for (const achievement of fresh) seen.add(achievement.id)
  localStorage.setItem(seenKey(userId), JSON.stringify([...seen]))
  await Promise.all(fresh.map((achievement) => preload(achievement.icon)))
  return fresh
}

// Looks for newly earned achievements on sign-in, on every tab switch, and
// when the app comes back into view (so a friend request accepted on someone
// else's phone counts without this player doing anything). Pages also call
// checkAchievements() right after an action that can earn one. New ones queue
// up, and AchievementToast shows them one at a time.
export function AchievementsProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id
  const { pathname } = useLocation()
  const [queue, setQueue] = useState(DEV_PREVIEW)

  const checkAchievements = useCallback(() => {
    if (!userId) return
    takeNewAchievements(userId)
      .then((fresh) => fresh.length > 0 && setQueue((current) => [...current, ...fresh]))
      .catch((err) => console.error('Failed to check achievements:', err))
  }, [userId])

  useEffect(() => {
    checkAchievements()
  }, [checkAchievements, pathname])

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') checkAchievements()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [checkAchievements])

  const dismissAchievement = useCallback(() => setQueue((current) => current.slice(1)), [])

  // Debug: queue the next achievement's toast, cycling through them, without
  // earning or marking anything (see the map's debug menu).
  const previewAchievement = useCallback(() => {
    const achievement = ACHIEVEMENTS[nextPreview % ACHIEVEMENTS.length]
    nextPreview += 1
    setQueue((current) => [...current, achievement])
  }, [])

  return createElement(
    AchievementsContext.Provider,
    { value: { queue, checkAchievements, dismissAchievement, previewAchievement } },
    children,
  )
}

export function useAchievements() {
  return useContext(AchievementsContext)
}
