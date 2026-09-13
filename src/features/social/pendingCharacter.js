// The explorer picked on the sign-in screen (see SignIn.jsx), held in
// localStorage while the player is off reading their email. Once the magic
// link or code brings them back signed in, AuthProvider (hooks/useAuth.js)
// hands it to api.ensureProfile, which writes it to their profile, then clears
// it. Only set when the player actually taps a character, so a returning
// player who doesn't keeps whatever explorer their profile already has.
const STORAGE_KEY = 'pendingCharacterId'

export function setPendingCharacterId(characterId) {
  try {
    localStorage.setItem(STORAGE_KEY, characterId)
  } catch {
    // Storage blocked (private mode): the pick just won't survive the round trip.
  }
}

export function getPendingCharacterId() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function clearPendingCharacterId() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}
