const fs = require("fs");
const p = "src/api/routes/room.ts";
let c = fs.readFileSync(p, "utf8");

let start = c.indexOf("async (request, reply) => {", c.indexOf("/events"));
let end = c.indexOf("},", start) + 3;

let pre = c.slice(0, start);
let post = c.slice(end);

let code = `async (request, reply) => {
\treply.header("Content-Type", "text/event-stream");
\treply.header("Cache-Control", "no-cache");
\treply.header("Connection", "keep-alive");
\treply.header("X-Accel-Buffering", "no");

\tconst stream = new PassThrough();
\treply.send(stream);

\tconst send = (event: string, data: unknown) => {
\t\tstream.write(\`event: \${event}\\ndata: \${JSON.stringify(data)}\\n\\n\`);
\t};

\tsend("connected", { ok: true });

\tconst unsubscribe = sseBus.subscribeRoomStatus((event) => {
\t\tsend("room-status", event);
\t});

\tconst keepAlive = setInterval(() => {
\t\tstream.write(": ping\\n\\n");
\t}, 25000);

\tconst cleanup = () => {
\t\tclearInterval(keepAlive);
\t\tunsubscribe();
\t\tstream.end();
\t};

\trequest.raw.on("close", cleanup);
\trequest.raw.on("aborted", cleanup);
},`;

fs.writeFileSync(p, pre + code + "\n" + post);
