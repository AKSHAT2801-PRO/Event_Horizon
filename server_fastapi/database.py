import os
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

# MongoDB connection
client = None
db = None
connection_verified = False

async def connect_db():
    global client, db, connection_verified
    mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    try:
        client = AsyncIOMotorClient(mongo_uri, serverSelectionTimeoutMS=5000)
        # Get the database - if database is specified in URL, it will be used
        # Otherwise, use the default database name
        db = client["AstrathonDb"]  # Using the correct database name from MongoDB Atlas
        
        # Verify connection by pinging the server
        await client.admin.command('ping')
        connection_verified = True
        print("✓ MongoDB connected successfully")
        return db
    except Exception as e:
        connection_verified = False
        print(f"✗ MongoDB connection failed: {str(e)}")
        raise

async def close_db():
    global client
    if client:
        client.close()
        print("MongoDB disconnected")

def get_db():
    """Get the database instance"""
    if db is None:
        raise RuntimeError("Database not initialized. Call connect_db() first.")
    return db

def is_connected():
    """Check if MongoDB is connected"""
    return connection_verified

# Collections
async def get_events_collection():
    if db is None:
        raise RuntimeError("Database not connected")
    return db["events"]

async def get_stations_collection():
    if db is None:
        raise RuntimeError("Database not connected")
    return db["stations"]

async def get_trajectory_results_collection():
    if db is None:
        raise RuntimeError("Database not connected")
    return db["trajectory_results"]

async def get_event_velocity_curve_collection():
    if db is None:
        raise RuntimeError("Database not connected")
    return db["event_velocity_curve"]

async def get_event_station_records_collection():
    if db is None:
        raise RuntimeError("Database not connected")
    return db["event_station_records"]
