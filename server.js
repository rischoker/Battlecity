// Battle City 3D relay server
// - Serves the static game (index.html + KayKit_BlockBits_1.0_FREE/...) from this folder
// - Relays messages between the host screen and the phone controllers of each room
// - Transport: WebSocket at /ws (port 443 on Render) with an HTTP long-polling fallback (/rpc + /poll)
//   so it also works behind proxies that block WebSockets. No WebRTC, no STUN/TURN, no paid services.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 10000;
const ROOT = __dirname;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.gltf': 'model/gltf+json', '.glb': 'model/gltf-binary',
  '.bin': 'application/octet-stream', '.obj': 'text/plain', '.mtl': 'text/plain', '.mp3': 'audio/mpeg', '.ico': 'image/x-icon', '.sql': 'text/plain' };
const MAX_MSG = 16 * 1024;
const POLL_WAIT_MS = 20000;
const POLL_EXPIRE_MS = 35000;

// rooms: code -> { host: Endpoint|null, players: Map<cid, Endpoint>, touched }
const rooms = new Map();
function room(code) {
  let r = rooms.get(code);
  if (!r) { r = { host: null, players: new Map(), touched: Date.now() }; rooms.set(code, r); }
  r.touched = Date.now();
  return r;
}
const cleanRoom = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
const cleanId = (s) => String(s || '').replace(/[^A-Za-z0-9_\-]/g, '').slice(0, 40);

class Endpoint {
  constructor(kind, roomCode, role, cid) { this.kind = kind; this.room = roomCode; this.role = role; this.cid = cid; this.queue = []; this.waiter = null; this.ws = null; this.alive = true; this.lastSeen = Date.now(); }
  send(obj) {
    if (!this.alive) return;
    if (this.kind === 'ws') { try { if (this.ws.readyState === 1) this.ws.send(JSON.stringify(obj)); } catch (e) {} return; }
    this.queue.push(obj);
    if (this.queue.length > 400) this.queue.splice(0, this.queue.length - 400);
    this.flush();
  }
  flush() {
    if (!this.waiter || !this.queue.length) return;
    const res = this.waiter; this.waiter = null; clearTimeout(res._t);
    const out = this.queue; this.queue = [];
    sendJson(res, 200, out);
  }
  close() {
    if (!this.alive) return; this.alive = false;
    if (this.kind === 'ws') { try { this.ws.close(); } catch (e) {} }
    else if (this.waiter) { const res = this.waiter; this.waiter = null; clearTimeout(res._t); sendJson(res, 200, [{ sys: 'closed' }]); }
  }
}

function attach(ep) {
  const r = room(ep.room);
  if (ep.role === 'host') {
    if (r.host && r.host !== ep) { r.host.send({ sys: 'replaced' }); r.host.close(); }
    r.host = ep;
    // tell everybody already waiting that the host is (back) online, and tell the host who is here
    r.players.forEach((p, cid) => { p.send({ sys: 'hostup' }); ep.send({ sys: 'join', cid }); });
  } else {
    const old = r.players.get(ep.cid);
    if (old && old !== ep) old.close();
    r.players.set(ep.cid, ep);
    if (r.host) r.host.send({ sys: 'join', cid: ep.cid }); else ep.send({ sys: 'nohost' });
  }
}
function detach(ep) {
  const r = rooms.get(ep.room); if (!r) return;
  if (ep.role === 'host') { if (r.host === ep) { r.host = null; r.players.forEach(p => p.send({ sys: 'nohost' })); } }
  else if (r.players.get(ep.cid) === ep) { r.players.delete(ep.cid); if (r.host) r.host.send({ sys: 'leave', cid: ep.cid }); }
}
function route(ep, msg) {
  ep.lastSeen = Date.now();
  if (!msg || typeof msg !== 'object') return;
  const r = room(ep.room);
  if (ep.role === 'host') {
    if (msg.sys === 'drop' && msg.cid) { const p = r.players.get(cleanId(msg.cid)); if (p) { p.send(msg.d || { sys: 'closed' }); setTimeout(() => { detach(p); p.close(); }, 300); } return; }
    if (msg.to === '*') r.players.forEach(p => p.send(msg.d));
    else if (msg.to) { const p = r.players.get(cleanId(msg.to)); if (p) p.send(msg.d); }
  } else {
    if (r.host) r.host.send({ from: ep.cid, d: msg });
    else ep.send({ sys: 'nohost' });
  }
}
function parseMsgs(raw) {
  if (!raw || raw.length > MAX_MSG * 8) return [];
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v : [v]; } catch (e) { return []; }
}
function sendJson(res, code, obj) {
  if (res.writableEnded) return;
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(obj));
}

