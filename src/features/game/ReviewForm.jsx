import { useState } from 'react'
import CameraCapture from '../mobile/CameraCapture'
import { submitReview } from '../backend/api'
import { XP_PER_REVIEW } from './xp'

function StarRating({ value, onChange }) {
  return (
    <div className="star-rating" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
          className={star <= value ? 'star star-filled' : 'star'}
          onClick={() => onChange(star)}
        >
          ★
        </button>
      ))}
    </div>
  )
}

// location: { id: placeId, name, lat, lng } - an `osm:<id>` building, a
// Google place, or a `pin:<lat>,<lng>` spot (see MapPage).
export default function ReviewForm({ userId, location, onDone, onCancel }) {
  const [rating, setRating] = useState(0)
  const [body, setBody] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    if (rating === 0) {
      setError('Pick a star rating first.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const place = { placeId: location.id, name: location.name, lat: location.lat, lng: location.lng }
      const result = await submitReview({ userId, place, rating, body, photoFile })
      onDone(result)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <h3>Check in: {location.name}</h3>
      <StarRating value={rating} onChange={setRating} />
      <textarea
        placeholder="What did you notice here?"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        required
      />
      <CameraCapture onCapture={setPhotoFile} />
      {photoFile && <p className="review-form-photo-name">{photoFile.name}</p>}
      <div className="review-form-actions">
        <button type="button" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Submitting…' : `Submit (+${XP_PER_REVIEW} XP)`}
        </button>
      </div>
      {error && <p className="review-form-error">{error}</p>}
    </form>
  )
}
