# Triplanner

Plan your overseas trips — flights, hotels, airport transfers, and places to visit — entirely on your device (offline PWA).

Live: **https://kenkanfix.github.io/triplanner/**

Install on your phone: open the URL in Chrome/Edge, then **Add to Home Screen** / **Install app** for a standalone app experience with the Triplanner icon.

## Features

- Trips with multiple cities and multi-leg flights
- Aviationstack flight lookup (paste your API key in ⚙️ Settings)
- Hotel search (Overpass + Nominatim geocoding)
- Airport transfer details
- Places to visit (attraction, restaurant, shopping, market, street food, walk/scenic route)
- "Coming from" origins — hotel, another pinned place, or a custom point
- Walking/route planning with OSRM routing (walk / public / taxi)
- Leaflet + OpenStreetMap map
- All data stored in your browser's localStorage — nothing uploaded

## Development

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

Deploy: push to `main`; a GitHub Actions workflow builds and deploys to GitHub Pages. The app is served from the `/triplanner/` base path (see `base` in `vite.config.js`).
