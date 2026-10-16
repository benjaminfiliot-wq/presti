// scripts/lib/sim-serveur.mjs — lance le build de PRODUCTION local (next start) pour la simulation générale, branché à la vraie base,
// mais avec des garde-fous posés dans l'environnement du SEUL processus serveur :
//   · STRIPE_SECRET_KEY = la clé de TEST (STRIPE_SECRET_KEY_TEST) — jamais la clé réelle ; STRIPE_WEBHOOK_SECRET propre à la simulation ;
//   · RESEND_API_KEY factice + sim-preload.cjs : aucun e-mail ne part, chacun est consigné dans le journal ;
//   · ANTHROPIC_BASE_URL = le proxy qui compte les appels IA réels (scripts/lib/sim-ia-proxy.mjs).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

export function chargerEnv() {
  for (const l of fs.readFileSync(path.join(RACINE, '.env.local'), 'utf8').split(/\r?\n/)) {
    const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

const portLibre = (depart) => new Promise((ok) => {
  const essayer = (p) => { const s = net.createServer(); s.once('error', () => essayer(p + 1)); s.listen(p, '127.0.0.1', () => s.close(() => ok(p))) }
  essayer(depart)
})

export async function demarrerServeur({ ia, portDepart = 3199, dist = '.next-simulation' } = {}) {
  chargerEnv()
  const cleTest = process.env.STRIPE_SECRET_KEY_TEST
  if (!cleTest || !/^(sk|rk)_test_/.test(cleTest)) throw new Error('STRIPE_SECRET_KEY_TEST (clé de TEST) absente de .env.local : la simulation ne tourne jamais avec la clé réelle.')
  if (!fs.existsSync(path.join(RACINE, dist, 'BUILD_ID'))) throw new Error(`pas de build dans ${dist} : lancer d’abord  PRESTI_DIST=${dist} npm run build`)
  const port = await portLibre(portDepart)
  const journalMails = path.join(os.tmpdir(), `sim-mails-${Date.now()}.jsonl`)
  fs.writeFileSync(journalMails, '')
  const journalStripe = path.join(os.tmpdir(), `sim-stripe-${Date.now()}.jsonl`)
  fs.writeFileSync(journalStripe, '')
  const secretWebhook = 'whsec_simulation_generale_' + Math.random().toString(36).slice(2)
  const env = {
    ...process.env,
    PRESTI_DIST: dist,
    PORT: String(port),
    STRIPE_SECRET_KEY: cleTest,
    STRIPE_WEBHOOK_SECRET: secretWebhook,
    STRIPE_TAXE_AUTO: '',
    RESEND_API_KEY: 'sim-cle-factice-aucun-envoi-reel',
    SIM_MAIL_LOG: journalMails,
    SIM_STRIPE_LOG: journalStripe,
    ...(ia ? { ANTHROPIC_BASE_URL: ia } : {}),
    NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --require ${path.join(RACINE, 'scripts', 'lib', 'sim-preload.cjs').split(path.sep).join('/')}`.trim(),
    NODE_ENV: 'production',
  }
  const sortie = []
  const enfant = spawn(process.execPath, [path.join(RACINE, 'node_modules', 'next', 'dist', 'bin', 'next'), 'start', '-p', String(port), '-H', '127.0.0.1'], { cwd: RACINE, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
  enfant.stdout.on('data', (d) => sortie.push(String(d)))
  enfant.stderr.on('data', (d) => sortie.push(String(d)))
  const base = `http://127.0.0.1:${port}`
  const debut = Date.now()
  for (;;) {
    if (enfant.exitCode !== null) throw new Error('le serveur local s’est arrêté : ' + sortie.join('').slice(-800))
    try { const r = await fetch(base + '/api/essais', { signal: AbortSignal.timeout(2500) }); if (r.status > 0) break } catch { /* pas encore prêt */ }
    if (Date.now() - debut > 90_000) { enfant.kill(); throw new Error('le serveur local ne répond pas après 90 s : ' + sortie.join('').slice(-800)) }
    await new Promise((r) => setTimeout(r, 700))
  }
  return {
    base, port, secretWebhook, journalMails, sortie,
    /** Les appels que le serveur a faits à l'API Stripe (corps de formulaire décodé en { clé: valeur }). */
    stripe: () => fs.readFileSync(journalStripe, 'utf8').split(String.fromCharCode(10)).filter(Boolean).map((l) => { const j = JSON.parse(l); return { ...j, champs: Object.fromEntries(new URLSearchParams(j.corps)) } }),
    mails: () => fs.readFileSync(journalMails, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)),
    arreter: () => new Promise((ok) => {
      if (enfant.exitCode !== null) return ok()
      enfant.once('exit', () => ok())
      // Windows : kill() ne tue que le processus direct ; ici c'est `node next start` lui-même (pas de shell), donc suffisant.
      enfant.kill()
      setTimeout(ok, 4000)
    }),
  }
}
