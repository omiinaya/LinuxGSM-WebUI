import { test, expect } from "@playwright/test";
import { login, DEFAULT_ADMIN } from "./helpers";

/**
 * Authentication — login, logout, redirect behavior, and role guards.
 * These exercise the REAL file-backed /api/auth/* routes.
 */
test.describe("Authentication", () => {
  test("login page renders and validates submission", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("LinuxGSM Web UI")).toBeVisible();
    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();

    // Sign In disabled when empty.
    const signIn = page.getByRole("button", { name: "Sign In" });
    await expect(signIn).toBeDisabled();
    await page.getByLabel("Username").fill(DEFAULT_ADMIN.username);
    await expect(signIn).toBeDisabled(); // still needs password
  });

  test("rejects invalid credentials with an error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Username").fill("admin");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByText("Invalid username or password")).toBeVisible({
      timeout: 15000,
    });
  });

  test("logs in with default admin and reaches the dashboard", async ({
    page,
  }) => {
    await login(page);
    // Dashboard shell mounts (logged-in layout).
    await expect(page.getByText("Game Servers", { exact: false })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByText("Total Servers")).toBeVisible();
    // Logged-in user name shown in header dropdown trigger (accessibility label).
    await expect(page.getByRole("button", { name: "User" })).toBeVisible();
  });

  test("redirects an already-authenticated user away from /login", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/login");
    // Because already has session cookie, LoginPage pushes to "/".
    await expect(page).toHaveURL("/", { timeout: 15000 });
  });

  test("logs out via the header user menu and redirects to /login", async ({
    page,
  }) => {
    await login(page);
    await page.getByRole("button", { name: "User" }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
    await expect(page.getByText("Enter your credentials")).toBeVisible();
  });

  test("protected routes redirect unauthenticated users to /login", async ({
    page,
  }) => {
    await page.goto("/alerts");
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });
});

test.describe("Role guards", () => {
  test("admin can reach admin-only routes", async ({ page }) => {
    await login(page);
    await page.goto("/admin/users");
    await expect(page.getByText("User Management")).toBeVisible({ timeout: 15000 });
    await page.goto("/sessions");
    await expect(page.getByText("Active Sessions")).toBeVisible({ timeout: 15000 });
    await page.goto("/admin/audit");
    await expect(page.getByText("Audit Log")).toBeVisible({ timeout: 15000 });
    await page.goto("/catalogue");
    await expect(page.getByText("Game Catalogue")).toBeVisible({ timeout: 15000 });
  });
});