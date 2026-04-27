# Nitraders MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server that exposes the Nitraders.net backend (user registration, authentication, and session management) to LLM clients such as Claude Desktop, Cursor, and any other MCP-compatible host.

## Quick start

```sh
# Install dependencies (from repo root)
npm install

# Run in stdio mode (default – for local integrations)
npm run mcp

# Run as an HTTP server (recommended for remote/multi-client setups)
npm run mcp:http
```

## Transports

| Flag | Command | Default port |
|------|---------|-------------|
| _(none / `--stdio`)_ | `npm run mcp` | n/a – uses stdin/stdout |
| `--http` | `npm run mcp:http` | `3100` (`MCP_PORT` or `PORT`) |

### stdio (local integrations)

Suitable for Claude Desktop, Cursor, and other hosts that spawn MCP servers as child processes.

```sh
node mcp/server.mjs
```

Add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "nitraders": {
      "command": "node",
      "args": ["/absolute/path/to/repo/mcp/server.mjs"],
      "env": {
        "DATA_FILE": "/absolute/path/to/repo/data/dev-db.json"
      }
    }
  }
}
```

### Streamable HTTP (remote / multi-client)

```sh
PORT=3100 npm run mcp:http
```

The MCP endpoint is `POST http://127.0.0.1:3100/mcp`. A `GET /health` endpoint is also available for uptime checks.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATA_FILE` | `data/dev-db.json` | Path to the JSON user/session database |
| `MCP_PORT` / `PORT` | `3100` | HTTP listen port (HTTP transport only) |

## Tools

| Tool | Description |
|------|-------------|
| `register` | Create a new user account and return a session |
| `login` | Authenticate with email + password |
| `verify_session` | Check whether a session ID is valid |
| `logout` | Invalidate a session |
| `get_user` | Fetch a user's public profile by ID |
| `list_users` | List all registered users (no passwords) |
| `list_sessions` | List all active (non-expired) sessions |

## Resources

| URI | Description |
|-----|-------------|
| `nitraders://users` | JSON array of all registered users (public fields) |
| `nitraders://sessions` | JSON array of all active sessions |
| `nitraders://health` | Service health and database statistics |
