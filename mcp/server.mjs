/**
 * Nitraders MCP Server
 *
 * Exposes the Nitraders.net backend (user registration, authentication,
 * session management) as a Model Context Protocol server.
 *
 * Transports:
 *   --stdio   (default) – for local process-based integrations (e.g. Claude Desktop)
 *   --http    – Streamable HTTP on PORT (default 3100) for remote clients
 *
 * Usage:
 *   node mcp/server.mjs              # stdio
 *   node mcp/server.mjs --stdio      # stdio (explicit)
 *   node mcp/server.mjs --http       # HTTP on port 3100
 *   PORT=4000 node mcp/server.mjs --http
 *   DATA_FILE=./data/dev-db.json node mcp/server.mjs
 */

import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { fileURLToPath } from "node:url";
import {
  authResponse,
  deleteSession,
  getSession,
  getUserById,
  listSessions,
  listUsers,
  loginUser,
  publicUser,
  registerUser,
} from "../backend/auth.mjs";
import { JsonStore } from "../backend/store.mjs";

// ---------------------------------------------------------------------------
// Server factory
// ---------------------------------------------------------------------------

export function createMcpServer(store) {
  const server = new McpServer({
    name: "nitraders-backend",
    version: "1.0.0",
    description: "Nitraders.net backend MCP server – user auth and session management",
  });

  // -------------------------------------------------------------------------
  // Resources – read-only data surfaces
  // -------------------------------------------------------------------------

  server.registerResource(
    "users",
    "nitraders://users",
    {
      title: "All Users",
      description: "List of all registered users (public fields only, no passwords)",
      mimeType: "application/json",
    },
    async () => {
      const users = await listUsers(store);
      return {
        contents: [
          {
            uri: "nitraders://users",
            mimeType: "application/json",
            text: JSON.stringify(users, null, 2),
          },
        ],
      };
    },
  );

  server.registerResource(
    "sessions",
    "nitraders://sessions",
    {
      title: "Active Sessions",
      description: "All currently active (non-expired) sessions",
      mimeType: "application/json",
    },
    async () => {
      const sessions = await listSessions(store);
      return {
        contents: [
          {
            uri: "nitraders://sessions",
            mimeType: "application/json",
            text: JSON.stringify(sessions, null, 2),
          },
        ],
      };
    },
  );

  server.registerResource(
    "health",
    "nitraders://health",
    {
      title: "Service Health",
      description: "Basic health check for the Nitraders backend",
      mimeType: "application/json",
    },
    async () => {
      const db = await store.read();
      const userCount = Object.keys(db.users).length;
      const sessionCount = Object.values(db.sessions).filter(
        (s) => new Date(s.expiresAt).getTime() > Date.now(),
      ).length;
      return {
        contents: [
          {
            uri: "nitraders://health",
            mimeType: "application/json",
            text: JSON.stringify(
              {
                ok: true,
                service: "nitraders-mcp",
                dataFile: store.filePath,
                userCount,
                activeSessionCount: sessionCount,
                timestamp: new Date().toISOString(),
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // -------------------------------------------------------------------------
  // Tools – actions the LLM can ask the server to perform
  // -------------------------------------------------------------------------

  server.registerTool(
    "register",
    {
      title: "Register User",
      description:
        "Create a new user account. Returns the new user's public profile and a session ID.",
      inputSchema: z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().optional().default(""),
        email: z.string().email("Must be a valid email address"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        phone: z.string().optional().default(""),
        address1: z.string().optional().default(""),
        address2: z.string().optional().default(""),
        city: z.string().optional().default(""),
        state: z.string().optional().default(""),
        zip: z.string().optional().default(""),
        country: z.string().optional().default(""),
        affiliateId: z.string().optional().default(""),
      }),
    },
    async (input) => {
      try {
        const { session, user } = await registerUser(store, input);
        const result = authResponse(session, user);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error (${err.code ?? "error"}): ${err.message}` }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "login",
    {
      title: "Login",
      description:
        "Authenticate with email and password. Returns the user's public profile and a session ID on success.",
      inputSchema: z.object({
        email: z.string().email("Must be a valid email address"),
        password: z.string().min(1, "Password is required"),
      }),
    },
    async ({ email, password }) => {
      try {
        const { session, user } = await loginUser(store, { email, password });
        const result = authResponse(session, user);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error (${err.code ?? "error"}): ${err.message}` }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "verify_session",
    {
      title: "Verify Session",
      description:
        "Check whether a session ID is valid and return the associated user. Returns an error if the session is missing or expired.",
      inputSchema: z.object({
        sessionId: z.string().min(1, "sessionId is required"),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ sessionId }) => {
      const result = await getSession(store, sessionId);
      if (!result) {
        return {
          content: [{ type: "text", text: "Error (invalidSession): Session not found or expired" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(authResponse(result.session, result.user), null, 2) }],
      };
    },
  );

  server.registerTool(
    "logout",
    {
      title: "Logout",
      description: "Invalidate a session by its ID.",
      inputSchema: z.object({
        sessionId: z.string().min(1, "sessionId is required"),
      }),
    },
    async ({ sessionId }) => {
      await deleteSession(store, sessionId);
      return {
        content: [{ type: "text", text: `Session ${sessionId} has been invalidated.` }],
      };
    },
  );

  server.registerTool(
    "get_user",
    {
      title: "Get User",
      description: "Retrieve the public profile of a specific user by their user ID.",
      inputSchema: z.object({
        userId: z.string().min(1, "userId is required"),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ userId }) => {
      const user = await getUserById(store, userId);
      if (!user) {
        return {
          content: [{ type: "text", text: `Error (notFound): No user found with id ${userId}` }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(user, null, 2) }],
      };
    },
  );

  server.registerTool(
    "list_users",
    {
      title: "List Users",
      description: "Return the public profile of every registered user. Passwords are never included.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async () => {
      const users = await listUsers(store);
      return {
        content: [{ type: "text", text: JSON.stringify(users, null, 2) }],
      };
    },
  );

  server.registerTool(
    "list_sessions",
    {
      title: "List Active Sessions",
      description: "Return all currently active (non-expired) sessions.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async () => {
      const sessions = await listSessions(store);
      return {
        content: [{ type: "text", text: JSON.stringify(sessions, null, 2) }],
      };
    },
  );

  return server;
}

// ---------------------------------------------------------------------------
// Entry-point – decide transport from CLI args
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const useHttp = args.includes("--http");
  const useStdio = !useHttp || args.includes("--stdio");

  const dataFile = process.env.DATA_FILE
    ? process.env.DATA_FILE
    : new URL("../data/dev-db.json", import.meta.url);

  const store = new JsonStore(dataFile);

  if (useHttp) {
    // Streamable HTTP transport – one MCP session per HTTP request (stateless).
    const port = Number(process.env.MCP_PORT || process.env.PORT || 3100);
    const app = express();
    app.use(express.json());

    app.post("/mcp", async (req, res) => {
      const mcpServer = createMcpServer(store);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless
      });
      res.on("close", () => transport.close());
      await mcpServer.connect(transport);
      await transport.handleRequest(req, res, req.body);
    });

    app.get("/health", (_req, res) => {
      res.json({ ok: true, service: "nitraders-mcp", transport: "streamable-http" });
    });

    app.listen(port, () => {
      console.error(`Nitraders MCP server (Streamable HTTP) listening on http://127.0.0.1:${port}/mcp`);
      console.error(`Data file: ${store.filePath}`);
    });
  } else {
    // stdio transport – default for local / Claude Desktop integration
    const mcpServer = createMcpServer(store);
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.error("Nitraders MCP server running on stdio");
    console.error(`Data file: ${store.filePath}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("Fatal MCP server error:", err);
    process.exit(1);
  });
}
