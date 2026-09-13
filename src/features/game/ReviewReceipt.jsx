import { useEffect } from 'react'
import { characterSvg, getCharacter } from '../map/characters'

// A visit shown as a little printed receipt: where you went, when, what you
// got (the note), the rating, and a photo pinned on like a polaroid. Used to
// view your own and your friends' visits (see pages/MapPage.jsx, AlbumPage.jsx).
//
// review: { title, rating, body, photoUrl, date, author, characterId }
// Missing fields are simply skipped, so a bare { title, rating, body } still
// prints a clean receipt.
export function ReviewReceipt({ review, onClose }) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const when = review.date ? new Date(review.date) : null
  const character = review.characterId ? getCharacter(review.characterId) : null

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

        <button type="button" className="receipt-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
