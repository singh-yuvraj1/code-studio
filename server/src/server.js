import "dotenv/config";
import { fileURLToPath } from "node:url";
import { createServer as createHttpServer } from "node:http";
import { resolve } from "node:path";
import cors from "cors";
import express from "express";
import { Server as SocketServer } from "socket.io";
import { RoomManager } from "./rooms/roomManager.js";
import { registerSocketHandlers } from "./socket/socketHandlers.js";

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
  app.use(express.json({ limit: "32kb" }));
  app.get("/api/health", (_request, response) => {
    response.json({
      status: "ok",
      service: "codesync-ai-server",
      timestamp: new Date().toISOString(),
    });
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
