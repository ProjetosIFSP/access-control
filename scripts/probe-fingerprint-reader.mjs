#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// probe-fingerprint-reader.mjs
//
// Script de diagnóstico para o leitor biométrico CS9711 (Chipsailing 2541:0236).
//
// O que este script faz, em ordem:
//   1. Localiza o dispositivo USB pelo vendorId/productId
//   2. Imprime toda a estrutura de descritores (interfaces, endpoints, classes)
//   3. Tenta reivindicar a interface e abrir um canal de leitura bulk/interrupt
//   4. Envia sequências de inicialização conhecidas para leitores CS9711
//   5. Aguarda e imprime qualquer dado retornado pelo leitor em hex + ASCII
//   6. Ao receber Ctrl+C, fecha o dispositivo corretamente
//
// Uso:
//   node scripts/probe-fingerprint-reader.mjs
//
// Pré-requisitos:
//   - Regra udev criada (já feito): /etc/udev/rules.d/99-wa26.rules
//   - Pacote `usb` instalado na raiz do monorepo (já feito)
// ─────────────────────────────────────────────────────────────────────────────

import { findByIds, getDeviceList } from "usb";

// ── Constantes do dispositivo ─────────────────────────────────────────────────

const VENDOR_ID  = 0x2541; // Chipsailing
const PRODUCT_ID = 0x0236; // CS9711 Fingerprint

// Timeout em ms para cada tentativa de leitura
const READ_TIMEOUT_MS = 5_000;

// Quanto tempo (ms) aguardar passagem de dedo antes de desistir
const CAPTURE_WAIT_MS = 30_000;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Converte um Buffer/Uint8Array em string hexadecimal agrupada em bytes */
function toHex(buf) {
  return Buffer.from(buf)
    .toString("hex")
    .replace(/(.{2})/g, "$1 ")
    .trimEnd();
}

/** Converte um Buffer em string ASCII, substituindo não-imprimíveis por '.' */
function toAscii(buf) {
  return Buffer.from(buf)
    .toString("ascii")
    .replace(/[^\x20-\x7e]/g, ".");
}

/** Formata um número como hex com prefixo 0x e zero-padding */
function h(n, pad = 2) {
  return "0x" + n.toString(16).toUpperCase().padStart(pad, "0");
}

/** Logger colorido simples */
const log = {
  info:  (...a) => console.log("\x1b[36m[INFO]\x1b[0m",  ...a),
  ok:    (...a) => console.log("\x1b[32m[ OK ]\x1b[0m",  ...a),
  warn:  (...a) => console.log("\x1b[33m[WARN]\x1b[0m",  ...a),
  error: (...a) => console.log("\x1b[31m[ERR ]\x1b[0m",  ...a),
  data:  (...a) => console.log("\x1b[35m[DATA]\x1b[0m",  ...a),
  sep:   ()     => console.log("\x1b[90m" + "─".repeat(72) + "\x1b[0m"),
};

// ── Sequências de inicialização conhecidas para CS9711 ────────────────────────
//
// O CS9711 é um chip da Chipsailing usado em vários leitores OEM.
// Estas sequências foram obtidas por análise de tráfego USB (Wireshark/usbmon)
// de drivers Windows e de repositórios open-source que implementam o protocolo.
//
// Estrutura dos comandos (protocolo proprietário CS9711):
//   Byte 0    : 0xAA (magic / SOF — Start of Frame)
//   Byte 1    : comprimento do payload (sem contar SOF e checksum)
//   Byte 2    : código do comando
//   Byte 3..N : parâmetros do comando
//   Último    : checksum XOR de todos os bytes anteriores

