#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// capture-usb-traffic.mjs
//
// Captura o tráfego USB bruto do leitor CS9711 (2541:0236) via /dev/usbmon
// e imprime cada pacote em hex anotado, separando transferências OUT (host→leitor)
// de transferências IN (leitor→host).
//
// O objetivo é descobrir o protocolo real do firmware — capturando o que o
// próprio leitor envia/recebe ao ser usado (passando o dedo), sem precisar
// de um driver Windows ou de engenharia reversa offline.
//
// Como usar:
//   1. Certifique-se de que o usbmon está carregado:
//        sudo modprobe usbmon
//   2. Rode o script como root (necessário para ler /dev/usbmon*):
//        sudo node scripts/capture-usb-traffic.mjs
//   3. Passe o dedo no leitor quando solicitado.
//   4. Pressione Ctrl+C para encerrar e ver o resumo.
//
// Saída:
//   - Cada pacote é impresso com direção, tamanho e bytes em hex + ASCII.
//   - Ao encerrar, imprime um resumo de todos os pacotes OUT seguidos de IN,
//     que representa a sequência completa de comandos/respostas do protocolo.
//
// Pré-requisitos:
//   sudo modprobe usbmon          # carrega o módulo (feito)
//   ls /dev/usbmon*               # deve mostrar /dev/usbmon0 /dev/usbmon1 ...
//   lsusb → Bus 001 Device 010: ID 2541:0236   → usar /dev/usbmon1
// ─────────────────────────────────────────────────────────────────────────────

import fs   from "fs";
import path from "path";

// ── Configuração ──────────────────────────────────────────────────────────────

// Bus onde o leitor está (Bus 001 no lsusb → usbmon1)
const BUS_NUMBER = 1;

// Endereço do dispositivo no barramento (Device 010 no lsusb)
// Deixe null para capturar TODOS os dispositivos do bus (mais ruidoso, mas seguro)
const DEVICE_ADDRESS = 10;

// Caminho do dispositivo usbmon
const USBMON_PATH = `/dev/usbmon${BUS_NUMBER}`;

// Quantos bytes de payload capturar por pacote (usbmon limita a 256 por padrão no texto)
const MAX_PAYLOAD_BYTES = 512;

// Tempo máximo de captura em ms (5 minutos)
const MAX_CAPTURE_MS = 5 * 60 * 1_000;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Converte buffer em hex agrupado de 2 em 2, com espaço a cada 8 bytes */
function toHexAnnotated(buf) {
  const bytes = Array.from(buf);
  const groups = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const row = bytes.slice(i, i + 16);
    const hex = row
      .map((b, j) => (j === 8 ? " " : "") + b.toString(16).padStart(2, "0"))
      .join(" ");
    const ascii = row
      .map((b) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : "."))
      .join("");
    groups.push(`    ${(i).toString(16).padStart(4, "0")}  ${hex.padEnd(50)}  |${ascii}|`);
  }
  return groups.join("\n");
}

/** Converte buffer em hex compacto (sem espaços) */
function toHexCompact(buf) {
  return Buffer.from(buf).toString("hex");
}

/** Logger colorido */
const C = {
  reset:  "\x1b[0m",
  gray:   "\x1b[90m",
  cyan:   "\x1b[36m",
  green:  "\x1b[32m",
  yellow: "\x1b[33m",
  red:    "\x1b[31m",
  blue:   "\x1b[34m",
  purple: "\x1b[35m",
  bold:   "\x1b[1m",
};

const log = {
  info:  (...a) => console.log(`${C.cyan}[INFO]${C.reset}`, ...a),
  ok:    (...a) => console.log(`${C.green}[ OK ]${C.reset}`, ...a),
  warn:  (...a) => console.log(`${C.yellow}[WARN]${C.reset}`, ...a),
  error: (...a) => console.log(`${C.red}[ERR ]${C.reset}`, ...a),
  out:   (...a) => console.log(`${C.blue}[ → ]${C.reset}`, ...a),   // host → device
  in:    (...a) => console.log(`${C.purple}[ ← ]${C.reset}`, ...a), // device → host
  sep:   ()     => console.log(`${C.gray}${"─".repeat(72)}${C.reset}`),
};

