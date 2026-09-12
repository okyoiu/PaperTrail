import { XP_PER_REVIEW } from './xp'

export default function LocationCard({ location, onReview, onClose }) {
  return (
    <div className="location-card">
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Close" style={{ float: 'right' }}>
          ✕
        </button>
      )}
      {location.photoUrl && <img src={location.photoUrl} alt={location.name} />}
      <h3>{location.name}</h3>
      <button onClick={() => onReview(location)}>Leave a review (+{XP_PER_REVIEW} XP)</button>
    </div>
  )
}
