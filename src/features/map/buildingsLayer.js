// Building footprints for the fog-of-war layer, pre-extracted from
// OpenStreetMap with osmium-tool into public/data/buildings.geojson (see
// public/data/README.md) — no live API calls, no rate limits, works offline
// once loaded.

const BUILDINGS_URL = '/data/buildings.geojson'
const BUILDINGS_SOURCE_ID = 'campus-buildings'
const BUILDINGS_LAYER_ID = 'campus-buildings-extrusion'

// Rice University, used as the initial map center.
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
// building" at building scale, not a true polygon centroid. Handles both
// Polygon and MultiPolygon (osmium-tool emits MultiPolygon for buildings
// with courtyards/holes) by using the first polygon's outer ring.
function ringCentroid(geometry) {
  const ring = geometry.type === 'MultiPolygon' ? geometry.coordinates[0][0] : geometry.coordinates[0]
  const sum = ring.reduce((acc, [lng, lat]) => ({ lng: acc.lng + lng, lat: acc.lat + lat }), {
    lng: 0,
    lat: 0,
  })
  return { lat: sum.lat / ring.length, lng: sum.lng / ring.length }
}

export const UNNAMED_BUILDING = 'Unnamed building'

// A building's color by how far the player has got with it. Also drawn as the
// legend in the map's Details sheet (see pages/MapPage.jsx).
export const BUILDING_COLORS = {
  locked: '#1b262c', // still in the fog: a flat dark silhouette
  unlocked: '#d9cfb8', // walked up to: the real building, in 3D
  explored: '#34d399', // reviewed: claimed in the explored color
}

// Buildings are stored in Supabase as locations with google_place_id
// `osm:<feature id>` (see backend/api.js upsertLocation); these convert both
// ways. The feature id is the building's index in buildings.geojson.
export function osmPlaceId(featureId) {
  return `osm:${featureId}`
}

export function osmIdFromPlaceId(placeId) {
  const match = /^osm:(\d+)$/.exec(placeId ?? '')
  return match ? Number(match[1]) : null
}

// Fetches the whole pre-baked building set once. Static data, so there's no
// per-move refetching the way a live Overpass query would need.
export async function fetchAllBuildings() {
  const res = await fetch(BUILDINGS_URL)
  if (!res.ok) throw new Error(`Failed to load ${BUILDINGS_URL}: ${res.status}`)
  const data = await res.json()

  const features = data.features.map((feature, index) => ({
    ...feature,
    id: index, // stable as long as the file's feature order doesn't change
    properties: {
      ...feature.properties,
      name: feature.properties?.name ?? UNNAMED_BUILDING,
      centroid: ringCentroid(feature.geometry),
      render_height: estimateHeight(feature.properties),
    },
  }))

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

const IS_UNLOCKED = ['boolean', ['feature-state', 'unlocked'], false]
const IS_EXPLORED = ['boolean', ['feature-state', 'explored'], false]

// Adds the buildings source + a fill-extrusion layer whose height/color read
// from each feature's `unlocked` and `explored` feature-state - locked
// buildings render as flat dark silhouettes (the "fog"), unlocked ones pop up
// in 3D, and explored (reviewed) ones take the explored color. Starts empty;
// see setAllBuildings for how the pre-baked features get loaded in.
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
        IS_EXPLORED,
        BUILDING_COLORS.explored,
        IS_UNLOCKED,
        BUILDING_COLORS.unlocked,
        BUILDING_COLORS.locked,
      ],
      // Locked campus buildings render at height 0 so the basemap's own neutral
      // 3D block shows for them (see gameStyle.js); a walked or reviewed one
      // rises to its real height, a touch above the basemap block so it wins
      // the shared footprint cleanly and reads as "lit up".
      'fill-extrusion-height': [
        'case',
        ['any', IS_UNLOCKED, IS_EXPLORED],
        ['+', ['coalesce', ['get', 'render_height'], 9], 1.5],
        0,
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

// Explored implies unlocked: a review can only be left where the character
// has walked, and the layer reads both states anyway.
export function setBuildingExplored(map, featureId, explored = true) {
  map.setFeatureState(
    { source: BUILDINGS_SOURCE_ID, id: featureId },
    explored ? { unlocked: true, explored: true } : { explored: false },
  )
}

export function setAllBuildings(map, geojson) {
  map.getSource(BUILDINGS_SOURCE_ID).setData(geojson)
}

export function getBuildingsLayerId() {
  return BUILDINGS_LAYER_ID
}
