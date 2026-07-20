from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import List, Optional
from database import get_db
from models import Location
import httpx
import time

router = APIRouter(prefix="/overpass", tags=["overpass"])

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# OSM tag → our category mapping
AMENITY_CATEGORY: dict[str, str] = {
    "cafe": "cafe", "coffee_shop": "cafe", "bar": "cafe", "pub": "cafe",
    "restaurant": "restaurant", "fast_food": "restaurant", "food_court": "restaurant",
    "hospital": "healthcare", "clinic": "healthcare", "pharmacy": "healthcare",
    "doctors": "healthcare", "dentist": "healthcare",
    "school": "education", "university": "education", "college": "education",
    "library": "education", "kindergarten": "education",
    "hotel": "hotel", "hostel": "hotel", "guest_house": "hotel", "motel": "hotel",
    "bank": "retail", "atm": "retail",
}
LEISURE_CATEGORY: dict[str, str] = {
    "fitness_centre": "fitness", "gym": "fitness", "sports_centre": "fitness",
    "swimming_pool": "fitness", "track": "fitness",
}
TOURISM_CATEGORY: dict[str, str] = {
    "hotel": "hotel", "hostel": "hotel", "guest_house": "hotel", "motel": "hotel",
    "museum": "education", "attraction": "retail",
}
OFFICE_CATEGORY: dict[str, str] = {
    "company": "tech", "it": "tech", "coworking": "tech", "technology": "tech",
    "consulting": "tech", "financial": "retail", "estate_agent": "retail",
    "insurance": "retail",
}
SHOP_CATEGORY: dict[str, str] = {
    "supermarket": "retail", "mall": "retail", "department_store": "retail",
    "clothes": "retail", "electronics": "retail", "hardware": "retail",
    "bakery": "restaurant", "butcher": "restaurant",
}


def classify_node(tags: dict) -> tuple[str, str]:
    """Return (category, risk_level) from OSM tags."""
    amenity = tags.get("amenity", "")
    leisure = tags.get("leisure", "")
    tourism = tags.get("tourism", "")
    office = tags.get("office", "")
    shop = tags.get("shop", "")

    cat = (
        AMENITY_CATEGORY.get(amenity)
        or LEISURE_CATEGORY.get(leisure)
        or TOURISM_CATEGORY.get(tourism)
        or OFFICE_CATEGORY.get(office)
        or SHOP_CATEGORY.get(shop)
        or "retail"
    )

    # Simple risk heuristic
    if cat in ("healthcare", "education"):
        risk = "low"
    elif cat in ("fitness", "hotel"):
        risk = "medium"
    else:
        risk = "medium"

    return cat, risk


def build_query(lat: float, lng: float, radius: int, categories: List[str]) -> str:
    """Build an Overpass QL query for the requested categories."""
    all_cats = set(categories) if categories else {
        "cafe", "restaurant", "healthcare", "fitness", "hotel", "education", "tech", "retail"
    }

    amenity_tags = [k for k, v in AMENITY_CATEGORY.items() if v in all_cats]
    leisure_tags = [k for k, v in LEISURE_CATEGORY.items() if v in all_cats]
    tourism_tags = [k for k, v in TOURISM_CATEGORY.items() if v in all_cats]
    office_tags = [k for k, v in OFFICE_CATEGORY.items() if v in all_cats]
    shop_tags = [k for k, v in SHOP_CATEGORY.items() if v in all_cats]

    parts = []
    bbox = f"(around:{radius},{lat},{lng})"

    if amenity_tags:
        regex = "|".join(amenity_tags)
        parts.append(f'node["amenity"~"^({regex})$"]{bbox};')
        parts.append(f'way["amenity"~"^({regex})$"]{bbox};')

    if leisure_tags:
        regex = "|".join(leisure_tags)
        parts.append(f'node["leisure"~"^({regex})$"]{bbox};')

    if tourism_tags:
        regex = "|".join(tourism_tags)
        parts.append(f'node["tourism"~"^({regex})$"]{bbox};')

    if office_tags:
        regex = "|".join(office_tags)
        parts.append(f'node["office"~"^({regex})$"]{bbox};')

    if shop_tags:
        regex = "|".join(shop_tags)
        parts.append(f'node["shop"~"^({regex})$"]{bbox};')

    if not parts:
        parts.append(f'node["amenity"]{bbox};')

    return f"[out:json][timeout:30];\n(\n  " + "\n  ".join(parts) + "\n);\nout body;"


