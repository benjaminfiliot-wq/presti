// Contrôle de santé du conteneur « hermes ». Comme il n'y a pas de passerelle HTTP
// (aucun `gateway run`), on vérifie seulement que le pont vers Ollama est ouvert —
// à la différence de sante.mjs d'OpenClaw qui vérifie aussi /healthz.
import net from 'node:net';

const pont = (port) => new Promise((ok, ko) => {
  const s = net.connect(port, '127.0.0.1', () => { s.destroy(); ok(); });
  s.on('error', ko);
  s.setTimeout(3000, () => { s.destroy(); ko(new Error('délai')); });
});

try {
  await pont(11434);
  await pont(3001);
  process.exitCode = 0;
} catch (e) {
  console.error(String(e?.message || e));
  process.exitCode = 1;
}
