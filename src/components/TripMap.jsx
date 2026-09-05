import { useEffect, useMemo } from 'react'
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { typeInfo } from '../lib/placeTypes'
import { resolveOrigin } from '../lib/placeOrigin'

const hotelIcon = L.divIcon({
  className: 'custom-marker',
  html: '<div class="marker-dot hotel">🏨</div>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

const destIcon = L.divIcon({
  className: 'custom-marker',
  html: '<div class="marker-dot dest">🏁</div>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

const fromIcon = L.divIcon({
  className: 'custom-marker',
  html: '<div class="marker-dot from">🧭</div>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

function mkIcon(cls, emoji) {
  return () =>
    L.divIcon({
      className: 'custom-marker',
      html: `<div class="marker-dot ${cls}">${emoji}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    })
}

const iconCache = {}
function placeIcon(type) {
  const info = typeInfo(type)
  if (!iconCache[info.cls]) iconCache[info.cls] = mkIcon(info.cls, info.icon)()
  return iconCache[info.cls]
}

function FitToPoints({ points }) {
  const map = useMap()
  useEffect(() => {
    if (points.length >= 2) {
      const bounds = L.latLngBounds(points.map(([lat, lng]) => L.latLng(lat, lng)))
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [map, points])
  return null
}

export default function TripMap({
  hotel,
  places,
  routes = [],
  onSelectPlace,
  center = [20, 0],
  zoom = 12,
}) {
  const points = useMemo(() => {
    const pts = []
    if (hotel && hotel.lat != null && hotel.lng != null)
      pts.push([hotel.lat, hotel.lng])
    for (const p of places) {
      if (p.lat != null && p.lng != null) pts.push([p.lat, p.lng])
      if (p.destLat != null && p.destLng != null) pts.push([p.destLat, p.destLng])
      if (p.fromLat != null && p.fromLng != null) pts.push([p.fromLat, p.fromLng])
    }
    return pts
  }, [hotel, places])

  const centerPos = points.length > 0 ? points[0] : center
  const fit = points.length >= 2

  return (
    <MapContainer
      key={fit ? 'fit' : 'nofit'}
      center={centerPos}
      zoom={fit ? undefined : zoom}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {fit && <FitToPoints points={points} />}

      {hotel && hotel.lat != null && hotel.lng != null && (
        <Marker position={[hotel.lat, hotel.lng]} icon={hotelIcon}>
          <Popup>
            <strong>🏨 {hotel.name || 'Hotel'}</strong>
          </Popup>
        </Marker>
      )}

      {places.map((p) => {
        const isWalkWithDest =
          p.type === 'walk' && p.destLat != null && p.destLng != null
        if (p.lat == null && p.lng == null && !isWalkWithDest) return null

        // Walks draw a start → destination line and a 🏁 end marker. The
        // start resolves to the hotel, another place, or a custom point.
        if (isWalkWithDest) {
          const origin = resolveOrigin(p, hotel, places)
          if (!origin) return null
          const start = [origin.lat, origin.lng]
          return (
            <div key={`walk-${p.id}`}>
              {p.comingFrom !== 'hotel' && (
                <Marker position={start} icon={fromIcon}>
                  <Popup>
                    <strong>🧭 {origin.name || 'Starting point'}</strong>
                  </Popup>
                </Marker>
              )}
              <Polyline
                positions={[
                  start,
                  [p.destLat, p.destLng],
                ]}
                pathOptions={{
                  color: '#2e7d32',
                  weight: 3,
                  opacity: 0.85,
                  dashArray: '6 8',
                }}
              />
              <Marker position={[p.destLat, p.destLng]} icon={destIcon}>
                <Popup>
                  <strong>🏁 {p.destName || 'Destination'}</strong>
                </Popup>
              </Marker>
            </div>
          )
        }

        const icon = placeIcon(p.type)
        const origin = resolveOrigin(p, hotel, places)
        const customMarker =
          (p.comingFrom === 'custom' &&
            p.fromLat != null &&
            p.fromLng != null) ||
          (p.comingFrom === 'place' && p.fromPlaceId)
        return (
          <div key={p.id}>
            {customMarker && origin && (
              <Marker position={[origin.lat, origin.lng]} icon={fromIcon}>
                <Popup>
                  <strong>🧭 {origin.name || 'Starting point'}</strong>
                </Popup>
              </Marker>
            )}
            <Marker
              position={[p.lat, p.lng]}
              icon={icon}
              eventHandlers={
                onSelectPlace ? { click: () => onSelectPlace(p.id) } : undefined
              }
            >
              <Popup>
                <strong>
                  {typeInfo(p.type).icon} {p.name}
                </strong>
                {p.notes && <p>{p.notes}</p>}
              </Popup>
            </Marker>
          </div>
        )
      })}

      {routes.map((r, i) =>
        r.geometry ? (
          <Polyline
            key={i}
            positions={r.geometry.coordinates.map((c) => [c[1], c[0]])}
            pathOptions={{
              color:
                r.mode === 'walk'
                  ? '#2e7d32'
                  : r.mode === 'public'
                    ? '#1565c0'
                    : '#c62828',
              weight: 4,
              opacity: 0.8,
            }}
          />
        ) : null,
      )}
    </MapContainer>
  )
}