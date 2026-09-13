// Turns the stock OpenFreeMap "liberty" basemap into a soft, casual-game map
// (Pokemon Go / Life360 feel) and surfaces real places - restaurants, cafes,
// shops, sights - as color-coded badges, all at runtime after the style loads.
//
// It recolors known liberty layer ids (the OpenMapTiles schema is stable), so
// every call is guarded: a missing or renamed layer is skipped, never thrown,
// and the map still works if the basemap changes upstream.

// A warm, low-saturation palette: soft greens for land, aqua water, near-white
// roads. Muted enough that the player, other explorers, and place badges pop.
export const GAME_PALETTE = {
  land: '#e7efd8',
  green: '#bfe0a3',
  greenDeep: '#a6d488',
  water: '#a6dce8',
  residential: '#eef1e4',
  sand: '#f0e7c8',
  roadFill: '#ffffff',
  roadCasing: '#e3dcc4',
  roadMajor: '#fff3d4',
  roadMajorCasing: '#ecd9a6',
}

// Place categories -> badge color. `class` comes from the OpenMapTiles `poi`
// source-layer (restaurant, cafe, shop, museum, ...).
const POI_CATEGORIES = {
  food: {
    color: '#ff7a45',
    classes: ['restaurant', 'fast_food', 'cafe', 'bar', 'pub', 'food_court', 'ice_cream', 'bakery', 'biergarten'],
  },
  shop: {
    color: '#a855f7',
    classes: [
      'shop', 'grocery', 'supermarket', 'convenience', 'mall', 'department_store', 'clothing_store',
      'gift', 'marketplace', 'alcohol_shop', 'greengrocer', 'butcher', 'books', 'electronics',
      'furniture', 'hardware', 'jewelry', 'shoes', 'sports', 'toys', 'florist', 'beauty',
      'hairdresser', 'chemist', 'stationery', 'optician',
    ],
  },
  fun: {
    color: '#ec4899',
    classes: ['attraction', 'museum', 'art_gallery', 'gallery', 'zoo', 'aquarium', 'theatre', 'cinema', 'nightclub', 'theme_park', 'viewpoint', 'artwork', 'castle', 'monument'],
  },
  outdoors: {
    color: '#22a06b',
    classes: ['park', 'garden', 'playground', 'pitch', 'stadium', 'golf', 'swimming', 'picnic_site', 'dog_park'],
  },
  stay: {
    color: '#3b82f6',
    classes: ['lodging', 'hotel', 'hostel', 'motel', 'guest_house', 'campsite'],
  },
  service: {
    color: '#64748b',
    classes: ['bank', 'atm', 'pharmacy', 'hospital', 'doctors', 'clinic', 'post', 'police', 'fire_station', 'library', 'school', 'college', 'university', 'place_of_worship', 'fuel', 'parking', 'information'],
  },
}

// Legend for the map's Details sheet (see pages/MapPage.jsx).
export const POI_LEGEND = [
  { label: 'Food & drink', color: POI_CATEGORIES.food.color },
  { label: 'Shops', color: POI_CATEGORIES.shop.color },
  { label: 'Sights & fun', color: POI_CATEGORIES.fun.color },
  { label: 'Outdoors', color: POI_CATEGORIES.outdoors.color },
  { label: 'Stay', color: POI_CATEGORIES.stay.color },
]

const CURATED_CLASSES = Object.values(POI_CATEGORIES).flatMap((category) => category.classes)

// ['match', class, [food classes], color, [shop classes], color, ..., default]
const BADGE_COLOR = [
  'match',
  ['get', 'class'],
  ...Object.values(POI_CATEGORIES).flatMap((category) => [category.classes, category.color]),
  POI_CATEGORIES.service.color,
]

const BADGE_SOURCE = 'openmaptiles'
const BADGE_SOURCE_LAYER = 'poi'
export const POI_BADGE_LAYER_ID = 'poi-badges'

function setPaint(map, layerId, prop, value) {
  if (map.getLayer(layerId)) map.setPaintProperty(layerId, prop, value)
}

