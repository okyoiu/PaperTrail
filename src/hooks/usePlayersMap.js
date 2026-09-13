import { useEffect, useMemo, useRef, useState } from 'react'
import {
  displayName,
  getActivePlayerLocations,
  getFriends,
  subscribeToPlayerLocations,
  updateMyLocation,
} from '../features/backend/api'

// A walk pushes the latest position this often at most...
const MIN_PUSH_GAP_MS = 5000
// ...and standing still re-sends it this often, so the row never looks stale.
const HEARTBEAT_MS = 20000
// Refetch everyone on a timer as well as on Realtime events, so the map still
// updates on a project where Realtime isn't switched on for the table.
const POLL_MS = 15000
// Realtime fires once per changed row; one refetch shortly after covers a burst.
const REALTIME_DEBOUNCE_MS = 1000
// A player not heard from in this long has left the map.
const ACTIVE_WINDOW_MS = 10 * 60 * 1000

// Other players' characters on the map. Pushes the signed-in user's position
// (real GPS or a debug teleport, see useDebugPosition) to live_locations and
// reads back everyone they're allowed to see - which is decided by RLS (own
// row, players whose profile is set to "everyone", accepted friends), not by
// this hook. See supabase/schema.sql and social/LocationVisibility.jsx.
export function usePlayersMap(userId, position) {
  const [locations, setLocations] = useState([])
  const [friendIds, setFriendIds] = useState(() => new Set())
  const positionRef = useRef(position)
  const lastPushRef = useRef(0)

  useEffect(() => {
    positionRef.current = position
  }, [position])

  // Read: first load, then Realtime (debounced) plus polling.
  useEffect(() => {
    if (!userId) return
    let disposed = false
    let debounceTimer = null

    async function refresh() {
      try {
        const rows = await getActivePlayerLocations(new Date(Date.now() - ACTIVE_WINDOW_MS))
        if (!disposed) setLocations(rows)
      } catch (err) {
        console.error('Failed to load players:', err)
      }
    }

    function refreshSoon() {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(refresh, REALTIME_DEBOUNCE_MS)
    }

    refresh()
    getFriends(userId)
      .then((friends) => {
        if (!disposed) setFriendIds(new Set(friends.map((friend) => friend.id)))
      })
      .catch((err) => console.error('Failed to load friends:', err))
    const unsubscribe = subscribeToPlayerLocations(refreshSoon)
    const pollTimer = setInterval(refresh, POLL_MS)

    return () => {
      disposed = true
      clearTimeout(debounceTimer)
      clearInterval(pollTimer)
      unsubscribe()
    }
  }, [userId])

  // Write, on move: a trailing throttle, so the newest position always goes
  // out within MIN_PUSH_GAP_MS of the previous push (a lone teleport included).
  useEffect(() => {
    if (!userId || !position) return
    const wait = Math.max(0, MIN_PUSH_GAP_MS - (Date.now() - lastPushRef.current))
    const timer = setTimeout(() => {
      lastPushRef.current = Date.now()
      updateMyLocation(userId, position.lat, position.lng).catch(() => {})
    }, wait)
    return () => clearTimeout(timer)
  }, [userId, position])

  // Write, standing still: keep updated_at fresh so friends still see us.
  useEffect(() => {
    if (!userId) return
    const timer = setInterval(() => {
      const current = positionRef.current
      if (!current) return
      lastPushRef.current = Date.now()
      updateMyLocation(userId, current.lat, current.lng).catch(() => {})
    }, HEARTBEAT_MS)
    return () => clearInterval(timer)
  }, [userId])

  // The user's own row is excluded: the map already draws their character.
  // Staleness is handled by the query (and re-applied by every poll).
  const players = useMemo(() => {
    return locations
      .filter((row) => row.user_id !== userId)
      .map((row) => ({
        userId: row.user_id,
        lat: row.lat,
        lng: row.lng,
        updatedAt: row.updated_at,
        username: displayName(row.profiles),
        characterId: row.profiles?.character_id ?? null,
        isFriend: friendIds.has(row.user_id),
      }))
  }, [locations, friendIds, userId])

  return { players }
}
