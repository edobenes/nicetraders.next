/**
 * Core authentication and session business logic shared by the Express API
 * server and the MCP server.  All functions accept a JsonStore instance so
 * they remain transport-agnostic.
 */
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

// ---------------------------------------------------------------------------
// Data-shape helpers
// ---------------------------------------------------------------------------

export function publicUser(user) {
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

export function authResponse(session, user) {
  return {
    sessionId: session.id,
    user: publicUser(user),
  };
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function requireFields(data, fields) {
  const missing = fields.filter((field) => !String(data[field] || "").trim());
  if (missing.length) {
    const error = new Error(`Missing required field(s): ${missing.join(", ")}`);
    error.status = 400;
    error.code = "missingVariables";
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Password helpers
// ---------------------------------------------------------------------------

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(String(password), salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash || "").split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = await scrypt(String(password), salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

export function newId(prefix, value = randomBytes(18).toString("hex")) {
  return `${prefix}_${createHash("sha256").update(`${Date.now()}:${value}`).digest("hex").slice(0, 24)}`;
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

export async function createSession(store, userId) {
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

export async function getSession(store, sessionId) {
  const db = await store.read();
  const session = db.sessions[String(sessionId || "")];
  if (!session || new Date(session.expiresAt).getTime() < Date.now()) return null;
  const user = db.users[session.userId];
  if (!user) return null;
  return { session, user };
}

export async function deleteSession(store, sessionId) {
  if (!sessionId) return;
  await store.update((db) => {
    delete db.sessions[String(sessionId)];
  });
}

// ---------------------------------------------------------------------------
// User management
// ---------------------------------------------------------------------------

export async function registerUser(store, data) {
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

  const session = await createSession(store, createdUser.id);
  return { session, user: createdUser };
}

export async function loginUser(store, data) {
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
  const session = await createSession(store, user.id);
  return { session, user };
}

export async function listUsers(store) {
  const db = await store.read();
  return Object.values(db.users).map(publicUser);
}

export async function getUserById(store, userId) {
  const db = await store.read();
  const user = db.users[String(userId || "")];
  if (!user) return null;
  return publicUser(user);
}

export async function listSessions(store) {
  const db = await store.read();
  const now = Date.now();
  return Object.values(db.sessions).filter(
    (s) => new Date(s.expiresAt).getTime() > now,
  );
}
