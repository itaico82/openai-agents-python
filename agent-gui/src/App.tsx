import { Tldraw, Editor, createShapeId, TLShape, TLShapeId } from 'tldraw'
import 'tldraw/tldraw.css'
import { AgentShapeUtil, AgentTool } from './components/AgentShape'
import { useState, useEffect } from 'react'
import { AgentConfigPanel } from './components/AgentConfig'
import { AgentIntegrationService } from './integration/AgentIntegrationService'
import { AgentShapeMapper } from './integration/AgentShapeMapper'

// Initialize services
const integrationService = new AgentIntegrationService()
const shapeMapper = new AgentShapeMapper()

// Robot icon SVG component
const RobotIcon = () => (
  <svg 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v4" />
    <line x1="8" y1="16" x2="8" y2="16" />
    <line x1="16" y1="16" x2="16" y2="16" />
  </svg>
)

const CustomToolbar = ({ onAddAgent }: { onAddAgent: () => void }) => {
  return (
    <div 
      style={{
        position: 'fixed', 
        top: 80,
        left: 10,
        background: 'white',
        padding: '8px',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 1000
      }}
      data-testid="agent-toolbar"
    >
      <button 
        onClick={onAddAgent}
        style={{
          padding: '8px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#f0f0f0',
          fontSize: '16px',
          color: '#333',
          fontWeight: 500,
          width: 'auto'
        }}
        data-testid="add-agent-button"
        aria-label="Add Agent"
        title="Add a new AI agent"
      >
        <RobotIcon />
        <span>Add Agent</span>
      </button>
    </div>
  )
}

