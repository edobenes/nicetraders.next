import cors from "cors";
import express from "express";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { JsonStore } from "./store.mjs";

const scrypt = promisify(scryptCallback);

function publicUser(user) {
  return {
    id: user.id,
    userId: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    address1: user.address1,
    address2: user.address2,
    city: user.city,
    state: user.state,
    zip: user.zip,
    country: user.country,
    affiliateId: user.affiliateId,
    createdAt: user.createdAt,
  };
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function requireFields(data, fields) {
  const missing = fields.filter((field) => !String(data[field] || "").trim());
  if (missing.length) {
    const error = new Error(`Missing required field(s): ${missing.join(", ")}`);
    error.status = 400;
    error.code = "missingVariables";
    throw error;
  }
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(String(password), salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash || "").split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = await scrypt(String(password), salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function newId(prefix, value = randomBytes(18).toString("hex")) {
  return `${prefix}_${createHash("sha256").update(`${Date.now()}:${value}`).digest("hex").slice(0, 24)}`;
}

function authResponse(session, user) {
  return {
    sessionId: session.id,
    user: publicUser(user),
  };
}

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

  async function createSession(userId) {
    const session = {
      id: newId("sess"),
      userId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    };
    await store.update((db) => {
      db.sessions[session.id] = session;
    });
    return session;
  }

  async function getSession(sessionId) {
    const db = await store.read();
    const session = db.sessions[String(sessionId || "")];
    if (!session || new Date(session.expiresAt).getTime() < Date.now()) return null;
    const user = db.users[session.userId];
    if (!user) return null;
    return { session, user };
  }

  async function registerUser(data) {
    requireFields(data, ["firstName", "email", "password"]);
    const email = normalizeEmail(data.email);
    const now = new Date().toISOString();
    const userId = newId("user", email);
    let createdUser;

    await store.update(async (db) => {
      if (db.emailIndex[email]) {
        const error = new Error("A user with this email already exists");
        error.status = 409;
        error.code = "duplicateEmail";
        throw error;
      }
      createdUser = {
        id: userId,
        firstName: String(data.firstName || "").trim(),
        lastName: String(data.lastName || "").trim(),
        email,
        phone: String(data.phone || "").trim(),
        address1: String(data.address1 || "").trim(),
        address2: String(data.address2 || "").trim(),
        city: String(data.city || "").trim(),
        state: String(data.state || "").trim(),
        zip: String(data.zip || "").trim(),
        country: String(data.country || "").trim(),
        affiliateId: String(data.affiliateId || "").trim(),
        passwordHash: await hashPassword(data.password),
        createdAt: now,
        updatedAt: now,
      };
      db.users[userId] = createdUser;
      db.emailIndex[email] = userId;
    });

    const session = await createSession(createdUser.id);
    return { session, user: createdUser };
  }

  async function loginUser(data) {
    requireFields(data, ["email", "password"]);
    const email = normalizeEmail(data.email);
    const db = await store.read();
    const user = db.users[db.emailIndex[email]];
    if (!user || !(await verifyPassword(data.password, user.passwordHash))) {
      const error = new Error("Invalid email or password");
      error.status = 401;
      error.code = "invalidCredentials";
      throw error;
    }
    const session = await createSession(user.id);
    return { session, user };
  }

  async function handleLegacyCommand(command) {
    if (!command || command.object !== "users") {
      const error = new Error("Unsupported command");
      error.status = 400;
      error.code = "unsupportedCommand";
      throw error;
    }

    if (command.method === "create") {
      const { session, user } = await registerUser(command.data || {});
      return legacyResponse("createSuccess", authResponse(session, user));
    }

    if (command.method === "login") {
      const { session, user } = await loginUser(command.data || {});
      return legacyResponse("loggedIn", authResponse(session, user));
    }

    if (command.method === "verifyBySessionId") {
      const result = await getSession(command.data?.sessionId);
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
      const { session, user } = await registerUser(req.body || {});
      res.status(201).json(authResponse(session, user));
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { session, user } = await loginUser(req.body || {});
      res.json(authResponse(session, user));
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const auth = req.get("authorization") || "";
      const sessionId = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : req.query.sessionId;
      const result = await getSession(sessionId);
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
    if (sessionId) {
      await store.update((db) => {
        delete db.sessions[sessionId];
      });
    }
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
