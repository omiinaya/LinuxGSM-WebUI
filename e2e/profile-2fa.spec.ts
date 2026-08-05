import { test, expect } from "@playwright/test";
import { login, totp } from "./helpers";

/**
 * Profile — password change and 2FA enable/disable against the REAL
 * file-backed /api/auth/* routes. TOTP codes are computed client-side with
 * the same HMAC-SHA1 algorithm the server uses, so enable/verify is genuine.
 */
test.describe("Profile", () => {
  test("renders profile with user identity and role", async ({ page }) => {
    await login(page);
    await page.goto("/profile");
    await expect(page.getByText("Profile")).toBeVisible();
    await expect(page.getByText(/admin.*admin/)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Change Password")).toBeVisible();
    await expect(page.getByText("Two-Factor Authentication")).toBeVisible();
  });

  test("password change: mismatch rejected, valid change succeeds", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/profile");

    // Mismatched confirm → client-side error, no API call.
    await page.getByLabel("Current Password").fill("admin123");
    await page.getByLabel("New Password", { exact: true }).first().fill("newpass-12345");
    await page.getByLabel("Confirm New Password").first().fill("different-12345");
    await page.getByRole("button", { name: "Change Password" }).click();
    await expect(page.getByText("New passwords do not match")).toBeVisible();

    // Valid change (must be ≥8 chars per client validation).
    await page.getByLabel("Current Password").fill("admin123");
    await page.getByLabel("New Password", { exact: true }).first().fill("newpass-12345");
    await page.getByLabel("Confirm New Password").first().fill("newpass-12345");
    await page.getByRole("button", { name: "Change Password" }).click();
    await expect(page.getByText("Password changed successfully")).toBeVisible({
      timeout: 15000,
    });

    // Restore the default password so later specs can still log in as admin.
    await page.getByLabel("Current Password").fill("newpass-12345");
    await page.getByLabel("New Password", { exact: true }).first().fill("admin123");
    await page.getByLabel("Confirm New Password").first().fill("admin123");
    await page.getByRole("button", { name: "Change Password" }).click();
    await expect(page.getByText("Password changed successfully")).toBeVisible({
      timeout: 15000,
    });
  });

  test("2FA enable → login round-trip → disable", async ({ page }) => {
    await login(page);
    await page.goto("/profile");

    // Start setup — secret comes from /api/auth/2fa/setup.
    await page.getByRole("button", { name: "Enable 2FA" }).click();
    const secretCode = page.locator("code").first();
    await expect(secretCode).toBeVisible({ timeout: 15000 });
    const secret = (await secretCode.textContent())?.trim() || "";

    // Compute a valid code with the same algorithm as the server.
    const code = totp(secret);

    await page.getByLabel("Verification Code").fill(code);
    await page.getByRole("button", { name: "Verify and Enable" }).click();
    await expect(
      page.getByText("Two-factor authentication is enabled."),
    ).toBeVisible({ timeout: 15000 });

    // --- LOGIN ROUND-TRIP with 2FA (the flow that used to lock users out) ---
    // Log out, then sign back in: the login page must prompt for a code.
    await page.getByRole("button", { name: "User" }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });

    await page.getByLabel("Username").fill("admin");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign In" }).click();

    // 2FA prompt appears (the missing piece — previously users were locked out).
    await expect(
      page.getByText("Two-factor authentication required."),
    ).toBeVisible({ timeout: 15000 });

    // Enter a fresh code computed from the same secret.
    const freshCode = totp(secret);
    await page.getByLabel("Verification Code").fill(freshCode);
    await page.getByRole("button", { name: "Verify & Sign In" }).click();

    // Dashboard mounts after successful 2FA verification.
    await expect(page.getByText("Game Servers", { exact: false })).toBeVisible({
      timeout: 20000,
    });

    // --- DISABLE 2FA to restore state for other specs ---
    await page.goto("/profile");
    await page.getByRole("button", { name: "Disable 2FA" }).click();
    await page.getByLabel("Confirm Password").fill("admin123");
    await page.getByRole("button", { name: "Confirm Disable" }).click();
    await expect(
      page.getByText("Two-factor authentication is not enabled."),
    ).toBeVisible({ timeout: 15000 });
  });
});