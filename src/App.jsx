import { useEffect, useState } from 'react'
import MapView from './features/map/MapView'
import FogOfWar from './features/map/FogOfWar'
import InstallPrompt from './features/mobile/InstallPrompt'
import { useGeolocation } from './features/mobile/useGeolocation'
import LocationCard from './features/game/LocationCard'
import { levelForXp } from './features/game/xp'
import { useSession } from './features/auth/useSession'
import SignIn from './features/auth/SignIn'
import { supabase } from './lib/supabaseClient'
import { ensureProfile, getProfile, getUnlockedLocations } from './features/backend/api'

// This file just wires the three roles' pieces together — grow logic inside
// features/map, features/mobile, and features/game+backend instead of here.
export default function App() {
  const session = useSession()
  const [map, setMap] = useState(null)
  const { position } = useGeolocation()
  const [profile, setProfile] = useState(null)
  const [unlockedLocations, setUnlockedLocations] = useState([])
  const [selectedLocation, setSelectedLocation] = useState(null)

  useEffect(() => {
    if (!session) return
    ensureProfile(session.user.id)
      .then(() => getProfile(session.user.id))
      .then(setProfile)
    getUnlockedLocations(session.user.id).then(setUnlockedLocations)
  }, [session])

  if (session === undefined) return null
  if (!session) return <SignIn />

  const xp = profile?.xp ?? 0

  return (
    <div className="app-shell">
      <MapView onMapReady={setMap} />
      <FogOfWar map={map} unlockedPoints={unlockedLocations} playerPosition={position} />

      <header className="hud">
        <div className="xp-badge">
          Lv. {levelForXp(xp)} · {xp} XP
        </div>
        <div className="hud-actions">
          <InstallPrompt />
          <button className="sign-out-button" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
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
