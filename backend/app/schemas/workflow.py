from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from uuid import UUID, uuid4
from datetime import datetime

class ConnectionBase(BaseModel):
    """Base model for workflow connections."""
    source_id: UUID
    target_id: UUID
    config: Optional[Dict[str, Any]] = Field(default_factory=dict)

class ConnectionCreate(ConnectionBase):
    """Model for creating a new connection."""
    pass

class ConnectionUpdate(BaseModel):
    """Model for updating an existing connection."""
    config: Optional[Dict[str, Any]] = None

class ConnectionInDB(ConnectionBase):
    """Model for connection data stored in the database."""
    id: UUID = Field(default_factory=uuid4)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True

class ConnectionResponse(ConnectionInDB):
    """Response model for connection data."""
    pass

class WorkflowBase(BaseModel):
    """Base model for workflow data."""
    name: str
    description: Optional[str] = None
    tags: Optional[List[str]] = Field(default_factory=list)
    config: Optional[Dict[str, Any]] = Field(default_factory=dict)

class WorkflowCreate(WorkflowBase):
    """Model for creating a new workflow."""
    agent_ids: List[UUID]
    connections: List[ConnectionCreate] = Field(default_factory=list)

class WorkflowUpdate(BaseModel):
    """Model for updating an existing workflow."""
    name: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    config: Optional[Dict[str, Any]] = None
    agent_ids: Optional[List[UUID]] = None
    connections: Optional[List[ConnectionCreate]] = None

class WorkflowInDB(WorkflowBase):
    """Model for workflow data stored in the database."""
    id: UUID = Field(default_factory=uuid4)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    is_active: bool = True
    execution_count: int = 0
    average_execution_time: float = 0.0
    last_execution_time: Optional[float] = None
    last_execution_status: Optional[str] = None

    class Config:
        from_attributes = True

class WorkflowResponse(WorkflowInDB):
    """Response model for workflow data."""
    agents: List[UUID]
    connections: List[ConnectionResponse] 