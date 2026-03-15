from database import get_stations_collection
from fastapi import HTTPException
from typing import Dict
from bson import ObjectId
import traceback

def serialize_doc(doc):
    """Convert MongoDB documents to JSON-serializable format"""
    if doc is None:
        return None
    if isinstance(doc, ObjectId):
        return str(doc)
    if isinstance(doc, dict):
        return {k: serialize_doc(v) for k, v in doc.items()}
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    return doc

async def handle_station(station_name: str) -> Dict:
    """
    Get recorded station data by station name
    """
    try:
        collection = await get_stations_collection()
        station_data = await collection.find_one({"station_name": station_name})
        
        if station_data:
            data = {
                "station_id": str(station_data.get("_id")),
                "station_name": station_data.get("station_name"),
                "latitude": station_data.get("location", {}).get("latitude"),
                "longitude": station_data.get("location", {}).get("longitude"),
                "altitude": station_data.get("location", {}).get("altitude"),
                "shower_code": station_data.get("shower_code"),
            }
            return serialize_doc(data)
        else:
            raise HTTPException(status_code=404, detail="Station not found")
    
    except HTTPException:
        raise
    except Exception as err:
        print(f"Station endpoint error: {str(err)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Error: {str(err)}"
        )
