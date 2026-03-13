const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = 3000;
const STATIC_DIR = '/static';
const DATA_DIR = '/data';
const TIMEOUT = 90000; // 90s (client polls every 30s, so 3 missed polls = offline)
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');

// --- Heartbeat (active players) ---
const sessions = new Map();
function cleanupSessions() {
  const now = Date.now();
  for (const [id, ts] of sessions) {
    if (now - ts > TIMEOUT) sessions.delete(id);
  }
}

// --- Leaderboard ---
let leaderboard = []; // Array of { pid, zooName, score, stars, playTimeSeconds, totalClicks, totalAnimals, achievements, animals, trust, updatedAt }

function loadLeaderboard() {
  try {
    if (fs.existsSync(LEADERBOARD_FILE)) {
      leaderboard = JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to load leaderboard:', e.message);
    leaderboard = [];
  }
}

function saveLeaderboard() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboard, null, 2));
  } catch (e) {
    console.error('Failed to save leaderboard:', e.message);
  }
}

// Anti-cheat: calculate trust score (0-100)
// 12 animals in order of cost: mier, slak, kikker, kip, kat, hond, lama, paard, panda, olifant, walvis, draak
const ANIMAL_ORDER = ['mier','slak','kikker','kip','kat','hond','lama','paard','panda','olifant','walvis','draak'];

function calculateTrust(data) {
  let trust = 100;
  const reasons = [];

  const score = data.score || 0;
  const playTime = data.playTimeSeconds || 0;
  const clicks = data.totalClicks || 0;
  const animals = data.animals || {};

  // 1. Play time vs score ratio (scaled by prestige stars)
  // Each star gives +5% DPS, and prestige enables exponential growth
  // Base threshold: 1e12/sec, doubled per 10 stars
  if (playTime > 0) {
    const stars = data.stars || 0;
    const starScale = Math.pow(2, Math.floor(stars / 10));
    const threshold = 1e12 * starScale;
    const earningsPerSec = score / playTime;
    if (earningsPerSec > threshold * 100) { trust -= 40; reasons.push('score/tijd'); }
    else if (earningsPerSec > threshold * 10) { trust -= 20; reasons.push('score/tijd'); }
  }

  // 2. Click ratio: max ~15 clicks per second
  if (playTime > 60) { // only check after 1 min
    const cps = clicks / playTime;
    if (cps > 20) { trust -= 30; reasons.push('kliksnelheid'); }
    else if (cps > 15) { trust -= 15; reasons.push('kliksnelheid'); }
  }

  // 3. Progression logic: can't have expensive animals without cheaper ones
  let prevOwned = true;
  for (const id of ANIMAL_ORDER) {
    const count = animals[id] || 0;
    if (count > 0 && !prevOwned) {
      trust -= 25;
      reasons.push('progressie');
      break;
    }
    if (count === 0) prevOwned = false;
  }

  // 4. Minimum play time for high scores
  if (score > 1e10 && playTime < 600) { trust -= 30; reasons.push('te snel'); }
  if (score > 1e15 && playTime < 3600) { trust -= 30; reasons.push('te snel'); }

  // 5. Reasonable animal counts (no single animal > 10000)
  for (const id of ANIMAL_ORDER) {
    if ((animals[id] || 0) > 10000) {
      trust -= 20;
      reasons.push('dieraantal');
      break;
    }
  }

  // 6. Stars vs play time
  // Real players average 5-13 min per star. Under 2 min/star is suspicious.
  const stars = data.stars || 0;
  if (stars > 0) {
    const minsPerStar = playTime > 0 ? (playTime / 60) / stars : 0;
    if (minsPerStar < 1) { trust -= 40; reasons.push('sterren/tijd'); }
    else if (minsPerStar < 2) { trust -= 20; reasons.push('sterren/tijd'); }
  }

  // 7. Stars vs total prestiges: each prestige gives 1-~10 stars (avg ~8)
  // Experienced players with high scores can hit 10+ per prestige, allow up to 12 average
  const prestiges = data.timesReset || 0;
  if (prestiges > 0 && stars > prestiges * 12) {
    trust -= 30;
    reasons.push('sterren/evoluties');
  }

  // 8. Stars require owning all 12 animals to prestige
  // After prestige, animals reset to 0, so only flag if no prestiges recorded
  const totalAnimals = ANIMAL_ORDER.reduce((s, id) => s + (animals[id] || 0), 0);
  if (stars > 0 && totalAnimals < 12 && !prestiges) {
    trust -= 40;
    reasons.push('sterren zonder dieren');
  }

  // 9. Play time vs time since game launch (26 feb 2026)
  const GAME_BIRTH = new Date('2026-02-26T00:00:00Z').getTime();
  const maxPossibleSeconds = (Date.now() - GAME_BIRTH) / 1000;
  if (playTime > maxPossibleSeconds) {
    trust -= 50;
    reasons.push('speeltijd onmogelijk');
  } else if (maxPossibleSeconds > 0) {
    const playRatio = playTime / maxPossibleSeconds;
    if (playRatio > 0.7) { trust -= 30; reasons.push('speeltijd onrealistisch'); }
    else if (playRatio > 0.5) { trust -= 20; reasons.push('speeltijd onrealistisch'); }
  }

  return { score: Math.max(0, Math.min(100, trust)), reasons };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > 1e6) { reject(new Error('Too large')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function handleLeaderboardPost(req, res) {
  readBody(req).then(data => {
    const pid = data.pid;
    const zooName = (data.zooName || '').toString().slice(0, 20).trim();
    if (!pid || !zooName) {
      res.writeHead(400);
      return res.end(JSON.stringify({ error: 'pid en zooName vereist' }));
    }

    const trustResult = calculateTrust(data);
    const entry = {
      pid,
      zooName,
      score: Math.floor(data.score || 0),
      stars: Math.floor(data.stars || 0),
      timesReset: Math.floor(data.timesReset || 0),
      playTimeSeconds: Math.floor(data.playTimeSeconds || 0),
      totalClicks: Math.floor(data.totalClicks || 0),
      totalAnimals: Math.floor(data.totalAnimals || 0),
      achievements: Math.floor(data.achievements || 0),
      animals: data.animals || {},
      trust: trustResult.score,
      trustReasons: trustResult.reasons,
      updatedAt: Date.now(),
    };

    // Update existing or add new
    const idx = leaderboard.findIndex(e => e.pid === pid);
    if (idx >= 0) {
      // Only update if new score is higher
      if (entry.score >= leaderboard[idx].score) {
        leaderboard[idx] = entry;
      } else {
        // Keep high score, update everything else
        const highScore = leaderboard[idx].score;
        leaderboard[idx] = entry;
        leaderboard[idx].score = highScore;
      }
    } else {
      leaderboard.push(entry);
    }

    // Sort by stars descending, then score as tiebreaker
    leaderboard.sort((a, b) => b.stars - a.stars || b.score - a.score);

    // Cap at 500 entries
    if (leaderboard.length > 500) leaderboard.length = 500;

    saveLeaderboard();

    // Return rank
    const rank = leaderboard.findIndex(e => e.pid === pid) + 1;
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true, rank }));
  }).catch(err => {
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'Ongeldige data' }));
  });
}

