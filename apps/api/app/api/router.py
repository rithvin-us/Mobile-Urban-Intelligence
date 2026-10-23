from fastapi import APIRouter
from app.api.endpoints import buses, events, websockets, clusters

api_router = APIRouter()
api_router.include_router(buses.router)
# Clusters must be registered before events: its path /events/clusters would
# otherwise be matched by the events router's /events/{event_id}, which is
# declared first and would answer 404 for the literal id "clusters".
api_router.include_router(clusters.router)
api_router.include_router(events.router)
api_router.include_router(websockets.router)


