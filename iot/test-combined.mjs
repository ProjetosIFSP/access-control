import http from 'http';

// Start listening
const req = http.request('http://localhost:3333/rooms/events', { headers: { accept: 'text/event-stream' } }, res => {
  console.log(`SSE Status: ${res.statusCode}`);
  res.on('data', chunk => console.log('SSE Received:', chunk.toString()));
  
  // As soon as connected, send PUT
  setTimeout(() => {
    const data = JSON.stringify({ isLocked: true, doorState: "LOCKED" });
    const putReq = http.request('http://localhost:3333/iot/devices/esp8266-600194700091/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, putRes => {
      console.log(`PUT Status: ${putRes.statusCode}`);
      putRes.on('data', d => console.log('PUT payload:', d.toString()));
    });
    putReq.write(data);
    putReq.end();
  }, 1000);
});
req.end();

// Wait some time then exit so tool doesn't hang forever
setTimeout(() => process.exit(0), 3000);