class FetchRequest(BaseModel):
    latitude: float
    longitude: float
    radius: int = 1500
    categories: Optional[List[str]] = None


class FetchResponse(BaseModel):
    fetched: int
    inserted: int
    updated: int
    message: str


@router.post("/fetch", response_model=FetchResponse)
async def fetch_and_store(req: FetchRequest, db: Session = Depends(get_db)):
    """Fetch real OSM POIs from Overpass API and upsert them into PostGIS."""
    if req.radius > 10000:
        raise HTTPException(status_code=400, detail="Radius too large (max 10km)")

    query = build_query(req.latitude, req.longitude, req.radius, req.categories or [])

    try:
        async with httpx.AsyncClient(timeout=35.0) as client:
            resp = await client.post(
                OVERPASS_URL,
                data={"data": query},
                headers={
                    "User-Agent": "BizbyGeospatialApp/2.0 (contact@bizby.app)",
                    "Accept": "application/json",
                },
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Overpass API timed out. Try a smaller radius.")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Overpass API error: {str(e)}")

    elements = data.get("elements", [])
    inserted = 0
    updated = 0

    for el in elements:
        lat = el.get("lat") or el.get("center", {}).get("lat")
        lng = el.get("lon") or el.get("center", {}).get("lon")
        if not lat or not lng:
            continue

        tags = el.get("tags", {})
        osm_id = f"{el['type']}/{el['id']}"
        name = tags.get("name") or tags.get("brand") or tags.get("operator")
        if not name:
            # Build a name from category tags
            for key in ("amenity", "shop", "leisure", "tourism", "office"):
                if tags.get(key):
                    name = tags[key].replace("_", " ").title()
                    break
        if not name:
            continue

        # Build address from tags
        addr_parts = [
            tags.get("addr:housenumber", ""),
            tags.get("addr:street", ""),
            tags.get("addr:city", ""),
        ]
        address = ", ".join(p for p in addr_parts if p) or tags.get("addr:full", "")

        cat, risk = classify_node(tags)
        geom_wkt = f"SRID=4326;POINT({lng} {lat})"

        # Upsert by osm_id
        existing = db.query(Location).filter(Location.osm_id == osm_id).first()
        if existing:
            existing.name = name
            existing.address = address
            existing.latitude = lat
            existing.longitude = lng
            existing.geom = geom_wkt
            existing.category = cat
            existing.place_type = cat
            existing.risk_level = risk
            existing.metadata_json = {k: v for k, v in tags.items() if k not in ("name",)}
            updated += 1
        else:
            loc = Location(
                osm_id=osm_id,
                name=name,
                address=address,
                latitude=lat,
                longitude=lng,
                geom=geom_wkt,
                place_type=cat,
                category=cat,
                risk_level=risk,
                metadata_json={k: v for k, v in tags.items() if k not in ("name",)},
            )
            db.add(loc)
            inserted += 1

    db.commit()

    return FetchResponse(
        fetched=len(elements),
        inserted=inserted,
        updated=updated,
        message=f"Fetched {len(elements)} OSM nodes → {inserted} new, {updated} updated in PostGIS",
    )


@router.get("/categories")
async def list_categories():
    """Return the supported business categories."""
    return {
        "categories": [
            {"id": "cafe", "label": "Cafes & Bars", "icon": "☕"},
            {"id": "restaurant", "label": "Restaurants", "icon": "🍽"},
            {"id": "healthcare", "label": "Healthcare", "icon": "🏥"},
            {"id": "fitness", "label": "Fitness & Sports", "icon": "💪"},
            {"id": "hotel", "label": "Hotels", "icon": "🏨"},
            {"id": "education", "label": "Education", "icon": "📚"},
            {"id": "tech", "label": "Tech & Offices", "icon": "💻"},
            {"id": "retail", "label": "Shops & Retail", "icon": "🛍"},
        ]
    }
