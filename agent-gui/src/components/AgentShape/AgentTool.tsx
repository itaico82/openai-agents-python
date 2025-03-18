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
      // TODO: Open agent configuration panel
      console.log('Open config for:', shape.id)
    }
  }
} 