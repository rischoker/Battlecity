/* ============================================================
   BATTLE CITY 3D — server (Render Web Service, free plan)
   - Express serves the game from /public (no external CDNs needed)
   - Socket.IO relays messages between the host screen and the phones of each room.
     Socket.IO starts on HTTPS long-polling and upgrades to WebSocket when the network
     allows it, so it works behind school proxies and on mobile data (no WebRTC/PeerJS).
   - The match itself runs on the host screen (real-time 3D); the server only routes messages.
   ============================================================ */
const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  pingInterval: 10000, pingTimeout: 20000,
  maxHttpBufferSize: 64 * 1024
});

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1h',
  setHeaders: (res, file) => { if (file.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache'); }
}));
app.get(['/health', '/healthz'], (req, res) => res.json({ ok: true, rooms: rooms.size, t: Date.now() }));

/* ---------------- Rooms ----------------
   rooms: code -> { hostId: socket.id|null, players: Map<cid, socket.id>, touched } */
const rooms = new Map();
const cleanRoom = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
const cleanId = (s) => String(s || '').replace(/[^A-Za-z0-9_\-]/g, '').slice(0, 40);
function getRoom(code) {
  let r = rooms.get(code);
  if (!r) { r = { hostId: null, players: new Map(), touched: Date.now() }; rooms.set(code, r); }
  r.touched = Date.now();
  return r;
}

io.on('connection', (socket) => {
  let code = null, role = null, cid = null;

  // Both sides announce themselves: { room, role: 'host'|'player', cid }
  socket.on('join', (q = {}) => {
    code = cleanRoom(q.room); role = q.role === 'host' ? 'host' : 'player'; cid = role === 'host' ? 'HOST' : cleanId(q.cid);
    if (!code || !cid) return socket.emit('sys', { sys: 'bad' });
    const r = getRoom(code);
    if (role === 'host') {
      if (r.hostId && r.hostId !== socket.id) { io.to(r.hostId).emit('sys', { sys: 'replaced' }); io.sockets.sockets.get(r.hostId)?.disconnect(true); }
      r.hostId = socket.id;
      r.players.forEach((sid, pcid) => { io.to(sid).emit('sys', { sys: 'hostup' }); socket.emit('sys', { sys: 'join', cid: pcid }); });
    } else {
      const old = r.players.get(cid);
      if (old && old !== socket.id) io.sockets.sockets.get(old)?.disconnect(true);
      r.players.set(cid, socket.id);
      if (r.hostId) io.to(r.hostId).emit('sys', { sys: 'join', cid }); else socket.emit('sys', { sys: 'nohost' });
    }
    socket.emit('sys', { sys: 'hello', role });
  });

  // host -> phones: { to: cid | '*', d: message }  ·  { sys: 'drop', cid, d? } closes a phone
  socket.on('h', (m) => {
    if (role !== 'host' || !m) return;
    const r = rooms.get(code); if (!r || r.hostId !== socket.id) return;
    r.touched = Date.now();
    if (m.sys === 'drop' && m.cid) {
      const sid = r.players.get(cleanId(m.cid));
      if (sid) { io.to(sid).emit('m', m.d || { type: 'kicked' }); setTimeout(() => io.sockets.sockets.get(sid)?.disconnect(true), 300); }
      return;
    }
    if (m.to === '*') r.players.forEach(sid => io.to(sid).emit('m', m.d));
    else if (m.to) { const sid = r.players.get(cleanId(m.to)); if (sid) io.to(sid).emit('m', m.d); }
  });

  // phone -> host
  socket.on('p', (d) => {
    if (role !== 'player' || !d) return;
    const r = rooms.get(code); if (!r) return;
    r.touched = Date.now();
    if (r.hostId) io.to(r.hostId).emit('m', { from: cid, d });
    else socket.emit('sys', { sys: 'nohost' });
  });

  socket.on('disconnect', () => {
    const r = code && rooms.get(code); if (!r) return;
    if (role === 'host' && r.hostId === socket.id) {
      r.hostId = null;
      r.players.forEach(sid => io.to(sid).emit('sys', { sys: 'nohost' }));
    } else if (role === 'player' && r.players.get(cid) === socket.id) {
      r.players.delete(cid);
      if (r.hostId) io.to(r.hostId).emit('sys', { sys: 'leave', cid });
    }
  });
});

// Clean up empty rooms
setInterval(() => {
  const now = Date.now();
  rooms.forEach((r, c) => { if (!r.hostId && !r.players.size && now - r.touched > 10 * 60 * 1000) rooms.delete(c); });
}, 60 * 1000);

server.listen(PORT, () => console.log('Battle City 3D on http://localhost:' + PORT));
