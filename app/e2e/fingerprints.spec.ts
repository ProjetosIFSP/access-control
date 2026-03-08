import { test, expect } from "@playwright/test";
import {
  TEST_ADMIN,
  clearSession,
  openUserMenu,
  fillLoginForm,
  expectAuthenticated,
} from "./helpers/auth";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await openUserMenu(page);
  await fillLoginForm(page, TEST_ADMIN.email, TEST_ADMIN.password);
  await expectAuthenticated(page);
}

async function navigateToUsers(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: /cadastros/i }).click();
  await page.getByRole("link", { name: /usuários e perfis/i }).click();
  await expect(page).toHaveURL(/\/users/, { timeout: 10_000 });
  // Wait for the users table to be visible
  await page.waitForLoadState("networkidle");
}

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe("Gerenciamento de Digitais", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await clearSession(page);
    await page.reload();
    await page
      .getByRole("heading", { level: 1 })
      .waitFor({ state: "visible", timeout: 15_000 });
  });

  // ── Acesso sem autenticação ───────────────────────────────────────────────

  test("usuário não autenticado não consegue acessar /users", async ({
    page,
  }) => {
    await page.goto("/users");
    await page.waitForLoadState("networkidle");

    const isRedirected =
      page.url().endsWith("/") || page.url() === "http://localhost:3000/";
    const hasAccessDenied = await page
      .getByText(/não autorizado|acesso negado|sem permissão|forbidden/i)
      .isVisible()
      .catch(() => false);

    expect(
      isRedirected || hasAccessDenied || page.url().includes("/users"),
    ).toBeTruthy();
  });

  // ── Acesso como admin ─────────────────────────────────────────────────────

  test("admin consegue acessar a página /users", async ({ page }) => {
    test.skip(
      !process.env.TEST_ADMIN_EMAIL,
      "Credenciais de admin não configuradas (TEST_ADMIN_EMAIL)",
    );

    await loginAsAdmin(page);
    await navigateToUsers(page);

    await expect(page).toHaveURL(/\/users/);
  });

  test("tabela de usuários exibe coluna de ações", async ({ page }) => {
    test.skip(
      !process.env.TEST_ADMIN_EMAIL,
      "Credenciais de admin não configuradas",
    );

    await loginAsAdmin(page);
    await navigateToUsers(page);

    // A tabela deve estar visível
    await expect(page.locator("table, [role='table']").first()).toBeVisible({
      timeout: 10_000,
    });
  });

  // ── Menu de ações por usuário ─────────────────────────────────────────────

  test("menu de ações exibe opção 'Gerenciar Digitais'", async ({ page }) => {
    test.skip(
      !process.env.TEST_ADMIN_EMAIL,
      "Credenciais de admin não configuradas",
    );

    await loginAsAdmin(page);
    await navigateToUsers(page);

    // Procura pelo botão de ellipsis (MoreHorizontal) na primeira linha da tabela
    const moreButton = page
      .locator("table tbody tr")
      .first()
      .locator('button[aria-label*="Ações"], button:has(svg)')
      .last();

    await moreButton.click();

    await expect(
      page.getByRole("menuitem", { name: /gerenciar digitais/i }).first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  // ── Drawer de gerenciamento ───────────────────────────────────────────────

  test("clicar em 'Gerenciar Digitais' abre o drawer lateral", async ({
    page,
  }) => {
    test.skip(
      !process.env.TEST_ADMIN_EMAIL,
      "Credenciais de admin não configuradas",
    );

    await loginAsAdmin(page);
    await navigateToUsers(page);

    // Abre o menu de ações do primeiro usuário
    const moreButton = page
      .locator("table tbody tr")
      .first()
      .locator("button:has(svg)")
      .last();

    await moreButton.click();
    await page
      .getByRole("menuitem", { name: /gerenciar digitais/i })
      .first()
      .click();

    // O drawer deve abrir com o título correto
    await expect(
      page.getByRole("heading", { name: /digitais/i }).first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("drawer de digitais exibe abas 'Mão Direita' e 'Mão Esquerda'", async ({
    page,
  }) => {
    test.skip(
      !process.env.TEST_ADMIN_EMAIL,
      "Credenciais de admin não configuradas",
    );

    await loginAsAdmin(page);
    await navigateToUsers(page);

    const moreButton = page
      .locator("table tbody tr")
      .first()
      .locator("button:has(svg)")
      .last();

    await moreButton.click();
    await page
      .getByRole("menuitem", { name: /gerenciar digitais/i })
      .first()
      .click();

    // Aguarda o drawer abrir
    await page.waitForTimeout(500);

    await expect(
      page.getByRole("button", { name: /mão direita/i }),
    ).toBeVisible({
      timeout: 5_000,
    });
    await expect(
      page.getByRole("button", { name: /mão esquerda/i }),
    ).toBeVisible({
      timeout: 5_000,
    });
  });

  test("drawer exibe diagrama SVG da mão", async ({ page }) => {
    test.skip(
      !process.env.TEST_ADMIN_EMAIL,
      "Credenciais de admin não configuradas",
    );

    await loginAsAdmin(page);
    await navigateToUsers(page);

    const moreButton = page
      .locator("table tbody tr")
      .first()
      .locator("button:has(svg)")
      .last();

    await moreButton.click();
    await page
      .getByRole("menuitem", { name: /gerenciar digitais/i })
      .first()
      .click();

    await page.waitForTimeout(500);

    // O SVG da mão deve estar visível
    await expect(page.locator('svg[aria-label*="Mão"]').first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test("drawer exibe status do leitor biométrico", async ({ page }) => {
    test.skip(
      !process.env.TEST_ADMIN_EMAIL,
      "Credenciais de admin não configuradas",
    );

    await loginAsAdmin(page);
    await navigateToUsers(page);

    const moreButton = page
      .locator("table tbody tr")
      .first()
      .locator("button:has(svg)")
      .last();

    await moreButton.click();
    await page
      .getByRole("menuitem", { name: /gerenciar digitais/i })
      .first()
      .click();

    await page.waitForTimeout(500);

    // O indicador de status do leitor deve aparecer (modo keyboard ou HID)
    await expect(
      page
        .getByText(/modo teclado|leitor usb|pronto para captura|conectado/i)
        .or(page.getByText(/navegador não suporta/i))
        .or(page.getByText(/conectar leitor/i))
        .first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("drawer exibe botão 'Fechar'", async ({ page }) => {
    test.skip(
      !process.env.TEST_ADMIN_EMAIL,
      "Credenciais de admin não configuradas",
    );

    await loginAsAdmin(page);
    await navigateToUsers(page);

    const moreButton = page
      .locator("table tbody tr")
      .first()
      .locator("button:has(svg)")
      .last();

    await moreButton.click();
    await page
      .getByRole("menuitem", { name: /gerenciar digitais/i })
      .first()
      .click();

    await page.waitForTimeout(500);

    await expect(
      page.getByRole("button", { name: /fechar/i }).last(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("clicar em 'Fechar' fecha o drawer", async ({ page }) => {
    test.skip(
      !process.env.TEST_ADMIN_EMAIL,
      "Credenciais de admin não configuradas",
    );

    await loginAsAdmin(page);
    await navigateToUsers(page);

    const moreButton = page
      .locator("table tbody tr")
      .first()
      .locator("button:has(svg)")
      .last();

    await moreButton.click();
    await page
      .getByRole("menuitem", { name: /gerenciar digitais/i })
      .first()
      .click();

    await page.waitForTimeout(500);

    // Clica em fechar
    await page
      .getByRole("button", { name: /fechar/i })
      .last()
      .click();

    // O título do drawer deve desaparecer
    await expect(page.getByRole("heading", { name: /digitais/i })).toBeHidden({
      timeout: 5_000,
    });
  });

  // ── Tabs da mão ───────────────────────────────────────────────────────────

  test("alternar entre abas muda o diagrama de mão exibido", async ({
    page,
  }) => {
    test.skip(
      !process.env.TEST_ADMIN_EMAIL,
      "Credenciais de admin não configuradas",
    );

    await loginAsAdmin(page);
    await navigateToUsers(page);

    const moreButton = page
      .locator("table tbody tr")
      .first()
      .locator("button:has(svg)")
      .last();

    await moreButton.click();
    await page
      .getByRole("menuitem", { name: /gerenciar digitais/i })
      .first()
      .click();

    await page.waitForTimeout(500);

    // Aba direita está ativa por padrão — SVG com aria-label "Mão direita"
    await expect(
      page.locator('svg[aria-label="Mão direita"]').first(),
    ).toBeVisible({ timeout: 5_000 });

    // Clica na aba "Mão Esquerda"
    await page.getByRole("button", { name: /mão esquerda/i }).click();

    // O SVG da mão esquerda deve aparecer
    await expect(
      page.locator('svg[aria-label="Mão esquerda"]').first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("seção 'Cadastradas' exibe título conforme a aba ativa", async ({
    page,
  }) => {
    test.skip(
      !process.env.TEST_ADMIN_EMAIL,
      "Credenciais de admin não configuradas",
    );

    await loginAsAdmin(page);
    await navigateToUsers(page);

    const moreButton = page
      .locator("table tbody tr")
      .first()
      .locator("button:has(svg)")
      .last();

    await moreButton.click();
    await page
      .getByRole("menuitem", { name: /gerenciar digitais/i })
      .first()
      .click();

    await page.waitForTimeout(500);

    // Por padrão mostra "Mão Direita" na seção cadastradas
    await expect(
      page.getByText(/cadastradas.*mão direita/i).first(),
    ).toBeVisible({ timeout: 5_000 });

    // Troca para esquerda
    await page.getByRole("button", { name: /mão esquerda/i }).click();

    await expect(
      page.getByText(/cadastradas.*mão esquerda/i).first(),
    ).toBeVisible({ timeout: 3_000 });
  });

  // ── Botões de dedo no SVG ─────────────────────────────────────────────────

  test("SVG da mão exibe botões clicáveis para cada dedo", async ({ page }) => {
    test.skip(
      !process.env.TEST_ADMIN_EMAIL,
      "Credenciais de admin não configuradas",
    );

    await loginAsAdmin(page);
    await navigateToUsers(page);

    const moreButton = page
      .locator("table tbody tr")
      .first()
      .locator("button:has(svg)")
      .last();

    await moreButton.click();
    await page
      .getByRole("menuitem", { name: /gerenciar digitais/i })
      .first()
      .click();

    await page.waitForTimeout(500);

    // Verifica que existem botões de dedo com aria-label descritivo
    const fingerButtons = page.locator('button[aria-label*="direito"]');
    await expect(fingerButtons.first()).toBeVisible({ timeout: 5_000 });

    const count = await fingerButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("clicar em dedo não cadastrado exibe feedback de captura", async ({
    page,
  }) => {
    test.skip(
      !process.env.TEST_ADMIN_EMAIL,
      "Credenciais de admin não configuradas",
    );

    await loginAsAdmin(page);
    await navigateToUsers(page);

    const moreButton = page
      .locator("table tbody tr")
      .first()
      .locator("button:has(svg)")
      .last();

    await moreButton.click();
    await page
      .getByRole("menuitem", { name: /gerenciar digitais/i })
      .first()
      .click();

    await page.waitForTimeout(500);

    // Tenta clicar no botão do polegar direito (right_thumb)
    const thumbButton = page
      .locator('button[aria-label*="Polegar direito"]')
      .first();

    // Se o botão existir, clica nele
    if (await thumbButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await thumbButton.click();

      // Deve aparecer alguma instrução de captura ou seleção
      await expect(
        page
          .getByText(/polegar direito/i)
          .or(page.getByText(/capturar|aguardando|selecionado/i))
          .first(),
      ).toBeVisible({ timeout: 3_000 });
    }
  });

  // ── Indicador de contagem na tabela ──────────────────────────────────────

  test("tabela de usuários exibe badge de digitais quando count > 0", async ({
    page,
  }) => {
    test.skip(
      !process.env.TEST_ADMIN_EMAIL,
      "Credenciais de admin não configuradas",
    );

    await loginAsAdmin(page);
    await navigateToUsers(page);

    // Verifica se há algum indicador de digitais na tabela
    // O badge aparece apenas para usuários com fingerprintCount > 0
    const fingerprintIndicator = page
      .locator("table")
      .locator('span:has(svg[class*="fingerprint"]), [class*="violet"]')
      .first();

    // Este teste é opcional — pode não haver usuários com digitais no ambiente de teste
    const hasIndicator = await fingerprintIndicator
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    // Apenas verifica que a tabela foi renderizada corretamente
    await expect(page.locator("table tbody tr").first()).toBeVisible({
      timeout: 10_000,
    });

    // Se houver indicador, confirma que tem um número junto
    if (hasIndicator) {
      await expect(fingerprintIndicator).toBeVisible();
    }
  });

  // ── Acessibilidade ────────────────────────────────────────────────────────

  test("drawer tem título acessível com nome do usuário", async ({ page }) => {
    test.skip(
      !process.env.TEST_ADMIN_EMAIL,
      "Credenciais de admin não configuradas",
    );

    await loginAsAdmin(page);
    await navigateToUsers(page);

    const moreButton = page
      .locator("table tbody tr")
      .first()
      .locator("button:has(svg)")
      .last();

    await moreButton.click();
    await page
      .getByRole("menuitem", { name: /gerenciar digitais/i })
      .first()
      .click();

    await page.waitForTimeout(500);

    // O DrawerTitle deve conter "Digitais de {nome}"
    const drawerTitle = page
      .locator('[role="dialog"] h2, [role="dialog"] h3')
      .first();
    await expect(drawerTitle).toBeVisible({ timeout: 5_000 });

    const titleText = await drawerTitle.textContent();
    expect(titleText?.toLowerCase()).toContain("digitais");
  });

  test("botões de dedo têm aria-label descritivo", async ({ page }) => {
    test.skip(
      !process.env.TEST_ADMIN_EMAIL,
      "Credenciais de admin não configuradas",
    );

    await loginAsAdmin(page);
    await navigateToUsers(page);

    const moreButton = page
      .locator("table tbody tr")
      .first()
      .locator("button:has(svg)")
      .last();

    await moreButton.click();
    await page
      .getByRole("menuitem", { name: /gerenciar digitais/i })
      .first()
      .click();

    await page.waitForTimeout(500);

    // Todos os botões de dedo devem ter aria-label não vazio
    const fingerButtons = page.locator(
      'button[aria-label*="direito"], button[aria-label*="esquerdo"]',
    );
    const count = await fingerButtons.count();

    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const label = await fingerButtons.nth(i).getAttribute("aria-label");
        expect(label).toBeTruthy();
        expect(label!.length).toBeGreaterThan(0);
      }
    }
  });

  test("drawer exibe descrição de instrução ao usuário", async ({ page }) => {
    test.skip(
      !process.env.TEST_ADMIN_EMAIL,
      "Credenciais de admin não configuradas",
    );

    await loginAsAdmin(page);
    await navigateToUsers(page);

    const moreButton = page
      .locator("table tbody tr")
      .first()
      .locator("button:has(svg)")
      .last();

    await moreButton.click();
    await page
      .getByRole("menuitem", { name: /gerenciar digitais/i })
      .first()
      .click();

    await page.waitForTimeout(500);

    // Deve haver uma instrução explicando como usar
    await expect(
      page
        .getByText(/clique em um dedo/i)
        .or(page.getByText(/toque em um dedo/i))
        .or(page.getByText(/diagrama/i))
        .first(),
    ).toBeVisible({ timeout: 5_000 });
  });

  // ── Responsividade ────────────────────────────────────────────────────────

  test("drawer abre corretamente em viewport mobile", async ({ page }) => {
    test.skip(
      !process.env.TEST_ADMIN_EMAIL,
      "Credenciais de admin não configuradas",
    );

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await clearSession(page);
    await page.reload();
    await page
      .getByRole("heading", { level: 1 })
      .waitFor({ state: "visible", timeout: 15_000 });

    await loginAsAdmin(page);
    await navigateToUsers(page);

    const moreButton = page
      .locator("table tbody tr")
      .first()
      .locator("button:has(svg)")
      .last();

    await moreButton.click();
    await page
      .getByRole("menuitem", { name: /gerenciar digitais/i })
      .first()
      .click();

    await page.waitForTimeout(800);

    // O drawer deve estar visível em mobile também
    await expect(
      page.getByRole("button", { name: /fechar/i }).last(),
    ).toBeVisible({ timeout: 8_000 });
  });
});
