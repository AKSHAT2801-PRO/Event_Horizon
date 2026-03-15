import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from bson import ObjectId

load_dotenv()

async def assign_event_ids_to_trajectories():
    """Assign event _id to trajectory_results event_id field index-wise from 500 onwards"""
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
        
        # Get all trajectories that don't have event_id assigned (or have empty event_id)
        trajectories = []
        async for trajectory in trajectory_collection.find({"event_id": {"$eq": None}}):
            trajectories.append(trajectory)
        
        print(f"🚀 Found {len(trajectories)} trajectories without event_id")
        
        if len(events) == 0:
            print("❌ No events found in database")
            return
        
        if len(trajectories) == 0:
            print("✅ All trajectories already have event_id assigned")
            return
        
        # Count already assigned trajectories
        total_trajectories = await trajectory_collection.count_documents({})
        already_assigned = total_trajectories - len(trajectories)
        
        print(f"📊 Already assigned: {already_assigned} trajectories")
        print(f"📊 Now assigning: {len(trajectories)} trajectories (from index {already_assigned} onwards)")
        
        # Assign event_id to trajectories index-wise starting from already_assigned
        updated_count = 0
        
        for i, trajectory in enumerate(trajectories):
            # Calculate the actual index in the full collection
            actual_index = already_assigned + i
            
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
                if (i + 1) % 50 == 0:  # Print every 50 updates
                    print(f"✓ Trajectory {actual_index+1}: Updated with event_id from event {event_index+1}")
            else:
                print(f"✗ Trajectory {actual_index+1}: Failed to update")
        
        print(f"\n✅ Successfully updated {updated_count}/{len(trajectories)} trajectories")
        print(f"📊 Assignment range: Index {already_assigned} to {already_assigned + len(trajectories) - 1}")
        print(f"📊 Assignment: Index-wise mapping (cycles if trajectories > events)")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()
        print("Database connection closed")

if __name__ == "__main__":
    print("🔄 Starting event_id assignment to trajectories...")
    asyncio.run(assign_event_ids_to_trajectories())
