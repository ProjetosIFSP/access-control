import { type Page, expect } from "@playwright/test";

// ── Credentials ───────────────────────────────────────────────────────────────

export const TEST_USER = {
  email: process.env.TEST_USER_EMAIL ?? "user@test.com",
  password: process.env.TEST_USER_PASSWORD ?? "password123",
};

export const TEST_ADMIN = {
  email: process.env.TEST_ADMIN_EMAIL ?? "admin@test.com",
  password: process.env.TEST_ADMIN_PASSWORD ?? "password123",
};

// ── Session helpers ───────────────────────────────────────────────────────────

/**
 * Clears all cookies and local/session storage so each test starts unauthenticated.
 * Call this in beforeEach for auth-sensitive tests.
 */
export async function clearSession(page: Page) {
  await page.context().clearCookies();
  await page.evaluate(() => {
    try {
      localStorage.clear();
    } catch (_) {}
    try {
      sessionStorage.clear();
    } catch (_) {}
  });
}

// ── UserMenu DOM notes ────────────────────────────────────────────────────────
//
// The UserMenu component renders a single icon-button (no visible "Entrar" text)
// that expands into a panel. The button always has a <ChevronDown> icon.
//
// Unauthenticated: the trigger button contains a generic <User /> SVG icon.
// Authenticated  : the trigger button contains an <Avatar> with initials or image,
//                  AND a <Bell /> notification button is also visible.
//
// We use the Bell button as the "logged-in" indicator and its absence as
// the "logged-out" indicator, since it is only rendered when isLoggedIn === true.

/**
 * Returns the UserMenu trigger button (always present, icon-only).
 *
 * The trigger is a <button type="button"> that wraps the user avatar (or generic
 * user icon) together with a ChevronDown arrow. It is rendered inside the header's
 * absolute-positioned UserMenu container and has the classes:
 *   "flex items-center md:gap-2 hover:bg-muted py-2 px-2 rounded-full cursor-pointer select-none"
 *
 * We identify it by requiring `select-none` (unique to this button within the header)
 * and use `.first()` to avoid strict-mode failures in case the menu is already open
 * and the expanded panel contains additional buttons that happen to share some classes.
 */
export function userMenuTrigger(page: Page) {
  return page
    .locator("header")
    .locator('button[type="button"][class*="select-none"]')
    .first();
}

/**
 * Opens the UserMenu panel by clicking the trigger.
 * Waits for the trigger to be enabled (it is disabled while the session is loading)
 * and then waits for the GSAP open animation to complete.
 */
export async function openUserMenu(page: Page) {
  const trigger = userMenuTrigger(page);
  // Wait until the button is no longer disabled (session check finished)
  await expect(trigger).toBeEnabled({ timeout: 10_000 });
  await trigger.click();
  // Allow GSAP expand animation (~400 ms) to finish before interacting with contents
  await page.waitForTimeout(500);
}

// ── Login via UI ──────────────────────────────────────────────────────────────

/**
 * Fills in and submits the login form.
 * Expects the login tabs panel to already be visible inside the UserMenu.
 */
export async function fillLoginForm(
  page: Page,
  email: string,
  password: string,
) {
  // The UserMenu renders LoginForm + RegisterForm overlapped in a CSS grid,
  // so there are always two E-mail and two Senha inputs in the DOM.
  // We use .first() to target the LoginForm fields (rendered before RegisterForm).
  await page.getByLabel("E-mail").first().fill(email);
  await page.getByLabel("Senha").first().fill(password);
  // The submit button inside the LoginForm (not the tab button)
  await page.locator('form button[type="submit"]').first().click();
}

/**
 * Opens the UserMenu and logs in via the embedded login form.
 */
export async function loginViaUI(
  page: Page,
  email = TEST_USER.email,
  password = TEST_USER.password,
) {
  await openUserMenu(page);
  await fillLoginForm(page, email, password);
  // After successful login the Bell button should appear (isLoggedIn === true)
  await expectAuthenticated(page);
}

/**
 * Opens the UserMenu and clicks "Sair" to log out.
 */
export async function logoutViaUI(page: Page) {
  await openUserMenu(page);
  // "Sair" button is a plain button inside the expanded menu (not a menuitem)
  await page.getByRole("button", { name: /^sair$/i }).click();
}

// ── State assertions ──────────────────────────────────────────────────────────

/**
 * Asserts the user is authenticated.
 * When logged in, the UserMenu renders a Bell (<Bell />) notification button
 * that is NOT present when logged out.
 */
export async function expectAuthenticated(page: Page) {
  // The Bell button only renders when isLoggedIn === true
  await expect(
    page.locator("header button").filter({
      has: page.locator('svg[class*="lucide-bell"], [data-lucide="bell"]'),
    }),
  ).toBeVisible({ timeout: 10_000 });
}

/**
 * Asserts the user is NOT authenticated.
 * When logged out, the Bell button is absent.
 */
export async function expectUnauthenticated(page: Page) {
  // Bell button only appears when authenticated — its absence means logged out
  await expect(
    page.locator("header button").filter({
      has: page.locator('svg[class*="lucide-bell"], [data-lucide="bell"]'),
    }),
  ).toBeHidden({ timeout: 8_000 });
}
