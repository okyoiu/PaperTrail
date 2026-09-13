import { XP_PER_REVIEW } from './xp'

// canReview: whether the player's character has been here (see
// map/characterTrail.js). Until it has, the card says to walk over first.
// explored: the player has already reviewed this place (it's drawn in the
// explored color on the map) - another review is still welcome.
export default function LocationCard({ location, canReview = true, explored = false, onReview, onClose }) {
  return (
    <div className="location-card">
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Close" style={{ float: 'right' }}>
          ✕
        </button>
      )}
      {location.photoUrl && <img src={location.photoUrl} alt={location.name} />}
      <h3>
        {location.name}
        {explored && <span className="explored-badge">Explored</span>}
      </h3>
      {canReview ? (
        <button type="button" onClick={() => onReview(location)}>
          {explored ? 'Leave another review' : 'Leave a review'} (+{XP_PER_REVIEW} XP)
        </button>
      ) : (
        <p className="location-card-hint">Walk your character to this building to unlock reviews here.</p>
      )}
    </div>
  )
}
