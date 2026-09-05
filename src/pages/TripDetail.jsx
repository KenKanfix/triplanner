import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTrips, newCity } from '../store/TripsContext'
import { uid as makeId } from '../lib/store'
import { cityDateRange } from '../lib/format'
import {
  getFlightApiKey,
  lookupFlightByNumber,
  normalizeFlightIata,
} from '../lib/flights'

const EMPTY_FLIGHT = {
  airline: '',
  flightNo: '',
  departureAirport: '',
  arrivalAirport: '',
  departureTime: '',
  arrivalTime: '',
  bookingRef: '',
}

export default function TripDetail() {
  const { tripId } = useParams()
  const { trips, updateTrip } = useTrips()
  const trip = trips.find((t) => t.id === tripId)

  const flights = trip?.flights ?? []
  const [editingIndex, setEditingIndex] = useState(null) // null | number
  const [draft, setDraft] = useState(EMPTY_FLIGHT)
  const [showCity, setShowCity] = useState(false)
  const [cityName, setCityName] = useState('')
  const [cityCountry, setCityCountry] = useState('')
  const [flightLookup, setFlightLookup] = useState({
    loading: false,
    error: '',
    info: null,
  })

  if (!trip || !trip.cities) {
    return (
      <section className="page">
        <p>Trip not found.</p>
        <Link to="/" className="btn">
          Back to trips
        </Link>
      </section>
    )
  }

  function startAddFlight() {
    setDraft({ ...EMPTY_FLIGHT })
    setFlightLookup({ loading: false, error: '', info: null })
    setEditingIndex(flights.length)
  }

  function startEditFlight(i) {
    setDraft({ ...flights[i] })
    setFlightLookup({ loading: false, error: '', info: null })
    setEditingIndex(i)
  }

  function cancelEdit() {
    setEditingIndex(null)
  }

  function saveFlight(e) {
    e.preventDefault()
    const leg = { ...draft }
    const isNew = editingIndex >= flights.length
    const next =
      isNew
        ? [...flights, leg]
        : flights.map((f, i) => (i === editingIndex ? leg : f))
    updateTrip(trip.id, { flights: next })
    setEditingIndex(null)
  }

  function removeFlight(i) {
    const leg = flights[i]
    if (
      confirm(
        `Remove flight ${
          leg.flightNo ? leg.flightNo : `leg ${i + 1}`
        }?`,
      )
    ) {
      updateTrip(trip.id, {
        flights: flights.filter((_, idx) => idx !== i),
      })
      if (editingIndex === i) setEditingIndex(null)
    }
  }

  function moveFlight(i, dir) {
    const j = i + dir
    if (j < 0 || j >= flights.length) return
    const next = [...flights]
    ;[next[i], next[j]] = [next[j], next[i]]
    updateTrip(trip.id, { flights: next })
  }

  async function handleLookupFlight() {
    const apiKey = getFlightApiKey()
    if (!apiKey) {
      setFlightLookup({
        loading: false,
        error: 'Add your Aviationstack API key in Settings (⚙️) first.',
        info: null,
      })
      return
    }
    const iata = normalizeFlightIata(draft.flightNo)
    if (!iata) {
      setFlightLookup({
        loading: false,
        error: 'Enter a flight number first (e.g. BA112).',
        info: null,
      })
      return
    }
    setFlightLookup({ loading: true, error: '', info: null })
    try {
      const result = await lookupFlightByNumber(iata, apiKey)
      if (result) {
        setDraft((d) => ({
          ...d,
          airline: result.airline || d.airline,
          flightNo: result.flightNo || d.flightNo,
          departureAirport: result.departureAirport || d.departureAirport,
          arrivalAirport: result.arrivalAirport || d.arrivalAirport,
          departureTime: result.departureTime || d.departureTime,
          arrivalTime: result.arrivalTime || d.arrivalTime,
        }))
        setFlightLookup({ loading: false, error: '', info: result })
      } else {
        setFlightLookup({
          loading: false,
          error: `No flight found for ${iata}.`,
          info: null,
        })
      }
    } catch (err) {
      setFlightLookup({
        loading: false,
        error:
          err.message === 'Failed to fetch'
            ? 'Network error — your API key may need HTTPS, or check your connection.'
            : err.message,
        info: null,
      })
    }
  }

  function addCity(e) {
    e.preventDefault()
    const city = newCity()
    city.id = makeId()
    city.name = cityName.trim() || 'Untitled city'
    city.country = cityCountry.trim()
    updateTrip(trip.id, { cities: [...trip.cities, city] })
    setCityName('')
    setCityCountry('')
    setShowCity(false)
  }

  function removeCity(cityId) {
    if (confirm('Remove this city and all its plans?')) {
      updateTrip(trip.id, {
        cities: trip.cities.filter((c) => c.id !== cityId),
      })
    }
  }

  return (
    <section className="page">
      <Link to="/" className="back-link">
        ← All trips
      </Link>

      <div className="page-head">
        <h1>{trip.name}</h1>
        <p className="muted">
          {trip.startDate || '?'} → {trip.endDate || '?'}
        </p>
      </div>
      {trip.notes && <p className="notes">{trip.notes}</p>}

      {/* Flight legs */}
      <section className="section">
        <div className="section-head">
          <h2>✈️ Flights</h2>
          <div className="btn-group">
            <button className="btn btn-sm" onClick={startAddFlight}>
              + Add leg
            </button>
          </div>
        </div>

        {editingIndex !== null && (
          <form className="card form" onSubmit={saveFlight}>
            <h3>
              {editingIndex < flights.length
                ? `Edit flight leg ${editingIndex + 1}`
                : `Add flight leg ${flights.length + 1}`}
            </h3>
            <div className="form-row">
              <label>
                Airline
                <input
                  value={draft.airline}
                  onChange={(e) => setDraft({ ...draft, airline: e.target.value })}
                />
              </label>
              <label>
                Flight no.
                <input
                  value={draft.flightNo}
                  onChange={(e) => setDraft({ ...draft, flightNo: e.target.value })}
                  placeholder="e.g. BA112"
                />
              </label>
            </div>
            <div className="form-actions">
              <button
                className="btn btn-sm"
                type="button"
                onClick={handleLookupFlight}
                disabled={flightLookup.loading}
              >
                {flightLookup.loading ? 'Looking up…' : '🔍 Look up flight'}
              </button>
              {flightLookup.error && (
                <span className="error-text">{flightLookup.error}</span>
              )}
              {flightLookup.info && (
                <span className="saved-msg">
                  ✓ {flightLookup.info.airline} {flightLookup.info.flightNo}
                  {flightLookup.info.status && ` · ${flightLookup.info.status}`}
                  {flightLookup.info.terminal && ` · T${flightLookup.info.terminal}`}
                  {flightLookup.info.gate && ` · Gate ${flightLookup.info.gate}`}
                </span>
              )}
            </div>
            <div className="form-row">
              <label>
                From (airport)
                <input
                  value={draft.departureAirport}
                  onChange={(e) =>
                    setDraft({ ...draft, departureAirport: e.target.value })
                  }
                  placeholder="e.g. LHR"
                />
              </label>
              <label>
                To (airport)
                <input
                  value={draft.arrivalAirport}
                  onChange={(e) =>
                    setDraft({ ...draft, arrivalAirport: e.target.value })
                  }
                  placeholder="e.g. NRT"
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Departs
                <input
                  type="datetime-local"
                  value={draft.departureTime}
                  onChange={(e) =>
                    setDraft({ ...draft, departureTime: e.target.value })
                  }
                />
              </label>
              <label>
                Arrives
                <input
                  type="datetime-local"
                  value={draft.arrivalTime}
                  onChange={(e) =>
                    setDraft({ ...draft, arrivalTime: e.target.value })
                  }
                />
              </label>
            </div>
            <label>
              Booking reference
              <input
                value={draft.bookingRef}
                onChange={(e) => setDraft({ ...draft, bookingRef: e.target.value })}
              />
            </label>

            <div className="form-row">
              <label>
                Notes
                <input
                  value={draft.notes || ''}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  placeholder="e.g. Domestic connection from Haneda"
                />
              </label>
            </div>

            <div className="form-actions">
              <button className="btn btn-primary" type="submit">
                {editingIndex < flights.length ? 'Save leg' : 'Add leg'}
              </button>
              <button className="btn" type="button" onClick={cancelEdit}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {flights.length === 0 ? (
          editingIndex === null && (
            <div className="empty">
              <p>
                No flights yet. Add legs for each flight — including stopovers
                or a domestic → international connection.
              </p>
            </div>
          )
        ) : (
          <div className="flight-legs">
            {flights.map((f, i) => (
              <div key={i} className="card flight-leg">
                <div className="flight-leg-head">
                  <span className="leg-badge">Leg {i + 1}</span>
                  <strong>
                    {f.airline ? `${f.airline} ` : ''}
                    {f.flightNo}
                  </strong>
                </div>
                <div className="flight-route">
                  <div>
                    <span className="airport">
                      {f.departureAirport || '?'}
                    </span>
                    <span className="muted">{f.departureTime || ''}</span>
                  </div>
                  <span className="arrow">→</span>
                  <div>
                    <span className="airport">{f.arrivalAirport || '?'}</span>
                    <span className="muted">{f.arrivalTime || ''}</span>
                  </div>
                </div>
                {f.bookingRef && (
                  <p className="muted">Booking ref: {f.bookingRef}</p>
                )}
                {f.notes && <p className="notes">{f.notes}</p>}
                <div className="flight-leg-actions">
                  <button className="btn btn-sm" onClick={() => startEditFlight(i)}>
                    Edit
                  </button>
                  <button
                    className="btn btn-sm"
                    disabled={i === 0}
                    onClick={() => moveFlight(i, -1)}
                    title="Move earlier in itinerary"
                  >
                    ↑
                  </button>
                  <button
                    className="btn btn-sm"
                    disabled={i === flights.length - 1}
                    onClick={() => moveFlight(i, 1)}
                    title="Move later in itinerary"
                  >
                    ↓
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => removeFlight(i)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Cities */}
      <section className="section">
        <div className="section-head">
          <h2>🏙️ Cities</h2>
          <button className="btn btn-sm" onClick={() => setShowCity((v) => !v)}>
            {showCity ? 'Cancel' : '+ Add city'}
          </button>
        </div>

        {showCity && (
          <form className="card form" onSubmit={addCity}>
            <div className="form-row">
              <label>
                City name
                <input
                  value={cityName}
                  onChange={(e) => setCityName(e.target.value)}
                  placeholder="e.g. Tokyo"
                  autoFocus
                />
              </label>
              <label>
                Country
                <input
                  value={cityCountry}
                  onChange={(e) => setCityCountry(e.target.value)}
                  placeholder="e.g. Japan"
                />
              </label>
            </div>
            <button className="btn btn-primary" type="submit">
              Add City
            </button>
          </form>
        )}

        {trip.cities.length === 0 ? (
          <div className="empty">
            <p>No cities yet. Add a city to start planning hotels, transport and places.</p>
          </div>
        ) : (
          <div className="card-grid">
            {trip.cities.map((c) => (
              <div key={c.id} className="card city-card">
                <Link to={`/trip/${trip.id}/city/${c.id}`} className="city-card-link">
                  <h2>{c.name}</h2>
                  {c.country && <p className="muted">{c.country}</p>}
                  <p className="muted">{cityDateRange(c)}</p>
                  <p className="muted">
                    {c.places.length} places ·{' '}
                    {c.hotel ? '🏨 Hotel set' : 'No hotel'}
                  </p>
                </Link>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => removeCity(c.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}