from fastapi import APIRouter
from app.api.endpoints import health, buses, events, websockets

api_router = APIRouter()
api_router.include_router(buses.router)
api_router.include_router(events.router)
api_router.include_router(websockets.router)