// ── Parser do formato usbmon texto (/dev/usbmon*) ────────────────────────────
//
// O kernel expõe /dev/usbmonN em formato texto. Cada evento ocupa 1 ou 2 linhas:
//
// Linha 1 (URB header):
//   <id> <timestamp> <event_type> <address> <urb_status> <data_tag> <bus_num>
//   <setup_packet or number_of_isochronous_descriptors> <data_length>
//
// Linha 2 (payload, opcional, começa com espaço):
//   <hex bytes separados por espaço>
//
// Campos relevantes:
//   event_type: 'S' = Submit (host→device), 'C' = Complete (device→host), 'E' = Error
//   address:    <bus>:<device>:<endpoint>
//   data_tag:   '=' = dados presentes, '<' = truncado, 'Z' = sem dados
//
// Referência: https://www.kernel.org/doc/Documentation/usb/usbmon.txt

class UsbmonParser {
  constructor() {
    this._pending = null; // header aguardando payload
  }

  /**
   * Processa uma linha do usbmon e retorna um evento completo ou null.
   * Chame com cada linha lida do /dev/usbmonN.
   */
  parseLine(line) {
    // Linha de payload pertence ao header anterior
    if (line.startsWith(" ") && this._pending) {
      const hexPart = line.trim();
      if (hexPart && hexPart !== "=") {
        const bytes = hexPart
          .split(" ")
          .filter(Boolean)
          .map((h) => parseInt(h, 16));
        this._pending.payload = Buffer.from(bytes);
      }
      const event = this._pending;
      this._pending = null;
      return event;
    }

    // Linha de header
    const parts = line.trim().split(/\s+/);
    if (parts.length < 9) return null;

    const [id, timestamp, eventType, address, status, dataTag, , , dataLength] = parts;

    // Filtra por tipo de evento relevante
    // 'S' = URB submetido (host→device), 'C' = URB completado (device→host)
    if (eventType !== "S" && eventType !== "C") return null;

    // Parseia address: bus.device.endpoint
    // Formato: BBB:DDD:EEE (bus, device, endpoint)
    const addrParts = address.split(":");
    if (addrParts.length < 3) return null;

    const devBus  = parseInt(addrParts[0], 10);
    const devAddr = parseInt(addrParts[1], 10);
    const epAddr  = parseInt(addrParts[2], 10);

    const event = {
      id,
      timestamp: parseFloat(timestamp),
      type: eventType,          // 'S' ou 'C'
      bus:  devBus,
      addr: devAddr,
      ep:   epAddr,
      status: parseInt(status, 10) || 0,
      dataTag,                  // '=', '<', 'Z', '-'
      dataLength: parseInt(dataLength, 10) || 0,
      payload: null,            // preenchido pela linha seguinte
    };

    // Se há dados, aguarda a próxima linha
    if (dataTag === "=" && event.dataLength > 0) {
      this._pending = event;
      return null; // ainda incompleto
    }

    return event;
  }
}

// ── Sessão de captura ─────────────────────────────────────────────────────────

class CaptureSession {
  constructor(deviceAddress) {
    this.deviceAddress = deviceAddress;
    this.packets = []; // { direction, ep, payload, timestamp }
    this.startTime = Date.now();
    this.packetCount = 0;
  }

