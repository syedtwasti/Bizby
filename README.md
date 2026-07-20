# 🌍 Bizby – Spatial Intelligence Platform

<p align="center">
  <strong>A modern GeoAI platform for real-time spatial analytics, business intelligence, and location-based decision making.</strong>
</p>

<p align="center">
  <a href="https://syedtwasti.github.io/Bizby/">
    <img src="https://img.shields.io/badge/Live-Demo-success?style=for-the-badge" />
  </a>
  <img src="https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi" />
  <img src="https://img.shields.io/badge/Database-PostgreSQL%20%7C%20PostGIS-336791?style=for-the-badge&logo=postgresql" />
  <img src="https://img.shields.io/badge/GeoAI-Spatial%20Analytics-f59e0b?style=for-the-badge" />
</p>

---

## 🌐 Live Demo

🔗 **https://syedtwasti.github.io/Bizby/**

---

## 📸 Platform Preview

<p align="center">
  <img src="image.png" width="1000" alt="Bizby Dashboard">
</p>

---

# 📖 Overview

**Bizby** is a production-ready **Spatial Intelligence Platform** that combines Web GIS, spatial databases, AI-powered insights, and real-time geospatial analytics into a single interactive application.

Built using **React**, **FastAPI**, **PostGIS**, and **Leaflet**, Bizby enables organizations, urban planners, logistics companies, and analysts to discover, analyze, and visualize geographic information with enterprise-grade performance.

By combining OpenStreetMap data, spatial SQL, interactive dashboards, and AI-assisted analysis, Bizby transforms raw location data into actionable business intelligence.

---

# ✨ Key Features

### 🗺 Interactive Spatial Dashboard

Explore geographic data through a modern analytics interface featuring:

- Interactive Leaflet maps
- Dark & Satellite basemaps
- Responsive Bento Grid dashboard
- Live statistics and insights
- Query execution metrics

---

### 📍 Advanced Spatial Analysis

Leverage powerful **PostGIS** capabilities including:

- Buffer Analysis (`ST_DWithin`)
- Spatial Intersection (`ST_Intersects`)
- Containment Analysis (`ST_Contains`)
- Radius-based proximity searches
- High-performance GiST indexing

---

### 🌐 Real-Time OpenStreetMap Integration

Bizby automatically retrieves live Points of Interest (POIs) from **OpenStreetMap** using the **Overpass API**.

Features include:

- Automatic data ingestion
- Category extraction
- Data standardization
- Instant database updates
- Live spatial querying

---

### 📊 Business Intelligence Dashboard

Visualize spatial information through:

- Category breakdowns
- Business distributions
- Query performance metrics
- Search history
- Interactive analytics

---

### 🚚 Supply Chain Intelligence

Analyze logistics networks using spatial relationships such as:

- Delivery coverage
- Facility containment
- Service radius analysis
- Distribution optimization

---

### 🤖 AI-Powered Spatial Assistant

Integrated AI provides contextual insights including:

- Spatial query explanations
- Business recommendations
- Geographic analysis
- Map-based intelligence
- Natural language interaction

---

# ⚙️ System Architecture

```text
                  User Search
                       │
                       ▼
              React Dashboard (Vite)
                       │
              Axios API Requests
                       │
                       ▼
               FastAPI Backend
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
 Overpass API      PostgreSQL      OpenAI
(OpenStreetMap)      + PostGIS        API
        │              │              │
        └──────────────┼──────────────┘
                       ▼
             Spatial Processing Engine
                       │
             GeoJSON Response Layer
                       │
                       ▼
          Interactive Maps & Analytics
```

---

# 🔍 How Bizby Works

## 1. User Search

Users search for a location and define spatial analysis parameters such as search radius or business category.

---

## 2. Live Data Collection

The backend retrieves real-time geographic information from **OpenStreetMap** through the **Overpass API**.

---

## 3. Data Processing

Incoming data is:

- Parsed
- Standardized
- Categorized
- Stored inside PostgreSQL/PostGIS

---

## 4. Spatial Analysis

FastAPI executes optimized spatial SQL queries using PostGIS functions including:

- ST_DWithin
- ST_Contains
- ST_Intersects

allowing rapid geographic analysis even on large datasets.

---

## 5. AI Intelligence

The integrated AI assistant interprets spatial results and provides contextual business insights based on the selected region.

---

## 6. Interactive Visualization

Results are displayed through:

- Interactive maps
- Live POI markers
- Analytics cards
- Charts
- Search history
- Spatial overlays

---

# 🛠 Technology Stack

| Category | Technologies |
|-----------|--------------|
| Frontend | React 19, Vite |
| Backend | FastAPI |
| Database | PostgreSQL, PostGIS |
| ORM | SQLAlchemy |
| State Management | Zustand |
| Mapping | Leaflet, MapLibre GL |
| Charts | Recharts |
| Animations | Framer Motion |
| AI | OpenAI API |
| Spatial Data | OpenStreetMap (Overpass API) |

---

# 🚀 Getting Started

## Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL
- PostGIS Extension

---

## Database Setup

Create a PostgreSQL database and enable PostGIS:

```sql
CREATE DATABASE bizby;

\c bizby;

CREATE EXTENSION postgis;
```

---

## Backend Installation

```bash
cd backend

python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/bizby

OPENAI_API_KEY=your_api_key
```

Run the backend:

```bash
python main.py
```

Backend:

```
http://localhost:8000
```

---

## Frontend Installation

```bash
npm install

npm run dev
```

Alternatively, launch both frontend and backend together using:

```bash
start.bat
```

---

# 📁 Project Structure

```text
Bizby/
│
├── backend/
│   ├── api/
│   ├── database/
│   ├── models/
│   ├── services/
│   └── main.py
│
├── src/
├── public/
├── image.png
├── package.json
├── start.bat
└── README.md
```

---

# 🌐 Data Sources

Bizby integrates multiple geospatial services including:

- **OpenStreetMap**
- **Overpass API**
- **PostGIS**
- **OpenAI API**

---

# 🚧 Future Enhancements

Planned features include:

- Multi-user authentication
- Spatial machine learning models
- Temporal GIS analytics
- Route optimization
- Heatmap generation
- Geo-fencing
- 3D map visualization
- Cloud deployment (AWS / Azure / Railway)
- Vector tile rendering
- Collaborative GIS workspaces

---

# 💡 Potential Applications

Bizby can be used across multiple industries including:

- Urban Planning
- Smart Cities
- Retail Site Selection
- Supply Chain Management
- Logistics Optimization
- Business Intelligence
- Emergency Response
- Government GIS
- Real Estate Analytics
- Environmental Monitoring

---

# 👨‍💻 Author

**Syed Tuaha Wasti**

GIS Engineer • Full Stack Developer • GeoAI & Spatial Intelligence Enthusiast

---

# 📄 License

This project is proprietary and confidential.

All rights reserved © 2026.