// ---------------- HTTP: static files + polling fallback ----------------
const pollEps = new Map(); // key -> Endpoint
function pollKey(q) { return `${cleanRoom(q.get('room'))}|${q.get('role') === 'host' ? 'host' : 'player'}|${cleanId(q.get('cid'))}`; }
function getPollEp(q) {
  const code = cleanRoom(q.get('room')), role = q.get('role') === 'host' ? 'host' : 'player', cid = role === 'host' ? 'HOST' : cleanId(q.get('cid'));
  if (!code || !cid) return null;
  const key = pollKey(q);
  let ep = pollEps.get(key);
  if (!ep || !ep.alive) { ep = new Endpoint('poll', code, role, cid); pollEps.set(key, ep); attach(ep); }
  ep.lastSeen = Date.now();
  return ep;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST', 'Access-Control-Allow-Headers': 'Content-Type' }); return res.end(); }
  if (url.pathname === '/health') return sendJson(res, 200, { ok: true, rooms: rooms.size, t: Date.now() });
  if (url.pathname === '/rpc' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > MAX_MSG * 8) req.destroy(); });
    req.on('end', () => { const ep = getPollEp(url.searchParams); if (!ep) return sendJson(res, 400, { error: 'bad params' }); parseMsgs(body).forEach(m => route(ep, m)); sendJson(res, 200, { ok: true }); });
    return;
  }
  if (url.pathname === '/poll') {
    const ep = getPollEp(url.searchParams); if (!ep) return sendJson(res, 400, { error: 'bad params' });
    if (ep.waiter) { const old = ep.waiter; clearTimeout(old._t); sendJson(old, 200, []); }
    ep.waiter = res;
    res._t = setTimeout(() => { if (ep.waiter === res) { ep.waiter = null; sendJson(res, 200, []); } }, POLL_WAIT_MS);
    req.on('close', () => { if (ep.waiter === res) { ep.waiter = null; clearTimeout(res._t); } });
    ep.flush();
    return;
  }
  // static files
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT) || /server\.js$|package(-lock)?\.json$|node_modules/.test(file)) { res.writeHead(404); return res.end('Not found'); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('Not found'); }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Content-Length': st.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400', 'Access-Control-Allow-Origin': '*' });
    fs.createReadStream(file).pipe(res);
  });
});

// ---------------- WebSocket ----------------
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: MAX_MSG });
wss.on('connection', (ws, req) => {
  const q = new URL(req.url, 'http://x').searchParams;
  const code = cleanRoom(q.get('room')), role = q.get('role') === 'host' ? 'host' : 'player', cid = role === 'host' ? 'HOST' : cleanId(q.get('cid'));
  if (!code || !cid) { ws.close(1008, 'bad params'); return; }
  const ep = new Endpoint('ws', code, role, cid); ep.ws = ws;
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', (raw) => { ws.isAlive = true; parseMsgs(raw.toString()).forEach(m => route(ep, m)); });
  ws.on('close', () => { if (ep.alive) { ep.alive = false; detach(ep); } });
  ws.on('error', () => {});
  ep.send({ sys: 'hello', role });
  attach(ep);
});

// keep-alive + cleanup
setInterval(() => {
  wss.clients.forEach(ws => { if (!ws.isAlive) return ws.terminate(); ws.isAlive = false; try { ws.ping(); } catch (e) {} });
  const now = Date.now();
  pollEps.forEach((ep, key) => { if (!ep.waiter && now - ep.lastSeen > POLL_EXPIRE_MS) { ep.close(); detach(ep); pollEps.delete(key); } });
  rooms.forEach((r, code) => { if (!r.host && !r.players.size && now - r.touched > 600000) rooms.delete(code); });
}, 15000);

server.listen(PORT, () => console.log(`Battle City relay listening on :${PORT}`));
