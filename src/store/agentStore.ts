import { create } from 'zustand'

interface Agent {
  id: string
  name: string
  status: 'idle' | 'running' | 'processing'
  prompt: string
  lastInput?: string
  lastOutput?: string
}

interface AgentStore {
  agents: Record<string, Agent>
  addAgent: (agent: Agent) => void
  updateAgent: (id: string, updates: Partial<Agent>) => void
  removeAgent: (id: string) => void
}

export const useAgentStore = create<AgentStore>((set) => ({
  agents: {},
  addAgent: (agent) =>
    set((state) => ({
      agents: { ...state.agents, [agent.id]: agent },
    })),
  updateAgent: (id, updates) =>
    set((state) => ({
      agents: {
        ...state.agents,
        [id]: { ...state.agents[id], ...updates },
      },
    })),
  removeAgent: (id) =>
    set((state) => {
      const { [id]: _, ...rest } = state.agents
      return { agents: rest }
    }),
})) 