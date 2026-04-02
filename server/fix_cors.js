const fs = require('fs');
let code = fs.readFileSync('src/api/routes/room.ts', 'utf8');

// Insert import at top if it doesn't exist
if (!code.includes('import { PassThrough }')) {
  code = 'import { PassThrough } from "node:stream";\n' + code;
}

// Replace the body of /events async (request, reply) { ... }
code = code.replace(
  /reply\.raw\.setHeader\("Content-Type", "text\/event-stream"\);[\s\S]+?request\.raw\.on\("aborted", cleanup\);/m,
  `reply.header("Content-Type", "text/event-stream");
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
\t\t\trequest.raw.on("aborted", cleanup);`
);

fs.writeFileSync('src/api/routes/room.ts', code);
