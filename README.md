# OpenAI Agents Python

This repository contains examples and patterns for the OpenAI Agents SDK integrated with Cursor.dev.

## Projects

### Agent GUI

A visual interface for managing and monitoring OpenAI agents built with:
- React + TypeScript
- Vite
- tldraw for the canvas interface
- FastAPI backend for persistence

Features:
- Visual agent creation and management
- Real-time status monitoring via WebSockets
- Interactive agent controls
- Drag-and-drop interface
- Backend persistence with PostgreSQL
- Bidirectional ID mapping between backend UUIDs and tldraw shape IDs

### Python SDK Examples

Collection of examples and patterns for using the OpenAI Agents SDK:
- Basic usage examples
- Tools and function integrations
- Agent handoffs and control transfer
- Input and output guardrails
- Structured output with Pydantic models
- Tracing and monitoring
- Common architectural patterns

## Getting Started

### Agent GUI

1. Install backend dependencies:
```bash
pip install -r backend/requirements.txt
```

2. Configure your environment by creating a `.env` file in the project root:
```
OPENAI_API_KEY=your_openai_api_key
```

3. Start the backend server:
```bash
cd backend
python run.py
```

4. Navigate to the agent-gui directory:
```bash
cd agent-gui
```

5. Install frontend dependencies:
```bash
npm install
```

6. Start the frontend development server:
```bash
npm run dev
```

7. Open http://localhost:5173 in your browser

### Python SDK Examples

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Follow the examples in the `examples` directory

## Documentation

- [Quickstart Guide](docs/quickstart.md)
- [Agent Configuration](docs/config.md)
- [Tools and Integrations](docs/tools.md)
- [Tracing and Monitoring](docs/tracing.md)
- [Project Execution Plan](docs/EXECUTION_PLAN.md)
- [Running Backend & Frontend Servers](docs/RUNNING_SERVERS.md)

## Contributing

We welcome contributions! Please read our guidelines in the documentation for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- OpenAI for the Agents SDK
- Cursor.dev for the development environment
- Contributors to the example codebase
