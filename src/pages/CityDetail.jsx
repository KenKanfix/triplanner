import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTrips, newPlace } from '../store/TripsContext'
import { uid as makeId } from '../lib/store'
import PlaceSearch from '../components/PlaceSearch'
import HotelSearch from '../components/HotelSearch'
import TripMap from '../components/TripMap'
import { PLACE_TYPES, typeInfo } from '../lib/placeTypes'
import { resolveOrigin } from '../lib/placeOrigin'
import { formatDate, sortByDate } from '../lib/format'
import {
  fetchRouteForMode,
  formatDistance,
  formatDuration,
  MODE_LABELS,
  MODE_EMOJI,
  ROUTE_MODES,
} from '../lib/routing'

const TRANSPORT_MODES = [
  { value: 'taxi', label: '🚕 Taxi / ride-hail' },
  { value: 'shuttle', label: '🚐 Hotel shuttle' },
  { value: 'train', label: '🚆 Train / airport express' },
  { value: 'bus', label: '🚌 Public bus' },
  { value: 'car', label: '🚗 Rental car' },
  { value: 'other', label: '🛠️ Other' },
]

function ComingFromBox({ placeFields, setPlaceFields, handleFromPick, placeList, hotel, title }) {
  const others = placeList.filter(
    (pp) =>
      pp.id !== placeFields.id &&
      pp.lat != null &&
      pp.lng != null &&
      !(pp.type === 'walk' && pp.destLat != null),
  )
  const selectedPlace = placeList.find((pp) => pp.id === placeFields.fromPlaceId)
  return (
    <div className="dest-box">
      <h4>{title}</h4>
      <label>
        Coming from
        <select
          value={placeFields.comingFrom || 'hotel'}
          onChange={(e) =>
            setPlaceFields({ ...placeFields, comingFrom: e.target.value })
          }
        >
          <option value="hotel">🏨 Hotel (default)</option>
          <option value="place">Another place</option>
          <option value="custom">Custom point…</option>
        </select>
      </label>

      {placeFields.comingFrom === 'place' ? (
        others.length > 0 ? (
          <label>
            From this place
            <select
              value={placeFields.fromPlaceId || ''}
              onChange={(e) =>
                setPlaceFields({ ...placeFields, fromPlaceId: e.target.value })
              }
            >
              <option value="" disabled>
                Select a place…
              </option>
              {others.map((o) => (
                <option key={o.id} value={o.id}>
                  {typeInfo(o.type).icon} {o.name}
                </option>
              ))}
            </select>
            {selectedPlace && (
              <p className="muted">
                Route starts from {selectedPlace.name}
              </p>
            )}
          </label>
        ) : (
          <p className="muted">Add and pin another place first.</p>
        )
      ) : placeFields.comingFrom === 'custom' ? (
        <>
          <label>
            Starting point
            <PlaceSearch
              value={placeFields.fromName}
              onValueChange={(v) => setPlaceFields({ ...placeFields, fromName: v })}
              onPick={handleFromPick}
              cityName=""
              placeholder="Search where you&apos;re starting…"
            />
          </label>
          <label>
            Starting point address
            <input
              value={placeFields.fromAddress}
              onChange={(e) =>
                setPlaceFields({ ...placeFields, fromAddress: e.target.value })
              }
            />
          </label>
          <label>
            Starting point coordinates
            <input
              readOnly
              value={
                placeFields.fromLat != null
                  ? `${placeFields.fromLat.toFixed(5)}, ${placeFields.fromLng.toFixed(5)}`
                  : 'Not set'
              }
            />
          </label>
        </>
      ) : (
        <p className="muted">
          {hotel?.lat != null
            ? `Route planned from ${hotel.name || 'your hotel'}`
            : 'Route planned from your hotel (add the hotel location to show it on the map)'}
        </p>
      )}
    </div>
  )
}

