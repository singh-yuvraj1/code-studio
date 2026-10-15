import { io } from "socket.io-client";

const rawConfiguredUrl = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_SERVER_URL ||
  ""
).trim();

// Strip trailing slashes to prevent Socket.IO connection path issues
const configuredUrl = rawConfiguredUrl ? rawConfiguredUrl.replace(/\/+$/, "") : "";

let socket;
let fallbackDisplayName;

export function isLocalEnvironment() {
  if (typeof window === "undefined") return true;
  const hostname = window.location.hostname;
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".local")
  );
}

export function isBackendConfigured() {
  return Boolean(configuredUrl || isLocalEnvironment());
}

export function getEffectiveServerUrl() {
  if (configuredUrl) {
    return configuredUrl;
  }
  if (isLocalEnvironment()) {
    return "http://localhost:5000";
  }
  return "";
}

export function getSocket() {
  if (!socket) {
    const serverUrl = getEffectiveServerUrl() || "http://localhost:5000";
    socket = io(serverUrl, {
      autoConnect: false,
      reconnection: isBackendConfigured(),
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });
  }
  return socket;
}

export function getDisplayName() {
  try {
    const existingName = window.sessionStorage.getItem("codesync:displayName");
    if (existingName) return existingName;
    const displayName = `Guest-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
    window.sessionStorage.setItem("codesync:displayName", displayName);
    return displayName;
  } catch (error) {
    console.warn("Unable to persist the temporary display name for this tab.", error);
    fallbackDisplayName ??= `Guest-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
    return fallbackDisplayName;
  }
}

export function connectSocket(socketInstance) {
  if (socketInstance.connected) return Promise.resolve();

  if (!isBackendConfigured()) {
    return Promise.reject(
      new Error(
        "Collaboration backend is not configured yet. Deploy your backend service and set VITE_API_URL in your Vercel project environment variables."
      )
    );
  }

  return new Promise((resolve, reject) => {
    const targetUrl = getEffectiveServerUrl();
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(
        new Error(
          `The collaboration server (${targetUrl}) did not respond within 8 seconds. Check that the backend service is running and accessible.`
        )
      );
    }, 8000);

    function cleanup() {
      window.clearTimeout(timeout);
      socketInstance.off("connect", onConnect);
      socketInstance.off("connect_error", onConnectError);
    }

    function onConnect() {
      cleanup();
      resolve();
    }

    function onConnectError(err) {
      cleanup();
      const detail = err?.message ? `: ${err.message}` : ".";
      reject(
        new Error(
          `Could not reach the collaboration server at ${targetUrl}${detail} Check that your backend is running and CORS is configured.`
        )
      );
    }

    socketInstance.once("connect", onConnect);
    socketInstance.once("connect_error", onConnectError);
    socketInstance.connect();
  });
}

export function emitWithAck(socketInstance, eventName, payload) {
  return new Promise((resolve, reject) => {
    socketInstance.timeout(8000).emit(eventName, payload, (timeoutError, response) => {
      if (timeoutError) {
        reject(new Error("The collaboration server did not respond. Please try again."));
        return;
      }
      if (!response?.ok) {
        reject(new Error(response?.message || "The collaboration request could not be completed."));
        return;
      }
      resolve(response);
    });
  });
}
