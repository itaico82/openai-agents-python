# OpenAI Agents Python

This repository contains examples and patterns for the OpenAI Agents SDK integrated with Cursor.dev.

## Projects

### Agent GUI

A visual interface for managing and monitoring OpenAI agents built with:
- React + TypeScript
- Vite
- tldraw for the canvas interface

Features:
- Visual agent creation and management
- Real-time status monitoring
- Interactive agent controls
- Drag-and-drop interface

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

1. Navigate to the agent-gui directory:
```bash
cd agent-gui
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open http://localhost:5173 in your browser

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

- [Getting Started Guide](docs/guides/getting-started.md)
- [Architecture Overview](docs/guides/architecture.md)
- [API Reference](docs/api/README.md)

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- OpenAI for the Agents SDK
- Cursor.dev for the development environment
- Contributors to the example codebase
