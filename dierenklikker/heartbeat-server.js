// Tiny heartbeat server for active player counting
// Run: node dierenklikker/heartbeat-server.js
// Then proxy /api/heartbeat to http://localhost:3099 via nginx
const http = require('http');
const PORT = 3099;
const TIMEOUT = 60000; // 60s = considered "online"

const sessions = new Map(); // sessionId -> lastSeen timestamp

function cleanup() {
  const now = Date.now();
  for (const [id, ts] of sessions) {
    if (now - ts > TIMEOUT) sessions.delete(id);
  }
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  // Generate or reuse session from query
  const url = new URL(req.url, 'http://localhost');
  let sid = url.searchParams.get('sid');
  if (!sid) sid = Math.random().toString(36).slice(2);
  sessions.set(sid, Date.now());
  cleanup();
  res.writeHead(200);
  res.end(JSON.stringify({ online: sessions.size, sid }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('Heartbeat server on port ' + PORT);
});
