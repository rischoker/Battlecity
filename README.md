# Battle City 3D

Tanques low-poly cooperativos: la pantalla del proyector corre la partida en 3D y los estudiantes
juegan con su celular como control. Mismo esquema que Chicken Horde y Duel Arena en Render.

## Estructura

```
server.js            Express + Socket.IO (salas, reconexión, /healthz, /api/scores)
package.json         dependencias + build (esbuild en postinstall)
build.js             src/app.js -> public/app.js (target es2019 / safari12) + copia el cliente Socket.IO
render.yaml          servicio de Render (free, Virginia, health check /healthz)
src/app.js           ← CÓDIGO EDITABLE DEL CLIENTE (host + control del celular)
public/index.html    páginas: inicio, /host (proyector) y control del celular
public/app.js        generado desde src/app.js — no editar a mano
public/vendor/       three.js, loaders, socket.io, QR, joystick, Tailwind y la fuente: todo local, cero CDNs
public/KayKit_BlockBits_1.0_FREE/   bloques del mapa
supabase_battlecity_scores.sql      tabla del leaderboard (ya creada en Supabase)
```

Si tienes la carpeta `Artizau_Tanks_1.0_FREE`, ponla dentro de `public/`.

## Rutas

- `/` → inicio: botón **OPEN HOST SCREEN** y casilla para entrar con el código de sala
- `/host` → pantalla del proyector (crea la sala y muestra el QR)
- `/?room=ABCDE` → control del celular (lo abre el QR)
- `/healthz` → `{ ok, uptime, rooms, sockets }`
- `/api/scores` → leaderboard global (GET top 10 · POST puntaje), el servidor habla con Supabase

## Red y reconexión

- Sin P2P: todo pasa por el servidor con salas. El servidor genera el código (5 letras) y un token secreto para el host.
- Socket.IO con `transports: ['polling','websocket']` → funciona detrás del proxy de la academia.
- Celulares: se reconectan solos y conservan jugador, color y puntaje (por clientId, 45 s). Reconectan al instante al volver a la app.
- Host: si se cae o se recarga, recupera la misma sala con su token (la sala vive 3 min sin host).
- Si el servidor reinicia, el host recupera el mismo código y los celulares vuelven a entrar solos.
- Si un celular no conecta en 12 s: muestra el motivo, **TAP TO RETRY** y consejos (iCloud Private Relay, modo de bajo consumo de datos, abrir en Safari).
- Diagnóstico: agrega `&poll=1` al enlace para forzar HTTPS polling (como si el proxy bloqueara WebSocket).

## Editar y probar en local

```
npm install        # instala y genera public/app.js
npm start          # http://localhost:3000  (host: http://localhost:3000/host)
npm run build      # vuelve a generar public/app.js tras editar src/app.js
```
