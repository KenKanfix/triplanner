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
