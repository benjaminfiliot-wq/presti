// Poser la clé d'API du produit, et retirer les anciennes (v10 §2.1, v11 §6).
//
// Pourquoi un script plutôt qu'un clic dans deux consoles : une rotation de clé mal faite coupe l'IA
// en production sans prévenir. Celle-ci suit un ordre qui ne casse rien —
//
//   1. la clé est VALIDÉE avant d'être posée, et sans consommer un seul jeton (voir plus bas) ;
//   2. elle est posée sur Vercel, puis on redéploie ;
//   3. les anciennes clés ne sont désactivées qu'APRÈS, et seulement si la nouvelle répond.
//
// La validation sans consommation : on appelle l'API avec un modèle qui n'existe pas. Une clé valide
// répond 404 « model not found » — l'authentification a réussi, elle n'a rien facturé. Une clé
// invalide répond 401. C'est la même astuce que pour Firebase (400 sur un jeton bidon), et elle tient
// la règle du protocole : zéro appel IA sur la réserve de Presti.
//
// Usage :
//   1. coller la valeur de la clé dans .env.local sous ANTHROPIC_API_KEY=sk-ant-api03-…
//   2. node scripts/cle-produit.mjs            → valide, pose sur Vercel, dit quoi faire ensuite
//      node scripts/cle-produit.mjs --menage   → en plus, désactive les clés devenues inutiles
//
// Contrôle de syntaxe : node --check scripts/cle-produit.mjs

import fs from 'node:fs'

for (const f of ['.env.local']) {
  if (!fs.existsSync(f)) continue
  for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

const CLE = (process.env.ANTHROPIC_API_KEY || '').trim()
const ADMIN = process.env.ANTHROPIC_ADMIN_KEY
const ESPACE = process.env.ANTHROPIC_WORKSPACE_PRESTI
const VERCEL = process.env.VERCEL_TOKEN
const MENAGE = process.argv.includes('--menage')

const empreinte = (v) => `${v.slice(0, 16)}…${v.slice(-4)}`
const ah = { 'x-api-key': ADMIN, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }
const vh = { Authorization: `Bearer ${VERCEL}`, 'Content-Type': 'application/json' }

if (!CLE || !/^sk-ant-/.test(CLE)) {
  console.log('\n⛔ ANTHROPIC_API_KEY absente de .env.local (ou ne commence pas par sk-ant-).')
  console.log('\n   À faire : console Anthropic → espace « Presti » → la clé du produit → copier sa valeur,')
  console.log('   puis l’ajouter à .env.local :\n')
  console.log('     ANTHROPIC_API_KEY=sk-ant-api03-…\n')
  console.log('   Anthropic ne montre la valeur d’une clé QU’UNE FOIS, à sa création. Si elle est perdue,')
  console.log('   il faut en créer une nouvelle DANS l’espace Presti.\n')
  process.exit(2)
}
if (!ADMIN || !ESPACE || !VERCEL) {
  console.log('\n⛔ ANTHROPIC_ADMIN_KEY / ANTHROPIC_WORKSPACE_PRESTI / VERCEL_TOKEN requis dans .env.local.\n')
  process.exit(2)
}

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? `\n     → ${d}` : ''}`) } }

console.log('\n══ La clé d’API du produit ══\n')
console.log(`  clé fournie : ${empreinte(CLE)}\n`)

// ── 1. À quelle clé de l'organisation correspond-elle, et dans quel espace ? ───────────────────────
console.log('1. Identité')
const k = await (await fetch('https://api.anthropic.com/v1/organizations/api_keys?limit=100', { headers: ah })).json()
const tete = 'sk-ant-api03-' + CLE.slice(13, 16)
const queue = CLE.slice(-4)
const connue = (k.data ?? []).find((x) => (x.partial_key_hint ?? '').startsWith(tete) && (x.partial_key_hint ?? '').endsWith(queue))
T('la clé est connue de l’organisation', !!connue, 'aucune correspondance — clé d’une autre organisation ?')
if (!connue) { console.log('\n══ arrêt : on ne pose pas une clé qu’on ne sait pas identifier ══\n'); process.exit(1) }
console.log(`     « ${connue.name} », créée le ${String(connue.created_at).slice(0, 10)}`)
T('elle appartient à l’espace de travail Presti', connue.workspace_id === ESPACE,
  `espace ${connue.workspace_id ?? 'par défaut'} — le coût du produit se mélangerait au reste`)
T('elle est active', connue.status === 'active', connue.status)
if (ko) { console.log('\n══ arrêt : la clé ne convient pas ══\n'); process.exit(1) }

// ── 2. Elle fonctionne, et on le prouve sans consommer un jeton ────────────────────────────────────
console.log('\n2. Elle répond (sans facturer un seul jeton)')
const sonde = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: { 'x-api-key': CLE, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
  body: JSON.stringify({ model: 'modele-qui-nexiste-pas', max_tokens: 1, messages: [{ role: 'user', content: '.' }] }),
})
const corps = await sonde.json().catch(() => ({}))
// 404 (modèle inconnu) = authentifiée. 401 = refusée. Un 200 serait inquiétant : le modèle n'existe pas.
T('l’authentification passe (404 « modèle inconnu », pas 401)', sonde.status === 404,
  `HTTP ${sonde.status} — ${JSON.stringify(corps.error ?? corps).slice(0, 120)}`)
if (ko) { console.log('\n══ arrêt : cette clé ne fonctionne pas, la production n’y touchera pas ══\n'); process.exit(1) }

// ── 3. Pose sur Vercel ─────────────────────────────────────────────────────────────────────────────
console.log('\n3. Vercel')
const liste = await (await fetch('https://api.vercel.com/v9/projects/presti/env', { headers: vh })).json()
const existante = (liste.envs ?? []).find((e) => e.key === 'ANTHROPIC_API_KEY')
let r
if (existante) {
  r = await fetch(`https://api.vercel.com/v9/projects/presti/env/${existante.id}`, {
    method: 'PATCH', headers: vh, body: JSON.stringify({ value: CLE, target: ['production', 'preview'], type: 'sensitive' }),
  })
} else {
  r = await fetch('https://api.vercel.com/v10/projects/presti/env', {
    method: 'POST', headers: vh, body: JSON.stringify({ key: 'ANTHROPIC_API_KEY', value: CLE, target: ['production', 'preview'], type: 'sensitive' }),
  })
}
const rep = await r.json().catch(() => ({}))
T('ANTHROPIC_API_KEY posée sur Vercel', r.ok, `HTTP ${r.status} — ${JSON.stringify(rep).slice(0, 160)}`)
if (ko) { console.log('\n══ arrêt ══\n'); process.exit(1) }
console.log('     ⚠️  la variable ne prend effet qu’au PROCHAIN déploiement — voir la fin.')

