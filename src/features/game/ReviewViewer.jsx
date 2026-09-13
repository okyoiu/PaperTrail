import { useEffect } from 'react'

// One review, full screen: the photo as large as it fits, with the place,
// stars, and note. Opened by tapping a review photo in a map book marker's
// popup or in Visit history. Close, a tap outside the photo, or Escape closes it.
// review: { title, rating, body, photoUrl }
export default function ReviewViewer({ review, onClose }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="review-viewer" role="dialog" aria-modal="true" aria-label={review.title} onClick={onClose}>
      <div className="review-viewer-content" onClick={(event) => event.stopPropagation()}>
        <div className="review-viewer-header">
          <strong>{review.title}</strong>
          <button type="button" className="review-viewer-close" onClick={onClose}>
            Close
          </button>
        </div>
        <img src={review.photoUrl} alt={`Review photo at ${review.title}`} />
        {review.rating ? (
          <div className="review-viewer-stars" aria-label={`${review.rating} out of 5 stars`}>
            {'★'.repeat(review.rating)}
            {'☆'.repeat(5 - review.rating)}
          </div>
        ) : null}
        {review.body && <p>{review.body}</p>}
      </div>
    </div>
  )
}
