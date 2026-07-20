# Bizby Backend API

FastAPI backend for the Bizby geospatial platform with AI capabilities.

## Setup

### Prerequisites

- Python 3.9+
- SQLite (included with Python) or PostgreSQL 13+ with PostGIS extension

### Installation

1. **Install Python dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configure environment variables:**
   Copy `.env` and fill in your API keys:
   ```bash
   cp .env .env.local
   # Edit .env.local with your actual API keys
   ```

3. **Initialize database:**
   ```bash
   python init_db.py
   ```

4. **Run the server:**
   ```bash
   cd ..
   uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
   ```

The API will be available at `http://localhost:8000`

## API Endpoints

### Spatial Queries

- `POST /spatial/buffer-zone` - Create buffer zone around a point
- `POST /spatial/within` - Find locations within radius (simplified for SQLite)
- `POST /spatial/contains` - Find locations containing point (simplified for SQLite)
- `POST /spatial/intersects` - Find intersecting locations (simplified for SQLite)

### Authentication

- `POST /auth/login` - User login
- `POST /auth/register` - User registration

### Search

- `POST /search` - Perform location search
- `GET /search/history` - Get search history

### AI Assistant

- `POST /ai/chat` - Send message to AI assistant
- `GET /ai/conversations` - Get conversation history

### Admin

- `GET /admin/stats` - Get platform statistics
- `DELETE /admin/data` - Clear all data

## Development

### Running Tests

```bash
pytest
```

### API Documentation

Visit `http://localhost:8000/docs` for interactive API documentation.

## Database

Currently configured for SQLite for development. To use PostgreSQL with PostGIS in production:

1. Install PostgreSQL and PostGIS
2. Update `DATABASE_URL` in `.env`
3. Update spatial queries to use PostGIS functions (ST_Within, ST_Buffer, etc.)
4. Update Location model to use Geometry column instead of Text