import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyReviews } from '../features/backend/api'
import LocationCard from '../features/game/LocationCard'
import ReviewForm from '../features/game/ReviewForm'
import ReviewViewer from '../features/game/ReviewViewer'
import { XpBar } from '../features/game/XpBar'
import { REVIEW_XP_AWARD } from '../features/game/xp'
import { BUILDING_COLORS } from '../features/map/buildingsLayer'
import { POI_LEGEND } from '../features/map/gameStyle'
import { MapView } from '../features/map/MapView'
import InstallPrompt from '../features/mobile/InstallPrompt'
import { CharacterQuickPick } from '../features/social/CharacterQuickPick'
import { useAuth } from '../hooks/useAuth'
import { useCharacterTrail } from '../hooks/useCharacterTrail'
import { useDebugPosition } from '../hooks/useDebugPosition'
import { usePlayersMap } from '../hooks/usePlayersMap'
import { useVisitTracker } from '../hooks/useVisitTracker'
import { resolvePlace } from '../services/googlePlaces'

// Dev preview: open the app with ?xp=46 to see the XP bar without signing in.
const previewXpParam = import.meta.env.DEV && new URLSearchParams(window.location.search).get('xp')
const DEV_PREVIEW_XP = previewXpParam ? Number(previewXpParam) : null

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString()
}

const LEGEND = [
  { color: BUILDING_COLORS.locked, label: 'In the fog' },
  { color: BUILDING_COLORS.unlocked, label: 'Walked past' },
  { color: BUILDING_COLORS.explored, label: 'Explored (reviewed)' },
]

export function MapPage() {
  const { user, profile, setProfile } = useAuth()
  const userId = user?.id
  const { visits, placeError, clearVisits, markVisitReviewed } = useVisitTracker()
  const { position, debugPreset, setDebugPosition, geoError } = useDebugPosition()
  const { players } = usePlayersMap(userId, position)
  // Reviews are only allowed where the character has been (real GPS or
  // tap-to-walk) - see features/map/characterTrail.js.
  const { hasVisited } = useCharacterTrail()
  const [reviews, setReviews] = useState([])
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [reviewingLocation, setReviewingLocation] = useState(null)
  const [reviewingVisitId, setReviewingVisitId] = useState(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  // The review whose photo is open full screen (see ReviewViewer).
  const [viewingReview, setViewingReview] = useState(null)
  const [previewXp, setPreviewXp] = useState(DEV_PREVIEW_XP)
  const hudXp = profile?.xp ?? previewXp
  // Dev preview (?xp=...): tap the bar to add a review's worth of XP, e.g. to
  // try the level-up chevron.
  const addPreviewXp =
    !profile && previewXp != null ? () => setPreviewXp((xp) => xp + REVIEW_XP_AWARD) : undefined

  useEffect(() => {
    if (!userId) return
    getMyReviews(userId)
      .then(setReviews)
      .catch((err) => console.error('Failed to load reviews:', err))
  }, [userId])

  // Places the player has reviewed; the map paints the `osm:` buildings among
  // them in the explored color (see MapView and features/map/buildingsLayer.js).
  const exploredPlaceIds = useMemo(
    () => [...new Set(reviews.map((review) => review.locations?.google_place_id).filter(Boolean))],
    [reviews],
  )

  function openBuildingReview(location) {
    setReviewingVisitId(null)
    setReviewingLocation(location)
  }

  // From tapping your own character, so always somewhere it's standing. Spots
  // with no named building nearby get a Google place name when there is one.
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
    <div className="page map-page">
      <MapView
        userId={userId}
        characterId={profile?.character_id}
        position={position}
        debugPreset={debugPreset}
        onSetDebugPosition={setDebugPosition}
        geoError={geoError}
        players={players}
        reviews={reviews}
        exploredPlaceIds={exploredPlaceIds}
        onSelectLocation={user ? setSelectedLocation : undefined}
        onReviewHere={user ? openReviewHere : undefined}
        onOpenReview={setViewingReview}
      />

      <XpBar xp={hudXp} onClick={addPreviewXp} />

      <div className="map-hud">
        <InstallPrompt />
        {profile && <CharacterQuickPick profile={profile} onSaved={setProfile} />}
        <button type="button" className="map-hud-button" onClick={() => setSheetOpen(true)}>
          Details
        </button>
      </div>

      {sheetOpen && (
        <div className="map-sheet">
          <div className="map-sheet-header">
            <h2>Details</h2>
            <button type="button" className="map-hud-button" onClick={() => setSheetOpen(false)}>
              Close
            </button>
          </div>

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
            <h2>Explore (fog of war)</h2>
            <p>
              Walk your character toward a building and it reveals in 3D. Once your character has
              been there, tap the building or your character to leave a review: that earns XP and
              paints the building in your explored color, on every device you sign in on.
              {!user && (
                <>
                  {' '}
                  <Link to="/login">Sign in</Link> to see other explorers on the map, leave reviews,
                  and earn XP.
                </>
              )}
            </p>
            <ul className="building-legend" aria-label="Building colors">
              {LEGEND.map((entry) => (
                <li key={entry.label}>
                  <span className="building-legend-swatch" style={{ background: entry.color }} />
                  {entry.label}
                </li>
              ))}
            </ul>
            <h3 className="legend-heading">Places around you</h3>
            <ul className="building-legend" aria-label="Place categories">
              {POI_LEGEND.map((entry) => (
                <li key={entry.label}>
                  <span className="poi-legend-dot" style={{ borderColor: entry.color }} />
                  {entry.label}
                </li>
              ))}
            </ul>
            {user && (
              <p className="explore-players">
                {players.length === 0
                  ? 'No other explorers on the map right now.'
                  : `${players.length} other explorer${players.length === 1 ? '' : 's'} on the map.`}
              </p>
            )}
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
                {/* Newest first, and only the three most recent. */}
                {visits.slice(-3).reverse().map((visit) => (
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
                        {visit.photoUrl && (
                          <button
                            type="button"
                            className="review-photo-button"
                            aria-label="View photo larger"
                            onClick={() =>
                              setViewingReview({
                                title: visit.name ?? visit.address ?? 'Unknown place',
                                rating: visit.rating,
                                body: visit.reviewBody,
                                photoUrl: visit.photoUrl,
                              })
                            }
                          >
                            <img src={visit.photoUrl} alt="" />
                          </button>
                        )}
                      </div>
                    ) : (
                      user &&
                      (hasVisited(visit) ? (
                        <button type="button" onClick={() => openVisitCheckIn(visit)}>
                          Check in
                        </button>
                      ) : (
                        <span className="visit-locked">Walk your character here to check in</span>
                      ))
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

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
            canReview={selectedLocation.visited}
            explored={selectedLocation.explored}
            onReview={openBuildingReview}
            onClose={() => setSelectedLocation(null)}
          />
        )
      )}

      {viewingReview && (
        <ReviewViewer review={viewingReview} onClose={() => setViewingReview(null)} />
      )}
    </div>
  )
}
