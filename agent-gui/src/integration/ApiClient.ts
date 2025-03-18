import { Agent } from "../types/Agent";
import { AgentConfig } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export class ApiClient {
    private baseUrl: string;

    constructor() {
        this.baseUrl = API_BASE_URL;
        console.log('API Client initialized with base URL:', this.baseUrl);
    }

    // Agent endpoints
    async getAgents(): Promise<Agent[]> {
        try {
            const url = `${this.baseUrl}/api/agents`;
            console.log('Fetching agents from:', url);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch agents: ${response.statusText}`);
            }
            const data = await response.json();
            console.log('Agents fetched successfully:', data);
            return data;
        } catch (error) {
            console.error('Error fetching agents:', error);
            return [];
        }
    }

    async createAgent(agentConfig: AgentConfig): Promise<Agent | null> {
        try {
            const response = await fetch(`${this.baseUrl}/api/agents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(agentConfig),
            });

            if (!response.ok) {
                throw new Error(`Failed to create agent: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating agent:', error);
            return null;
        }
    }

    async updateAgent(agentId: string, agentConfig: Partial<AgentConfig>): Promise<Agent | null> {
        try {
            const response = await fetch(`${this.baseUrl}/api/agents/${agentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(agentConfig),
            });

            if (!response.ok) {
                throw new Error(`Failed to update agent: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating agent:', error);
            return null;
        }
    }

    async executeAgent(agentId: string, input: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/api/agents/${agentId}/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ input }),
            });

            if (!response.ok) {
                throw new Error(`Failed to execute agent: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error executing agent:', error);
            throw error;
        }
    }

    // WebSocket connection for real-time updates
    getStatusWebSocketUrl(): string {
        return `ws://${new URL(this.baseUrl).host}/api/ws/status`;
    }

    getMonitorWebSocketUrl(): string {
        return `ws://${new URL(this.baseUrl).host}/api/ws/monitor`;
    }
} 