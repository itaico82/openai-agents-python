from fastapi import APIRouter
from app.api.endpoints import agents, workflows, websocket

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(agents.router, prefix="/agents", tags=["agents"])
api_router.include_router(workflows.router, prefix="/workflows", tags=["workflows"])
api_router.include_router(websocket.router, prefix="/ws", tags=["websocket"]) 