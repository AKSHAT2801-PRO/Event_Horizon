from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
from datetime import datetime
from models.schemas import EventResponse
from controllers.events import handle_search_event, handle_get_regions, handle_get_showers

router = APIRouter()

@router.get("/", response_model=List[EventResponse])
async def search_event(
    searchQuery: Optional[str] = Query(None),
    dateFrom: Optional[str] = Query(None),
    dateTo: Optional[str] = Query(None),
    shower: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    page: int = Query(1, ge=1)
):
    """
    Search for events by shower code or region, optionally filtered by date range
    Returns 30 events per page
    """
    return await handle_search_event(
        searchQuery=searchQuery,
        start_date=dateFrom,
        end_date=dateTo,
        shower=shower,
        region=region,
        page=page
    )

@router.get("/regions", response_model=List[str])
async def get_regions():
    """
    Get all distinct regions from events collection
    """
    return await handle_get_regions()

@router.get("/showers", response_model=List[str])
async def get_showers():
    """
    Get all distinct showers from events collection
    """
    return await handle_get_showers()
