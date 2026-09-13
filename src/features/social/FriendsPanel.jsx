import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getFriends,
  getIncomingFriendRequests,
  hasChosenUsername,
  respondToFriendRequest,
  sendFriendRequest,
} from '../backend/api'
import { CharacterFigure } from './CharacterFigure'

// Add/accept friends. A friend only shows up on the map once they're in the
// list below (an accepted friend_requests row). Styled as a cozy set of cards
// (see .friends in index.css) so it matches the rest of the app.
export function FriendsPanel({ userId, profile }) {
  const [username, setUsername] = useState('')
  const [friends, setFriends] = useState([])
  const [incoming, setIncoming] = useState([])
  const [message, setMessage] = useState(null)

  async function refresh() {
    setFriends(await getFriends(userId))
    setIncoming(await getIncomingFriendRequests(userId))
  }

  useEffect(() => {
    refresh()
  }, [userId])

  async function handleAdd(e) {
    e.preventDefault()
    setMessage(null)
    try {
      await sendFriendRequest(userId, username)
      setMessage({ ok: true, text: `Request sent to @${username.trim().toLowerCase()}.` })
      setUsername('')
    } catch (err) {
      setMessage({ ok: false, text: err.message })
    }
  }

  async function handleRespond(requestId, accept) {
    await respondToFriendRequest(requestId, accept)
    refresh()
  }

  const named = profile && hasChosenUsername(profile)

  return (
    <section className="friends">
      <h2>Friends</h2>

      {named ? (
        <div className="friend-tag">
          <span className="friend-tag-avatar">
            <CharacterFigure characterId={profile.character_id} crop />
          </span>
          <span className="friend-tag-body">
            <span className="friend-tag-label">Your explorer tag</span>
            <strong className="friend-tag-name">@{profile.username}</strong>
          </span>
          <span className="friend-tag-hole" aria-hidden="true" />
        </div>
      ) : (
        <div className="cozy-note">
          <Link to="/login">Pick a username</Link> so friends can find you and see you on the map.
        </div>
      )}

      <form className="add-friend" onSubmit={handleAdd}>
        <label className="field-label" htmlFor="add-friend-input">
          Add a friend
        </label>
        <div className="field-with-button">
          <span className="field-icon" aria-hidden="true">@</span>
          <input
            id="add-friend-input"
            type="text"
            placeholder="their username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <button type="submit" className="btn btn-pin" disabled={!username.trim()}>
            Add
          </button>
        </div>
        {message && (
          <p className={message.ok ? 'field-note field-note--ok' : 'field-note field-note--err'}>
            {message.text}
          </p>
        )}
      </form>

      {incoming.length > 0 && (
        <div className="friend-section">
          <h3 className="section-title">Requests</h3>
          <ul className="friend-list">
            {incoming.map((req) => (
              <li key={req.id} className="friend-card friend-card--request">
                <span className="friend-card-avatar">
                  <CharacterFigure characterId={req.requester.character_id} crop />
                </span>
                <span className="friend-card-name">@{req.requester.username}</span>
                <span className="friend-card-actions">
                  <button type="button" className="btn btn-accept" onClick={() => handleRespond(req.id, true)}>
                    Accept
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => handleRespond(req.id, false)}>
                    Decline
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="friend-section">
        <h3 className="section-title">Your crew · {friends.length}</h3>
        {friends.length === 0 ? (
          <div className="friend-empty">
            <svg viewBox="0 0 64 64" className="friend-empty-art" aria-hidden="true">
              <circle cx="32" cy="32" r="30" fill="var(--paper-sunk)" />
              <path
                d="M32 16c-6 0-11 4.6-11 10.6 0 7.6 11 21 11 21s11-13.4 11-21C43 20.6 38 16 32 16Z"
                fill="var(--pin)"
                stroke="var(--pin-deep)"
                strokeWidth="2"
              />
              <circle cx="32" cy="26" r="4" fill="#fffdf6" />
            </svg>
            <p>No crew yet. Share your tag, and whoever you add shows up here and on the map.</p>
          </div>
        ) : (
          <ul className="friend-list">
            {friends.map((f) => (
              <li key={f.id} className="friend-card">
                <span className="friend-card-avatar">
                  <CharacterFigure characterId={f.character_id} crop />
                </span>
                <span className="friend-card-name">@{f.username}</span>
                <span className="friend-card-badge" title="You can see each other on the map">
                  on the map
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
