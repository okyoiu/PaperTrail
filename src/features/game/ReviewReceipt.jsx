import { useEffect, useState } from 'react'
import { characterSvg, getCharacter } from '../map/characters'

// A visit shown as a little printed receipt: where you went, when, what you
// got (the note), the rating, and a photo pinned on like a polaroid. Used to
// view your own and your friends' visits (see pages/MapPage.jsx, AlbumPage.jsx).
//
// review: { title, rating, body, photoUrl, date, author, characterId }
// Missing fields are simply skipped, so a bare { title, rating, body } still
// prints a clean receipt.
//
// onDelete, for the player's own reviews: adds a "Delete" button that asks
// first, then calls it. It deletes the review and closes the receipt, and
// throws if the delete fails.
export function ReviewReceipt({ review, onClose, onDelete }) {
  // 'idle', 'confirming' (asking "are you sure?") or 'deleting'.
  const [deleteStep, setDeleteStep] = useState('idle')
  const [deleteError, setDeleteError] = useState(null)

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const when = review.date ? new Date(review.date) : null
  const character = review.characterId ? getCharacter(review.characterId) : null

  function cancelDelete() {
    setDeleteStep('idle')
    setDeleteError(null)
  }

  async function confirmDelete() {
    setDeleteStep('deleting')
    setDeleteError(null)
    try {
      await onDelete()
    } catch (err) {
      setDeleteError(err.message)
      setDeleteStep('confirming')
    }
  }

  return (
    <div className="receipt-overlay" role="dialog" aria-modal="true" aria-label={`Visit receipt for ${review.title}`} onClick={onClose}>
      <div className="receipt" onClick={(event) => event.stopPropagation()}>
        <div className="receipt-punch" aria-hidden="true" />

        <div className="receipt-head">
          <div className="receipt-brand">RICEHACK&nbsp;QUEST</div>
          <div className="receipt-sub">· · ·  VISIT RECEIPT  · · ·</div>
        </div>

        <div className="receipt-rule" aria-hidden="true" />

        <div className="receipt-place">{review.title}</div>
        {when && (
          <div className="receipt-row">
            <span>{when.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <span>{when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
          </div>
        )}
        {review.author && (
          <div className="receipt-row">
            <span>EXPLORER</span>
            <span className="receipt-explorer">
              {character && (
                <span
                  className="receipt-explorer-figure"
                  style={{ '--avatar-accent': character.accent }}
                  dangerouslySetInnerHTML={{ __html: characterSvg(character) }}
                />
              )}
              {review.author}
            </span>
          </div>
        )}

        <div className="receipt-rule receipt-rule--dashed" aria-hidden="true" />

        {review.body && (
          <>
            <div className="receipt-label">WHAT I GOT</div>
            <p className="receipt-note">{review.body}</p>
          </>
        )}

        {review.rating ? (
          <div className="receipt-row receipt-rating">
            <span>RATING</span>
            <span className="receipt-stars" aria-label={`${review.rating} out of 5`}>
              {'★'.repeat(review.rating)}
              {'☆'.repeat(5 - review.rating)}
            </span>
          </div>
        ) : null}

        {review.photoUrl && (
          <div className="receipt-photo">
            <img src={review.photoUrl} alt={`Photo from ${review.title}`} />
          </div>
        )}

        <div className="receipt-rule receipt-rule--dashed" aria-hidden="true" />
        <div className="receipt-barcode" aria-hidden="true" />
        <div className="receipt-foot">THANK YOU FOR EXPLORING · +25 XP</div>

        {deleteStep === 'idle' ? (
          <div className="receipt-actions">
            {onDelete && (
              <button type="button" className="receipt-delete" onClick={() => setDeleteStep('confirming')}>
                Delete
              </button>
            )}
            <button type="button" className="receipt-close" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <div className="receipt-confirm" role="alertdialog" aria-label="Delete this review?">
            <p>Delete this review for good? Its photo goes too, and its XP comes off your total.</p>
            <div className="receipt-actions">
              <button type="button" className="receipt-close" onClick={cancelDelete} disabled={deleteStep === 'deleting'}>
                Keep it
              </button>
              <button
                type="button"
                className="receipt-delete receipt-delete--confirm"
                onClick={confirmDelete}
                disabled={deleteStep === 'deleting'}
              >
                {deleteStep === 'deleting' ? 'Deleting…' : 'Delete'}
              </button>
            </div>
            {deleteError && <p className="receipt-confirm-error">{deleteError}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
