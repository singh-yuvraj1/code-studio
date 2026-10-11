import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { io as createClient } from "socket.io-client";
import { createServer } from "../src/server.js";

const server = createServer({ clientUrl: "http://localhost:5173" });
let baseUrl;
const clients = new Set();

function connectClient() {
  const socket = createClient(baseUrl, {
    forceNew: true,
    reconnection: false,
    transports: ["websocket"],
  });
  clients.add(socket);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Socket connection timed out.")), 4000);
    socket.once("connect", () => {
      clearTimeout(timeout);
      resolve(socket);
    });
    socket.once("connect_error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function request(socket, eventName, payload) {
  return new Promise((resolve, reject) => {
    socket.timeout(3000).emit(eventName, payload, (timeoutError, response) => {
      if (timeoutError) {
        reject(new Error(`${eventName} acknowledgement timed out.`));
      } else {
        resolve(response);
      }
    });
  });
}

function waitForEvent(socket, eventName, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(eventName, onEvent);
      reject(new Error(`Timed out waiting for ${eventName}.`));
    }, timeoutMs);
    function onEvent(payload) {
      clearTimeout(timeout);
      resolve(payload);
    }
    socket.once(eventName, onEvent);
  });
}

before(async () => {
  await new Promise((resolve, reject) => {
    server.httpServer.once("error", reject);
    server.httpServer.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.httpServer.address().port}`;
});

after(async () => {
  for (const client of clients) client.disconnect();
  await new Promise((resolve) => server.io.close(resolve));
});

test("health check responds with service status and configured CORS", async () => {
  const response = await fetch(`${baseUrl}/api/health`, {
    headers: { Origin: "http://localhost:5173" },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:5173");
  assert.equal((await response.json()).status, "ok");
});

test("rooms isolate users and code and clean up disconnected members", async () => {
  const [creator, teammate, otherRoomUser, outsider] = await Promise.all([
    connectClient(),
    connectClient(),
    connectClient(),
    connectClient(),
  ]);
  const created = await request(creator, "room:create", { displayName: "Ada" });
  assert.equal(created.ok, true);
  assert.match(created.roomId, /^CS-[A-F0-9]{8}$/);
  assert.equal(typeof created.code, "string");
  assert.deepEqual(created.users.map((user) => user.displayName), ["Ada"]);

  const invalidJoin = await request(teammate, "room:join", {
    roomId: "???",
    displayName: "Lin",
  });
  assert.equal(invalidJoin.ok, false);
  assert.match(invalidJoin.message, /valid room ID/i);

  const missingRoom = await request(teammate, "room:join", {
    roomId: "CS-00000000",
    displayName: "Lin",
  });
  assert.equal(missingRoom.ok, false);
  assert.match(missingRoom.message, /not found/i);

  const joined = await request(teammate, "room:join", {
    roomId: created.roomId.toLowerCase(),
    displayName: "Lin",
  });
  assert.equal(joined.ok, true);
  assert.equal(joined.roomId, created.roomId);
  assert.equal(joined.code, created.code);
  assert.deepEqual(joined.users.map((user) => user.displayName), ["Ada", "Lin"]);

  const secondRoom = await request(otherRoomUser, "room:create", { displayName: "Grace" });
  const isolatedUpdate = waitForEvent(otherRoomUser, "code:sync", 150);
  const syncedUpdate = waitForEvent(creator, "code:sync");
  const update = await request(teammate, "code:change", { code: "const answer = 42;" });
  assert.equal(update.ok, true);
  assert.deepEqual(await syncedUpdate, {
    code: "const answer = 42;",
    updatedBy: "Lin",
  });
  await assert.rejects(isolatedUpdate, /Timed out waiting/);
  assert.equal(server.roomManager.snapshot(created.roomId).code, "const answer = 42;");
  assert.equal(server.roomManager.snapshot(secondRoom.roomId).code, created.code);

  const unauthorizedUpdate = await request(outsider, "code:change", { code: "unauthorized" });
  assert.equal(unauthorizedUpdate.ok, false);

  const usersUpdate = waitForEvent(creator, "room:users");
  teammate.disconnect();
  clients.delete(teammate);
  const remainingUsers = await usersUpdate;
  assert.deepEqual(remainingUsers.users.map((user) => user.displayName), ["Ada"]);
});
