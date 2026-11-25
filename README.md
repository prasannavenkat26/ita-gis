# Farm GIS Mapping System

An interactive GIS platform for agricultural land management with GPS coordinates, interactive maps, farm boundary polygons, land area calculations, crop records, irrigation locations, and spatial analytics.

## Features

- **Interactive GIS Explorer** — Pan, zoom, search, and switch between street, satellite, and terrain map layers using Leaflet/OpenStreetMap
- **Farm Boundary Drawing** — Draw, edit, and save polygon boundaries directly on the map with geodesic area calculation
- **Area Calculation** — Accurate spherical polygon area in both hectares and acres with automatic unit conversion
- **Farm Management** — Full CRUD for farm records with search, filters, sorting, pagination, and confirmation dialogs
- **Crop Management** — Track crop types, planting dates, soil conditions, and irrigation methods
- **Irrigation Point Management** — Map and categorize irrigation infrastructure (drip valves, sprinklers, pivots, pumps)
- **Spatial Analytics** — Crop distribution, area comparisons, irrigation coverage, and location-based summaries with interactive charts
- **GeoJSON Import/Export** — Import existing boundaries or export farm polygons as GeoJSON
- **Authentication** — Email/password auth with signed sessions and per-user data access
- **Dark/Light Themes** — Toggle between themes with system preference detection
- **Responsive Design** — Desktop-first dashboard that adapts to tablet and mobile with drawers/bottom sheets

## Tech Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Mapping:** Leaflet + OpenStreetMap (Google Maps optional via env var)
- **Charts:** Recharts
- **Backend:** Python FastAPI + SQLite
- **Authentication:** PBKDF2 password hashing and signed bearer tokens
- **Icons:** Lucide React

## Run locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up and start the Python backend in a second terminal:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # macOS/Linux:
   source .venv/bin/activate
   pip install -r backend/requirements.txt
   python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
   ```
   The API documentation is available at `http://127.0.0.1:8000/docs`.

3. Start the React development server in another terminal:
   ```bash
   npm run dev
   ```
   Open `http://127.0.0.1:5173`. Vite forwards `/api` requests to FastAPI.

4. Build for production:
   ```bash
   npm run build
   ```

## Backend and database

The FastAPI application is in `backend/main.py`. SQLite is initialized automatically on first startup and stores:

- user accounts with salted PBKDF2 password hashes
- farm records and GeoJSON Polygon boundaries
- irrigation points and farm activity history

API requests require a signed bearer token. Records are scoped to the signed-in user. The database and generated development signing key are stored in the ignored `backend/data/` directory. For deployment, set `FARM_GIS_SECRET_KEY` to a long random server-side secret and configure `FARM_GIS_CORS_ORIGINS`.

## Map Provider Configuration

The app opens on India using OpenStreetMap/Leaflet by default (no API key needed). To use Google Maps instead:

1. Add `VITE_GOOGLE_MAPS_API_KEY=your_key` to `.env`
2. The app will detect the key and enable Google Maps with Drawing, Geometry, and Places

## Area Calculation

Polygon areas are calculated using the spherical excess formula on the Earth's surface (radius = 6,378,137m), providing accurate geodesic measurements. Results are shown in both hectares and acres.

Password-reset email delivery is not configured in the local backend. The reset screen reports this rather than pretending an email was sent.

## Optional Modules

Weather, satellite monitoring, soil sensors, and IoT integrations are shown as optional modules in the Analytics page. They display connection status and configuration instructions until API keys are added.

## License

MIT
