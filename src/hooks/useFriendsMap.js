import { useEffect, useRef, useState } from 'react'
import { useGeolocation } from './useGeolocation'
import {
  getVisibleLocations,
  subscribeToVisibleLocations,
  updateMyLocation,
} from '../features/backend/api'

const PUSH_INTERVAL_MS = 10000 // how often we report our own position

// Combines: pushing the signed-in user's own GPS position to live_locations,
// and reading back everyone currently visible to them (self + accepted
// friends only — enforced by RLS, not by this hook). See supabase/schema.sql.
export function useFriendsMap(userId) {
  const { position, error: geoError } = useGeolocation()
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

  return { myPosition: position, geoError, locations }
}
