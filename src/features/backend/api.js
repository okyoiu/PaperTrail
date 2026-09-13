import { supabase } from '../../services/supabaseClient'
import { REVIEW_XP_AWARD } from '../game/xp'

const REVIEW_PHOTOS_BUCKET = 'review-photos'

// --- Auth -------------------------------------------------------------

// Fastest sign-in path for a demo: one email with a magic link and a 6-digit
// code, no password. The link returns to this origin if it's in Supabase
// Auth's Redirect URLs allowlist, otherwise Supabase falls back to the
// project's Site URL. The code (see verifyEmailCode) is what makes signing
// in from the installed PWA work: a tapped link opens in the browser, not the
// home-screen app, so the session would land in the wrong place.
export async function signInWithEmail(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  })
  if (error) throw error
}

// The 6-digit code from the sign-in email. Supabase only includes it when the
// Magic Link email template contains {{ .Token }} (see supabase/README.md).
export async function verifyEmailCode(email, code) {
  const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' })
  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null)
  })
  return () => data.subscription.unsubscribe()
}

// --- Profiles -----------------------------------------------------------

// Call this right after sign-in: creates the profiles row the first time a
// given auth user is seen. Safe to call on every sign-in (no-op afterwards).
// The username starts out null - profiles are readable by every player, so
// the email must never be used as a placeholder there. characterId is the
// explorer picked on the sign-in screen, if any: it's what a brand-new profile
// starts as, and it overrides the saved one for a returning player who picked
// again (see social/pendingCharacter.js).
//
// Select-then-write rather than upsert on purpose: an upsert always takes the
// INSERT path under RLS, so an existing player would need the profiles INSERT
// policy just to sign in - and if that policy has drifted on the database (a
// real failure mode, see supabase/README.md), their profile would fail to load
// even though the row is right there. Reading first means returning players
// only ever UPDATE, and just new players INSERT.
export async function ensureProfile(user, { characterId = null } = {}) {
  const existing = await getProfile(user.id)
  if (existing) {
    if (characterId && existing.character_id !== characterId) {
      return updateProfile(user.id, { character_id: characterId })
    }
    return existing
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: user.id, character_id: characterId })
    .select()
    .single()
  if (error) throw error
  return data
}

// Returns null when no such profile exists (a not-yet-created one), rather
// than throwing, so ensureProfile can tell "missing" from a real error.
export async function getProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

// Profiles created before usernames started out null hold the email as a
// placeholder; a chosen one can't contain "@" (see social/ProfileSetup.jsx).
export function hasChosenUsername(profile) {
  return Boolean(profile?.username) && !profile.username.includes('@')
}

// What other players see this profile called. Never the email placeholder.
export function displayName(profile) {
  return hasChosenUsername(profile) ? profile.username : 'Explorer'
}

// fields: any of { username, character_id, location_visibility }. Returns the
// updated profile.
export async function updateProfile(userId, fields) {
  const { data, error } = await supabase.from('profiles').update(fields).eq('id', userId).select().single()
  // 23505 = unique_violation (profiles.username is unique).
  if (error?.code === '23505') throw new Error(`"${fields.username}" is already taken - try another.`)
  if (error) throw error
  return data
}

// --- Locations ------------------------------------------------------------

// Reviews/unlocks reference locations.id, but the frontend only knows either
// a Google place (see src/services/googlePlaces.js) or an OSM building
// (`osm:<way id>`, see features/map/buildingsLayer.js). Upsert-on-
// google_place_id keeps that mapping stable across repeated visits/reviews.
async function upsertLocation(place) {
  const { data, error } = await supabase
    .from('locations')
    .upsert(
      {
        google_place_id: place.placeId,
        name: place.name ?? place.address ?? 'Unknown place',
        lat: place.lat,
        lng: place.lng,
      },
      { onConflict: 'google_place_id' },
    )
    .select()
    .single()
  if (error) throw error
  return data
}

// --- Reviews / XP -----------------------------------------------------------

