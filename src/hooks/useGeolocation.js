import { useEffect, useRef, useState } from 'react'
// gets the raw GPS position 
// Watches the browser's location and reports { lat, lng, accuracy, speed,
// heading, timestamp }. speed (m/s) and heading (degrees from north) are null
// when the device doesn't provide them; heading is also NaN while standing still.
export function useGeolocation() {
  const [position, setPosition] = useState(null)
  const [error, setError] = useState(null)
  const watchIdRef = useRef(null)

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by this browser.')
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          timestamp: pos.timestamp,
        })
        setError(null)
      },
      (err) => setError(err.message),
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 20000,
      },
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  return { position, error }
}
