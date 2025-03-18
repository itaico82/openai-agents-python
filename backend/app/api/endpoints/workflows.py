from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Any
from uuid import UUID

from app.schemas.workflow import WorkflowCreate, WorkflowUpdate, WorkflowResponse
from app.services.workflow_service import WorkflowService

router = APIRouter()

@router.get("/", response_model=List[WorkflowResponse])
async def get_workflows():
    """
    Retrieve all workflows.
    """
    return await WorkflowService.get_all_workflows()

@router.post("/", response_model=WorkflowResponse)
async def create_workflow(workflow: WorkflowCreate):
    """
    Create a new workflow.
    """
    return await WorkflowService.create_workflow(workflow)

@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(workflow_id: UUID):
    """
    Get a specific workflow by ID.
    """
    workflow = await WorkflowService.get_workflow(workflow_id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow with ID {workflow_id} not found"
        )
    return workflow

@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(workflow_id: UUID, workflow_update: WorkflowUpdate):
    """
    Update an existing workflow.
    """
    updated_workflow = await WorkflowService.update_workflow(workflow_id, workflow_update)
    if not updated_workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow with ID {workflow_id} not found"
        )
    return updated_workflow

@router.delete("/{workflow_id}", response_model=Dict[str, Any])
async def delete_workflow(workflow_id: UUID):
    """
    Delete a workflow.
    """
    deleted = await WorkflowService.delete_workflow(workflow_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow with ID {workflow_id} not found"
        )
    return {"success": True, "message": f"Workflow with ID {workflow_id} deleted"}

@router.post("/{workflow_id}/execute", response_model=Dict[str, Any])
async def execute_workflow(workflow_id: UUID, input_data: Dict[str, Any]):
    """
    Execute a workflow with the provided input.
    """
    try:
        result = await WorkflowService.execute_workflow(workflow_id, input_data)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        ) 