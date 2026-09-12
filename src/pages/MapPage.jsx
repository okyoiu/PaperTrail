import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useFriendsMap } from '../hooks/useFriendsMap'
import { useVisitTracker } from '../hooks/useVisitTracker'
import { isSupabaseConfigured } from '../services/supabaseClient'
import { FriendsMap } from '../features/map/FriendsMap'
import { MapView } from '../features/map/MapView'
import LocationCard from '../features/game/LocationCard'
import ReviewForm from '../features/game/ReviewForm'
import { levelForXp } from '../features/game/xp'

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString()
}

function FriendsMapSection() {
  const { user } = useAuth()
  const { myPosition, locations } = useFriendsMap(user?.id)

  if (!isSupabaseConfigured) return null

  if (!user) {
    return (
      <section className="friends-map">
        <h2>Friends map</h2>
        <p>
          <Link to="/login">Sign in</Link> to see your location and share it with friends.
        </p>
      </section>
    )
  }

  return (
    <section className="friends-map">
      <h2>Friends map</h2>
      <FriendsMap userId={user.id} myPosition={myPosition} locations={locations} />
    </section>
  )
}

export function MapPage() {
  const { user, profile } = useAuth()
  const { position, visits, geoError, placeError, clearVisits } = useVisitTracker()
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [reviewingLocation, setReviewingLocation] = useState(null)

  return (
    <div className="page">
      {user && profile && (
        <div className="xp-badge" style={{ marginBottom: '1rem' }}>
          Lv. {levelForXp(profile.xp)} · {profile.xp} XP
        </div>
      )}

      <section className="status">
        {geoError && <p className="error">Location error: {geoError}</p>}
        {placeError && <p className="error">Place lookup error: {placeError}</p>}
        {position ? (
          <p>
            Current location: {position.lat.toFixed(5)}, {position.lng.toFixed(5)}{' '}
            (±{Math.round(position.accuracy)}m)
          </p>
        ) : (
          <p>Waiting for location permission...</p>
        )}
      </section>

      <section className="explore">
        <h2>Explore (fog of war)</h2>
        <p>
          Walk toward a building and it reveals in 3D; click an unlocked one to leave a review
          and earn XP.
          {!user && (
            <>
              {' '}
              <Link to="/login">Sign in</Link> to save your progress and review places.
            </>
          )}
        </p>
        <MapView userId={user?.id} onSelectLocation={user ? setSelectedLocation : undefined} />
      </section>

      <FriendsMapSection />

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
              </li>
            ))}
          </ul>
        )}
      </section>

      {reviewingLocation ? (
        <ReviewForm
          userId={user?.id}
          location={reviewingLocation}
          onCancel={() => setReviewingLocation(null)}
          onDone={() => {
            setReviewingLocation(null)
            setSelectedLocation(null)
          }}
        />
      ) : (
        selectedLocation && (
          <LocationCard
            location={selectedLocation}
            onReview={setReviewingLocation}
            onClose={() => setSelectedLocation(null)}
          />
        )
      )}
    </div>
  )
}
