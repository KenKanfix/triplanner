export const PLACE_TYPES = [
  { value: 'attraction', label: 'Attraction', icon: '📍', cls: 'attraction' },
  { value: 'restaurant', label: 'Restaurant', icon: '🍽️', cls: 'restaurant' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️', cls: 'shopping' },
  { value: 'market', label: 'Market', icon: '🥬', cls: 'market' },
  { value: 'streetFood', label: 'Street food', icon: '🍜', cls: 'street' },
  { value: 'walk', label: 'Walk / scenic route', icon: '🚶', cls: 'walk' },
]

export function typeInfo(type) {
  return (
    PLACE_TYPES.find((t) => t.value === type) || {
      value: type || 'attraction',
      label: type || 'Place',
      icon: '📍',
      cls: 'attraction',
    }
  )
}