from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import List, Optional
import time
from database import get_db
from models import Search, SpatialQuery, Location

router = APIRouter(prefix="/spatial", tags=["spatial"])


class SpatialQueryRequest(BaseModel):
    latitude: float
    longitude: float
    radius: float = 1000  # meters
    query: Optional[str] = None
    session_id: Optional[str] = None


class SpatialQueryResponse(BaseModel):
    type: str = "FeatureCollection"
    features: List[dict]
    execution_time_ms: float = 0
    query_type: str = ""


def save_query(db: Session, query_type: str, req: SpatialQueryRequest, geojson: dict, count: int, exec_time: float):
    """Persist the spatial query to the DB for admin analytics."""
    try:
        search = Search(
            query=req.query or f"{query_type} @ ({req.latitude:.4f}, {req.longitude:.4f})",
            latitude=req.latitude,
            longitude=req.longitude,
            radius=req.radius,
            query_type=query_type,
            results_count=count,
            session_id=req.session_id,
        )
        db.add(search)
        db.flush()

        sq = SpatialQuery(
            search_id=search.id,
            query_type=query_type,
            latitude=req.latitude,
            longitude=req.longitude,
            radius=req.radius,
            geojson=geojson,
            results_count=count,
            execution_time_ms=exec_time,
        )
        db.add(sq)
        db.commit()
    except Exception:
        db.rollback()


def row_to_feature(row) -> dict:
    return {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [row.longitude, row.latitude],
        },
        "properties": {
            "id": row.id,
            "name": row.name,
            "address": row.address,
            "latitude": row.latitude,
            "longitude": row.longitude,
            "place_type": row.place_type,
            "category": row.category,
            "risk_level": row.risk_level,
        },
    }


