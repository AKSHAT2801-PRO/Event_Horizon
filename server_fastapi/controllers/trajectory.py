from database import get_trajectory_results_collection, get_events_collection, get_event_velocity_curve_collection, get_event_station_records_collection
from fastapi import HTTPException
from typing import Dict
from bson import ObjectId
import traceback
import random

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
    Get a random trajectory data for simulation preview using random library
    """
    try:
        collection = await get_trajectory_results_collection()
        
        # Get total count of documents
        total_count = await collection.count_documents({})
        
        if total_count == 0:
            raise HTTPException(status_code=404, detail="No trajectory data available")
        
        # Generate random offset using random library
        random_offset = random.randint(0, total_count - 1)
        
        # Fetch the random document using skip and limit
        trajectory = await collection.find_one({}, skip=random_offset)
        
        if not trajectory:
            raise HTTPException(status_code=404, detail="No trajectory data available")
        
        start_point = trajectory.get("start_point", {})
        end_point = trajectory.get("end_point", {})
        
        event_id = trajectory.get("event_id")
        
        data = {
            "traj_id": str(trajectory.get("_id")),
            "event_id" : event_id,
            "startLat": start_point.get("latitude"),
            "startLng": start_point.get("longitude"),
            "startAltKm": start_point.get("altitude"),
            "endLat": end_point.get("latitude"),
            "endLng": end_point.get("longitude"),
            "endAltKm": end_point.get("altitude"),
            "mass": trajectory.get("mass"),
            "duration": trajectory.get("duration"),
            "initial_velocity": trajectory.get("initial_velocity"),
            "velocity_curve": None,
            "stations": None,
        }
        
        # Fetch event to get event_name and enrich with velocity_curve and stations
        if event_id:
            try:
                events_collection = await get_events_collection()
                event = await events_collection.find_one({"_id": ObjectId(event_id) if len(str(event_id)) == 24 else event_id})
                
                if event:
                    event_name = event.get("name")
                    
                    if event_name:
                        # Fetch velocity curve data
                        velocity_collection = await get_event_velocity_curve_collection()
                        velocity_doc = await velocity_collection.find_one({"event_name": event_name})
                        
                        if velocity_doc and "velocity_curve" in velocity_doc:
                            data["velocity_curve"] = velocity_doc.get("velocity_curve")
                        
                        # Fetch event_station_records
                        stations_collection = await get_event_station_records_collection()
                        stations_doc = await stations_collection.find_one({"event_name": event_name})
                        
                        if stations_doc and "stations" in stations_doc:
                            data["stations"] = stations_doc.get("stations")
            except Exception as e:
                print(f"Error enriching trajectory data: {str(e)}")
                # Continue without enrichment if there's an error
        
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
        trajectory_event_id = trajectory.get("event_id")
        
        data = {
            "traj_id": str(trajectory.get("_id")),
            "event_id" : trajectory_event_id,
            "startLat": start_point.get("latitude"),
            "startLng": start_point.get("longitude"),
            "startAltKm": start_point.get("altitude"),
            "endLat": end_point.get("latitude"),
            "endLng": end_point.get("longitude"),
            "endAltKm": end_point.get("altitude"),
            "mass": trajectory.get("mass"),
            "duration": trajectory.get("duration"),
            "initial_velocity": trajectory.get("initial_velocity"),
            "velocity_curve": None,
            "stations": None,
        }
        
        # Fetch event to get event_name and enrich with velocity_curve and stations
        if trajectory_event_id:
            try:
                events_collection = await get_events_collection()
                event = await events_collection.find_one({"_id": ObjectId(trajectory_event_id) if len(str(trajectory_event_id)) == 24 else trajectory_event_id})
                
                if event:
                    event_name = event.get("name")
                    
                    if event_name:
                        # Fetch velocity curve data
                        velocity_collection = await get_event_velocity_curve_collection()
                        velocity_doc = await velocity_collection.find_one({"event_name": event_name})
                        
                        if velocity_doc and "velocity_curve" in velocity_doc:
                            data["velocity_curve"] = velocity_doc.get("velocity_curve")
                        
                        # Fetch event_station_records
                        stations_collection = await get_event_station_records_collection()
                        stations_doc = await stations_collection.find_one({"event_name": event_name})
                        
                        if stations_doc and "stations" in stations_doc:
                            data["stations"] = stations_doc.get("stations")
            except Exception as e:
                print(f"Error enriching trajectory data: {str(e)}")
                # Continue without enrichment if there's an error
        
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

async def handle_get_trajectory_by_id(trajectory_id: str) -> Dict:
    """
    Get trajectory data by trajectory _id with velocity curve data
    """
    try:
        print(f"Fetching trajectory by _id: {trajectory_id}")
        traj_collection = await get_trajectory_results_collection()
        
        # Convert trajectory_id string to ObjectId
        try:
            object_id = ObjectId(trajectory_id)
            trajectory = await traj_collection.find_one({"_id": object_id})
        except:
            # If conversion fails, try as string
            trajectory = await traj_collection.find_one({"_id": trajectory_id})
        
        if not trajectory:
            raise HTTPException(status_code=404, detail="Trajectory not found")
        
        start_point = trajectory.get("start_point", {})
        end_point = trajectory.get("end_point", {})
        event_id = trajectory.get("event_id")
        
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
            "event_id": event_id,
            "velocity_curve": None,
            "stations": None,
        }
        
        # Fetch event to get event_name
        if event_id:
            try:
                events_collection = await get_events_collection()
                # Try to find event by event_id (string)
                event = await events_collection.find_one({"_id": ObjectId(event_id) if len(str(event_id)) == 24 else event_id})
                
                if event:
                    event_name = event.get("name")
                    
                    # Fetch velocity curve data using event_name
                    if event_name:
                        velocity_collection = await get_event_velocity_curve_collection()
                        velocity_doc = await velocity_collection.find_one({"event_name": event_name})
                        
                        if velocity_doc and "velocity_curve" in velocity_doc:
                            data["velocity_curve"] = velocity_doc.get("velocity_curve")
                            print(f"Fetched velocity curve for event: {event_name}")
                        else:
                            print(f"No velocity curve data found for event: {event_name}")
                        
                        # Fetch event_station_records using event_name
                        stations_collection = await get_event_station_records_collection()
                        stations_doc = await stations_collection.find_one({"event_name": event_name})
                        
                        if stations_doc and "stations" in stations_doc:
                            data["stations"] = stations_doc.get("stations")
                            print(f"Fetched {len(stations_doc.get('stations', []))} stations for event: {event_name}")
                        else:
                            print(f"No station records found for event: {event_name}")
            except Exception as e:
                print(f"Error fetching velocity curve data: {str(e)}")
                # Continue without velocity_curve if there's an error
        
        return serialize_doc(data)
    
    except HTTPException:
        raise
    except Exception as err:
        print(f"Get trajectory by ID endpoint error: {str(err)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching trajectory: {str(err)}"
        )
