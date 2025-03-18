from typing import List, Dict, Any, Optional
from uuid import UUID
import time
import asyncio
import openai
from datetime import datetime

from app.schemas.agent import AgentCreate, AgentUpdate, AgentResponse, AgentInDB, AgentStatusUpdate
from app.services.websocket_manager import WebsocketManager
from app.core.config import settings

# Temporarily use an in-memory database for development
# This would be replaced with a proper database in production
agents_db: Dict[UUID, AgentInDB] = {}

# Initialize OpenAI client
client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

# Get WebSocket manager instance
websocket_manager = WebsocketManager()

class AgentService:
    @staticmethod
    async def get_all_agents() -> List[AgentResponse]:
        """
        Retrieve all agents.
        """
        return list(agents_db.values())

    @staticmethod
    async def get_agent(agent_id: UUID) -> Optional[AgentResponse]:
        """
        Get a specific agent by ID.
        """
        return agents_db.get(agent_id)

    @staticmethod
    async def create_agent(agent: AgentCreate) -> AgentResponse:
        """
        Create a new agent.
        """
        agent_data = AgentInDB(**agent.model_dump())
        agents_db[agent_data.id] = agent_data
        return agent_data

    @staticmethod
    async def update_agent(agent_id: UUID, agent_update: AgentUpdate) -> Optional[AgentResponse]:
        """
        Update an existing agent.
        """
        if agent_id not in agents_db:
            return None
            
        agent_data = agents_db[agent_id]
        update_data = agent_update.model_dump(exclude_unset=True)
        
        for key, value in update_data.items():
            setattr(agent_data, key, value)
            
        agent_data.updated_at = datetime.now()
        agents_db[agent_id] = agent_data
        
        return agent_data

    @staticmethod
    async def delete_agent(agent_id: UUID) -> bool:
        """
        Delete an agent.
        """
        if agent_id not in agents_db:
            return False
            
        del agents_db[agent_id]
        return True

    @staticmethod
    async def execute_agent(agent_id: UUID, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute an agent with the provided input.
        """
        if agent_id not in agents_db:
            raise ValueError(f"Agent with ID {agent_id} not found")
            
        agent = agents_db[agent_id]
        
        # Update agent status
        await AgentService.update_agent_status(
            agent_id, 
            AgentStatusUpdate(
                status="processing",
                last_input=input_data.get("input", "")
            )
        )
        
        start_time = time.time()
        
        try:
            # Execute the agent using OpenAI
            response = await client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": agent.prompt},
                    {"role": "user", "content": input_data.get("input", "")}
                ],
                tools=AgentService._format_tools(agent.tools)
            )
            
            execution_time = time.time() - start_time
            output = response.choices[0].message.content
            
            # Update agent status with results
            await AgentService.update_agent_status(
                agent_id,
                AgentStatusUpdate(
                    status="idle",
                    last_output=output,
                    execution_time=execution_time
                )
            )
            
            # Return the response
            return {
                "agent_id": str(agent_id),
                "output": output,
                "execution_time": execution_time
            }
            
        except Exception as e:
            # Update agent status to error
            await AgentService.update_agent_status(
                agent_id,
                AgentStatusUpdate(
                    status="error",
                    last_output=f"Error: {str(e)}"
                )
            )
            
            # Re-raise the exception
            raise

    @staticmethod
    async def update_agent_status(agent_id: UUID, status_update: AgentStatusUpdate) -> Optional[AgentResponse]:
        """
        Update the status of an agent.
        """
        if agent_id not in agents_db:
            return None
            
        agent = agents_db[agent_id]
        
        # Update status
        agent.status = status_update.status
        
        # Update input/output if provided
        if status_update.last_input is not None:
            agent.last_input = status_update.last_input
        
        if status_update.last_output is not None:
            agent.last_output = status_update.last_output
        
        # Update execution metrics if provided
        if status_update.execution_time is not None:
            agent.execution_count += 1
            agent.last_execution_time = status_update.execution_time
            
            # Update average execution time
            agent.average_execution_time = (
                (agent.average_execution_time * (agent.execution_count - 1) + status_update.execution_time) 
                / agent.execution_count
            )
        
        # Save updated agent
        agents_db[agent_id] = agent
        
        # Broadcast status update via WebSocket
        await websocket_manager.broadcast_agent_update(
            agent_id,
            {
                "status": agent.status,
                "last_input": agent.last_input,
                "last_output": agent.last_output,
                "execution_count": agent.execution_count,
                "average_execution_time": agent.average_execution_time,
                "last_execution_time": agent.last_execution_time
            }
        )
        
        return agent

    @staticmethod
    async def get_agent_status(agent_id: UUID) -> Optional[Dict[str, Any]]:
        """
        Get the current status of an agent.
        """
        if agent_id not in agents_db:
            return None
            
        agent = agents_db[agent_id]
        
        return {
            "status": agent.status,
            "last_input": agent.last_input,
            "last_output": agent.last_output,
            "execution_count": agent.execution_count,
            "average_execution_time": agent.average_execution_time,
            "last_execution_time": agent.last_execution_time
        }
        
    @staticmethod
    def _format_tools(tool_names: List[str]) -> List[Dict[str, Any]]:
        """
        Format tool names into the structure expected by the OpenAI API.
        This is a simplified example - in a real application, each tool would have its own definition.
        """
        tool_definitions = {
            "web_search": {
                "type": "function",
                "function": {
                    "name": "web_search",
                    "description": "Search the web for information",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "The search query"
                            }
                        },
                        "required": ["query"]
                    }
                }
            },
            "calculator": {
                "type": "function",
                "function": {
                    "name": "calculator",
                    "description": "Perform mathematical calculations",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "expression": {
                                "type": "string",
                                "description": "The mathematical expression to evaluate"
                            }
                        },
                        "required": ["expression"]
                    }
                }
            },
            "database_query": {
                "type": "function",
                "function": {
                    "name": "database_query",
                    "description": "Query a database for information",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "The SQL query to execute"
                            }
                        },
                        "required": ["query"]
                    }
                }
            }
        }
        
        return [tool_definitions[tool] for tool in tool_names if tool in tool_definitions] 