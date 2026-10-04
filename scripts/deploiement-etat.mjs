// scripts/deploiement-etat.mjs — les derniers déploiements de production Vercel et leur état, avec la première ligne
// d'erreur d'un build raté. Le 14/09, 37 déploiements de suite étaient en ERROR depuis 32ef4e6 (13/09 17 h 57 UTC) :
// tout ce qui a été poussé pendant la nuit (site à la demande, suspension, cerveau urgence) n'était pas en ligne, et
// personne ne l'a vu — Vercel ne prévient pas, et « poussé » se lisait comme « déployé ». Après chaque push : ce script.
//
// Usage : node scripts/deploiement-etat.mjs [--n=6]     (code de sortie 1 si le dernier déploiement n'est pas READY)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const n = Number((process.argv.find((a) => a.startsWith('--n=')) || '--n=6').slice(4)) || 6
const token = process.env.VERCEL_TOKEN || (fs.readFileSync(path.join(RACINE, '.env.local'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('VERCEL_TOKEN=')) || '').slice(13).replace(/^"|"$/g, '')
if (!token) { console.error('VERCEL_TOKEN absent (.env.local)'); process.exit(2) }
const api = async (u) => { const r = await fetch(`https://api.vercel.com${u}`, { headers: { Authorization: `Bearer ${token}` } }); if (!r.ok) throw new Error(`Vercel ${r.status} sur ${u}`); return r.json() }

// Les lignes qui ouvrent l'erreur d'un build. 04/10 : « error TS2307: Cannot find module './porteurs' » (fichier suivi qui importe un fichier non suivi,
// d7a1128f) n'était dans AUCUNE des alternatives — Next 16 imprime la sortie brute de tsc, pas « Type error » : le script disait ERROR sans
// dire pourquoi. « Failed to type check » est la ligne qui la suit.
const ERREUR_DE_BUILD = /⨯|Type error|error TS\d+|Failed to type check|Module not found|Error occurred prerendering|Failed to compile/

const { deployments } = await api(`/v6/deployments?limit=${n}&target=production`)
for (const d of deployments) {
  const sha = (d.meta?.githubCommitSha || '').slice(0, 7), msg = (d.meta?.githubCommitMessage || '').split('\n')[0].slice(0, 60)
  console.log(`${new Date(d.created).toISOString().slice(0, 16)}  ${d.state.padEnd(8)} ${sha}  ${msg}`)
  if (d.state === 'ERROR') {
    try {
      const ev = await api(`/v3/deployments/${d.uid}/events?limit=1000`)
      const lignes = (Array.isArray(ev) ? ev : []).map((e) => String(e.payload?.text || e.text || ''))
      const i = lignes.findIndex((t) => ERREUR_DE_BUILD.test(t))
      // 28/09 : « Failed to compile » seul ne dit rien ; le fichier et la cause sont dans les lignes qui suivent.
      if (i >= 0) for (const t of lignes.slice(i, i + 7).map((x) => x.trim()).filter(Boolean)) console.log(`             ↳ ${t.slice(0, 180)}`)
    } catch { /* journal indisponible */ }
  }
}
const dernier = deployments[0]
// Pas de process.exit() après un fetch : sous Windows, Node sort alors avant que les connexions ne soient fermées et plante
// sur une assertion libuv (code ≠ 0 alors que le déploiement est READY — une chaîne gardée s'est arrêtée à tort, 14/09).
if (!dernier) { console.log('aucun déploiement'); process.exitCode = 1 }
else {
  console.log(dernier.state === 'READY' ? `\n✓ la production est à jour (${(dernier.meta?.githubCommitSha || '').slice(0, 7)})` : `\n✗ le dernier déploiement est ${dernier.state} : la production sert encore un build plus ancien`)
  process.exitCode = dernier.state === 'READY' ? 0 : 1
}
