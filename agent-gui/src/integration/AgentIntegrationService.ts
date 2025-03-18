import { Agent, AgentStatus } from "../types/Agent";
import { TLShapeId, createShapeId } from "tldraw";
import { AgentConfig, AgentInstance, WorkflowDefinition, ExecutionStatus, ExecutionResult } from './types'
import { ApiClient } from "./ApiClient";

export class AgentIntegrationService {
  private agents: Map<TLShapeId, AgentInstance> = new Map()
  private executionLog: Array<{ timestamp: Date; agentId: string; message: string; level: 'info' | 'error' | 'debug' }> = []
  private apiClient: ApiClient = new ApiClient()
  private statusSocket: WebSocket | null = null
  private monitorSocket: WebSocket | null = null
  private statusUpdateCallbacks: ((agentId: string, status: AgentStatus, lastInput?: string) => void)[] = []
  
  // Maps to translate between backend IDs and tldraw shape IDs
  private backendToTldrawMap: Map<string, TLShapeId> = new Map()
  private tldrawToBackendMap: Map<string, string> = new Map()
  
  constructor() {
    this.initializeWebSockets()
  }
  
  // ID mapping methods
  mapBackendIdToShapeId(backendId: string, shapeId: TLShapeId): void {
    this.backendToTldrawMap.set(backendId, shapeId);
    this.tldrawToBackendMap.set(shapeId.toString(), backendId);
    console.log(`Mapped backend ID ${backendId} to tldraw ID ${shapeId}`);
  }
  
  getTldrawIdForBackendId(backendId: string): TLShapeId | null {
    return this.backendToTldrawMap.get(backendId) || null;
  }
  
  getBackendIdForTldrawId(shapeId: TLShapeId): string | null {
    return this.tldrawToBackendMap.get(shapeId.toString()) || null;
  }
  
