import { useState } from 'react'
import { signInWithEmail } from '../backend/api'

export function SignIn() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    await signInWithEmail(email)
    setSent(true)
  }

  if (sent) return <p>Check {email} for a magic link, then reopen this page.</p>

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <button type="submit">Sign in</button>
    </form>
  )
}
