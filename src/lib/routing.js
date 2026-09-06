const OSRM = 'https://router.project-osrm.org/route/v1'

// Walk at ~5 km/h, taxi at ~30 km/h (city avg). Returns a recommended mode.
export function recommendMode(distanceMeters) {
  if (distanceMeters <= 1000) return 'walk'
  if (distanceMeters <= 5000) return 'public'
  return 'taxi'
}

// Fetch a route between two [lng, lat] points from OSRM.
// Returns { distanceMeters, durationSeconds, geometry, mode } or null on error.
export async function fetchRoute(from, to, profile = 'driving') {
  const url = `${OSRM}/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    if (data.code !== 'Ok' || !data.routes || !data.routes[0]) return null
    const route = data.routes[0]
    const distanceMeters = Math.round(route.distance)
    return {
      distanceMeters,
      durationSeconds: Math.round(route.duration),
      geometry: route.geometry,
      profile,
      mode: recommendMode(distanceMeters),
    }
  } catch {
    return null
  }
}

// OSRM has no public-transit profile, so transit estimates reuse the road
// geometry but assume a realistic city-transit speed (~18 km/h incl. wait).
const TRANSIT_KMH = 18

export const ROUTE_MODES = [
  { value: 'auto', label: 'Auto (recommended)', emoji: '🧠' },
  { value: 'walk', label: 'Walk', emoji: '🚶' },
  { value: 'taxi', label: 'Taxi / share ride', emoji: '🚕' },
  { value: 'public', label: 'Public transport', emoji: '🚌' },
]

// Fetch a route honouring the user's chosen transport mode. 'auto' keeps the
// distance-based recommendation. Walking and taxi map to OSRM's walking and
// driving profiles; public transport is an estimate (see TRANSIT_KMH) marked
// with `approx: true`.
export async function fetchRouteForMode(from, to, routeMode = 'auto') {
  if (routeMode === 'public') {
    const route = await fetchRoute(from, to, 'driving')
    if (!route) return null
    return {
      ...route,
      mode: 'public',
      approx: true,
      durationSeconds: Math.round((route.distanceMeters / 1000 / TRANSIT_KMH) * 3600),
    }
  }
  if (routeMode === 'taxi') {
    const route = await fetchRoute(from, to, 'driving')
    return route ? { ...route, mode: 'taxi' } : null
  }
  if (routeMode === 'walk') {
    const route = await fetchRoute(from, to, 'walking')
    return route ? { ...route, mode: 'walk' } : null
  }
  return fetchRoute(from, to)
}

export function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

export function formatDuration(seconds) {
  const m = Math.round(seconds / 60)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem ? `${h} h ${rem} min` : `${h} h`
}

export const MODE_LABELS = {
  walk: 'Walk',
  public: 'Public transport',
  taxi: 'Taxi',
}

export const MODE_EMOJI = {
  walk: '🚶',
  public: '🚌',
  taxi: '🚕',
}
