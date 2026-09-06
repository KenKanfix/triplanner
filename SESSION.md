# Session History

Durable record of the Triplanner build, decisions, and current state. Updated at the end of each working session.

## Project

Overseas trip-planning PWA (React + Vite). Everything runs on-device; data is kept in `localStorage`.

- Repo: `C:\Users\tj2ng\My-Repo\Triplanner` (GitHub `KenKanfix/triplanner`)
- Live: **https://kenkanfix.github.io/triplanner/** (auto-deploy on push to `main`)
- Vite `base: '/triplanner/'`, PWA via `vite-plugin-pwa` (precache only `js,css,html,svg,png,ico`)
- Offline-first: install from Chrome/Edge via "Add to Home Screen" / "Install app"

Stack: React 18, react-router, react-leaflet, OSRM (public server), Overpass + Nominatim, Aviationstack (optional key), Vite 8, oxlint.

## Data model

- **Trip**: `{ id, name, startDate, endDate, notes, cities[], flights[] }`
- **Flight leg**: `{ airline, flightNo, departureAirport, arrivalAirport, departureTime, arrivalTime, bookingRef, notes }`
- **City**: `{ id, name, country, arrivalDate, departureDate, hotel, airportTransport, places[], routeMode }` (`routeMode`: `'auto' | 'walk' | 'taxi' | 'public'`, default `'auto'`)
- **Place**: see `newPlace()` in `src/store/TripsContext.jsx` (`type` = attraction | restaurant | shopping | market | streetFood | walk; `lat/lng`, `dest*`, `comingFrom`, `fromPlaceId`, `from*` coordinates)
- localStorage key: `triplanner.trips`. Migrations live in `src/lib/store.js` (legacy single-flight → `flights[]`).
- Other localStorage: `triplanner.aviationstackKey` (flights), `triplanner.trips` (backups imports merge by trip id).

## File map

- `src/pages/Dashboard.jsx` — My Trips list; create/delete; **export/import JSON backup** (⬇️/⬆️)
- `src/pages/TripDetail.jsx` — flights form + 🗺️ Itinerary timeline; airport-code→city hints; auto-add arrival city
- `src/pages/CityDetail.jsx` — hotel, transfers, places, route planning (mode selector + OSRM routes + map)
- `src/components/TripMap.jsx` — react-leaflet map (OSM tiles; English-only labels)
- `src/store/TripsContext.jsx` — trips state + mutators (`addTrip/updateTrip/deleteTrip/importTrips/updateCity/updatePlace`)
- `src/lib/routing.js` — OSRM `fetchRoute`, `fetchRouteForMode` (auto/walk/taxi/public), `recommendMode`, formatters, `MODE_LABELS/EMOJI`
- `src/lib/itinerary.js` — `buildItinerary(flights, cities)` date-sorted timeline (flight before city on same day)
- `src/lib/airports.js` + `src/data/airports.json` — IATA→city lookup (8,697 airports, compact `n/c/y` keys; overrides NRT→Tokyo, KIX→Osaka, EWR→New York, IAD/BWI→Washington)
- `src/lib/tripExport.js` — export/import serializer, parser, `mergeTrips`
- `src/lib/store.js` — localStorage load/save + `uid()`
- `src/lib/flights.js` — Aviationstack lookup + key helpers
- `src/lib/format.js` — `formatDate`, `sortByDate`, `cityDateRange`
- `src/main.jsx` — pull-to-refresh guard (touchstart/touchmove at top)
- `src/index.css` — styles (`.itinerary*`, `.route-mode`, `.airport-city`, `.check-row`)

## Feature history (all committed, pushed)

| Commit | What |
| --- | --- |
| `157a87c` | Initial deploy workflow + PWA scaffold |
| `317c2c9`, `e79d200` | Fix manifest/icon paths for `/triplanner/` base; city date fields |
| `d0db08c` | Hotel check-in/out dates; sort lists by date |
| `c255664` | Filter flights by city dates, show per city |
| `1a88c58` | Airport codes → city (OurAirports dataset + country overrides); auto-add arrival city |
| `be1ece9` | Fix airport city label showing `undefined` (compact key bug) |
| `094ea2b` | Disable pull-to-refresh in PWA |
| `02e4a17` | 🗺️ Itinerary timeline merging flights + cities (replaced separate sections) |
| `5e68666` | Transport-mode selector (Auto / Walk / Taxi·share ride / Public). Walk→OSRM walking, taxi→driving, public = road geometry + ~18 km/h estimate (`approx`, "estimate"/"(est.)" markers); stored per city in `city.routeMode` |
| `11ae804` | Export/Import trips as `triplanner-trips-YYYY-MM-DD.json` (envelope `{app,version,exportedAt,trips}`; merge by id; accepts bare array; coordinates kept in backup only, never shown in UI) |

## Decisions / limitations

- **Map language**: free raster tiles (OSM, Geoapify, MapTiler raster) are English-only; language switching requires MapTiler's vector SDK (MapLibre) + free key and replacing react-leaflet. **Decided: skip** (updated 2026-09-06).
- **Public transport routing**: OSRM has no transit profile → public mode is an estimate (road route, ~18 km/h incl. wait), labelled "estimate" in pills.
- Coordinates are data only; nothing in the UI displays raw lat/lng (per user: "for display purposes we probably don't need to show coordinates").

## Commands & quirks

- `npm run dev` / `npm run build` / `npm run lint` (oxlint) / `npm run preview`
- Build passes; lint shows only pre-existing warnings (TripsContext `only-export-components`, CityDetail `set-state-in-effect` + `exhaustive-deps`).
- Windows PowerShell 5.1: no `&&` (use `;` / `if ($?)`), `>` writes UTF-16 (prefer writing files from scripts), use `npm.cmd` with `Start-Process`.
- Dataset chunk `airports-h0gx3amv.js` ~546 kB (dynamic import of `airports.json`).