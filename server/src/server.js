import { fileURLToPath } from "node:url";
import { createServer as createHttpServer } from "node:http";
import { resolve, dirname } from "node:path";
import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import { Server as SocketServer } from "socket.io";
import { RoomManager } from "./rooms/roomManager.js";
import { registerSocketHandlers } from "./socket/socketHandlers.js";

import { generateAIResponse } from "./ai/aiService.js";

// Ensure environment variables are loaded from server/.env or root .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(process.cwd(), ".env") });
dotenv.config({ path: resolve(__dirname, "../.env") });
dotenv.config({ path: resolve(__dirname, "../../.env") });

export function getClientOrigins(value = process.env.CLIENT_URL) {
  return (value || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function createServer({ clientUrl = process.env.CLIENT_URL } = {}) {
  const clientOrigins = getClientOrigins(clientUrl);
  const app = express();
  const httpServer = createHttpServer(app);
  const roomManager = new RoomManager();
  const corsOptions = {
    origin(origin, callback) {
      callback(null, !origin || clientOrigins.includes(origin));
    },
    methods: ["GET", "POST"],
  };
  const io = new SocketServer(httpServer, {
    cors: corsOptions,
    maxHttpBufferSize: 256 * 1024,
  });

  app.use(cors(corsOptions));
  app.use(express.json({ limit: "256kb" }));

  // Root endpoint: provide friendly status page and quick link to frontend IDE
  app.get("/", (request, response) => {
    const isHtml = request.accepts("html");
    const configured = Boolean(process.env.GEMINI_API_KEY);
    const frontendUrl = clientOrigins[0] || "http://localhost:5173";

    if (isHtml) {
      response.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Code Studio Server · v2.0</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #080b0f;
      color: #e6edf3;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 12px;
      padding: 36px;
      max-width: 560px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.3);
      margin-bottom: 16px;
    }
    .badge-dot {
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 8px #10b981;
    }
    h1 {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 8px;
      color: #ffffff;
      letter-spacing: -0.02em;
    }
    p {
      color: #8b949e;
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .info-grid {
      background: #161b22;
      border: 1px solid #21262d;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
      display: grid;
      gap: 10px;
      font-family: "JetBrains Mono", monospace;
      font-size: 13px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      color: #8b949e;
    }
    .info-val {
      color: #e6edf3;
      font-weight: 500;
    }
    .val-active { color: #10b981; }
    .val-amber { color: #f59e0b; }
    .btn-launch {
      display: block;
      width: 100%;
      text-align: center;
      padding: 12px 18px;
      border-radius: 8px;
      background: #10b981;
      color: #04100c;
      font-weight: 600;
      font-size: 14px;
      text-decoration: none;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
    }
    .btn-launch:hover {
      background: #34d399;
      transform: translateY(-1px);
    }
    .links {
      margin-top: 18px;
      text-align: center;
      font-size: 12px;
      color: #8b949e;
    }
    .links a {
      color: #58a6ff;
      text-decoration: none;
      margin: 0 8px;
    }
    .links a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge"><span class="badge-dot"></span> Server Online</div>
    <h1>Code Studio Server v2.0</h1>
    <p>Real-Time Collaboration Engine and AI pair-programming backend. The client IDE application is active and running.</p>
    
    <div class="info-grid">
      <div class="info-row"><span>Service</span><span class="info-val">Code Studio Engine</span></div>
      <div class="info-row"><span>Socket.IO</span><span class="info-val val-active">Ready (Port 5000)</span></div>
      <div class="info-row"><span>Gemini AI</span><span class="info-val ${configured ? "val-active" : "val-amber"}">${configured ? "Configured" : "Needs API Key"}</span></div>
      <div class="info-row"><span>Client IDE</span><span class="info-val">${frontendUrl}</span></div>
    </div>

    <a href="${frontendUrl}" class="btn-launch">Launch Code Studio IDE →</a>

    <div class="links">
      <a href="/api/health" target="_blank">Health Check</a> ·
      <a href="/api/ai/status" target="_blank">AI Status</a>
    </div>
  </div>
</body>
</html>`);
      return;
    }

    response.json({
      service: "Code Studio Backend & Collaboration Engine",
      version: "2.0.0",
      status: "online",
      frontend: frontendUrl,
      geminiConfigured: configured,
      endpoints: {
        health: "/api/health",
        aiStatus: "/api/ai/status",
        aiChat: "/api/ai/chat",
      },
    });
  });

  app.get("/api/health", (_request, response) => {
    response.json({
      status: "ok",
      service: "codesync-ai-server",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/api/ai/status", (_request, response) => {
    const configured = Boolean(process.env.GEMINI_API_KEY);
    response.json({
      ok: true,
      configured,
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      status: configured ? "ready" : "unconfigured",
    });
  });

  app.post("/api/ai/chat", async (request, response) => {
    const { prompt, code, language, action, history } = request.body || {};
    try {
      const result = await generateAIResponse({
        prompt,
        code,
        language,
        action,
        history,
      });
      response.json(result);
    } catch (error) {
      const status = error.status || 500;
      response.status(status).json({
        ok: false,
        error: error.message || "AI processing failed.",
      });
    }
  });

  app.use((_request, response) => {
    response.status(404).json({ error: "Route not found." });
  });
  app.use((error, _request, response, _next) => {
    if (error.type === "entity.too.large") {
      response.status(413).json({ error: "Request body is too large." });
      return;
    }
    console.error("HTTP request failed:", error.message);
    response.status(400).json({ error: "The request could not be processed." });
  });

  registerSocketHandlers(io, roomManager);
  return { app, httpServer, io, roomManager };
}

export function startServer() {
  const portValue = process.env.PORT || "5000";
  const port = Number(portValue);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("PORT must be an integer between 0 and 65535.");
  }

  const services = createServer();
  const { httpServer, io } = services;
  httpServer.on("error", (error) => {
    console.error(`Unable to start CodeSync server: ${error.message}`);
    process.exitCode = 1;
  });
  httpServer.listen(port, () => {
    const address = httpServer.address();
    const actualPort = typeof address === "object" && address ? address.port : port;
    console.info(`CodeSync API and Socket.IO listening on port ${actualPort}.`);
  });

  let closing = false;
  async function shutdown(signal) {
    if (closing) return;
    closing = true;
    console.info(`${signal} received; closing CodeSync server.`);
    await new Promise((resolveClose) => io.close(resolveClose));
  }
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  return services;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer();
}
