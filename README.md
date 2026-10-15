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

## Project Structure

```
codesyncai/
  client/                  # Frontend (React 18 + Vite)
    public/                # Static assets
    src/                   # React components, pages, styles, libraries
    index.html             # Vite HTML entry point
    package.json           # Frontend dependencies & scripts
    vite.config.js         # Vite configuration
    vercel.json            # Vercel SPA rewrite configuration
    .env.example           # Client environment variable template
  server/                  # Backend (Node.js + Express + Socket.IO)
    src/                   # Server entry, rooms, and socket handlers
    test/                  # Backend unit and integration tests
    package.json           # Server dependencies & scripts
    .env.example           # Server environment variable template
  .gitignore               # Repository-wide ignore rules
  README.md                # Project documentation
```

## Run locally

Use Node.js 20 or later. Install dependencies in both the `client` and `server` folders:

```sh
cd client && npm install
cd ../server && npm install
```

### 1. Start the Backend

```sh
cd server
npm run dev
```

The backend listens on port 5000 by default; its health check is `http://localhost:5000/api/health`.

### 2. Start the Frontend

In a separate terminal:

```sh
cd client
npm run dev
```

The frontend runs at the Vite local URL (typically `http://localhost:5173`).

## Configuration

`server/.env.example`:

- `PORT` — backend port (default: `5000`).
- `CLIENT_URL` — comma-separated frontend origins allowed by HTTP and Socket.IO CORS (default: `http://localhost:5173,http://localhost:5174`).

`client/.env.example`:

- `VITE_API_URL` — backend URL used by the browser in production (e.g., your deployed backend on Render/Railway).
- `VITE_SERVER_URL` — alternative backend URL fallback (default: `http://localhost:5000`).

No Gemini key or database is required for room collaboration.

## Tests & Build

```sh
# Run backend tests
npm --prefix server test

# Run frontend production build (from root or client)
npm run build
```

Backend tests cover the health route and CORS, room ID/name validation, maximum room size, idle-room expiry, code synchronization, room isolation, authorization, and disconnect cleanup.

## Deployment to Vercel

The frontend is fully configured for deployment on Vercel:

- **Root Directory configuration**:
  - **Option 1 (Default)**: Leave Root Directory as `./` (repo root). The root `vercel.json` and `package.json` will automatically build the `client` and serve `client/dist`.
  - **Option 2 (Subdirectory)**: In Vercel Project Settings ➔ General ➔ Root Directory, set the root directory to `client`. The `client/vercel.json` handles SPA routing and Vite builds automatically.
- **Backend Connection**:
  - The frontend builds and renders completely standalone without requiring a deployed backend.
  - When you deploy the backend service (e.g. to Railway, Render, Fly.io):
    1. In **Vercel Project Settings ➔ Environment Variables**, set `VITE_API_URL` to your backend URL (e.g. `https://your-backend.railway.app`).
    2. In your **Backend Environment Variables**, set `CLIENT_URL` to include your Vercel frontend URL (e.g. `https://your-app.vercel.app`).


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
