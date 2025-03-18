import { Agent, AgentExecutor, AgentTools } from '../../../src'
import { AgentConfig, AgentInstance, WorkflowDefinition, ExecutionStatus, ExecutionResult } from './types'

export class AgentIntegrationService {
  private agents: Map<string, { instance: AgentInstance; executor: AgentExecutor }> = new Map()
  private executionLog: Array<{ timestamp: Date; agentId: string; message: string; level: 'info' | 'error' | 'debug' }> = []
  
  async createAgent(config: AgentConfig): Promise<AgentInstance> {
    try {
      const agent = new Agent({
        name: config.name,
        prompt: config.prompt,
        tools: config.tools?.map(toolName => AgentTools[toolName]).filter(Boolean) || []
      })

      const executor = new AgentExecutor(agent)
      
      const instance: AgentInstance = {
        id: crypto.randomUUID(),
        config,
        status: 'idle',
        metrics: {
          executionCount: 0,
          averageExecutionTime: 0,
          lastExecutionTime: 0
        }
      }
      
      this.agents.set(instance.id, { instance, executor })
      this.logDebug(instance.id, `Agent created: ${config.name}`)
      return instance
    } catch (error) {
      this.logError('system', `Failed to create agent: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }
  
  async updateAgent(id: string, config: Partial<AgentConfig>): Promise<AgentInstance> {
    try {
      const agentData = this.agents.get(id)
      if (!agentData) {
        throw new Error(`Agent with id ${id} not found`)
      }
      
      // Create a new agent with updated config
      const updatedConfig = {
        ...agentData.instance.config,
        ...config
      }
      
      const agent = new Agent({
        name: updatedConfig.name,
        prompt: updatedConfig.prompt,
        tools: updatedConfig.tools?.map(toolName => AgentTools[toolName]).filter(Boolean) || []
      })

      const executor = new AgentExecutor(agent)
      
      const updatedInstance = {
        ...agentData.instance,
        config: updatedConfig
      }
      
      this.agents.set(id, { instance: updatedInstance, executor })
      this.logDebug(id, `Agent updated: ${updatedConfig.name}`)
      return updatedInstance
    } catch (error) {
      this.logError('system', `Failed to update agent ${id}: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }
  
  async deleteAgent(id: string): Promise<void> {
    try {
      const agentData = this.agents.get(id)
      if (agentData) {
        await agentData.executor.cleanup()
        this.agents.delete(id)
        this.logDebug(id, `Agent deleted`)
      }
    } catch (error) {
      this.logError('system', `Failed to delete agent ${id}: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
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
          agentData.instance.status = 'running'
          
          const startTime = performance.now()
          const result = await agentData.executor.execute()
          const endTime = performance.now()
          const executionTime = endTime - startTime
          
          // Update metrics
          const { metrics } = agentData.instance
          metrics.executionCount += 1
          metrics.lastExecutionTime = executionTime
          metrics.averageExecutionTime = 
            ((metrics.averageExecutionTime * (metrics.executionCount - 1)) + executionTime) / 
            metrics.executionCount
          
          agentData.instance.status = 'idle'
          agentData.instance.lastOutput = result
          
          executedAgents.add(agentId)
          executionResult.completedAgents.push(agentId)
          
          this.logInfo(agentId, `Execution completed in ${executionTime.toFixed(2)}ms`)
          
          // Execute next agents in the workflow
          const nextAgents = executionGraph.get(agentId) || new Set()
          await Promise.all([...nextAgents].map(executeAgent))
        } catch (error) {
          agentData.instance.status = 'idle'
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
    const agents = Array.from(this.agents.values()).map(data => data.instance)
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
    return agentData.instance.status
  }
  
  async getAllAgents(): Promise<AgentInstance[]> {
    return Array.from(this.agents.values()).map(data => data.instance)
  }
  
  getAvailableTools(): string[] {
    return Object.keys(AgentTools)
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
} 