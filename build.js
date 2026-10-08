// Build step (runs automatically on `npm install` and on Render):
//  1) src/app.js  ->  public/app.js   (esbuild, target es2019 + safari12 so older iPhones work)
//  2) copies the Socket.IO browser client that matches the installed server version into public/vendor
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

esbuild.buildSync({
  entryPoints: [path.join(__dirname, 'src', 'app.js')],
  outfile: path.join(__dirname, 'public', 'app.js'),
  target: ['es2019', 'safari12'],
  format: 'iife',
  minifySyntax: true,
  legalComments: 'none',
  logLevel: 'info'
});

try {
  const client = path.join(path.dirname(require.resolve('socket.io/package.json')), 'client-dist', 'socket.io.min.js');
  fs.copyFileSync(client, path.join(__dirname, 'public', 'vendor', 'socket.io.min.js'));
  console.log('copied socket.io client ->', 'public/vendor/socket.io.min.js');
} catch (e) { console.warn('socket.io client not copied:', e.message); }
