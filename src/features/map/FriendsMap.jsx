import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const SELF_COLOR = '#2563eb'
const FRIEND_COLOR = '#16a34a'
const DEFAULT_CENTER = [29.7174, -95.4018] // Rice University, used until GPS locks on

function Recenter({ center }) {
  const map = useMap()
  map.setView(center)
  return null
}

// Renders one dot per person visible to the signed-in user: their own
// location plus any accepted friend's (see useFriendsMap / live_locations
// RLS) — friends who haven't accepted, or strangers, never appear here.
export function FriendsMap({ userId, myPosition, locations }) {
  const center = myPosition ? [myPosition.lat, myPosition.lng] : DEFAULT_CENTER

  return (
    <MapContainer center={center} zoom={16} style={{ height: '400px', width: '100%' }}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {myPosition && <Recenter center={center} />}
      {locations.map((loc) => (
        <CircleMarker
          key={loc.user_id}
          center={[loc.lat, loc.lng]}
          radius={9}
          pathOptions={{
            color: loc.user_id === userId ? SELF_COLOR : FRIEND_COLOR,
            fillColor: loc.user_id === userId ? SELF_COLOR : FRIEND_COLOR,
            fillOpacity: 0.9,
          }}
        >
          <Popup>
            {loc.user_id === userId ? 'You' : loc.profiles?.username ?? 'Friend'}
            <br />
            updated {new Date(loc.updated_at).toLocaleTimeString()}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