function handleLeaderboardGet(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const pid = url.searchParams.get('pid');
  const trustedOnly = url.searchParams.get('trusted') === '1';

  let filtered = trustedOnly ? leaderboard.filter(e => e.trust >= 60) : leaderboard;
  const top = filtered.slice(0, 100).map((e, i) => ({
    rank: i + 1,
    zooName: e.zooName,
    score: e.score,
    stars: e.stars,
    trust: e.trust,
    playTimeSeconds: e.playTimeSeconds,
  }));

  let me = null;
  if (pid) {
    const myIdx = filtered.findIndex(e => e.pid === pid);
    if (myIdx >= 0) {
      const e = filtered[myIdx];
      me = {
        rank: myIdx + 1,
        zooName: e.zooName,
        score: e.score,
        stars: e.stars,
        trust: e.trust,
        playTimeSeconds: e.playTimeSeconds,
      };
    }
  }

  res.writeHead(200);
  res.end(JSON.stringify({ top: top, me, total: filtered.length }));
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
  res.setHeader('Content-Type', 'application/json');

  // --- API routes ---
  if (url.pathname === '/api/heartbeat') {
    let sid = url.searchParams.get('sid');
    if (!sid) sid = Math.random().toString(36).slice(2);
    sessions.set(sid, Date.now());
    cleanupSessions();
    res.writeHead(200);
    res.end(JSON.stringify({ online: sessions.size, sid }));
    return;
  }

  if (url.pathname === '/api/leaderboard') {
    if (req.method === 'POST') return handleLeaderboardPost(req, res);
    if (req.method === 'GET') return handleLeaderboardGet(req, res);
    res.writeHead(405);
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  // --- Static files ---
  res.removeHeader('Content-Type');
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

// Load leaderboard data on startup
loadLeaderboard();

server.listen(PORT, '0.0.0.0', () => {
  console.log('TobyGames server running on port ' + PORT);
});
