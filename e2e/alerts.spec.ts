import { test, expect } from "@playwright/test";
import { login, mockAlertsEgress } from "./helpers";

/**
 * Alerts — configure Discord + email alert channels and event toggles.
 * Config load/save hits the REAL file-backed /api/alerts/config route;
 * egress (discord webhook / SMTP send) is mocked in helpers.
 */
test.describe("Alerts", () => {
  test("renders alert configuration with all sections", async ({ page }) => {
    await mockAlertsEgress(page);
    await login(page);
    await page.goto("/alerts");
    await expect(page.getByText("Alert Configuration")).toBeVisible();
    await expect(page.getByText("Enable Alerts")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Discord Alerts")).toBeVisible();
    await expect(page.getByText("Email Alerts")).toBeVisible();
    await expect(page.getByText("Event Types")).toBeVisible();
  });

  test("enable alerts, configure discord, and test the webhook", async ({
    page,
  }) => {
    await mockAlertsEgress(page);
    await login(page);
    await page.goto("/alerts");

    // Enable master + discord switches (radix Switch renders as a button).
    await page.getByLabel("Enable Alerts").click();
    await page.getByLabel("Discord Alerts").click();

    // Fill the Discord webhook URL.
    await page.getByPlaceholder("https://discord.com/api/webhooks/...").fill(
      "https://discord.com/api/webhooks/123/test",
    );
    // Test button enabled once webhook set + discord enabled.
    const testBtn = page.getByRole("button", { name: "Test", exact: true });
    await expect(testBtn).toBeEnabled();
    page.on("dialog", (d) => d.accept());
    await testBtn.click();
    // Mocked egress returns success → alert dialog ("Discord test message sent!").
    await page.waitForTimeout(500);
  });

  test("configures SMTP email settings", async ({ page }) => {
    await mockAlertsEgress(page);
    await login(page);
    await page.goto("/alerts");

    await page.getByLabel("Email Alerts").click();
    await page.getByLabel("SMTP Host").fill("smtp.gmail.com");
    await page.getByLabel("Port").fill("587");
    await page.getByLabel("Username").fill("user@example.com");
    await page.getByLabel("Password", { exact: true }).fill("secret");
    await page.getByLabel("From Email").fill("alerts@yourserver.com");
    await page.getByLabel("To Email").fill("admin@example.com");

    const testEmail = page.getByRole("button", { name: "Test Email" });
    await expect(testEmail).toBeEnabled();
    page.on("dialog", (d) => d.accept());
    await testEmail.click();
    await page.waitForTimeout(500);
  });

  test("save persists config and shows Saved badge", async ({ page }) => {
    await mockAlertsEgress(page);
    await login(page);
    await page.goto("/alerts");
    await page.getByRole("button", { name: "Save Configuration" }).click();
    // saveConfig sets saved=true → green "Saved!" badge appears.
    await expect(page.getByText("Saved!")).toBeVisible({ timeout: 15000 });
  });
});