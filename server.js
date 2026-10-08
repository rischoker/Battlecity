/* ============================================================
   BATTLE CITY 3D — server (Render Web Service, free plan)
   - Express serves the game from /public (zero external CDNs)
   - Socket.IO rooms: the host screen and the phones of each room talk through this server
     (no P2P). transports ['polling','websocket'] → works behind school proxies.
   - The match runs on the host screen; the server routes messages and keeps rooms alive
     across host reloads, phone reconnects and server restarts.
   - /api/scores proxies the Supabase leaderboard, so the classroom PC only needs this domain.
   ============================================================ */
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const ROOM_TTL_MS = 3 * 60 * 1000;            // a room without its host lives this long
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '';
const SCORES_TABLE = process.env.SCORES_TABLE || 'battlecity_scores';
const PUBLIC_DIR = path.join(__dirname, 'public');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  transports: ['polling', 'websocket'],
  pingInterval: 10000, pingTimeout: 20000,
  maxHttpBufferSize: 64 * 1024
});

/* ---------------- HTTP ---------------- */
app.use(express.static(PUBLIC_DIR, {
  maxAge: '1h',
  setHeaders: (res, file) => { if (/\.(html|js)$/.test(file) && /public[\\/](index\.html|app\.js)$/.test(file)) res.setHeader('Cache-Control', 'no-cache'); }
}));
app.get('/host', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));
app.get('/healthz', (req, res) => res.json({ ok: true, uptime: Math.round(process.uptime()), rooms: rooms.size, sockets: io.engine.clientsCount }));

// ---- Leaderboard proxy (Supabase REST) ----
const lbHeaders = () => {
  const h = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' };
  if (!SUPABASE_KEY.startsWith('sb_')) h.Authorization = 'Bearer ' + SUPABASE_KEY; // legacy JWT keys
  return h;
};
const lbOn = () => !!(SUPABASE_URL && SUPABASE_KEY);
let lbCache = { t: 0, rows: null };
const postHits = new Map(); // ip -> [timestamps]
app.get('/api/scores', async (req, res) => {
  if (!lbOn()) return res.status(503).json({ ok: false, error: 'leaderboard not configured' });
  if (lbCache.rows && Date.now() - lbCache.t < 15000) return res.json({ ok: true, rows: lbCache.rows, cached: true });
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${SCORES_TABLE}?select=squad,players,score,wave,kills,time_s,created_at&order=score.desc&limit=10`,
      { headers: lbHeaders(), signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error('supabase ' + r.status);
    lbCache = { t: Date.now(), rows: await r.json() };
    res.json({ ok: true, rows: lbCache.rows });
  } catch (e) {
    console.warn('[scores] read failed:', e.message);
    if (lbCache.rows) return res.json({ ok: true, rows: lbCache.rows, stale: true });
    res.status(502).json({ ok: false, error: 'leaderboard unavailable' });
  }
});
app.post('/api/scores', express.json({ limit: '4kb' }), async (req, res) => {
  if (!lbOn()) return res.status(503).json({ ok: false, error: 'leaderboard not configured' });
  const ip = req.ip || 'x', now = Date.now();
  const hits = (postHits.get(ip) || []).filter(t => now - t < 60000); hits.push(now); postHits.set(ip, hits);
  if (hits.length > 10) return res.status(429).json({ ok: false, error: 'too many scores' });
  const b = req.body || {};
  const int = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
  const entry = {
    squad: String(b.squad || 'SQUAD').replace(/[<>]/g, '').slice(0, 60) || 'SQUAD',
    players: int(b.players, 1, 7), score: int(b.score, 0, 9999999), wave: int(b.wave, 1, 999),
    kills: int(b.kills, 0, 99999), time_s: int(b.time_s, 0, 86399)
  };
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${SCORES_TABLE}`,
      { method: 'POST', headers: { ...lbHeaders(), Prefer: 'return=minimal' }, body: JSON.stringify(entry), signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error('supabase ' + r.status + ' ' + (await r.text()).slice(0, 200));
    lbCache.t = 0;
    res.json({ ok: true });
  } catch (e) {
    console.warn('[scores] write failed:', e.message);
    res.status(502).json({ ok: false, error: 'could not save score' });
  }
});

/* ---------------- Rooms ----------------
   room = { code, token, hostId, hostGoneAt, players: Map<cid, socketId>, created } */
const rooms = new Map();
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const ROOM_RE = /^[A-Z]{5}$/;
const cleanId = (s) => String(s || '').replace(/[^A-Za-z0-9_\-]/g, '').slice(0, 40);
function newCode() {
  let c;
  do { c = Array.from({ length: 5 }, () => LETTERS[crypto.randomInt(LETTERS.length)]).join(''); } while (rooms.has(c));
  return c;
}
function makeRoom(code, token) {
  const room = { code, token, hostId: null, hostGoneAt: null, players: new Map(), created: Date.now() };
  rooms.set(code, room);
  return room;
}
function attachHost(room, socket) {
  if (room.hostId && room.hostId !== socket.id) {
    io.to(room.hostId).emit('sys', { sys: 'replaced' });
    const old = io.sockets.sockets.get(room.hostId); if (old) { old.data.room = null; old.disconnect(true); }
  }
  room.hostId = socket.id; room.hostGoneAt = null;
  socket.data.role = 'host'; socket.data.room = room.code;
  // Everyone already in the room learns the host is back; the host learns who is here
  room.players.forEach((sid, cid) => { io.to(sid).emit('sys', { sys: 'hostup' }); socket.emit('sys', { sys: 'join', cid }); });
}
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

