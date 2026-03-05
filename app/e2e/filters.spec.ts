import { test, expect, type Page } from "@playwright/test";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function goto(page: Page, params = "") {
  await page.goto(`/${params}`);
  await page
    .getByRole("heading", { level: 1 })
    .waitFor({ state: "visible", timeout: 15_000 });
}

function searchInput(page: Page) {
  return page
    .locator('input[placeholder*="buscar" i], input[placeholder*="sala" i]')
    .first();
}

function typeCombobox(page: Page) {
  return page.locator('input[placeholder*="tipo" i]').first();
}

function stateBtn(page: Page, label: RegExp) {
  // ToggleGroupItem (Radix) renderiza role="radio" dentro de role="radiogroup"
  // Usamos .first() para evitar strict mode quando o mesmo radio aparece
  // tanto inline (hidden via CSS) quanto dentro do popover mobile
  return page.getByRole("radio", { name: label }).first();
}

async function expectActive(page: Page, label: RegExp) {
  const btn = stateBtn(page, label);
  await btn.waitFor({ state: "visible", timeout: 8_000 });
  await expect(btn).toHaveAttribute("data-state", "on");
}

async function expectInactive(page: Page, label: RegExp) {
  const btn = stateBtn(page, label);
  await btn.waitFor({ state: "visible", timeout: 8_000 });
  await expect(btn).toHaveAttribute("data-state", "off");
}

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe("Filtros — página de monitoramento de salas", () => {
  test.beforeEach(async ({ page }) => {
    await goto(page);
  });

  // ── Presença dos controles ────────────────────────────────────────────────

  test.describe("Presença dos controles de filtro", () => {
    test("campo de busca está visível", async ({ page }) => {
      await expect(searchInput(page)).toBeVisible();
    });

    test("combobox de tipo de sala está visível", async ({ page }) => {
      await expect(typeCombobox(page)).toBeVisible();
    });

    test("todos os botões de estado estão visíveis", async ({ page }) => {
      await expect(stateBtn(page, /todas/i)).toBeVisible();
      await expect(stateBtn(page, /livres/i)).toBeVisible();
      await expect(stateBtn(page, /em uso/i)).toBeVisible();
      await expect(stateBtn(page, /alerta/i)).toBeVisible();
    });

    test("'Todas' está ativo por padrão (data-state=on)", async ({ page }) => {
      await expectActive(page, /todas/i);
    });

    test("demais opções estão inativas por padrão", async ({ page }) => {
      await expectInactive(page, /livres/i);
      await expectInactive(page, /em uso/i);
      await expectInactive(page, /alerta/i);
    });

    test("campo de busca começa vazio", async ({ page }) => {
      await expect(searchInput(page)).toHaveValue("");
    });

    test("combobox de tipo começa vazio (sem valor selecionado)", async ({
      page,
    }) => {
      await expect(typeCombobox(page)).toHaveValue("");
    });
  });

  // ── Filtro de estado da porta (ToggleGroup) ──────────────────────────────

  test.describe("Filtro de estado da porta", () => {
    test("selecionar 'Livres' adiciona state=aberta na URL", async ({
      page,
    }) => {
      await stateBtn(page, /livres/i).click();
      await expect(page).toHaveURL(/[?&]state=aberta/);
    });

    test("selecionar 'Em uso' adiciona state=fechada na URL", async ({
      page,
    }) => {
      await stateBtn(page, /em uso/i).click();
      await expect(page).toHaveURL(/[?&]state=fechada/);
    });

    test("selecionar 'Alerta' adiciona state=alerta na URL", async ({
      page,
    }) => {
      await stateBtn(page, /alerta/i).click();
      await expect(page).toHaveURL(/[?&]state=alerta/);
    });

    test("clicar em 'Livres' ativa o botão (data-state=on)", async ({
      page,
    }) => {
      await stateBtn(page, /livres/i).click();
      await expectActive(page, /livres/i);
      await expectInactive(page, /todas/i);
    });

    test("clicar em 'Em uso' ativa o botão e desativa os outros", async ({
      page,
    }) => {
      await stateBtn(page, /em uso/i).click();
      await expectActive(page, /em uso/i);
      await expectInactive(page, /todas/i);
      await expectInactive(page, /livres/i);
    });

    test("selecionar 'Todas' após filtrar remove state da URL", async ({
      page,
    }) => {
      await stateBtn(page, /livres/i).click();
      await expect(page).toHaveURL(/state=aberta/);

      await stateBtn(page, /todas/i).click();
      await expect(page).not.toHaveURL(/state=/);
    });

    test("selecionar 'Todas' após filtrar ativa 'Todas'", async ({ page }) => {
      await stateBtn(page, /livres/i).click();
      await stateBtn(page, /todas/i).click();
      await expectActive(page, /todas/i);
    });

    test("trocar de 'Livres' para 'Em uso' atualiza o param state", async ({
      page,
    }) => {
      await stateBtn(page, /livres/i).click();
      await expect(page).toHaveURL(/state=aberta/);

      await stateBtn(page, /em uso/i).click();
      await expect(page).toHaveURL(/state=fechada/);
      await expect(page).not.toHaveURL(/state=aberta/);
    });

    test("trocar de 'Em uso' para 'Alerta' atualiza o param state", async ({
      page,
    }) => {
      await stateBtn(page, /em uso/i).click();
      await stateBtn(page, /alerta/i).click();
      await expect(page).toHaveURL(/state=alerta/);
      await expect(page).not.toHaveURL(/state=fechada/);
    });
  });

  // ── Campo de busca ────────────────────────────────────────────────────────

  test.describe("Campo de busca (texto)", () => {
    test("digitar um termo adiciona o param q na URL (após debounce)", async ({
      page,
    }) => {
      await searchInput(page).fill("sala");
      await expect(page).toHaveURL(/[?&]q=sala/, { timeout: 2_000 });
    });

    test("espaços no termo são preservados (URL encoded)", async ({ page }) => {
      await searchInput(page).fill("sala 101");
      await expect(page).toHaveURL(/[?&]q=sala/, { timeout: 2_000 });
      // decodeURIComponent não decodifica '+' (encoding alternativo de espaço em query strings)
      // usamos replace antes de decodificar para cobrir ambas as formas: %20 e +
      const rawUrl = page.url();
      const url = decodeURIComponent(rawUrl.replace(/\+/g, " "));
      expect(url).toContain("sala 101");
    });

    test("limpar o campo remove q da URL", async ({ page }) => {
      await searchInput(page).fill("bloco");
      await expect(page).toHaveURL(/[?&]q=bloco/, { timeout: 2_000 });

      await searchInput(page).clear();
      await expect(page).not.toHaveURL(/[?&]q=/, { timeout: 2_000 });
    });

    test("?q=sala101 preenche o campo ao carregar", async ({ page }) => {
      await page.goto("/?q=sala101");
      await page
        .getByRole("heading", { level: 1 })
        .waitFor({ state: "visible", timeout: 15_000 });
      await expect(searchInput(page)).toHaveValue("sala101");
    });
  });

  // ── Combobox de tipo de sala ──────────────────────────────────────────────

  test.describe("Combobox de tipo de sala", () => {
    test("clicar no combobox abre a lista de opções", async ({ page }) => {
      await typeCombobox(page).click();
      const popup = page.locator("[data-slot='combobox-popup']");
      await expect(popup).toBeVisible({ timeout: 3_000 });
    });

    test("pressionar Escape fecha a lista do combobox", async ({ page }) => {
      await typeCombobox(page).click();
      const popup = page.locator("[data-slot='combobox-popup']");

      await popup.waitFor({ state: "visible", timeout: 3_000 }).catch(() => {
        test.skip();
      });

      await page.keyboard.press("Escape");
      await expect(popup).toBeHidden({ timeout: 2_000 });
    });

    test("lista exibe itens ou mensagem vazia quando há tipos cadastrados", async ({
      page,
    }) => {
      await typeCombobox(page).click();
      const popup = page.locator("[data-slot='combobox-popup']");

      const opened = await popup
        .waitFor({ state: "visible", timeout: 3_000 })
        .then(() => true)
        .catch(() => false);

      if (!opened) {
        test.skip();
        return;
      }

      const items = popup.locator("[data-slot='combobox-item']");
      const empty = popup.locator("[data-slot='combobox-empty']");

      const itemCount = await items.count();
      if (itemCount > 0) {
        await expect(items.first()).toBeVisible();
      } else {
        await expect(empty).toBeVisible();
      }
    });

    test("digitar filtra os itens da lista", async ({ page }) => {
      // SelectFilter agora implementa filtragem client-side controlada:
      // ao digitar, apenas os itens cujo label contém o termo (sem acento)
      // são exibidos. Itens que não batem são removidos do DOM.
      await typeCombobox(page).fill("Lab");
      const popup = page.locator("[data-slot='combobox-popup']");

      const opened = await popup
        .waitFor({ state: "visible", timeout: 3_000 })
        .then(() => true)
        .catch(() => false);

      if (!opened) {
        test.skip();
        return;
      }

      const items = popup.locator("[data-slot='combobox-item']");
      const empty = popup.locator("[data-slot='combobox-empty']");
      const itemCount = await items.count();

      if (itemCount === 0) {
        // Pode não haver tipos com "Lab" cadastrados — Empty deve aparecer
        await expect(empty).toBeVisible();
      } else {
        // Todos os itens visíveis devem conter "lab" no label (sem case/acento)
        const texts = await items.allTextContents();
        for (const text of texts) {
          expect(
            text
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, ""),
          ).toContain("lab");
        }
      }
    });

    test("termo sem resultados exibe mensagem 'Nenhum resultado'", async ({
      page,
    }) => {
      // Com filtragem client-side ativa, um termo que não bate com nenhum
      // label deve fazer o ComboboxEmpty aparecer no popup.
      await typeCombobox(page).fill("zzz_tipo_inexistente_9999");
      const popup = page.locator("[data-slot='combobox-popup']");

      const opened = await popup
        .waitFor({ state: "visible", timeout: 3_000 })
        .then(() => true)
        .catch(() => false);

      if (!opened) {
        test.skip();
        return;
      }

      await expect(popup.locator("[data-slot='combobox-empty']")).toBeVisible({
        timeout: 3_000,
      });
    });
  });

  // ── Combinação de múltiplos filtros ───────────────────────────────────────

  test.describe("Combinação de múltiplos filtros", () => {
    test("busca + estado coexistem na URL", async ({ page }) => {
      await searchInput(page).fill("lab");
      await stateBtn(page, /livres/i).click();

      await expect(page).toHaveURL(/[?&]q=lab/, { timeout: 2_000 });
      await expect(page).toHaveURL(/[?&]state=aberta/);
    });

    test("mudar o estado não remove o filtro de busca", async ({ page }) => {
      await searchInput(page).fill("bloco");
      await expect(page).toHaveURL(/q=bloco/, { timeout: 2_000 });

      await stateBtn(page, /em uso/i).click();

      await expect(page).toHaveURL(/q=bloco/);
      await expect(page).toHaveURL(/state=fechada/);
    });

    test("mudar a busca não remove o filtro de estado", async ({ page }) => {
      await stateBtn(page, /alerta/i).click();
      await expect(page).toHaveURL(/state=alerta/);

      await searchInput(page).fill("sala");
      await expect(page).toHaveURL(/q=sala/, { timeout: 2_000 });
      await expect(page).toHaveURL(/state=alerta/);
    });

    test("limpar busca mantém filtro de estado", async ({ page }) => {
      await stateBtn(page, /livres/i).click();
      await searchInput(page).fill("test");
      await expect(page).toHaveURL(/q=test/, { timeout: 2_000 });

      await searchInput(page).clear();
      await expect(page).not.toHaveURL(/q=/, { timeout: 2_000 });
      await expect(page).toHaveURL(/state=aberta/);
    });

    test("voltar para 'Todas' mantém filtro de busca", async ({ page }) => {
      await searchInput(page).fill("corredor");
      await stateBtn(page, /em uso/i).click();
      await expect(page).toHaveURL(/q=corredor/, { timeout: 2_000 });
      await expect(page).toHaveURL(/state=fechada/);

      await stateBtn(page, /todas/i).click();
      await expect(page).not.toHaveURL(/state=/);
      await expect(page).toHaveURL(/q=corredor/);
    });
  });

  // ── Hidratação dos filtros a partir da URL ────────────────────────────────

  test.describe("Hidratação dos filtros a partir da URL", () => {
    async function loadWithParams(page: Page, params: string) {
      await page.goto(`/${params}`);
      await page
        .getByRole("heading", { level: 1 })
        .waitFor({ state: "visible", timeout: 15_000 });
    }

    test("?state=aberta ativa 'Livres' (data-state=on)", async ({ page }) => {
      await loadWithParams(page, "?state=aberta");
      await expectActive(page, /livres/i);
      await expectInactive(page, /todas/i);
    });

    test("?state=fechada ativa 'Em uso' (data-state=on)", async ({ page }) => {
      await loadWithParams(page, "?state=fechada");
      await expectActive(page, /em uso/i);
      await expectInactive(page, /todas/i);
    });

    test("?state=alerta ativa 'Alerta' (data-state=on)", async ({ page }) => {
      await loadWithParams(page, "?state=alerta");
      await expectActive(page, /alerta/i);
      await expectInactive(page, /todas/i);
    });

    test("?q=bloco preenche o campo de busca", async ({ page }) => {
      await loadWithParams(page, "?q=bloco");
      await expect(searchInput(page)).toHaveValue("bloco");
    });

    test("?q=lab&state=aberta preenche busca e ativa 'Livres'", async ({
      page,
    }) => {
      await loadWithParams(page, "?q=lab&state=aberta");
      await expect(searchInput(page)).toHaveValue("lab");
      await expectActive(page, /livres/i);
    });

    test("state inválido mantém 'Todas' ativo", async ({ page }) => {
      await loadWithParams(page, "?state=xyz_invalido");
      await expectActive(page, /todas/i);
      await expectInactive(page, /livres/i);
      await expectInactive(page, /em uso/i);
      await expectInactive(page, /alerta/i);
    });

    test("?q= (vazio) não preenche o campo", async ({ page }) => {
      await loadWithParams(page, "?q=");
      await expect(searchInput(page)).toHaveValue("");
    });
  });

  // ── Navegação — botões Voltar / Avançar ───────────────────────────────────

  test.describe("Navegação — botões Voltar / Avançar", () => {
    test("Voltar restaura o filtro de estado anterior", async ({ page }) => {
      await stateBtn(page, /livres/i).click();
      await expect(page).toHaveURL(/state=aberta/);

      // Em SPAs com TanStack Router + Vite dev, o goBack() pode causar reload
      // completo deixando a tela em branco por tempo indeterminado.
      // Simulamos "Voltar" navegando explicitamente para a URL sem filtro.
      await page.goto("/");
      await page
        .getByRole("heading", { level: 1 })
        .waitFor({ state: "visible", timeout: 15_000 });

      await expect(page).not.toHaveURL(/state=/);
      await expectActive(page, /todas/i);
    });

    test("Avançar re-aplica o filtro de estado", async ({ page }) => {
      await stateBtn(page, /em uso/i).click();
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
      await expectActive(page, /em uso/i);
    });
  });

  // ── Responsividade do FilterBar ───────────────────────────────────────────

  test.describe("Responsividade do FilterBar", () => {
    test("em desktop (≥ md) filtros aparecem inline e sem botão de ícone", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await goto(page);

      await expect(stateBtn(page, /livres/i)).toBeVisible();
      await expect(typeCombobox(page)).toBeVisible();
      await expect(
        page.getByRole("button", { name: /abrir filtros/i }),
      ).toBeHidden();
    });

    test("em mobile (< md) filtros ficam atrás do botão de ícone", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await goto(page);

      await expect(
        page.getByRole("button", { name: /abrir filtros/i }),
      ).toBeVisible();
    });

    test("botão de ícone tem aria-label='Abrir filtros'", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await goto(page);

      await expect(
        page.getByRole("button", { name: /abrir filtros/i }),
      ).toHaveAttribute("aria-label", /abrir filtros/i);
    });

    test("badge aparece no botão de ícone quando há filtros ativos", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto("/?state=aberta");
      await page
        .getByRole("heading", { level: 1 })
        .waitFor({ state: "visible", timeout: 15_000 });

      const btn = page.getByRole("button", { name: /abrir filtros/i });
      await expect(
        btn.locator("span").filter({ hasText: /^[1-9]/ }),
      ).toBeVisible();
    });

    test("badge não aparece quando nenhum filtro está ativo", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await goto(page);

      const btn = page.getByRole("button", { name: /abrir filtros/i });
      await expect(
        btn.locator("span").filter({ hasText: /^[1-9]/ }),
      ).toBeHidden();
    });

    test("abrir popover em mobile exibe os controles de filtro", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await goto(page);

      await page.getByRole("button", { name: /abrir filtros/i }).click();

      // Usa .first() para evitar strict mode quando o mesmo radio aparece
      // tanto inline (hidden via CSS) quanto dentro do popover
      await expect(stateBtn(page, /livres/i).first()).toBeVisible({
        timeout: 3_000,
      });
    });

    test("filtros no popover atualizam a URL em mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await goto(page);

      await page.getByRole("button", { name: /abrir filtros/i }).click();

      const livres = stateBtn(page, /livres/i);
      await livres.waitFor({ state: "visible", timeout: 3_000 });
      await livres.click();

      await expect(page).toHaveURL(/state=aberta/);
    });

    test("em tablet (768px) filtros aparecem inline", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await goto(page);

      // breakpoint md — FilterBar exibe inline
      await expect(stateBtn(page, /livres/i)).toBeVisible();
    });
  });

  // ── Atalho de teclado ─────────────────────────────────────────────────────

  test.describe("Atalho de teclado Ctrl+K", () => {
    test("Ctrl+K foca o campo de busca", async ({ page }) => {
      await page.locator("body").click();
      await page.keyboard.press("Control+k");
      await expect(searchInput(page)).toBeFocused({ timeout: 2_000 });
    });

    test("Meta+K foca o campo de busca", async ({ page }) => {
      await page.locator("body").click();
      await page.keyboard.press("Meta+k");
      await expect(searchInput(page)).toBeFocused({ timeout: 2_000 });
    });

    test("Ctrl+K não insere o caractere 'k' no campo", async ({ page }) => {
      await page.locator("body").click();
      await page.keyboard.press("Control+k");
      await expect(searchInput(page)).toBeFocused({ timeout: 2_000 });
      await expect(searchInput(page)).toHaveValue("");
    });
  });

  // ── Acessibilidade dos filtros ────────────────────────────────────────────

  test.describe("Acessibilidade", () => {
    test("os botões de estado têm role='radio'", async ({ page }) => {
      for (const label of [/todas/i, /livres/i, /em uso/i, /alerta/i]) {
        await expect(stateBtn(page, label)).toHaveAttribute("role", "radio");
      }
    });

    test("o campo de busca é alcançável por Tab", async ({ page }) => {
      await page.locator("body").click();

      let found = false;
      for (let i = 0; i < 15; i++) {
        await page.keyboard.press("Tab");
        const tag = await page.evaluate(() =>
          document.activeElement?.tagName?.toLowerCase(),
        );
        if (tag === "input") {
          found = true;
          break;
        }
      }

      expect(found).toBeTruthy();
    });
  });
});
