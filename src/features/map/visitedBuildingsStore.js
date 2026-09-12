// Persists which OSM buildings have been visited, in localStorage - same
// pattern as useVisitTracker's visit log. Works regardless of whether
// Supabase is configured or the user is signed in; unlockLocation() in
// api.js additionally persists to Supabase when both of those are true.
const STORAGE_KEY = 'visitedBuildings'

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []
  } catch {
    return []
  }
}

export function loadVisitedBuildingIds() {
  return new Set(load().map((entry) => entry.id))
}

export function saveVisitedBuilding(building) {
  const list = load()
  if (list.some((entry) => entry.id === building.id)) return
  list.push({ ...building, visitedAt: Date.now() })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}
