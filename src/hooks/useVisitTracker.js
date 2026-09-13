import { useEffect, useRef, useState } from 'react'
import { useGeolocation } from './useGeolocation'
import { resolvePlace } from '../services/googlePlaces'
import { distanceMeters } from '../utils/geo'

const STORAGE_KEY = 'visitLog'
const MOVE_THRESHOLD_METERS = 40 // ignore GPS jitter smaller than this
const MIN_LOOKUP_INTERVAL_MS = 15000 // don't hammer the Google API

function loadVisits() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []
  } catch {
    return []
  }
}

function saveVisits(visits) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(visits))
}

// Takes a deleted review's check-in off the visit it was left for, so Visit
// history offers "Check in" there again. Matched on the review id, or on the
// photo for visits saved before check-ins kept their review id.
function withoutReview(visits, reviewId, photoUrl) {
  return visits.map((visit) =>
    visit.reviewId === reviewId || (photoUrl && visit.photoUrl === photoUrl)
      ? { ...visit, reviewId: undefined, rating: undefined, reviewBody: undefined, photoUrl: undefined }
      : visit,
  )
}

// The same, for pages without the tracker (the Album): the map page isn't
// mounted there, so the saved log is the only copy to fix.
export function forgetSavedVisitReview(reviewId, photoUrl) {
  saveVisits(withoutReview(loadVisits(), reviewId, photoUrl))
}

// Turns raw GPS positions into a deduped log of "places visited".
export function useVisitTracker() {
  const { position, error: geoError } = useGeolocation()
  const [visits, setVisits] = useState(loadVisits)
  const [placeError, setPlaceError] = useState(null)
  const lastCheckedRef = useRef({ position: null, time: 0 })

  useEffect(() => {
    if (!position) return

    const { position: lastPosition, time: lastTime } = lastCheckedRef.current
    const now = Date.now()

    const movedFar = !lastPosition || distanceMeters(lastPosition, position) > MOVE_THRESHOLD_METERS
    const enoughTimePassed = now - lastTime > MIN_LOOKUP_INTERVAL_MS
    if (!movedFar || !enoughTimePassed) return

    lastCheckedRef.current = { position, time: now }

    resolvePlace(position.lat, position.lng)
      .then((place) => {
        if (!place) return

        setVisits((prev) => {
          const last = prev[prev.length - 1]
          if (last && last.placeId === place.placeId) return prev // still at the same place

          const next = [
            ...prev,
            {
              id: crypto.randomUUID(),
              ...place,
              lat: position.lat,
              lng: position.lng,
              timestamp: now,
            },
          ]
          saveVisits(next)
          return next
        })
        setPlaceError(null)
      })
      .catch((err) => setPlaceError(err.message))
  }, [position])

  function clearVisits() {
    setVisits([])
    saveVisits([])
  }

  // Attaches a submitted check-in (review id, star rating, note, photo) to the
  // visit it was left for, so Visit history can show what the user actually
  // did there instead of just the timestamp.
  function markVisitReviewed(visitId, { reviewId, rating, body, photoUrl }) {
    setVisits((prev) => {
      const next = prev.map((visit) =>
        visit.id === visitId ? { ...visit, reviewId, rating, reviewBody: body, photoUrl } : visit,
      )
      saveVisits(next)
      return next
    })
  }

  function forgetVisitReview(reviewId, photoUrl) {
    setVisits((prev) => {
      const next = withoutReview(prev, reviewId, photoUrl)
      saveVisits(next)
      return next
    })
  }

  return { position, visits, geoError, placeError, clearVisits, markVisitReviewed, forgetVisitReview }
}
