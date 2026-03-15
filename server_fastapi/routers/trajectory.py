from fastapi import APIRouter, Query, Request
from controllers.trajectory import handle_meteor_data, handle_random_trajectory
from models.schemas import TrajectoryResponse

router = APIRouter()

@router.get("/", response_model=TrajectoryResponse)
async def get_trajectory(
    request: Request,
    event_id: str = Query(...)
):
    """
    Get meteor trajectory data by event ID
    """

    # Print all query params
    print("All query params:", dict(request.query_params))

    return await handle_meteor_data(event_id=event_id)

@router.get("/random", response_model=TrajectoryResponse)
async def get_random_trajectory():
    """
    Get a random trajectory data for simulation preview
    """
    return await handle_random_trajectory()