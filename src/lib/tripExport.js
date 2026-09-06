import { uid } from './store'

const FILE_NAME = (date) => `triplanner-trips-${date}.json`

// Export uses a small envelope so we can evolve the format later. The trips
// array itself holds coordinates only as the data the restore needs.
export function serializeTrips(trips) {
  return JSON.stringify(
    {
      app: 'Triplanner',
      version: 1,
      exportedAt: new Date().toISOString(),
      trips,
    },
    null,
    2,
  )
}

export function downloadTrips(trips) {
  const blob = new Blob([serializeTrips(trips)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = FILE_NAME(new Date().toISOString().slice(0, 10))
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Accepts either our envelope ({ trips }) or a bare array of trips. Returns a
// normalized trip array or throws an Error with a user-facing message.
export function parseImportedTrips(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('This file is not valid JSON.')
  }
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.trips)
      ? data.trips
      : null
  if (!list) throw new Error('No trips found in this file.')

  const trips = []
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const trip = { ...item }
    if (!Array.isArray(trip.cities)) trip.cities = []
    if (!Array.isArray(trip.flights)) trip.flights = []
    if (!trip.id) trip.id = uid()
    if (typeof trip.name !== 'string' || !trip.name.trim()) {
      trip.name = 'Imported trip'
    }
    trips.push(trip)
  }
  if (trips.length === 0) throw new Error('No valid trips found in this file.')
  return trips
}

// Imported trips replace existing ones with the same id and otherwise append.
export function mergeTrips(existing, imported) {
  const next = [...existing]
  for (const trip of imported) {
    const idx = next.findIndex((t) => t.id === trip.id)
    if (idx >= 0) next[idx] = trip
    else next.push(trip)
  }
  return next
}