// ── 4. Ménage des clés devenues inutiles ───────────────────────────────────────────────────────────
console.log('\n4. Les autres clés')
// On épargne la clé qui servait jusqu'ici, sauf `--tout`. Tant que personne n'a vu l'IA répondre
// depuis le nouveau déploiement, la désactiver serait couper le filet sans savoir si le sol est là :
// la clé est prouvée valide chez Anthropic, mais « Vercel sert bien cette valeur au runtime » ne se
// prouve qu'au premier vrai appel — et le protocole interdit d'en faire un pour le plaisir.
const TOUT = process.argv.includes('--tout')
const actives = (k.data ?? []).filter((x) => x.id !== connue.id && x.status === 'active')
const filet = TOUT ? null : actives.filter((x) => !x.workspace_id).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))[0]
const autres = actives.filter((x) => x.id !== filet?.id)
if (!autres.length) console.log('     aucune autre clé active.')
else if (!MENAGE) {
  console.log('     à désactiver une fois le déploiement vérifié (relancer avec --menage) :')
  for (const x of autres) console.log(`       · « ${x.name} » (${x.workspace_id === ESPACE ? 'espace Presti' : 'espace par défaut'}) — ${x.partial_key_hint}`)
  console.log('\n     ⚠️  PAS maintenant : la production tourne encore avec l’ancienne jusqu’au redéploiement.')
} else {
  if (filet) console.log(`     (« ${filet.name} » est gardée comme filet — --tout pour la retirer aussi.)`)
  for (const x of autres) {
    const d = await fetch(`https://api.anthropic.com/v1/organizations/api_keys/${x.id}`, {
      method: 'POST', headers: ah, body: JSON.stringify({ status: 'inactive' }),
    })
    T(`« ${x.name} » désactivée`, d.ok, `HTTP ${d.status} — ${(await d.text()).slice(0, 120)}`)
  }
}

console.log(`\n══ ${ok} vérifications passées, ${ko} en échec ══`)
if (!MENAGE) console.log('\nEnsuite : redéployer (un commit, ou node scripts/redeployer.mjs), vérifier que l’IA répond,\npuis relancer avec --menage pour désactiver les clés devenues inutiles.\n')
else console.log('')
process.exit(ko === 0 ? 0 : 1)
