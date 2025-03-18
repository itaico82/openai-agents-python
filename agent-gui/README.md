<<<<<<< HEAD
# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
=======
# OpenAI Agents Python with Cursor.dev

This repository contains a collection of examples and patterns for using the OpenAI Agents SDK, integrated with Cursor.dev rules for enhanced development experience.

## Features

- Basic agent implementation examples
- Tool integration patterns
- Agent handoff examples
- Input/Output guardrails
- Common architectural patterns
- Tracing and monitoring
- Structured output with Pydantic

## Cursor.dev Rules

The repository includes several Cursor.dev rules to help with development:

- `openai-agents-basic`: Basic usage patterns
- `openai-agents-tools`: Tool integration examples
- `openai-agents-handoffs`: Agent handoff patterns
- `openai-agents-guardrails`: Input/Output validation
- `openai-agents-patterns`: Common architectural patterns
- `openai-agents-tracing`: Tracing and monitoring
- `openai-agents-structured-output`: Pydantic model integration

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/itaico82/openai-agents-python.git
cd openai-agents-python
```

2. Create a virtual environment:
```bash
python -m venv env
source env/bin/activate  # On Windows: env\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up your OpenAI API key:
```bash
export OPENAI_API_KEY='your-api-key-here'
```

## Usage

Each example in the repository demonstrates different aspects of the OpenAI Agents SDK:

1. Basic Usage:
```python
from agents import Agent, Runner
import asyncio

agent = Agent(
    name="Assistant",
    instructions="You are a helpful assistant."
)

async def main():
    result = await Runner.run(agent, "Your query here")
    print(result.final_output)

if __name__ == "__main__":
    asyncio.run(main())
```

2. Using Tools:
```python
from agents import Agent, Runner, function_tool

@function_tool
def get_weather(city: str) -> str:
    return f"The weather in {city} is sunny."

agent = Agent(
    name="Weather Assistant",
    instructions="You help with weather queries.",
    tools=[get_weather]
)
```

See individual examples in the repository for more detailed usage patterns.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- OpenAI for the Agents SDK
- Cursor.dev for the development environment
- Contributors to the example codebase
>>>>>>> 299b25086d57405e533b6ed03b2187a8d1860ef7
