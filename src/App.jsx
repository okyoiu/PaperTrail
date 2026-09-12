import { useState } from 'react'
import MapView from './features/map/MapView'
import FogOfWar from './features/map/FogOfWar'
import InstallPrompt from './features/mobile/InstallPrompt'
import CameraCapture from './features/mobile/CameraCapture'
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
  const [testPhoto, setTestPhoto] = useState(null) // TEMP(mobile): remove with the CameraCapture test block below

  return (
    <div className="app-shell">
      <MapView onMapReady={setMap} />
      <FogOfWar map={map} unlockedPoints={unlockedLocations} playerPosition={position} />

      <header className="hud">
        <div className="xp-badge">
          Lv. {levelForXp(xp)} · {xp} XP
        </div>
        <InstallPrompt />
      </header>

      {/* TEMP(mobile): remove once fog-of-war visibly reflects position instead */}
      <div className="geo-debug">
        {geoError && `Geolocation error: ${geoError.message}`}
        {!geoError && !position && 'Waiting for GPS fix…'}
        {!geoError && position && `lat ${position.lat.toFixed(5)}, lng ${position.lng.toFixed(5)}`}
      </div>

      {/* TEMP(mobile): isolated test of CameraCapture — remove once the real review form uses it */}
      <div className="camera-debug">
        <CameraCapture onCapture={(file) => setTestPhoto(URL.createObjectURL(file))} />
        {testPhoto && <img src={testPhoto} alt="capture test" className="camera-debug-preview" />}
      </div>

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
