import { Page, expect } from "@playwright/test";
import crypto from "crypto";

/**
 * Shared helpers for the LinuxGSM-WebUI E2E suite.
 *
 * The app is a Next.js App Router SPA: auth is file-backed (real API routes),
 * while server management talks SSH. This helper file provides:
 *   - loginAs / logoutViaUI — real auth flows against /api/auth/*
 *   - totp() — replicates src/lib/auth.ts getTOTPCode() so the REAL 2FA
 *     enable/disable/verify endpoints are exercised with a valid code
 *   - mockServerApis() — deterministic fixtures for SSH-backed routes
 *   - seedServers() — injects servers into zustand's localStorage store
 */

export const BASE_URL = "http://127.0.0.1:3331";
export const DEFAULT_ADMIN = { username: "admin", password: "admin123" };

/** Alias: log in through the real form as the default admin. */
export const login = loginAs;

/** Alias: real logout via header user dropdown. */
export const logout = logoutViaUI;

/* ------------------------------------------------------------------ */
/*  Auth                                                               */
/* ------------------------------------------------------------------ */

/** Log in through the real login form. Returns after dashboard mounts. */
export async function loginAs(
  page: Page,
  username = DEFAULT_ADMIN.username,
  password = DEFAULT_ADMIN.password,
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByText("Game Servers", { exact: false })).toBeVisible({
    timeout: 20000,
  });
}

