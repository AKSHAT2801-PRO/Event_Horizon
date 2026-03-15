import asyncio
import os
import json
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# Mock data for event_station_records
event_station_data = [
  {
    "event_name": "20190101034424_54p5G",
    "stations": [
      "US0001",
      "US0003"
    ]
  },
  {
    "event_name": "20190101040455_0h4Nf",
    "stations": [
      "US0001",
      "US0003"
    ]
  },
  {
    "event_name": "20190101072017_ydPyT",
    "stations": [
      "US0003",
      "US0009"
    ]
  },
  {
    "event_name": "20190101073920_8VoS2",
    "stations": [
      "US0003",
      "US0009"
    ]
  },
  {
    "event_name": "20190102091919_1KtJa",
    "stations": [
      "US0001",
      "US0003",
      "US0009"
    ]
  }
]

async def add_event_station_records():
    """Add event_station_records data to MongoDB"""
    mongo_uri = os.getenv("MONGODB_URI")
    
    if not mongo_uri:
        print("❌ Error: MONGODB_URI environment variable not set")
        return
    
    client = AsyncIOMotorClient(mongo_uri)
    db = client["AstrathonDb"]
    
    try:
        collection = db["event_station_records"]
        
        # Check if collection already has data
        existing_count = await collection.count_documents({})
        
        if existing_count > 0:
            print(f"⚠️  Collection 'event_station_records' already has {existing_count} documents")
            print("Skipping insertion to avoid duplicates.")
        else:
            # Insert all the data
            result = await collection.insert_many(event_station_data)
            print(f"✅ Successfully inserted {len(result.inserted_ids)} documents into 'event_station_records' collection")
            print(f"First document ID: {result.inserted_ids[0]}")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()
        print("Database connection closed")

if __name__ == "__main__":
    print("🔄 Adding event_station_records data to MongoDB...")
    asyncio.run(add_event_station_records())
