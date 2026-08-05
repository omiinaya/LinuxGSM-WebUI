import { test, expect } from "@playwright/test";
import { login, acceptNextDialog } from "./helpers";

/**
 * Admin — user management (create, role edit, delete), active sessions
 * (revoke), and the audit log. All hit the REAL file-backed API routes
 * (/api/users, /api/sessions, /api/admin/audit).
 */
test.describe("Admin", () => {
  test("user management renders the user table", async ({ page }) => {
    await login(page);
    await page.goto("/admin/users");
    await expect(page.getByText("User Management")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("admin", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create User" })).toBeVisible();
  });

  test("create a user via the modal", async ({ page }) => {
    await login(page);
    await page.goto("/admin/users");
    await expect(page.getByText("User Management")).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: "Create User" }).click();
    // Modal opens (previously the modal never rendered — fixed).
    await expect(page.getByText("Create New User")).toBeVisible({ timeout: 10000 });
    await page.getByPlaceholder("Username").fill("e2e-op");
    await page.getByPlaceholder("Password").fill("e2e-op-pass-123");
    await page.getByRole("button", { name: "Create User", exact: true }).click();

    // The new user appears in the table.
    await expect(page.getByText("e2e-op", { exact: true })).toBeVisible({
      timeout: 15000,
    });
  });

  test("delete a non-admin user with confirmation", async ({ page }) => {
    await login(page);
    await page.goto("/admin/users");
    await expect(page.getByText("User Management")).toBeVisible({ timeout: 15000 });

    // Ensure an operator exists (create if needed).
    if ((await page.getByText("e2e-op", { exact: true }).count()) === 0) {
      await page.getByRole("button", { name: "Create User" }).click();
      await expect(page.getByText("Create New User")).toBeVisible({ timeout: 10000 });
      await page.getByPlaceholder("Username").fill("e2e-op");
      await page.getByPlaceholder("Password").fill("e2e-op-pass-123");
      await page.getByRole("button", { name: "Create User", exact: true }).click();
      await expect(page.getByText("e2e-op", { exact: true })).toBeVisible({
        timeout: 15000,
      });
    }

    acceptNextDialog(page);
    // Find the row for e2e-op and click its Delete button.
    const row = page.locator("tr", { hasText: "e2e-op" });
    await row.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("e2e-op", { exact: true })).toHaveCount(0, {
      timeout: 15000,
    });
  });

  test("admin user cannot be deleted", async ({ page }) => {
    await login(page);
    await page.goto("/admin/users");
    await expect(page.getByText("User Management")).toBeVisible({ timeout: 15000 });
    const adminRow = page.locator("tr", { hasText: /^admin/ });
    await expect(adminRow.getByRole("button", { name: "Delete" })).toBeDisabled();
  });

  test("sessions page lists the current session", async ({ page }) => {
    await login(page);
    await page.goto("/sessions");
    await expect(page.getByText("Active Sessions")).toBeVisible({ timeout: 15000 });
    // The login created a session; current session is marked "This session".
    await expect(page.getByText("This session")).toBeVisible({ timeout: 15000 });
  });

  test("audit log records auth events", async ({ page }) => {
    await login(page);
    await page.goto("/admin/audit");
    await expect(page.getByText("Audit Log")).toBeVisible({ timeout: 15000 });
    // Login events are logged (logAuthEvent writes to audit-log.json).
    await expect(page.getByText(/login/i).first()).toBeVisible({ timeout: 15000 });
  });
});