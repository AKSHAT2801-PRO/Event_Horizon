import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from bson import ObjectId

load_dotenv()

async def assign_event_ids_from_index():
    """Assign event _id to trajectory_results from index 501 onwards"""
    mongo_uri = os.getenv("MONGODB_URI")
    
    if not mongo_uri:
        print("❌ Error: MONGODB_URI environment variable not set")
        return
    
    client = AsyncIOMotorClient(mongo_uri)
    db = client["AstrathonDb"]
    
    try:
        events_collection = db["events"]
        trajectory_collection = db["trajectory_results"]
        
        # Get all events
        events = []
        async for event in events_collection.find({}):
            events.append(event)
        
        print(f"📍 Found {len(events)} events")
        
        # Get total trajectory count
        total_trajectories = await trajectory_collection.count_documents({})
        print(f"🚀 Total trajectories in collection: {total_trajectories}")
        
        if len(events) == 0:
            print("❌ No events found in database")
            return
        
        # Get trajectories from index 500 onwards (skip first 500)
        start_index = 500
        trajectories_to_update = []
        
        async for trajectory in trajectory_collection.find({}).skip(start_index):
            trajectories_to_update.append(trajectory)
        
        print(f"📊 Found {len(trajectories_to_update)} trajectories to update (from index {start_index} onwards)")
        
        if len(trajectories_to_update) == 0:
            print("✅ No trajectories to update")
            return
        
        # Assign event_id to trajectories index-wise
        updated_count = 0
        
        for i, trajectory in enumerate(trajectories_to_update):
            # Calculate the actual index in the full collection
            actual_index = start_index + i
            
            # Get event _id at same index (cycle through if trajectories > events)
            event_index = actual_index % len(events)
            event_id = str(events[event_index]["_id"])  # Convert to string
            
            # Update trajectory with event_id
            result = await trajectory_collection.update_one(
                {"_id": trajectory["_id"]},
                {"$set": {"event_id": event_id}}
            )
            
            if result.modified_count > 0:
                updated_count += 1
                if (i + 1) % 100 == 0:  # Print every 100 updates
                    print(f"✓ Updated {i+1}/{len(trajectories_to_update)} trajectories...")
            else:
                print(f"✗ Trajectory at index {actual_index}: Failed to update")
        
        print(f"\n✅ Successfully updated {updated_count}/{len(trajectories_to_update)} trajectories")
        print(f"📊 Assignment range: Index {start_index+1} to {start_index + len(trajectories_to_update)}")
        print(f"📊 Assignment: Index-wise mapping (cycles through {len(events)} events)")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()
        print("Database connection closed")

if __name__ == "__main__":
    print("🔄 Starting event_id assignment from index 501 onwards...")
    asyncio.run(assign_event_ids_from_index())
