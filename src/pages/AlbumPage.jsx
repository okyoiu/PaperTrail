import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteReview, displayName, getMyReviews } from '../features/backend/api'
import { ReviewReceipt } from '../features/game/ReviewReceipt'
import { useAuth } from '../hooks/useAuth'
import { forgetSavedVisitReview } from '../hooks/useVisitTracker'
import { isSupabaseConfigured } from '../services/supabaseClient'

// A little photo album of your visits: every review photo you've taken, grouped
// by the place it was taken at (like the Photos view in Apple/Google Maps).
// Tap one to see the full visit as a receipt.
export function AlbumPage() {
  const { user, profile, setProfile } = useAuth()
  const userId = user?.id
  const [reviews, setReviews] = useState([])
  const [viewing, setViewing] = useState(null)

  useEffect(() => {
    if (!userId) return
    getMyReviews(userId)
      .then(setReviews)
      .catch((err) => console.error('Failed to load album:', err))
  }, [userId])

  // One section per place, newest photo first within each, most-recent place first.
  const places = useMemo(() => {
    const byPlace = new Map()
    for (const review of reviews) {
      if (!review.photo_url) continue
      const key = review.locations?.id ?? review.locations?.name ?? 'unknown'
      if (!byPlace.has(key)) byPlace.set(key, { name: review.locations?.name ?? 'Unknown place', photos: [] })
      byPlace.get(key).photos.push(review)
    }
    return [...byPlace.values()]
  }, [reviews])

  const photoCount = places.reduce((total, place) => total + place.photos.length, 0)

  if (!isSupabaseConfigured) {
    return (
      <section className="page">
        <h2>Album</h2>
        <p>Backend not configured yet — add VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY to .env.</p>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="page">
        <h2>Album</h2>
        <p>
          <Link to="/login">Sign in</Link> to keep a photo album of the places you visit.
        </p>
      </section>
    )
  }

  function openReceipt(review) {
    setViewing({
      id: review.id,
      title: review.locations?.name ?? 'Unknown place',
      rating: review.rating,
      body: review.body,
      photoUrl: review.photo_url,
      date: review.created_at,
      author: profile ? displayName(profile) : 'You',
      characterId: profile?.character_id,
    })
  }

  // From the receipt's "Delete": out of the album and Visit history, XP taken
  // back, receipt closed.
  async function deleteViewingReview() {
    const updatedProfile = await deleteReview(userId, viewing.id)
    forgetSavedVisitReview(viewing.id, viewing.photoUrl)
    setReviews((prev) => prev.filter((review) => review.id !== viewing.id))
    if (updatedProfile) setProfile(updatedProfile)
    setViewing(null)
  }

  return (
    <section className="page album-page">
      <div className="album-head">
        <h2>Your album</h2>
        <p className="album-count">
          {photoCount} photo{photoCount === 1 ? '' : 's'} · {places.length} place{places.length === 1 ? '' : 's'}
        </p>
      </div>

      {photoCount === 0 ? (
        <p className="album-empty">
          No photos yet. Snap one when you leave a review and it lands here, filed under the place you took it.
        </p>
      ) : (
        places.map((place) => (
          <div key={place.name} className="album-place">
            <h3 className="album-place-name">{place.name}</h3>
            <div className="album-grid">
              {place.photos.map((review) => (
                <button
                  key={review.id}
                  type="button"
                  className="album-tile"
                  onClick={() => openReceipt(review)}
                  aria-label={`Photo at ${place.name}`}
                >
                  <img src={review.photo_url} alt="" loading="lazy" />
                  <span className="album-tile-date">
                    {new Date(review.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      {viewing && (
        <ReviewReceipt review={viewing} onClose={() => setViewing(null)} onDelete={deleteViewingReview} />
      )}
    </section>
  )
}
