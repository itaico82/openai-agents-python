# Running the Agent GUI Backend and Frontend

Here's a guide to set up and run both the backend and frontend services for the Agent GUI application.

## Backend Setup

1. Create an environment file for the backend:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Edit the `.env` file and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_actual_api_key_here
   ```

3. Install backend dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

4. Run the backend server:
   ```bash
   cd backend
   python run.py
   ```

The backend server will be available at `http://localhost:8000`. You can check the health status at `http://localhost:8000/health`.

## Frontend Setup

1. Start the frontend development server:
   ```bash
   cd agent-gui
   npm install    # Only needed first time
   npm run dev
   ```

2. The Vite development server will typically start at `http://localhost:5173`.

## Connecting Frontend to Backend

To ensure the frontend can communicate with the backend:

1. Create or update `.env` in the `agent-gui` directory:
   ```
   VITE_API_BASE_URL=http://localhost:8000
   ```

2. This environment variable is used in the frontend's API client to connect to the backend services.

## Testing the Integration

1. With both servers running, navigate to `http://localhost:5173` in your browser.
2. Create a new agent through the UI.
3. The agent should be registered in the backend and appear in the UI.
4. When you update agent status or execute an agent, the status changes should be reflected in real-time.

## WebSocket Connections

The frontend establishes WebSocket connections to:
- `ws://localhost:8000/api/ws/status` - For real-time agent status updates
- `ws://localhost:8000/api/ws/monitor` - For system performance monitoring

These connections enable real-time updates without polling the API.

## Troubleshooting

- If you see CORS errors in the browser console, ensure the frontend URL is included in the `CORS_ORIGINS` list in `backend/app/core/config.py`.
- If the WebSocket connection fails, ensure both servers are running and check for any network restrictions.
- For OpenAI API errors, verify your API key is correct and has sufficient permissions. 