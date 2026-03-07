const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = 3000;
const STATIC_DIR = '/static';
const TIMEOUT = 90000; // 90s (client polls every 30s, so 3 missed polls = offline)

// --- Heartbeat (active players) ---
const sessions = new Map();
function cleanupSessions() {
  const now = Date.now();
  for (const [id, ts] of sessions) {
    if (now - ts > TIMEOUT) sessions.delete(id);
  }
}

// --- MIME types ---
const MIME = {
  '.html':'text/html','.css':'text/css','.js':'application/javascript',
  '.json':'application/json','.png':'image/png','.jpg':'image/jpeg',
  '.gif':'image/gif','.svg':'image/svg+xml','.ico':'image/x-icon',
  '.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf',
  '.md':'text/plain',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  // --- API routes ---
  if (url.pathname === '/api/heartbeat') {
    res.setHeader('Content-Type', 'application/json');
    let sid = url.searchParams.get('sid');
    if (!sid) sid = Math.random().toString(36).slice(2);
    sessions.set(sid, Date.now());
    cleanupSessions();
    res.writeHead(200);
    res.end(JSON.stringify({ online: sessions.size, sid }));
    return;
  }

  // --- Static files ---
  let filePath = path.join(STATIC_DIR, url.pathname);
  if (filePath.endsWith('/')) filePath += 'index.html';
  // Security: prevent path traversal
  if (!path.resolve(filePath).startsWith(STATIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      // Try adding .html
      if (!path.extname(filePath)) {
        filePath += '.html';
        fs.stat(filePath, (err2, stat2) => {
          if (err2 || !stat2.isFile()) { res.writeHead(404); return res.end('Not found'); }
          serveFile(filePath, res);
        });
        return;
      }
      res.writeHead(404);
      return res.end('Not found');
    }
    serveFile(filePath, res);
  });
});

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';
  const stream = fs.createReadStream(filePath);
  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
  });
  stream.pipe(res);
  stream.on('error', () => { res.writeHead(500); res.end('Error'); });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log('TobyGames server running on port ' + PORT);
});
