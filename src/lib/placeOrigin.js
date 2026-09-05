// Resolve where we're coming from for a place: the hotel (default),
// another pinned place, or a custom point.
export function resolveOrigin(place, hotel, places = []) {
  if (place.comingFrom === 'place' && place.fromPlaceId) {
    const p = places.find((pp) => pp.id === place.fromPlaceId)
    if (p && p.lat != null && p.lng != null) {
      return { lat: p.lat, lng: p.lng, name: p.name }
    }
  }
  if (place.comingFrom === 'custom') {
    if (place.fromLat != null && place.fromLng != null) {
      return {
        lat: place.fromLat,
        lng: place.fromLng,
        name: place.fromName,
      }
    }
    // Legacy walks stored the custom start on the place itself.
    if (place.lat != null && place.lng != null) {
      return { lat: place.lat, lng: place.lng, name: place.address || place.name }
    }
  }
  if (hotel && hotel.lat != null && hotel.lng != null) {
    return { lat: hotel.lat, lng: hotel.lng, name: hotel.name }
  }
  return null
}