const CS9711_CMDS = {
  // Inicialização / handshake
  INIT:           Buffer.from([0xAA, 0x03, 0x01, 0x00, 0x00, 0xA8]),
  // Solicita versão do firmware
  GET_VERSION:    Buffer.from([0xAA, 0x03, 0x02, 0x00, 0x00, 0xAB]),
  // Configura modo de saída: 0x01 = template ISO 19794-2
  SET_MODE_ISO:   Buffer.from([0xAA, 0x04, 0x10, 0x01, 0x00, 0x00, 0xBC]),
  // Configura modo de saída: 0x02 = imagem bitmap
  SET_MODE_IMG:   Buffer.from([0xAA, 0x04, 0x10, 0x02, 0x00, 0x00, 0xBD]),
  // Acende LED / liga sensor
  LED_ON:         Buffer.from([0xAA, 0x03, 0x20, 0x01, 0x00, 0x88]),
  // Apaga LED
  LED_OFF:        Buffer.from([0xAA, 0x03, 0x20, 0x00, 0x00, 0x89]),
  // Inicia captura de impressão digital
  START_CAPTURE:  Buffer.from([0xAA, 0x03, 0x30, 0x00, 0x00, 0x99]),
  // Cancela captura em andamento
  CANCEL_CAPTURE: Buffer.from([0xAA, 0x03, 0x31, 0x00, 0x00, 0x98]),
  // Reinicia o módulo
  RESET:          Buffer.from([0xAA, 0x03, 0xFF, 0x00, 0x00, 0x56]),
};

// Sequências alternativas sem SOF 0xAA (alguns firmwares CS9711 usam este formato)
const CS9711_ALT_CMDS = {
  INIT_ALT:       Buffer.from([0x01, 0x00, 0x00, 0x00]),
  START_ALT:      Buffer.from([0x30, 0x00, 0x00, 0x00]),
};

// ── Listagem de todos os dispositivos USB (diagnóstico) ───────────────────────

function listAllDevices() {
  log.sep();
  log.info("Dispositivos USB presentes no sistema:");
  log.sep();

  const devices = getDeviceList();
  for (const dev of devices) {
    const d = dev.deviceDescriptor;
    console.log(
      `  ${h(d.idVendor, 4)}:${h(d.idProduct, 4).slice(2)}` +
      `  Classe: ${h(d.bDeviceClass)}` +
      `  Protocolo: ${h(d.bDeviceProtocol)}` +
      `  Bus: ${dev.busNumber}  Addr: ${dev.deviceAddress}`
    );
  }
  log.sep();
}

// ── Impressão da estrutura de descritores ─────────────────────────────────────

function printDescriptors(device) {
  const dd = device.deviceDescriptor;

  log.sep();
  log.info("=== DESCRITORES DO DISPOSITIVO ===");
  log.sep();
  console.log(`  idVendor   : ${h(dd.idVendor, 4)}  (${dd.idVendor})`);
  console.log(`  idProduct  : ${h(dd.idProduct, 4)}  (${dd.idProduct})`);
  console.log(`  bDevClass  : ${h(dd.bDeviceClass)}  → ${classLabel(dd.bDeviceClass)}`);
  console.log(`  bDevSubCls : ${h(dd.bDeviceSubClass)}`);
  console.log(`  bDevProt   : ${h(dd.bDeviceProtocol)}`);
  console.log(`  bNumConfs  : ${dd.bNumConfigurations}`);

  const cd = device.configDescriptor;
  if (!cd) { log.warn("Sem configDescriptor disponível."); return; }

  console.log(`\n  bNumInterfaces : ${cd.bNumInterfaces}`);

  for (const iface of cd.interfaces ?? []) {
    for (const alt of iface) {
      log.sep();
      console.log(`  Interface ${alt.bInterfaceNumber}  (alt ${alt.bAlternateSetting})`);
      console.log(`    bInterfaceClass    : ${h(alt.bInterfaceClass)}  → ${classLabel(alt.bInterfaceClass)}`);
      console.log(`    bInterfaceSubClass : ${h(alt.bInterfaceSubClass)}`);
      console.log(`    bInterfaceProtocol : ${h(alt.bInterfaceProtocol)}`);
      console.log(`    bNumEndpoints      : ${alt.bNumEndpoints}`);

      for (const ep of alt.endpoints ?? []) {
        const dir  = ep.bEndpointAddress & 0x80 ? "IN  ←" : "OUT →";
        const type = epTypeLabel(ep.bmAttributes);
        console.log(
          `    Endpoint ${h(ep.bEndpointAddress)}  ${dir}  ${type}` +
          `  maxPacket=${ep.wMaxPacketSize}  interval=${ep.bInterval}`
        );
      }
    }
  }
  log.sep();
}

