# NICE Traders local development

This repository contains a checked-in static frontend export plus a lightweight local API server for development and demo authentication.

## Setup

```sh
npm install
```

## Run the full local environment

```sh
npm run dev
```

The app runs at `http://127.0.0.1:8080`.

The same Node process serves:

- Static frontend files with clean `.html` route fallback.
- `GET /q?command=...` for the exported Svelte pages.
- REST auth endpoints under `/api/auth/*`.

User records are stored in `data/dev-db.json`, which is intentionally gitignored. Remove that file to reset local users.

## Test

```sh
npm test
```

`npm test` starts an isolated API instance with a temporary JSON database and verifies:

- REST registration, login, session lookup, and logout.
- Duplicate-email and invalid-login errors.
- Legacy `/q?command=...` registration, login, and session lookup used by the exported frontend.

To run a browser-level registration/login check against the exported frontend:

```sh
npm run test:e2e
```

By default, `npm run test:e2e` starts its own dev server on a free local port with a temporary JSON database, fills the current exported register/login pages in Chrome, verifies the `sessionId` cookie through `/q`, and writes screenshots to `/opt/cursor/artifacts`.

Useful options:

```sh
HEADLESS=false npm run test:e2e
E2E_BASE_URL=http://127.0.0.1:8080 npm run test:e2e
E2E_ARTIFACT_DIR=./artifacts npm run test:e2e
```

Use `HEADLESS=false` for a visible local browser run. Set `E2E_BASE_URL` only when you intentionally want to test an already-running server.

## Backend design

The local backend is an Express API using Node built-ins for persistence and password hashing:

- `crypto.scrypt` with per-user salts for password hashes.
- Random session IDs generated with `crypto.randomBytes`.
- JSON-file persistence for a zero-dependency local setup.
- Legacy `/q` command compatibility for the current exported frontend.
- Conventional REST endpoints for future frontend code:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - `POST /api/auth/logout`

For production, the same API shape should move to durable storage such as PostgreSQL, managed sessions or JWT refresh-token rotation, rate limiting, request validation, structured logs, and HTTPS-only secure cookies.
