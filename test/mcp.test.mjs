/**
 * MCP Server Test Suite – Nitraders backend
 *
 * Validates that the MCP server correctly exposes the Nitraders backend for
 * LLM-assisted development in Cursor AI.  Every test talks to the MCP server
 * via raw JSON-RPC (Streamable HTTP transport) – exactly as an AI agent would.
 *
 * Test groups:
 *  1. Protocol handshake – initialize, tools/list, resources/list
 *  2. Tools – happy-path for every registered tool
 *  3. Tools – error / validation paths
 *  4. Resources – read all three resources
 *  5. Developer workflow – realistic multi-step scenarios that show MCP value
 *     in Cursor AI (feature scaffolding, session lifecycle, user exploration)
 */

import assert from "node:assert/strict";
import express from "express";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "../mcp/server.mjs";
import { JsonStore } from "../backend/store.mjs";

// ---------------------------------------------------------------------------
// Test infrastructure
// ---------------------------------------------------------------------------

let baseUrl;
let httpServer;
let tempDir;

/**
 * Send a single MCP JSON-RPC request and return the parsed SSE data payload.
 */
async function mcp(method, params = {}, id = 1) {
  const response = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });

  const raw = await response.text();

  // Streamable HTTP returns SSE lines; extract the first "data:" line.
  const dataLine = raw
    .split("\n")
    .find((line) => line.startsWith("data:"));

  if (!dataLine) {
    throw new Error(`No data line in MCP response:\n${raw}`);
  }

  return JSON.parse(dataLine.slice("data:".length).trim());
}

/**
 * Convenience: call a tool and return the parsed result object.
 * Throws if the response carries a JSON-RPC error.
 */
async function callTool(name, args = {}, id = 1) {
  const envelope = await mcp("tools/call", { name, arguments: args }, id);
  if (envelope.error) throw new Error(`JSON-RPC error: ${JSON.stringify(envelope.error)}`);
  return envelope.result;
}

/**
 * Extract the first text content item from a tool result as a parsed object.
 * MCP tools return { content: [{ type: "text", text: "<json>" }] }
 */
function parseToolJson(result) {
  const item = result.content?.find((c) => c.type === "text");
  if (!item) throw new Error(`No text content in result: ${JSON.stringify(result)}`);
  return JSON.parse(item.text);
}

/**
 * Read a resource and return the parsed JSON content of the first content item.
 */
async function readResource(uri, id = 1) {
  const envelope = await mcp("resources/read", { uri }, id);
  if (envelope.error) throw new Error(`JSON-RPC error: ${JSON.stringify(envelope.error)}`);
  const text = envelope.result?.contents?.[0]?.text;
  return JSON.parse(text);
}

// ---------------------------------------------------------------------------
// Suite lifecycle
// ---------------------------------------------------------------------------

