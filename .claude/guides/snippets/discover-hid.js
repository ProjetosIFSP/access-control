// ─────────────────────────────────────────────────────────────────────────────
// Script: discover-hid.js
// Como usar:
//   1. Conecte o leitor WA26 via USB.
//   2. Abra o Google Chrome ou Microsoft Edge.
//   3. Pressione F12 → aba "Console".
//   4. Cole TODO o conteúdo deste arquivo e pressione Enter.
//   5. Uma janelinha do navegador vai aparecer — selecione o leitor e clique
//      em "Conectar".
//   6. Anote os valores de vendorId e productId que aparecerem no Console.
// ─────────────────────────────────────────────────────────────────────────────

(async () => {
  // Verifica se o navegador suporta a Web HID API
  if (!("hid" in navigator)) {
    console.error(
      "❌ Este navegador NÃO suporta a Web HID API.\n" +
      "   Use o Google Chrome ou o Microsoft Edge e tente novamente."
    );
    return;
  }

  console.info(
    "ℹ️  Uma janela de seleção de dispositivos vai abrir.\n" +
    "   Encontre o leitor WA26 na lista e clique em 'Conectar'."
  );

  try {
    // filters: [] significa "mostrar TODOS os dispositivos HID disponíveis"
    // Isso é intencional — queremos ver o leitor aparecer na lista sem filtrar.
    const devices = await navigator.hid.requestDevice({ filters: [] });

    if (!devices.length) {
      console.warn(
        "⚠️  Nenhum dispositivo foi selecionado.\n" +
        "   Certifique-se de que o leitor está conectado e tente novamente."
      );
      return;
    }

    const device = devices[0];

    // Converte um número decimal para hexadecimal com prefixo 0x e letras maiúsculas
    const toHex = (n) => "0x" + n.toString(16).toUpperCase().padStart(4, "0");

    console.log("─────────────────────────────────────");
    console.log("✅ Dispositivo encontrado!");
    console.log("   Nome do produto :", device.productName || "(sem nome)");
    console.log(
      "   vendorId        :",
      device.vendorId,
      " →  hex:", toHex(device.vendorId)
    );
    console.log(
      "   productId       :",
      device.productId,
      " →  hex:", toHex(device.productId)
    );
    console.log("─────────────────────────────────────");
    console.log(
      "📋 Copie os valores acima e cole em:\n" +
      "   app/src/hooks/use-fingerprint-reader.ts\n" +
      "   → constante KNOWN_FINGERPRINT_FILTERS\n\n" +
      "   Exemplo:\n" +
      "   const KNOWN_FINGERPRINT_FILTERS = [\n" +
      "     { vendorId: " + device.vendorId + ", productId: " + device.productId + " }\n" +
      "   ];"
    );

    // Tenta abrir o canal HID para confirmar que o acesso está liberado
    try {
      if (!device.opened) {
        await device.open();
        console.log("✅ Canal HID aberto com sucesso — acesso ao dispositivo liberado.");
        await device.close();
        console.log("   (Canal fechado após teste.)");
      }
    } catch (openErr) {
      console.warn(
        "⚠️  Dispositivo encontrado, mas não foi possível abrir o canal HID.\n" +
        "   Isso pode indicar que um driver do sistema está bloqueando o acesso.\n" +
        "   Consulte a seção 'Resolução de Problemas' no guia de integração.\n" +
        "   Erro técnico: " + openErr.message
      );
    }
  } catch (err) {
    // O usuário fechou a janela de seleção sem escolher nada
    if (
      err.name === "NotAllowedError" ||
      err.message.toLowerCase().includes("cancelled") ||
      err.message.toLowerCase().includes("no device")
    ) {
      console.info("ℹ️  Seleção cancelada pelo usuário. Rode o script novamente quando quiser.");
      return;
    }

    console.error(
      "❌ Ocorreu um erro inesperado:\n   " + err.message + "\n\n" +
      "   Se o erro persistir, consulte a seção 'Resolução de Problemas'\n" +
      "   no arquivo hardware-integration-guide.md."
    );
  }
})();
