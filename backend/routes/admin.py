from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text, func, desc
from pydantic import BaseModel
from database import get_db
from models import Search, AIInteraction, Location, SpatialQuery
from auth import create_access_token, get_current_admin, verify_password, ADMIN_USERNAME, ADMIN_PASSWORD_HASH

router = APIRouter(prefix="/admin", tags=["admin"])


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
async def admin_login(req: LoginRequest):
    if req.username != ADMIN_USERNAME or not verify_password(req.password, ADMIN_PASSWORD_HASH):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": req.username, "is_admin": True})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/stats")
async def get_stats(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    total_searches = db.query(Search).count()
    total_locations = db.query(Location).count()
    total_ai = db.query(AIInteraction).count()
    total_spatial = db.query(SpatialQuery).count()

    # Query type breakdown
    type_breakdown = (
        db.query(Search.query_type, func.count(Search.id).label("count"))
        .group_by(Search.query_type)
        .all()
    )

    # Top queried locations
    top_locations = (
        db.query(Search.query, func.count(Search.id).label("count"))
        .group_by(Search.query)
        .order_by(desc("count"))
        .limit(5)
        .all()
    )

    # Searches last 7 days (per day)
    daily_sql = text("""
        SELECT DATE(created_at) as day, COUNT(*) as count
        FROM searches
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY day
    """)
    daily = db.execute(daily_sql).fetchall()

    # Avg execution time
    avg_time = db.query(func.avg(SpatialQuery.execution_time_ms)).scalar() or 0

    return {
        "total_searches": total_searches,
        "total_locations": total_locations,
        "total_ai_interactions": total_ai,
        "total_spatial_queries": total_spatial,
        "avg_query_time_ms": round(float(avg_time), 2),
        "query_type_breakdown": [{"type": t, "count": c} for t, c in type_breakdown],
        "top_locations": [{"query": q, "count": c} for q, c in top_locations],
        "daily_searches": [{"day": str(d.day), "count": d.count} for d in daily],
    }


@router.get("/searches")
async def get_searches(page: int = 1, limit: int = 20, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    offset = (page - 1) * limit
    total = db.query(Search).count()
    searches = (
        db.query(Search)
        .order_by(Search.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return {
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
        "data": [
            {
                "id": s.id, "query": s.query, "latitude": s.latitude,
                "longitude": s.longitude, "radius": s.radius,
                "query_type": s.query_type, "results_count": s.results_count,
                "session_id": s.session_id,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in searches
        ],
    }


@router.get("/ai-logs")
async def get_ai_logs(page: int = 1, limit: int = 20, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    offset = (page - 1) * limit
    total = db.query(AIInteraction).count()
    logs = (
        db.query(AIInteraction)
        .order_by(AIInteraction.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return {
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
        "data": [
            {
                "id": l.id, "session_id": l.session_id,
                "user_message": l.user_message, "ai_response": l.ai_response,
                "location_name": l.location_name,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in logs
        ],
    }


@router.get("/heatmap")
async def get_heatmap(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    """Return lat/lng points for heatmap visualization."""
    searches = db.query(Search.latitude, Search.longitude).filter(
        Search.latitude.isnot(None), Search.longitude.isnot(None)
    ).limit(500).all()
    return [{"lat": s.latitude, "lng": s.longitude} for s in searches]


@router.delete("/reset")
async def reset_data(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    db.query(SpatialQuery).delete()
    db.query(AIInteraction).delete()
    db.query(Search).delete()
    db.commit()
    return {"message": "All search and AI data cleared successfully."}
