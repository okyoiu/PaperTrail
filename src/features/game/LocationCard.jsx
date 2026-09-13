import { XP_PER_REVIEW } from './xp'

// canReview: whether the player's character has been here (see
// map/characterTrail.js). Until it has, the card says to walk over first.
export default function LocationCard({ location, canReview = true, onReview, onClose }) {
  return (
    <div className="location-card">
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Close" style={{ float: 'right' }}>
          ✕
        </button>
      )}
      {location.photoUrl && <img src={location.photoUrl} alt={location.name} />}
      <h3>{location.name}</h3>
      {canReview ? (
        <button onClick={() => onReview(location)}>Leave a review (+{XP_PER_REVIEW} XP)</button>
      ) : (
        <p className="location-card-hint">Walk your character to this building to unlock reviews here.</p>
      )}
    </div>
  )
}