  /**
   * Processa um evento parseado do usbmon e decide se deve imprimir/armazenar.
   */
  handle(event) {
    // Filtra por device address se configurado
    if (this.deviceAddress !== null && event.addr !== this.deviceAddress) {
      return;
    }

    // Ignora eventos sem dados ou com erro
    if (!event.payload || event.payload.length === 0) return;
    if (event.status !== 0 && event.type === "C") return; // URB com erro

    // Direção:
    //   'S' (Submit) com endpoint OUT (bit 7 = 0) → host→device (comando)
    //   'C' (Complete) com endpoint IN  (bit 7 = 1) → device→host (resposta)
    const isIn  = (event.ep & 0x80) !== 0;
    const isOut = (event.ep & 0x80) === 0 && event.ep !== 0x00; // ignora ep0 (control)

    if (!isIn && !isOut) return;

    const direction = isIn ? "IN" : "OUT";
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(3);

    this.packetCount++;
    this.packets.push({
      seq: this.packetCount,
      direction,
      ep: event.ep,
      payload: event.payload,
      timestamp: elapsed,
    });

    this.printPacket(direction, event.ep, event.payload, elapsed);
  }

  printPacket(direction, ep, payload, elapsed) {
    log.sep();
    if (direction === "OUT") {
      log.out(
        `${C.bold}#${this.packetCount} HOST → LEITOR${C.reset}` +
        `  ep=${ep.toString(16).padStart(2,"0")}  len=${payload.length}  t=${elapsed}s`
      );
    } else {
      log.in(
        `${C.bold}#${this.packetCount} LEITOR → HOST${C.reset}` +
        `  ep=${ep.toString(16).padStart(2,"0")}  len=${payload.length}  t=${elapsed}s`
      );
    }
    console.log(toHexAnnotated(payload));
    console.log(`    compact: ${toHexCompact(payload)}`);
  }

  printSummary() {
    log.sep();
    log.info(`${C.bold}=== RESUMO DA CAPTURA ===${C.reset}`);
    log.sep();
    log.info(`Total de pacotes: ${this.packetCount}`);
    log.info(`Duração: ${((Date.now() - this.startTime) / 1000).toFixed(1)} s`);
    log.sep();

    if (this.packets.length === 0) {
      log.warn("Nenhum pacote capturado.");
      log.warn("Possíveis causas:");
      log.warn("  1. O leitor não foi usado durante a captura (não passou o dedo).");
      log.warn("  2. O endereço do dispositivo mudou — rode 'lsusb' e ajuste DEVICE_ADDRESS.");
      log.warn("  3. O módulo usbmon não está carregado: sudo modprobe usbmon");
      return;
    }

    log.info("Sequência de troca de mensagens:");
    console.log("");
    for (const pkt of this.packets) {
      const arrow = pkt.direction === "OUT" ? "→" : "←";
      const color = pkt.direction === "OUT" ? C.blue : C.purple;
      console.log(
        `  ${color}${arrow}${C.reset} [${pkt.seq.toString().padStart(3)}]` +
        `  ep=${pkt.ep.toString(16).padStart(2,"0")}` +
        `  ${pkt.payload.length.toString().padStart(4)} bytes` +
        `  ${toHexCompact(pkt.payload).slice(0, 64)}${pkt.payload.length > 32 ? "…" : ""}`
      );
    }

    console.log("");
    log.sep();

    // Detecta padrões no payload
    this.analyzeProtocol();

    // Imprime payloads OUT completos para análise de protocolo
    const outPackets = this.packets.filter((p) => p.direction === "OUT");
    const inPackets  = this.packets.filter((p) => p.direction === "IN");

    if (outPackets.length > 0) {
      log.sep();
      log.info("Comandos enviados pelo HOST (OUT) — hex compacto:");
      for (const pkt of outPackets) {
        console.log(`  [${pkt.seq}] ${toHexCompact(pkt.payload)}`);
      }
    }

    if (inPackets.length > 0) {
      log.sep();
      log.info("Respostas do LEITOR (IN) — hex compacto:");
      for (const pkt of inPackets) {
        console.log(`  [${pkt.seq}] ${toHexCompact(pkt.payload)}`);
      }
    }

    // Identifica o maior payload IN (provável template biométrico)
    if (inPackets.length > 0) {
      const largest = inPackets.reduce((a, b) =>
        a.payload.length > b.payload.length ? a : b
      );
      if (largest.payload.length > 32) {
        log.sep();
        log.info(`${C.bold}Maior payload IN — provável template biométrico:${C.reset}`);
        log.info(`  Tamanho: ${largest.payload.length} bytes`);
        log.info(`  Hex compacto:`);
        console.log(`  ${toHexCompact(largest.payload)}`);
        this.detectTemplateFormat(largest.payload);
      }
    }

    log.sep();
    log.info("PRÓXIMOS PASSOS:");
    log.info("  1. Copie os bytes OUT acima — são os comandos de inicialização reais.");
    log.info("  2. Copie o maior payload IN — é o template biométrico real.");
    log.info("  3. Atualize o script probe-fingerprint-reader.mjs com os bytes OUT.");
    log.info("  4. Atualize KNOWN_FINGERPRINT_FILTERS em use-fingerprint-reader.ts:");
    log.info(`       vendorId: 0x2541 (${0x2541})  productId: 0x0236 (${0x0236})`);
    log.sep();
  }

