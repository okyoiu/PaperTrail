// Building footprints for the fog-of-war layer, pulled live from OpenStreetMap
// via the Overpass API. No API key, no pre-extraction step — good enough for
// a demo; swap for a pre-baked public/data/buildings.geojson (osmium-tool)
// if Overpass is too slow/rate-limited for a real deployment.

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

const BUILDINGS_SOURCE_ID = 'campus-buildings'
const BUILDINGS_LAYER_ID = 'campus-buildings-extrusion'

// Just the initial map center before a real or debug position is known.
// Building loading itself isn't tied to any fixed area or bounding box - it
// follows the player's current position wherever that is (see
// fetchBuildingsNear), so this works anywhere, not only near Rice.
export const DEFAULT_CENTER = { lat: 29.7174, lng: -95.4018 }

// OSM height data is inconsistent - prefer an explicit height tag, fall back
// to levels * ~3m/story, then a rough guess by building type. Without this,
// every building extrudes to the same flat height and reads as a generic box
// instead of its real footprint at its real size.
const DEFAULT_HEIGHT_BY_TYPE = {
  university: 13,
  college: 13,
  dormitory: 13,
  hospital: 16,
  office: 11,
  house: 7,
  detached: 7,
  residential: 8,
  retail: 6,
  commercial: 7,
  pavilion: 5,
  tower: 20,
  garage: 3,
  garages: 3,
  parking: 4,
  greenhouse: 4,
}

function estimateHeight(tags = {}) {
  const height = parseFloat(tags.height)
  if (!Number.isNaN(height)) return height

  const levels = parseFloat(tags['building:levels'])
  if (!Number.isNaN(levels)) return levels * 3.2

  return DEFAULT_HEIGHT_BY_TYPE[tags.building] ?? 9
}

// Centroid of a building's outer ring - good enough for "am I near this
// building" at building scale, not a true polygon centroid.
function ringCentroid(coords) {
  const ring = coords[0]
  const sum = ring.reduce((acc, [lng, lat]) => ({ lng: acc.lng + lng, lat: acc.lat + lat }), {
    lng: 0,
    lat: 0,
  })
  return { lat: sum.lat / ring.length, lng: sum.lng / ring.length }
}

// A bounding box around a point, sized in meters rather than degrees so the
// caller doesn't have to think about latitude distortion.
function boundsAroundPoint({ lat, lng }, radiusMeters) {
  const latDelta = radiusMeters / 111320
  const lngDelta = radiusMeters / (111320 * Math.cos((lat * Math.PI) / 180))
  return { south: lat - latDelta, north: lat + latDelta, west: lng - lngDelta, east: lng + lngDelta }
}

// Fetches only the buildings near one point, not a whole region - a 50-mile
// radius query would return millions of features and time out Overpass (and
// the browser). Instead this gets called again each time the player moves
// far enough, so in practice they can walk anywhere without a hard limit.
async function queryOverpass(query) {
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })
  if (!res.ok) throw new Error(`Overpass request failed: ${res.status}`)
  return res.json()
}

export async function fetchBuildingsNear(center, radiusMeters) {
  const bbox = boundsAroundPoint(center, radiusMeters)
  const query = `[out:json][timeout:25];way["building"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});out geom;`

  // The public Overpass instance is sometimes overloaded (504s under load) -
  // one retry after a short delay meaningfully improves reliability during a
  // live demo without hammering it.
  let data
  try {
    data = await queryOverpass(query)
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    data = await queryOverpass(query)
  }

  const features = data.elements
    .filter((el) => el.type === 'way' && el.geometry?.length > 2)
    .map((way) => {
      const coordinates = [way.geometry.map((pt) => [pt.lon, pt.lat])]
      return {
        type: 'Feature',
        id: way.id,
        geometry: { type: 'Polygon', coordinates },
        properties: {
          name: way.tags?.name ?? 'Unnamed building',
          centroid: ringCentroid(coordinates),
          render_height: estimateHeight(way.tags),
        },
      }
    })

  return { type: 'FeatureCollection', features }
}

// The classic osmbuildings.org look isn't really about wall color - it's a
// single fixed directional light, so each wall shades differently depending
// on which way it faces (instead of every face reading as the same flat
// color). MapLibre's `light` is a real light source, not a paint property,
// so it applies map-wide rather than per-layer.
function configureOsmBuildingsLight(map) {
  map.setLight({
    anchor: 'map',
    color: '#fff6e6',
    intensity: 0.55,
    position: [1.5, 210, 42], // [radial, azimuthal (deg from north), polar (deg from zenith)]
  })
}

// Adds the buildings source + a fill-extrusion layer whose height/color read
// from each feature's `unlocked` feature-state - locked buildings render as
// flat dark silhouettes (the "fog"), unlocked ones pop up in 3D. Starts empty;
// see mergeBuildingsIntoSource for how features get added as the player moves.
export function addBuildingsLayer(map) {
  configureOsmBuildingsLight(map)
  map.addSource(BUILDINGS_SOURCE_ID, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })

  map.addLayer({
    id: BUILDINGS_LAYER_ID,
    type: 'fill-extrusion',
    source: BUILDINGS_SOURCE_ID,
    paint: {
      'fill-extrusion-color': [
        'case',
        ['boolean', ['feature-state', 'unlocked'], false],
        '#d9cfb8',
        '#1b262c',
      ],
      'fill-extrusion-height': [
        'case',
        ['boolean', ['feature-state', 'unlocked'], false],
        ['coalesce', ['get', 'render_height'], 9],
        2,
      ],
      // fill-extrusion-opacity doesn't support data/feature-state expressions
      // (MapLibre paint property limitation) - locked vs. unlocked is already
      // conveyed by color and height above, so a constant opacity is fine.
      'fill-extrusion-opacity': 0.9,
      'fill-extrusion-vertical-gradient': true,
    },
  })

  return BUILDINGS_LAYER_ID
}

export function setBuildingUnlocked(map, featureId, unlocked = true) {
  map.setFeatureState({ source: BUILDINGS_SOURCE_ID, id: featureId }, { unlocked })
}

// Adds newly-fetched buildings to the source without dropping ones fetched
// earlier (e.g. buildings back near where the player started) - `byId` is
// the running set of every feature seen so far, keyed by OSM way id.
export function mergeBuildingsIntoSource(map, byId, newGeojson) {
  for (const feature of newGeojson.features) {
    if (!byId.has(feature.id)) byId.set(feature.id, feature)
  }
  map.getSource(BUILDINGS_SOURCE_ID).setData({ type: 'FeatureCollection', features: [...byId.values()] })
}
