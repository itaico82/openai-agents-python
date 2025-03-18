from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Dict, Any, Optional
from uuid import UUID

from app.schemas.agent import AgentCreate, AgentUpdate, AgentResponse
from app.services.agent_service import AgentService

router = APIRouter()

@router.get("/", response_model=List[AgentResponse])
async def get_agents():
    """
    Retrieve all agents.
    """
    return await AgentService.get_all_agents()

@router.post("/", response_model=AgentResponse)
async def create_agent(agent: AgentCreate):
    """
    Create a new agent.
    """
    return await AgentService.create_agent(agent)

@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: UUID):
    """
    Get a specific agent by ID.
    """
    agent = await AgentService.get_agent(agent_id)
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent with ID {agent_id} not found"
        )
    return agent

@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(agent_id: UUID, agent_update: AgentUpdate):
    """
    Update an existing agent.
    """
    updated_agent = await AgentService.update_agent(agent_id, agent_update)
    if not updated_agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent with ID {agent_id} not found"
        )
    return updated_agent

@router.delete("/{agent_id}", response_model=Dict[str, Any])
async def delete_agent(agent_id: UUID):
    """
    Delete an agent.
    """
    deleted = await AgentService.delete_agent(agent_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent with ID {agent_id} not found"
        )
    return {"success": True, "message": f"Agent with ID {agent_id} deleted"}

@router.post("/{agent_id}/execute", response_model=Dict[str, Any])
async def execute_agent(agent_id: UUID, input_data: Dict[str, Any]):
    """
    Execute an agent with the provided input.
    """
    try:
        result = await AgentService.execute_agent(agent_id, input_data)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{agent_id}/status", response_model=Dict[str, Any])
async def get_agent_status(agent_id: UUID):
    """
    Get the current status of an agent.
    """
    status = await AgentService.get_agent_status(agent_id)
    if not status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent with ID {agent_id} not found"
        )
    return status 