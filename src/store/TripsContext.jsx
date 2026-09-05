import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { loadTrips, saveTrips } from '../lib/store'

export function newTrip() {
  return {
    id: '',
    name: '',
    startDate: '',
    endDate: '',
    notes: '',
    cities: [],
  }
}

export function newCity() {
  return {
    id: '',
    name: '',
    country: '',
    arrivalDate: '',
    departureDate: '',
    hotel: null,
    airportTransport: null,
    places: [],
  }
}

export function newPlace(type = 'attraction') {
  return {
    id: '',
    name: '',
    type, // 'attraction' | 'restaurant' | 'shopping' | 'market' | 'streetFood' | 'walk'
    lat: null,
    lng: null,
    address: '',
    notes: '',
    priority: 'normal',
    // Destination end point, used for walk / scenic route type places.
    destName: '',
    destLat: null,
    destLng: null,
    destAddress: '',
    // Where we're coming from: 'hotel' (default), 'place', or 'custom'.
    comingFrom: 'hotel',
    // When coming from another pinned place, its id.
    fromPlaceId: '',
    // Custom starting point coordinates/name (non-walk places; the actual
    // route origin on the map).
    fromName: '',
    fromAddress: '',
    fromLat: null,
    fromLng: null,
  }
}

const TripsContext = createContext(null)

export function TripsProvider({ children }) {
  const [trips, setTrips] = useState(() => loadTrips())

  useEffect(() => {
    saveTrips(trips)
  }, [trips])

  const addTrip = useCallback((trip) => {
    setTrips((prev) => [...prev, trip])
  }, [])

  const updateTrip = useCallback((id, patch) => {
    setTrips((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    )
  }, [])

  const deleteTrip = useCallback((id) => {
    setTrips((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // City operations within a trip
  const updateCity = useCallback((tripId, cityId, patch) => {
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== tripId) return t
        return {
          ...t,
          cities: t.cities.map((c) =>
            c.id === cityId ? { ...c, ...patch } : c,
          ),
        }
      }),
    )
  }, [])

  // Place operations within a city
  const updatePlace = useCallback((tripId, cityId, placeId, patch) => {
    setTrips((prev) =>
      prev.map((t) =>
        t.id !== tripId
          ? t
          : {
              ...t,
              cities: t.cities.map((c) =>
                c.id !== cityId
                  ? c
                  : {
                      ...c,
                      places: c.places.map((p) =>
                        p.id === placeId ? { ...p, ...patch } : p,
                      ),
                    },
              ),
            },
      ),
    )
  }, [])

  return (
    <TripsContext.Provider
      value={{
        trips,
        addTrip,
        updateTrip,
        deleteTrip,
        updateCity,
        updatePlace,
      }}
    >
      {children}
    </TripsContext.Provider>
  )
}

export function useTrips() {
  const ctx = useContext(TripsContext)
  if (!ctx) throw new Error('useTrips must be used within TripsProvider')
  return ctx
}
