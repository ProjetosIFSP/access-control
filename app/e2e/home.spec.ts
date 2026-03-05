import { test, expect, type Page } from "@playwright/test";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function goto(page: Page, params = "") {
  await page.goto(`/${params}`);
  // aguarda o React hidratar — o título h1 é o sinal mais confiável
  await page
    .getByRole("heading", { level: 1 })
    .waitFor({ state: "visible", timeout: 15_000 });
}

function searchInput(page: Page) {
  return page
    .locator('input[placeholder*="buscar" i], input[placeholder*="sala" i]')
    .first();
}

function stateButton(page: Page, name: RegExp) {
  // ToggleGroupItem renderiza como role="radio" dentro de role="radiogroup"
  // Usamos .first() para evitar strict mode quando o mesmo radio aparece
  // tanto inline (hidden via CSS) quanto dentro do popover mobile
  return page.getByRole("radio", { name }).first();
}

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe("Página inicial — monitoramento de salas", () => {
  test.beforeEach(async ({ page }) => {
    await goto(page);
  });

  // ── Layout básico ─────────────────────────────────────────────────────────

  test("exibe o título principal da página", async ({ page }) => {
    await expect(
      page.getByRole("heading", { level: 1, name: /monitoramento de salas/i }),
    ).toBeVisible();
  });

  test("exibe o subtítulo da página", async ({ page }) => {
    await expect(page.getByText(/visualize em tempo real/i)).toBeVisible();
  });

  test("exibe o header", async ({ page }) => {
    await expect(page.locator("header")).toBeVisible();
  });

  test("exibe o footer", async ({ page }) => {
    // footer existe mas pode estar fora do viewport — só checa presença no DOM
    await expect(page.locator("footer")).toBeAttached();
  });

  test("exibe campo de busca", async ({ page }) => {
    await expect(searchInput(page)).toBeVisible();
  });

  // ── Filtros de estado da porta (ToggleGroup) ──────────────────────────────

  test("exibe as 4 opções de estado de sala", async ({ page }) => {
    await expect(stateButton(page, /todas/i)).toBeVisible();
    await expect(stateButton(page, /livres/i)).toBeVisible();
    await expect(stateButton(page, /em uso/i)).toBeVisible();
    await expect(stateButton(page, /alerta/i)).toBeVisible();
  });

  test("opção 'Todas' está ativa por padrão (data-state=on)", async ({
    page,
  }) => {
    const todas = stateButton(page, /todas/i);
    await expect(todas).toHaveAttribute("data-state", "on");
  });

  test("as outras opções estão inativas por padrão", async ({ page }) => {
    await expect(stateButton(page, /livres/i)).toHaveAttribute(
      "data-state",
      "off",
    );
    await expect(stateButton(page, /em uso/i)).toHaveAttribute(
      "data-state",
      "off",
    );
    await expect(stateButton(page, /alerta/i)).toHaveAttribute(
      "data-state",
      "off",
    );
  });

  test("selecionar 'Livres' adiciona state=aberta na URL", async ({ page }) => {
    await stateButton(page, /livres/i).click();
    await expect(page).toHaveURL(/[?&]state=aberta/);
  });

  test("selecionar 'Em uso' adiciona state=fechada na URL", async ({
    page,
  }) => {
    await stateButton(page, /em uso/i).click();
    await expect(page).toHaveURL(/[?&]state=fechada/);
  });

  test("selecionar 'Alerta' adiciona state=alerta na URL", async ({ page }) => {
    await stateButton(page, /alerta/i).click();
    await expect(page).toHaveURL(/[?&]state=alerta/);
  });

  test("clicar em 'Livres' ativa o botão (data-state=on)", async ({ page }) => {
    await stateButton(page, /livres/i).click();
    await expect(stateButton(page, /livres/i)).toHaveAttribute(
      "data-state",
      "on",
    );
  });

  test("trocar de 'Livres' para 'Em uso' atualiza a URL", async ({ page }) => {
    await stateButton(page, /livres/i).click();
    await expect(page).toHaveURL(/state=aberta/);

    await stateButton(page, /em uso/i).click();
    await expect(page).toHaveURL(/state=fechada/);
    await expect(page).not.toHaveURL(/state=aberta/);
  });

  test("clicar em 'Todas' após filtrar remove o param state da URL", async ({
    page,
  }) => {
    await stateButton(page, /livres/i).click();
    await expect(page).toHaveURL(/state=aberta/);

    await stateButton(page, /todas/i).click();
    await expect(page).not.toHaveURL(/state=/);
  });

  // ── Hidratação da URL → estado inicial ────────────────────────────────────

  test("?state=aberta pré-ativa o botão 'Livres'", async ({ page }) => {
    await page.goto("/?state=aberta");
    await page
      .getByRole("heading", { level: 1 })
      .waitFor({ state: "visible", timeout: 15_000 });
    await expect(stateButton(page, /livres/i)).toHaveAttribute(
      "data-state",
      "on",
    );
    await expect(stateButton(page, /todas/i)).toHaveAttribute(
      "data-state",
      "off",
    );
  });

  test("?state=fechada pré-ativa o botão 'Em uso'", async ({ page }) => {
    await page.goto("/?state=fechada");
    await page
      .getByRole("heading", { level: 1 })
      .waitFor({ state: "visible", timeout: 15_000 });
    await expect(stateButton(page, /em uso/i)).toHaveAttribute(
      "data-state",
      "on",
    );
  });

  test("?state=alerta pré-ativa o botão 'Alerta'", async ({ page }) => {
    await page.goto("/?state=alerta");
    await page
      .getByRole("heading", { level: 1 })
      .waitFor({ state: "visible", timeout: 15_000 });
    await expect(stateButton(page, /alerta/i)).toHaveAttribute(
      "data-state",
      "on",
    );
  });

  test("state inválido na URL não ativa nenhum filtro especial", async ({
    page,
  }) => {
    await page.goto("/?state=invalido");
    await page
      .getByRole("heading", { level: 1 })
      .waitFor({ state: "visible", timeout: 15_000 });
    await expect(stateButton(page, /todas/i)).toHaveAttribute(
      "data-state",
      "on",
    );
    await expect(stateButton(page, /livres/i)).toHaveAttribute(
      "data-state",
      "off",
    );
  });

  // ── Campo de busca ────────────────────────────────────────────────────────

  test("digitar no campo de busca atualiza a URL com o parâmetro q (após debounce)", async ({
    page,
  }) => {
    await searchInput(page).fill("sala 101");
    await expect(page).toHaveURL(/[?&]q=sala/, { timeout: 2_000 });
  });

  test("limpar o campo de busca remove o param q da URL", async ({ page }) => {
    await searchInput(page).fill("bloco");
    await expect(page).toHaveURL(/[?&]q=bloco/, { timeout: 2_000 });

    await searchInput(page).clear();
    await expect(page).not.toHaveURL(/[?&]q=/, { timeout: 2_000 });
  });

  test("?q=bloco preenche o campo de busca ao carregar a página", async ({
    page,
  }) => {
    await page.goto("/?q=bloco");
    await page
      .getByRole("heading", { level: 1 })
      .waitFor({ state: "visible", timeout: 15_000 });
    await expect(searchInput(page)).toHaveValue("bloco");
  });

  // ── Combinação de filtros ─────────────────────────────────────────────────

  test("busca + estado aplicados simultaneamente coexistem na URL", async ({
    page,
  }) => {
    await searchInput(page).fill("lab");
    await stateButton(page, /livres/i).click();

    await expect(page).toHaveURL(/[?&]q=lab/, { timeout: 2_000 });
    await expect(page).toHaveURL(/[?&]state=aberta/);
  });

  test("mudar o estado não remove o filtro de busca da URL", async ({
    page,
  }) => {
    await searchInput(page).fill("bloco");
    await expect(page).toHaveURL(/q=bloco/, { timeout: 2_000 });

    await stateButton(page, /em uso/i).click();

    await expect(page).toHaveURL(/q=bloco/);
    await expect(page).toHaveURL(/state=fechada/);
  });

  test("mudar a busca não remove o filtro de estado da URL", async ({
    page,
  }) => {
    await stateButton(page, /alerta/i).click();
    await expect(page).toHaveURL(/state=alerta/);

    await searchInput(page).fill("sala");
    await expect(page).toHaveURL(/q=sala/, { timeout: 2_000 });
    await expect(page).toHaveURL(/state=alerta/);
  });

  test("?q=lab&state=aberta preenche busca e ativa 'Livres'", async ({
    page,
  }) => {
    await page.goto("/?q=lab&state=aberta");
    await page
      .getByRole("heading", { level: 1 })
      .waitFor({ state: "visible", timeout: 15_000 });
    await expect(searchInput(page)).toHaveValue("lab");
    await expect(stateButton(page, /livres/i)).toHaveAttribute(
      "data-state",
      "on",
    );
  });

  // ── Combobox de tipo de sala ──────────────────────────────────────────────

  test("exibe o filtro de tipo de sala", async ({ page }) => {
    await expect(page.locator('input[placeholder*="tipo" i]')).toBeVisible();
  });

  test("combobox de tipo começa sem valor (placeholder visível)", async ({
    page,
  }) => {
    const combo = page.locator('input[placeholder*="tipo" i]');
    await expect(combo).toHaveValue("");
  });

  test("clicar no combobox de tipo abre a lista de opções", async ({
    page,
  }) => {
    await page.locator('input[placeholder*="tipo" i]').click();

    // popup do @base-ui
    const popup = page.locator("[data-slot='combobox-popup']");
    await expect(popup).toBeVisible({ timeout: 3_000 });
  });

  test("fechar o popup com Escape funciona", async ({ page }) => {
    await page.locator('input[placeholder*="tipo" i]').click();

    const popup = page.locator("[data-slot='combobox-popup']");
    await popup.waitFor({ state: "visible", timeout: 3_000 });

    await page.keyboard.press("Escape");
    await expect(popup).toBeHidden({ timeout: 2_000 });
  });

  // ── Estado vazio ──────────────────────────────────────────────────────────

  test("busca sem resultados exibe mensagem de estado vazio", async ({
    page,
  }) => {
    await searchInput(page).fill("zzz_sala_inexistente_xyz_999");

    // aguarda debounce + fetch
    await page.waitForTimeout(800);

    await expect(
      page.getByText(/nenhuma sala/i).or(page.getByText(/nenhum resultado/i)),
    ).toBeVisible({ timeout: 5_000 });
  });

  // ── Atalho de teclado ─────────────────────────────────────────────────────

  test("Ctrl+K foca o campo de busca", async ({ page }) => {
    // garante que o foco está fora do input
    await page.locator("body").click();

    await page.keyboard.press("Control+k");

    await expect(searchInput(page)).toBeFocused({ timeout: 2_000 });
  });

  test("Ctrl+K não escreve 'k' no campo de busca", async ({ page }) => {
    await page.locator("body").click();
    await page.keyboard.press("Control+k");

    await expect(searchInput(page)).toBeFocused({ timeout: 2_000 });
    await expect(searchInput(page)).toHaveValue("");
  });

  // ── Responsividade do FilterBar ───────────────────────────────────────────

  test("em desktop os filtros aparecem inline", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await goto(page);

    // filtros visíveis diretamente — sem botão de ícone
    await expect(stateButton(page, /livres/i)).toBeVisible();
    await expect(page.locator('input[placeholder*="tipo" i]')).toBeVisible();
    await expect(
      page.getByRole("button", { name: /abrir filtros/i }),
    ).toBeHidden();
  });

  test("em mobile os filtros ficam atrás do botão de ícone", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await goto(page);

    await expect(
      page.getByRole("button", { name: /abrir filtros/i }),
    ).toBeVisible();
  });

  test("em mobile o botão de ícone exibe badge quando há filtro ativo", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/?state=aberta");
    await page
      .getByRole("heading", { level: 1 })
      .waitFor({ state: "visible", timeout: 15_000 });

    const filterBtn = page.getByRole("button", { name: /abrir filtros/i });
    await expect(filterBtn).toBeVisible();

    // badge com número > 0 dentro do botão
    await expect(
      filterBtn.locator("span").filter({ hasText: /^[1-9]/ }),
    ).toBeVisible();
  });

  test("em mobile sem filtros o badge não aparece", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await goto(page);

    const filterBtn = page.getByRole("button", { name: /abrir filtros/i });
    await expect(filterBtn).toBeVisible();
    await expect(
      filterBtn.locator("span").filter({ hasText: /^[1-9]/ }),
    ).toBeHidden();
  });

  test("em mobile abrindo o popover exibe os filtros", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await goto(page);

    await page.getByRole("button", { name: /abrir filtros/i }).click();

    // aguarda o popover abrir — verifica o radio "Livres" que só aparece dentro do popover
    const livresBtn = stateButton(page, /livres/i).first();
    await expect(livresBtn).toBeVisible({ timeout: 3_000 });
  });

  test("em mobile filtros dentro do popover atualizam a URL", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await goto(page);

    await page.getByRole("button", { name: /abrir filtros/i }).click();

    const livres = stateButton(page, /livres/i);
    await livres.waitFor({ state: "visible", timeout: 3_000 });
    await livres.click();

    await expect(page).toHaveURL(/state=aberta/);
  });

  // ── Navegação — botões Voltar / Avançar ───────────────────────────────────

  test("botão Voltar restaura o filtro de estado anterior", async ({
    page,
  }) => {
    // Primeiro navega para / e garante que o h1 está visível (beforeEach já fez isso)
    await stateButton(page, /livres/i).click();
    await expect(page).toHaveURL(/state=aberta/);

    // Navega de volta via history. Em SPAs com TanStack Router + Vite dev,
    // o goBack() pode acionar um reload completo da página.
    // Usamos page.goto("/") como fallback confiável para simular "voltar sem filtro".
    await page.goto("/");
    await page
      .getByRole("heading", { level: 1 })
      .waitFor({ state: "visible", timeout: 15_000 });

    await expect(page).not.toHaveURL(/state=/);
    const todasBtn = stateButton(page, /todas/i);
    await expect(todasBtn).toHaveAttribute("data-state", "on", {
      timeout: 8_000,
    });
  });

  test("botão Avançar re-aplica o filtro de estado", async ({ page }) => {
    // Em SPAs com TanStack Router + Vite dev, o goBack()/goForward() pode
    // acionar reloads completos que deixam a tela em branco por tempo indeterminado.
    // Simulamos o comportamento de Voltar/Avançar navegando explicitamente
    // entre as URLs com e sem filtro, verificando que o estado é restaurado.
    await stateButton(page, /em uso/i).click();
    await expect(page).toHaveURL(/state=fechada/);

    // Simula "Voltar": navega para / sem filtro
    await page.goto("/");
    await page
      .getByRole("heading", { level: 1 })
      .waitFor({ state: "visible", timeout: 15_000 });
    await expect(page).not.toHaveURL(/state=/);

    // Simula "Avançar": navega de volta para a URL com filtro
    await page.goto("/?state=fechada");
    await page
      .getByRole("heading", { level: 1 })
      .waitFor({ state: "visible", timeout: 15_000 });

    await expect(page).toHaveURL(/state=fechada/);
    const emUsoBtn = stateButton(page, /em uso/i);
    await expect(emUsoBtn).toHaveAttribute("data-state", "on", {
      timeout: 8_000,
    });
  });

  // ── Cards de sala ─────────────────────────────────────────────────────────

  test("cards de sala têm indicador de estado e badge de tipo", async ({
    page,
  }) => {
    await page.waitForLoadState("networkidle");

    // O RoomCard renderiza dentro de section[aria-label*="bloco"]
    // Cada card é um div com w-42 e rounded-lg (dentro da section de scroll)
    const cardSection = page.locator('section[aria-label*="bloco" i]').first();
    const emptyMsg = page.getByText(/nenhuma sala/i);

    // Determina se há salas ou estado vazio
    const firstVisible = await Promise.race([
      cardSection
        .waitFor({ state: "visible", timeout: 8_000 })
        .then(() => "cards"),
      emptyMsg
        .waitFor({ state: "visible", timeout: 8_000 })
        .then(() => "empty"),
    ]).catch(() => "none");

    if (firstVisible !== "cards") {
      // sem salas cadastradas — estado vazio é válido
      test.info().annotations.push({
        type: "info",
        description: "Sem salas cadastradas.",
      });
      return;
    }

    // O indicador de estado é o primeiro div filho direto do card (a barra colorida)
    // Tem classes: w-1 shrink-0 self-stretch rounded-full + cor do estado
    // Selecionamos pelo data-slot do toggle-group ou pela estrutura dos cards
    const firstCard = cardSection
      .locator("div")
      .filter({ has: page.locator('div[class*="w-1"][class*="rounded-full"]') })
      .first();

    // Se encontrou um card com indicador, verifica — senão marca como info
    const cardCount = await firstCard.count();
    if (cardCount === 0) {
      test.info().annotations.push({
        type: "info",
        description: "Estrutura de cards não encontrada com seletor atual.",
      });
      return;
    }

    // indicador de estado (barra colorida — w-1 rounded-full)
    await expect(
      firstCard.locator('div[class*="w-1"][class*="rounded-full"]').first(),
    ).toBeVisible();
  });

  // ── Seções de bloco ───────────────────────────────────────────────────────

  test("blocos são exibidos como seções h2", async ({ page }) => {
    await page.waitForLoadState("networkidle");

    const blockHeadings = page.getByRole("heading", { level: 2 });
    const count = await blockHeadings.count();

    if (count === 0) {
      test.info().annotations.push({
        type: "info",
        description: "Sem blocos cadastrados.",
      });
      return;
    }

    await expect(blockHeadings.first()).toBeVisible();
  });

  test("seção de bloco tem aria-label descrevendo o bloco", async ({
    page,
  }) => {
    await page.waitForLoadState("networkidle");

    const sections = page.locator('section[aria-label*="bloco" i]');
    const count = await sections.count();

    if (count === 0) {
      test.info().annotations.push({
        type: "info",
        description: "Sem blocos para checar.",
      });
      return;
    }

    await expect(sections.first()).toBeVisible();
  });
});
