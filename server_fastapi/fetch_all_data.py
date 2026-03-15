import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pprint import pprint

load_dotenv()

async def fetch_all_data():
    """Fetch and display all data from MongoDB collections"""
    mongo_uri = os.getenv("MONGODB_URI")
    
    if not mongo_uri:
        print("❌ Error: MONGODB_URI environment variable not set")
        return
    
    client = AsyncIOMotorClient(mongo_uri)
    db = client["AstrathonDb"]
    
    try:
        # Fetch Events
        print("\n" + "="*60)
        print("📍 EVENTS COLLECTION")
        print("="*60)
        events_collection = db["events"]
        events_count = await events_collection.count_documents({})
        print(f"Total events: {events_count}")
        
        if events_count > 0:
            print("\nFirst 3 events:")
            async for i, event in enumerate(events_collection.find({})):
                if i >= 3:
                    break
                print(f"\nEvent {i+1}:")
                pprint(event)
        
        # Fetch Stations
        print("\n" + "="*60)
        print("🛰️ STATIONS COLLECTION")
        print("="*60)
        stations_collection = db["stations"]
        stations_count = await stations_collection.count_documents({})
        print(f"Total stations: {stations_count}")
        
        if stations_count > 0:
            print("\nFirst 3 stations:")
            async for i, station in enumerate(stations_collection.find({})):
                if i >= 3:
                    break
                print(f"\nStation {i+1}:")
                pprint(station)
        
        # Fetch Trajectory Results
        print("\n" + "="*60)
        print("🚀 TRAJECTORY_RESULTS COLLECTION")
        print("="*60)
        trajectory_collection = db["trajectory_results"]
        trajectory_count = await trajectory_collection.count_documents({})
        print(f"Total trajectory results: {trajectory_count}")
        
        if trajectory_count > 0:
            print("\nFirst 3 trajectory results:")
            async for i, trajectory in enumerate(trajectory_collection.find({})):
                if i >= 3:
                    break
                print(f"\nTrajectory {i+1}:")
                pprint(trajectory)
        
        print("\n" + "="*60)
        print("✅ Data fetch completed")
        print("="*60)
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(fetch_all_data())
