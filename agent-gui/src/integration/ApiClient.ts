import { Agent } from "../types/Agent";
import { AgentConfig } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  async executeAgent(agentId: string, input: string): Promise<any> {
    return this.request('/execute', {
      method: 'POST',
      body: JSON.stringify({ agent_id: agentId, input }),
    });
  }

  async createAgent(config: AgentConfig): Promise<Agent> {
    return this.request('/agents', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async updateAgent(agentId: string, config: Partial<AgentConfig>): Promise<Agent> {
    return this.request(`/agents/${agentId}`, {
      method: 'PATCH',
      body: JSON.stringify(config),
    });
  }

  async deleteAgent(agentId: string): Promise<void> {
    return this.request(`/agents/${agentId}`, {
      method: 'DELETE',
    });
  }

  async getAgent(agentId: string): Promise<Agent> {
    return this.request(`/agents/${agentId}`);
  }

  async getAllAgents(): Promise<Agent[]> {
    return this.request('/agents');
  }
} 