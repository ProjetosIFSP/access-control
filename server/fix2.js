const fs = require("fs");
const p = "src/api/routes/room.ts";
let lines = fs.readFileSync(p, "utf8").split('\n');

let start = -1;
let end = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("async (request, reply) => {") && start === -1) {
    if (lines[i-15] && lines[i-15].includes("/events")) {
      start = i;
    }
  }
  if (lines[i].includes("// ── GET /rooms/summary")) {
    end = i - 2; // lines[i-2] is `},` and lines[i-1] is `);`
    break;
  }
}

console.log("start", start, "end", end);

let code = `\t\tasync (request, reply) => {
\t\t\t// Utilizar PassThrough habilita envio por stream e ativa o CORS do Fastify
\t\t\treply.header("Content-Type", "text/event-stream");
\t\t\treply.header("Cache-Control", "no-cache");
\t\t\treply.header("Connection", "keep-alive");
\t\t\treply.header("X-Accel-Buffering", "no");

\t\t\tconst stream = new PassThrough();
\t\t\treply.send(stream);

\t\t\tconst send = (event: string, data: unknown) => {
\t\t\t\tstream.write(\`event: \${event}\\ndata: \${JSON.stringify(data)}\\n\\n\`);
\t\t\t};

\t\t\tsend("connected", { ok: true });

\t\t\tconst unsubscribe = sseBus.subscribeRoomStatus((event) => {
\t\t\t\tsend("room-status", event);
\t\t\t});

\t\t\tconst keepAlive = setInterval(() => {
\t\t\t\tstream.write(": ping\\n\\n");
\t\t\t}, 25000);

\t\t\tconst cleanup = () => {
\t\t\t\tclearInterval(keepAlive);
\t\t\t\tunsubscribe();
\t\t\t\tstream.end();
\t\t\t};

\t\t\trequest.raw.on("close", cleanup);
\t\t\trequest.raw.on("aborted", cleanup);
\t\t},
\t);`;

let newContent = [...lines.slice(0, start), code, ...lines.slice(end + 2)].join('\n');
fs.writeFileSync(p, newContent);
