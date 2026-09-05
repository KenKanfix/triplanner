export function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function cityDateRange(city) {
  if (city.arrivalDate && city.departureDate) {
    return `${formatDate(city.arrivalDate)} – ${formatDate(city.departureDate)}`
  }
  if (city.arrivalDate) return formatDate(city.arrivalDate)
  if (city.departureDate) return `until ${formatDate(city.departureDate)}`
  return 'Dates not set'
}

// Sort items that carry a `date` (or a fallback field) ascending by date,
// with items missing a date placed at the end. Returns a new array.
export function sortByDate(items, field = 'date') {
  return [...items].sort((a, b) => {
    const ta = a?.[field] ? new Date(a[field]).getTime() : NaN
    const tb = b?.[field] ? new Date(b[field]).getTime() : NaN
    const hasA = Number.isFinite(ta)
    const hasB = Number.isFinite(tb)
    if (hasA && hasB) return ta - tb
    if (hasA) return -1
    if (hasB) return 1
    return 0
  })
}
