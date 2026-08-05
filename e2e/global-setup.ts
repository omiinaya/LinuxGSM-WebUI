import { promises as fs } from "fs";
import path from "path";

/**
 * Global setup — runs once before the test suite.
 *
 * Wipes the file-backed auth/audit/alerts state so every E2E run starts from
 * a clean slate. The first /api/auth/init call then auto-creates the default
 * admin user (admin / DEFAULT_ADMIN_PASSWORD, default "admin123").
 *
 * The E2E suite relies on this being deterministic:
 *   - exactly one admin user (admin/admin123)
 *   - empty sessions, empty audit log, default alerts config
 */
export default async function globalSetup(): Promise<void> {
  const dataDir = path.join(process.cwd(), "data");
  await fs.mkdir(dataDir, { recursive: true });

  // Wipe mutable JSON state. On the next /api/auth/init the app re-creates
  // the default admin. Do NOT delete the dir itself (it may hold .gitkeep).
  const files = ["users.json", "sessions.json", "audit-log.json", "alerts.json"];
  for (const f of files) {
    try {
      await fs.unlink(path.join(dataDir, f));
    } catch {
      /* file didn't exist — expected on first run */
    }
  }

  // Seed a realistic alerts default so GET /api/alerts/config has content,
  // mirroring the route's own fallback shape.
  const defaultAlerts = {
    enabled: false,
    discord: { enabled: false, webhookUrl: "" },
    email: {
      enabled: false,
      host: "",
      port: 587,
      secure: false,
      user: "",
      pass: "",
      from: "",
      to: "",
    },
    events: {
      serverStart: true,
      serverStop: true,
      serverCrash: true,
      updateAvailable: true,
      lowDisk: false,
      highCpu: false,
      backup: true,
      update: true,
      configChange: false,
    },
  };
  const alertsPath = path.join(dataDir, "alerts.json");
  try {
    await fs.access(alertsPath);
  } catch {
    await fs.writeFile(alertsPath, JSON.stringify(defaultAlerts, null, 2));
  }

  // Ensure the production build exists (tests boot `next start`).
  const nextDir = path.join(process.cwd(), ".next");
  try {
    await fs.access(path.join(nextDir, "BUILD_ID"));
  } catch {
    throw new Error(
      "Missing .next/BUILD_ID — run `npm run build` before `npx playwright test`.",
    );
  }

  console.log("[globalSetup] data/ state reset; clean admin ready.");
}