from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routes.spatial import router as spatial_router
from routes.ai import router as ai_router
from routes.admin import router as admin_router
from routes.geocode import router as geocode_router
from routes.overpass import router as overpass_router

app = FastAPI(
    title="Bizby Geospatial Intelligence API",
    version="2.0.0",
    description="Production-ready geospatial analytics platform with PostGIS + AI"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(spatial_router)
app.include_router(ai_router)
app.include_router(admin_router)
app.include_router(geocode_router)
app.include_router(overpass_router)


@app.get("/")
async def root():
    return {
        "message": "Bizby Geospatial Intelligence API v2.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "2.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)