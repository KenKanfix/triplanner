import { useState } from 'react'
import { geocode } from '../lib/geocode'

export default function PlaceSearch({
  value,
  onValueChange,
  onPick,
  cityName,
  placeholder = 'Search a place…',
  limit = 5,
}) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  async function handleSearch() {
    if (!value.trim()) return
    setLoading(true)
    setError('')
    const res = await geocode(value, cityName)
    setLoading(false)
    if (res.length === 0) {
      setError('No results found. Try a more specific name or address.')
      setResults([])
      setOpen(false)
    } else {
      setResults(res.slice(0, limit))
      setOpen(true)
    }
  }

  return (
    <div className="place-search">
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
          placeholder={placeholder}
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
      {error && <p className="error-text">{error}</p>}
      {open && (
        <ul className="search-results">
          {results.map((r, i) => (
            <li key={i}>
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
                <span className="muted">
                  {r.lat?.toFixed(4)}, {r.lng?.toFixed(4)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}