import http from 'http';
const data = JSON.stringify({ isLocked: false, doorState: "OPEN" });
const req = http.request('http://localhost:3333/iot/devices/e4fae0/status', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, res => {
  console.log(`PUT Status: ${res.statusCode}`);
  res.on('data', chunk => console.log(chunk.toString()));
});
req.write(data);
req.end();
