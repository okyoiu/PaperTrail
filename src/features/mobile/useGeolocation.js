import { useEffect, useState } from 'react'

export function useGeolocation() {
  const [position, setPosition] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setError(new Error('Geolocation is not supported on this device'))
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setError(err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  return { position, error }
}
