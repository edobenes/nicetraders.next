import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "../backend/server.mjs";

let tempDir;
let server;
let baseUrl;

before(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), "nicetraders-auth-"));
  const app = createServer({ dataFile: path.join(tempDir, "db.json"), serveStatic: false });
  server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await rm(tempDir, { recursive: true, force: true });
});

test("registers, logs in, and verifies a user through REST auth endpoints", async () => {
  const email = `auth-${Date.now()}@example.com`;
  const password = "TestPass123!";

  const register = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ firstName: "Cursor", lastName: "Tester", email, password }),
  });

  assert.equal(register.status, 201);
  const registered = await register.json();
  assert.ok(registered.sessionId);
  assert.equal(registered.user.email, email);
  assert.equal(registered.user.passwordHash, undefined);

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  assert.equal(login.status, 200);
  const loggedIn = await login.json();
  assert.ok(loggedIn.sessionId);

  const me = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { authorization: `Bearer ${loggedIn.sessionId}` },
  });

  assert.equal(me.status, 200);
  const profile = await me.json();
  assert.equal(profile.user.email, email);
});

test("rejects duplicate registration, bad login, and invalid sessions without leaking password hashes", async () => {
  const email = `negative-${Date.now()}@example.com`;
  const password = "TestPass123!";
  const registerBody = { firstName: "Negative", lastName: "Tester", email, password };

  const firstRegister = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(registerBody),
  });
  assert.equal(firstRegister.status, 201);
  assert.equal((await firstRegister.json()).user.passwordHash, undefined);

  const duplicate = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(registerBody),
  });
  assert.equal(duplicate.status, 409);
  assert.equal((await duplicate.json()).error.code, "duplicateEmail");

  const badLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "wrong-password" }),
  });
  assert.equal(badLogin.status, 401);
  assert.equal((await badLogin.json()).error.code, "invalidCredentials");

  const invalidSession = await fetch(`${baseUrl}/api/auth/me?sessionId=missing`);
  assert.equal(invalidSession.status, 401);
  assert.equal((await invalidSession.json()).error.code, "invalidSession");

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(login.status, 200);
  assert.ok((await login.json()).sessionId);
});

test("persists users with hashed passwords and supports logout", async () => {
  const email = `persist-${Date.now()}@example.com`;
  const password = "TestPass123!";
  const register = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ firstName: "Persist", email, password }),
  });
  assert.equal(register.status, 201);
  const registered = await register.json();

  const db = JSON.parse(await readFile(path.join(tempDir, "db.json"), "utf8"));
  const userId = db.emailIndex[email];
  assert.ok(userId);
  assert.notEqual(db.users[userId].passwordHash, password);
  assert.match(db.users[userId].passwordHash, /^[0-9a-f]+:[0-9a-f]+$/);

  const logout = await fetch(`${baseUrl}/api/auth/logout`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId: registered.sessionId }),
  });
  assert.equal(logout.status, 204);

  const me = await fetch(`${baseUrl}/api/auth/me?sessionId=${registered.sessionId}`);
  assert.equal(me.status, 401);
});

test("supports the exported frontend legacy /q auth contract", async () => {
  const email = `legacy-${Date.now()}@example.com`;
  const password = "TestPass123!";
  const createCommand = {
    object: "users",
    method: "create",
    data: { firstName: "Legacy", lastName: "Tester", email, password },
  };

  const create = await fetch(`${baseUrl}/q?command=${encodeURIComponent(JSON.stringify(createCommand))}`);
  assert.equal(create.status, 200);
  const created = await create.json();
  assert.equal(created.method, "createSuccess");
  assert.ok(created.data.sessionId);

  const loginCommand = {
    object: "users",
    method: "login",
    data: { email, password },
  };
  const login = await fetch(`${baseUrl}/q?command=${encodeURIComponent(JSON.stringify(loginCommand))}`);
  assert.equal(login.status, 200);
  const loggedIn = await login.json();
  assert.equal(loggedIn.method, "loggedIn");
  assert.ok(loggedIn.data.sessionId);

  const verifyCommand = {
    object: "users",
    method: "verifyBySessionId",
    data: { sessionId: loggedIn.data.sessionId },
  };
  const verify = await fetch(`${baseUrl}/q?command=${encodeURIComponent(JSON.stringify(verifyCommand))}`);
  assert.equal(verify.status, 200);
  const verified = await verify.json();
  assert.equal(verified.method, "sessionVerified");
  assert.equal(verified.data.user.email, email);
});

test("supports legacy admin login and session verification commands", async () => {
  const email = `admin-${Date.now()}@example.com`;
  const password = "TestPass123!";
  const createCommand = {
    object: "users",
    method: "create",
    data: { firstName: "Admin", lastName: "Tester", email, password },
  };

  const create = await fetch(`${baseUrl}/q?command=${encodeURIComponent(JSON.stringify(createCommand))}`);
  assert.equal(create.status, 200);
  assert.ok((await create.json()).data.sessionId);

  const loginCommand = {
    object: "admin",
    method: "login",
    data: { email, password },
  };
  const login = await fetch(`${baseUrl}/q?command=${encodeURIComponent(JSON.stringify(loginCommand))}`);
  assert.equal(login.status, 200);
  const loggedIn = await login.json();
  assert.equal(loggedIn.object, "admin");
  assert.equal(loggedIn.method, "loggedIn");
  assert.ok(loggedIn.data.sessionId);

  const verifyCommand = {
    object: "admin",
    method: "verifyAdminSession",
    data: { sessionId: loggedIn.data.sessionId },
  };
  const verify = await fetch(`${baseUrl}/q?command=${encodeURIComponent(JSON.stringify(verifyCommand))}`);
  assert.equal(verify.status, 200);
  const verified = await verify.json();
  assert.equal(verified.object, "admin");
  assert.equal(verified.method, "sessionVerified");
  assert.equal(verified.data.user.email, email);
});
