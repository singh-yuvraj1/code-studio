# CodeSync AI

CodeSync AI is a browser-based coding workspace with room-based collaboration. The frontend and real-time collaboration server are implemented; Gemini AI integration is not included in this phase.

## Features

- Create a room or join an active room by ID.
- Edit JavaScript, TypeScript, Python, HTML, CSS, JSON, Java, and C++ with Monaco.
- Synchronize room code changes over Socket.IO with a short client-side debounce.
- See connected display names, user count, and connection/reconnection status.
- Choose an editor theme, save a local browser draft, and download the current file.
- Keep rooms isolated and limit each room to 10 connected users.

## Stack

- React 18, Vite, Tailwind CSS 4, React Router, Monaco Editor, Socket.IO client, and Lucide React.
- Node.js, Express, Socket.IO, dotenv, and cors.

## Run locally

Use Node.js 20 or later. Install the frontend and backend dependencies once from the project root:

```sh
npm install
npm install --prefix server
```

Copy `server/.env.example` to `server/.env` if you want to set the server options explicitly. The default frontend URL is `http://localhost:5173`; `CLIENT_URL` accepts comma-separated allowed browser origins.

Start each service in a separate terminal, from the project root:

```sh
npm run dev:server
```

```sh
npm run dev
```

The frontend runs at the Vite URL shown in its terminal. The backend listens on port 5000 by default; its health check is `http://localhost:5000/api/health`. Set `VITE_SERVER_URL` in a root `.env` only if the backend is hosted at a different URL.

## Configuration

`server/.env.example`:

- `PORT` — backend port (default: `5000`).
- `CLIENT_URL` — comma-separated frontend origins allowed by HTTP and Socket.IO CORS.

Root `.env.example`:

- `VITE_SERVER_URL` — backend URL used by the browser (default: `http://localhost:5000`).

No Gemini key or database is required for room collaboration.

## Tests

```sh
npm run build
npm run test:server
```

Backend tests cover the health route and CORS, room ID/name validation, maximum room size, idle-room expiry, code synchronization, room isolation, authorization, and disconnect cleanup.

## Architecture and synchronization

The frontend opens a single Socket.IO client and uses acknowledged `room:create` and `room:join` requests before navigating into a room. The server generates room IDs, validates room membership and code payloads, stores room code and connected display names in memory, and returns a room snapshot on join. Monaco updates are debounced on the client; the server broadcasts `code:sync` only to the other sockets in that authorized room. The receiving client updates Monaco’s controlled value without echoing that remote update back to the server.

Display names are temporary guest labels stored per browser tab. They are **not authenticated identities**.

Room state is in memory and is lost when the backend restarts. Empty rooms are removed after five minutes. Local “Save” stores a draft only in that browser; it is not server persistence. The AI panel remains unavailable until a later backend integration adds an AI provider.

Collaboration currently uses whole-document updates and last-write-wins behavior. It does not merge simultaneous edits and is not a CRDT or operational-transform implementation; concurrent changes can overwrite one another.

## Manual collaboration check

1. Start the backend and frontend in separate terminals.
2. Open the frontend in one browser session and select **Create workspace**.
3. Copy the room ID shown in the workspace header.
4. Open a second browser session (for example, an incognito window), enter that ID on the welcome page, and select **Join**.
5. Confirm the connected names/count update in both workspaces.
6. Type in the Monaco editor in either session and confirm the other session receives the update.
7. Create a separate room in a third tab and confirm its code does not change.
8. Close a room tab and confirm its user disappears from the remaining session.