function setLayout(map, layerId, prop, value) {
  if (map.getLayer(layerId)) map.setLayoutProperty(layerId, prop, value)
}

// Recolor land, water, greenery, and roads to the game palette.
function recolorBasemap(map) {
  setPaint(map, 'background', 'background-color', GAME_PALETTE.land)
  for (const id of ['landuse_residential']) setPaint(map, id, 'fill-color', GAME_PALETTE.residential)
  for (const id of ['park', 'landcover_grass']) setPaint(map, id, 'fill-color', GAME_PALETTE.green)
  setPaint(map, 'landcover_wood', 'fill-color', GAME_PALETTE.greenDeep)
  setPaint(map, 'landcover_sand', 'fill-color', GAME_PALETTE.sand)
  setPaint(map, 'water', 'fill-color', GAME_PALETTE.water)

  for (const id of ['road_minor', 'road_service_track', 'road_link', 'road_path_pedestrian']) {
    setPaint(map, id, 'line-color', GAME_PALETTE.roadFill)
  }
  for (const id of ['road_minor_casing', 'road_link_casing', 'road_service_track_casing']) {
    setPaint(map, id, 'line-color', GAME_PALETTE.roadCasing)
  }
  for (const id of ['road_secondary_tertiary', 'road_trunk_primary', 'road_motorway']) {
    setPaint(map, id, 'line-color', GAME_PALETTE.roadMajor)
  }
  for (const id of ['road_secondary_tertiary_casing', 'road_trunk_primary_casing', 'road_motorway_casing']) {
    setPaint(map, id, 'line-color', GAME_PALETTE.roadMajorCasing)
  }
}

// The fog-of-war 3D buildings (features/map/buildingsLayer.js) are the only
// buildings we want: liberty draws its own full-height buildings from the same
// OSM data, which would poke through the fog silhouettes. Hide them so the
// fog stays authoritative. (Off the pre-baked campus set there are then no 3D
// buildings, which is fine - the demo lives on campus.)
function hideBasemapBuildings(map) {
  for (const id of ['building', 'building-3d']) setLayout(map, id, 'visibility', 'none')
}

// Darken and de-italicize the basemap's place names a touch so they stay
// legible over the softer ground.
function polishLabels(map) {
  for (const id of ['poi_r1', 'poi_r7', 'poi_r20']) {
    setPaint(map, id, 'text-color', '#3f4756')
    setPaint(map, id, 'text-halo-width', 1.4)
  }
}

// A colored badge behind every curated place icon: a white chip ringed in its
// category color, growing with zoom. Inserted just under the basemap's own poi
// icons so the little fork/cup/bag glyph sits on top of the chip.
function addPoiBadges(map) {
  if (map.getLayer(POI_BADGE_LAYER_ID)) return
  const beforeId = map.getLayer('poi_r1') ? 'poi_r1' : undefined

  map.addLayer(
    {
      id: POI_BADGE_LAYER_ID,
      type: 'circle',
      source: BADGE_SOURCE,
      'source-layer': BADGE_SOURCE_LAYER,
      minzoom: 15,
      filter: [
        'all',
        ['match', ['geometry-type'], ['Point', 'MultiPoint'], true, false],
        ['match', ['get', 'class'], CURATED_CLASSES, true, false],
      ],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 15, 6.5, 18, 11, 20, 14],
        'circle-color': '#ffffff',
        'circle-stroke-color': BADGE_COLOR,
        'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 15, 1.5, 18, 3],
        'circle-opacity': 0.96,
        'circle-stroke-opacity': 0.96,
        'circle-pitch-alignment': 'map',
      },
    },
    beforeId,
  )
}

// Call once, after the basemap style has loaded. Every step is independently
// guarded, so a partial basemap still gets whatever styling it supports.
export function applyGameStyle(map) {
  recolorBasemap(map)
  hideBasemapBuildings(map)
  polishLabels(map)
  addPoiBadges(map)
}
