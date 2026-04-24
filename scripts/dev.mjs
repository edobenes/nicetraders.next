import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 8080);

const app = spawn(process.execPath, ["backend/server.mjs"], {
  cwd: rootDir,
  stdio: "inherit",
  env: { ...process.env, PORT: String(port) },
});

let shuttingDown = false;
console.log(`Starting full local environment on http://127.0.0.1:${port}`);

function shutdown() {
  shuttingDown = true;
  app.kill("SIGTERM");
}

app.on("exit", (code, signal) => {
  if (!shuttingDown) process.exit(code || (signal ? 1 : 0));
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