  analyzeProtocol() {
    log.info("Análise heurística do protocolo:");
    console.log("");

    const outPackets = this.packets.filter((p) => p.direction === "OUT");
    const inPackets  = this.packets.filter((p) => p.direction === "IN");

    // Verifica byte inicial dos pacotes OUT
    if (outPackets.length > 0) {
      const firstBytes = outPackets.map((p) => p.payload[0]);
      const unique = [...new Set(firstBytes)];
      console.log(`  Bytes iniciais dos comandos OUT: ${unique.map((b) => "0x" + b.toString(16).padStart(2,"0")).join(", ")}`);

      if (unique.includes(0xAA)) {
        log.ok("  Protocolo CS9711 confirmado (SOF = 0xAA) ✅");
      } else if (unique.every((b) => b < 0x10)) {
        log.info("  Possível protocolo com byte de comando de 4 bits.");
      } else {
        log.warn("  Protocolo desconhecido — analise os bytes manualmente.");
      }
    }

    // Verifica formato dos payloads IN
    if (inPackets.length > 0) {
      const largest = inPackets.reduce((a, b) =>
        a.payload.length > b.payload.length ? a : b
      );
      this.detectTemplateFormat(largest.payload);
    }

    console.log("");
  }

  detectTemplateFormat(buf) {
    log.info("  Detecção de formato do template:");

    // ISO 19794-2: magic "FMR " (0x464D5220)
    if (buf.length >= 4 && buf.slice(0, 4).toString("ascii") === "FMR ") {
      log.ok(`    → ISO 19794-2 (FMR) ✅  tamanho=${buf.readUInt32BE(8)} bytes`);
      log.info("    → mode=\"hid\" no use-fingerprint-reader.ts");
      return;
    }

    // CS9711 com SOF 0xAA
    if (buf[0] === 0xAA) {
      log.ok("    → Protocolo CS9711 proprietário (SOF=0xAA)");
      log.info("    → O template está no payload a partir do byte 3");
      log.info("    → mode=\"hid\" no use-fingerprint-reader.ts");
      return;
    }

    // Verifica se parece texto hexadecimal (modo teclado via USB)
    const ascii = buf.toString("ascii").replace(/\0/g, "").trim();
    if (/^[0-9a-fA-F]+$/.test(ascii) && ascii.length > 20) {
      log.ok("    → String hexadecimal ASCII (emulação de teclado via USB)");
      log.info("    → mode=\"keyboard\" no use-fingerprint-reader.ts");
      return;
    }

    // Verifica se parece dados binários ISO comprimidos (primeiros bytes típicos)
    if (buf[0] === 0x46 && buf[1] === 0x4D) { // "FM"
      log.ok("    → Possível ISO 19794-2 sem magic completo");
      return;
    }

    log.warn("    → Formato não identificado automaticamente.");
    log.warn("    → Analise os primeiros bytes manualmente:");
    log.warn(`       ${toHexCompact(buf.slice(0, 32))}`);
  }
}

