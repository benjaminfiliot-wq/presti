// Vérifier la forme réelle de /create-post — UN seul brouillon, puis on lit la réponse.
//
//   node scripts/publora-verifier.mjs
//
// Ce script est un DIAGNOSTIC, pas le pipeline. Il existe parce que la règle que ce projet
// s'applique partout ailleurs vaut aussi ici : on ne lance pas dix appels sur trois réseaux avec
// une forme de requête qu'on n'a jamais vue fonctionner.
//
// Ce qu'il fait, et rien de plus :
//   • un POST /create-post SANS `scheduledTime` — donc un BROUILLON, jamais une publication ;
//   • sur UN seul réseau, LinkedIn ;
//   • avec un texte réel (celui de la publication 1), pour que la réponse soit représentative.
//
// Il laisse un brouillon dans le tableau de bord Publora. C'est voulu, c'est visible, et ça se
// supprime d'un clic. Un brouillon qu'on peut lire vaut mieux qu'une supposition qu'on ne peut pas.

import fs from 'node:fs'
import path from 'node:path'

const RACINE = path.resolve(import.meta.dirname, '..')
const BASE = 'https://api.publora.com/api/v1'

const env = {}
for (const l of fs.readFileSync(path.join(RACINE, '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}
const CLE = env.PUBLORA_API_KEY
if (!CLE) { console.error('PUBLORA_API_KEY absente'); process.exit(1) }
const entetes = { 'x-publora-key': CLE, 'Content-Type': 'application/json' }

// ── 1. La connexion LinkedIn, lue et pas devinée ──────────────────────────────────────────────
const rc = await fetch(`${BASE}/platform-connections`, { headers: entetes })
const dc = JSON.parse(await rc.text())
const li = (dc.connections || []).find((c) => String(c.platformId).startsWith('linkedin-'))
if (!li) { console.error('aucune connexion LinkedIn'); process.exit(1) }
console.log(`Connexion LinkedIn : ${li.platformId} (${li.displayName || li.username}) · ${li.tokenStatus}`)

// ── 2. Le texte réel de la publication 1, variante A ──────────────────────────────────────────
const texte = fs.readFileSync(path.join(RACINE, 'publications', 'pub-01', 'texte.md'), 'utf8')
const bloc = texte.split(/^##\s+Variante A\b.*$/m)[1]
const contenu = bloc.split(/^##\s/m)[0].split(/\r?\n/)
  .filter((l) => /^>\s?/.test(l)).map((l) => l.replace(/^>\s?/, '')).join('\n').trim()
console.log(`Texte : ${contenu.length} signes, ${contenu.split(/\s+/).length} mots`)
console.log(`Première ligne : « ${contenu.split('\n')[0]} »`)

// ── 3. UN brouillon. Pas de scheduledTime = brouillon, c'est écrit dans le client livré. ───────
const corps = { content: contenu, platforms: [li.platformId] }
console.log(`\nPOST ${BASE}/create-post`)
console.log(`corps : { content: <${contenu.length} signes>, platforms: ["${li.platformId}"] }`)

const r = await fetch(`${BASE}/create-post`, { method: 'POST', headers: entetes, body: JSON.stringify(corps) })
const brut = await r.text()
console.log(`\n← HTTP ${r.status}`)
console.log(`← ${brut.slice(0, 600)}`)

if (!r.ok) {
  console.error('\n✗ /create-post a refusé. La forme du corps est à corriger AVANT le pipeline.')
  process.exit(1)
}
let d; try { d = JSON.parse(brut) } catch { d = null }
console.log(`\n✓ Brouillon créé. postGroupId = ${d?.postGroupId ?? '(champ absent — lire la réponse ci-dessus)'}`)
console.log('  À supprimer dans le tableau de bord Publora s’il gêne : c’est un brouillon, rien n’est parti.')
