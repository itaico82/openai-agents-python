import { TLShapeId } from 'tldraw'

export type AgentStatus = 'idle' | 'running' | 'processing' | 'error'

export interface Agent {
  id: TLShapeId
  name: string
  prompt: string
  tools: string[]
  parameters: Record<string, any>
  status: AgentStatus
  lastInput: string
} 