import { randomBytes } from "node:crypto";

export const DEFAULT_CODE = `// Welcome to your CodeSync workspace
// Share this room ID with a teammate to get started.

function greet(name) {
  return \`Hello, \${name}! Let's build something great.\`;
}

console.log(greet("world"));
`;

export const MAX_ROOM_SIZE = 10;
export const MAX_CODE_LENGTH = 200_000;

const ROOM_ID_PATTERN = /^[A-Z0-9-]{4,40}$/;
const DISPLAY_NAME_MAX_LENGTH = 32;
const EMPTY_ROOM_TTL_MS = 5 * 60 * 1000;

export function normalizeRoomId(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return ROOM_ID_PATTERN.test(normalized) ? normalized : null;
}

export function normalizeDisplayName(value, fallback) {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  if (
    normalized.length < 1 ||
    normalized.length > DISPLAY_NAME_MAX_LENGTH ||
    /[\u0000-\u001f\u007f]/.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

export class RoomManager {
  constructor({ emptyRoomTtlMs = EMPTY_ROOM_TTL_MS } = {}) {
    this.rooms = new Map();
    this.emptyRoomTtlMs = emptyRoomTtlMs;
  }

  createRoom() {
    let roomId;
    do {
      roomId = `CS-${randomBytes(4).toString("hex").toUpperCase()}`;
    } while (this.rooms.has(roomId));

    const room = {
      code: DEFAULT_CODE,
      users: new Map(),
      cleanupTimer: null,
    };
    this.rooms.set(roomId, room);
    return { roomId, room };
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  addUser(roomId, socketId, displayName) {
    const room = this.getRoom(roomId);
    if (!room) return { ok: false, message: "This room is no longer available." };

    if (room.users.has(socketId)) {
      return { ok: true, room, users: this.getUsers(roomId) };
    }
    if (room.users.size >= MAX_ROOM_SIZE) {
      return { ok: false, message: "This room has reached its 10-person limit." };
    }

    if (room.cleanupTimer) {
      clearTimeout(room.cleanupTimer);
      room.cleanupTimer = null;
    }
    room.users.set(socketId, { id: socketId, displayName });
    return { ok: true, room, users: this.getUsers(roomId) };
  }

  removeUser(roomId, socketId) {
    const room = this.getRoom(roomId);
    if (!room || !room.users.delete(socketId)) return null;

    const users = this.getUsers(roomId);
    if (room.users.size === 0) {
      room.cleanupTimer = setTimeout(() => {
        if (room.users.size === 0 && this.rooms.get(roomId) === room) {
          this.rooms.delete(roomId);
        }
      }, this.emptyRoomTtlMs);
      room.cleanupTimer.unref?.();
    }
    return users;
  }

  setCode(roomId, code) {
    const room = this.getRoom(roomId);
    if (!room) return null;
    room.code = code;
    return room;
  }

  getUsers(roomId) {
    const room = this.getRoom(roomId);
    return room ? [...room.users.values()] : [];
  }

  snapshot(roomId) {
    const room = this.getRoom(roomId);
    if (!room) return null;
    return {
      roomId,
      code: room.code,
      users: [...room.users.values()],
    };
  }
}
