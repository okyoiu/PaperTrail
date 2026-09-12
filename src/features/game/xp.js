// Mirrors the leveling math in supabase/schema.sql's increment_xp() function,
// so the frontend can predict a level client-side without a round trip.

export const XP_PER_LEVEL = 100
export const REVIEW_XP_AWARD = 25

export function levelForXp(xp) {
  return Math.floor(xp / XP_PER_LEVEL) + 1
}

export function xpIntoCurrentLevel(xp) {
  return xp % XP_PER_LEVEL
}

export function xpToNextLevel(xp) {
  return XP_PER_LEVEL - xpIntoCurrentLevel(xp)
}

// Optimistic client-side preview of profiles.xp / profiles.level after an award.
// The database call to increment_xp() (via api.submitReview) remains the source of truth.
export function applyXpAward(profile, amount = REVIEW_XP_AWARD) {
  const xp = profile.xp + amount
  return { ...profile, xp, level: levelForXp(xp) }
}
