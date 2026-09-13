import { useSyncExternalStore } from 'react'
import { getTrail, subscribeToTrail, trailPassesNear } from '../features/map/characterTrail'

// The character's trail (see features/map/characterTrail.js), re-rendering
// whenever it grows. hasVisited(place) - any { lat, lng } - says whether the
// character has been close enough to that place to review it.
export function useCharacterTrail() {
  const trail = useSyncExternalStore(subscribeToTrail, getTrail)
  return { hasVisited: (place) => trailPassesNear(trail, place) }
}
