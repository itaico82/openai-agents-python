import {
  BaseBoxShapeUtil,
  DefaultSpinner,
  HTMLContainer,
  TLBaseShape,
  toDomPrecision,
  useValue,
  T,
  TLShapeUtilCanBindOpts
} from 'tldraw'

// Define the Agent shape's properties
export type AgentShapeProps = {
  name: string
  status: 'idle' | 'running' | 'processing'
  prompt: string
  lastInput?: string
  lastOutput?: string
  tools?: string[]
  parameters?: Record<string, any>
  executionCount?: number
  averageExecutionTime?: number
  lastExecutionTime?: number
  w: number
  h: number
}

// Define the Agent shape type
export type AgentShape = TLBaseShape<'agent', AgentShapeProps>

// Helper function to get status color
const getStatusColor = (status: AgentShapeProps['status']) => {
  switch (status) {
    case 'idle':
      return '#888'
    case 'running':
      return '#22c55e'
    case 'processing':
      return '#3b82f6'
    default:
      return '#888'
  }
}

// Helper function to truncate text
const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// Create the Agent shape utility class
export class AgentShapeUtil extends BaseBoxShapeUtil<AgentShape> {
  static type = 'agent' as const

  static props = {
    name: T.string,
    status: T.string,
    prompt: T.string,
    lastInput: T.string.optional(),
    lastOutput: T.string.optional(),
    tools: T.jsonValue.optional(),
    parameters: T.jsonValue.optional(),
    executionCount: T.number.optional(),
    averageExecutionTime: T.number.optional(),
    lastExecutionTime: T.number.optional(),
    w: T.number,
    h: T.number,
  }

  override isAspectRatioLocked = (_shape: AgentShape) => false
  override canResize = (_shape: AgentShape) => true
  override canBind = (_opts: TLShapeUtilCanBindOpts) => true

  override getDefaultProps(): AgentShapeProps {
    return {
      name: 'New Agent',
      status: 'idle',
      prompt: '',
      tools: [],
      parameters: {},
      executionCount: 0,
      averageExecutionTime: 0,
      lastExecutionTime: 0,
      w: 200,
      h: 150,
    }
  }

  component(shape: AgentShape) {
    const bounds = this.getGeometry(shape).bounds
    const status = shape.props.status
    
    // Safely handle tools as either array or string
    const tools: string[] = Array.isArray(shape.props.tools) 
      ? shape.props.tools 
      : (typeof shape.props.tools === 'string' && shape.props.tools 
          ? JSON.parse(shape.props.tools) 
          : [])
    
    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: toDomPrecision(bounds.width),
          height: toDomPrecision(bounds.height),
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '2px solid',
            borderColor: getStatusColor(status),
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <StatusIndicator status={status} />
            <h3
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 600,
              }}
            >
              {shape.props.name}
            </h3>
          </div>

          {/* Prompt Preview */}
          <div
            style={{
              fontSize: '12px',
              color: '#666',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {shape.props.prompt || 'No prompt set'}
          </div>

          {/* Tools (if available) */}
          {tools.length > 0 && (
            <div
              style={{
                fontSize: '11px',
                color: '#555',
              }}
            >
              <div style={{ fontWeight: 500, marginBottom: '2px' }}>Tools:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {tools.map((tool, index) => (
                  <span
                    key={index}
                    style={{
                      background: '#f0f0f0',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                    }}
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Status and Metrics */}
          <div
            style={{
              marginTop: 'auto',
              fontSize: '12px',
              color: '#888',
            }}
          >
            {status === 'processing' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <DefaultSpinner />
                <span>Processing...</span>
              </div>
            )}
            {shape.props.lastInput && (
              <div>Last input: {truncateText(shape.props.lastInput, 30)}</div>
            )}
            {/* Execution metrics */}
            {shape.props.executionCount && shape.props.executionCount > 0 && (
              <div style={{ marginTop: '4px', fontSize: '10px', color: '#777' }}>
                <div>Runs: {shape.props.executionCount}</div>
                {shape.props.lastExecutionTime && (
                  <div>Last: {shape.props.lastExecutionTime.toFixed(0)}ms</div>
                )}
              </div>
            )}
          </div>
        </div>
      </HTMLContainer>
    )
  }

  indicator(shape: AgentShape) {
    return null
  }
}

// Helper Components
const StatusIndicator = ({ status }: { status: AgentShapeProps['status'] }) => {
  return (
    <div
      style={{
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        backgroundColor: getStatusColor(status),
      }}
    />
  )
} 