// Move TestControls to a separate component
const TestControls = ({ 
  editor, 
  selectedAgent,
  integrationService,
  onConfigureAgent 
}: { 
  editor: Editor, 
  selectedAgent: TLShapeId | null,
  integrationService: AgentIntegrationService,
  onConfigureAgent: (id: TLShapeId) => void 
}) => {
  if (!selectedAgent) return null

  const updateAgentStatus = (status: 'idle' | 'running' | 'processing') => {
    if (!selectedAgent) return
    
    const shape = editor.getShape(selectedAgent)
    if (shape?.type !== 'agent') return

    editor.updateShape({
      id: selectedAgent,
      type: 'agent',
      props: {
        ...shape.props,
        status,
        lastInput: status === 'processing' ? 'Processing test input...' : shape.props.lastInput || ''
      }
    })
  }

  const simulateActivity = async () => {
    if (!selectedAgent) return
    await integrationService.simulateAgentActivity(selectedAgent)
    // Refresh the shape to show updated status
    const agent = await integrationService.getAgentStatuses([selectedAgent])
    if (agent[0]) {
      const shape = editor.getShape(selectedAgent)
      if (shape?.type === 'agent') {
        editor.updateShape({
          id: selectedAgent,
          type: 'agent',
          props: {
            ...shape.props,
            status: agent[0].status,
            lastInput: agent[0].lastInput
          }
        })
      }
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      background: 'white',
      padding: 16,
      borderRadius: 8,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      zIndex: 1000
    }}>
      <h3 style={{ margin: 0 }}>Agent Controls</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button 
          onClick={() => onConfigureAgent(selectedAgent)}
          style={{
            padding: '8px 16px',
            borderRadius: '4px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          Configure
        </button>
      </div>
      <div style={{ borderTop: '1px solid #eee', paddingTop: 8 }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Status Controls</h4>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button onClick={() => updateAgentStatus('idle')}>Set Idle</button>
          <button onClick={() => updateAgentStatus('running')}>Set Running</button>
          <button onClick={() => updateAgentStatus('processing')}>Set Processing</button>
        </div>
        <button 
          onClick={simulateActivity}
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Simulate Activity
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [selectedAgent, setSelectedAgent] = useState<TLShapeId | null>(null)
  const [configPanelOpen, setConfigPanelOpen] = useState(false)
  const [configAgent, setConfigAgent] = useState<TLShapeId | null>(null)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const handleMount = (editor: Editor) => {
    setEditor(editor)

    // Listen for selection changes
    editor.updateInstanceState({ isToolLocked: true })
    editor.on('change', () => {
      const selectedIds = editor.getSelectedShapeIds()
      if (selectedIds.length === 1) {
        const shape = editor.getShape(selectedIds[0])
        if (shape?.type === 'agent') {
          setSelectedAgent(selectedIds[0])
        }
      } else {
        setSelectedAgent(null)
      }
    })

    // Load initial state
    loadInitialState(editor)
  }

  const loadInitialState = async (editor: Editor) => {
    try {
      setIsLoading(true)
      
      // Get existing agents from the integration service
      // This already creates tldraw IDs and maps them to backend IDs
      const existingAgents = await integrationService.getExistingAgents()
      console.log('Loaded existing agents:', existingAgents);
      
      if (existingAgents.length === 0) {
        setIsLoading(false);
        return;
      }
      
      // Create shapes for each agent
      existingAgents.forEach((agent) => {
        // The agent already has a valid tldraw ID from getExistingAgents
        const shape = shapeMapper.toShape(agent, agent.id)
        
        // Add the shape to the editor
        editor.createShape(shape)
        
        // Position the shape (you might want to implement a layout algorithm)
        editor.updateShape({
          id: agent.id,
          type: 'agent',
          x: Math.random() * 600 + 100, // Random position for now
          y: Math.random() * 400 + 100,
        })
      })
      
      // Start monitoring agent statuses with the tldraw shape IDs
      startStatusMonitoring(editor, existingAgents.map(a => a.id));
    } catch (error) {
      console.error('Failed to load initial state:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const startStatusMonitoring = (editor: Editor, agentIds: string[]) => {
    // Set up periodic status checks
    const intervalId = setInterval(async () => {
      try {
        const statuses = await integrationService.getAgentStatuses(agentIds)
        
        // Update each agent's status in the editor
        statuses.forEach(({ agentId, status, lastInput }) => {
          const shape = editor.getShape(agentId)
          if (shape?.type === 'agent') {
            editor.updateShape({
              id: agentId,
              type: 'agent',
              props: {
                ...shape.props,
                status,
                lastInput: lastInput || ''
              }
            })
          }
        })
      } catch (error) {
        console.error('Failed to update agent statuses:', error)
      }
    }, 5000) // Check every 5 seconds

    // Clean up interval on component unmount
    return () => clearInterval(intervalId)
  }

  const handleAddAgent = async () => {
    if (!editor) return

    try {
      // Create agent config
      const agentConfig = {
        name: 'New Agent',
        prompt: 'You are a helpful assistant.',
        tools: [],
        parameters: {}
      };

      // Create the agent through the integration service
      // This will already create a valid tldraw ID
      const newAgent = await integrationService.createAgent(agentConfig);
      
      if (newAgent) {
        // Create the shape to represent this agent using the tldraw ID from the service
        editor.createShape({
          id: newAgent.id,
          type: 'agent',
          x: 100,
          y: 100,
          props: {
            name: newAgent.name,
            status: 'idle',
            prompt: newAgent.prompt,
            lastInput: '',
            tools: newAgent.tools || [],
            parameters: newAgent.parameters || {},
            w: 200,
            h: 150,
          },
        });
        
        console.log('Agent created successfully on backend and in UI:', newAgent);
      }
    } catch (error) {
      console.error('Failed to create agent:', error);
      
      // Fallback to local-only creation if backend creation fails
      const id = createShapeId();
      editor.createShape({
        id,
        type: 'agent',
        x: 100,
        y: 100,
        props: {
          name: 'New Agent (Local Only)',
          status: 'idle',
          prompt: '',
          lastInput: '',
          tools: [],
          parameters: {},
          w: 200,
          h: 150,
        },
      });
    }
  }

  const handleConfigPanelClose = () => {
    setConfigPanelOpen(false)
    setConfigAgent(null)
  }

  // Function to open config for a specific agent
  const openAgentConfig = (agentId: TLShapeId) => {
    setConfigAgent(agentId)
    setConfigPanelOpen(true)
  }

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0,
      backgroundColor: '#f0f0f0'
    }}>
      <Tldraw
        onMount={handleMount}
        shapeUtils={[AgentShapeUtil]}
        tools={[AgentTool]}
      />
      {isLoading && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white',
          padding: '16px 24px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          zIndex: 1000
        }}>
          Loading agents...
        </div>
      )}
      <CustomToolbar onAddAgent={handleAddAgent} />
      {editor && (
        <TestControls 
          editor={editor} 
          selectedAgent={selectedAgent}
          integrationService={integrationService}
          onConfigureAgent={openAgentConfig}
        />
      )}
      
      {/* Agent Configuration Panel */}
      {editor && configPanelOpen && (
        <AgentConfigPanel
          editor={editor}
          agentId={configAgent}
          integrationService={integrationService}
          onClose={handleConfigPanelClose}
        />
      )}
    </div>
  )
}
