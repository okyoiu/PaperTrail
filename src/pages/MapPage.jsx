import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyReviews } from '../features/backend/api'
import LocationCard from '../features/game/LocationCard'
import ReviewForm from '../features/game/ReviewForm'
import { levelForXp, XP_PER_REVIEW } from '../features/game/xp'
import { MapView } from '../features/map/MapView'
import { useAuth } from '../hooks/useAuth'
import { useDebugPosition } from '../hooks/useDebugPosition'
import { useFriendsMap } from '../hooks/useFriendsMap'
import { useVisitTracker } from '../hooks/useVisitTracker'
import { resolvePlace } from '../services/googlePlaces'

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString()
}

export function MapPage() {
  const { user, profile, setProfile } = useAuth()
  const userId = user?.id
  const { visits, placeError, clearVisits, markVisitReviewed } = useVisitTracker()
  const { position, debugPreset, setDebugPosition, geoError } = useDebugPosition()
  const { friends } = useFriendsMap(userId, position)
  const [reviews, setReviews] = useState([])
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [reviewingLocation, setReviewingLocation] = useState(null)
  const [reviewingVisitId, setReviewingVisitId] = useState(null)

  useEffect(() => {
    if (!userId) return
    getMyReviews(userId)
      .then(setReviews)
      .catch((err) => console.error('Failed to load reviews:', err))
  }, [userId])

  function openBuildingReview(location) {
    setReviewingVisitId(null)
    setReviewingLocation(location)
  }

  // From tapping your own dot. Spots with no named building nearby get a
  // Google place name when there is one.
  async function openReviewHere(place) {
    setSelectedLocation(null)
    setReviewingVisitId(null)
    if (place.name) {
      setReviewingLocation(place)
      return
    }
    const googlePlace = await resolvePlace(place.lat, place.lng).catch(() => null)
    setReviewingLocation(
      googlePlace?.name
        ? { id: googlePlace.placeId, name: googlePlace.name, lat: place.lat, lng: place.lng }
        : { ...place, name: `Pinned spot (${place.lat.toFixed(4)}, ${place.lng.toFixed(4)})` },
    )
  }

  // "Check in" on any past visit (Google-resolved place, not just a Rice
  // campus OSM building) - this is what makes check-ins/XP work in any city,
  // not only where the pre-baked buildings.geojson has data.
  function openVisitCheckIn(visit) {
    setReviewingVisitId(visit.id)
    setReviewingLocation({
      id: visit.placeId,
      name: visit.name ?? visit.address ?? 'Unknown place',
      lat: visit.lat,
      lng: visit.lng,
    })
  }

  function closeReview() {
    setReviewingLocation(null)
    setReviewingVisitId(null)
  }

  function handleReviewDone(result) {
    setProfile(result.profile)
    setReviews((prev) => [result.review, ...prev])
    if (reviewingVisitId) {
      markVisitReviewed(reviewingVisitId, {
        rating: result.review.rating,
        body: result.review.body,
        photoUrl: result.review.photo_url,
      })
    }
    setSelectedLocation(null)
    closeReview()
  }

  return (
    <div className="page">
      {user && profile && (
        <div className="xp-badge" style={{ marginBottom: '1rem' }}>
          Lv. {levelForXp(profile.xp)} · {profile.xp} XP
        </div>
      )}

      <section className="status">
        {geoError && !debugPreset && <p className="error">Location error: {geoError}</p>}
        {placeError && <p className="error">Place lookup error: {placeError}</p>}
        {position ? (
          <p>
            {debugPreset ? 'Debug location' : 'Current location'}: {position.lat.toFixed(5)},{' '}
            {position.lng.toFixed(5)}
            {position.accuracy != null && ` (±${Math.round(position.accuracy)}m)`}
          </p>
        ) : (
          <p>Waiting for location permission...</p>
        )}
      </section>

      <section className="explore">
        <h2>Map</h2>
        {user ? (
          <p>
            Walk toward buildings to reveal them. Tap a building or your orange dot to leave a
            review with a photo and earn +{XP_PER_REVIEW} XP. Green dots are friends; 📖 marks
            places you've reviewed.
          </p>
        ) : (
          <p>
            <Link to="/login">Sign in</Link> to see friends on the map, leave reviews, and earn XP.
          </p>
        )}
        <MapView
          userId={userId}
          position={position}
          debugPreset={debugPreset}
          onSetDebugPosition={setDebugPosition}
          geoError={geoError}
          friends={friends}
          reviews={reviews}
          onSelectLocation={user ? setSelectedLocation : undefined}
          onReviewHere={user ? openReviewHere : undefined}
        />
      </section>

      <section className="visits">
        <div className="visits-header">
          <h2>Visit history ({visits.length})</h2>
          <button type="button" onClick={clearVisits}>
            Clear
          </button>
        </div>

        {visits.length === 0 ? (
          <p>No visits recorded yet.</p>
        ) : (
          <ul>
            {[...visits].reverse().map((visit) => (
              <li key={visit.id}>
                <strong>{visit.name ?? visit.address ?? 'Unknown place'}</strong>
                <span className="timestamp">{formatTime(visit.timestamp)}</span>
                {visit.name && visit.address && (
                  <span className="address">{visit.address}</span>
                )}

                {visit.rating ? (
                  <div className="visit-checkin">
                    <span>{'★'.repeat(visit.rating)}{'☆'.repeat(5 - visit.rating)}</span>
                    {visit.reviewBody && <p>{visit.reviewBody}</p>}
                    {visit.photoUrl && <img src={visit.photoUrl} alt="" />}
                  </div>
                ) : (
                  user && (
                    <button type="button" onClick={() => openVisitCheckIn(visit)}>
                      Check in
                    </button>
                  )
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {reviewingLocation ? (
        <ReviewForm
          userId={userId}
          location={reviewingLocation}
          onCancel={closeReview}
          onDone={handleReviewDone}
        />
      ) : (
        selectedLocation && (
          <LocationCard
            location={selectedLocation}
            onReview={openBuildingReview}
            onClose={() => setSelectedLocation(null)}
          />
        )
      )}
    </div>
  )
}
