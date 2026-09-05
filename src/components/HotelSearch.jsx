import { useState } from 'react'
import { searchHotels } from '../lib/overpass'
import { geocode } from '../lib/geocode'

export default function HotelSearch({ value, onValueChange, cityName, onPick }) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [isFallback, setIsFallback] = useState(false)

  async function handleSearch() {
    if (!value.trim() && !cityName) return
    setLoading(true)
    setError('')
    setOpen(false)

    let res = value.trim()
      ? await searchHotels({ query: value, cityName })
      : []

    // Fallback: query Nominatim directly so the user always gets results,
    // even when the Overpass instances are rate-limited or down.
    if (res.length === 0) {
      const fallback = await geocode(
        value.trim() || cityName,
        value.trim() ? cityName : '',
      )
      res = fallback.map((r) => ({
        name: r.name.split(',').slice(0, 2).join(','),
        lat: r.lat,
        lng: r.lng,
        phone: '',
        website: '',
        address: r.name,
      }))
      setIsFallback(res.length > 0)
    } else {
      setIsFallback(false)
    }

    setLoading(false)
    if (res.length === 0) {
      setError(
        value.trim()
          ? `No hotels matching “${value}” found near ${cityName || 'the city'}.`
          : `No hotels found near ${cityName || 'the city'}.`,
      )
      setResults([])
    } else {
      setResults(res)
      setOpen(true)
    }
  }

  return (
    <div className="place-search">
      <label>
        Hotel name
        <div className="place-search-form">
          <input
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSearch()
              }
            }}
            placeholder="Search hotel by name (blank = all hotels in city)…"
          />
          <button
            className="btn btn-sm"
            type="button"
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? 'Searching…' : 'Find'}
          </button>
        </div>
      </label>
      {error && <p className="error-text">{error}</p>}
      {open && (
        <div>
          {isFallback && (
            <p className="muted note">
              Hotel index busy — showing general map matches. Pick the best one.
            </p>
          )}
          <ul className="search-results">
            {results.slice(0, 12).map((r, i) => (
              <li key={`${r.lat}-${r.lng}-${i}`}>
                <button
                  type="button"
                  className="search-result"
                  onClick={() => {
                    onPick(r)
                    setOpen(false)
                    setResults([])
                  }}
                >
                  <span className="search-result-name">{r.name}</span>
                  {r.address && r.address !== r.name && (
                    <span className="muted">{r.address}</span>
                  )}
                  <span className="muted">
                    {r.lat?.toFixed(4)}, {r.lng?.toFixed(4)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}