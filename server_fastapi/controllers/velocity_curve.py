from database import get_event_velocity_curve_collection
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

async def handle_get_velocity_curve(event_name: str) -> Dict:
    """
    Get velocity curve data by event name
    """
    try:
        collection = await get_event_velocity_curve_collection()
        velocity_curve = await collection.find_one({"event_name": event_name})
        
        if not velocity_curve:
            raise HTTPException(status_code=404, detail="Velocity curve data not found for this event")
        
        data = {
            "event_name": velocity_curve.get("event_name"),
            "velocity_curve": velocity_curve.get("velocity_curve", []),
        }
        
        return serialize_doc(data)
    
    except HTTPException:
        raise
    except Exception as err:
        print(f"Get velocity curve endpoint error: {str(err)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching velocity curve: {str(err)}"
        )
