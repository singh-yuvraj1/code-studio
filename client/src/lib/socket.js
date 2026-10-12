import { io } from "socket.io-client";

const SERVER_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_SERVER_URL ||
  "http://localhost:5000";
let socket;
let fallbackDisplayName;

export function getSocket() {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
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

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("The collaboration server did not respond. Check that the backend is running."));
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

    function onConnectError() {
      cleanup();
      reject(new Error("Could not reach the collaboration server. Check that the backend is running."));
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
