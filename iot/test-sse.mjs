import http from 'http';
const req = http.request('http://localhost:3333/api/rooms/events', { headers: { accept: 'text/event-stream' } }, res => {
  console.log(`Status: ${res.statusCode}`);
  res.on('data', chunk => console.log(chunk.toString()));
});
req.end();
