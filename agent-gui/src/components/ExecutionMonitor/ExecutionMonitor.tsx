import React, { useState, useEffect } from 'react'
import { AgentIntegrationService } from '../../integration/AgentIntegrationService'
import { ExecutionStatus } from '../../integration/types'

interface ExecutionMonitorProps {
  agentId: string
  integrationService: AgentIntegrationService
}

export const ExecutionMonitor: React.FC<ExecutionMonitorProps> = ({
  agentId,
  integrationService
}) => {
  const [status, setStatus] = useState<ExecutionStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Get initial status
    const fetchStatus = async () => {
      try {
        const currentStatus = integrationService.getAgentStatus(agentId as any)
        setStatus(currentStatus)
      } catch (err) {
        setError('Failed to fetch agent status')
        console.error('Error fetching agent status:', err)
      }
    }
    
    fetchStatus()
    
    // Subscribe to status updates via the integration service
    const unsubscribe = integrationService.onStatusUpdate((updatedAgentId, agentStatus, lastInput) => {
      if (updatedAgentId === agentId) {
        // Update the status when this agent's status changes
        setStatus(prevStatus => ({
          ...prevStatus,
          agentId: updatedAgentId as any,
          status: agentStatus,
          lastInput: lastInput || prevStatus?.lastInput || '',
        }))
      }
    })
    
    // Cleanup subscription on unmount
    return () => {
      unsubscribe()
    }
  }, [agentId, integrationService])

  if (error) {
    return (
      <div className="execution-monitor error">
        <h3>Error</h3>
        <p>{error}</p>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="execution-monitor loading">
        <p>Loading status...</p>
      </div>
    )
  }

  return (
    <div className="execution-monitor">
      <h3>Execution Monitor</h3>
      <div className="status-panel">
        <div className="status-item">
          <span className="label">Status:</span>
          <span className={`value status-${status.status}`}>{status.status}</span>
        </div>
        
        {status.lastInput && (
          <div className="status-item">
            <span className="label">Last Input:</span>
            <span className="value">{status.lastInput}</span>
          </div>
        )}
        
        {status.lastOutput && (
          <div className="status-item">
            <span className="label">Last Output:</span>
            <pre className="value output">{status.lastOutput}</pre>
          </div>
        )}
      </div>
      
      <style jsx>{`
        .execution-monitor {
          background-color: #f5f5f5;
          border-radius: 8px;
          padding: 16px;
          margin-top: 16px;
        }
        
        h3 {
          margin-top: 0;
          margin-bottom: 8px;
          font-size: 16px;
        }
        
        .status-panel {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .status-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .label {
          font-weight: bold;
          font-size: 14px;
        }
        
        .value {
          font-size: 14px;
          padding: 4px 8px;
          background-color: #fff;
          border-radius: 4px;
        }
        
        .output {
          max-height: 200px;
          overflow-y: auto;
          white-space: pre-wrap;
          font-family: monospace;
          font-size: 12px;
          margin: 0;
        }
        
        .status-idle {
          color: #0077ff;
        }
        
        .status-processing, .status-running {
          color: #ff9900;
        }
        
        .status-error {
          color: #ff0000;
        }
        
        .error {
          background-color: #ffeeee;
          color: #cc0000;
        }
      `}</style>
    </div>
  )
} 