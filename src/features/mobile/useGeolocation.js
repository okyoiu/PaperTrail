import { useEffect, useState } from 'react'

export function useGeolocation() {
  const [position, setPosition] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    // checking to see if the geolocation is able to be called
    if (!navigator.geolocation) {
      setError(new Error('Geolocation is not supported on this device'))
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      // gets the altitude calls from API to display
      (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setError(err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    )


    return () => navigator.geolocation.clearWatch(watchId)
  }, []) // side note: this only runs once on-first run-use

  return { position, error }
}
