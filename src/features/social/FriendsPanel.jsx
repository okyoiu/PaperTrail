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

// Add/accept friends. A friend only shows up on the map once they're in
// the "friends" list below (i.e. an accepted friend_requests row exists).
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
      setUsername('')
      setMessage(`Friend request sent to ${username}.`)
    } catch (err) {
      setMessage(err.message)
    }
  }

  async function handleRespond(requestId, accept) {
    await respondToFriendRequest(requestId, accept)
    refresh()
  }

  return (
    <section className="friends">
      <h2>Friends</h2>

      {profile && hasChosenUsername(profile) && (
        <p className="friends-you">
          <CharacterFigure characterId={profile.character_id} crop />
          <span>
            Friends can add you as <strong>{profile.username}</strong>
          </span>
        </p>
      )}
      {profile && !hasChosenUsername(profile) && (
        <p className="friends-you">
          <span>
            <Link to="/login">Pick a username</Link> so friends can find you.
          </span>
        </p>
      )}

      <form onSubmit={handleAdd}>
        <input
          type="text"
          placeholder="Add friend by username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <button type="submit">Add</button>
      </form>
      {message && <p>{message}</p>}

      {incoming.length > 0 && (
        <div>
          <h3>Requests</h3>
          <ul>
            {incoming.map((req) => (
              <li key={req.id}>
                <CharacterFigure characterId={req.requester.character_id} crop />
                <span className="friends-name">{req.requester.username}</span>
                <button type="button" onClick={() => handleRespond(req.id, true)}>
                  Accept
                </button>
                <button type="button" onClick={() => handleRespond(req.id, false)}>
                  Decline
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h3>Your friends ({friends.length})</h3>
      <ul>
        {friends.map((f) => (
          <li key={f.id}>
            <CharacterFigure characterId={f.character_id} crop />
            <span className="friends-name">{f.username}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
