from fastapi import WebSocket
from typing import Dict, List, Set, Any
import json
from uuid import UUID

class WebsocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.agent_subscriptions: Dict[UUID, Set[WebSocket]] = {}
        
    async def connect(self, websocket: WebSocket):
        """
        Connect a new WebSocket client
        """
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        """
        Disconnect a WebSocket client and clean up subscriptions
        """
        self.active_connections.remove(websocket)
        
        # Remove this websocket from all agent subscriptions
        for agent_id in self.agent_subscriptions:
            if websocket in self.agent_subscriptions[agent_id]:
                self.agent_subscriptions[agent_id].remove(websocket)
    
    async def subscribe_to_agents(self, websocket: WebSocket, agent_ids: List[UUID]):
        """
        Subscribe a WebSocket to updates from specific agents
        """
        for agent_id in agent_ids:
            if agent_id not in self.agent_subscriptions:
                self.agent_subscriptions[agent_id] = set()
            self.agent_subscriptions[agent_id].add(websocket)
    
    async def unsubscribe_from_agents(self, websocket: WebSocket, agent_ids: List[UUID]):
        """
        Unsubscribe a WebSocket from updates from specific agents
        """
        for agent_id in agent_ids:
            if agent_id in self.agent_subscriptions and websocket in self.agent_subscriptions[agent_id]:
                self.agent_subscriptions[agent_id].remove(websocket)
    
    async def broadcast_agent_update(self, agent_id: UUID, data: Dict[str, Any]):
        """
        Broadcast an update about a specific agent to all subscribed clients
        """
        if agent_id in self.agent_subscriptions:
            message = json.dumps({
                "type": "agent_update",
                "agent_id": str(agent_id),
                "data": data
            })
            
            for websocket in self.agent_subscriptions[agent_id]:
                try:
                    await websocket.send_text(message)
                except Exception:
                    # Connection might be closed or broken
                    # Will be cleaned up by disconnect method later
                    pass
    
    async def broadcast(self, message: str):
        """
        Broadcast a message to all connected clients
        """
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                # Connection might be closed or broken
                # Will be cleaned up by disconnect method later
                pass 