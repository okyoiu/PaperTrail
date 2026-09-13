import { distanceMeters } from '../../utils/geo'
import { TELEPORT_METERS } from './playerAvatar'

// Everywhere the player's character has been - on real GPS or by tapping the
// map to walk it there - kept in localStorage so it survives reloads. This is
// what "visited" means for reviews: a place can be reviewed once the trail has
// come within VISIT_RADIUS_METERS of it (see MapPage and MapView's building
// unlocks). Stored per browser, not per account, like visitedBuildingsStore.js.

const STORAGE_KEY = 'characterTrail'
// Matches MapView's UNLOCK_RADIUS_METERS, so a building you can review is one
// the character has unlocked.
export const VISIT_RADIUS_METERS = 30
// A walk is saved as points about this far apart, so walking past a place
// counts, not only stopping at it.
const SPACING_METERS = 10
// Closer than this to the last saved point isn't worth saving (GPS jitter).
const MIN_GAP_METERS = SPACING_METERS / 2
// Roughly 50 km of walking; the oldest points are dropped after that.
const MAX_POINTS = 5000

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

let trail = load() // [[lat, lng], ...], oldest first
let lastPosition = null
const listeners = new Set()

// The points one move covers: every SPACING_METERS along a walk, or only the
// destination for a first position or a jump too far to walk (the same rule
// the character follows, see playerAvatar.js).
function pathTo(to) {
  const from = lastPosition
  const distance = from ? distanceMeters(from, to) : Infinity
  if (distance > TELEPORT_METERS) return [{ lat: to.lat, lng: to.lng }]
  const steps = Math.max(1, Math.ceil(distance / SPACING_METERS))
  return Array.from({ length: steps }, (_, i) => {
    const t = (i + 1) / steps
    return { lat: from.lat + (to.lat - from.lat) * t, lng: from.lng + (to.lng - from.lng) * t }
  })
}

// Call with each new character position. Saves the path walked since the
// previous position and returns its points, so the caller can react to
// everywhere the character passed on the way.
export function recordPosition(position) {
  const path = pathTo(position)
  lastPosition = { lat: position.lat, lng: position.lng }

  const next = [...trail]
  for (const point of path) {
    const last = next[next.length - 1]
    if (last && distanceMeters({ lat: last[0], lng: last[1] }, point) < MIN_GAP_METERS) continue
    next.push([Number(point.lat.toFixed(6)), Number(point.lng.toFixed(6))])
  }

  if (next.length > trail.length) {
    trail = next.slice(-MAX_POINTS)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trail))
    } catch {
      // Storage full or blocked: the trail still works until the page reloads.
    }
    for (const listener of listeners) listener()
  }
  return path
}

export function subscribeToTrail(listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getTrail() {
  return trail
}

// place: any { lat, lng }.
export function trailPassesNear(trailPoints, place, radiusMeters = VISIT_RADIUS_METERS) {
  return trailPoints.some(([lat, lng]) => distanceMeters({ lat, lng }, place) <= radiusMeters)
}
