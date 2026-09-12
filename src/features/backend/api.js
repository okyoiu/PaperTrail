import { supabase } from '../../lib/supabaseClient'
import { XP_PER_REVIEW } from '../game/xp'

// Proxied through /api/places.js so the Google API key stays server-side.
export async function fetchNearbyPlaces(lat, lng) {
  const res = await fetch(`/api/places?lat=${lat}&lng=${lng}`)
  if (!res.ok) throw new Error('Failed to fetch nearby places')
  return res.json()
}

export async function getProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return data
}

export async function getUnlockedLocations(userId) {
  const { data, error } = await supabase
    .from('unlocks')
    .select('location_id, locations(*)')
    .eq('user_id', userId)
  if (error) throw error
  return data.map((row) => row.locations)
}

export async function submitReview({ userId, locationId, body, photoFile }) {
  let photoUrl = null

  if (photoFile) {
    const path = `${userId}/${locationId}/${Date.now()}-${photoFile.name}`
    const { error: uploadError } = await supabase.storage.from('review-photos').upload(path, photoFile)
    if (uploadError) throw uploadError
    photoUrl = supabase.storage.from('review-photos').getPublicUrl(path).data.publicUrl
  }

  const { error: reviewError } = await supabase.from('reviews').insert({
    user_id: userId,
    location_id: locationId,
    body,
    photo_url: photoUrl,
    xp_awarded: XP_PER_REVIEW,
  })
  if (reviewError) throw reviewError

  const { error: rpcError } = await supabase.rpc('increment_xp', {
    p_user_id: userId,
    p_amount: XP_PER_REVIEW,
  })
  if (rpcError) throw rpcError

  const { error: unlockError } = await supabase
    .from('unlocks')
    .upsert({ user_id: userId, location_id: locationId })
  if (unlockError) throw unlockError
}
