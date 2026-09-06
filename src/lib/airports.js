import { useEffect, useState } from 'react'

// Airport (IATA) -> city/country lookup from a bundled public dataset
// (OurAirports data, public domain). The dataset is lazy-loaded as its own
// chunk so the main bundle stays small; it's precached by the PWA.

const cache = new Map()
let loadingPromise = null

function loadAirports() {
  if (cache.size) return Promise.resolve(cache)
  if (!loadingPromise) {
    loadingPromise = import('../data/airports.json')
      .then((mod) => {
        for (const [iata, a] of Object.entries(mod.default)) {
          cache.set(iata, a)
        }
        return cache
      })
      .catch((err) => {
        loadingPromise = null
        throw err
      })
  }
  return loadingPromise
}

function clean(input) {
  return (input || '').trim()
}

// Resolve a user-entered airport reference (IATA code like "NRT" or a name
// like "Narita Airport") to { iata, name, city, country }, or null.
export async function findAirport(input) {
  const q = clean(input)
  if (!q) return null
  const data = await loadAirports()
  const code = q.toUpperCase()
  const exact = data.get(code)
  if (exact) {
    return { iata: code, ...exact }
  }
  if (q.length > 2) {
    const needle = q.toLowerCase()
    for (const [iata, a] of data) {
      if (
        a.c.toLowerCase().includes(needle) ||
        a.n.toLowerCase().includes(needle)
      ) {
        return { iata, ...a }
      }
    }
  }
  return null
}

export function airportCityLabel(airport) {
  if (!airport) return ''
  return `${airport.city}${airport.country ? `, ${airport.country}` : ''}`
}

// Hook: resolve a code/name to airport info whenever it changes.
// Returns null until the currently-typed value has been resolved.
export function useAirport(input) {
  const [resolved, setResolved] = useState(null) // { q, airport }
  const q = clean(input)
  useEffect(() => {
    let alive = true
    findAirport(q)
      .then((r) => {
        if (alive) setResolved({ q, airport: r })
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [q])
  if (!q) return null
  return resolved && resolved.q === q ? resolved.airport : null
}