/** Log out via the header user dropdown (real /api/auth/logout). */
export async function logoutViaUI(page: Page): Promise<void> {
  // Open the user dropdown (avatar button in header).
  await page.getByRole("button", { name: "User" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
}

/** Convenience: perform a fresh login then navigate to a path. */
export async function loginAndGo(
  page: Page,
  path: string,
  username = DEFAULT_ADMIN.username,
  password = DEFAULT_ADMIN.password,
): Promise<void> {
  await loginAs(page, username, password);
  await page.goto(path);
  await page.waitForLoadState("domcontentloaded");
}

/* ------------------------------------------------------------------ */
/*  TOTP (replicates src/lib/auth.ts getTOTPCode/verifyTOTP)          */
/* ------------------------------------------------------------------ */

/**
 * Compute the current 6-digit TOTP for a hex-encoded 20-byte secret,
 * exactly matching the app's server-side implementation (HMAC-SHA1,
 * big-endian 8-byte counter, dynamic truncation).
 */
export function totp(secretHex: string, step = Math.floor(Date.now() / 1000 / 30)): string {
  const key = Buffer.from(secretHex, "hex");
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeUInt32BE(step, 0);
  timeBuffer.writeUInt32BE(0, 4);
  const hmac = crypto.createHmac("sha1", key);
  hmac.update(timeBuffer);
  const digest = hmac.digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return (code % 1000000).toString().padStart(6, "0");
}

/** Accept the current or previous TOTP step (mirrors verifyTOTP). */
export function totpWithSkew(secretHex: string): string {
  return totp(secretHex, Math.floor(Date.now() / 1000 / 30));
}

/* ------------------------------------------------------------------ */
/*  Fixture servers                                                    */
/* ------------------------------------------------------------------ */

export interface E2EServer {
  id: string;
  name: string;
  ip: string;
  port: number;
  game: string;
  gameName: string;
  status: "running" | "stopped";
  installPath: string;
  configPath: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  map?: string;
  maxPlayers: number;
  currentPlayers: { name: string; score: number; time: string; ping: number }[];
  lgsmVersion: string;
  createdAt: string;
  lastUpdate?: string;
  local?: boolean;
  sshConnection: { type: "local" | "ssh"; workingDir?: string; host?: string; port?: number; username?: string };
}

export const FIXTURE_SERVERS: E2EServer[] = [
  {
    id: "srv-csgo-01",
    name: "csgo-01",
    ip: "127.0.0.1",
    port: 27015,
    game: "csgo",
    gameName: "Counter-Strike 2",
    status: "running",
    installPath: "/home/lgsm/csgo-01",
    configPath: "/home/lgsm/csgo-01/lgsm/config-lgsm/csgoserver",
    cpuUsage: 12,
    memoryUsage: 34,
    diskUsage: 41,
    map: "de_dust2",
    maxPlayers: 32,
    currentPlayers: [
      { name: "PlayerOne", score: 12, time: "00:42", ping: 23 },
      { name: "PlayerTwo", score: 8, time: "01:05", ping: 41 },
    ],
    lgsmVersion: "v22.7.1",
    createdAt: "2026-06-01T10:00:00.000Z",
    sshConnection: { type: "ssh", host: "127.0.0.1", port: 22, username: "lgsm" },
  },
  {
    id: "srv-mc-01",
    name: "mc-01",
    ip: "127.0.0.1",
    port: 25565,
    game: "minecraft",
    gameName: "Minecraft: Java Edition",
    status: "stopped",
    installPath: "/home/lgsm/mc-01",
    configPath: "/home/lgsm/mc-01/lgsm/config-lgsm/mcserver",
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 22,
    maxPlayers: 20,
    currentPlayers: [],
    lgsmVersion: "v22.7.1",
    createdAt: "2026-06-15T10:00:00.000Z",
    sshConnection: { type: "local", workingDir: "/home/lgsm/mc-01" },
  },
];

/**
 * Seed servers into the zustand persist store (localStorage key
 * `linuxgsm-servers`). Must run via addInitScript BEFORE the page loads
 * so the store hydrates with fixtures.
 */
export async function seedServers(page: Page, servers: E2EServer[] = FIXTURE_SERVERS): Promise<void> {
  await page.addInitScript((srvList) => {
    const payload = {
      state: {
        servers: srvList,
        selectedServerId: null,
        isLoading: false,
        error: null,
      },
      version: 0,
    };
    localStorage.setItem("linuxgsm-servers", JSON.stringify(payload));
  }, servers);
}

/** Seed servers AND select one by id (for detail-page tests). */
export async function seedServersWithSelection(page: Page, selectedId: string): Promise<void> {
  const servers = FIXTURE_SERVERS.map((s) => s);
  await page.addInitScript(({ srvList, selId }) => {
    const payload = {
      state: {
        servers: srvList,
        selectedServerId: selId,
        isLoading: false,
        error: null,
      },
      version: 0,
    };
    localStorage.setItem("linuxgsm-servers", JSON.stringify(payload));
  }, { srvList: servers, selId: selectedId });
}

/* ------------------------------------------------------------------ */
/*  SSH-backed API mocks                                               */
/* ------------------------------------------------------------------ */

/**
 * Intercept SSH-backed API routes with deterministic fixtures so the UI
 * flows (start/stop/restart/config/backups/logs/console/query/ports) are
 * exercised end-to-end without a real remote host.
 *
 * File-backed routes (/api/auth/*, /api/users, /api/sessions,
 * /api/admin/audit, /api/alerts/config) are NOT intercepted — those hit the
 * real Next.js server for genuine coverage.
 */
export async function mockServerApis(page: Page, servers: E2EServer[] = FIXTURE_SERVERS): Promise<void> {
  await page.route("**/api/servers", async (route) => {
    const req = route.request();
    if (req.method() === "GET") {
      await route.fulfill({ json: { servers } });
      return;
    }
    // POST /api/servers (discover / add / check-deps / install)
    let body: any = {};
    try {
      body = req.postDataJSON();
    } catch {
      body = {};
    }
    const action = body?.action || "add";
    if (action === "discover") {
      await route.fulfill({ json: { servers: [servers[0]] } });
      return;
    }
    if (action === "check-deps") {
      await route.fulfill({ json: { missing: [] } });
      return;
    }
    if (action === "install" || action === "auto-install") {
      await route.fulfill({
        json: { server: servers[1], message: "Installation started" },
      });
      return;
    }
    // add
    await route.fulfill({ json: { server: servers[0] } });
  });

  await page.route("**/api/servers/*/status", async (route) => {
    await route.fulfill({ json: { status: "running" } });
  });

  for (const op of ["start", "stop", "restart", "command", "validate", "cron", "check-ports", "query", "restore"]) {
    await page.route(`**/api/servers/*/${op}`, async (route) => {
      const req = route.request();
      let body: any = {};
      try {
        body = req.postDataJSON();
      } catch {
        body = {};
      }
      if (op === "command") {
        await route.fulfill({ json: { output: `[ok] executed: ${body?.command || "update"}` } });
        return;
      }
      if (op === "query") {
        await route.fulfill({
          json: { players: 2, maxPlayers: 32, map: "de_dust2", gamemode: "competitive" },
        });
        return;
      }
      if (op === "check-ports") {
        await route.fulfill({ json: { conflicts: [], usedPorts: [27015, 25565] } });
        return;
      }
      if (op === "restore") {
        await route.fulfill({ json: { success: true } });
        return;
      }
      await route.fulfill({ json: { success: true } });
    });
  }

  await page.route("**/api/servers/*/config", async (route) => {
    const req = route.request();
    let body: any = {};
    try {
      body = req.postDataJSON();
    } catch {
      body = {};
    }
    if (body?.action === "save") {
      await route.fulfill({ json: { success: true, message: "Config saved" } });
      return;
    }
    // get
    await route.fulfill({
      json: {
        config: [
          "# LinuxGSM config for csgo-01",
          "ip=\"0.0.0.0\"",
          "port=\"27015\"",
          "maxplayers=\"32\"",
          "map=\"de_dust2\"",
        ].join("\n"),
        path: "/home/lgsm/csgo-01/lgsm/config-lgsm/csgoserver/csgo-01.cfg",
      },
    });
  });

  await page.route("**/api/servers/*/backups", async (route) => {
    await route.fulfill({
      json: {
        backups: [
          { date: "2026-07-01 00:00", file: "csgo-01-20260701-000000.tar.gz", size: "1.2GB" },
          { date: "2026-06-20 00:00", file: "csgo-01-20260620-000000.tar.gz", size: "1.1GB" },
        ],
      },
    });
  });

  await page.route("**/api/servers/*/console", async (route) => {
    await route.fulfill({ json: { output: "Console session started\n> server ready" } });
  });

  await page.route("**/api/servers/*/logs", async (route) => {
    await route.fulfill({ json: { content: "L 07/01/2026 - 00:00:01: server started\nL 07/01/2026 - 00:00:02: map de_dust2 loaded" } });
  });
}

/** Alerts test/trigger endpoints (webhook/SMTP egress) — deterministic. */
export async function mockAlertsEgress(page: Page): Promise<void> {
  await page.route("**/api/alerts/discord", async (route) => {
    await route.fulfill({ json: { success: true } });
  });
  await page.route("**/api/alerts/email", async (route) => {
    await route.fulfill({ json: { success: true } });
  });
  await page.route("**/api/alerts/trigger", async (route) => {
    await route.fulfill({ json: { success: true } });
  });
}

/* ------------------------------------------------------------------ */
/*  Misc                                                               */
/* ------------------------------------------------------------------ */

/** Full body text (robust against class-name minification). */
export async function pageText(page: Page): Promise<string> {
  return (await page.textContent("body")) || "";
}

/** Assert the page contains a string anywhere. */
export async function expectText(page: Page, text: string): Promise<void> {
  await expect(page.locator("body")).toContainText(text, { timeout: 15000 });
}

/** Accept the next native confirm() dialog. */
export function acceptNextDialog(page: Page): void {
  page.once("dialog", (d) => d.accept());
}

/** Dismiss the next native confirm() dialog (returns false). */
export function dismissNextDialog(page: Page): void {
  page.once("dialog", (d) => d.dismiss());
}