import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_CODE_LENGTH,
  MAX_ROOM_SIZE,
  normalizeDisplayName,
  normalizeRoomId,
  RoomManager,
} from "../src/rooms/roomManager.js";

test("room IDs and display names are normalized and validated", () => {
  assert.equal(normalizeRoomId(" cs-ab12 "), "CS-AB12");
  assert.equal(normalizeRoomId("???"), null);
  assert.equal(normalizeRoomId("CS"), null);
  assert.equal(normalizeDisplayName(" Ada ", "Guest-1"), "Ada");
  assert.equal(normalizeDisplayName(" ", "Guest-1"), null);
  assert.equal(normalizeDisplayName("x".repeat(33), "Guest-1"), null);
});

test("room size is capped and an empty room expires", async () => {
  const manager = new RoomManager({ emptyRoomTtlMs: 10 });
  const { roomId } = manager.createRoom();
  for (let index = 0; index < MAX_ROOM_SIZE; index += 1) {
    const result = manager.addUser(roomId, `socket-${index}`, `Guest-${index}`);
    assert.equal(result.ok, true);
  }
  assert.equal(manager.addUser(roomId, "overflow", "Extra").ok, false);
  for (let index = 0; index < MAX_ROOM_SIZE; index += 1) {
    manager.removeUser(roomId, `socket-${index}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(manager.getRoom(roomId), undefined);
  assert.equal(MAX_CODE_LENGTH, 200_000);
});