@router.post("/buffer-zone", response_model=SpatialQueryResponse)
async def buffer_zone(req: SpatialQueryRequest, db: Session = Depends(get_db)):
    """ST_Buffer — generate buffer polygon and find locations within it."""
    start = time.time()
    try:
        # Generate buffer polygon GeoJSON
        buffer_sql = text("""
            SELECT ST_AsGeoJSON(
                ST_Buffer(
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                    :radius
                )::geometry
            ) AS geojson
        """)
        buf_result = db.execute(buffer_sql, {"lng": req.longitude, "lat": req.latitude, "radius": req.radius})
        buf_row = buf_result.fetchone()
        import json
        buffer_geom = json.loads(buf_row.geojson) if buf_row else None

        # Find locations within the buffer
        within_sql = text("""
            SELECT id, name, address, latitude, longitude, place_type, category, risk_level
            FROM locations
            WHERE ST_DWithin(
                geom::geography,
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                :radius
            )
            ORDER BY geom <-> ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)
            LIMIT 50
        """)
        rows = db.execute(within_sql, {"lng": req.longitude, "lat": req.latitude, "radius": req.radius})
        locations = rows.fetchall()

        features = []
        if buffer_geom:
            features.append({
                "type": "Feature",
                "geometry": buffer_geom,
                "properties": {
                    "type": "buffer_zone",
                    "center_lat": req.latitude,
                    "center_lng": req.longitude,
                    "radius": req.radius,
                }
            })

        for loc in locations:
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [loc.longitude, loc.latitude]},
                "properties": {
                    "id": loc.id, "name": loc.name, "address": loc.address,
                    "latitude": loc.latitude, "longitude": loc.longitude,
                    "place_type": loc.place_type, "category": loc.category,
                    "risk_level": loc.risk_level, "query_type": "buffer_zone"
                }
            })

        exec_time = (time.time() - start) * 1000
        geojson = {"type": "FeatureCollection", "features": features}
        save_query(db, "buffer_zone", req, geojson, len(locations), exec_time)

        return {"type": "FeatureCollection", "features": features, "execution_time_ms": round(exec_time, 2), "query_type": "buffer_zone"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/within", response_model=SpatialQueryResponse)
async def spatial_within(req: SpatialQueryRequest, db: Session = Depends(get_db)):
    """ST_Within — find locations strictly within a radius."""
    start = time.time()
    try:
        sql = text("""
            SELECT id, name, address, latitude, longitude, place_type, category, risk_level,
                   ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) AS distance
            FROM locations
            WHERE ST_Within(
                geom,
                ST_Buffer(ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius)::geometry
            )
            ORDER BY distance
            LIMIT 100
        """)
        rows = db.execute(sql, {"lng": req.longitude, "lat": req.latitude, "radius": req.radius}).fetchall()

        features = [
            {**{"type": "Feature", "geometry": {"type": "Point", "coordinates": [r.longitude, r.latitude]},
                "properties": {"id": r.id, "name": r.name, "address": r.address,
                               "latitude": r.latitude, "longitude": r.longitude,
                               "place_type": r.place_type, "category": r.category,
                               "risk_level": r.risk_level, "distance": round(r.distance, 2),
                               "query_type": "within"}}}
            for r in rows
        ]

        exec_time = (time.time() - start) * 1000
        geojson = {"type": "FeatureCollection", "features": features}
        save_query(db, "within", req, geojson, len(features), exec_time)
        return {"type": "FeatureCollection", "features": features, "execution_time_ms": round(exec_time, 2), "query_type": "within"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/contains", response_model=SpatialQueryResponse)
async def spatial_contains(req: SpatialQueryRequest, db: Session = Depends(get_db)):
    """ST_Contains — find if any stored polygon contains the query point."""
    start = time.time()
    try:
        sql = text("""
            SELECT id, name, address, latitude, longitude, place_type, category, risk_level,
                   ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) AS distance
            FROM locations
            WHERE ST_DWithin(
                geom::geography,
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                :radius
            )
            AND ST_Contains(
                ST_Buffer(geom::geography, 200)::geometry,
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)
            )
            ORDER BY distance
            LIMIT 50
        """)
        rows = db.execute(sql, {"lng": req.longitude, "lat": req.latitude, "radius": req.radius}).fetchall()

        features = [
            {"type": "Feature", "geometry": {"type": "Point", "coordinates": [r.longitude, r.latitude]},
             "properties": {"id": r.id, "name": r.name, "address": r.address,
                            "latitude": r.latitude, "longitude": r.longitude,
                            "place_type": r.place_type, "category": r.category,
                            "risk_level": r.risk_level, "distance": round(r.distance, 2),
                            "query_type": "contains"}}
            for r in rows
        ]

        exec_time = (time.time() - start) * 1000
        geojson = {"type": "FeatureCollection", "features": features}
        save_query(db, "contains", req, geojson, len(features), exec_time)
        return {"type": "FeatureCollection", "features": features, "execution_time_ms": round(exec_time, 2), "query_type": "contains"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/intersects", response_model=SpatialQueryResponse)
async def spatial_intersects(req: SpatialQueryRequest, db: Session = Depends(get_db)):
    """ST_Intersects — find locations intersecting with query area."""
    start = time.time()
    try:
        sql = text("""
            SELECT id, name, address, latitude, longitude, place_type, category, risk_level,
                   ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) AS distance
            FROM locations
            WHERE ST_Intersects(
                geom,
                ST_Buffer(ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius)::geometry
            )
            ORDER BY distance
            LIMIT 100
        """)
        rows = db.execute(sql, {"lng": req.longitude, "lat": req.latitude, "radius": req.radius}).fetchall()

        features = [
            {"type": "Feature", "geometry": {"type": "Point", "coordinates": [r.longitude, r.latitude]},
             "properties": {"id": r.id, "name": r.name, "address": r.address,
                            "latitude": r.latitude, "longitude": r.longitude,
                            "place_type": r.place_type, "category": r.category,
                            "risk_level": r.risk_level, "distance": round(r.distance, 2),
                            "query_type": "intersects"}}
            for r in rows
        ]

        exec_time = (time.time() - start) * 1000
        geojson = {"type": "FeatureCollection", "features": features}
        save_query(db, "intersects", req, geojson, len(features), exec_time)
        return {"type": "FeatureCollection", "features": features, "execution_time_ms": round(exec_time, 2), "query_type": "intersects"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_history(limit: int = 20, db: Session = Depends(get_db)):
    """Get recent spatial query history."""
    searches = db.query(Search).order_by(Search.created_at.desc()).limit(limit).all()
    return [
        {
            "id": s.id, "query": s.query, "latitude": s.latitude,
            "longitude": s.longitude, "radius": s.radius,
            "query_type": s.query_type, "results_count": s.results_count,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in searches
    ]


# ─── Supply Chain Analysis ────────────────────────────────────────────────────

SUPPLIER_CATEGORIES = (
    "factory", "warehouse", "industrial", "supplier",
    "wholesale", "distribution", "manufacturing",
)


@router.post("/supply-chain", response_model=SpatialQueryResponse)
async def supply_chain_analysis(req: SpatialQueryRequest, db: Session = Depends(get_db)):
    """
    Supply Chain Analysis:
    1. ST_Buffer  — create the zone around the selected point
    2. ST_Intersects — find suppliers/factories whose service area overlaps the buffer
    3. ST_Contains  — find suppliers/factories fully enclosed within the buffer
    Returns all three layers as separate GeoJSON features with a 'layer' property.
    """
    import json as _json
    start = time.time()
    try:
        # ── 1. Buffer polygon ────────────────────────────────────────────────
        buf_sql = text("""
            SELECT ST_AsGeoJSON(
                ST_Buffer(
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                    :radius
                )::geometry
            ) AS geojson
        """)
        buf_row = db.execute(buf_sql, {"lng": req.longitude, "lat": req.latitude, "radius": req.radius}).fetchone()
        buffer_geom = _json.loads(buf_row.geojson) if buf_row else None

        # ── 2. Candidate supplier/factory points within 3× radius ────────────
        candidates_sql = text("""
            SELECT id, name, address, latitude, longitude, place_type, category, risk_level,
                   ST_Distance(
                       geom::geography,
                       ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
                   ) AS distance
            FROM locations
            WHERE (
                LOWER(category)   ILIKE ANY(ARRAY[:cats])
                OR LOWER(place_type) ILIKE ANY(ARRAY[:cats])
                OR LOWER(COALESCE(category,'')) ILIKE '%industr%'
                OR LOWER(COALESCE(category,'')) ILIKE '%factor%'
                OR LOWER(COALESCE(category,'')) ILIKE '%warehou%'
                OR LOWER(COALESCE(category,'')) ILIKE '%wholesal%'
                OR LOWER(COALESCE(category,'')) ILIKE '%supplier%'
                OR LOWER(COALESCE(category,'')) ILIKE '%distribut%'
                OR LOWER(COALESCE(category,'')) ILIKE '%manufactur%'
            )
            AND ST_DWithin(
                geom::geography,
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                :wide_radius
            )
            ORDER BY distance
            LIMIT 200
        """)

        cat_patterns = [f"%{c}%" for c in SUPPLIER_CATEGORIES]
        candidates = db.execute(candidates_sql, {
            "lng": req.longitude,
            "lat": req.latitude,
            "radius": req.radius,
            "wide_radius": req.radius * 3,
            "cats": cat_patterns,
        }).fetchall()

        # ── 3. ST_Intersects — supplier service bubble (200 m) hits buffer ──
        intersects_sql = text("""
            SELECT id,
                   ST_Intersects(
                       ST_Buffer(geom::geography, 200)::geometry,
                       ST_Buffer(
                           ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                           :radius
                       )::geometry
                   ) AS intersects_flag,
                   ST_Contains(
                       ST_Buffer(
                           ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                           :radius
                       )::geometry,
                       geom
                   ) AS contains_flag
            FROM locations
            WHERE id = ANY(:ids)
        """)

        if candidates:
            ids = [r.id for r in candidates]
            flags = {
                row.id: {"intersects": row.intersects_flag, "contains": row.contains_flag}
                for row in db.execute(intersects_sql, {
                    "lng": req.longitude, "lat": req.latitude,
                    "radius": req.radius, "ids": ids,
                }).fetchall()
            }
        else:
            flags = {}

        # ── 4. If no tagged suppliers found, fall back to ALL nearby ─────────
        if not candidates:
            fallback_sql = text("""
                SELECT id, name, address, latitude, longitude, place_type, category, risk_level,
                       ST_Distance(
                           geom::geography,
                           ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
                       ) AS distance
                FROM locations
                WHERE ST_DWithin(
                    geom::geography,
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                    :radius
                )
                ORDER BY distance
                LIMIT 30
            """)
            candidates = db.execute(fallback_sql, {
                "lng": req.longitude, "lat": req.latitude, "radius": req.radius
            }).fetchall()
            flags = {r.id: {"intersects": True, "contains": r.distance <= req.radius * 0.6} for r in candidates}

        # ── 5. Build GeoJSON features ─────────────────────────────────────────
        features: list[dict] = []

        # Buffer zone polygon
        if buffer_geom:
            features.append({
                "type": "Feature",
                "geometry": buffer_geom,
                "properties": {
                    "layer": "buffer_zone",
                    "type": "buffer_zone",
                    "center_lat": req.latitude,
                    "center_lng": req.longitude,
                    "radius": req.radius,
                },
            })

        intersects_count = 0
        contains_count = 0

        for loc in candidates:
            f = flags.get(loc.id, {})
            does_intersect = f.get("intersects", False)
            does_contain = f.get("contains", False)

            if not does_intersect and not does_contain:
                continue

            layer = "contained" if does_contain else "intersecting"
            if does_contain:
                contains_count += 1
            else:
                intersects_count += 1

            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [loc.longitude, loc.latitude]},
                "properties": {
                    "id": loc.id,
                    "name": loc.name,
                    "address": loc.address or "",
                    "latitude": loc.latitude,
                    "longitude": loc.longitude,
                    "place_type": loc.place_type,
                    "category": loc.category,
                    "risk_level": loc.risk_level,
                    "distance": round(loc.distance, 1),
                    "query_type": "supply_chain",
                    "layer": layer,
                    # ST_Intersects / ST_Contains flags for UI
                    "st_intersects": does_intersect,
                    "st_contains": does_contain,
                },
            })

        exec_time = (time.time() - start) * 1000
        total = intersects_count + contains_count
        geojson = {"type": "FeatureCollection", "features": features}
        save_query(db, "supply_chain", req, geojson, total, exec_time)

        return {
            "type": "FeatureCollection",
            "features": features,
            "execution_time_ms": round(exec_time, 2),
            "query_type": "supply_chain",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))