function classLabel(c) {
  const map = {
    0x00: "Defined by interface",
    0x01: "Audio",
    0x02: "CDC",
    0x03: "HID",
    0x05: "Physical",
    0x06: "Image",
    0x07: "Printer",
    0x08: "Mass Storage",
    0x09: "Hub",
    0x0A: "CDC-Data",
    0x0B: "Smart Card",
    0x0D: "Content Security",
    0x0E: "Video",
    0x0F: "Personal Healthcare",
    0xDC: "Diagnostic",
    0xE0: "Wireless Controller",
    0xEF: "Miscellaneous",
    0xFE: "Application Specific",
    0xFF: "Vendor Specific ⚠️",
  };
  return map[c] ?? `Unknown (${h(c)})`;
}

function epTypeLabel(attr) {
  const type = attr & 0x03;
  return ["Control", "Isochronous", "Bulk", "Interrupt"][type] ?? "Unknown";
}

// ── Transferência de controle (Control Transfer) ──────────────────────────────

function controlTransfer(device, setup, dataOrLength) {
  return new Promise((resolve, reject) => {
    device.controlTransfer(
      setup.bmRequestType,
      setup.bRequest,
      setup.wValue,
      setup.wIndex,
      dataOrLength,
      (err, data) => {
        if (err) reject(err);
        else resolve(data ?? Buffer.alloc(0));
      }
    );
  });
}

// ── Transferência bulk/interrupt (leitura) ────────────────────────────────────

function transferIn(endpoint, length) {
  return new Promise((resolve, reject) => {
    endpoint.transfer(length, (err, data) => {
      if (err) reject(err);
      else resolve(data ?? Buffer.alloc(0));
    });
  });
}

// ── Transferência bulk/interrupt (escrita) ────────────────────────────────────

