# Getting Started with AgentGUI

## Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API Key

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/agent-gui.git
cd agent-gui
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
OPENAI_API_KEY=your_api_key_here
```

4. Start the development server:
```bash
npm run dev
```

## Basic Usage

### Creating an Agent

1. Click the "Add Agent" button in the toolbar
2. Configure the agent's properties:
   - Name
   - Prompt
   - Tools (if any)
3. Click "Create" to add the agent to the canvas

### Connecting Agents

1. Select the source agent
2. Click the "Connect" tool
3. Click the target agent to create a connection

### Monitoring Agents

- Agent status is indicated by color:
  - Green: Idle
  - Blue: Running
  - Yellow: Processing
- Click an agent to view its details
- Real-time updates appear in the agent card

## Next Steps

- [Architecture Overview](./architecture.md)
- [Custom Agent Types](../api/custom-agents.md)
- [Example Workflows](../examples/README.md) 