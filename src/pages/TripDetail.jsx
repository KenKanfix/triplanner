import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTrips, newCity } from '../store/TripsContext'
import { uid as makeId } from '../lib/store'
import { cityDateRange } from '../lib/format'
import { buildItinerary } from '../lib/itinerary'
import {
  getFlightApiKey,
  lookupFlightByNumber,
  normalizeFlightIata,
} from '../lib/flights'
import {
  airportCityLabel,
  findAirport,
  useAirport,
} from '../lib/airports'

const EMPTY_FLIGHT = {
  airline: '',
  flightNo: '',
  departureAirport: '',
  arrivalAirport: '',
  departureTime: '',
  arrivalTime: '',
  bookingRef: '',
}

function LegAirportCity({ code }) {
  const airport = useAirport(code)
  if (!airport) return null
  return <span className="muted airport-city">→ {airportCityLabel(airport)}</span>
}

export default function TripDetail() {
  const { tripId } = useParams()
  const { trips, updateTrip } = useTrips()
  const trip = trips.find((t) => t.id === tripId)

  const flights = trip?.flights ?? []
  const itinerary = buildItinerary(trip?.flights ?? [], trip?.cities ?? [])
  const [editingIndex, setEditingIndex] = useState(null) // null | number
  const [draft, setDraft] = useState(EMPTY_FLIGHT)
  const [showCity, setShowCity] = useState(false)
  const [cityName, setCityName] = useState('')
  const [cityCountry, setCityCountry] = useState('')
  const [cityArrival, setCityArrival] = useState('')
  const [cityDeparture, setCityDeparture] = useState('')
  const [autoAddCity, setAutoAddCity] = useState(true)
  const [flightLookup, setFlightLookup] = useState({
    loading: false,
    error: '',
    info: null,
  })
  const fromAirport = useAirport(draft.departureAirport)
  const toAirport = useAirport(draft.arrivalAirport)

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
    if (autoAddCity) {
      addArrivalCity(leg.arrivalAirport, leg.arrivalTime)
    }
  }

  // Resolve an airport reference to its city and add a City to the trip if
  // one with that name isn't already there.
  async function addArrivalCity(airportRef, arrivalTime) {
    let airport
    try {
      airport = await findAirport(airportRef)
    } catch {
      return
    }
    if (!airport) return
    const name = airport.city || airport.name
    const exists = trip.cities.some(
      (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase(),
    )
    if (exists) return
    const city = newCity()
    city.id = makeId()
    city.name = name
    city.country = airport.country
    city.arrivalDate = arrivalTime ? arrivalTime.slice(0, 10) : ''
    updateTrip(trip.id, { cities: [...trip.cities, city] })
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
    city.arrivalDate = cityArrival
    city.departureDate = cityDeparture
    updateTrip(trip.id, { cities: [...trip.cities, city] })
    setCityName('')
    setCityCountry('')
    setCityArrival('')
    setCityDeparture('')
    setShowCity(false)
  }

  function removeCity(cityId) {
    if (confirm('Remove this city and all its plans?')) {
      updateTrip(trip.id, {
        cities: trip.cities.filter((c) => c.id !== cityId),
      })
    }
  }

  function updateCityDates(cityId, patch) {
    updateTrip(trip.id, {
      cities: trip.cities.map((c) =>
        c.id === cityId ? { ...c, ...patch } : c,
      ),
    })
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

      {/* Itinerary: flights between cities */}
      <section className="section">
        <div className="section-head">
          <h2>🗺️ Itinerary</h2>
          <div className="btn-group">
            <button
              className="btn btn-sm"
              onClick={() => {
                startAddFlight()
                setShowCity(false)
              }}
            >
              + Add leg
            </button>
            <button
              className="btn btn-sm"
              onClick={() => setShowCity((v) => !v)}
            >
              {showCity ? 'Cancel' : '+ Add city'}
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
                <span className="airport-city">
                  {airportCityLabel(fromAirport)}
                </span>
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
                <span className="airport-city">
                  {airportCityLabel(toAirport)}
                </span>
              </label>
            </div>
            <label className="check-row">
              <input
                type="checkbox"
                checked={autoAddCity}
                onChange={(e) => setAutoAddCity(e.target.checked)}
              />
              <span>
                {toAirport && !autoAddCity
                  ? 'Unchecked — arrival city won\u2019t be added to Cities'
                  : 'Automatically add arrival city to 🏙️ Cities when saved'}
              </span>
            </label>
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
            <div className="form-row">
              <label>
                Arrival date
                <input
                  type="date"
                  value={cityArrival}
                  onChange={(e) => setCityArrival(e.target.value)}
                />
              </label>
              <label>
                Departure date
                <input
                  type="date"
                  value={cityDeparture}
                  onChange={(e) => setCityDeparture(e.target.value)}
                />
              </label>
            </div>
            <button className="btn btn-primary" type="submit">
              Add City
            </button>
          </form>
        )}

        {itinerary.length === 0 ? (
          <div className="empty">
            <p>
              No itinerary yet. Add a flight leg and a city to start planning.
            </p>
          </div>
        ) : (
          <div className="itinerary">
            {itinerary.map((item) =>
              item.kind === 'flight' ? (
                <div
                  key={item.key}
                  className="itinerary-item itinerary-flight"
                >
                  <div className="itinerary-dot">✈️</div>
                  <div className="card flight-leg">
                    <div className="flight-leg-head">
                      <span className="leg-badge">Leg {item.idx + 1}</span>
                      <strong>
                        {item.flight.airline ? `${item.flight.airline} ` : ''}
                        {item.flight.flightNo}
                      </strong>
                    </div>
                    <div className="flight-route">
                      <div>
                        <span className="airport">
                          {item.flight.departureAirport || '?'}
                        </span>
                        <LegAirportCity code={item.flight.departureAirport} />
                        <span className="muted">{item.flight.departureTime || ''}</span>
                      </div>
                      <span className="arrow">→</span>
                      <div>
                        <span className="airport">
                          {item.flight.arrivalAirport || '?'}
                        </span>
                        <LegAirportCity code={item.flight.arrivalAirport} />
                        <span className="muted">{item.flight.arrivalTime || ''}</span>
                      </div>
                    </div>
                    {item.flight.bookingRef && (
                      <p className="muted">Booking ref: {item.flight.bookingRef}</p>
                    )}
                    {item.flight.notes && (
                      <p className="notes">{item.flight.notes}</p>
                    )}
                    <div className="flight-leg-actions">
                      <button
                        className="btn btn-sm"
                        onClick={() => startEditFlight(item.idx)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm"
                        disabled={item.idx === 0}
                        onClick={() => moveFlight(item.idx, -1)}
                        title="Move earlier in itinerary"
                      >
                        ↑
                      </button>
                      <button
                        className="btn btn-sm"
                        disabled={item.idx === flights.length - 1}
                        onClick={() => moveFlight(item.idx, 1)}
                        title="Move later in itinerary"
                      >
                        ↓
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => removeFlight(item.idx)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div key={item.key} className="itinerary-item itinerary-city">
                  <div className="itinerary-dot">🏙️</div>
                  <div className="card city-card">
                    <Link
                      to={`/trip/${trip.id}/city/${item.city.id}`}
                      className="city-card-link"
                    >
                      <h2>{item.city.name}</h2>
                      {item.city.country && (
                        <p className="muted">{item.city.country}</p>
                      )}
                      <p className="muted">{cityDateRange(item.city)}</p>
                      <p className="muted">
                        {item.city.places.length} places ·{' '}
                        {item.city.hotel ? '🏨 Hotel set' : 'No hotel'}
                      </p>
                    </Link>
                    <div className="city-dates">
                      <label>
                        Arrival
                        <input
                          type="date"
                          value={item.city.arrivalDate || ''}
                          onChange={(e) =>
                            updateCityDates(item.city.id, {
                              arrivalDate: e.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        Departure
                        <input
                          type="date"
                          value={item.city.departureDate || ''}
                          onChange={(e) =>
                            updateCityDates(item.city.id, {
                              departureDate: e.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => removeCity(item.city.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </section>
    </section>
  )
}