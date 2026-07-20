"""
Initialize the Bizby database with PostGIS extension and seed data.
Run with: python init_db.py
"""
import sys
from sqlalchemy import text
from database import engine, Base, SessionLocal
from models import Location, Search, AIInteraction, SpatialQuery

SEED_LOCATIONS = [
    {"name": "CoffeeHub Express", "address": "Blue Area, Islamabad", "latitude": 33.7295, "longitude": 73.0931, "place_type": "cafe", "category": "cafe", "risk_level": "low"},
    {"name": "TechStart Solutions", "address": "F-7, Islamabad", "latitude": 33.7215, "longitude": 73.0433, "place_type": "tech", "category": "tech", "risk_level": "medium"},
    {"name": "Urban Eats Restaurant", "address": "F-6, Islamabad", "latitude": 33.7245, "longitude": 73.0510, "place_type": "restaurant", "category": "restaurant", "risk_level": "high"},
    {"name": "GreenLeaf Pharmacy", "address": "G-9, Islamabad", "latitude": 33.6938, "longitude": 73.0651, "place_type": "healthcare", "category": "healthcare", "risk_level": "low"},
    {"name": "FitZone Gym", "address": "F-8, Islamabad", "latitude": 33.7198, "longitude": 73.0378, "place_type": "fitness", "category": "fitness", "risk_level": "medium"},
    {"name": "Savor Restaurant", "address": "Jinnah Avenue, Islamabad", "latitude": 33.7183, "longitude": 73.0558, "place_type": "restaurant", "category": "restaurant", "risk_level": "low"},
    {"name": "Digital Nexus", "address": "I-8, Islamabad", "latitude": 33.6765, "longitude": 73.0862, "place_type": "tech", "category": "tech", "risk_level": "low"},
    {"name": "The Coffee Bean", "address": "F-10, Islamabad", "latitude": 33.7104, "longitude": 73.0295, "place_type": "cafe", "category": "cafe", "risk_level": "low"},
    {"name": "Rawalpindi Sports Complex", "address": "Saddar, Rawalpindi", "latitude": 33.5973, "longitude": 73.0479, "place_type": "fitness", "category": "fitness", "risk_level": "medium"},
    {"name": "Al-Shifa Hospital", "address": "H-8, Islamabad", "latitude": 33.6723, "longitude": 73.0654, "place_type": "healthcare", "category": "healthcare", "risk_level": "low"},
    {"name": "Pizza Point", "address": "G-11, Islamabad", "latitude": 33.6984, "longitude": 73.0215, "place_type": "restaurant", "category": "restaurant", "risk_level": "medium"},
    {"name": "BookZone Store", "address": "Blue Area, Islamabad", "latitude": 33.7280, "longitude": 73.0900, "place_type": "retail", "category": "clothing", "risk_level": "low"},
    {"name": "Zark's Burgers", "address": "F-7, Islamabad", "latitude": 33.7220, "longitude": 73.0456, "place_type": "restaurant", "category": "restaurant", "risk_level": "medium"},
    {"name": "Cinnabon Islamabad", "address": "Centaurus Mall, Islamabad", "latitude": 33.7089, "longitude": 73.0471, "place_type": "cafe", "category": "cafe", "risk_level": "low"},
    {"name": "Shapes Gym", "address": "F-11, Islamabad", "latitude": 33.7056, "longitude": 73.0199, "place_type": "fitness", "category": "fitness", "risk_level": "low"},
    {"name": "PakWheels Showroom", "address": "G-8, Islamabad", "latitude": 33.7015, "longitude": 73.0689, "place_type": "retail", "category": "clothing", "risk_level": "medium"},
    {"name": "COMSATS University", "address": "Park Road, Islamabad", "latitude": 33.6844, "longitude": 73.0479, "place_type": "education", "category": "tech", "risk_level": "low"},
    {"name": "Monal Restaurant", "address": "Margalla Hills, Islamabad", "latitude": 33.7546, "longitude": 73.0584, "place_type": "restaurant", "category": "restaurant", "risk_level": "low"},
    {"name": "Serena Hotel", "address": "Islamabad Club Road", "latitude": 33.7165, "longitude": 73.0742, "place_type": "hotel", "category": "tech", "risk_level": "low"},
    {"name": "Hafeez Centre", "address": "Commercial Zone, Islamabad", "latitude": 33.7341, "longitude": 73.0817, "place_type": "retail", "category": "clothing", "risk_level": "high"},
]

def init_db():
    print("Enabling PostGIS extension...")
    with engine.connect() as conn:
        try:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis_topology;"))
            conn.commit()
            print("PostGIS enabled.")
        except Exception as e:
            print(f"PostGIS extension note: {e}")
            conn.rollback()

    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created.")

    db = SessionLocal()
    try:
        existing = db.query(Location).count()
        if existing > 0:
            print(f"Database already has {existing} locations. Skipping seed.")
            return

        print("Seeding location data...")
        for loc_data in SEED_LOCATIONS:
            loc = Location(
                name=loc_data["name"],
                address=loc_data["address"],
                latitude=loc_data["latitude"],
                longitude=loc_data["longitude"],
                place_type=loc_data["place_type"],
                category=loc_data["category"],
                risk_level=loc_data["risk_level"],
                metadata_json={"seeded": True}
            )
            db.add(loc)

        db.commit()

        # Update geom column using PostGIS
        with engine.connect() as conn:
            conn.execute(text(
                "UPDATE locations SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) WHERE geom IS NULL"
            ))
            conn.execute(text(
                "CREATE INDEX IF NOT EXISTS idx_locations_geom ON locations USING GIST(geom);"
            ))
            conn.commit()

        print(f"Seeded {len(SEED_LOCATIONS)} locations successfully.")

    except Exception as e:
        print(f"Seeding error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
    print("Database initialization complete.")