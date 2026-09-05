const KEY = 'triplanner.trips'

export function loadTrips() {
  try {
    const raw = localStorage.getItem(KEY)
    const trips = raw ? JSON.parse(raw) : []
    if (!Array.isArray(trips)) return []
    // Migrate legacy single-flight schema -> flights array
    return trips.map((t) => {
      if (!Array.isArray(t.flights) && t.flight) {
        return { ...t, flights: [t.flight], flight: undefined }
      }
      return { ...t, flights: Array.isArray(t.flights) ? t.flights : [] }
    })
  } catch {
    return []
  }
}

export function saveTrips(trips) {
  localStorage.setItem(KEY, JSON.stringify(trips))
}

export function uid() {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  )
}
