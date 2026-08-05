import { test, expect } from "@playwright/test";
import { login, mockServerApis, acceptNextDialog } from "./helpers";

/**
 * Catalogue + Install wizard — game catalogue browsing and the multi-step
 * install flow (connection → game → config → deps → install → complete).
 * Server APIs are mocked; the UI wizard itself is real.
 */
test.describe("Game Catalogue", () => {
  test.beforeEach(async ({ page }) => {
    await mockServerApis(page);
    await page.route("**/api/local/games", async (route) => {
      await route.fulfill({
        json: {
          games: [
            { id: "csgo", name: "Counter-Strike 2", description: "Tactical FPS", defaultPort: 27015, steamAppId: 730 },
            { id: "minecraft", name: "Minecraft: Java Edition", description: "Sandbox survival", defaultPort: 25565 },
            { id: "valheim", name: "Valheim", description: "Viking survival", defaultPort: 2457 },
          ],
        },
      });
    });
  });

  test("catalogue renders game cards with metadata", async ({ page }) => {
    await login(page);
    await page.goto("/catalogue");
    await expect(page.getByText("Game Catalogue")).toBeVisible();
    await expect(page.getByText("Counter-Strike 2")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Minecraft: Java Edition")).toBeVisible();
    await expect(page.getByText("Default Port: 27015")).toBeVisible();
  });

  test("catalogue install flow reports success", async ({ page }) => {
    await login(page);
    await page.goto("/catalogue");
    await expect(page.getByText("Counter-Strike 2")).toBeVisible({ timeout: 15000 });
    acceptNextDialog(page);
    await page.getByRole("button", { name: "Install", exact: false }).first().click();
    // Mocked install returns success message.
    await expect(page.getByText(/Successfully installed Counter-Strike 2/)).toBeVisible({
      timeout: 20000,
    });
  });
});

test.describe("Install Wizard", () => {
  test.beforeEach(async ({ page }) => {
    await mockServerApis(page);
  });

  test("walks through the wizard steps to completion", async ({ page }) => {
    await login(page);
    await page.goto("/install");
    await expect(page.getByText("SSH Connection")).toBeVisible({ timeout: 15000 });

    // Step 1: connection.
    await page.getByLabel("Host").fill("192.168.1.100");
    await page.getByLabel("Username").fill("lgsm");
    await page.getByLabel("Password", { exact: true }).fill("secret");
    await page.getByRole("button", { name: "Next", exact: false }).click();

    // Step 2: game.
    await expect(page.getByText("Select Game")).toBeVisible({ timeout: 15000 });
    await page.getByRole("combobox").click();
    await page.getByText("Counter-Strike 2").click();
    await page.getByRole("button", { name: "Next", exact: false }).click();

    // Step 3: config.
    await expect(page.getByText("Server Configuration")).toBeVisible({ timeout: 15000 });
    await page.getByLabel("Server Name").fill("csgo-test");
    await page.getByLabel("Installation Path").fill("/home/lgsm/csgo-test");
    await page.getByRole("button", { name: "Next", exact: false }).click();

    // Step 4: deps — mocked returns missing: [] → auto-advance after 1.5s.
    await expect(page.getByText("Check Dependencies")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Installing...")).toBeVisible({ timeout: 20000 });

    // Step 5: install — mocked, then progress loop, then complete.
    await expect(page.getByText("Installation Complete!")).toBeVisible({
      timeout: 45000,
    });
    await expect(page.getByRole("button", { name: "Go to Dashboard" })).toBeVisible();
  });

  test("back navigation returns to previous step", async ({ page }) => {
    await login(page);
    await page.goto("/install");
    await expect(page.getByText("SSH Connection")).toBeVisible({ timeout: 15000 });
    await page.getByLabel("Host").fill("192.168.1.100");
    await page.getByLabel("Username").fill("lgsm");
    await page.getByLabel("Password", { exact: true }).fill("secret");
    await page.getByRole("button", { name: "Next", exact: false }).click();
    await expect(page.getByText("Select Game")).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: "Back", exact: false }).click();
    await expect(page.getByText("SSH Connection")).toBeVisible({ timeout: 15000 });
  });
});