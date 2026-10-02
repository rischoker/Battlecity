# Battle City 3D en Render (gratis)

Este paquete trae el juego **y** un pequeño servidor propio que hace de puente entre la pantalla (host)
y los celulares. Todo viaja por HTTPS (puerto 443), igual que una página web normal, así que funciona:

- detrás del proxy de la academia (si Render no está bloqueado, como ya comprobaste),
- con datos móviles (no usa WebRTC/PeerJS, que es lo que fallaba),
- sin CDNs externos: three.js, Tailwind, la fuente, etc. van dentro de `vendor/`.

Si el proxy bloquea WebSockets, el juego cambia solo a "HTTPS polling" (verás `CONNECTED (HTTPS)` en el celular).

## Publicarlo (una sola vez, ~5 minutos)

1. Sube **todo el contenido de esta carpeta** a un repositorio de GitHub (puede ser tu repo `battlecity`).
2. En https://render.com → **New + → Web Service** → conecta ese repositorio.
3. Configura:
   - Runtime: **Node**
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Instance type: **Free**
   (o usa **New + → Blueprint** y Render lee `render.yaml` solo).
4. Cuando termine, abre la URL que te da Render (ej. `https://battlecity.onrender.com`) en el PC del host.
   El QR ya apunta a esa misma URL.

## En clase

- El plan gratis "duerme" el servidor tras ~15 min sin uso. **Abre la página 1–2 minutos antes de clase**;
  mientras despierta verás `WAKING UP SERVER…` y luego `SERVER ONLINE`.
- Si recargas la pantalla del host, la sala y el QR se mantienen y los celulares vuelven solos.
- Diagnóstico: agrega `&poll=1` al final del enlace del control para forzar el modo HTTPS.

## Si prefieres seguir sirviendo el juego desde GitHub Pages

Despliega igual el servidor en Render y pon su URL en `RELAY_URL` (inicio del `<script>` en `index.html`,
busca "CONFIG"). En la academia GitHub Pages falla para algunos estudiantes, por eso es mejor abrir el juego desde Render.

## Leaderboard global (opcional)

Corre `supabase_battlecity_scores.sql` en Supabase y pega `SUPABASE_URL` / `SUPABASE_ANON_KEY` en `index.html`.
