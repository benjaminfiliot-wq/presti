// Contrôle de santé du conteneur « openclaw » : la passerelle répond ET le pont vers Ollama est ouvert.
import net from 'node:net';

const pont = () => new Promise((ok, ko) => {
  const s = net.connect(11434, '127.0.0.1', () => { s.destroy(); ok(); });
  s.on('error', ko);
  s.setTimeout(3000, () => { s.destroy(); ko(new Error('délai')); });
});

try {
  const r = await fetch('http://127.0.0.1:18789/healthz', { signal: AbortSignal.timeout(4000) });
  if (!r.ok) throw new Error(`healthz ${r.status}`);
  await pont();
  process.exitCode = 0;
} catch (e) {
  console.error(String(e?.message || e));
  process.exitCode = 1;
}
