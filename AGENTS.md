---
name: LinuxGSM-WebUI
description: "linuxgsm-webui"
stack: [node, react]
deps: []
---

# LinuxGSM-WebUI

linuxgsm-webui

## Stack
- node + react (Next.js 14 App Router)

## Quick Reference

```bash
# Install
npm install

# Dev server (port 3331)
npm run dev

# Build
npm run build

# Start production build
npm run start

# Lint
npm run lint

# E2E tests (Playwright — boots `next start` automatically)
npm run test:e2e
```

## E2E Testing

The suite lives in `e2e/` (Playwright, chromium). Run it with:

```bash
npm run build   # production bundle required (webServer boots `next start`)
npm run test:e2e
```

Key design decisions:

- **Real file-backed flows**: auth (login/logout/2FA/password), user management,
  sessions, audit, alerts config all hit the REAL API routes against
  `data/*.json` — global setup wipes that state so every run starts clean
  (default admin: `admin` / `admin123`).
- **Mocked SSH-backed flows**: server ops (status/start/stop/config/backups/
  logs/console/query/ports) are intercepted in `e2e/helpers.ts` with
  deterministic fixtures — no real remote LinuxGSM host is needed in CI.
- **TOTP is real**: `totp()` in helpers replicates the server's HMAC-SHA1
  algorithm, so the 2FA enable → login → disable round-trip exercises the
  actual crypto path.
- **1 worker, 90s timeout, 1 retry** — this box runs hot (load avg often
  >40); parallel workers cause timeout storms.

## Documentation
| Document | Purpose |
|---|---|
| [README.md](./README.md) | Project details |
| [CLAUDE.md](./CLAUDE.md) | Claude Code quickstart |