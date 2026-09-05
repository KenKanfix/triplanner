// Search a place by name/address using OpenStreetMap Nominatim.
// Returns an array of results: { name, lat, lng, address }
const NOMINATIM = 'https://nominatim.openstreetmap.org/search'

export async function geocode(query, cityName) {
  const q = cityName ? `${query}, ${cityName}` : query
  const url = `${NOMINATIM}?format=jsonv2&q=${encodeURIComponent(q)}&limit=5&countrycodes=`
  try {
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en' },
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.map((r) => ({
      name: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      // Nominatim boundingbox: [south, north, west, east]
      bbox: Array.isArray(r.boundingbox)
        ? r.boundingbox.map(parseFloat)
        : null,
    }))
  } catch {
    return []
  }
}

export function toLatLngString(lat, lng) {
  return `${lat?.toFixed?.(5) ?? lat}, ${lng?.toFixed?.(5) ?? lng}`
}