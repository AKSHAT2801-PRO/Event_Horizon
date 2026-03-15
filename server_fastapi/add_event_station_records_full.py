import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# Complete event_station_records data
event_station_data = [
  {"event_name": "20190101034424_54p5G", "stations": ["US0001", "US0003"]},
  {"event_name": "20190101040455_0h4Nf", "stations": ["US0001", "US0003"]},
  {"event_name": "20190101072017_ydPyT", "stations": ["US0003", "US0009"]},
  {"event_name": "20190101073920_8VoS2", "stations": ["US0003", "US0009"]},
  {"event_name": "20190102091919_1KtJa", "stations": ["US0001", "US0003", "US0009"]},
  {"event_name": "20190102092322_UkbbD", "stations": ["US0001", "US0008"]},
  {"event_name": "20190102093257_a24PW", "stations": ["US0003", "US0009"]},
  {"event_name": "20190102101547_tcvE4", "stations": ["US0001", "US0008"]},
  {"event_name": "20190102103655_txSo1", "stations": ["US0001", "US0009"]},
  {"event_name": "20190102105243_kvl8g", "stations": ["US0001", "US0009"]},
  {"event_name": "20190103031943_HNcFu", "stations": ["US0001", "US0003"]},
  {"event_name": "20190103035847_eSDEC", "stations": ["US0001", "US0003"]},
  {"event_name": "20190103042549_oOt6i", "stations": ["US0001", "US0003"]},
  {"event_name": "20190103043126_NQCOl", "stations": ["US0001", "US0003"]},
  {"event_name": "20190103045409_cUWvZ", "stations": ["US0001", "US0002", "US0003"]},
  {"event_name": "20190103054900_OI46g", "stations": ["US0002", "US0008"]},
  {"event_name": "20190103054903_shDq6", "stations": ["US0001", "US0003"]},
  {"event_name": "20190103055644_DYMk3", "stations": ["US0001", "US0003"]},
  {"event_name": "20190103064518_vrugG", "stations": ["US0001", "US0003"]},
  {"event_name": "20190103065333_cBO6T", "stations": ["US0001", "US0003"]},
  {"event_name": "20190103072443_Ykw4g", "stations": ["US0001", "US0009"]},
  {"event_name": "20190103073018_F6wrt", "stations": ["US0003", "US0009"]},
  {"event_name": "20190103074619_Kq9mT", "stations": ["US0003", "US0009"]},
  {"event_name": "20190103075611_W3lCz", "stations": ["US0003", "US0009"]},
  {"event_name": "20190103081607_uBMHu", "stations": ["US0001", "US0003"]},
  {"event_name": "20190103081711_rN7QA", "stations": ["US0003", "US0009"]},
  {"event_name": "20190103082127_OnS1c", "stations": ["US0002", "US0003"]},
  {"event_name": "20190103082533_pi62l", "stations": ["US0003", "US0009"]},
  {"event_name": "20190103090024_6LjHJ", "stations": ["US0002", "US0009"]},
  {"event_name": "20190103090333_rY4Du", "stations": ["US0003", "US0009"]},
  {"event_name": "20190103090519_4lglH", "stations": ["US0001", "US0002", "US0003"]},
  {"event_name": "20190103095236_2Ir2t", "stations": ["US0001", "US0003"]},
  {"event_name": "20190103100545_lqr6Z", "stations": ["US0003", "US0009"]},
  {"event_name": "20190103101109_Tj3LA", "stations": ["US0002", "US0003"]},
  {"event_name": "20190103101956_rNbYF", "stations": ["US0001", "US0003"]},
  {"event_name": "20190103104141_Ha9Uf", "stations": ["US0003", "US0009"]},
  {"event_name": "20190103104916_1293M", "stations": ["US0001", "US0009"]},
  {"event_name": "20190103105148_4zD09", "stations": ["US0001", "US0003", "US0009"]},
  {"event_name": "20190103110539_kElX2", "stations": ["US0001", "US0002", "US0003"]},
  {"event_name": "20190103112231_CxO3B", "stations": ["US0003", "US0009"]},
  {"event_name": "20190103113648_YZxfd", "stations": ["US0003", "US0009"]},
  {"event_name": "20190103114833_GZw8e", "stations": ["US0003", "US0009"]},
  {"event_name": "20190103115134_D30Ly", "stations": ["US0001", "US0003"]},
  {"event_name": "20190103115605_FPFiP", "stations": ["US0001", "US0003"]},
  {"event_name": "20190103120935_WsVYk", "stations": ["US0001", "US0003"]},
  {"event_name": "20190103121823_37mzv", "stations": ["US0001", "US0009"]},
  {"event_name": "20190103123208_zoDkp", "stations": ["US0001", "US0003"]},
  {"event_name": "20190103124517_mfVAc", "stations": ["US0001", "US0003"]},
  {"event_name": "20190103125242_6dy2X", "stations": ["US0001", "US0002", "US0003"]}
]

async def add_full_event_station_records():
    """Add complete event_station_records data to MongoDB"""
    mongo_uri = os.getenv("MONGODB_URI")
    
    if not mongo_uri:
        print("❌ Error: MONGODB_URI environment variable not set")
        return
    
    client = AsyncIOMotorClient(mongo_uri)
    db = client["AstrathonDb"]
    
    try:
        collection = db["event_station_records"]
        
        # Delete existing data to start fresh
        delete_result = await collection.delete_many({})
        print(f"🗑️  Deleted {delete_result.deleted_count} existing documents")
        
        # Insert all the data
        result = await collection.insert_many(event_station_data)
        print(f"✅ Successfully inserted {len(result.inserted_ids)} documents into 'event_station_records' collection")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()
        print("Database connection closed")

if __name__ == "__main__":
    print("🔄 Adding complete event_station_records data to MongoDB...")
    asyncio.run(add_full_event_station_records())
