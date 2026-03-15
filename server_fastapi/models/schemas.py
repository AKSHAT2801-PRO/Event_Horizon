from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# Event Schemas
class EventResponse(BaseModel):
    id: str  # MongoDB _id
    name: str
    date: str
    peakMagnitude: float
    velocity: float  # km/s
    region: str
    network: str
    shower: str
    altitude: float  # km
    duration: float  # seconds
    mass: float  # grams
    lat: float
    lng: float

# Station Schemas
class Location(BaseModel):
    latitude: float
    longitude: float
    altitude: float

class Station(BaseModel):
    station_name: str
    location: Location
    shower_code: str

class StationResponse(BaseModel):
    station_name: str
    latitude: float
    longitude: float
    altitude: float
    shower_code: str

# Trajectory Schemas
class Point(BaseModel):
    latitude: float
    longitude: float
    altitude: float

class TrajectoryResult(BaseModel):
    event_id: str
    start_point: Point
    end_point: Point
    mass: float
    duration: float
    initial_velocity: float
    entry_angle_degree: float
    median_residual_arcsec: float
    quality_angle_q: float

class TrajectoryResponse(BaseModel):
    traj_id: str  # MongoDB _id
    startLat: float
    startLng: float
    startAltKm: float
    endLat: float
    endLng: float
    endAltKm: float
    mass: float
    duration: float
    initial_velocity: float
