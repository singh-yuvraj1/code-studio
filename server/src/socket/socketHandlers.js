import {
  MAX_CODE_LENGTH,
  normalizeDisplayName,
  normalizeRoomId,
} from "../rooms/roomManager.js";

function respond(socket, acknowledge, response) {
  if (typeof acknowledge === "function") {
    acknowledge(response);
  } else if (!response.ok) {
    socket.emit("room:error", { message: response.message });
  }
}

export function registerSocketHandlers(io, roomManager) {
  io.on("connection", (socket) => {
    function broadcastUsers(roomId) {
      io.to(roomId).emit("room:users", {
        roomId,
        users: roomManager.getUsers(roomId),
      });
    }

    function leaveCurrentRoom() {
      const roomId = socket.data.roomId;
      if (!roomId) return null;
      socket.data.roomId = null;
      roomManager.removeUser(roomId, socket.id);
      socket.leave(roomId);
      broadcastUsers(roomId);
      return roomId;
    }

    socket.on("room:create", async (payload = {}, acknowledge) => {
      if (socket.data.roomId) {
        respond(socket, acknowledge, {
          ok: false,
          message: "Leave the current room before creating another.",
        });
        return;
      }

      const fallbackName = `Guest-${socket.id.slice(-4).toUpperCase()}`;
      const displayName = normalizeDisplayName(payload?.displayName, fallbackName);
      if (!displayName) {
        respond(socket, acknowledge, {
          ok: false,
          message: "Display names must be 1–32 characters without control characters.",
        });
        return;
      }

      const { roomId } = roomManager.createRoom();
      const result = roomManager.addUser(roomId, socket.id, displayName);
      if (!result.ok) {
        respond(socket, acknowledge, result);
        return;
      }

      socket.data.roomId = roomId;
      socket.data.displayName = displayName;
      await socket.join(roomId);
      const snapshot = roomManager.snapshot(roomId);
      respond(socket, acknowledge, { ok: true, ...snapshot });
      broadcastUsers(roomId);
    });

    socket.on("room:join", async (payload = {}, acknowledge) => {
      const roomId = normalizeRoomId(payload?.roomId);
      if (!roomId) {
        respond(socket, acknowledge, {
          ok: false,
          message: "Enter a valid room ID using 4–40 letters, numbers, or hyphens.",
        });
        return;
      }

      if (socket.data.roomId) {
        if (socket.data.roomId === roomId) {
          respond(socket, acknowledge, { ok: true, ...roomManager.snapshot(roomId) });
        } else {
          respond(socket, acknowledge, {
            ok: false,
            message: "Leave the current room before joining another.",
          });
        }
        return;
      }

      const room = roomManager.getRoom(roomId);
      if (!room) {
        respond(socket, acknowledge, {
          ok: false,
          message: "Room not found. Check the ID or ask its creator to make a new room.",
        });
        return;
      }

      const fallbackName = `Guest-${socket.id.slice(-4).toUpperCase()}`;
      const displayName = normalizeDisplayName(payload?.displayName, fallbackName);
      if (!displayName) {
        respond(socket, acknowledge, {
          ok: false,
          message: "Display names must be 1–32 characters without control characters.",
        });
        return;
      }

      const result = roomManager.addUser(roomId, socket.id, displayName);
      if (!result.ok) {
        respond(socket, acknowledge, result);
        return;
      }

      socket.data.roomId = roomId;
      socket.data.displayName = displayName;
      await socket.join(roomId);
      respond(socket, acknowledge, { ok: true, ...roomManager.snapshot(roomId) });
      broadcastUsers(roomId);
    });

    socket.on("code:change", (payload = {}, acknowledge) => {
      const roomId = socket.data.roomId;
      if (!roomId) {
        respond(socket, acknowledge, {
          ok: false,
          message: "Join a room before sending code changes.",
        });
        return;
      }

      const { code } = payload ?? {};
      if (typeof code !== "string" || code.length > MAX_CODE_LENGTH) {
        respond(socket, acknowledge, {
          ok: false,
          message: `Code updates must be text no longer than ${MAX_CODE_LENGTH} characters.`,
        });
        return;
      }

      const room = roomManager.setCode(roomId, code);
      if (!room) {
        socket.data.roomId = null;
        respond(socket, acknowledge, {
          ok: false,
          message: "This room is no longer available. Return to the dashboard to create or join another.",
        });
        return;
      }

      socket.to(roomId).emit("code:sync", {
        code,
        updatedBy: socket.data.displayName,
      });
      respond(socket, acknowledge, { ok: true });
    });

    socket.on("file:change", (payload = {}, acknowledge) => {
      const roomId = socket.data.roomId;
      if (!roomId) {
        respond(socket, acknowledge, {
          ok: false,
          message: "Join a room before sending file changes.",
        });
        return;
      }

      const { fileId, content, language } = payload ?? {};
      if (typeof fileId !== "string" || typeof content !== "string" || content.length > MAX_CODE_LENGTH) {
        respond(socket, acknowledge, {
          ok: false,
          message: "Invalid file update payload.",
        });
        return;
      }

      // Also sync room.code if this is the active file
      roomManager.setCode(roomId, content);

      socket.to(roomId).emit("file:sync", {
        fileId,
        content,
        language,
        updatedBy: socket.data.displayName,
      });
      respond(socket, acknowledge, { ok: true });
    });

    socket.on("workspace:sync", (payload = {}, acknowledge) => {
      const roomId = socket.data.roomId;
      if (!roomId) {
        respond(socket, acknowledge, {
          ok: false,
          message: "Join a room before syncing workspace.",
        });
        return;
      }

      const { files, activeFileId } = payload ?? {};
      if (!Array.isArray(files)) {
        respond(socket, acknowledge, {
          ok: false,
          message: "Files must be an array of workspace nodes.",
        });
        return;
      }

      roomManager.setFiles(roomId, files);
      socket.to(roomId).emit("workspace:synced", {
        files,
        activeFileId,
        updatedBy: socket.data.displayName,
      });
      respond(socket, acknowledge, { ok: true });
    });

    socket.on("tree:action", (payload = {}, acknowledge) => {
      const roomId = socket.data.roomId;
      if (!roomId) {
        respond(socket, acknowledge, {
          ok: false,
          message: "Join a room before performing tree actions.",
        });
        return;
      }

      const { action, node, files, nodeId } = payload ?? {};
      if (Array.isArray(files)) {
        roomManager.setFiles(roomId, files);
      }

      socket.to(roomId).emit("tree:action", {
        action,
        node,
        nodeId,
        files,
        updatedBy: socket.data.displayName,
      });
      respond(socket, acknowledge, { ok: true });
    });

    socket.on("room:leave", (acknowledge) => {
      leaveCurrentRoom();
      respond(socket, acknowledge, { ok: true });
    });

    socket.on("disconnect", () => {
      leaveCurrentRoom();
    });
  });
}