io.on('connection', (socket) => {
  socket.data.role = null; socket.data.room = null; socket.data.cid = null;

  socket.on('host:create', (_, cb) => {
    const room = makeRoom(newCode(), crypto.randomBytes(16).toString('hex'));
    attachHost(room, socket);
    log('room created', room.code);
    typeof cb === 'function' && cb({ ok: true, code: room.code, token: room.token });
  });

  // Host reload / reconnect / server restart: same code back with the secret token
  socket.on('host:resume', ({ code, token } = {}, cb) => {
    code = String(code || '').toUpperCase(); token = String(token || '');
    if (!ROOM_RE.test(code) || token.length < 16) return typeof cb === 'function' && cb({ ok: false });
    let room = rooms.get(code), restored = false;
    if (!room) { room = makeRoom(code, token); restored = true; log('room restored after restart', code); }
    else if (room.token !== token) return typeof cb === 'function' && cb({ ok: false, error: 'TOKEN' });
    attachHost(room, socket);
    typeof cb === 'function' && cb({ ok: true, code, restored });
  });

  socket.on('player:join', ({ code, cid, name } = {}, cb) => {
    code = String(code || '').toUpperCase().replace(/[^A-Z]/g, ''); cid = cleanId(cid);
    const room = rooms.get(code);
    if (!room || !cid) return typeof cb === 'function' && cb({ ok: false, error: room ? 'BAD_ID' : 'NO_ROOM' });
    const old = room.players.get(cid);
    if (old && old !== socket.id) { const s = io.sockets.sockets.get(old); if (s) { s.data.room = null; s.disconnect(true); } }
    room.players.set(cid, socket.id);
    socket.data.role = 'player'; socket.data.room = code; socket.data.cid = cid;
    if (room.hostId) io.to(room.hostId).emit('sys', { sys: 'join', cid });
    typeof cb === 'function' && cb({ ok: true, hostOnline: !!room.hostId });
  });

  // host -> phones: { to: cid | '*', d }   ·   { sys: 'drop', cid, d } delivers d then closes that phone
  socket.on('h', (m) => {
    const room = socket.data.role === 'host' && rooms.get(socket.data.room);
    if (!room || room.hostId !== socket.id || !m) return;
    if (m.sys === 'drop' && m.cid) {
      const cid = cleanId(m.cid), sid = room.players.get(cid);
      if (sid) {
        io.to(sid).emit('m', m.d || { type: 'kicked' });
        room.players.delete(cid);
        setTimeout(() => { const s = io.sockets.sockets.get(sid); if (s) { s.data.room = null; s.disconnect(true); } }, 400);
      }
      return;
    }
    if (m.to === '*') room.players.forEach(sid => io.to(sid).emit('m', m.d));
    else if (m.to) { const sid = room.players.get(cleanId(m.to)); if (sid) io.to(sid).emit('m', m.d); }
  });

  // phone -> host
  socket.on('p', (d) => {
    const room = socket.data.role === 'player' && rooms.get(socket.data.room);
    if (!room || !d) return;
    if (room.players.get(socket.data.cid) !== socket.id) return;
    if (room.hostId) io.to(room.hostId).emit('m', { from: socket.data.cid, d });
    else socket.emit('sys', { sys: 'nohost' });
  });

  socket.on('disconnect', () => {
    const room = socket.data.room && rooms.get(socket.data.room);
    if (!room) return;
    if (socket.data.role === 'host' && room.hostId === socket.id) {
      room.hostId = null; room.hostGoneAt = Date.now();
      room.players.forEach(sid => io.to(sid).emit('sys', { sys: 'nohost' }));
    } else if (socket.data.role === 'player' && room.players.get(socket.data.cid) === socket.id) {
      room.players.delete(socket.data.cid);
      if (room.hostId) io.to(room.hostId).emit('sys', { sys: 'leave', cid: socket.data.cid });
    }
  });
});

// Rooms whose host has been gone for 3 minutes are closed
setInterval(() => {
  const now = Date.now();
  rooms.forEach((room, code) => {
    if (!room.hostId && room.hostGoneAt && now - room.hostGoneAt > ROOM_TTL_MS) {
      room.players.forEach(sid => io.to(sid).emit('sys', { sys: 'closed' }));
      rooms.delete(code); log('room closed (host gone 3 min)', code);
    }
  });
  postHits.forEach((v, ip) => { if (!v.some(t => now - t < 60000)) postHits.delete(ip); });
}, 15000);

server.listen(PORT, () => log(`Battle City 3D listening on :${PORT} · leaderboard ${lbOn() ? 'ON' : 'OFF (set SUPABASE_URL + SUPABASE_KEY)'}`));