  private initializeWebSockets() {
    try {
      // Initialize status WebSocket
      const statusSocketUrl = this.apiClient.getStatusWebSocketUrl()
      this.statusSocket = new WebSocket(statusSocketUrl)
      
      this.statusSocket.onopen = () => {
        console.log('Status WebSocket connection established')
      }
      
      this.statusSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'agent_update') {
            const backendAgentId = data.agent_id
            const status = data.data.status as AgentStatus
            const lastInput = data.data.last_input
            
            // Get the tldraw ID for this backend ID
            const tldrawId = this.getTldrawIdForBackendId(backendAgentId)
            
            if (tldrawId) {
              // Update agent status using the tldraw ID
              const agent = this.agents.get(tldrawId)
              if (agent) {
                agent.status = status
                agent.lastInput = lastInput || ''
                this.agents.set(tldrawId, agent)
                
                // Notify subscribers using the tldraw ID
                this.statusUpdateCallbacks.forEach(callback => 
                  callback(tldrawId.toString(), status, lastInput)
                )
              }
            } else {
              console.warn(`Received update for unknown agent ID: ${backendAgentId}`)
            }
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error)
        }
      }
      
      this.statusSocket.onerror = (error) => {
        console.error('Status WebSocket error:', error)
      }
      
      this.statusSocket.onclose = () => {
        console.log('Status WebSocket connection closed')
        // Attempt to reconnect after a delay
        setTimeout(() => this.initializeWebSockets(), 5000)
      }
      
      // Initialize monitor WebSocket
      const monitorSocketUrl = this.apiClient.getMonitorWebSocketUrl()
      this.monitorSocket = new WebSocket(monitorSocketUrl)
      
      this.monitorSocket.onopen = () => {
        console.log('Monitor WebSocket connection established')
      }
      
      this.monitorSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('Performance metrics:', data.metrics)
          // Handle performance metrics
        } catch (error) {
          console.error('Error processing monitor message:', error)
        }
      }
    } catch (error) {
      console.error('Error initializing WebSockets:', error)
    }
  }
  
  onStatusUpdate(callback: (agentId: string, status: AgentStatus, lastInput?: string) => void) {
    this.statusUpdateCallbacks.push(callback)
    return () => {
      this.statusUpdateCallbacks = this.statusUpdateCallbacks.filter(cb => cb !== callback)
    }
  }
  
  async createAgent(agentConfig: AgentConfig): Promise<Agent> {
    try {
      // Call backend API to create the agent
      const response = await this.apiClient.createAgent(agentConfig)
      if (!response) {
        throw new Error('Failed to create agent on the backend')
      }
      
      // Create a valid tldraw shape ID
      const id = createShapeId();
      
      // Map the backend ID to this tldraw shape ID
      this.mapBackendIdToShapeId(response.id, id);
      
      // Create local instance
      const agent: Agent = {
        id: id,
        name: agentConfig.name,
        prompt: agentConfig.prompt,
        tools: agentConfig.tools || [],
        parameters: agentConfig.parameters || {},
        status: 'idle',
        lastInput: ''
      }
      
      // Store agent instance
      const instance: AgentInstance = {
        id: agent.id,
        config: agentConfig,
        status: 'idle',
        lastInput: '',
        lastOutput: '',
        metrics: {
          executionCount: 0,
          averageExecutionTime: 0,
          lastExecutionTime: 0
        }
      }
      
      this.agents.set(agent.id, instance)
      
      // Subscribe to status updates
      if (this.statusSocket && this.statusSocket.readyState === WebSocket.OPEN) {
        this.statusSocket.send(JSON.stringify({
          type: 'subscribe',
          agent_ids: [response.id] // Use the backend ID for WebSocket subscriptions
        }))
      }
      
      return agent
    } catch (error) {
      console.error('Error creating agent:', error)
      // Create a local-only agent as fallback
      const id = createShapeId()
      const agent: Agent = {
        id,
        name: agentConfig.name,
        prompt: agentConfig.prompt,
        tools: agentConfig.tools || [],
        parameters: agentConfig.parameters || {},
        status: 'idle',
        lastInput: ''
      }
      
      const instance: AgentInstance = {
        id: agent.id,
        config: agentConfig,
        status: 'idle',
        lastInput: '',
        lastOutput: '',
        metrics: {
          executionCount: 0,
          averageExecutionTime: 0,
          lastExecutionTime: 0
        }
      }
      
      this.agents.set(agent.id, instance)
      return agent
    }
  }
  
  async executeAgent(agentId: TLShapeId, input: string): Promise<ExecutionResult> {
    const agent = this.agents.get(agentId)
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`)
    }
    
    try {
      // Update local status
      agent.status = 'processing'
      agent.lastInput = input
      this.agents.set(agentId, agent)
      
      // Notify subscribers of status change
      this.statusUpdateCallbacks.forEach(callback => 
        callback(agentId.toString(), 'processing', input)
      )
      
      // Get the backend ID for this tldraw shape ID
      const backendId = this.getBackendIdForTldrawId(agentId);
      
      if (!backendId) {
        throw new Error(`No backend ID found for tldraw ID ${agentId}`);
      }
      
      // Call backend API to execute the agent using the backend ID
      const result = await this.apiClient.executeAgent(backendId, input)
      
      // Update agent with result
      agent.status = 'idle'
      agent.lastOutput = result.output
      agent.metrics.executionCount++
      agent.metrics.lastExecutionTime = result.execution_time
      agent.metrics.averageExecutionTime = 
        (agent.metrics.averageExecutionTime * (agent.metrics.executionCount - 1) + result.execution_time) / 
        agent.metrics.executionCount
      
      this.agents.set(agentId, agent)
      
      // Notify subscribers of status change
      this.statusUpdateCallbacks.forEach(callback => 
        callback(agentId.toString(), 'idle')
      )
      
      return {
        agentId,
        input,
        output: result.output,
        status: 'completed',
        executionTime: result.execution_time
      }
    } catch (error) {
      console.error('Error executing agent:', error)
      
      // Update agent status to error
      agent.status = 'error'
      this.agents.set(agentId, agent)
      
      // Notify subscribers of status change
      this.statusUpdateCallbacks.forEach(callback => 
        callback(agentId.toString(), 'error')
      )
      
      return {
        agentId,
        input,
        output: error instanceof Error ? error.message : String(error),
        status: 'error',
        executionTime: 0
      }
    }
  }
  
  getAgentStatus(agentId: TLShapeId): ExecutionStatus {
    const agent = this.agents.get(agentId)
    if (!agent) {
      return {
        agentId,
        status: 'idle',
        lastInput: '',
        lastOutput: ''
      }
    }
    
    return {
      agentId,
      status: agent.status,
      lastInput: agent.lastInput,
      lastOutput: agent.lastOutput
    }
  }
  
  getAgentConfig(agentId: TLShapeId): AgentConfig | null {
    const agent = this.agents.get(agentId)
    return agent ? agent.config : null
  }
  
  updateAgentConfig(agentId: TLShapeId, config: Partial<AgentConfig>): boolean {
    const agent = this.agents.get(agentId)
    if (!agent) return false
    
    // Update local agent config
    agent.config = {
      ...agent.config,
      ...config
    }
    
    this.agents.set(agentId, agent)
    
    // Get the backend ID for this tldraw shape ID
    const backendId = this.getBackendIdForTldrawId(agentId);
    
    // Try to update on backend if we have a backend ID
    if (backendId) {
      this.apiClient.updateAgent(backendId, config).catch(error => {
        console.error('Error updating agent config on backend:', error)
      });
    } else {
      console.warn(`Cannot update backend: No backend ID found for tldraw ID ${agentId}`);
    }
    
    return true
  }
  
  createWorkflow(definition: WorkflowDefinition): string {
    // Simple workflow creation - in a real app, this would call the backend
    return 'workflow-' + Math.random().toString(36).substring(2, 9)
  }
  
  // This method would be expanded in a real implementation
  executeWorkflow(workflowId: string, input: string): Promise<ExecutionResult> {
    // For now, just a placeholder that delegates to the first agent
    return Promise.resolve({
      agentId: 'workflow-' + workflowId as TLShapeId,
      input,
      output: 'Workflow execution not yet implemented',
      status: 'completed',
      executionTime: 0
    })
  }
  
  async getExecutionStatus(): Promise<ExecutionStatus> {
    const agents = Array.from(this.agents.values())
    const runningAgents = agents.filter(a => a.status !== 'idle')
    
    return {
      isExecuting: runningAgents.length > 0,
      runningAgentIds: runningAgents.map(a => a.id),
      completedAgentIds: agents
        .filter(a => a.status === 'idle' && a.metrics.executionCount > 0)
        .map(a => a.id)
    }
  }
  
  async getAllAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values()).map(a => a.config as Agent)
  }
  
  async getAvailableTools(): Promise<string[]> {
    return [
      'search',
      'summarize',
      'code_completion',
      'code_review',
      'data_analysis',
      'visualization',
      'text_analysis',
      'image_generation'
    ]
  }
  
  getExecutionLogs(agentId?: string, limit = 100): Array<{ timestamp: Date; agentId: string; message: string; level: 'info' | 'error' | 'debug' }> {
    if (agentId) {
      return this.executionLog
        .filter(log => log.agentId === agentId)
        .slice(-limit);
    }
    return this.executionLog.slice(-limit);
  }
  
  clearExecutionLogs() {
    this.executionLog = [];
  }
  
  private logInfo(agentId: string, message: string) {
    this.executionLog.push({ timestamp: new Date(), agentId, message, level: 'info' });
  }
  
  private logError(agentId: string, message: string) {
    this.executionLog.push({ timestamp: new Date(), agentId, message, level: 'error' });
  }
  
  private logDebug(agentId: string, message: string) {
    this.executionLog.push({ timestamp: new Date(), agentId, message, level: 'debug' });
  }

  async getExistingAgents(): Promise<Agent[]> {
    try {
      // First, try to get agents from the backend API
      const apiAgents = await this.apiClient.getAgents();
      
      // If we have agents from the API, update our local map and return them
      if (apiAgents && apiAgents.length > 0) {
        console.log('Loaded agents from backend:', apiAgents);
        
        const result: Agent[] = [];
        
        // Process each agent from the API
        for (const backendAgent of apiAgents) {
          // For each backend agent, create a valid tldraw ID
          // We'll let the caller create the actual shape with this ID
          const tlDrawId = createShapeId();
          
          // Map the backend ID to this tldraw ID
          this.mapBackendIdToShapeId(backendAgent.id, tlDrawId);
          
          // Create a local instance
          const instance: AgentInstance = {
            id: tlDrawId,
            config: {
              name: backendAgent.name,
              prompt: backendAgent.prompt,
              tools: backendAgent.tools || [],
              parameters: backendAgent.parameters || {}
            },
            status: 'idle',
            lastInput: '',
            lastOutput: '',
            metrics: {
              executionCount: 0,
              averageExecutionTime: 0,
              lastExecutionTime: 0
            }
          };
          
          // Store in local map
          this.agents.set(tlDrawId, instance);
          
          // Add to result with the tldraw ID
          result.push({
            id: tlDrawId,
            name: backendAgent.name,
            prompt: backendAgent.prompt,
            tools: backendAgent.tools || [],
            parameters: backendAgent.parameters || {},
            status: 'idle',
            lastInput: ''
          });
        }
        
        return result;
      }
    } catch (error) {
      console.error('Error fetching agents from backend:', error);
    }
    
    // Fallback to local agents if API call fails
    return Array.from(this.agents.values()).map(a => ({
      id: a.id,
      name: a.config.name,
      prompt: a.config.prompt,
      tools: a.config.tools || [],
      parameters: a.config.parameters || {},
      status: a.status,
      lastInput: a.lastInput
    }));
  }

  async getAgentStatuses(agentIds: TLShapeId[]): Promise<Array<{
    agentId: TLShapeId
    status: AgentStatus
    lastInput: string
  }>> {
    return agentIds.map(id => {
      const agent = this.agents.get(id)
      return {
        agentId: id,
        status: agent?.status || 'idle',
        lastInput: agent?.lastInput || ''
      }
    })
  }

  async updateAgentStatus(agentId: TLShapeId, status: AgentStatus, lastInput?: string): Promise<void> {
    const agent = this.agents.get(agentId)
    if (agent) {
      agent.status = status
      if (lastInput !== undefined) {
        agent.lastInput = lastInput
      }
      this.agents.set(agentId, agent)
    }
  }

  // Method to simulate agent activity (for testing)
  async simulateAgentActivity(agentId: TLShapeId): Promise<void> {
    const statuses: AgentStatus[] = ['idle', 'running', 'processing']
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]
    const randomInput = randomStatus === 'idle' ? null : `Sample input for ${agentId}`
    
    await this.updateAgentStatus(agentId, randomStatus, randomInput)
  }
} 