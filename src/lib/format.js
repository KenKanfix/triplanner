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
