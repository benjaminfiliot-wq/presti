// pont.mjs : relais TCP <-> socket Unix entre le conteneur « openclaw » et l'hôte.
//
// Pourquoi : le pare-feu de l'usine (INPUT : lo + ssh seulement) refuse tout ce qui
// vient d'un réseau Docker vers l'hôte, et Ollama comme freellmapi n'écoutent que sur
// 127.0.0.1. On ne touche pas au pare-feu : on passe par des sockets Unix posées dans
// /srv/openclaw/relais, partagé par les deux conteneurs.
//
//   node pont.mjs hote       (conteneur openclaw-relais, réseau de l'hôte)
//     /relais/ollama.sock     -> 127.0.0.1:11434
//     /relais/freellmapi.sock -> 127.0.0.1:3001
//   node pont.mjs conteneur  (dans le conteneur openclaw, réseau isolé)
//     127.0.0.1:11434 -> /relais/ollama.sock
//     127.0.0.1:3001  -> /relais/freellmapi.sock
//
// Les destinations sont FIXES : le relais ne sait joindre que ces deux ports.
import net from 'node:net';
import fs from 'node:fs';

const DOSSIER = '/relais';
const ROUTES = [
  { nom: 'ollama', port: 11434 },
  { nom: 'freellmapi', port: 3001 },
];

const mode = process.argv[2];
if (mode !== 'hote' && mode !== 'conteneur') {
  console.error('usage : node pont.mjs hote|conteneur');
  process.exitCode = 2;
} else {
  for (const r of ROUTES) ouvrir(r);
}

function relier(client, cible) {
  const fermer = () => { client.destroy(); cible.destroy(); };
  client.on('error', fermer);
  cible.on('error', fermer);
  client.on('close', fermer);
  cible.on('close', fermer);
  client.pipe(cible);
  cible.pipe(client);
}

function ouvrir({ nom, port }) {
  const socket = `${DOSSIER}/${nom}.sock`;
  if (mode === 'hote') {
    try { fs.unlinkSync(socket); } catch {}
    const srv = net.createServer((c) => relier(c, net.connect(port, '127.0.0.1')));
    srv.on('error', (e) => { console.error(`[pont] ${nom} : ${e.message}`); process.exit(1); });
    srv.listen(socket, () => {
      fs.chmodSync(socket, 0o600);
      console.log(`[pont] ${socket} -> 127.0.0.1:${port}`);
    });
  } else {
    const srv = net.createServer((c) => relier(c, net.connect(socket)));
    srv.on('error', (e) => { console.error(`[pont] ${nom} : ${e.message}`); process.exit(1); });
    srv.listen(port, '127.0.0.1', () => console.log(`[pont] 127.0.0.1:${port} -> ${socket}`));
  }
}
