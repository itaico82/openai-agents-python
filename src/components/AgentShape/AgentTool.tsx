import {
  BaseBoxShapeTool,
  TLClickEvent,
  TLPointerEvent,
  createShapeId,
} from 'tldraw'
import { AgentShape } from './AgentShape'

export class AgentTool extends BaseBoxShapeTool {
  static id = 'agent'
  static initial = 'idle'
  static children = undefined

  override shapeType = 'agent'

  override onPointerDown = (e: TLPointerEvent) => {
    if (e.button !== 0) return

    const id = createShapeId()
    this.editor.createShape<AgentShape>({
      id,
      type: 'agent',
      x: e.point.x - 100, // Center the shape on click
      y: e.point.y - 75,
      props: {
        name: 'New Agent',
        status: 'idle',
        prompt: '',
        w: 200,
        h: 150,
      },
    })
  }

  override onPointerUp = (e: TLPointerEvent) => {
    // Handle pointer up if needed
  }

  override onDoubleClick = (e: TLClickEvent) => {
    const shape = this.editor.getShapeAtPoint(e.point, {
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