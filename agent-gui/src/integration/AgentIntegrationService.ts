import { Agent, AgentStatus } from "../types/Agent";
import { TLShapeId, createShapeId } from "tldraw";
import { AgentConfig, AgentInstance, WorkflowDefinition, ExecutionStatus, ExecutionResult } from './types'

export class AgentIntegrationService {
  private agents: Map<TLShapeId, Agent> = new Map()
  private executionLog: Array<{ timestamp: Date; agentId: string; message: string; level: 'info' | 'error' | 'debug' }> = []
  
  constructor() {
    // Initialize with some example agents for development
    const mockAgents: Agent[] = [
      {
        id: createShapeId(),
        name: 'Search Agent',
        prompt: 'I am a search agent that helps find information.',
        tools: ['search', 'summarize'],
        parameters: {
          temperature: 0.7,
          maxTokens: 1000
        },
        status: 'idle',
        lastInput: null
      },
      {
        id: createShapeId(),
        name: 'Code Assistant',
        prompt: 'I am a coding assistant that helps with programming tasks.',
        tools: ['code_completion', 'code_review'],
        parameters: {
          temperature: 0.3,
          maxTokens: 2000
        },
        status: 'idle',
        lastInput: null
      },
      {
        id: createShapeId(),
        name: 'Data Analyzer',
        prompt: 'I analyze data and provide insights.',
        tools: ['data_analysis', 'visualization'],
        parameters: {
          temperature: 0.5,
          maxTokens: 1500
        },
        status: 'idle',
        lastInput: null
      }
    ]

    // Add mock agents to the map
    mockAgents.forEach(agent => this.agents.set(agent.id, agent))
  }
  
  async createAgent(agentData: Omit<Agent, 'id' | 'status' | 'lastInput'>): Promise<Agent> {
    const id = createShapeId()
    const newAgent: Agent = {
      ...agentData,
      id,
      status: 'idle',
      lastInput: ''
    }
    
    this.agents.set(id, newAgent)
    return newAgent
  }
  
  async updateAgent(id: TLShapeId, config: Partial<AgentConfig>): Promise<Agent> {
    const agentData = this.agents.get(id)
    if (!agentData) {
      throw new Error(`Agent with id ${id} not found`)
    }
    
    const updatedAgent: Agent = {
      ...agentData,
      ...config,
    }
    
    this.agents.set(id, updatedAgent)
    this.logDebug(id, `Agent updated: ${updatedAgent.name}`)
    return updatedAgent
  }
  
  async deleteAgent(agentId: TLShapeId): Promise<boolean> {
    return this.agents.delete(agentId)
  }
  
  async executeWorkflow(workflow: WorkflowDefinition): Promise<ExecutionResult> {
    const executionResult: ExecutionResult = {
      success: true,
      errors: [],
      completedAgents: [],
      skippedAgents: [],
      failedAgents: []
    }
    
    try {
      // Initialize execution graph
      const executionGraph = new Map<string, Set<string>>()
      
      // Build execution graph from connections
      for (const connection of workflow.connections) {
        if (!executionGraph.has(connection.sourceId)) {
          executionGraph.set(connection.sourceId, new Set())
        }
        executionGraph.get(connection.sourceId)!.add(connection.targetId)
      }
      
      // Find root nodes (agents with no incoming connections)
      const incomingConnections = new Set(workflow.connections.map(c => c.targetId))
      const rootNodes = workflow.agents
        .map(a => a.id)
        .filter(id => !incomingConnections.has(id))
      
      if (rootNodes.length === 0) {
        throw new Error('Workflow has no root nodes. Please ensure there is at least one agent that is not a target of any connection.')
      }
      
      // Check for cycles in the graph
      const hasCycle = this.detectCycles(executionGraph)
      if (hasCycle) {
        throw new Error('Workflow contains cycles. Please ensure the workflow is a directed acyclic graph.')
      }
      
      // Execute workflow starting from root nodes
      const executedAgents = new Set<string>()
      
      const executeAgent = async (agentId: string) => {
        if (executedAgents.has(agentId)) {
          executionResult.skippedAgents.push(agentId)
          return
        }
        
        const agentData = this.agents.get(agentId)
        if (!agentData) {
          const errorMsg = `Agent ${agentId} not found`
          executionResult.errors.push(errorMsg)
          executionResult.failedAgents.push(agentId)
          this.logError(agentId, errorMsg)
          return
        }
        
        try {
          this.logInfo(agentId, `Execution started`)
          agentData.status = 'running'
          
          const startTime = performance.now()
          const result = await agentData.executor.execute()
          const endTime = performance.now()
          const executionTime = endTime - startTime
          
          // Update metrics
          const { metrics } = agentData
          metrics.executionCount += 1
          metrics.lastExecutionTime = executionTime
          metrics.averageExecutionTime = 
            ((metrics.averageExecutionTime * (metrics.executionCount - 1)) + executionTime) / 
            metrics.executionCount
          
          agentData.status = 'idle'
          agentData.lastOutput = result
          
          executedAgents.add(agentId)
          executionResult.completedAgents.push(agentId)
          
          this.logInfo(agentId, `Execution completed in ${executionTime.toFixed(2)}ms`)
          
          // Execute next agents in the workflow
          const nextAgents = executionGraph.get(agentId) || new Set()
          await Promise.all([...nextAgents].map(executeAgent))
        } catch (error) {
          agentData.status = 'idle'
          const errorMsg = error instanceof Error ? error.message : String(error)
          executionResult.errors.push(errorMsg)
          executionResult.failedAgents.push(agentId)
          this.logError(agentId, `Execution failed: ${errorMsg}`)
          
          // Handle error based on connections type
          const nextAgents = executionGraph.get(agentId) || new Set()
          if (nextAgents.size > 0) {
            // Only execute agents connected via 'error' or 'always' type connections
            const errorConnections = workflow.connections
              .filter(c => c.sourceId === agentId && (c.type === 'error' || c.type === 'always'))
              .map(c => c.targetId)
            
            await Promise.all([...errorConnections].map(executeAgent))
          }
        }
      }
      
      this.logInfo('system', `Workflow execution started with ${rootNodes.length} root nodes`)
      await Promise.all(rootNodes.map(executeAgent))
      this.logInfo('system', `Workflow execution completed`)
      
      // Check if any agents failed
      if (executionResult.failedAgents.length > 0) {
        executionResult.success = false
      }
      
      return executionResult
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      executionResult.success = false
      executionResult.errors.push(errorMsg)
      this.logError('system', `Workflow execution failed: ${errorMsg}`)
      return executionResult
    }
  }
  
  // Detect cycles in the execution graph
  private detectCycles(graph: Map<string, Set<string>>): boolean {
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    
    const hasCycleFromNode = (nodeId: string): boolean => {
      if (!visited.has(nodeId)) {
        visited.add(nodeId)
        recursionStack.add(nodeId)
        
        const neighbors = graph.get(nodeId) || new Set()
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor) && hasCycleFromNode(neighbor)) {
            return true
          } else if (recursionStack.has(neighbor)) {
            return true
          }
        }
      }
      
      recursionStack.delete(nodeId)
      return false
    }
    
    for (const nodeId of graph.keys()) {
      if (!visited.has(nodeId) && hasCycleFromNode(nodeId)) {
        return true
      }
    }
    
    return false
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
  
  async getAgentStatus(id: string): Promise<'idle' | 'running' | 'processing'> {
    const agentData = this.agents.get(id)
    if (!agentData) {
      throw new Error(`Agent with id ${id} not found`)
    }
    return agentData.status
  }
  
  async getAllAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values())
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
    return Array.from(this.agents.values())
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