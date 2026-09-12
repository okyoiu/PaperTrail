import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getVisibleLocations,
  subscribeToVisibleLocations,
  updateMyLocation,
} from '../features/backend/api'

const PUSH_INTERVAL_MS = 10000 // how often we report our own position

// Combines: pushing the signed-in user's position (real GPS or a debug
// teleport, see useDebugPosition) to live_locations, and reading back the
// accepted friends visible to them — enforced by RLS, not by this hook.
// See supabase/schema.sql.
export function useFriendsMap(userId, position) {
  const [locations, setLocations] = useState([])
  const lastPushRef = useRef(0)

  useEffect(() => {
    if (!userId) return
    getVisibleLocations().then(setLocations)
    return subscribeToVisibleLocations(() => {
      getVisibleLocations().then(setLocations)
    })
  }, [userId])

  useEffect(() => {
    if (!userId || !position) return
    const now = Date.now()
    if (now - lastPushRef.current < PUSH_INTERVAL_MS) return
    lastPushRef.current = now
    updateMyLocation(userId, position.lat, position.lng).catch(() => {})
  }, [userId, position])

  // The user's own row is excluded: the map already draws their live dot.
  const friends = useMemo(() => locations.filter((loc) => loc.user_id !== userId), [locations, userId])

  return { friends }
}