// ── Leitura linha a linha do /dev/usbmon ─────────────────────────────────────

function readUsbmon(usbmonPath, session) {
  return new Promise((resolve, reject) => {
    let fd;
    try {
      fd = fs.openSync(usbmonPath, "r");
    } catch (err) {
      reject(new Error(
        `Não foi possível abrir ${usbmonPath}: ${err.message}\n` +
        `  → Execute com sudo: sudo node scripts/capture-usb-traffic.mjs\n` +
        `  → Verifique se usbmon está carregado: sudo modprobe usbmon`
      ));
      return;
    }

    const parser = new UsbmonParser();
    let buffer = "";
    const readBuf = Buffer.alloc(4096);

    function readChunk() {
      try {
        const bytesRead = fs.readSync(fd, readBuf, 0, readBuf.length, null);
        if (bytesRead === 0) {
          // EOF — não deve acontecer em /dev/usbmon (é um stream), tenta de novo
          setImmediate(readChunk);
          return;
        }

        buffer += readBuf.slice(0, bytesRead).toString("utf8");
        const lines = buffer.split("\n");

        // A última fatia pode estar incompleta — guarda para o próximo chunk
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = parser.parseLine(line);
          if (event) {
            session.handle(event);
          }
        }

        setImmediate(readChunk);
      } catch (err) {
        fs.closeSync(fd);
        reject(err);
      }
    }

    readChunk();

    // Resolve quando o processo recebe SIGINT (Ctrl+C)
    process.once("_usbmon_stop", () => {
      try { fs.closeSync(fd); } catch (_) {}
      resolve();
    });
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n");
  log.sep();
  log.info(`${C.bold}CAPTURE-USB-TRAFFIC  —  CS9711 / Chipsailing 2541:0236${C.reset}`);
  log.sep();
  log.info(`Dispositivo : Bus ${BUS_NUMBER}, Addr ${DEVICE_ADDRESS ?? "(todos)"}`);
  log.info(`Interface   : ${USBMON_PATH}`);
  log.info(`Duração máx : ${MAX_CAPTURE_MS / 60_000} minutos`);
  log.sep();

  // Verifica se /dev/usbmon existe
  if (!fs.existsSync(USBMON_PATH)) {
    log.error(`${USBMON_PATH} não encontrado.`);
    log.error("Execute: sudo modprobe usbmon");
    log.error(`Dispositivos disponíveis: ${fs.readdirSync("/dev").filter((f) => f.startsWith("usbmon")).join(", ") || "(nenhum)"}`);
    process.exit(1);
  }

  // Verifica permissão de leitura
  try {
    fs.accessSync(USBMON_PATH, fs.constants.R_OK);
  } catch (_) {
    log.error(`Sem permissão de leitura em ${USBMON_PATH}.`);
    log.error("Execute com sudo: sudo node scripts/capture-usb-traffic.mjs");
    process.exit(1);
  }

  const session = new CaptureSession(DEVICE_ADDRESS);

  // Timeout de segurança
  const timeout = setTimeout(() => {
    log.warn(`Tempo máximo de captura atingido (${MAX_CAPTURE_MS / 60_000} min). Encerrando...`);
    process.emit("_usbmon_stop");
  }, MAX_CAPTURE_MS);
  timeout.unref();

  // Captura Ctrl+C para encerrar com resumo
  process.on("SIGINT", () => {
    console.log("\n");
    log.warn("Captura interrompida pelo usuário.");
    process.emit("_usbmon_stop");
  });

  log.info("Aguardando tráfego USB...");
  log.info(`${C.bold}👆 Passe o dedo no leitor agora.${C.reset}`);
  log.info("Pressione Ctrl+C para encerrar e ver o resumo.");
  log.sep();

  try {
    await readUsbmon(USBMON_PATH, session);
  } catch (err) {
    log.error(err.message);
    process.exit(1);
  }

  session.printSummary();
}

main().catch((err) => {
  log.error("Erro fatal:", err.message);
  process.exit(1);
});
