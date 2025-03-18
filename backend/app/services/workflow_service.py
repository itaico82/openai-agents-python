from typing import List, Dict, Any, Optional
from uuid import UUID
import time
import asyncio
from datetime import datetime

from app.schemas.workflow import (
    WorkflowCreate, WorkflowUpdate, WorkflowResponse, WorkflowInDB,
    ConnectionCreate, ConnectionUpdate, ConnectionInDB, ConnectionResponse
)
from app.services.agent_service import AgentService
from app.services.websocket_manager import WebsocketManager

# Temporarily use in-memory database for development
# This would be replaced with a proper database in production
workflows_db: Dict[UUID, WorkflowInDB] = {}
connections_db: Dict[UUID, ConnectionInDB] = {}
workflow_agents: Dict[UUID, List[UUID]] = {}  # Maps workflow_id to list of agent_ids

# Get WebSocket manager instance
websocket_manager = WebsocketManager()

class WorkflowService:
    @staticmethod
    async def get_all_workflows() -> List[WorkflowResponse]:
        """
        Retrieve all workflows.
        """
        workflows = []
        for workflow_id, workflow in workflows_db.items():
            workflow_agents_data = workflow_agents.get(workflow_id, [])
            workflow_connections = [
                connection for connection in connections_db.values()
                if (connection.source_id in workflow_agents_data and 
                    connection.target_id in workflow_agents_data)
            ]
            
            workflows.append(WorkflowResponse(
                **workflow.model_dump(),
                agents=workflow_agents_data,
                connections=workflow_connections
            ))
        
        return workflows

    @staticmethod
    async def get_workflow(workflow_id: UUID) -> Optional[WorkflowResponse]:
        """
        Get a specific workflow by ID.
        """
        if workflow_id not in workflows_db:
            return None
            
        workflow = workflows_db[workflow_id]
        workflow_agents_data = workflow_agents.get(workflow_id, [])
        workflow_connections = [
            connection for connection in connections_db.values()
            if (connection.source_id in workflow_agents_data and 
                connection.target_id in workflow_agents_data)
        ]
        
        return WorkflowResponse(
            **workflow.model_dump(),
            agents=workflow_agents_data,
            connections=workflow_connections
        )

    @staticmethod
    async def create_workflow(workflow: WorkflowCreate) -> WorkflowResponse:
        """
        Create a new workflow.
        """
        # Create the workflow
        workflow_data = WorkflowInDB(**workflow.model_dump(exclude={"agent_ids", "connections"}))
        workflows_db[workflow_data.id] = workflow_data
        
        # Associate agents with the workflow
        workflow_agents[workflow_data.id] = workflow.agent_ids
        
        # Create connections
        workflow_connections = []
        for connection in workflow.connections:
            connection_data = ConnectionInDB(**connection.model_dump())
            connections_db[connection_data.id] = connection_data
            workflow_connections.append(connection_data)
        
        return WorkflowResponse(
            **workflow_data.model_dump(),
            agents=workflow.agent_ids,
            connections=workflow_connections
        )

    @staticmethod
    async def update_workflow(workflow_id: UUID, workflow_update: WorkflowUpdate) -> Optional[WorkflowResponse]:
        """
        Update an existing workflow.
        """
        if workflow_id not in workflows_db:
            return None
            
        workflow_data = workflows_db[workflow_id]
        update_data = workflow_update.model_dump(exclude_unset=True)
        
        # Update workflow data
        for key, value in update_data.items():
            if key not in ["agent_ids", "connections"]:
                setattr(workflow_data, key, value)
        
        workflow_data.updated_at = datetime.now()
        workflows_db[workflow_id] = workflow_data
        
        # Update agent associations if provided
        if workflow_update.agent_ids is not None:
            workflow_agents[workflow_id] = workflow_update.agent_ids
        
        # Update connections if provided
        if workflow_update.connections is not None:
            # Remove existing connections for this workflow's agents
            current_agents = workflow_agents[workflow_id]
            connections_to_remove = [
                connection_id for connection_id, connection in connections_db.items()
                if (connection.source_id in current_agents and connection.target_id in current_agents)
            ]
            
            for connection_id in connections_to_remove:
                if connection_id in connections_db:
                    del connections_db[connection_id]
            
            # Add new connections
            for connection in workflow_update.connections:
                connection_data = ConnectionInDB(**connection.model_dump())
                connections_db[connection_data.id] = connection_data
        
        # Return updated workflow with agents and connections
        return await WorkflowService.get_workflow(workflow_id)

    @staticmethod
    async def delete_workflow(workflow_id: UUID) -> bool:
        """
        Delete a workflow.
        """
        if workflow_id not in workflows_db:
            return False
            
        # Delete the workflow
        del workflows_db[workflow_id]
        
        # Delete agent associations
        if workflow_id in workflow_agents:
            del workflow_agents[workflow_id]
        
        # Delete connections associated with this workflow's agents
        # Note: This is a simplified approach and may need refinement in a real application
        if workflow_id in workflow_agents:
            workflow_agent_ids = workflow_agents[workflow_id]
            connections_to_remove = [
                connection_id for connection_id, connection in connections_db.items()
                if (connection.source_id in workflow_agent_ids and 
                    connection.target_id in workflow_agent_ids)
            ]
            
            for connection_id in connections_to_remove:
                if connection_id in connections_db:
                    del connections_db[connection_id]
        
        return True

    @staticmethod
    async def execute_workflow(workflow_id: UUID, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a workflow with the provided input.
        """
        if workflow_id not in workflows_db:
            raise ValueError(f"Workflow with ID {workflow_id} not found")
            
        workflow = workflows_db[workflow_id]
        workflow_agent_ids = workflow_agents.get(workflow_id, [])
        
        if not workflow_agent_ids:
            raise ValueError(f"No agents associated with workflow {workflow_id}")
            
        # Get connections for this workflow
        workflow_connections = {}
        for connection in connections_db.values():
            if connection.source_id in workflow_agent_ids and connection.target_id in workflow_agent_ids:
                if connection.source_id not in workflow_connections:
                    workflow_connections[connection.source_id] = []
                workflow_connections[connection.source_id].append({
                    "target_id": connection.target_id,
                    "config": connection.config
                })
        
        # Update workflow status
        workflow.last_execution_status = "running"
        workflow.updated_at = datetime.now()
        workflows_db[workflow_id] = workflow
        
        start_time = time.time()
        final_output = None
        current_agent_id = workflow_agent_ids[0]  # Start with the first agent
        current_input = input_data.get("input", "")
        
        try:
            # Process each agent in the workflow
            visited_agents = set()
            max_iterations = 10  # Prevent infinite loops
            iteration = 0
            
            while current_agent_id and iteration < max_iterations:
                iteration += 1
                
                # Prevent revisiting the same agent
                if current_agent_id in visited_agents:
                    break
                visited_agents.add(current_agent_id)
                
                # Execute the current agent
                agent_result = await AgentService.execute_agent(
                    current_agent_id,
                    {"input": current_input}
                )
                
                # Store the output
                current_output = agent_result.get("output", "")
                final_output = current_output
                
                # Find the next agent based on connections
                next_agent_id = None
                if current_agent_id in workflow_connections:
                    # In a real application, you would have logic to determine
                    # which connection to follow based on the output or other factors
                    # For now, we'll just take the first connection
                    if workflow_connections[current_agent_id]:
                        next_agent_id = workflow_connections[current_agent_id][0]["target_id"]
                
                # Prepare for the next iteration
                current_agent_id = next_agent_id
                current_input = current_output
            
            execution_time = time.time() - start_time
            
            # Update workflow statistics
            workflow.execution_count += 1
            workflow.last_execution_time = execution_time
            workflow.average_execution_time = (
                (workflow.average_execution_time * (workflow.execution_count - 1) + execution_time) 
                / workflow.execution_count
            )
            workflow.last_execution_status = "completed"
            workflows_db[workflow_id] = workflow
            
            # Return the final output
            return {
                "workflow_id": str(workflow_id),
                "output": final_output,
                "execution_time": execution_time,
                "status": "completed"
            }
            
        except Exception as e:
            # Update workflow status to error
            workflow.last_execution_status = "error"
            workflows_db[workflow_id] = workflow
            
            # Re-raise the exception
            raise 