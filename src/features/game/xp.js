export const XP_PER_REVIEW = 25
export const XP_PER_LEVEL = 100

export function levelForXp(xp) {
  return Math.floor(xp / XP_PER_LEVEL) + 1
}

export function xpToNextLevel(xp) {
  const currentLevelFloor = (levelForXp(xp) - 1) * XP_PER_LEVEL
  return currentLevelFloor + XP_PER_LEVEL - xp
}