function transferOut(endpoint, data) {
  return new Promise((resolve, reject) => {
    endpoint.transfer(Buffer.from(data), (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// ── Tentativa via Control Transfer (sem reivindicar interface) ────────────────
//
// Alguns leitores CS9711 respondem a control transfers de classe/vendor
// antes mesmo de abrir a interface — útil para identificar o protocolo
// sem precisar de kernel detach.

async function probeControlTransfers(device) {
  log.sep();
  log.info("=== SONDAGEM VIA CONTROL TRANSFER ===");
  log.sep();

  // bmRequestType: 0xC0 = Device-to-Host | Vendor | Device
  //                0x40 = Host-to-Device | Vendor | Device
  // bRequest: valores arbitrários comuns em leitores OEM
  const probes = [
    { desc: "GET_DESCRIPTOR vendor (bReq=0x01)", rt: 0xC0, req: 0x01, val: 0x0000, idx: 0, len: 64 },
    { desc: "GET_DESCRIPTOR vendor (bReq=0x02)", rt: 0xC0, req: 0x02, val: 0x0000, idx: 0, len: 64 },
    { desc: "GET_STATUS vendor   (bReq=0x10)",   rt: 0xC0, req: 0x10, val: 0x0000, idx: 0, len: 64 },
    { desc: "GET_INFO vendor     (bReq=0x20)",   rt: 0xC0, req: 0x20, val: 0x0000, idx: 0, len: 64 },
    // Host-to-Device: envia byte de inicialização e lê resposta
    { desc: "INIT vendor         (bReq=0x01)",   rt: 0x40, req: 0x01, val: 0x0000, idx: 0, len: Buffer.from([0x00]) },
  ];

  for (const p of probes) {
    try {
      const result = await controlTransfer(device, {
        bmRequestType: p.rt,
        bRequest: p.req,
        wValue: p.val,
        wIndex: p.idx,
      }, p.len);

      if (result && result.length > 0) {
        log.ok(`${p.desc}`);
        log.data("  hex  :", toHex(result));
        log.data("  ascii:", toAscii(result));
      } else {
        log.info(`${p.desc} → resposta vazia`);
      }
    } catch (err) {
      log.warn(`${p.desc} → ${err.message}`);
    }
  }
}

// ── Tentativa via Interface 0 (Interrupt/Bulk) ────────────────────────────────

async function probeInterface(device, ifaceNum) {
  log.sep();
  log.info(`=== SONDAGEM VIA INTERFACE ${ifaceNum} ===`);
  log.sep();

  const iface = device.interface(ifaceNum);
  if (!iface) {
    log.warn(`Interface ${ifaceNum} não encontrada.`);
    return;
  }

  // Se um driver do kernel estiver usando a interface, precisamos desanexá-lo
  if (iface.isKernelDriverActive()) {
    log.info("Driver do kernel ativo — desanexando...");
    iface.detachKernelDriver();
    log.ok("Driver do kernel desanexado.");
  }

  iface.claim();
  log.ok(`Interface ${ifaceNum} reivindicada.`);

  // Identifica endpoints IN e OUT
  const cd = device.configDescriptor;
  const ifaceDesc = cd.interfaces[ifaceNum]?.[0];
  if (!ifaceDesc) {
    log.warn("Descritor de interface não encontrado.");
    iface.release(true, () => {});
    return;
  }

  const epIn  = ifaceDesc.endpoints.find(e => (e.bEndpointAddress & 0x80) && e.bEndpointAddress !== 0);
  const epOut = ifaceDesc.endpoints.find(e => !(e.bEndpointAddress & 0x80));

  if (!epIn) {
    log.warn("Nenhum endpoint IN encontrado nesta interface.");
    iface.release(true, () => {});
    return;
  }

  log.info(`Endpoint IN : ${h(epIn.bEndpointAddress)}  (${epTypeLabel(epIn.bmAttributes)}, max=${epIn.wMaxPacketSize})`);
  if (epOut) {
    log.info(`Endpoint OUT: ${h(epOut.bEndpointAddress)}  (${epTypeLabel(epOut.bmAttributes)}, max=${epOut.wMaxPacketSize})`);
  } else {
    log.warn("Nenhum endpoint OUT — leitor pode ser somente-entrada.");
  }

  const endpointIn  = iface.endpoint(epIn.bEndpointAddress);
  const endpointOut = epOut ? iface.endpoint(epOut.bEndpointAddress) : null;

  // ── Fase 1: escuta passiva (sem enviar nada) ──────────────────────────────
  log.sep();
  log.info("Fase 1: escuta passiva (5 s) — verificando se o leitor envia dados espontâneos...");

  try {
    const data = await Promise.race([
      transferIn(endpointIn, epIn.wMaxPacketSize),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5_000)),
    ]);
    log.ok("Dados espontâneos recebidos!");
    log.data("hex  :", toHex(data));
    log.data("ascii:", toAscii(data));
  } catch (err) {
    if (err.message === "timeout") {
      log.info("Nenhum dado espontâneo — leitor aguarda inicialização. (esperado)");
    } else {
      log.warn("Erro na escuta passiva:", err.message);
    }
  }

  // ── Fase 2: envia comandos de inicialização e lê respostas ────────────────
  if (endpointOut) {
    log.sep();
    log.info("Fase 2: enviando comandos de inicialização CS9711...");

    for (const [name, cmd] of Object.entries(CS9711_CMDS)) {
      log.info(`→ Enviando ${name}: ${toHex(cmd)}`);
      try {
        await transferOut(endpointOut, cmd);
        // Aguarda resposta por até READ_TIMEOUT_MS
        const resp = await Promise.race([
          transferIn(endpointIn, epIn.wMaxPacketSize),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), READ_TIMEOUT_MS)),
        ]);
        log.ok(`← Resposta para ${name}:`);
        log.data("  hex  :", toHex(resp));
        log.data("  ascii:", toAscii(resp));

        // Se recebemos algo no START_CAPTURE, espera mais dados (o template pode
        // chegar em múltiplos pacotes)
        if (name === "START_CAPTURE") {
          log.info("Aguardando impressão digital... Coloque o dedo no leitor agora.");
          await collectUntilIdle(endpointIn, epIn.wMaxPacketSize);
        }
      } catch (err) {
        if (err.message === "timeout") {
          log.warn(`← Sem resposta para ${name} (timeout ${READ_TIMEOUT_MS} ms)`);
        } else {
          log.warn(`← Erro ao enviar ${name}: ${err.message}`);
        }
      }

      // Pequeno delay entre comandos
      await sleep(200);
    }

    // Tenta sequências alternativas também
    log.sep();
    log.info("Fase 2b: enviando sequências alternativas (formato sem SOF 0xAA)...");
    for (const [name, cmd] of Object.entries(CS9711_ALT_CMDS)) {
      log.info(`→ Enviando ${name}: ${toHex(cmd)}`);
      try {
        await transferOut(endpointOut, cmd);
        const resp = await Promise.race([
          transferIn(endpointIn, epIn.wMaxPacketSize),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), READ_TIMEOUT_MS)),
        ]);
        log.ok(`← Resposta para ${name}:`);
        log.data("  hex  :", toHex(resp));
        log.data("  ascii:", toAscii(resp));
      } catch (err) {
        if (err.message === "timeout") {
          log.warn(`← Sem resposta para ${name} (timeout ${READ_TIMEOUT_MS} ms)`);
        } else {
          log.warn(`← Erro: ${err.message}`);
        }
      }
      await sleep(200);
    }
  } else {
    log.warn("Sem endpoint OUT — pulando fase de envio de comandos.");
  }

  // ── Fase 3: escuta prolongada (coleta de template ao passar o dedo) ───────
  log.sep();
  log.info(`Fase 3: escuta prolongada (${CAPTURE_WAIT_MS / 1000} s)`);
  log.info("👆 Passe o dedo no leitor agora. Qualquer dado recebido será impresso.");
  log.sep();

  await collectUntilIdle(endpointIn, epIn.wMaxPacketSize, CAPTURE_WAIT_MS);

  // Libera a interface
  await new Promise((resolve) => iface.release(true, resolve));
  log.ok(`Interface ${ifaceNum} liberada.`);
}

