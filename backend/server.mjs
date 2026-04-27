import cors from "cors";
import express from "express";
import {
  authResponse,
  deleteSession,
  getSession,
  loginUser,
  registerUser,
} from "./auth.mjs";
import { JsonStore } from "./store.mjs";

function legacyResponse(method, data) {
  return {
    object: "users",
    method,
    data,
  };
}

function sendError(res, error) {
  const status = error.status || 500;
  res.status(status).json({
    error: {
      code: error.code || "internalError",
      message: error.message || "Internal server error",
    },
  });
}

export function createServer({
  dataFile = new URL("../data/dev-db.json", import.meta.url),
  serveStatic = process.env.SERVE_STATIC !== "false",
} = {}) {
  const app = express();
  const staticRoot = new URL("../", import.meta.url);
  const store = new JsonStore(dataFile);

  async function handleLegacyCommand(command) {
    if (!command || command.object !== "users") {
      const error = new Error("Unsupported command");
      error.status = 400;
      error.code = "unsupportedCommand";
      throw error;
    }

    if (command.method === "create") {
      const { session, user } = await registerUser(store, command.data || {});
      return legacyResponse("createSuccess", authResponse(session, user));
    }

    if (command.method === "login") {
      const { session, user } = await loginUser(store, command.data || {});
      return legacyResponse("loggedIn", authResponse(session, user));
    }

    if (command.method === "verifyBySessionId") {
      const result = await getSession(store, command.data?.sessionId);
      if (!result) return legacyResponse("missingVariables", { id: "login" });
      return legacyResponse("sessionVerified", authResponse(result.session, result.user));
    }

    const error = new Error(`Unsupported users method: ${command.method}`);
    error.status = 400;
    error.code = "unsupportedCommand";
    throw error;
  }

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "nicetraders-dev-api" });
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { session, user } = await registerUser(store, req.body || {});
      res.status(201).json(authResponse(session, user));
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { session, user } = await loginUser(store, req.body || {});
      res.json(authResponse(session, user));
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const auth = req.get("authorization") || "";
      const sessionId = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : req.query.sessionId;
      const result = await getSession(store, sessionId);
      if (!result) {
        const error = new Error("Invalid or expired session");
        error.status = 401;
        error.code = "invalidSession";
        throw error;
      }
      res.json(authResponse(result.session, result.user));
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    const sessionId = req.body?.sessionId || req.query.sessionId;
    await deleteSession(store, sessionId);
    res.status(204).end();
  });

  app.all("/q", async (req, res) => {
    try {
      const rawCommand = req.query.command || req.body?.command;
      if (!rawCommand) {
        const error = new Error("Missing command");
        error.status = 400;
        error.code = "missingVariables";
        throw error;
      }
      const command = typeof rawCommand === "string" ? JSON.parse(rawCommand) : rawCommand;
      res.json(await handleLegacyCommand(command));
    } catch (error) {
      if (error instanceof SyntaxError) {
        error.status = 400;
        error.code = "invalidJson";
      }
      sendError(res, error);
    }
  });

  if (serveStatic) {
    app.use(express.static(staticRoot.pathname, { extensions: ["html"], index: "index.html" }));

    app.use((req, res, next) => {
      if (req.method !== "GET" || req.path.includes(".")) return next();
      res.sendFile(new URL(`../${req.path.replace(/^\/+/, "")}.html`, import.meta.url).pathname, (error) => {
        if (error) res.status(404).sendFile(new URL("../404.html", import.meta.url).pathname);
      });
    });
  }

  app.locals.store = store;
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 8080);
  const app = createServer({
    dataFile: process.env.DATA_FILE || new URL("../data/dev-db.json", import.meta.url),
  });
  app.listen(port, () => {
    console.log(`NICE Traders dev environment running at http://127.0.0.1:${port}`);
    console.log(`Auth API and legacy /q endpoint are using ${app.locals.store.filePath}`);
  });
}
