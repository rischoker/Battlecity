# Battle City 3D

Tanques low-poly cooperativos: la pantalla (host) corre la partida en 3D y los estudiantes juegan con su celular como control.

## Arquitectura (igual que Duel Arena)

- **Render Web Service (Node, plan Free)**
- **Express** sirve el juego desde `public/` (sin CDNs externos: three.js, Socket.IO, Tailwind y la fuente están en `public/vendor/`).
- **Socket.IO** conecta la pantalla y los celulares por salas. Empieza por HTTPS long-polling y sube a WebSocket
  si la red lo permite → funciona detrás del proxy de la academia y con datos móviles. Sin PeerJS ni WebRTC.
- La partida corre en el PC del host; el servidor solo enruta mensajes (host ⇄ celulares).

```
server.js            servidor Express + Socket.IO
package.json         dependencias (express, socket.io)
render.yaml          configuración para Render (Blueprint)
public/index.html    juego completo (host + control del celular)
public/vendor/       librerías locales
public/KayKit_BlockBits_1.0_FREE/   bloques del mapa
supabase_battlecity_scores.sql      tabla del leaderboard global (opcional)
```

Si tienes la carpeta `Artizau_Tanks_1.0_FREE`, ponla dentro de `public/`.

## Publicar en Render

1. Sube todo esto al repo `Battlecity`.
2. Render → **New + → Web Service** → repo `Battlecity` → Runtime **Node**, Build `npm install`,
   Start `node server.js`, Health Check Path `/healthz`, plan **Free**. (O **New + → Blueprint** con `render.yaml`.)
3. Abre la URL de Render en el PC del proyector; el QR apunta a la misma URL.

El plan gratis duerme tras ~15 min sin uso: abre la página 1–2 minutos antes de clase
(verás `WAKING UP SERVER…` y luego `SERVER ONLINE`).

## Probar en local

```
npm install
npm start      # http://localhost:3000
```

Diagnóstico: agrega `&poll=1` al enlace del control para forzar HTTPS polling (como si el proxy bloqueara WebSocket).

## Leaderboard global (opcional)

Corre `supabase_battlecity_scores.sql` en Supabase y pega `SUPABASE_URL` / `SUPABASE_ANON_KEY`
en la sección CONFIG de `public/index.html`.