before(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), "nitraders-mcp-test-"));
  const store = new JsonStore(path.join(tempDir, "db.json"));

  const app = express();
  app.use(express.json());

  // Each request gets its own stateless MCP session (mirrors production usage)
  app.post("/mcp", async (req, res) => {
    const mcpServer = createMcpServer(store);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => transport.close());
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.get("/health", (_req, res) => res.json({ ok: true }));

  httpServer = await new Promise((resolve) => {
    const srv = app.listen(0, "127.0.0.1", () => resolve(srv));
  });

  const { port } = httpServer.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise((resolve, reject) =>
    httpServer.close((err) => (err ? reject(err) : resolve())),
  );
  await rm(tempDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// 1. Protocol handshake
// ---------------------------------------------------------------------------

describe("MCP protocol handshake", () => {
  test("initialize returns correct server info and capabilities", async () => {
    const envelope = await mcp("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "cursor-test", version: "1.0.0" },
    });

    assert.ok(envelope.result, "Should have a result");
    assert.equal(envelope.result.serverInfo.name, "nitraders-backend");
    assert.equal(envelope.result.serverInfo.version, "1.0.0");
    assert.ok(envelope.result.capabilities.tools, "Should advertise tools capability");
    assert.ok(envelope.result.capabilities.resources, "Should advertise resources capability");
  });

  test("tools/list returns all 7 registered tools with JSON Schema", async () => {
    const envelope = await mcp("tools/list", {});
    const tools = envelope.result.tools;
    const names = tools.map((t) => t.name);

    const expected = [
      "register",
      "login",
      "verify_session",
      "logout",
      "get_user",
      "list_users",
      "list_sessions",
    ];

    for (const name of expected) {
      assert.ok(names.includes(name), `tools/list should include '${name}'`);
    }

    // Each tool must carry an inputSchema (JSON Schema object)
    for (const tool of tools) {
      assert.equal(
        typeof tool.inputSchema,
        "object",
        `Tool '${tool.name}' should have an inputSchema`,
      );
    }
  });

  test("resources/list returns all 3 registered resources with URIs", async () => {
    const envelope = await mcp("resources/list", {});
    const resources = envelope.result.resources;
    const uris = resources.map((r) => r.uri);

    assert.ok(uris.includes("nitraders://users"), "Should list nitraders://users");
    assert.ok(uris.includes("nitraders://sessions"), "Should list nitraders://sessions");
    assert.ok(uris.includes("nitraders://health"), "Should list nitraders://health");
  });
});

// ---------------------------------------------------------------------------
// 2. Tools – happy paths
// ---------------------------------------------------------------------------

describe("Tools – happy paths", () => {
  // Shared state across the happy-path tests (simulates a Cursor AI session)
  let aliceSessionId;
  let aliceUserId;

  test("register – creates a new user and returns sessionId + public profile", async () => {
    const result = await callTool("register", {
      firstName: "Alice",
      lastName: "Trader",
      email: "alice@nitraders.test",
      password: "SuperSecret99!",
      country: "US",
      affiliateId: "AFF001",
    });

    const data = parseToolJson(result);
    assert.ok(data.sessionId, "Should return a sessionId");
    assert.ok(data.user.id, "Should return user.id");
    assert.equal(data.user.firstName, "Alice");
    assert.equal(data.user.lastName, "Trader");
    assert.equal(data.user.email, "alice@nitraders.test");
    assert.equal(data.user.country, "US");
    assert.equal(data.user.affiliateId, "AFF001");
    assert.equal(data.user.passwordHash, undefined, "passwordHash must never appear in MCP output");

    aliceSessionId = data.sessionId;
    aliceUserId = data.user.id;
  });

  test("login – returns new sessionId for valid credentials", async () => {
    const result = await callTool("login", {
      email: "alice@nitraders.test",
      password: "SuperSecret99!",
    });

    const data = parseToolJson(result);
    assert.ok(data.sessionId, "Should return a sessionId");
    assert.equal(data.user.email, "alice@nitraders.test");
    assert.equal(data.user.passwordHash, undefined, "passwordHash must never appear");

    // Update to the freshest session for subsequent tests
    aliceSessionId = data.sessionId;
  });

  test("verify_session – validates a live session and returns user", async () => {
    const result = await callTool("verify_session", { sessionId: aliceSessionId });
    const data = parseToolJson(result);

    assert.equal(data.sessionId, aliceSessionId);
    assert.equal(data.user.email, "alice@nitraders.test");
  });

  test("get_user – retrieves public profile by user ID", async () => {
    const result = await callTool("get_user", { userId: aliceUserId });
    const data = parseToolJson(result);

    assert.equal(data.id, aliceUserId);
    assert.equal(data.email, "alice@nitraders.test");
    assert.equal(data.passwordHash, undefined, "passwordHash must never appear");
  });

  test("list_users – returns array with at least the registered user", async () => {
    const result = await callTool("list_users");
    const users = parseToolJson(result);

    assert.ok(Array.isArray(users), "Should return an array");
    const alice = users.find((u) => u.email === "alice@nitraders.test");
    assert.ok(alice, "Alice should appear in list");
    assert.equal(alice.passwordHash, undefined, "passwordHash must never appear");
  });

  test("list_sessions – returns active sessions including Alice's", async () => {
    const result = await callTool("list_sessions");
    const sessions = parseToolJson(result);

    assert.ok(Array.isArray(sessions), "Should return an array");
    const found = sessions.find((s) => s.id === aliceSessionId);
    assert.ok(found, "Alice's session should appear");
    assert.ok(found.expiresAt, "Session should have expiresAt");
  });

  test("logout – invalidates the session", async () => {
    const result = await callTool("logout", { sessionId: aliceSessionId });
    assert.ok(
      result.content[0].text.includes(aliceSessionId),
      "Logout response should mention the session ID",
    );
  });

  test("verify_session – returns isError after logout", async () => {
    const result = await callTool("verify_session", { sessionId: aliceSessionId });
    assert.equal(result.isError, true, "Should be an error result after logout");
    assert.ok(
      result.content[0].text.includes("invalidSession"),
      "Error code should be invalidSession",
    );
  });
});

// ---------------------------------------------------------------------------
// 3. Tools – error / validation paths
// ---------------------------------------------------------------------------

describe("Tools – error and validation paths", () => {
  const email = `error-test-${Date.now()}@nitraders.test`;

  test("register – rejects missing required fields", async () => {
    // No firstName, no password
    const result = await callTool("register", { email: "nofirstname@nitraders.test" });
    assert.equal(result.isError, true, "Should error on missing firstName/password");
  });

  test("register – rejects short passwords (< 6 chars) via Zod schema", async () => {
    const result = await callTool("register", {
      firstName: "Short",
      email: "shortpw@nitraders.test",
      password: "abc",
    });
    // Zod schema validation fires before business logic
    assert.equal(result.isError, true, "Should error on password < 6 chars");
  });

  test("register – succeeds to set up for duplicate test", async () => {
    const result = await callTool("register", {
      firstName: "Error",
      lastName: "Tester",
      email,
      password: "ValidPass99!",
    });
    const data = parseToolJson(result);
    assert.ok(data.sessionId);
  });

  test("register – rejects duplicate email", async () => {
    const result = await callTool("register", {
      firstName: "Dup",
      email,
      password: "ValidPass99!",
    });
    assert.equal(result.isError, true);
    assert.ok(result.content[0].text.includes("duplicateEmail"));
  });

  test("login – rejects wrong password", async () => {
    const result = await callTool("login", { email, password: "wrongpassword" });
    assert.equal(result.isError, true);
    assert.ok(result.content[0].text.includes("invalidCredentials"));
  });

  test("login – rejects unknown email", async () => {
    const result = await callTool("login", {
      email: "nobody@nitraders.test",
      password: "anything",
    });
    assert.equal(result.isError, true);
    assert.ok(result.content[0].text.includes("invalidCredentials"));
  });

  test("get_user – returns isError for unknown user ID", async () => {
    const result = await callTool("get_user", { userId: "user_doesnotexist" });
    assert.equal(result.isError, true);
    assert.ok(result.content[0].text.includes("notFound"));
  });

  test("verify_session – returns isError for fabricated session ID", async () => {
    const result = await callTool("verify_session", { sessionId: "sess_totally_fake" });
    assert.equal(result.isError, true);
    assert.ok(result.content[0].text.includes("invalidSession"));
  });
});

// ---------------------------------------------------------------------------
// 4. Resources
// ---------------------------------------------------------------------------

describe("Resources – read", () => {
  test("nitraders://health – returns ok=true with service stats", async () => {
    const health = await readResource("nitraders://health");
    assert.equal(health.ok, true);
    assert.equal(health.service, "nitraders-mcp");
    assert.ok(typeof health.userCount === "number", "Should report userCount");
    assert.ok(typeof health.activeSessionCount === "number", "Should report activeSessionCount");
    assert.ok(health.timestamp, "Should report a timestamp");
    assert.ok(health.dataFile, "Should report the dataFile path");
  });

  test("nitraders://users – returns array of public user objects (no passwordHash)", async () => {
    const users = await readResource("nitraders://users");
    assert.ok(Array.isArray(users), "users resource should be an array");
    for (const user of users) {
      assert.equal(user.passwordHash, undefined, "passwordHash must never appear in resource");
      assert.ok(user.id, "Each user should have an id");
      assert.ok(user.email, "Each user should have an email");
    }
  });

  test("nitraders://sessions – returns array of active session objects", async () => {
    const sessions = await readResource("nitraders://sessions");
    assert.ok(Array.isArray(sessions), "sessions resource should be an array");
    for (const session of sessions) {
      assert.ok(session.id, "Each session should have an id");
      assert.ok(session.userId, "Each session should have a userId");
      assert.ok(session.expiresAt, "Each session should have expiresAt");
    }
  });

  test("nitraders://health – userCount reflects registered users", async () => {
    // Register a new user so we can assert count increases
    const before = await readResource("nitraders://health");
    await callTool("register", {
      firstName: "CountCheck",
      email: `count-${Date.now()}@nitraders.test`,
      password: "CountPass1!",
    });
    const after = await readResource("nitraders://health");
    assert.equal(
      after.userCount,
      before.userCount + 1,
      "Health userCount should increment after registration",
    );
  });
});

// ---------------------------------------------------------------------------
// 5. Developer workflow scenarios
//    These tests demonstrate the concrete value of the MCP server for
//    AI-assisted development in Cursor: an LLM can use these tools to
//    scaffold users, validate auth flows, and inspect state without
//    manually crafting HTTP calls or reading raw JSON files.
// ---------------------------------------------------------------------------

describe("Developer workflow – Cursor AI integration scenarios", () => {
  test("Scenario: scaffold a test user and immediately verify their session (rapid feature setup)", async () => {
    // An AI agent working on a new dashboard feature can register a fresh test
    // user and verify the session is valid in two tool calls – no manual curl
    // or DB inspection needed.
    const regResult = await callTool("register", {
      firstName: "Dashboard",
      lastName: "Dev",
      email: `dash-dev-${Date.now()}@nitraders.test`,
      password: "DashDev99!",
      affiliateId: "DEV_TEAM",
    });
    const { sessionId, user } = parseToolJson(regResult);
    assert.ok(sessionId, "Step 1: Should get a sessionId after registration");
    assert.equal(user.affiliateId, "DEV_TEAM", "Custom fields should be stored");

    // Step 2: verify the session is live (simulates what the frontend does)
    const verifyResult = await callTool("verify_session", { sessionId });
    const verified = parseToolJson(verifyResult);
    assert.equal(verified.user.email, user.email, "Verified session should match registered user");
    assert.equal(verified.user.passwordHash, undefined, "No password leakage through MCP");
  });

  test("Scenario: full auth lifecycle for a new feature (register → login → verify → logout → verify rejected)", async () => {
    // Mirrors the full frontend auth flow end-to-end.  An AI agent testing a
    // new login feature can replay this lifecycle via MCP tool calls.
    const email = `lifecycle-${Date.now()}@nitraders.test`;
    const password = "Lifecycle99!";

    const reg = parseToolJson(await callTool("register", { firstName: "Life", email, password }));
    assert.ok(reg.sessionId, "Registration session");

    // Log in with a fresh session
    const login = parseToolJson(await callTool("login", { email, password }));
    assert.ok(login.sessionId, "Login session");
    assert.notEqual(login.sessionId, reg.sessionId, "Login returns a NEW session");

    // Both sessions should be active
    const sessions = parseToolJson(await callTool("list_sessions"));
    const ids = sessions.map((s) => s.id);
    assert.ok(ids.includes(reg.sessionId), "Registration session should still be active");
    assert.ok(ids.includes(login.sessionId), "Login session should be active");

    // Logout the login session
    await callTool("logout", { sessionId: login.sessionId });

    // Login session gone; reg session still alive
    const afterLogout = parseToolJson(await callTool("list_sessions"));
    const afterIds = afterLogout.map((s) => s.id);
    assert.ok(!afterIds.includes(login.sessionId), "Logged-out session should be gone");
    assert.ok(afterIds.includes(reg.sessionId), "Other session should persist");

    // Verify the dead session is rejected
    const dead = await callTool("verify_session", { sessionId: login.sessionId });
    assert.equal(dead.isError, true, "Dead session must be rejected");
  });

  test("Scenario: enumerate users and sessions to inspect backend state (AI-assisted debugging)", async () => {
    // An AI agent debugging a user-count discrepancy can use list_users and
    // the health resource to cross-check state without touching the DB file.
    const usersBefore = parseToolJson(await callTool("list_users"));
    const healthBefore = await readResource("nitraders://health");

    assert.equal(
      usersBefore.length,
      healthBefore.userCount,
      "list_users count should match health.userCount",
    );

    // Register another user and confirm both sources agree
    await callTool("register", {
      firstName: "Debug",
      email: `debug-${Date.now()}@nitraders.test`,
      password: "DebugPass1!",
    });

    const usersAfter = parseToolJson(await callTool("list_users"));
    const healthAfter = await readResource("nitraders://health");

    assert.equal(
      usersAfter.length,
      healthAfter.userCount,
      "list_users and health.userCount should stay in sync after registration",
    );
    assert.equal(usersAfter.length, usersBefore.length + 1, "User count should increment by 1");

    // Confirm no user object leaks a passwordHash
    for (const u of usersAfter) {
      assert.equal(u.passwordHash, undefined, `User ${u.email} must not leak passwordHash`);
    }
  });

  test("Scenario: multi-user environment – two users, independent sessions (team development)", async () => {
    // Simulates an AI agent helping develop a feature that requires multiple
    // concurrent authenticated users (e.g. a trading pair dashboard).
    const ts = Date.now();
    const userA = { email: `user-a-${ts}@nitraders.test`, password: "PassA123!" };
    const userB = { email: `user-b-${ts}@nitraders.test`, password: "PassB123!" };

    const regA = parseToolJson(await callTool("register", { firstName: "UserA", ...userA }));
    const regB = parseToolJson(await callTool("register", { firstName: "UserB", ...userB }));

    assert.notEqual(regA.user.id, regB.user.id, "Two distinct user IDs");
    assert.notEqual(regA.sessionId, regB.sessionId, "Two distinct session IDs");

    // Verify both sessions independently
    const verA = parseToolJson(await callTool("verify_session", { sessionId: regA.sessionId }));
    const verB = parseToolJson(await callTool("verify_session", { sessionId: regB.sessionId }));

    assert.equal(verA.user.email, userA.email);
    assert.equal(verB.user.email, userB.email);

    // Logging out A must not affect B
    await callTool("logout", { sessionId: regA.sessionId });

    const verADead = await callTool("verify_session", { sessionId: regA.sessionId });
    const verBAlive = parseToolJson(await callTool("verify_session", { sessionId: regB.sessionId }));

    assert.equal(verADead.isError, true, "User A session should be dead");
    assert.equal(verBAlive.user.email, userB.email, "User B session should still be alive");
  });
});
