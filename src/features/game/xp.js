// Mirrors the leveling math in supabase/schema.sql's increment_xp() function,
// so the frontend can predict a level client-side without a round trip.

export const XP_PER_LEVEL = 100
export const REVIEW_XP_AWARD = 25
// Alias kept for game/LocationCard.jsx and game/ReviewForm.jsx.
export const XP_PER_REVIEW = REVIEW_XP_AWARD

export function levelForXp(xp) {
  return Math.floor(xp / XP_PER_LEVEL) + 1
}

export function xpIntoCurrentLevel(xp) {
  return xp % XP_PER_LEVEL
}

export function xpToNextLevel(xp) {
  return XP_PER_LEVEL - xpIntoCurrentLevel(xp)
}

// The XP bar's hand-drawn frames (public/icons/loading-bar-0.svg = empty ...
// loading-bar-6.svg = full) step up every 15 XP within a level: 0, 15, 30, 45,
// 60, 75. So 46/100 shows the "45" frame. The full frame is saved for the
// moment of a level-up (see XpBar), so it never shows mid-level.
export const XP_BAR_FRAMES = 6
export const XP_PER_BAR_FRAME = 15

export function xpBarFrame(xp) {
  return Math.min(Math.floor(xpIntoCurrentLevel(xp) / XP_PER_BAR_FRAME), XP_BAR_FRAMES - 1)
}

// Optimistic client-side preview of profiles.xp / profiles.level after an award.
// The database call to increment_xp() (via api.submitReview) remains the source of truth.
export function applyXpAward(profile, amount = REVIEW_XP_AWARD) {
  const xp = profile.xp + amount
  return { ...profile, xp, level: levelForXp(xp) }
}
