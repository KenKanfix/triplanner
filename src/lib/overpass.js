import { geocode } from './geocode'

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

const REQUEST_TIMEOUT = 20000

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildAddress(tags) {
  const parts = []
  const street = tags['addr:street']
  const house = tags['addr:housenumber']
  if (house && street) parts.push(`${street} ${house}`)
  else if (street) parts.push(street)
  const postcode = tags['addr:postcode']
  const city = tags['addr:city']
  if (postcode && city) parts.push(`${postcode} ${city}`)
  else if (city) parts.push(city)
  else if (postcode) parts.push(postcode)
  return parts.join(', ')
}

// Resolve the city with Nominatim, returning { lat, lng, bbox } or null.
async function resolveCity(cityName, cityCoords) {
  if (cityCoords) {
    return cityCoords.bbox
      ? cityCoords
      : { lat: cityCoords.lat, lng: cityCoords.lng, bbox: null }
  }
  if (!cityName) return null
  const res = await geocode(cityName, '')
  if (res.length === 0) return null
  return { lat: res[0].lat, lng: res[0].lng, bbox: res[0].bbox || null }
}

function buildQuery(city, query, limit) {
  const nameFilter = query.trim()
    ? `["name"~"${escapeRegex(query.trim())}",i]`
    : ''
  const hotelFilter = `["tourism"="hotel"]${nameFilter}`
  // A bbox query is far faster on the public Overpass instances than `around`.
  if (city.bbox) {
    const [s, n, w, e] = city.bbox
    return [
      '[out:json][timeout:35];',
      '(',
      `  node${hotelFilter}(${s},${w},${n},${e});`,
      `  way${hotelFilter}(${s},${w},${n},${e});`,
      ')',
      `out center tags ${limit};`,
    ].join('\n')
  }
  const radius = 15000
  return [
    '[out:json][timeout:35];',
    '(',
    `  node${hotelFilter}(around:${radius},${city.lat},${city.lng});`,
    `  way${hotelFilter}(around:${radius},${city.lat},${city.lng});`,
    ')',
    `out center tags ${limit};`,
  ].join('\n')
}

async function runOverpass(query) {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: ctrl.signal,
      })
      if (!res.ok) continue
      const json = await res.json()
      if (Array.isArray(json.elements) && json.elements.length > 0) {
        return json.elements
      }
    } catch {
      // try next endpoint
    } finally {
      clearTimeout(timer)
    }
  }
  return []
}

// Search hotels around a city via OpenStreetMap's Overpass API (no key required).
// Returns { name, lat, lng, phone, website, address }[] or [] on any failure.
export async function searchHotels({ query = '', cityName = '', cityCoords = null, limit = 20 }) {
  const city = await resolveCity(cityName, cityCoords)
  if (!city) return []

  const q = buildQuery(city, query, limit)
  const elements = await runOverpass(q)

  return elements
    .filter((el) => el.tags && el.tags.name)
    .map((el) => {
      const t = el.tags
      const lat =
        el.center && el.center.lat != null
          ? parseFloat(el.center.lat)
          : el.lat != null
            ? parseFloat(el.lat)
            : null
      const lng =
        el.center && el.center.lon != null
          ? parseFloat(el.center.lon)
          : el.lon != null
            ? parseFloat(el.lon)
            : null
      return {
        name: t.name,
        lat,
        lng,
        phone: t.phone || t['contact:phone'] || '',
        website: t.website || t['contact:website'] || '',
        address: buildAddress(t),
      }
    })
    .filter((h) => h.lat != null && h.lng != null)
}