import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def add_mock_velocity_curve():
    """Add mock data to event_velocity_curve collection"""
    mongo_uri = os.getenv("MONGODB_URI")
    
    if not mongo_uri:
        print("❌ Error: MONGODB_URI environment variable not set")
        return
    
    client = AsyncIOMotorClient(mongo_uri)
    db = client["AstrathonDb"]
    
    try:
        collection = db["event_velocity_curve"]
        
        # Mock data
        mock_data = {
            "event_name": "20190101034424_54p5G",
            "velocity_curve": [
                {"t": 0, "v": 19.9437},
                {"t": 0.0421, "v": 19.9437},
                {"t": 0.0842, "v": 19.9437},
                {"t": 0.1263, "v": 19.9437},
                {"t": 0.1683, "v": 19.9437},
                {"t": 0.2104, "v": 19.9437},
                {"t": 0.2525, "v": 19.9437},
                {"t": 0.2946, "v": 19.9437},
                {"t": 0.3367, "v": 19.9437},
                {"t": 0.3788, "v": 19.9437},
                {"t": 0.4208, "v": 19.9437},
                {"t": 0.4629, "v": 19.9437},
                {"t": 0.505, "v": 19.9437},
                {"t": 0.5471, "v": 19.9437},
                {"t": 0.5892, "v": 19.9437},
                {"t": 0.6312, "v": 19.9437},
                {"t": 0.6733, "v": 19.9437},
                {"t": 0.7154, "v": 19.9437},
                {"t": 0.7575, "v": 19.9437},
                {"t": 0.7996, "v": 19.9437},
                {"t": 0.8417, "v": 19.9437},
                {"t": 0.8838, "v": 19.9437},
                {"t": 0.9258, "v": 19.9437},
                {"t": 0.9679, "v": 19.9437},
                {"t": 1.01, "v": 19.9437},
            ]
        }
        
        # Check if document already exists
        existing = await collection.find_one({"event_name": mock_data["event_name"]})
        
        if existing:
            print(f"⚠️  Document with event_name '{mock_data['event_name']}' already exists")
            print(f"Document ID: {existing['_id']}")
        else:
            # Insert the mock data
            result = await collection.insert_one(mock_data)
            print(f"✅ Mock data inserted successfully")
            print(f"Document ID: {result.inserted_id}")
            print(f"Event Name: {mock_data['event_name']}")
            print(f"Velocity Curve Points: {len(mock_data['velocity_curve'])}")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()
        print("Database connection closed")

if __name__ == "__main__":
    print("🔄 Adding mock data to event_velocity_curve collection...")
    asyncio.run(add_mock_velocity_curve())
