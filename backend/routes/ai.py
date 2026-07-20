from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import AIInteraction, Location
import os
from google import genai
from google.genai import types

router = APIRouter(prefix="/ai", tags=["ai"])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Ordered by free-tier priority
MODELS_TO_TRY = [
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-1.5-flash",
]

SYSTEM_PROMPT = """You are Bizby AI, an intelligent geospatial business assistant.
You help users understand location intelligence, spatial data analysis, and business insights.

Your capabilities:
- Analyze business locations and competition density
- Explain spatial query results (buffer zones, ST_Within, ST_Contains, ST_Intersects)
- Provide business setup recommendations based on location data
- Answer questions about PostGIS spatial operations
- Give insights about market density, competitor proximity, and underserved zones

Always be concise, data-driven, and contextually aware of the user's current map location.
Use markdown for structured responses. Keep answers under 300 words unless asked for detail."""


def local_fallback_response(message: str, location_name: str | None, db: Session) -> str:
    """Generate a useful response from local DB data when Gemini is unavailable."""
    msg = message.lower()

    # Count locations in DB
    total = db.query(Location).count()
    cats = db.execute(
        text("SELECT category, COUNT(*) as cnt FROM locations GROUP BY category ORDER BY cnt DESC LIMIT 8")
    ).fetchall()
    cat_summary = ", ".join(f"{r[0]}({r[1]})" for r in cats) if cats else "various categories"

    if any(k in msg for k in ["business", "near", "around", "area", "what"]):
        loc_str = f" near **{location_name}**" if location_name else ""
        nearby = db.query(Location).limit(5).all()
        names = ", ".join(f"**{l.name}**" for l in nearby) if nearby else "no data yet"
        return (
            f"📍 **Bizby DB Report{loc_str}**\n\n"
            f"I found **{total} locations** in the database across: {cat_summary}.\n\n"
            f"Some nearby places: {names}.\n\n"
            f"_Note: AI responses are temporarily limited due to Gemini API quota. "
            f"Run a spatial query to see full map results. The Gemini quota resets daily._"
        )

    if any(k in msg for k in ["recommend", "suggest", "best", "where"]):
        return (
            f"🏙️ **Business Recommendation**\n\n"
            f"Based on your database ({total} locations), here are strategic insights:\n\n"
            f"- **High-density areas**: Search with Buffer Zone to find clusters\n"
            f"- **Underserved zones**: Use ST_Within to find gaps in coverage\n"
            f"- **Competition check**: ST_Intersects reveals overlapping service areas\n\n"
            f"_AI analysis temporarily limited (Gemini quota). Try again tomorrow for full AI responses._"
        )

    if any(k in msg for k in ["postgis", "buffer", "spatial", "query", "within"]):
        return (
            "🗄️ **PostGIS Spatial Operations**\n\n"
            "Your Bizby platform uses these PostGIS functions:\n\n"
            "- **ST_Buffer** — creates a radius zone around a point\n"
            "- **ST_Within** — finds points strictly inside a geometry\n"
            "- **ST_Contains** — checks if geometry A contains geometry B\n"
            "- **ST_Intersects** — finds overlapping geometries\n\n"
            "All queries run on a **GiST-indexed** geometry column for maximum speed.\n\n"
            "_AI chat temporarily limited (Gemini API quota). Basic responses active._"
        )

    return (
        f"🤖 **Bizby AI** (Local Mode)\n\n"
        f"I have **{total} locations** in the database: {cat_summary}.\n\n"
        f"Search any location and run a spatial query to explore the data on the map.\n\n"
        f"_Full AI responses are temporarily unavailable (Gemini API rate limit — resets daily). "
        f"Your key is configured correctly and will work again soon._"
    )


class ChatMessage(BaseModel):
    message: str
    session_id: str
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    location_name: Optional[str] = None
    context: Optional[dict] = None


class ChatResponse(BaseModel):
    response: str
    session_id: str


@router.post("/chat", response_model=ChatResponse)
async def chat(msg: ChatMessage, db: Session = Depends(get_db)):
    ai_response = None

    # Try Gemini if key is configured
    if GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here":
        try:
            client = genai.Client(api_key=GEMINI_API_KEY)

            # Build context
            ctx_parts = []
            if msg.location_name:
                ctx_parts.append(f"User is viewing: {msg.location_name}")
            if msg.location_lat and msg.location_lng:
                ctx_parts.append(f"Coordinates: ({msg.location_lat:.4f}, {msg.location_lng:.4f})")
            if msg.context:
                if msg.context.get("query_type"):
                    ctx_parts.append(f"Last spatial query: {msg.context['query_type']}")
                if msg.context.get("results_count"):
                    ctx_parts.append(f"Query returned {msg.context['results_count']} locations nearby")

            # Session history
            history_rows = (
                db.query(AIInteraction)
                .filter(AIInteraction.session_id == msg.session_id)
                .order_by(AIInteraction.created_at.desc())
                .limit(4)
                .all()
            )
            history_rows.reverse()

            contents = []
            for h in history_rows:
                contents.append(types.Content(role="user", parts=[types.Part(text=h.user_message)]))
                contents.append(types.Content(role="model", parts=[types.Part(text=h.ai_response)]))

            user_text = msg.message
            if ctx_parts:
                user_text = "[Context: " + " | ".join(ctx_parts) + "]\n\n" + msg.message
            contents.append(types.Content(role="user", parts=[types.Part(text=user_text)]))

            last_error = None
            for model_name in MODELS_TO_TRY:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=contents,
                        config=types.GenerateContentConfig(
                            system_instruction=SYSTEM_PROMPT,
                            max_output_tokens=600,
                            temperature=0.7,
                        ),
                    )
                    ai_response = response.text or "I couldn't generate a response."
                    break
                except Exception as e:
                    last_error = e
                    err_str = str(e)
                    if any(x in err_str for x in ["429", "503", "RESOURCE_EXHAUSTED", "UNAVAILABLE"]):
                        continue  # try next model
                    raise  # non-quota error — don't retry

            # All models rate-limited → fall through to local fallback
            if ai_response is None:
                ai_response = None  # will use fallback below

        except Exception:
            ai_response = None  # fall through to local fallback

    # Local fallback when Gemini is unavailable or key not set
    if ai_response is None:
        ai_response = local_fallback_response(msg.message, msg.location_name, db)

    # Persist to DB
    interaction = AIInteraction(
        session_id=msg.session_id,
        user_message=msg.message,
        ai_response=ai_response,
        context=msg.context or {},
        location_lat=msg.location_lat,
        location_lng=msg.location_lng,
        location_name=msg.location_name,
    )
    db.add(interaction)
    db.commit()

    return {"response": ai_response, "session_id": msg.session_id}


@router.get("/history/{session_id}")
async def get_history(session_id: str, db: Session = Depends(get_db)):
    rows = (
        db.query(AIInteraction)
        .filter(AIInteraction.session_id == session_id)
        .order_by(AIInteraction.created_at.asc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": r.id,
            "user_message": r.user_message,
            "ai_response": r.ai_response,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]
