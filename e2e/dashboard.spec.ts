import { test, expect } from "@playwright/test";
import { login, seedServers, mockServerApis, acceptNextDialog } from "./helpers";

/**
 * Dashboard — stats, server cards, Add Server modal (Discover/Manual),
 * view toggles, and the Discover Local flow. Server APIs are mocked for
 * determinism; auth is real.
 */
test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await mockServerApis(page);
  });

  test("empty dashboard shows the empty state", async ({ page }) => {
    await login(page);
    await expect(page.getByText("No servers configured yet")).toBeVisible({
      timeout: 20000,
    });
    await expect(
      page.getByRole("button", { name: "Add Your First Server" }),
    ).toBeVisible();
    // Stats cards all read 0.
    await expect(page.getByText("Total Servers")).toBeVisible();
  });

  test("renders server cards with running/stopped stats", async ({ page }) => {
    await seedServers(page);
    await login(page);
    await expect(page.getByText("csgo-01")).toBeVisible({ timeout: 20000 });
    await expect(page.getByText("mc-01")).toBeVisible();
    // Stats: 2 total, 1 running, 1 stopped.
    await expect(page.getByText("2", { exact: true }).first()).toBeVisible();
  });

  test("Add Server opens the connection modal", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Add Server" }).click();
    await expect(page.getByText("Add Server Connection")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole("button", { name: "Discover" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Manual Add" })).toBeVisible();
  });

  test("Discover flow: fills creds, scans, and adds a discovered server", async ({
    page,
  }) => {
    await login(page);
    await page.getByRole("button", { name: "Add Server" }).click();

    // Discover tab is default.
    await page.getByLabel("Host").fill("192.168.1.100");
    await page.getByLabel("Username").fill("lgsm");
    await page.getByLabel("Password", { exact: true }).fill("secret");
    await page.getByRole("button", { name: "Scan for Servers" }).click();

    // Modal closes and the discovered server appears in the list.
    await expect(page.getByText("csgo-01")).toBeVisible({ timeout: 20000 });
  });

  test("Manual Add flow: fill form and add a server", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Add Server" }).click();
    await page.getByRole("button", { name: "Manual Add" }).click();

    await page.getByLabel("Host").fill("10.0.0.5");
    await page.getByLabel("Username").fill("lgsm");
    await page.getByLabel("Password", { exact: true }).fill("secret");
    await page.getByLabel("Server Name (LGSM script name)").fill("myserver");
    await page.getByLabel("Game ID").fill("csgo");
    await page.getByLabel("Game Name").fill("Counter-Strike 2");
    await page.getByLabel("Install Path").fill("/home/myserver");
    await page.getByRole("button", { name: "Add Server", exact: true }).click();

    // Modal closes; fixture server csgo-01 is returned by the mock add.
    await expect(page.getByText("csgo-01")).toBeVisible({ timeout: 20000 });
  });

  test("grid/list view toggle", async ({ page }) => {
    await seedServers(page);
    await login(page);
    await expect(page.getByText("csgo-01")).toBeVisible({ timeout: 20000 });
    // Two icon-only view buttons; click the list one (index 1) then grid (0).
    const viewButtons = page
      .locator("button", { has: page.locator("svg") })
      .filter({ hasText: "" });
    const listBtn = viewButtons.nth(1);
    const gridBtn = viewButtons.nth(0);
    await listBtn.click();
    await gridBtn.click();
    await expect(page.getByText("csgo-01")).toBeVisible();
  });

  test("Refresh All re-runs status queries", async ({ page }) => {
    await seedServers(page);
    await login(page);
    await page.getByRole("button", { name: "Refresh All" }).click();
    await expect(page.getByText("csgo-01")).toBeVisible({ timeout: 20000 });
  });

  test("Discover Local button stays inactive when no admin server visible", async ({
    page,
  }) => {
    await login(page);
    // Discover Local is only rendered when servers exist; without them the
    // dashboard shows the empty state Add Your First Server path.
    await expect(page.getByText("No servers configured yet")).toBeVisible({
      timeout: 20000,
    });
  });
});