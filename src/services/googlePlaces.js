const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
// turns coordinates into a place name
function assertApiKey() {
  if (!API_KEY) {
    throw new Error(
      'Missing VITE_GOOGLE_MAPS_API_KEY. Add it to a .env.local file at the project root.',
    )
  }
}

// Places API (New): find the closest named place/building to a coordinate.
async function findNearbyPlace(lat, lng, radiusMeters = 40) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.displayName,places.id,places.types,places.formattedAddress',
    },
    body: JSON.stringify({
      maxResultCount: 1,
      rankPreference: 'DISTANCE',
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: radiusMeters,
        },
      },
    }),
  })

  if (!res.ok) return null
  const data = await res.json()
  const place = data.places?.[0]
  if (!place) return null

  return {
    placeId: place.id,
    name: place.displayName?.text ?? null,
    address: place.formattedAddress ?? null,
    types: place.types ?? [],
  }
}

// Geocoding API: fall back to a street address when there's no named place nearby.
async function reverseGeocode(lat, lng) {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('latlng', `${lat},${lng}`)
  url.searchParams.set('key', API_KEY)

  const res = await fetch(url)
  const data = await res.json()
  const result = data.results?.[0]
  if (!result) return null

  return {
    placeId: result.place_id,
    name: null,
    address: result.formatted_address,
    types: result.types ?? [],
  }
}

// Resolves a coordinate to the best-guess place/building the user is at.
export async function resolvePlace(lat, lng) {
  assertApiKey()

  const nearby = await findNearbyPlace(lat, lng)
  if (nearby) return nearby

  return reverseGeocode(lat, lng)
}
