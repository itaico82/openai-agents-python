from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from uuid import UUID, uuid4
from datetime import datetime

class AgentBase(BaseModel):
    """Base model for agent data."""
    name: str
    prompt: str
    tools: Optional[List[str]] = Field(default_factory=list)
    parameters: Optional[Dict[str, Any]] = Field(default_factory=dict)

class AgentCreate(AgentBase):
    """Model for creating a new agent."""
    pass

class AgentUpdate(BaseModel):
    """Model for updating an existing agent."""
    name: Optional[str] = None
    prompt: Optional[str] = None
    tools: Optional[List[str]] = None
    parameters: Optional[Dict[str, Any]] = None

class AgentInDB(AgentBase):
    """Model for agent data stored in the database."""
    id: UUID = Field(default_factory=uuid4)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    status: str = "idle"
    last_input: Optional[str] = None
    last_output: Optional[str] = None
    execution_count: int = 0
    average_execution_time: float = 0.0
    last_execution_time: Optional[float] = None

    class Config:
        from_attributes = True

class AgentResponse(AgentInDB):
    """Response model for agent data."""
    pass

class AgentStatusUpdate(BaseModel):
    """Model for updating agent status."""
    status: str
    last_input: Optional[str] = None
    last_output: Optional[str] = None
    execution_time: Optional[float] = None 