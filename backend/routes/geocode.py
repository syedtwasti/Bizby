from fastapi import APIRouter, HTTPException
import httpx
import os

router = APIRouter(prefix="/geocode", tags=["geocode"])

OPENCAGE_KEY = os.getenv("OPENCAGE_API_KEY", "")
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"


@router.get("")
async def geocode(q: str, limit: int = 5):
    """Geocode a query string to lat/lng results."""
    if not q.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    # Try OpenCage first if key available
    if OPENCAGE_KEY:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    "https://api.opencagedata.com/geocode/v1/json",
                    params={"q": q, "key": OPENCAGE_KEY, "limit": limit, "no_annotations": 1}
                )
                data = resp.json()
                if data.get("results"):
                    return [
                        {
                            "display_name": r["formatted"],
                            "lat": float(r["geometry"]["lat"]),
                            "lng": float(r["geometry"]["lng"]),
                            "place_type": r.get("components", {}).get("_type", "location"),
                        }
                        for r in data["results"]
                    ]
        except Exception:
            pass  # Fall through to Nominatim

    # Fallback: Nominatim (OSM)
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                NOMINATIM_URL,
                params={"q": q, "format": "json", "limit": limit, "addressdetails": 1},
                headers={"User-Agent": "BizbyApp/1.0"}
            )
            results = resp.json()
            return [
                {
                    "display_name": r["display_name"],
                    "lat": float(r["lat"]),
                    "lng": float(r["lon"]),
                    "place_type": r.get("type", "location"),
                }
                for r in results
            ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Geocoding failed: {str(e)}")
