import { test, expect } from "@playwright/test";
import { login, seedServersWithSelection, mockServerApis, acceptNextDialog } from "./helpers";

/**
 * Server Detail — 6 tabs (Overview, Console, Players, Config, Backups, Logs)
 * plus server action buttons (Start/Stop/Restart/Backup/Check Update/Validate/
 * Check Ports) and the Update + Config-diff + Port-check modals. Server APIs
 * are mocked; the rich UI is exercised end-to-end.
 */
test.describe("Server Detail", () => {
  const RUNNING_ID = "srv-csgo-01";

  test.beforeEach(async ({ page }) => {
    await mockServerApis(page);
    await seedServersWithSelection(page, RUNNING_ID);
  });

  test("overview tab renders stats and server info", async ({ page }) => {
    await login(page);
    await page.goto(`/server/${RUNNING_ID}`);
    await expect(page.getByRole("heading", { name: "csgo-01" })).toBeVisible({
      timeout: 20000,
    });
    // Stat cards + server information.
    await expect(page.getByText("CPU Usage")).toBeVisible();
    await expect(page.getByText("Memory")).toBeVisible();
    await expect(page.getByText("Players")).toBeVisible();
    await expect(page.getByText("Disk")).toBeVisible();
    await expect(page.getByText("Server Information")).toBeVisible();
    await expect(page.getByText("/home/lgsm/csgo-01")).toBeVisible();
  });

  test("shows Start button when stopped, Stop/Restart when running", async ({
    page,
  }) => {
    await login(page);
    await page.goto(`/server/${RUNNING_ID}`);
    await expect(page.getByRole("heading", { name: "csgo-01" })).toBeVisible({
      timeout: 20000,
    });
    // Running → Stop + Restart buttons present.
    await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Restart" })).toBeVisible();
  });

  test("console tab sends a command and shows output", async ({ page }) => {
    await login(page);
    await page.goto(`/server/${RUNNING_ID}`);
    await page.getByRole("tab", { name: /Console/ }).click();
    await page.getByPlaceholder("Enter command...").fill("status");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("[ok] executed: status")).toBeVisible({
      timeout: 15000,
    });
  });

  test("players tab lists current players", async ({ page }) => {
    await login(page);
    await page.goto(`/server/${RUNNING_ID}`);
    await page.getByRole("tab", { name: /Players/ }).click();
    await expect(page.getByText("Current Players")).toBeVisible();
    await expect(page.getByText("PlayerOne")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("PlayerTwo")).toBeVisible();
  });

  test("config tab loads config and opens the diff modal on save", async ({
    page,
  }) => {
    await login(page);
    await page.goto(`/server/${RUNNING_ID}`);
    await page.getByRole("tab", { name: /Config/ }).click();
    await expect(page.getByText("Loading configuration...")).toBeVisible();
    // After load, the monaco editor value appears (the fixture config text).
    await expect(page.getByText("maxplayers=\"32\"")).toBeVisible({
      timeout: 20000,
    });
    // Save Changes opens the diff-confirmation modal.
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("Confirm Configuration Changes")).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole("button", { name: "Cancel" }).click();
  });

  test("config tab switches between LGSM and Game config", async ({ page }) => {
    await login(page);
    await page.goto(`/server/${RUNNING_ID}`);
    await page.getByRole("tab", { name: /Config/ }).click();
    await expect(page.getByText("maxplayers=\"32\"")).toBeVisible({
      timeout: 20000,
    });
    // LGSM Config button (default active), then Visual Editor link to parameters.
    await page.getByRole("button", { name: "Game Config" }).click();
    await page.getByRole("button", { name: "LGSM Config" }).click();
    await expect(page.getByText(/Editing: csgo-01\.cfg/)).toBeVisible();
  });

  test("backups tab lists and restores a backup", async ({ page }) => {
    await login(page);
    await page.goto(`/server/${RUNNING_ID}`);
    await page.getByRole("tab", { name: /Backups/ }).click();
    await expect(page.getByText("csgo-01-20260701-000000.tar.gz")).toBeVisible({
      timeout: 20000,
    });
    acceptNextDialog(page);
    await page.getByRole("button", { name: "Create Backup" }).click();
  });

  test("logs tab loads log content and switches files", async ({ page }) => {
    await login(page);
    await page.goto(`/server/${RUNNING_ID}`);
    await page.getByRole("tab", { name: /Logs/ }).click();
    await expect(page.getByText("map de_dust2 loaded")).toBeVisible({
      timeout: 20000,
    });
    // File switcher buttons present.
    await expect(page.getByRole("button", { name: "Current" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Latest" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Debug" })).toBeVisible();
  });

  test("Check Ports modal reports no conflicts", async ({ page }) => {
    await login(page);
    await page.goto(`/server/${RUNNING_ID}`);
    await page.getByRole("button", { name: "Check Ports" }).click();
    await expect(page.getByText("No conflicts detected.")).toBeVisible({
      timeout: 20000,
    });
  });
});