export default function CityDetail() {
  const { tripId, cityId } = useParams()
  const { trips, updateCity, updatePlace } = useTrips()
  const trip = trips.find((t) => t.id === tripId)
  const city = trip?.cities?.find((c) => c.id === cityId)

  // Editing state
  const [editingHotel, setEditingHotel] = useState(false)
  const [hotelFields, setHotelFields] = useState({
    name: '',
    address: '',
    lat: null,
    lng: null,
    phone: '',
    website: '',
    notes: '',
    checkIn: '',
    checkOut: '',
  })

  const [editingAirport, setEditingAirport] = useState(false)
  const [arrivalFields, setArrivalFields] = useState({
    airportName: '',
    mode: 'taxi',
    cost: '',
    notes: '',
  })
  const [departureFields, setDepartureFields] = useState({
    airportName: '',
    mode: 'taxi',
    cost: '',
    notes: '',
  })

  const [editingPlaceId, setEditingPlaceId] = useState(null)
  const [placeFields, setPlaceFields] = useState(newPlace())

  // Routing state: from hotel to each place
  const [routes, setRoutes] = useState({})
  const [routeLoading, setRouteLoading] = useState(false)

  const placeList = city?.places ?? []

  // Transport mode used when routing from each place's origin to the place.
  const routeMode = city?.routeMode ?? 'auto'
  const setRouteMode = (value) => updateCity(tripId, cityId, { routeMode: value })

  useEffect(() => {
    if (editingHotel && city?.hotel) {
      setHotelFields({
        name: city.hotel.name || '',
        address: city.hotel.address || '',
        lat: city.hotel.lat ?? null,
        lng: city.hotel.lng ?? null,
        phone: city.hotel.phone || '',
        website: city.hotel.website || '',
        notes: city.hotel.notes || '',
        checkIn: city.hotel.checkIn || '',
        checkOut: city.hotel.checkOut || '',
      })
    }
  }, [editingHotel, city])

  const hotel = city?.hotel ?? null

  // Flight legs relevant to this city: those whose arrival or departure date
  // falls within the city's arrival → departure window. When the city has no
  // dates, fall back to every trip flight so existing behaviour is kept.
  const cityFlights = useMemo(() => {
    const legs = trip?.flights ?? []
    if (!city?.arrivalDate || !city?.departureDate) return legs
    const start = new Date(city.arrivalDate).getTime()
    const end = new Date(city.departureDate).getTime()
    if (Number.isNaN(start) || Number.isNaN(end)) return legs
    return legs.filter((leg) => {
      const hasArrival = leg.arrivalTime && !Number.isNaN(new Date(leg.arrivalTime).getTime())
      const hasDeparture = leg.departureTime && !Number.isNaN(new Date(leg.departureTime).getTime())
      const inWindow = (t) => t >= start && t <= end
      const arr = hasArrival ? new Date(leg.arrivalTime).getTime() : null
      const dep = hasDeparture ? new Date(leg.departureTime).getTime() : null
      if (arr != null && inWindow(arr)) return true
      if (dep != null && inWindow(dep)) return true
      return false
    })
  }, [trip, city])

  // Known airports from the city's relevant flight legs.
  const airportSuggestions = useMemo(() => {
    const seen = {}
    const out = []
    for (const leg of cityFlights) {
      for (const air of [leg.departureAirport, leg.arrivalAirport]) {
        if (air && !seen[air]) {
          seen[air] = true
          out.push(air)
        }
      }
    }
    return out
  }, [cityFlights])

  // Pick the most likely airport for this city from its relevant flight legs.
  const pickAirport = useCallback(
    (side) => {
      const legs = cityFlights
      if (legs.length === 0) return ''
      const target =
        side === 'arrival' ? city?.arrivalDate : city?.departureDate
      if (target) {
        const t0 = new Date(target).getTime()
        const key = side === 'arrival' ? 'arrivalTime' : 'departureTime'
        let best = null
        let bestScore = Infinity
        for (const leg of legs) {
          const t = leg[key]
          if (!t) continue
          const score = Math.abs(new Date(t).getTime() - t0)
          if (score < bestScore) {
            bestScore = score
            best = leg
          }
        }
        if (best) {
          return side === 'arrival' ? best.arrivalAirport : best.departureAirport
        }
      }
      return side === 'arrival' && legs.length > 0
        ? legs[legs.length - 1].arrivalAirport || ''
        : legs[0]?.departureAirport || ''
    },
    [cityFlights, city],
  )

  function openAirportForm() {
    const at = city?.airportTransport
    setArrivalFields({
      airportName:
        at?.arrival?.airportName || pickAirport('arrival'),
      mode: at?.arrival?.mode || 'taxi',
      cost: at?.arrival?.cost || '',
      notes: at?.arrival?.notes || '',
    })
    setDepartureFields({
      airportName:
        at?.departure?.airportName || pickAirport('departure'),
      mode: at?.departure?.mode || 'taxi',
      cost: at?.departure?.cost || '',
      notes: at?.departure?.notes || '',
    })
    setEditingAirport(true)
  }

  const handleHotelPick = useCallback((r) => {
    setHotelFields((f) => ({
      ...f,
      name: r.name || f.name,
      address: r.address || r.name || f.address,
      lat: r.lat ?? f.lat,
      lng: r.lng ?? f.lng,
      phone: r.phone || f.phone,
      website: r.website || f.website,
    }))
  }, [])

  const saveHotel = useCallback(
    (e) => {
      e.preventDefault()
      const h = {
        name: hotelFields.name.trim() || 'My hotel',
        address: hotelFields.address.trim(),
        lat: hotelFields.lat,
        lng: hotelFields.lng,
        phone: hotelFields.phone.trim(),
        website: hotelFields.website.trim(),
        notes: hotelFields.notes.trim(),
        checkIn: hotelFields.checkIn || '',
        checkOut: hotelFields.checkOut || '',
      }
      updateCity(tripId, cityId, { hotel: h })
      setEditingHotel(false)
    },
    [hotelFields, tripId, cityId, updateCity],
  )

  const removeHotel = useCallback(() => {
    if (confirm('Remove hotel details?')) {
      updateCity(tripId, cityId, { hotel: null })
      setEditingHotel(false)
    }
  }, [tripId, cityId, updateCity])

  const saveAirport = useCallback(
    (e) => {
      e.preventDefault()
      const transport = {
        arrival: {
          airportName: arrivalFields.airportName,
          mode: arrivalFields.mode,
          cost: arrivalFields.cost,
          notes: arrivalFields.notes,
        },
        departure: {
          airportName: departureFields.airportName,
          mode: departureFields.mode,
          cost: departureFields.cost,
          notes: departureFields.notes,
        },
      }
      updateCity(tripId, cityId, { airportTransport: transport })
      setEditingAirport(false)
    },
    [arrivalFields, departureFields, tripId, cityId, updateCity],
  )

  const removeAirport = useCallback(() => {
    if (confirm('Remove airport transfer details?')) {
      updateCity(tripId, cityId, { airportTransport: null })
      setEditingAirport(false)
    }
  }, [tripId, cityId, updateCity])

  const startAddPlace = (type) => {
    const p = newPlace(type)
    p.id = makeId()
    setPlaceFields(p)
    setEditingPlaceId(p.id)
  }

  const startEditPlace = (p) => {
    // 'comingFrom' is the current field; older walk entries used 'startFrom'
    // with the custom start stored on the place's own coordinates.
    const comingFrom = p.comingFrom ?? p.startFrom ?? 'hotel'
    const migrated =
      comingFrom === 'custom' && p.fromLat == null && p.lat != null
        ? {
            fromName: p.name,
            fromAddress: p.address,
            fromLat: p.lat,
            fromLng: p.lng,
          }
        : {}
    setPlaceFields({ ...p, comingFrom, ...migrated })
    setEditingPlaceId(p.id)
  }

  const handlePlacePick = useCallback((r) => {
    // r.name is Nominatim's full display name; use the lead part as the
    // place name and the full string as the address.
    const parts = r.name
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    setPlaceFields((f) => ({
      ...f,
      name: parts[0] || f.name,
      lat: r.lat,
      lng: r.lng,
      address: r.name,
    }))
  }, [])

  const handleDestPick = useCallback((r) => {
    const parts = r.name
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    setPlaceFields((f) => ({
      ...f,
      destName: parts[0] || f.destName,
      destLat: r.lat,
      destLng: r.lng,
      destAddress: r.name,
    }))
  }, [])

  // Custom starting point for a normal place: where we're coming from.
  const handleFromPick = useCallback((r) => {
    const parts = r.name
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    setPlaceFields((f) => ({
      ...f,
      fromName: parts[0] || f.fromName,
      fromAddress: r.name,
      fromLat: r.lat,
      fromLng: r.lng,
    }))
  }, [])

  const savePlace = useCallback(
    (e) => {
      e.preventDefault()
      const isNew = !city?.places?.some((p) => p.id === placeFields.id)
      const final = {
        ...placeFields,
        name: placeFields.name.trim() || 'Untitled',
      }
      if (isNew) {
        updateCity(tripId, cityId, {
          places: [...(city?.places ?? []), final],
        })
      } else {
        updatePlace(tripId, cityId, final.id, final)
      }
      setEditingPlaceId(null)
    },
    [placeFields, city, tripId, cityId, updateCity, updatePlace],
  )

  const removePlace = useCallback(
    (placeId) => {
      if (confirm('Remove this place?')) {
        updateCity(tripId, cityId, {
          places: city.places.filter((p) => p.id !== placeId),
        })
        if (editingPlaceId === placeId) setEditingPlaceId(null)
      }
    },
    [city, tripId, cityId, updateCity, editingPlaceId],
  )

  // Compute routes from each place's origin (hotel, another place, or a chosen
  // "coming from" point) to the place (async). Walks draw their own
  // start→dest line, so they're skipped here.
  const computeAllRoutes = useCallback(async () => {
    if (!hotel || hotel.lat == null || hotel.lng == null) return
    const targets = placeList.filter(
      (p) =>
        p.type !== 'walk' &&
        p.lat != null &&
        p.lng != null &&
        p.id !== editingPlaceId,
    )
    if (targets.length === 0) {
      setRoutes({})
      return
    }
    setRouteLoading(true)
    const next = {}
    for (const p of targets) {
      const from = resolveOrigin(p, hotel, placeList)
      if (!from) continue
      const route = await fetchRouteForMode(
        { lat: from.lat, lng: from.lng },
        { lat: p.lat, lng: p.lng },
        routeMode,
      )
      next[p.id] = { ...route, fromName: from.name }
    }
    setRoutes(next)
    setRouteLoading(false)
  }, [hotel, placeList, editingPlaceId, routeMode])

  useEffect(() => {
    computeAllRoutes()
  }, [computeAllRoutes])

  const routeLines = useMemo(() => {
    const lines = []
    for (const p of placeList) {
      const r = routes[p.id]
      if (r) {
        lines.push({
          ...r,
          fromName: r.fromName || hotel?.name,
          toName: p.name,
          placeId: p.id,
        })
      }
    }
    return lines
  }, [placeList, routes, hotel])

  if (!trip || !city) {
    return (
      <section className="page">
        <p>City not found.</p>
        <Link to="/" className="btn">
          Back to trips
        </Link>
      </section>
    )
  }

  const withCoords = placeList.filter((p) => p.lat != null && p.lng != null)
  const withoutCoords = placeList.filter((p) => p.lat == null || p.lng == null)

  return (
    <section className="page">
      <div className="page-head">
        <h1>{city.name}</h1>
        <Link to={`/trip/${tripId}`} className="back-link">
          ← {trip.name}
        </Link>
      </div>

      {/* Flights for this city */}
      <section className="section">
        <div className="section-head">
          <h2>✈️ Flights for this city</h2>
        </div>
        {cityFlights.length === 0 ? (
          <div className="empty">
            <p>No flights match this city's dates. Add flight legs in the trip.</p>
          </div>
        ) : (
          <div className="flight-legs">
            {cityFlights.map((f, i) => (
              <div key={i} className="card flight-leg">
                <div className="flight-leg-head">
                  <span className="leg-badge">Leg</span>
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
                    <span className="muted">
                      {f.departureTime
                        ? formatDate(f.departureTime)
                        : ''}
                    </span>
                  </div>
                  <span className="arrow">→</span>
                  <div>
                    <span className="airport">
                      {f.arrivalAirport || '?'}
                    </span>
                    <span className="muted">
                      {f.arrivalTime ? formatDate(f.arrivalTime) : ''}
                    </span>
                  </div>
                </div>
                {f.bookingRef && (
                  <p className="muted">Booking ref: {f.bookingRef}</p>
                )}
                {f.notes && <p className="notes">{f.notes}</p>}
                <Link to={`/trip/${tripId}`} className="btn btn-sm">
                  Edit flights
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Hotel */}
      <section className="section">
        <div className="section-head">
          <h2>🏨 Hotel</h2>
          <button className="btn btn-sm" onClick={() => setEditingHotel((v) => !v)}>
            {editingHotel ? 'Cancel' : hotel ? 'Edit' : '+ Add hotel'}
          </button>
        </div>

        {editingHotel ? (
          <form className="card form" onSubmit={saveHotel}>
            <HotelSearch
              value={hotelFields.name}
              onValueChange={(v) => setHotelFields({ ...hotelFields, name: v })}
              cityName={city.name}
              onPick={handleHotelPick}
            />
            <div className="form-row">
              <label>
                Check-in
                <input
                  type="date"
                  value={hotelFields.checkIn}
                  onChange={(e) =>
                    setHotelFields({ ...hotelFields, checkIn: e.target.value })
                  }
                />
              </label>
              <label>
                Check-out
                <input
                  type="date"
                  value={hotelFields.checkOut}
                  onChange={(e) =>
                    setHotelFields({ ...hotelFields, checkOut: e.target.value })
                  }
                />
              </label>
            </div>
            <label>
              Address
              <input
                value={hotelFields.address}
                onChange={(e) => setHotelFields({ ...hotelFields, address: e.target.value })}
              />
            </label>
            <div className="form-row">
              <label>
                Phone
                <input
                  value={hotelFields.phone}
                  onChange={(e) => setHotelFields({ ...hotelFields, phone: e.target.value })}
                />
              </label>
              <label>
                Website
                <input
                  value={hotelFields.website}
                  onChange={(e) => setHotelFields({ ...hotelFields, website: e.target.value })}
                  placeholder="https://…"
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Coordinates
                <input
                  readOnly
                  value={
                    hotelFields.lat != null
                      ? `${hotelFields.lat.toFixed(5)}, ${hotelFields.lng.toFixed(5)}`
                      : 'Not set'
                  }
                />
              </label>
            </div>
            <label>
              Notes
              <textarea
                value={hotelFields.notes}
                onChange={(e) => setHotelFields({ ...hotelFields, notes: e.target.value })}
                rows={2}
              />
            </label>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit">Save hotel</button>
              {hotel && (
                <button className="btn btn-danger" type="button" onClick={removeHotel}>
                  Remove
                </button>
              )}
            </div>
          </form>
        ) : hotel ? (
          <div className="card">
            <h3>{hotel.name}</h3>
            {hotel.checkIn || hotel.checkOut ? (
              <p className="muted">
                📅 {formatDate(hotel.checkIn) || '…'} –{' '}
                {formatDate(hotel.checkOut) || '…'}
              </p>
            ) : null}
            {hotel.address && <p>{hotel.address}</p>}
            {hotel.phone && <p className="muted">☎️ {hotel.phone}</p>}
            {hotel.website && (
              <p className="muted">
                🌐{' '}
                <a href={hotel.website} target="_blank" rel="noreferrer">
                  {hotel.website.replace(/^https?:\/\//, '')}
                </a>
              </p>
            )}
            {hotel.notes && <p className="notes">{hotel.notes}</p>}
            {hotel.lat == null && <p className="error-text">No coordinates set</p>}
          </div>
        ) : (
          <div className="empty">
            <p>No hotel yet. Add one to place it on the map and plan routes.</p>
          </div>
        )}
      </section>

      {/* Airport transfers */}
      <section className="section">
        <div className="section-head">
          <h2>✈️ Airport transfers</h2>
          <button
            className="btn btn-sm"
            onClick={() =>
              editingAirport ? setEditingAirport(false) : openAirportForm()
            }
          >
            {editingAirport ? 'Cancel' : city.airportTransport ? 'Edit' : '+ Add'}
          </button>
        </div>

        {editingAirport ? (
          <form className="card form" onSubmit={saveAirport}>
            <h3>Arrival → Hotel</h3>
            <label>
              Airport
              <input
                value={arrivalFields.airportName}
                onChange={(e) =>
                  setArrivalFields({ ...arrivalFields, airportName: e.target.value })
                }
                placeholder="e.g. Narita (NRT)"
              />
            </label>
            {airportSuggestions.length > 0 && (
              <AirportChips
                airports={airportSuggestions}
                onPick={(s) =>
                  setArrivalFields({ ...arrivalFields, airportName: s })
                }
              />
            )}
            <div className="form-row">
              <label>
                Transport mode
                <select
                  value={arrivalFields.mode}
                  onChange={(e) =>
                    setArrivalFields({ ...arrivalFields, mode: e.target.value })
                  }
                >
                  {TRANSPORT_MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Approx cost
                <input
                  value={arrivalFields.cost}
                  onChange={(e) =>
                    setArrivalFields({ ...arrivalFields, cost: e.target.value })
                  }
                  placeholder="e.g. ¥3,200"
                />
              </label>
            </div>
            <label>
              Notes
              <textarea
                value={arrivalFields.notes}
                onChange={(e) =>
                  setArrivalFields({ ...arrivalFields, notes: e.target.value })
                }
                rows={2}
                placeholder="e.g. Take the NEX to Shinjuku then walk 5 min"
              />
            </label>

            <h3>Hotel → Departure</h3>
            <label>
              Airport
              <input
                value={departureFields.airportName}
                onChange={(e) =>
                  setDepartureFields({ ...departureFields, airportName: e.target.value })
                }
                placeholder="e.g. Kansai (KIX)"
              />
            </label>
            {airportSuggestions.length > 0 && (
              <AirportChips
                airports={airportSuggestions}
                onPick={(s) =>
                  setDepartureFields({ ...departureFields, airportName: s })
                }
              />
            )}
            <div className="form-row">
              <label>
                Transport mode
                <select
                  value={departureFields.mode}
                  onChange={(e) =>
                    setDepartureFields({ ...departureFields, mode: e.target.value })
                  }
                >
                  {TRANSPORT_MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Approx cost
                <input
                  value={departureFields.cost}
                  onChange={(e) =>
                    setDepartureFields({ ...departureFields, cost: e.target.value })
                  }
                  placeholder="e.g. $45"
                />
              </label>
            </div>
            <label>
              Notes
              <textarea
                value={departureFields.notes}
                onChange={(e) =>
                  setDepartureFields({ ...departureFields, notes: e.target.value })
                }
                rows={2}
                placeholder="e.g. Book shuttle the day before"
              />
            </label>

            <div className="form-actions">
              <button className="btn btn-primary" type="submit">
                Save transfers
              </button>
              {city.airportTransport && (
                <button className="btn btn-danger" type="button" onClick={removeAirport}>
                  Remove
                </button>
              )}
            </div>
          </form>
        ) : city.airportTransport ? (
          <div className="card-grid two">
            <TransferCard
              title="Arrival → Hotel"
              data={city.airportTransport.arrival}
            />
            <TransferCard
              title="Hotel → Departure"
              data={city.airportTransport.departure}
            />
          </div>
        ) : (
          <div className="empty">
            <p>No airport transfer details. Add them to remember how to get around.</p>
          </div>
        )}
      </section>

      {/* Places */}
      <section className="section">
        <div className="section-head">
          <h2>📍 Places</h2>
          <div className="btn-group">
            <button className="btn btn-sm" onClick={() => startAddPlace('attraction')}>
              + Attraction
            </button>
            <button className="btn btn-sm" onClick={() => startAddPlace('restaurant')}>
              + Restaurant
            </button>
          </div>
        </div>

        {editingPlaceId && (
          <form className="card form" onSubmit={savePlace}>
            <h3>{placeList.some((p) => p.id === placeFields.id) ? 'Edit place' : 'Add place'}</h3>
            <div className="form-row">
              <label>
                Type
                <select
                  value={placeFields.type}
                  onChange={(e) => setPlaceFields({ ...placeFields, type: e.target.value })}
                >
                  {PLACE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.icon} {t.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {placeFields.type === 'walk' ? (
              <>
                <label>
                  Walk name
                  <input
                    value={placeFields.name}
                    onChange={(e) =>
                      setPlaceFields({ ...placeFields, name: e.target.value })
                    }
                    placeholder="e.g. Evening stroll through the old town"
                  />
                </label>
                <ComingFromBox
                  title="🚶 Getting there"
                  placeFields={placeFields}
                  setPlaceFields={setPlaceFields}
                  handleFromPick={handleFromPick}
                  placeList={placeList}
                  hotel={hotel}
                />
                <div className="dest-box">
                  <h4>🏁 Destination</h4>
                  <label>
                    Destination
                    <PlaceSearch
                      value={placeFields.destName}
                      onValueChange={(v) =>
                        setPlaceFields({ ...placeFields, destName: v })
                      }
                      onPick={handleDestPick}
                      cityName={city.name}
                      placeholder="Where does this walk end?…"
                    />
                  </label>
                  <div className="form-row">
                    <label>
                      Destination address
                      <input
                        value={placeFields.destAddress}
                        onChange={(e) =>
                          setPlaceFields({ ...placeFields, destAddress: e.target.value })
                        }
                      />
                    </label>
                  </div>
                  <div className="form-row">
                    <label>
                      Destination coordinates
                      <input
                        readOnly
                        value={
                          placeFields.destLat != null
                            ? `${placeFields.destLat.toFixed(5)}, ${placeFields.destLng.toFixed(5)}`
                            : 'Not set'
                        }
                      />
                    </label>
                  </div>
                </div>
              </>
            ) : (
              <>
                <ComingFromBox
                  title="🧭 Where you&apos;re coming from"
                  placeFields={placeFields}
                  setPlaceFields={setPlaceFields}
                  handleFromPick={handleFromPick}
                  placeList={placeList}
                  hotel={hotel}
                />
                <label>
                  Name
                  <PlaceSearch
                    value={placeFields.name}
                    onValueChange={(v) => setPlaceFields({ ...placeFields, name: v })}
                    onPick={handlePlacePick}
                    cityName={city.name}
                    placeholder="Search the place to pin it on the map…"
                  />
                </label>
                <label>
                  Address
                  <input
                    value={placeFields.address}
                    onChange={(e) => setPlaceFields({ ...placeFields, address: e.target.value })}
                  />
                </label>
              </>
            )}
            <div className="form-row">
              <label>
                Priority
                <select
                  value={placeFields.priority}
                  onChange={(e) => setPlaceFields({ ...placeFields, priority: e.target.value })}
                >
                  <option value="must">Must see</option>
                  <option value="normal">Nice to see</option>
                </select>
              </label>
              <label>
                Date
                <input
                  type="date"
                  value={placeFields.date}
                  onChange={(e) => setPlaceFields({ ...placeFields, date: e.target.value })}
                />
              </label>
              <label>
                Coordinates
                <input
                  readOnly
                  value={
                    placeFields.lat != null
                      ? `${placeFields.lat.toFixed(5)}, ${placeFields.lng.toFixed(5)}`
                      : 'Not set'
                  }
                />
              </label>
            </div>
            <label>
              Notes
              <textarea
                value={placeFields.notes}
                onChange={(e) => setPlaceFields({ ...placeFields, notes: e.target.value })}
                rows={2}
                placeholder="Tips, opening hours, phone number…"
              />
            </label>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit">
                {placeList.some((p) => p.id === placeFields.id) ? 'Save' : 'Add place'}
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => setEditingPlaceId(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {placeList.length === 0 && (
          <div className="empty">
            <p>No places yet. Add attractions and restaurants to plan your route.</p>
          </div>
        )}

        <ul className="place-list">
          {sortByDate(placeList, 'date').map((p) => (
            <li key={p.id} className="card place-item">
              <div className="place-item-main">
                <span className="place-icon">{typeInfo(p.type).icon}</span>
                <div>
                  <strong>
                    {p.name}{' '}
                    {p.priority === 'must' && <span className="tag">Must</span>}
                  </strong>
                  {p.date && <p className="muted">📅 {formatDate(p.date)}</p>}
                  {p.address && <p className="muted">{p.address}</p>}
                  {p.type === 'walk' && p.destName && (
                    <p className="muted">🏁 → {p.destName}</p>
                  )}
                  {routes[p.id] && (
                    <p className="route-pill">
                      From {routes[p.id].fromName || 'hotel'}:{' '}
                      {formatDistance(routes[p.id].distanceMeters)} ·{' '}
                      {formatDuration(routes[p.id].durationSeconds)} ·{' '}
                      {MODE_EMOJI[routes[p.id].mode]} {MODE_LABELS[routes[p.id].mode]}
                      {routes[p.id].approx && (
                        <span className="muted"> (estimate)</span>
                      )}
                    </p>
                  )}
                  {!routes[p.id] && p.lat != null && hotel?.lat != null && (
                    <p className="muted">Route unavailable</p>
                  )}
                  {p.lat == null && <p className="error-text">📍 Map pin missing</p>}
                </div>
              </div>
              <div className="place-item-actions">
                <button className="btn btn-sm" onClick={() => startEditPlace(p)}>
                  Edit
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => removePlace(p.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Route overview */}
      <section className="section">
        <div className="section-head">
          <h2>🗺️ Route planning</h2>
          <select
            className="route-mode-select"
            value={routeMode}
            onChange={(e) => setRouteMode(e.target.value)}
            title="Transport mode"
            aria-label="Transport mode"
          >
            {ROUTE_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.emoji} {m.label}
              </option>
            ))}
          </select>
          {routeLoading && <span className="muted">Routing…</span>}
          <button className="btn btn-sm" onClick={computeAllRoutes}>
            Recalculate routes
          </button>
        </div>

        {!hotel?.lat ? (
          <div className="empty">
            <p>Add hotel coordinates to plan routes from the hotel.</p>
          </div>
        ) : (
          <>
            <div className="map-box">
              <TripMap
                hotel={hotel}
                places={withCoords}
                routes={routeLines}
              />
            </div>

            {routeLines.length > 0 && (
              <ul className="route-list">
                {routeLines.map((r) => (
                  <li key={r.placeId} className="route-item">
                    <span className="route-to">{r.toName}</span>
                    <span className="route-meta">
                      {formatDistance(r.distanceMeters)} · {formatDuration(r.durationSeconds)}
                    </span>
                    <span className={`route-mode route-${r.mode}`}>
                      {MODE_EMOJI[r.mode]} {MODE_LABELS[r.mode]}
                      {r.approx && ' (est.)'}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {withoutCoords.length > 0 && (
              <p className="muted">
                {withoutCoords.length} place(s) missing map pins were not routed.
              </p>
            )}
          </>
        )}
      </section>
    </section>
  )
}

function TransferCard({ title, data }) {
  const modeLabel =
    TRANSPORT_MODES.find((m) => m.value === data?.mode)?.label ?? '—'
  if (!data?.airportName) {
    return (
      <div className="card">
        <h3>{title}</h3>
        <p className="muted">Not set</p>
      </div>
    )
  }
  return (
    <div className="card">
      <h3>{title}</h3>
      <p>
        <strong>{data.airportName}</strong>
      </p>
      <p className="muted">🛻 {modeLabel}</p>
      {data.cost && <p className="muted">💰 {data.cost}</p>}
      {data.notes && <p className="notes">{data.notes}</p>}
    </div>
  )
}

function AirportChips({ airports, onPick }) {
  return (
    <div className="airport-chips">
      <span className="muted">From flights:</span>
      {airports.map((s) => (
        <button
          key={s}
          type="button"
          className="chip"
          onClick={() => onPick(s)}
        >
          ✈️ {s}
        </button>
      ))}
    </div>
  )
}