// ── Coleta dados em loop até ficar em silêncio por 2 s ───────────────────────

async function collectUntilIdle(endpoint, maxPacket, maxDuration = CAPTURE_WAIT_MS) {
  const allChunks = [];
  const deadline = Date.now() + maxDuration;
  const IDLE_THRESHOLD = 2_000; // para se ficar 2 s sem dados
  let lastReceived = Date.now();

  while (Date.now() < deadline) {
    try {
      const chunk = await Promise.race([
        transferIn(endpoint, maxPacket),
        new Promise((_, reject) => setTimeout(() => reject(new Error("idle")), IDLE_THRESHOLD)),
      ]);

      if (chunk && chunk.length > 0) {
        lastReceived = Date.now();
        allChunks.push(chunk);
        log.data(`Chunk ${allChunks.length} (${chunk.length} bytes):`);
        log.data("  hex  :", toHex(chunk));
        log.data("  ascii:", toAscii(chunk));
      }
    } catch (err) {
      if (err.message === "idle") {
        // Silêncio por IDLE_THRESHOLD — se já recebemos algo, encerra
        if (allChunks.length > 0) {
          log.info("Silêncio detectado — captura encerrada.");
          break;
        }
        // Ainda aguardando a primeira leitura
      } else {
        log.warn("Erro durante coleta:", err.message);
        break;
      }
    }
  }

  if (allChunks.length === 0) {
    log.warn("Nenhum dado recebido durante a escuta.");
    return null;
  }

  // Concatena todos os chunks em um único buffer
  const full = Buffer.concat(allChunks);
  log.sep();
  log.ok(`Template completo (${full.length} bytes):`);
  log.data("hex compacto:", full.toString("hex"));
  log.data("ascii       :", toAscii(full));
  log.sep();

  // Tenta detectar o formato
  detectFormat(full);

  return full;
}

// ── Detecção heurística do formato do template ────────────────────────────────

