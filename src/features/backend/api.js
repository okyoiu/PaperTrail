import { supabase } from '../../services/supabaseClient'
import { REVIEW_XP_AWARD } from '../game/xp'

const REVIEW_PHOTOS_BUCKET = 'review-photos'

// --- Auth -------------------------------------------------------------

// Fastest sign-in path for a demo: email magic link, no password.
export async function signInWithEmail(email) {
  const { error } = await supabase.auth.signInWithOtp({ email })
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
export async function ensureProfile(user) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, username: user.email }, { onConflict: 'id', ignoreDuplicates: true })
  if (error) throw error

  return getProfile(user.id)
}

export async function getProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return data
}

// --- Locations ------------------------------------------------------------

// Reviews/unlocks reference locations.id, but the frontend only knows a
// Google place (see src/services/googlePlaces.js). Upsert-on-google_place_id
// keeps that mapping stable across repeated visits to the same place.
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
  const path = `${userId}/${crypto.randomUUID()}-${photoFile.name}`
  const { error } = await supabase.storage.from(REVIEW_PHOTOS_BUCKET).upload(path, photoFile)
  if (error) throw error

  const { data } = supabase.storage.from(REVIEW_PHOTOS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

// place: the resolved Google place ({ placeId, name, address, lat, lng }) the
// user is standing at. photoFile is optional (a File/Blob from CameraCapture).
export async function submitReview({ userId, place, body, photoFile }) {
  const location = await upsertLocation(place)
  const photoUrl = photoFile ? await uploadReviewPhoto(userId, photoFile) : null

  const { data: review, error } = await supabase
    .from('reviews')
    .insert({
      user_id: userId,
      location_id: location.id,
      body,
      photo_url: photoUrl,
      xp_awarded: REVIEW_XP_AWARD,
    })
    .select()
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

export async function getUnlockedLocations(userId) {
  const { data, error } = await supabase
    .from('unlocks')
    .select('unlocked_at, locations(*)')
    .eq('user_id', userId)
  if (error) throw error
  return data
}

// --- Friends ----------------------------------------------------------

export async function sendFriendRequest(requesterId, addresseeUsername) {
  const { data: addressee, error: lookupError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', addresseeUsername)
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
    .select('id, created_at, requester:profiles!friend_requests_requester_id_fkey(id, username)')
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
      `requester:profiles!friend_requests_requester_id_fkey(id, username),
       addressee:profiles!friend_requests_addressee_id_fkey(id, username)`,
    )
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
  if (error) throw error

  return data.map((row) => (row.requester.id === userId ? row.addressee : row.requester))
}

// --- Live location (Life360-style friends map) ------------------------

export async function updateMyLocation(userId, lat, lng) {
  const { error } = await supabase
    .from('live_locations')
    .upsert({ user_id: userId, lat, lng, updated_at: new Date().toISOString() })
  if (error) throw error
}

// RLS on live_locations already restricts rows to "me + accepted friends" —
// no need to join through getFriends() first.
export async function getVisibleLocations() {
  const { data, error } = await supabase
    .from('live_locations')
    .select('user_id, lat, lng, updated_at, profiles(username)')
  if (error) throw error
  return data
}

// Live updates as friends move, instead of polling getVisibleLocations().
// RLS still applies per-connection, so this only ever fires for rows the
// current user is allowed to see.
export function subscribeToVisibleLocations(callback) {
  const channel = supabase
    .channel('live-locations')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'live_locations' }, callback)
    .subscribe()
  return () => supabase.removeChannel(channel)
}
