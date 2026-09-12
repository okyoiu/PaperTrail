import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) setError(error.message)
    else setSent(true)
  }

  if (sent) {
    return (
      <div className="sign-in">
        <h1>RiceHack Quest</h1>
        <p>Check {email} for a sign-in link.</p>
      </div>
    )
  }

  return (
    <form className="sign-in" onSubmit={handleSubmit}>
      <h1>RiceHack Quest</h1>
      <p>Sign in to start exploring.</p>
      <input
        type="email"
        placeholder="you@rice.edu"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <button type="submit">Send magic link</button>
      {error && <p className="sign-in-error">{error}</p>}
    </form>
  )
}
