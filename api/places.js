// Vercel serverless function — keeps GOOGLE_PLACES_API_KEY off the client.
export default async function handler(req, res) {
  const { lat, lng, radius = 500 } = req.query

  if (!lat || !lng) {
    res.status(400).json({ error: 'lat and lng query params are required' })
    return
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&key=${apiKey}`

  const response = await fetch(url)
  const data = await response.json()

  res.status(response.status).json(data)
}
