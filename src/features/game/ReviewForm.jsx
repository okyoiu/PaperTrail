import { useState } from 'react'
import CameraCapture from '../mobile/CameraCapture'
import { submitReview } from '../backend/api'
import { XP_PER_REVIEW } from './xp'

// location: { id: placeId, name, lat, lng } - a Google place or an
// `osm:<id>` building (see MapView's onSelectLocation).
export default function ReviewForm({ userId, location, onDone, onCancel }) {
  const [body, setBody] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const place = { placeId: location.id, name: location.name, lat: location.lat, lng: location.lng }
      const result = await submitReview({ userId, place, body, photoFile })
      onDone(result)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <h3>Review {location.name}</h3>
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