async function uploadReviewPhoto(userId, photoFile) {
  // Not reusing the file name: Storage rejects keys with non-ASCII characters
  // (e.g. the narrow space in macOS screenshot names).
  const extension = /\.([a-z0-9]{1,5})$/i.exec(photoFile.name ?? '')?.[1]?.toLowerCase() ?? 'jpg'
  const path = `${userId}/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage
    .from(REVIEW_PHOTOS_BUCKET)
    .upload(path, photoFile, { contentType: photoFile.type || undefined })
  if (error) throw new Error(`Photo upload failed: ${error.message}`)

  const { data } = supabase.storage.from(REVIEW_PHOTOS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

// place: the location the user is standing at/reviewing ({ placeId, name,
// address, lat, lng } - a Google place, an `osm:<id>` building, or a
// `pin:<lat>,<lng>` spot). rating is 1-5 stars. photoFile is optional (a
// File/Blob from CameraCapture).
export async function submitReview({ userId, place, rating, body, photoFile }) {
  const location = await upsertLocation(place)
  const photoUrl = photoFile ? await uploadReviewPhoto(userId, photoFile) : null

  const { data: review, error } = await supabase
    .from('reviews')
    .insert({
      user_id: userId,
      location_id: location.id,
      rating,
      body,
      photo_url: photoUrl,
      xp_awarded: REVIEW_XP_AWARD,
    })
    .select('*, locations(id, google_place_id, name, lat, lng)')
    .single()
  if (error) throw error

  const { error: xpError } = await supabase.rpc('increment_xp', {
    p_user_id: userId,
    p_amount: REVIEW_XP_AWARD,
  })
  if (xpError) throw xpError

  const profile = await getProfile(userId)
  return { review, profile }
}

// Newest first, each with the place it was left at (for the map's book icons
// and, via google_place_id, the explored color on `osm:<id>` buildings).
export async function getMyReviews(userId) {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, rating, body, photo_url, created_at, locations(id, google_place_id, name, lat, lng)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// --- Unlocks (fog of war) ---------------------------------------------------

export async function unlockLocation(userId, place) {
  const location = await upsertLocation(place)
  const { error } = await supabase
    .from('unlocks')
    .upsert(
      { user_id: userId, location_id: location.id },
      { onConflict: 'user_id,location_id', ignoreDuplicates: true },
    )
  if (error) throw error
  return location
}

// Every place this player has walked up to, with explored_at set on the ones
// they've also reviewed (kept in sync by a trigger on reviews, see
// supabase/schema.sql). Falls back to just the unlocks when the explored_at
// column isn't there yet (schema.sql not re-run): the map still colors
// reviewed buildings from the reviews list, so this stays a soft dependency.
export async function getUnlockedLocations(userId) {
  const { data, error } = await supabase
    .from('unlocks')
    .select('unlocked_at, explored_at, locations(*)')
    .eq('user_id', userId)
  // 42703 = undefined_column (explored_at, before the migration is applied).
  if (error?.code === '42703') {
    const fallback = await supabase.from('unlocks').select('unlocked_at, locations(*)').eq('user_id', userId)
    if (fallback.error) throw fallback.error
    return fallback.data.map((row) => ({ ...row, explored_at: null }))
  }
  if (error) throw error
  return data
}

// --- Friends ----------------------------------------------------------

export async function sendFriendRequest(requesterId, addresseeUsername) {
  const { data: addressee, error: lookupError } = await supabase
    .from('profiles')
    .select('id')
    // Chosen usernames are stored lowercase (see social/ProfileSetup.jsx).
    .eq('username', addresseeUsername.trim().toLowerCase())
    .single()
  if (lookupError) throw new Error(`No user found with username "${addresseeUsername}"`)

  const { error } = await supabase
    .from('friend_requests')
    .insert({ requester_id: requesterId, addressee_id: addressee.id })
  if (error) throw error
}

export async function getIncomingFriendRequests(userId) {
  const { data, error } = await supabase
    .from('friend_requests')
    .select('id, created_at, requester:profiles!friend_requests_requester_id_fkey(id, username, character_id)')
    .eq('addressee_id', userId)
    .eq('status', 'pending')
  if (error) throw error
  return data
}

export async function respondToFriendRequest(requestId, accept) {
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: accept ? 'accepted' : 'declined' })
    .eq('id', requestId)
  if (error) throw error
}

// Accepted friends, as a flat list of the *other* person's profile.
export async function getFriends(userId) {
  const { data, error } = await supabase
    .from('friend_requests')
    .select(
      `requester:profiles!friend_requests_requester_id_fkey(id, username, character_id),
       addressee:profiles!friend_requests_addressee_id_fkey(id, username, character_id)`,
    )
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
  if (error) throw error

  return data.map((row) => (row.requester.id === userId ? row.addressee : row.requester))
}

// --- Live location (other players on the map) -------------------------

export async function updateMyLocation(userId, lat, lng) {
  const { error } = await supabase
    .from('live_locations')
    .upsert({ user_id: userId, lat, lng, updated_at: new Date().toISOString() })
  if (error) throw error
}

// Every player position the current user may see, updated since `since` (a
// Date). RLS on live_locations decides visibility - own row, players whose
// profile is set to "everyone", and accepted friends - so there's no need to
// join through getFriends() first.
export async function getActivePlayerLocations(since) {
  const { data, error } = await supabase
    .from('live_locations')
    .select('user_id, lat, lng, updated_at, profiles(username, character_id)')
    .gte('updated_at', since.toISOString())
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data
}

// Live updates as players move, on top of polling getActivePlayerLocations()
// (Realtime has to be enabled for the table; polling covers it when it isn't).
// RLS still applies per-connection, so this only ever fires for rows the
// current user is allowed to see.
export function subscribeToPlayerLocations(callback) {
  const channel = supabase
    .channel('live-locations')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'live_locations' }, callback)
    .subscribe()
  return () => supabase.removeChannel(channel)
}
