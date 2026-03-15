import asyncio
import os
import json
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def add_event_station_records_from_json(json_file_path):
    """Add event_station_records data from JSON file to MongoDB"""
    mongo_uri = os.getenv("MONGODB_URI")
    
    if not mongo_uri:
        print("❌ Error: MONGODB_URI environment variable not set")
        return
    
    if not os.path.exists(json_file_path):
        print(f"❌ Error: JSON file not found at {json_file_path}")
        return
    
    client = AsyncIOMotorClient(mongo_uri)
    db = client["AstrathonDb"]
    
    try:
        # Load data from JSON file
        with open(json_file_path, 'r') as f:
            event_station_data = json.load(f)
        
        print(f"📖 Loaded {len(event_station_data)} records from JSON file")
        
        collection = db["event_station_records"]
        
        # Delete existing data to start fresh
        delete_result = await collection.delete_many({})
        print(f"🗑️  Deleted {delete_result.deleted_count} existing documents")
        
        # Insert all the data in batches
        batch_size = 100
        total_inserted = 0
        
        for i in range(0, len(event_station_data), batch_size):
            batch = event_station_data[i:i + batch_size]
            result = await collection.insert_many(batch)
            total_inserted += len(result.inserted_ids)
            print(f"✅ Inserted batch {i//batch_size + 1}: {len(result.inserted_ids)} documents")
        
        print(f"\n🎉 Successfully inserted {total_inserted} total documents into 'event_station_records' collection")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()
        print("Database connection closed")

if __name__ == "__main__":
    json_file = "event_station_records.json"
    print(f"🔄 Adding event_station_records data from {json_file} to MongoDB...")
    asyncio.run(add_event_station_records_from_json(json_file))
