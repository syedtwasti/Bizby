from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
try:
    from geoalchemy2 import Geometry
    HAS_POSTGIS = True
except ImportError:
    HAS_POSTGIS = False

from database import Base


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    osm_id = Column(String, unique=True, nullable=True, index=True)  # OpenStreetMap node ID
    name = Column(String, index=True)
    address = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    geom = Column(Geometry('POINT', srid=4326) if HAS_POSTGIS else Text)
    place_type = Column(String)  # cafe, restaurant, tech, fitness, etc.
    category = Column(String)
    risk_level = Column(String, default='low')  # low, medium, high
    metadata_json = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Search(Base):
    __tablename__ = "searches"

    id = Column(Integer, primary_key=True, index=True)
    query = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    radius = Column(Float, default=1000)  # meters
    query_type = Column(String, default='buffer_zone')  # buffer_zone | within | contains | intersects
    results_count = Column(Integer, default=0)
    session_id = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    spatial_queries = relationship("SpatialQuery", back_populates="search")


class SpatialQuery(Base):
    __tablename__ = "spatial_queries"

    id = Column(Integer, primary_key=True, index=True)
    search_id = Column(Integer, ForeignKey("searches.id"), nullable=True)
    query_type = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    radius = Column(Float)
    geojson = Column(JSON)
    results_count = Column(Integer, default=0)
    execution_time_ms = Column(Float, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    search = relationship("Search", back_populates="spatial_queries")


class AIInteraction(Base):
    __tablename__ = "ai_interactions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    user_message = Column(Text)
    ai_response = Column(Text)
    context = Column(JSON)
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    location_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())