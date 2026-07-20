# 🌍 Bizby: Spatial Intelligence Platform

![Bizby Banner](https://img.shields.io/badge/Geospatial%20Analytics-Powered%20by%20PostGIS-f59e0b?style=for-the-badge&logo=postgresql) 
![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi)

Bizby is a powerful, production-ready geospatial analytics and spatial intelligence platform. Designed to seamlessly fetch, process, and analyze location data, Bizby equips decision-makers, urban planners, and supply chain managers with actionable insights on a sleek, high-performance UI.

## ✨ Core Features

### 📍 Interactive Spatial Dashboard
- **Live Map Visualization:** High-fidelity maps built with Leaflet and MapLibre GL. Supports Dark Street and Satellite modes.
- **Bento Grid Analytics:** Instantly view statistics, query execution times, and categorical breakdowns of Points of Interest (POIs) in a selected region.
- **Dynamic Filtering:** Filter locations on the map and data lists by Business Categories (Cafes, Tech, Healthcare, Retail, etc.) in real-time.
- **Search History & Replay:** Automatically tracks session search history, allowing users to rapidly "replay" past spatial queries.

### 🗺 Advanced PostGIS Spatial Queries
Instead of relying strictly on client-side math, Bizby pushes the heavy lifting to the database using hardware-accelerated **GiST indexes** and PostGIS capabilities.
- **ST_DWithin (Buffer Zone):** Find all features within an exact radius of a selected coordinate.
- **ST_Intersects & ST_Contains:** Determine complex geographic relationships between different polygons and points.
- **Supply Chain Analytics:** A specialized query mode that isolates facilities completely `contained` by a delivery radius versus those only `intersecting` it.

### 🔄 Real-Time OSM Ingestion
Bizby is never out-of-date. Using the **Overpass API**, Bizby dynamically scrapes OpenStreetMap (OSM) for real-world locations surrounding a user's search area. These results are parsed, standardized, and immediately inserted/updated into the PostgreSQL database before the spatial query runs.

### 🤖 AI-Powered Chat Assistant
Integrated with OpenAI, the side-panel chat assistant can contextualize spatial results, provide business insights, and answer queries about the active map region.

---

## 🛠 Tech Stack

**Frontend:**
- **React 19 & Vite:** Lightning-fast rendering and build times.
- **Zustand:** Global state management handling map layers, UI state, and query histories.
- **Framer Motion:** Premium micro-animations and seamless UI transitions.
- **Leaflet & Recharts:** Core libraries for geospatial mapping and data charting.

**Backend:**
- **FastAPI:** High-performance async Python backend framework.
- **PostgreSQL & PostGIS:** The industry standard for geospatial databases.
- **SQLAlchemy:** ORM managing spatial columns (`Geometry`) and standardizing data structures.

---

## 🚀 How It Works (The Pipeline)

1. **User Query:** The user inputs a location (e.g., "Islamabad") and selects a spatial rule (e.g., "Buffer Zone" at 2000m).
2. **OSM Enrichment:** The frontend triggers the backend to query the Overpass API for real-time node and polygon data surrounding those coordinates.
3. **Database Insertion:** The backend parses the raw OSM data (extracting categories, tags, and coordinates) and saves it into the PostGIS database.
4. **Spatial Processing:** The FastAPI backend executes optimized PostGIS SQL queries (like `ST_DWithin`) against the freshly updated database.
5. **Visualization:** The results (GeoJSON format) are returned to the React frontend, which instantly visualizes the boundary polygons and colored POI markers on the MapCanvas, alongside updated Bento Grid statistics.

---

## 💻 Installation & Setup

### 1. Database Setup
You must have **PostgreSQL** installed along with the **PostGIS** extension.
Create a database named `bizby`, and ensure the PostGIS extension is enabled:
```sql
CREATE DATABASE bizby;
\c bizby;
CREATE EXTENSION postgis;
```

### 2. Backend Setup
Navigate to the `backend/` directory, set up your Python environment, and install dependencies:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` folder and add your connection string and API keys:
```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/bizby
OPENAI_API_KEY=your_openai_api_key
```

Run the FastAPI server:
```bash
python main.py
```
*(The API will be available at `http://localhost:8000`)*

### 3. Frontend Setup
Navigate back to the project root and install NPM packages:
```bash
npm install
```

Start the Vite development server:
```bash
npm run dev
```

Alternatively, you can just double-click the `start.bat` file at the root of the project to initialize both the frontend and backend servers simultaneously!

---

## 🌐 Deployment

The frontend of this application is pre-configured to be deployed statically to **GitHub Pages**.

To deploy a production build to GitHub Pages:
```bash
npm run deploy
```

*Note: GitHub Pages only hosts the React UI. To enable full data-processing functionality, the Python FastAPI backend and PostGIS database must be hosted on a cloud provider (e.g., Render, Railway, AWS, or Heroku).*
