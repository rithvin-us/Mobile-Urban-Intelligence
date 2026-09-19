from fastapi import APIRouter
from app.api.endpoints import buses, events, websockets, clusters

api_router = APIRouter()
api_router.include_router(buses.router)
api_router.include_router(events.router)
api_router.include_router(websockets.router)
api_router.include_router(clusters.router)


