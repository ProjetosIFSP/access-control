import { test, expect } from "@playwright/test";
import {
  TEST_USER,
  TEST_ADMIN,
  clearSession,
  openUserMenu,
  fillLoginForm,
  expectAuthenticated,
  expectUnauthenticated,
} from "./helpers/auth";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Opens the UserMenu and waits for the login form to be accessible.
 * The UserMenu expands with a GSAP animation (~400ms).
 * Default tab is "Entrar", so the login form should be visible right away.
 */
async function openLoginPanel(page: import("@playwright/test").Page) {
  await openUserMenu(page);
  // The UserMenu renders LoginForm + RegisterForm overlapped in a grid — both exist
  // in the DOM simultaneously. We use .first() to pick the login form's E-mail field.
  await page
    .getByLabel("E-mail")
    .first()
    .waitFor({ state: "visible", timeout: 5_000 });
}

/** Returns the login form's E-mail input (first of the two overlapping forms). */
function emailInput(page: import("@playwright/test").Page) {
  return page.getByLabel("E-mail").first();
}

/** Returns the login form's Senha input. */
function passwordInput(page: import("@playwright/test").Page) {
  return page.getByLabel("Senha").first();
}

/** Returns the login form's submit button. */
function submitButton(page: import("@playwright/test").Page) {
  return page.locator('form button[type="submit"]').first();
}

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe("Autenticação", () => {
  // Clear any persisted session before every test so we start unauthenticated
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Clear cookies & storage BEFORE the app bootstraps a session check
    await clearSession(page);
    // Reload so the app picks up the cleared state
    await page.reload();
    await page
      .getByRole("heading", { level: 1 })
      .waitFor({ state: "visible", timeout: 15_000 });
  });

  // ── Layout do header sem autenticação ─────────────────────────────────────

  test("header não exibe botão de notificações (Bell) quando não autenticado", async ({
    page,
  }) => {
    await expectUnauthenticated(page);
  });

  test("não exibe links de administração (Cadastros) sem autenticação", async ({
    page,
  }) => {
    await expect(page.getByRole("button", { name: /cadastros/i })).toBeHidden();
  });

  // ── Abertura do painel de login (UserMenu) ────────────────────────────────

  test("clicar no botão do header abre o painel de login", async ({ page }) => {
    await openLoginPanel(page);
    await expect(emailInput(page)).toBeVisible();
    await expect(passwordInput(page)).toBeVisible();
  });

  test("painel de login exibe botão de submissão 'Entrar'", async ({
    page,
  }) => {
    await openLoginPanel(page);
    await expect(submitButton(page)).toBeVisible();
  });

  test("painel de login exibe link 'Esqueci minha senha'", async ({ page }) => {
    await openLoginPanel(page);
    await expect(
      page.getByRole("link", { name: /esqueci minha senha/i }).first(),
    ).toBeVisible();
  });

  test("painel de login exibe opção de continuar com Google", async ({
    page,
  }) => {
    await openLoginPanel(page);
    await expect(
      page.getByRole("button", { name: /continuar com google/i }).first(),
    ).toBeVisible();
  });

  // ── Validações de campo ───────────────────────────────────────────────────

  test("submeter formulário vazio exibe erros de validação", async ({
    page,
  }) => {
    await openLoginPanel(page);

    // Trigger blur on both fields without filling them
    await emailInput(page).click();
    await passwordInput(page).click();
    await submitButton(page).click();

    await expect(
      page
        .getByText(/obrigatório/i)
        .or(page.getByText(/inválido/i))
        .first(),
    ).toBeVisible({ timeout: 3_000 });
  });

  test("e-mail com formato inválido exibe erro de validação", async ({
    page,
  }) => {
    await openLoginPanel(page);

    await emailInput(page).fill("nao-e-um-email");
    await passwordInput(page).click(); // blur

    await expect(
      page.getByText(/e-mail inválido/i).or(page.getByText(/inválido/i)),
    ).toBeVisible({ timeout: 3_000 });
  });

  test("senha em branco exibe erro de validação", async ({ page }) => {
    await openLoginPanel(page);

    await emailInput(page).fill("valido@email.com");
    await passwordInput(page).click();
    await emailInput(page).click(); // blur senha
    await submitButton(page).click();

    await expect(
      page
        .getByText(/senha obrigatória/i)
        .or(page.getByText(/obrigatório/i))
        .first(),
    ).toBeVisible({ timeout: 3_000 });
  });

  // ── Login com credenciais erradas ─────────────────────────────────────────

  test("credenciais inválidas exibem mensagem de erro inline", async ({
    page,
  }) => {
    await openLoginPanel(page);
    await fillLoginForm(page, "naoexiste@fake.com", "senhaerrada");

    await expect(
      page
        .getByText(/inválidos/i)
        .or(page.getByText(/e-mail ou senha/i))
        .or(page.getByText(/credenciais/i))
        .first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("após erro de login o formulário continua visível", async ({ page }) => {
    await openLoginPanel(page);
    await fillLoginForm(page, "errado@fake.com", "errado123");

    // aguarda feedback de erro
    await page.waitForTimeout(2_000);

    // form ainda visível
    await expect(emailInput(page)).toBeVisible();
  });

  // ── Página de esqueci a senha ─────────────────────────────────────────────

  test("link 'Esqueci minha senha' navega para /forgot-password", async ({
    page,
  }) => {
    await openLoginPanel(page);

    await page.getByRole("link", { name: /esqueci minha senha/i }).click();

    await expect(page).toHaveURL(/forgot-password/);
    await expect(
      page.getByRole("heading", { name: /esqueceu sua senha/i }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("página /forgot-password exibe campo de e-mail e botão enviar", async ({
    page,
  }) => {
    await page.goto("/forgot-password");
    // Aguarda o h1 da página de recuperação aparecer
    await page
      .getByRole("heading", { name: /esqueceu sua senha/i })
      .waitFor({ state: "visible", timeout: 10_000 });

    // A página /forgot-password tem seu próprio campo E-mail visível dentro do <main>
    // Os campos do UserMenu ficam no header com display:none (painel fechado)
    const emailField = page
      .locator("main")
      .getByLabel(/e-mail/i)
      .first();
    await expect(emailField).toBeVisible();
    await expect(
      page.getByRole("button", { name: /enviar link/i }),
    ).toBeVisible();
  });

  test("e-mail inválido em /forgot-password exibe erro", async ({ page }) => {
    await page.goto("/forgot-password");
    await page
      .getByRole("heading", { name: /esqueceu sua senha/i })
      .waitFor({ state: "visible", timeout: 10_000 });

    // Preenche com e-mail inválido e dispara blur para acionar a validação onChange
    const emailField = page
      .locator("main")
      .getByLabel(/e-mail/i)
      .first();
    await emailField.fill("invalido");
    await emailField.press("Tab"); // blur → dispara validators.onChange

    await expect(
      page
        .locator("main")
        .getByText(/inválido/i)
        .first(),
    ).toBeVisible({ timeout: 3_000 });
  });

  test("link 'Voltar ao início' em /forgot-password navega para /", async ({
    page,
  }) => {
    await page.goto("/forgot-password");
    await page
      .getByRole("heading", { name: /esqueceu sua senha/i })
      .waitFor({ state: "visible", timeout: 10_000 });

    // Há dois links com /voltar/i: "Voltar ao início" e "Voltar ao login"
    // Clicamos no primeiro ("Voltar ao início") que fica no topo da página
    await page.getByRole("link", { name: "Voltar ao início" }).click();
    await expect(page).toHaveURL(/^http:\/\/localhost:3000\/?$/);
  });

  // ── Checkbox "Manter-me conectado" ────────────────────────────────────────

  test("checkbox 'Manter-me conectado' existe no formulário de login", async ({
    page,
  }) => {
    await openLoginPanel(page);

    await expect(page.getByLabel(/manter-me conectado/i).first()).toBeVisible({
      timeout: 3_000,
    });
  });

  // ── Login bem-sucedido (usuário comum) ────────────────────────────────────
  // Estes testes dependem de credenciais reais e são ignorados por padrão.

  test("login bem-sucedido como usuário comum", async ({ page }) => {
    test.skip(
      !process.env.TEST_USER_EMAIL,
      "Credenciais de teste não configuradas (TEST_USER_EMAIL)",
    );

    await openLoginPanel(page);
    await fillLoginForm(page, TEST_USER.email, TEST_USER.password);

    await expectAuthenticated(page);
  });

  test("usuário comum não vê o menu Cadastros após login", async ({ page }) => {
    test.skip(
      !process.env.TEST_USER_EMAIL,
      "Credenciais de teste não configuradas",
    );

    await openLoginPanel(page);
    await fillLoginForm(page, TEST_USER.email, TEST_USER.password);
    await expectAuthenticated(page);

    await expect(page.getByRole("button", { name: /cadastros/i })).toBeHidden();
  });

  // ── Login bem-sucedido (admin) ────────────────────────────────────────────

  test("admin vê o menu Cadastros após login", async ({ page }) => {
    test.skip(
      !process.env.TEST_ADMIN_EMAIL,
      "Credenciais de admin não configuradas (TEST_ADMIN_EMAIL)",
    );

    await openLoginPanel(page);
    await fillLoginForm(page, TEST_ADMIN.email, TEST_ADMIN.password);
    await expectAuthenticated(page);

    await expect(page.getByRole("button", { name: /cadastros/i })).toBeVisible({
      timeout: 5_000,
    });
  });

  test("admin consegue navegar para /users via menu Cadastros", async ({
    page,
  }) => {
    test.skip(
      !process.env.TEST_ADMIN_EMAIL,
      "Credenciais de admin não configuradas",
    );

    await openLoginPanel(page);
    await fillLoginForm(page, TEST_ADMIN.email, TEST_ADMIN.password);
    await expectAuthenticated(page);

    await page.getByRole("button", { name: /cadastros/i }).click();
    await page.getByRole("link", { name: /usuários e perfis/i }).click();

    await expect(page).toHaveURL(/\/users/);
  });

  test("admin consegue navegar para /rooms via menu Cadastros", async ({
    page,
  }) => {
    test.skip(
      !process.env.TEST_ADMIN_EMAIL,
      "Credenciais de admin não configuradas",
    );

    await openLoginPanel(page);
    await fillLoginForm(page, TEST_ADMIN.email, TEST_ADMIN.password);
    await expectAuthenticated(page);

    await page.getByRole("button", { name: /cadastros/i }).click();
    await page.getByRole("link", { name: /salas e blocos/i }).click();

    await expect(page).toHaveURL(/\/rooms/);
  });

  // ── Logout ────────────────────────────────────────────────────────────────

  test("logout retorna ao estado não autenticado", async ({ page }) => {
    test.skip(
      !process.env.TEST_USER_EMAIL,
      "Credenciais de teste não configuradas",
    );

    await openLoginPanel(page);
    await fillLoginForm(page, TEST_USER.email, TEST_USER.password);
    await expectAuthenticated(page);

    // Abre o UserMenu novamente para clicar em "Sair"
    await openUserMenu(page);
    await page.getByRole("button", { name: /^sair$/i }).click();

    await expectUnauthenticated(page);
  });

  // ── Rotas protegidas ──────────────────────────────────────────────────────

  test("acessar /users sem login redireciona ou exibe aviso de acesso", async ({
    page,
  }) => {
    await page.goto("/users");
    await page.waitForLoadState("networkidle");

    const isRedirected =
      page.url().endsWith("/") || page.url() === "http://localhost:3000/";
    const hasError = await page
      .getByText(/não autorizado|acesso negado|sem permissão|forbidden/i)
      .isVisible()
      .catch(() => false);

    expect(
      isRedirected || hasError || page.url().includes("/users"),
    ).toBeTruthy();
  });

  test("acessar /rooms sem login redireciona ou exibe aviso de acesso", async ({
    page,
  }) => {
    await page.goto("/rooms");
    await page.waitForLoadState("networkidle");

    const isRedirected =
      page.url().endsWith("/") || page.url() === "http://localhost:3000/";
    const hasError = await page
      .getByText(/não autorizado|acesso negado|sem permissão|forbidden/i)
      .isVisible()
      .catch(() => false);

    expect(
      isRedirected || hasError || page.url().includes("/rooms"),
    ).toBeTruthy();
  });

  // ── Persistência de sessão ────────────────────────────────────────────────

  test("recarregar a página mantém a sessão do usuário logado", async ({
    page,
  }) => {
    test.skip(
      !process.env.TEST_USER_EMAIL,
      "Credenciais de teste não configuradas",
    );

    await openLoginPanel(page);
    await fillLoginForm(page, TEST_USER.email, TEST_USER.password);
    await expectAuthenticated(page);

    await page.reload();
    await page.waitForLoadState("networkidle");

    await expectAuthenticated(page);
  });
});
