import React, { useState, useEffect } from 'react'
import { AgentShape } from '../AgentShape/AgentShape'
import { AgentIntegrationService } from '../../integration/AgentIntegrationService'
import { Editor, TLShapeId } from 'tldraw'

interface AgentConfigPanelProps {
  editor: Editor
  agentId: TLShapeId | null
  integrationService: AgentIntegrationService
  onClose: () => void
}

export const AgentConfigPanel: React.FC<AgentConfigPanelProps> = ({
  editor,
  agentId,
  integrationService,
  onClose
}) => {
  const [name, setName] = useState('')
  const [prompt, setPrompt] = useState('')
  const [availableTools, setAvailableTools] = useState<string[]>([])
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [parameters, setParameters] = useState<Record<string, any>>({})
  const [newParamName, setNewParamName] = useState('')
  const [newParamValue, setNewParamValue] = useState('')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!agentId) return

    // Load available tools
    const tools = integrationService.getAvailableTools()
    setAvailableTools(tools)

    // Load current agent configuration
    const shape = editor.getShape(agentId)
    if (shape?.type === 'agent') {
      setName(shape.props.name || '')
      setPrompt(shape.props.prompt || '')
      
      // Parse tools
      const shapeTools = Array.isArray(shape.props.tools) 
        ? shape.props.tools 
        : (typeof shape.props.tools === 'string' && shape.props.tools 
            ? JSON.parse(shape.props.tools) 
            : [])
      setSelectedTools(shapeTools)
      
      // Parse parameters
      const shapeParams = typeof shape.props.parameters === 'object' && shape.props.parameters !== null
        ? shape.props.parameters
        : (shape.props.parameters ? JSON.parse(shape.props.parameters as string) : {})
      setParameters(shapeParams)
    }
  }, [agentId, editor, integrationService])

  const handleToolToggle = (tool: string) => {
    setSelectedTools(prev => 
      prev.includes(tool) 
        ? prev.filter(t => t !== tool) 
        : [...prev, tool]
    )
  }

  const handleAddParameter = () => {
    if (!newParamName.trim()) {
      setValidationErrors(prev => ({ ...prev, newParamName: 'Parameter name cannot be empty' }))
      return
    }

    if (parameters[newParamName]) {
      setValidationErrors(prev => ({ ...prev, newParamName: 'Parameter name already exists' }))
      return
    }

    setParameters(prev => ({
      ...prev,
      [newParamName]: newParamValue
    }))
    
    setNewParamName('')
    setNewParamValue('')
    setValidationErrors(prev => {
      const { newParamName, ...rest } = prev
      return rest
    })
  }

  const handleRemoveParameter = (key: string) => {
    setParameters(prev => {
      const { [key]: removed, ...rest } = prev
      return rest
    })
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    if (!name.trim()) {
      errors.name = 'Name is required'
    }
    
    if (!prompt.trim()) {
      errors.prompt = 'Prompt is required'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm() || !agentId) return
    
    const shape = editor.getShape(agentId)
    if (shape?.type !== 'agent') return
    
    // Update local shape
    editor.updateShape({
      id: agentId,
      type: 'agent',
      props: {
        ...shape.props,
        name,
        prompt,
        tools: selectedTools,
        parameters
      }
    })
    
    // Update agent on the backend
    try {
      const updatedConfig = {
        name,
        prompt,
        tools: selectedTools,
        parameters
      };
      
      const success = integrationService.updateAgentConfig(agentId, updatedConfig);
      
      if (success) {
        console.log('Agent configuration saved to backend successfully');
      } else {
        console.warn('Failed to save agent configuration to backend');
      }
    } catch (error) {
      console.error('Error saving agent configuration to backend:', error);
    }
    
    onClose()
  }

  if (!agentId) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '320px',
      backgroundColor: 'white',
      boxShadow: '-2px 0 5px rgba(0,0,0,0.1)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h2 style={{ margin: 0, fontSize: '18px' }}>Agent Configuration</h2>
        <button 
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer'
          }}
        >
          &times;
        </button>
      </div>
      
      <div style={{
        flex: 1,
        padding: '16px',
        overflowY: 'auto'
      }}>
        {/* Basic Info Section */}
        <section style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Basic Information</h3>
          
          <div style={{ marginBottom: '12px' }}>
            <label 
              htmlFor="agent-name" 
              style={{ 
                display: 'block', 
                marginBottom: '4px',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              Name
            </label>
            <input
              id="agent-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: validationErrors.name ? '1px solid #e74c3c' : '1px solid #ddd'
              }}
            />
            {validationErrors.name && (
              <div style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>
                {validationErrors.name}
              </div>
            )}
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <label 
              htmlFor="agent-prompt" 
              style={{ 
                display: 'block', 
                marginBottom: '4px',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              Prompt
            </label>
            <textarea
              id="agent-prompt"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={5}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: validationErrors.prompt ? '1px solid #e74c3c' : '1px solid #ddd',
                resize: 'vertical'
              }}
            />
            {validationErrors.prompt && (
              <div style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>
                {validationErrors.prompt}
              </div>
            )}
          </div>
        </section>
        
        {/* Tools Section */}
        <section style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Tools</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {availableTools.map(tool => (
              <div
                key={tool}
                onClick={() => handleToolToggle(tool)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  backgroundColor: selectedTools.includes(tool) ? '#3b82f6' : '#f1f5f9',
                  color: selectedTools.includes(tool) ? 'white' : '#64748b',
                  cursor: 'pointer',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ marginRight: '4px' }}>
                  {selectedTools.includes(tool) ? '✓' : ''}
                </span>
                {tool}
              </div>
            ))}
          </div>
        </section>
        
        {/* Parameters Section */}
        <section>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Parameters</h3>
          
          <div style={{ 
            display: 'flex', 
            marginBottom: '12px',
            gap: '8px'
          }}>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                placeholder="Name"
                value={newParamName}
                onChange={e => setNewParamName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: validationErrors.newParamName ? '1px solid #e74c3c' : '1px solid #ddd'
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                placeholder="Value"
                value={newParamValue}
                onChange={e => setNewParamValue(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ddd'
                }}
              />
            </div>
            <button
              onClick={handleAddParameter}
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: '#3b82f6',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Add
            </button>
          </div>
          
          {validationErrors.newParamName && (
            <div style={{ color: '#e74c3c', fontSize: '12px', marginBottom: '12px' }}>
              {validationErrors.newParamName}
            </div>
          )}
          
          <div style={{ marginBottom: '16px' }}>
            {Object.entries(parameters).length > 0 ? (
              <div style={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc' }}>
                      <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Name</th>
                      <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Value</th>
                      <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #ddd', width: '60px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(parameters).map(([key, value]) => (
                      <tr key={key} style={{ borderBottom: '1px solid #ddd' }}>
                        <td style={{ padding: '8px' }}>{key}</td>
                        <td style={{ padding: '8px' }}>{String(value)}</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleRemoveParameter(key)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                            title="Remove parameter"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
                No parameters added yet
              </div>
            )}
          </div>
        </section>
      </div>
      
      <div style={{
        padding: '16px',
        borderTop: '1px solid #eee',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '8px'
      }}>
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            backgroundColor: 'white',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          style={{
            padding: '8px 16px',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: '#3b82f6',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          Save
        </button>
      </div>
    </div>
  )
} 