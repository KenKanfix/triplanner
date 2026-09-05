const KEY_STORE = 'triplanner.aviationstackKey'

export function getFlightApiKey() {
  return localStorage.getItem(KEY_STORE) ?? ''
}

export function setFlightApiKey(key) {
  localStorage.setItem(KEY_STORE, key.trim())
}

// Normalize a user-entered flight number to IATA form, e.g. "ba 112" -> "BA112"
export function normalizeFlightIata(input) {
  return (input || '').toUpperCase().replace(/[\s:.-]/g, '')
}

function fmtTime(scheduled, actual, estimated) {
  const raw = actual || estimated || scheduled || ''
  // Aviationstack returns ISO with airport-offset; trim to datetime-local format.
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/.exec(raw)
  return m ? m[1] : ''
}

// Look up a single flight by IATA flight number via Aviationstack.
// Returns a normalized object ready to fill the flight form, or null if no match.
export async function lookupFlightByNumber(flightNo, apiKey) {
  const iata = normalizeFlightIata(flightNo)
  if (!iata || !apiKey) return null

  // Free Aviationstack tier is HTTP-only.
  const url =
    `http://api.aviationstack.com/v1/flights` +
    `?access_key=${encodeURIComponent(apiKey)}&flight_iata=${encodeURIComponent(iata)}`

  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    throw new Error(`API error (HTTP ${res.status})`)
  }
  const json = await res.json()
  if (json.data && json.data.length > 0) {
    const f = json.data[0]
    return {
      airline: f.airline?.name || '',
      flightNo: f.flight?.iata || iata,
      departureAirport: f.departure?.iata || f.departure?.airport || '',
      arrivalAirport: f.arrival?.iata || f.arrival?.airport || '',
      departureTime: fmtTime(
        f.departure?.scheduled,
        f.departure?.actual,
        f.departure?.estimated,
      ),
      arrivalTime: fmtTime(
        f.arrival?.scheduled,
        f.arrival?.actual,
        f.arrival?.estimated,
      ),
      status: f.flight_status || '',
      terminal: f.departure?.terminal || '',
      gate: f.departure?.gate || '',
      raw: f,
    }
  }
  return null
}