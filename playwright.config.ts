import { defineConfig } from "@playwright/test";

/**
 * LinuxGSM-WebUI end-to-end suite.
 *
 * Architecture: Next.js 14 App Router with file-backed auth (data/users.json,
 * data/sessions.json) and SSH-backed server management. The E2E suite:
 *   - Boots the REAL production build (`next start`) so routes render exactly
 *     as shipped.
 *   - Global setup wipes `data/*.json` so every run starts from a clean slate
 *     (default admin auto-created on first /api/auth/init).
 *   - File-backed flows (login, logout, 2FA, password change, user mgmt,
 *     sessions, audit, alerts config) hit the REAL API routes.
 *   - SSH-backed flows (server ops: status/start/stop/config/backups/logs)
 *     are intercepted in helpers.ts with deterministic fixtures, because no
 *     real remote LinuxGSM host is available in CI.
 *
 * Stability notes for this box (heavily loaded — load avg often >40):
 *   - workers: 1 + fullyParallel: false — Next dev/prod and a single worker
 *     avoid transpile contention and timeout storms.
 *   - timeout: 90s gives cold-started production routes room.
 *   - retries: 1 to absorb the rare slow tick.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 1,
  workers: 1,
  timeout: 90000,
  globalSetup: "./e2e/global-setup.ts",
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: "http://127.0.0.1:3331",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run start",
    url: "http://127.0.0.1:3331/login",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: "ignore",
    stderr: "pipe",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});