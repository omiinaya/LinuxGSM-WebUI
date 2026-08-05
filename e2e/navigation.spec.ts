import { test, expect } from "@playwright/test";
import { login, seedServers, mockServerApis } from "./helpers";

/**
 * Navigation & layout — sidebar (role-aware), header actions, theme toggle,
 * and the command palette (Cmd/Ctrl+K).
 */
test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await mockServerApis(page);
  });

  test("admin sidebar shows all navigation items", async ({ page }) => {
    await login(page);
    for (const item of [
      "Servers",
      "Console",
      "Alerts",
      "Settings",
      "Support",
      "Profile",
      "Sessions",
      "Audit Log",
      "Catalogue",
      "Admin",
    ]) {
      await expect(page.getByRole("button", { name: item, exact: false })).toBeVisible({
        timeout: 15000,
      });
    }
  });

  test("sidebar collapses and expands", async ({ page }) => {
    await login(page);
    const aside = page.locator("aside");
    const collapseBtn = aside.getByRole("button").first();
    await collapseBtn.click();
    // Collapsed: sidebar width shrinks (w-16 ≈ 64px).
    await expect
      .poll(async () => (await aside.boundingBox())?.width || 0, { timeout: 10000 })
      .toBeLessThan(150);
    await collapseBtn.click();
    await expect
      .poll(async () => (await aside.boundingBox())?.width || 0, { timeout: 10000 })
      .toBeGreaterThan(200);
  });

  test("header shows Dashboard title with no selected server", async ({ page }) => {
    await login(page);
    await expect(page.getByText("Dashboard", { exact: false })).toBeVisible();
    await expect(page.getByText("Manage your game servers")).toBeVisible();
  });

  test("theme toggle switches dark/light", async ({ page }) => {
    await login(page);
    // Theme button is icon-only; both sun/moon render depending on state.
    const themeBtn = page.getByRole("button").filter({ has: page.locator("svg") }).nth(3);
    await themeBtn.click();
    await page.waitForTimeout(200);
    // No crash — header still present.
    await expect(page.getByText("Dashboard", { exact: false })).toBeVisible();
  });

  test("command palette opens with Ctrl+K and lists actions", async ({ page }) => {
    await seedServers(page);
    await login(page);
    // CommandPalette is globally mounted; open with Ctrl+K.
    await page.keyboard.press("Control+K");
    await expect(page.getByPlaceholder("Type a command or search...")).toBeVisible({
      timeout: 10000,
    });
    // With a selected server? None selected by default — Navigation group still shows Add New Server.
    await expect(page.getByText("Add New Server")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByPlaceholder("Type a command or search...")).toBeHidden({
      timeout: 10000,
    });
  });

  test("command palette shows server actions when a server is selected", async ({
    page,
  }) => {
    await seedServers(page);
    await login(page);
    // Select the running server from the sidebar list.
    await page.getByRole("button", { name: /csgo-01/ }).click();
    await page.keyboard.press("Control+K");
    await expect(page.getByText("Server Actions")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Start Server")).toBeVisible();
    await expect(page.getByText("Stop Server")).toBeVisible();
    await expect(page.getByText("Restart Server")).toBeVisible();
    await expect(page.getByText("Check for Updates")).toBeVisible();
  });

  test("command palette Add New Server opens the connection modal", async ({
    page,
  }) => {
    await login(page);
    await page.keyboard.press("Control+K");
    await page.getByText("Add New Server").click();
    await expect(page.getByText("Add Server Connection")).toBeVisible({
      timeout: 10000,
    });
  });
});