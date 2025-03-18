import { Tldraw, Editor, createShapeId, TLShape, TLShapeId } from 'tldraw'
import 'tldraw/tldraw.css'
import { AgentShapeUtil, AgentTool } from './components/AgentShape'
import { useState } from 'react'

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

// Move TestControls to a separate component file later
const TestControls = ({ editor, selectedAgent }: { editor: Editor, selectedAgent: TLShapeId | null }) => {
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
        lastInput: status === 'processing' ? 'Processing test input...' : undefined
      }
    })
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
      gap: 8
    }}>
      <h3 style={{ margin: 0 }}>Test Controls</h3>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => updateAgentStatus('idle')}>Set Idle</button>
        <button onClick={() => updateAgentStatus('running')}>Set Running</button>
        <button onClick={() => updateAgentStatus('processing')}>Set Processing</button>
      </div>
    </div>
  )
}

export default function App() {
  const [selectedAgent, setSelectedAgent] = useState<TLShapeId | null>(null)
  const [editor, setEditor] = useState<Editor | null>(null)

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
  }

  const handleAddAgent = () => {
    if (!editor) return

    const id = createShapeId()
    editor.createShape({
      id,
      type: 'agent',
      x: 100,
      y: 100,
      props: {
        name: 'New Agent',
        status: 'idle',
        prompt: '',
        tools: [],
        parameters: {},
        w: 200,
        h: 150,
      },
    })
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
      <CustomToolbar onAddAgent={handleAddAgent} />
      {editor && <TestControls editor={editor} selectedAgent={selectedAgent} />}
    </div>
  )
}
