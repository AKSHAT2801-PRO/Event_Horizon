from database import get_trajectory_results_collection
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

async def handle_random_trajectory() -> Dict:
    """
    Get a random trajectory data for simulation preview
    """
    try:
        collection = await get_trajectory_results_collection()
        
        # Use MongoDB aggregation to get a random document
        pipeline = [
            {"$sample": {"size": 1}}
        ]
        
        result = await collection.aggregate(pipeline).to_list(1)
        
        if not result:
            raise HTTPException(status_code=404, detail="No trajectory data available")
        
        trajectory = result[0]
        
        start_point = trajectory.get("start_point", {})
        end_point = trajectory.get("end_point", {})
        
        data = {
            "traj_id": str(trajectory.get("_id")),
            "startLat": start_point.get("latitude"),
            "startLng": start_point.get("longitude"),
            "startAltKm": start_point.get("altitude"),
            "endLat": end_point.get("latitude"),
            "endLng": end_point.get("longitude"),
            "endAltKm": end_point.get("altitude"),
            "mass": trajectory.get("mass"),
            "duration": trajectory.get("duration"),
            "initial_velocity": trajectory.get("initial_velocity"),
        }
        
        return serialize_doc(data)
    
    except HTTPException:
        raise
    except Exception as err:
        print(f"Random trajectory endpoint error: {str(err)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching random trajectory: {str(err)}"
        )


async def handle_meteor_data(event_id: str) -> Dict:
    """
    Get meteor trajectory data by event ID
    """
    try:
        print(f"Fetching trajectory for event_id: {event_id}")
        collection = await get_trajectory_results_collection()
        
        # Try to convert event_id to ObjectId if it's a valid MongoDB ObjectId string
        query = {"event_id": event_id}
        try:
            print(event_id)
            if len(event_id) == 24:  # Valid ObjectId length
                object_id = ObjectId(event_id)
                # Try both as string and ObjectId
                trajectory = await collection.find_one({'event_id':event_id})
                if not trajectory:
                    trajectory = await collection.find_one({"event_id": object_id})
                if not trajectory:
                    trajectory = await collection.find_one({"event_id": event_id})
            else:
                trajectory = await collection.find_one(query)
        except:
            # If ObjectId conversion fails, just use string
            trajectory = await collection.find_one(query)
        
        if not trajectory:
            raise HTTPException(status_code=404, detail="Trajectory not found")
        
        start_point = trajectory.get("start_point", {})
        end_point = trajectory.get("end_point", {})
        
        data = {
            "traj_id": str(trajectory.get("_id")),
            "startLat": start_point.get("latitude"),
            "startLng": start_point.get("longitude"),
            "startAltKm": start_point.get("altitude"),
            "endLat": end_point.get("latitude"),
            "endLng": end_point.get("longitude"),
            "endAltKm": end_point.get("altitude"),
            "mass": trajectory.get("mass"),
            "duration": trajectory.get("duration"),
            "initial_velocity": trajectory.get("initial_velocity"),
        }
        
        return serialize_doc(data)
    
    except HTTPException:
        raise
    except Exception as err:
        print(f"Trajectory endpoint error: {str(err)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Invalid Data: {str(err)}"
        )
