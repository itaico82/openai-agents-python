import {
  BaseBoxShapeTool,
  TLPointerEventInfo,
  TLClickEventInfo,
  createShapeId,
  StateNode,
} from 'tldraw'
import { AgentShape } from './AgentShape'

export class AgentTool extends StateNode {
  static id = 'agent'
  static initial = 'idle'
  static children = undefined

  shapeType = 'agent'

  onPointerDown = (info: TLPointerEventInfo) => {
    if (info.button !== 0) return

    const id = createShapeId()
    this.editor.createShape<AgentShape>({
      id,
      type: 'agent',
      x: info.point.x - 100, // Center the shape on click
      y: info.point.y - 75,
      props: {
        name: 'New Agent',
        status: 'idle',
        prompt: '',
        lastInput: '', // Ensure lastInput is initialized as empty string
        lastOutput: '',
        tools: [], // Add empty tools array
        parameters: {}, // Add empty parameters object
        w: 200,
        h: 150,
      },
    })
  }

  onPointerUp = (info: TLPointerEventInfo) => {
    // Handle pointer up if needed
  }

  onDoubleClick = (info: TLClickEventInfo) => {
    const shape = this.editor.getShapeAtPoint(info.point, {
      hitInside: true,
      hitLabels: false,
      filter: (shape) => shape.type === 'agent',
    })

    if (shape) {
      // Inform the app that we want to configure this agent
      // We'll select the shape, which the app will detect
      this.editor.select(shape.id)
    }
  }
} 