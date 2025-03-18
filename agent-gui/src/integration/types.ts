import { AgentShape } from '../components/AgentShape/AgentShape'

export interface AgentConfig {
  name: string
  prompt: string
  tools?: string[]
  parameters?: Record<string, any>
}

export interface AgentMetrics {
  executionCount: number
  averageExecutionTime: number
  lastExecutionTime: number
}

export interface WorkflowConnection {
  sourceId: string
  targetId: string
  type: 'success' | 'error' | 'always'
}

export interface AgentInstance {
  id: string
  config: AgentConfig
  status: 'idle' | 'running' | 'processing'
  lastInput?: string
  lastOutput?: string
  metrics: AgentMetrics
}

export interface WorkflowDefinition {
  agents: AgentInstance[]
  connections: WorkflowConnection[]
}

export interface ExecutionStatus {
  isExecuting: boolean
  runningAgentIds: string[]
  completedAgentIds: string[]
}

export interface ExecutionResult {
  success: boolean
  errors: string[]
  completedAgents: string[]
  skippedAgents: string[]
  failedAgents: string[]
}

export interface AgentShapeToConfig {
  toConfig(shape: AgentShape): AgentConfig
  fromConfig(config: AgentConfig): Partial<AgentShape>
} 