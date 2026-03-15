from fastapi import APIRouter, Query
from controllers.velocity_curve import handle_get_velocity_curve
from models.schemas import EventVelocityCurveResponse

router = APIRouter()

@router.get("/", response_model=EventVelocityCurveResponse)
async def get_velocity_curve(event_name: str = Query(...)):
    """
    Get velocity curve data by event name
    """
    return await handle_get_velocity_curve(event_name=event_name)
