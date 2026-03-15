from database import get_events_collection
from datetime import datetime
from typing import Optional, List, Dict
from fastapi import HTTPException
from bson import ObjectId
import json
import traceback

def serialize_doc(doc):
    if doc is None:
        return None
    
    if isinstance(doc, ObjectId):
        return str(doc)
    
    if isinstance(doc, dict):
        new_doc = {}
        for k, v in doc.items():
            if k == "_id":
                new_doc["id"] = str(v)
            else:
                new_doc[k] = serialize_doc(v)
        return new_doc
    
    if isinstance(doc, list):
        return [serialize_doc(i) for i in doc]
    
    return doc

async def handle_search_event(
    searchQuery: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    shower: Optional[str] = None,
    region: Optional[str] = None
) -> List[Dict]:
    """
    Search for events by shower code or region, optionally filtered by date range
    """
    print(region)
    try:
        collection = await get_events_collection()
        query = {}
        
        # Build search query
        if searchQuery:
            query["$or"] = [
                {"shower": {"$regex": searchQuery, "$options": "i"}},
                {"region": {"$regex": searchQuery, "$options": "i"}}
            ]
        
        # Build date range query
        if start_date and end_date:
            try:
                start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                query["date"] = {"$gte": start_date, "$lte": end_date}
            except ValueError as e:
                raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
        
        if region != "All":
            query["region"] = region
        if shower != "All":
            query["shower"] = shower
            
        # Find events
        events = []
        
        # If database is available, try to fetch from there
        try:
            async for event in collection.find(query):
                # Serialize the document to handle ObjectId
                serialized = serialize_doc(event)
                events.append(serialized)
        except Exception as db_err:
            # Fall back to mock events if database fails
            print(f"Database query failed: {str(db_err)}, using mock events")
    
        
        return events
    
    except HTTPException:
        raise
    except Exception as err:
        print(f"Event endpoint error: {str(err)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Internal Server Error: {str(err)}"
        )
