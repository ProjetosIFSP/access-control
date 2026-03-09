// ─────────────────────────────────────────────────────────────────────────────
// Script: test-hid-mode.js
// Objetivo: Verificar se o leitor WA26 emite dados em modo HID bruto.
//
// Como usar:
//   1. Conecte o leitor WA26 via USB.
//   2. Abra o Google Chrome ou Microsoft Edge.
//   3. Pressione F12 → aba "Console".
//   4. Cole TODO o conteúdo deste arquivo e pressione Enter.
//   5. Selecione o leitor na janelinha que aparecer.
//   6. Passe o dedo no leitor quando solicitado.
//   7. Observe se aparecem bytes no Console.
//
// Interpretação dos resultados:
//   ✅ "📦 Relatório HID recebido" aparece → leitor está em modo HID bruto.
//   ⚠️  Nada aparece após passar o dedo  → leitor NÃO está em modo HID bruto.
//      Neste caso, teste o modo teclado conforme o guia (Passo 3 - Teste A).
// ─────────────────────────────────────────────────────────────────────────────

(async () => {
  // ── 1. Verifica suporte à Web HID API ──────────────────────────────────────
  if (!("hid" in navigator)) {
    console.error(
      "❌ Este navegador NÃO suporta a Web HID API.\n" +
      "   Use o Google Chrome ou o Microsoft Edge e tente novamente."
    );
    return;
  }

  // ── 2. Solicita acesso ao dispositivo ─────────────────────────────────────
  console.info(
    "ℹ️  Uma janela de seleção de dispositivos vai abrir.\n" +
    "   Selecione o leitor WA26 e clique em 'Conectar'."
  );

  let device;
  try {
    const devices = await navigator.hid.requestDevice({ filters: [] });

    if (!devices.length) {
      console.warn(
        "⚠️  Nenhum dispositivo selecionado.\n" +
        "   Certifique-se de que o leitor está conectado e tente novamente."
      );
      return;
    }

    device = devices[0];
    console.log("─────────────────────────────────────");
    console.log("✅ Dispositivo selecionado:");
    console.log("   Nome     :", device.productName || "(sem nome)");
    console.log("   vendorId :", device.vendorId,  "→ hex: 0x" + device.vendorId.toString(16).toUpperCase().padStart(4, "0"));
    console.log("   productId:", device.productId, "→ hex: 0x" + device.productId.toString(16).toUpperCase().padStart(4, "0"));
    console.log("─────────────────────────────────────");
  } catch (err) {
    if (
      err.name === "NotAllowedError" ||
      err.message.toLowerCase().includes("cancelled") ||
      err.message.toLowerCase().includes("no device")
    ) {
      console.info("ℹ️  Seleção cancelada. Rode o script novamente quando quiser.");
      return;
    }
    console.error("❌ Erro ao solicitar dispositivo:", err.message);
    return;
  }

  // ── 3. Abre o canal HID ───────────────────────────────────────────────────
  try {
    if (!device.opened) {
      await device.open();
    }
    console.log("✅ Canal HID aberto com sucesso.");
  } catch (err) {
    console.error(
      "❌ Não foi possível abrir o canal HID.\n" +
      "   Causa provável: um driver do sistema está bloqueando o acesso.\n" +
      "   Consulte a seção 'Resolução de Problemas' no guia de integração.\n" +
      "   Erro técnico: " + err.message
    );
    return;
  }

  // ── 4. Escuta relatórios HID ──────────────────────────────────────────────
  const LISTEN_DURATION_MS = 15_000; // aguarda 15 segundos
  let reportCount = 0;

  console.log("");
  console.log("👆 Passe o dedo no leitor agora...");
  console.log("   (Aguardando por " + (LISTEN_DURATION_MS / 1000) + " segundos)");
  console.log("");

  // Utilitário: converte ArrayBuffer em string hexadecimal legível
  function bufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ");
  }

  // Utilitário: converte ArrayBuffer em string hexadecimal sem espaços (formato compacto)
  function bufferToHexCompact(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function handleInputReport(event) {
    reportCount++;

    const hexSpaced  = bufferToHex(event.data.buffer);
    const hexCompact = bufferToHexCompact(event.data.buffer);
    const byteCount  = event.data.byteLength;

    console.log("─────────────────────────────────────");
    console.log("📦 Relatório HID #" + reportCount + " recebido!");
    console.log("   reportId    :", event.reportId);
    console.log("   tamanho     :", byteCount, "byte(s)");
    console.log("   hex (espaçado)  :", hexSpaced);
    console.log("   hex (compacto)  :", hexCompact);
    console.log("─────────────────────────────────────");

    if (reportCount === 1) {
      console.info(
        "ℹ️  O leitor está em MODO HID BRUTO.\n" +
        "   Continue passando o dedo para capturar mais relatórios, se necessário.\n" +
        "   Anote o formato 'hex (compacto)' — é o template que será salvo no banco."
      );
    }
  }

  device.addEventListener("inputreport", handleInputReport);

  // ── 5. Encerra após o tempo limite ────────────────────────────────────────
  await new Promise((resolve) => setTimeout(resolve, LISTEN_DURATION_MS));

  device.removeEventListener("inputreport", handleInputReport);

  try {
    await device.close();
  } catch (_) {
    // ignora erro ao fechar — pode já estar fechado
  }

  console.log("");
  console.log("⏱️  Tempo de escuta encerrado.");

  if (reportCount === 0) {
    console.warn(
      "⚠️  Nenhum relatório HID foi recebido.\n\n" +
      "   Possíveis causas:\n" +
      "   1. O leitor NÃO está em modo HID bruto — tente o Teste A (modo teclado)\n" +
      "      descrito no guia de integração (Passo 3).\n" +
      "   2. O dedo não foi posicionado corretamente no sensor.\n" +
      "   3. O leitor precisa ser configurado via software do fabricante\n" +
      "      para emitir dados HID (consulte o manual do WA26)."
    );
  } else {
    console.log(
      "✅ Total de relatórios recebidos: " + reportCount + "\n" +
      "   Modo de operação confirmado: HID BRUTO.\n\n" +
      "📋 Próximo passo: registre o resultado na tabela do Passo 7\n" +
      "   do arquivo hardware-integration-guide.md."
    );
  }
})();
