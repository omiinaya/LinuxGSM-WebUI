import { test, expect } from "@playwright/test";
import { login, seedServersWithSelection, mockServerApis } from "./helpers";

/**
 * Monitor Setup + Parameters pages — cron monitor configuration with live
 * cron-line generation, and the LGSM parameter editor.
 */
test.describe("Monitor Setup", () => {
  const RUNNING_ID = "srv-csgo-01";

  test.beforeEach(async ({ page }) => {
    await mockServerApis(page);
    await seedServersWithSelection(page, RUNNING_ID);
  });

  test("renders monitor setup with cron generation", async ({ page }) => {
    await login(page);
    await page.goto(`/server/${RUNNING_ID}/monitor`);
    await expect(page.getByText("Monitor Setup")).toBeVisible({ timeout: 20000 });
    await expect(page.getByText("Cron Job Configuration")).toBeVisible();
    // The generated cron line appears in the read-only textarea.
    await expect(page.getByText(/\*\/5 \* \* \* \* .*csgo-01 monitor/)).toBeVisible({
      timeout: 15000,
    });
  });

  test("frequency select updates the cron line", async ({ page }) => {
    await login(page);
    await page.goto(`/server/${RUNNING_ID}/monitor`);
    await expect(page.getByText("Monitor Setup")).toBeVisible({ timeout: 20000 });
    await page.getByRole("combobox").click();
    await page.getByText("Once a day at midnight").click();
    await expect(page.getByText(/0 0 \* \* \* .*csgo-01 monitor/)).toBeVisible({
      timeout: 15000,
    });
  });

  test("Add to Crontab succeeds with username filled", async ({ page }) => {
    await login(page);
    await page.goto(`/server/${RUNNING_ID}/monitor`);
    await expect(page.getByText("Monitor Setup")).toBeVisible({ timeout: 20000 });
    await page.getByLabel("SSH Username").fill("lgsm");
    await page.getByRole("button", { name: "Add to Crontab via SSH" }).click();
    await expect(page.getByText("Cron job added to crontab!")).toBeVisible({
      timeout: 15000,
    });
  });
});

test.describe("Parameters", () => {
  const RUNNING_ID = "srv-csgo-01";

  test.beforeEach(async ({ page }) => {
    await mockServerApis(page);
    await seedServersWithSelection(page, RUNNING_ID);
  });

  test("renders parameters parsed from config", async ({ page }) => {
    await login(page);
    await page.goto(`/server/${RUNNING_ID}/parameters`);
    await expect(page.getByText("Parameters")).toBeVisible({ timeout: 20000 });
    // Fixture config has ip/port/maxplayers/map lines — parsed into fields.
    await expect(page.getByLabel("maxplayers")).toBeVisible({ timeout: 15000 });
    await expect(page.getByLabel("ip")).toBeVisible();
  });

  test("edits a parameter and saves", async ({ page }) => {
    await login(page);
    await page.goto(`/server/${RUNNING_ID}/parameters`);
    await expect(page.getByLabel("maxplayers")).toBeVisible({ timeout: 15000 });
    await page.getByLabel("maxplayers").fill("64");
    await page.getByRole("button", { name: "Save Parameters" }).click();
    await expect(page.getByText("Saved successfully")).toBeVisible({
      timeout: 15000,
    });
  });
});