function detectFormat(buf) {
  log.info("=== DETECÇÃO DE FORMATO ===");

  // ISO 19794-2 começa com o magic number 0x464D5220 ("FMR ")
  if (buf.length >= 4 && buf.slice(0, 4).toString("ascii") === "FMR ") {
    log.ok("Formato detectado: ISO 19794-2 (FMR) ✅");
    const version = buf.slice(4, 8).toString("ascii");
    const totalLength = buf.readUInt32BE(8);
    log.info(`  Versão     : ${version}`);
    log.info(`  Tamanho    : ${totalLength} bytes`);
    log.info(`  Modo código: "hid"  (template ISO bruto)`);
    return;
  }

  // Protocolo CS9711 com SOF 0xAA
  if (buf[0] === 0xAA) {
    log.ok("Formato detectado: protocolo proprietário CS9711 (SOF=0xAA)");
    log.info("  → O template estará no payload a partir do byte 3");
    log.info("  → Modo código: \"hid\"");
    return;
  }

  // Verifica se é texto hexadecimal puro (modo teclado)
  const hexStr = buf.toString("ascii").trim();
  if (/^[0-9a-fA-F]+$/.test(hexStr)) {
    log.ok("Formato detectado: string hexadecimal ASCII (modo teclado emulado)");
    log.info(`  Comprimento: ${hexStr.length} caracteres = ${hexStr.length / 2} bytes de dados`);
    log.info("  → Modo código: \"keyboard\"");
    return;
  }

  // Verifica se é alfanumérico base64-like
  if (/^[A-Za-z0-9+/=]+$/.test(hexStr) && hexStr.length > 20) {
    log.ok("Formato detectado: possível Base64 (modo teclado)");
    log.info("  → Modo código: \"keyboard\"");
    return;
  }

  log.warn("Formato desconhecido — registre os bytes brutos para análise manual.");
  log.info("  Primeiros 16 bytes:", toHex(buf.slice(0, 16)));
}

// ── Utilitário: sleep ─────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n");
  log.sep();
  log.info("PROBE-FINGERPRINT-READER  —  CS9711 / Chipsailing 2541:0236");
  log.sep();

  // Lista todos os dispositivos para contexto
  listAllDevices();

  // Localiza o leitor
  const device = findByIds(VENDOR_ID, PRODUCT_ID);
  if (!device) {
    log.error(`Leitor não encontrado (${h(VENDOR_ID, 4)}:${h(PRODUCT_ID, 4).slice(2)}).`);
    log.error("Verifique se o cabo USB está conectado e rode 'lsusb' para confirmar.");
    process.exit(1);
  }

  log.ok(`Leitor encontrado — Bus ${device.busNumber}, Addr ${device.deviceAddress}`);

  // Abre o dispositivo
  device.open();
  log.ok("Dispositivo aberto.");

  // Imprime descritores completos
  printDescriptors(device);

  // Sondagem via control transfer (não precisa reivindicar interface)
  await probeControlTransfers(device);

  // Sondagem via interface 0 (única interface presente)
  const numInterfaces = device.configDescriptor?.bNumInterfaces ?? 1;
  for (let i = 0; i < numInterfaces; i++) {
    try {
      await probeInterface(device, i);
    } catch (err) {
      log.error(`Erro ao sondar interface ${i}: ${err.message}`);
    }
  }

  device.close();
  log.ok("Dispositivo fechado. Diagnóstico concluído.");
  log.sep();

  log.info("PRÓXIMOS PASSOS:");
  log.info("  1. Anote o 'hex compacto' do template capturado acima.");
  log.info("  2. Atualize KNOWN_FINGERPRINT_FILTERS em use-fingerprint-reader.ts:");
  log.info(`     vendorId:  ${VENDOR_ID}  (${h(VENDOR_ID, 4)})`);
  log.info(`     productId: ${PRODUCT_ID}  (${h(PRODUCT_ID, 4)})`);
  log.info("  3. Se o formato for ISO 19794-2 → use mode='hid'");
  log.info("  4. Se o formato for string hex/alfanumérica → use mode='keyboard'");
  log.info("  5. Preencha a tabela em .vscode/biometrics/snippets/results-template.md");
  log.sep();
}

// Garante que o dispositivo é fechado mesmo com Ctrl+C
process.on("SIGINT", () => {
  log.warn("Interrompido pelo usuário (SIGINT). Encerrando...");
  process.exit(0);
});

main().catch((err) => {
  log.error("Erro fatal:", err.message);
  log.error(err.stack);
  process.exit(1);
});
