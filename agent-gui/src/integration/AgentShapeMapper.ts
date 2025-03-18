import { TLShape, TLShapeId } from 'tldraw'
import { Agent } from '../types/Agent'
import { AgentShape } from '../components/AgentShape/AgentShape'
import { AgentConfig, AgentInstance, AgentShapeToConfig } from './types'

export class AgentShapeMapper implements AgentShapeToConfig {
  toConfig(shape: AgentShape): AgentConfig {
    // Ensure tools is treated as an array
    const tools = Array.isArray(shape.props.tools) 
      ? shape.props.tools 
      : (shape.props.tools ? JSON.parse(shape.props.tools as string) : []);
    
    // Ensure parameters is treated as an object
    const parameters = typeof shape.props.parameters === 'object' && shape.props.parameters !== null
      ? shape.props.parameters
      : (shape.props.parameters ? JSON.parse(shape.props.parameters as string) : {});
    
    return {
      name: shape.props.name,
      prompt: shape.props.prompt,
      tools,
      parameters
    }
  }

  fromConfig(config: AgentConfig): Partial<AgentShape> {
    return {
      props: {
        name: config.name,
        prompt: config.prompt,
        status: 'idle',
        lastInput: '',
        tools: config.tools || [],
        parameters: config.parameters || {}
      }
    }
  }
  
  updateShapeWithInstance(shape: AgentShape, instance: AgentInstance): Partial<AgentShape> {
    return {
      props: {
        ...shape.props,
        status: instance.status,
        lastInput: instance.lastInput || '',
        lastOutput: instance.lastOutput || '',
        executionCount: instance.metrics.executionCount,
        averageExecutionTime: instance.metrics.averageExecutionTime,
        lastExecutionTime: instance.metrics.lastExecutionTime,
        tools: instance.config.tools || [],
        parameters: instance.config.parameters || {}
      }
    }
  }

  toShape(agent: Agent, id: TLShapeId): TLShape {
    return {
      id,
      type: 'agent',
      x: 0,
      y: 0,
      rotation: 0,
      isLocked: false,
      props: {
        name: agent.name,
        prompt: agent.prompt,
        tools: agent.tools,
        parameters: agent.parameters,
        status: agent.status,
        lastInput: agent.lastInput || '',
        lastOutput: '',
        w: 200,
        h: 150,
      },
    }
  }

  toAgent(shape: TLShape): Agent | null {
    if (shape.type !== 'agent') return null

    return {
      id: shape.id,
      name: shape.props.name || '',
      prompt: shape.props.prompt || '',
      tools: Array.isArray(shape.props.tools) ? shape.props.tools : [],
      parameters: typeof shape.props.parameters === 'object' ? shape.props.parameters : {},
      status: shape.props.status || 'idle',
      lastInput: shape.props.lastInput || '',
    }
  }
} 