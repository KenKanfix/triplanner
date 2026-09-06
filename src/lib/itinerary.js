// Build a trip "itinerary": flights and cities merged into one ordered
// timeline so you can see each flight between the cities you're visiting.
//
// - When legs or cities have dates/times, items are sorted chronologically
//   (a flight is anchored by its arrival date; a city by its arrival date).
//   On the same day a flight comes before its city, since it's the transport
//   that gets you there.
// - With no dates at all, legs and cities are interleaved in order, assuming
//   the first leg brings you to the first city, the second to the second, etc.

const dayOf = (iso) => (iso ? String(iso).slice(0, 10) : '')
const flightDay = (f) => dayOf(f.arrivalTime) || dayOf(f.departureTime)
const cityDay = (c) => dayOf(c.arrivalDate) || dayOf(c.departureDate)

export function buildItinerary(flights = [], cities = []) {
  const flightsHaveDates = flights.some((f) => f.arrivalTime || f.departureTime)
  const citiesHaveDates = cities.some((c) => c.arrivalDate || c.departureDate)

  if (flightsHaveDates || citiesHaveDates) {
    const items = [
      ...flights.map((flight, idx) => ({
        kind: 'flight',
        key: `flight-${flight.id || idx}`,
        idx,
        flight,
        day: flightDay(flight),
      })),
      ...cities.map((city, idx) => ({
        kind: 'city',
        key: `city-${city.id}`,
        idx,
        city,
        day: cityDay(city),
      })),
    ]
    return items.sort((a, b) => {
      // Item with a date comes before an item without one.
      if (a.day && !b.day) return -1
      if (!a.day && b.day) return 1
      if (a.day && b.day && a.day !== b.day) {
        return a.day < b.day ? -1 : 1
      }
      // Same day (or both undated): transport comes before the city it
      // delivers you to; otherwise keep current order (stable sort).
      const rank = { flight: 0, city: 1 }
      return rank[a.kind] - rank[b.kind]
    })
  }

  const list = []
  const n = Math.max(flights.length, cities.length)
  for (let i = 0; i < n; i++) {
    if (flights[i]) {
      list.push({ kind: 'flight', key: `flight-${i}`, idx: i, flight: flights[i], day: '' })
    }
    if (cities[i]) {
      list.push({ kind: 'city', key: `city-${cities[i].id}`, idx: i, city: cities[i], day: '' })
    }
  }
  return list
}