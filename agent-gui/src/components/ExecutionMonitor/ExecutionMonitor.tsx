import React, { useState, useEffect } from 'react'
import { AgentIntegrationService } from '../../integration/AgentIntegrationService'
import { ExecutionStatus } from '../../integration/types'

interface ExecutionMonitorProps {
  integrationService: AgentIntegrationService
  selectedAgentId?: string
}

export const ExecutionMonitor: React.FC<ExecutionMonitorProps> = ({
  integrationService,
  selectedAgentId
}) => {
  const [logs, setLogs] = useState<Array<{ timestamp: Date; agentId: string; message: string; level: 'info' | 'error' | 'debug' }>>([])
  const [status, setStatus] = useState<ExecutionStatus>({ isExecuting: false, runningAgentIds: [], completedAgentIds: [] })
  const [showDebugLogs, setShowDebugLogs] = useState(false)
  
  // Fetch logs periodically
  useEffect(() => {
    const fetchLogs = () => {
      const newLogs = integrationService.getExecutionLogs(selectedAgentId, 100)
      setLogs(newLogs)
    }
    
    const fetchStatus = async () => {
      const newStatus = await integrationService.getExecutionStatus()
      setStatus(newStatus)
    }
    
    // Initial fetch
    fetchLogs()
    fetchStatus()
    
    // Set up polling
    const interval = setInterval(() => {
      fetchLogs()
      fetchStatus()
    }, 1000)
    
    return () => clearInterval(interval)
  }, [integrationService, selectedAgentId])
  
  // Filter logs based on debug setting
  const filteredLogs = showDebugLogs 
    ? logs 
    : logs.filter(log => log.level !== 'debug')
  
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: '#f8f8f8',
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid #ddd',
          backgroundColor: '#f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '14px' }}>
          Execution Monitor
          {selectedAgentId && ' (Filtered)'}
        </h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={showDebugLogs}
              onChange={() => setShowDebugLogs(!showDebugLogs)}
              style={{ marginRight: '4px' }}
            />
            Show Debug
          </label>
          <button 
            onClick={() => integrationService.clearExecutionLogs()}
            style={{
              fontSize: '12px',
              padding: '4px 8px',
              backgroundColor: '#eee',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        </div>
      </div>
      
      {/* Status */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid #ddd',
          backgroundColor: status.isExecuting ? '#e6f7ff' : '#f0f0f0',
          fontSize: '12px',
        }}
      >
        <div style={{ fontWeight: 'bold' }}>
          Status: {status.isExecuting ? 'Executing' : 'Idle'}
        </div>
        {status.runningAgentIds.length > 0 && (
          <div style={{ marginTop: '4px' }}>
            Running: {status.runningAgentIds.length} agent(s)
          </div>
        )}
        {status.completedAgentIds.length > 0 && (
          <div style={{ marginTop: '4px' }}>
            Completed: {status.completedAgentIds.length} agent(s)
          </div>
        )}
      </div>
      
      {/* Log Output */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '8px',
          fontFamily: 'monospace',
          fontSize: '12px',
          backgroundColor: '#1e1e1e',
          color: '#d4d4d4',
        }}
      >
        {filteredLogs.length === 0 ? (
          <div style={{ padding: '8px', color: '#888' }}>No logs available.</div>
        ) : (
          filteredLogs.map((log, index) => (
            <div
              key={index}
              style={{
                padding: '2px 0',
                borderBottom: '1px solid #333',
                color: log.level === 'error' ? '#f56c6c' : log.level === 'debug' ? '#909399' : '#67c23a',
              }}
            >
              <span style={{ color: '#888' }}>
                {log.timestamp.toLocaleTimeString()} [
              </span>
              <span 
                style={{ 
                  fontWeight: 'bold', 
                  color: log.level === 'error' ? '#f56c6c' : log.level === 'debug' ? '#909399' : '#67c23a'
                }}
              >
                {log.level.toUpperCase()}
              </span>
              <span style={{ color: '#888' }}>] </span>
              <span style={{ color: '#e6a23c' }}>{log.agentId}: </span>
              <span>{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
} 