import { useState } from 'react'
import { useGeolocation } from './useGeolocation'

// The player's position for the map and live-location sharing: a debug
// teleport/click-to-move when one is set, otherwise real device GPS - so
// everything can be tested without walking around.
export function useDebugPosition() {
  const { position: realPosition, error: geoError } = useGeolocation()
  const [debugPreset, setDebugPreset] = useState(null)
  const position = debugPreset ?? realPosition

  return { position, debugPreset, setDebugPosition: setDebugPreset, geoError }
}
