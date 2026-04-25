import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import puppeteer from "puppeteer-core";

const shouldStartServer = !process.env.E2E_BASE_URL;
let port = Number(process.env.E2E_PORT || 0);
let baseUrl = process.env.E2E_BASE_URL || "";
const chromePath = process.env.CHROME_BIN || "/usr/local/bin/google-chrome";
const artifactDir = process.env.E2E_ARTIFACT_DIR || "/opt/cursor/artifacts";
const stamp = Date.now();
const email = `cursor-e2e-${stamp}@example.com`;
const password = "TestPass123!";
let serverProcess;
let tempDir;

async function legacyCommand(command) {
  const response = await fetch(`${baseUrl}/q?command=${encodeURIComponent(JSON.stringify(command))}`);
  if (!response.ok) {
    throw new Error(`Legacy command failed with ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function sessionIdFromCookies(page) {
  const cookies = await page.cookies(baseUrl);
  return cookies.find((cookie) => cookie.name === "sessionId")?.value || "";
}

await mkdir(artifactDir, { recursive: true });

async function getFreePort() {
  if (port) return port;
  return await new Promise((resolve, reject) => {
    const server = createNetServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForHealth() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error(`Timed out waiting for ${baseUrl}/health`);
}

if (shouldStartServer) {
  port = await getFreePort();
  baseUrl = `http://127.0.0.1:${port}`;
  tempDir = await mkdtemp(path.join(tmpdir(), "nicetraders-e2e-"));
  serverProcess = spawn(process.execPath, ["backend/server.mjs"], {
    cwd: path.resolve(import.meta.dirname, ".."),
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      PORT: String(port),
      DATA_FILE: path.join(tempDir, "dev-db.json"),
    },
  });
  serverProcess.stdout.on("data", (chunk) => process.stdout.write(`[dev-server] ${chunk}`));
  serverProcess.stderr.on("data", (chunk) => process.stderr.write(`[dev-server] ${chunk}`));
  await waitForHealth();
}

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: process.env.HEADLESS === "false" ? false : "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const browserLogs = [];

  page.on("console", (message) => browserLogs.push(`${message.type()}: ${message.text()}`));
  page.on("pageerror", (error) => browserLogs.push(`pageerror: ${error.message}`));

  await page.deleteCookie(...(await page.cookies(baseUrl)));
  await page.goto(`${baseUrl}/register`, { waitUntil: "networkidle0" });
  await page.type("#register-firstName", "Cursor");
  await page.type("#register-lastName", "Backend");
  await page.type("#register-email", email);
  await page.type("#register-phone", "5551234567");
  await page.type("#register-password1", password);
  await page.type("#register-password2", password);
  await page.type("#register-address", "1 Test Way");
  await page.type("#register-city", "Austin");
  await page.type("#register-state", "TX");
  await page.type("#register-zip", "78701");
  await page.type("#register-country", "USA");
  const terms = await page.$("#register-checkbox");
  if (terms) await terms.click();
  await page.screenshot({ path: path.join(artifactDir, "auth_register_form.png"), fullPage: true });

  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0", timeout: 10000 }),
    page.click("#registerForm button[type='submit'], #registerForm button"),
  ]);
  if (!page.url().includes("/dashboard")) {
    throw new Error(`Expected dashboard after registration, got ${page.url()}; logs=${JSON.stringify(browserLogs)}`);
  }
  await page.waitForSelector(".card-content h5", { timeout: 10000 });
  await page.screenshot({ path: path.join(artifactDir, "auth_register_dashboard.png"), fullPage: true });
  const createResponse = await legacyCommand({
    object: "users",
    method: "verifyBySessionId",
    data: { sessionId: await sessionIdFromCookies(page) },
  });
  if (createResponse.method !== "sessionVerified" || createResponse.data.user.email !== email) {
    throw new Error(`Expected registered session to verify, got ${JSON.stringify(createResponse)}`);
  }

  await page.deleteCookie(...(await page.cookies(baseUrl)));
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle0" });
  await page.type("#emailInput", email);
  await page.type("#passwordInput", password);
  await page.screenshot({ path: path.join(artifactDir, "auth_login_form.png"), fullPage: true });

  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0", timeout: 10000 }),
    page.click("#loginForm button"),
  ]);
  if (!page.url().includes("/dashboard")) {
    throw new Error(`Expected dashboard after login, got ${page.url()}; logs=${JSON.stringify(browserLogs)}`);
  }
  await page.waitForSelector(".card-content h5", { timeout: 10000 });
  await page.screenshot({ path: path.join(artifactDir, "auth_login_dashboard.png"), fullPage: true });
  const loginResponse = await legacyCommand({
    object: "users",
    method: "verifyBySessionId",
    data: { sessionId: await sessionIdFromCookies(page) },
  });
  if (loginResponse.method !== "sessionVerified" || loginResponse.data.user.email !== email) {
    throw new Error(`Expected logged-in session to verify, got ${JSON.stringify(loginResponse)}`);
  }

  console.log(JSON.stringify({
    email,
    password,
    register: { method: createResponse.method, user: createResponse.data.user.email },
    login: { method: loginResponse.method, user: loginResponse.data.user.email },
    finalUrl: page.url(),
  }, null, 2));
} finally {
  await browser.close();
  if (serverProcess) {
    serverProcess.kill("SIGTERM");
    await new Promise((resolve) => serverProcess.once("exit", resolve));
  }
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
  }
}
