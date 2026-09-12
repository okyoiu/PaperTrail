import { useEffect, useState } from 'react'
import {
  getFriends,
  getIncomingFriendRequests,
  respondToFriendRequest,
  sendFriendRequest,
} from '../backend/api'

// Add/accept friends. A friend only shows up on the map once they're in
// the "friends" list below (i.e. an accepted friend_requests row exists).
export function FriendsPanel({ userId }) {
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

      <form onSubmit={handleAdd}>
        <input
          type="text"
          placeholder="Add friend by username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
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
                {req.requester.username}
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
          <li key={f.id}>{f.username}</li>
        ))}
      </ul>
    </section>
  )
}
