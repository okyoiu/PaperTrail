import { useState } from 'react'
import MapView from './features/map/MapView'
import FogOfWar from './features/map/FogOfWar'
import InstallPrompt from './features/mobile/InstallPrompt'
import { useGeolocation } from './features/mobile/useGeolocation'
import LocationCard from './features/game/LocationCard'
import { levelForXp } from './features/game/xp'

// This file just wires the three roles' pieces together — grow logic inside
// features/map, features/mobile, and features/game+backend instead of here.
export default function App() {
  const [map, setMap] = useState(null)
  const { position, error: geoError } = useGeolocation()
  const [xp] = useState(0) // TODO(backend): replace with profile.xp from getProfile(userId)
  const [unlockedLocations] = useState([]) // TODO(backend): replace with getUnlockedLocations(userId)
  const [selectedLocation, setSelectedLocation] = useState(null)

  const gpsStatus = geoError ? 'error' : position ? 'ok' : 'waiting'

  return (
    <div className="app-shell">
      <MapView onMapReady={setMap} />
      <FogOfWar map={map} unlockedPoints={unlockedLocations} playerPosition={position} />

      <header className="hud">
        <div className="xp-badge">
          <span className={`gps-dot gps-dot--${gpsStatus}`} aria-hidden="true" />
          Lv. {levelForXp(xp)} · {xp} XP
        </div>
        <InstallPrompt />
      </header>

      {selectedLocation && (
        <LocationCard
          location={selectedLocation}
          onReview={() => {
            // TODO(backend): open a review form and call submitReview()
          }}
        />
      )}
    </div>
  )
}
