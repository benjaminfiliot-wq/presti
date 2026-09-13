#!/usr/bin/env node
// Le pipeline de bout en bout — prompt v14 §4.
//
//   node scripts/pipeline.mjs --dry-run    → rend, juge, montre le calendrier. N'envoie RIEN.
//   node scripts/pipeline.mjs              → + dépose les médias et programme les publications
//
// Six étapes, et **chacune bloque la suivante**. Le principe tient en une phrase : on ne publie
// jamais une vidéo que le juge a recalée.
//
//   1. Rendre les dix vidéos, trois formats, depuis les compositions versionnées.
//   2. Passer TOUTES les sorties dans `video-qa.mjs`. Un seul échec arrête le pipeline.
//   3. Lire `plans/publications-10.md` : texte retenu, canal, date, heure.
//   4. Déposer les médias, créer les publications programmées, avec le lien tracké du canal.
//   5. Écrire au journal : date, heure, canal, numéro, variante, identifiant Publora.
//   6. Sur erreur d'API : réessayer UNE fois, puis s'arrêter en disant quoi.
//
// ── Ce qui est VÉRIFIÉ, et ce qui ne l'est pas ────────────────────────────────────────────────
//
// ⚠️ Cet en-tête a dit le contraire pendant plusieurs heures. Il affirmait « aucune clé n'existe
// encore » et « je n'ai jamais vu une seule réponse réelle » — c'était vrai à l'écriture, faux
// ensuite, et je l'ai laissé traîner. Un commentaire périmé sur un script qui publie est pire
// qu'une absence de commentaire : il fait renoncer à une vérification déjà faite.
//
// **Vérifié, réponse réelle en main** (`scripts/publora-verifier.mjs`, 2026-09-10) :
//   • base `https://api.publora.com/api/v1`, en-tête `x-publora-key` ;
//   • `GET /platform-connections` → `{ connections: [{ platformId, displayName, tokenStatus }] }`,
//     où `platformId` a la forme `facebook-<id>` / `linkedin-<id>` ;
//   • `POST /create-post` avec `{ content, platforms: ["linkedin-<id>"] }`
//     → `{ success, postGroupId, scheduledTime }` ;
//   • **omettre `scheduledTime` crée un BROUILLON** — c'est le comportement par défaut ici ;
//     `--programmer` ajoute l'horodatage en ISO 8601 UTC.
//   Un brouillon réel existe dans le tableau de bord : postGroupId `6aa29eee5adfc83da2aa3079`.
//   Il est à supprimer, et c'est noté dans les tâches de Benj.
//
// **Toujours PAS vérifié — la vidéo.** `mediaUrls` attend des URL **publiques** ; nos MP4 sont
// locaux, et le client Publora livré n'implémente pas de dépôt de média. Le pipeline crée donc des
// publications **texte** et **nomme le fichier à joindre à la main**. Il ne prétend pas faire ce
// qu'il ne sait pas faire — c'est aussi ce que dit la mémoire du projet sur la vidéo automatisée.
//
// Le premier envoi réel se fait quand même avec `--une-seule` : une publication, on lit la
// réponse, on ajuste. Dix publications d'un coup sur trois réseaux, jamais en premier.

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const RACINE = path.resolve(import.meta.dirname, '..')
const PUBLICATIONS = path.join(RACINE, 'publications')
const MAITRE = path.join(RACINE, 'plans', 'publications-10.md')
const JOURNAL = path.join(RACINE, 'plans', 'journal-publications.md')

const args = process.argv.slice(2)
const BLANC = args.includes('--dry-run')
const UNE_SEULE = args.includes('--une-seule')
const SANS_RENDU = args.includes('--sans-rendu')
const FORMATS = ['vertical', 'carre', 'paysage']
const NUMS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10']

// Le format à joindre selon le réseau : le vertical pour les Reels et Stories, le paysage pour le
// fil LinkedIn qui reste un fil d'ordinateur, le carré pour les fils Facebook et Instagram.
const FORMAT_PAR_CANAL = { linkedin: 'paysage', facebook: 'carre', instagram: 'vertical' }

const env = {}
try {
  for (const l of fs.readFileSync(path.join(RACINE, '.env.local'), 'utf8').split(/\r?\n/)) {
    const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
} catch { /* pas de .env.local : on reste en blanc */ }

const titre = (s) => console.log(`\n\x1b[1m${s}\x1b[0m\n${'─'.repeat(78)}`)
const arret = (raison) => { console.error(`\n\x1b[31m✗ Pipeline arrêté — ${raison}\x1b[0m`); process.exit(1) }

// ── 1. Le rendu ───────────────────────────────────────────────────────────────────────────────
titre('1. Rendu des dix publications, trois formats')
if (SANS_RENDU) {
  console.log('  (--sans-rendu : on part des fichiers déjà sur le disque)')
} else {
  for (const n of NUMS) {
    const r = spawnSync('node', [path.join(RACINE, 'scripts', 'hf-rendre.mjs'), n], { stdio: 'inherit' })
    if (r.status !== 0) arret(`le rendu de la publication ${n} a échoué`)
  }
}

// ── 2. Le juge ────────────────────────────────────────────────────────────────────────────────
titre('2. Le juge — video-qa.mjs sur toutes les sorties')
const fichiers = []
for (const n of NUMS) {
  for (const f of FORMATS) {
    const p = path.join(PUBLICATIONS, `pub-${n}`, `${f}.mp4`)
    if (fs.existsSync(p)) fichiers.push(p)
    else console.log(`  ⚠️ absent : pub-${n}/${f}.mp4`)
  }
}
if (!fichiers.length) arret('aucune vidéo à juger')
const juge = spawnSync('node', [path.join(RACINE, 'scripts', 'video-qa.mjs'), ...fichiers], { stdio: 'inherit' })
if (juge.status !== 0) arret('le juge a recalé au moins une vidéo — on ne publie pas une vidéo recalée')
console.log(`\n✓ ${fichiers.length} fichiers, tous verts.`)

// ── 3. Le calendrier ──────────────────────────────────────────────────────────────────────────
titre('3. Le calendrier, lu dans plans/publications-10.md')
const maitre = fs.readFileSync(MAITRE, 'utf8')
// La table « Semaine | Jour | Heure | N° | Canal » du chapitre Calendrier.
const lignes = maitre.split(/\r?\n/)
const debutCal = lignes.findIndex((l) => /^#\s+Calendrier des dix/.test(l))
if (debutCal < 0) arret('aucun chapitre « Calendrier des dix » dans plans/publications-10.md')
const plan = []
for (let i = debutCal; i < lignes.length; i++) {
  const l = lignes[i]
  if (/^#\s/.test(l) && i > debutCal) break
  const c = l.split('|').map((x) => x.trim())
  if (c.length < 6 || !/^\d$/.test(c[1] || '')) continue
  const num = (c[4].match(/\d+/) || [])[0]
  if (!num) continue
  plan.push({
    semaine: Number(c[1]), jour: c[2], heure: c[3],
    num: String(num).padStart(2, '0'),
    variante: /var/i.test(c[4]) ? 'B' : 'A',
    canal: c[5].toLowerCase(),
  })
}
if (!plan.length) arret('calendrier illisible — aucune ligne datée trouvée')
// --sauf=03,10 : des numéros à écarter (une publication déjà postée à la main, par exemple) — le calendrier n'est pas modifié.
const SAUF = new Set(((args.find((x) => x.startsWith('--sauf=')) || '').slice(7)).split(',').filter(Boolean).map((n) => n.padStart(2, '0')))
if (SAUF.size) { const avant = plan.length; for (let i = plan.length - 1; i >= 0; i--) if (SAUF.has(plan[i].num)) plan.splice(i, 1); console.log(`  --sauf : ${avant - plan.length} ligne(s) écartée(s) (pub-${[...SAUF].join(', pub-')})`) }
for (const p of plan) {
  const f = FORMAT_PAR_CANAL[p.canal] || 'vertical'
  console.log(`  S${p.semaine} ${p.jour.padEnd(9)} ${p.heure.padEnd(8)} pub-${p.num} variante ${p.variante}  →  ${p.canal.padEnd(10)} (${f})`)
}
console.log(`\n✓ ${plan.length} publications programmées.`)
if (plan.length < 9) console.log('  ⚠️ moins de neuf lignes datées : les n° 6 et 10 attendent une décision de Benj, c’est normal.')

// ── 4. Publora ────────────────────────────────────────────────────────────────────────────────
//
// ⚠️ La forme de l'API n'est plus devinée. Elle vient du client Python livré avec le plugin
// `facebook-skills` (`lib/publora_client.py`, à jour au 2026-06). Quatre choses que j'avais
// fausses, et qui auraient toutes échoué :
//
//   1. **L'URL de base est `https://api.publora.com/api/v1`**, pas `https://api.publora.com`.
//      Tous mes appels auraient renvoyé 404.
//   2. **`platforms` prend des IDENTIFIANTS DE CONNEXION**, pas des noms de réseau :
//      `["facebook-112233445566"]`, au format `/^[a-z]+-[a-zA-Z0-9_-]+$/`. J'envoyais
//      `["facebook"]` — très exactement la supposition que j'avais signalée comme non vérifiée.
//   3. **`scheduledTime` est un ISO 8601 UTC.** J'envoyais « mardi 7 h 15 ».
//   4. **Le champ média s'appelle `mediaUrls` et prend une LISTE d'URL** — pas `mediaUrl`.
//
// La contrainte qui a longtemps bloqué l'attache, et comment elle est levée. Le client dit :
// « to attach images or a video, create the post first, then upload media against the returned
// postGroupId via Publora's media workflow » — workflow qu'il n'implémente pas. `mediaUrls` veut
// des URL PUBLIQUES, et nos MP4 étaient des fichiers locaux.
//
// Décision de Benj le 2026-09-10 : héberger les vidéos. `scripts/promo-heberger.mjs` les dépose
// dans un bucket Supabase public dédié (`promo`) et écrit la carte des URL dans
// `publications/videos-en-ligne.json`. Ce pipeline la lit et remplit `mediaUrls`.
//
// ⚠️ Le bucket est SÉPARÉ de `artisan-media` exprès : le stockage est partagé et plafonné à 1 Go,
// et lib/quotaMedia.ts rappelle qu'un dépassement « coupe le projet : TOUS les artisans perdent
// leurs images ». Le script d'hébergement refuse de déposer s'il ne resterait pas 400 Mo libres.
//
// `--programmer` seulement quand Benj l'a décidé ; sans lui, les posts restent en brouillon.

const BASE = 'https://api.publora.com/api/v1'
const PROGRAMMER = args.includes('--programmer')

// ── L'horodatage — ISO 8601 UTC, jamais « mardi 7 h 15 » ──────────────────────────────────────
//
// ⚠️ Ancien calcul : chaque ligne était ancrée sur la PROCHAINE occurrence de SON jour, puis on
// ajoutait (semaine − 1) × 7. Mesuré le 2026-09-10 (un jeudi) : la publication 07 « S1 samedi »
// sortait le 12, la 01 « S1 mardi » le 15 — le premier post de la campagne aurait été l'inventaire
// à 59 €, avant même de dire ce qu'est Presti. On ancre donc UN lundi (le prochain, strictement
// après aujourd'hui) et toutes les lignes en dérivent : la semaine 1 est une vraie semaine.
const JOURS = { lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6, dimanche: 0 }
const depart = new Date()
const ancre = new Date(depart); ancre.setHours(0, 0, 0, 0)
ancre.setDate(ancre.getDate() + (((8 - ancre.getDay()) % 7) || 7))   // lundi > aujourd'hui
const quand = (p) => {
  const cible = JOURS[p.jour.toLowerCase()]
  if (cible === undefined) arret(`jour illisible dans le calendrier : « ${p.jour} »`)
  const m = p.heure.match(/(\d+)\s*h\s*(\d*)/)
  if (!m) arret(`heure illisible dans le calendrier : « ${p.heure} »`)
  const d = new Date(ancre)
  d.setDate(d.getDate() + (p.semaine - 1) * 7 + ((cible - 1 + 7) % 7))
  d.setHours(Number(m[1]), Number(m[2] || 0), 0, 0)
  if (d <= depart) arret(`la date calculée est passée : ${p.jour} S${p.semaine} → ${d.toISOString()}`)
  return d
}
console.log(`\n  Ancrage : lundi ${ancre.getFullYear()}-${String(ancre.getMonth()+1).padStart(2,"0")}-${String(ancre.getDate()).padStart(2,"0")} (heure de Paris). Dates, dans l'ordre de parution :`)
const parDate = [...plan].sort((a, b) => quand(a) - quand(b))
for (const p of parDate) {
  console.log(`    ${quand(p).toISOString().slice(0, 16).replace('T', ' ')}  pub-${p.num} ${p.variante}  →  ${p.canal}`)
}
if (parDate[0] && parDate[0].num !== '01') arret(`la première parution serait pub-${parDate[0].num}, pas la 01 — l'ordre de la campagne est cassé`)

titre('4. Publora')
if (BLANC) {
  console.log("  --dry-run : rien n'est envoyé. Le pipeline s'arrête ici, et c'est le but.")
  console.log('\n\x1b[32m✓ Passage à blanc terminé : les vidéos sont vertes et le calendrier tient.\x1b[0m')
  process.exit(0)
}

const CLE = env.PUBLORA_API_KEY
if (!CLE) arret("PUBLORA_API_KEY absente de .env.local — c'est la seule chose qui manque (§8 H2)")

const entetes = { 'x-publora-key': CLE, 'Content-Type': 'application/json' }

// ⚠️ Un POST /create-post ne se réessaie JAMAIS : un hoquet réseau après un 200 qu'on n'a pas lu
// ferait partir le même post deux fois. Seule la lecture des connexions a droit à un second essai.
// Et un 4xx ne reboucle jamais : le throw est sorti du try, un refus est définitif.
const appel = async (chemin, options) => {
  const MAX = options?.reessai === false ? 1 : 2
  for (let essai = 1; essai <= MAX; essai++) {
    let r, texte
    try {
      r = await fetch(BASE + chemin, { ...options, headers: { ...entetes, ...(options?.headers || {}) } })
      texte = await r.text()
    } catch (e) {
      if (essai === MAX) throw e
      console.log(`  ↻ ${chemin} : ${e.message.slice(0, 120)}, un seul réessai…`)
      continue
    }
    if (r.ok) return texte ? JSON.parse(texte) : {}
    const transitoire = [408, 429, 500, 502, 503, 504].includes(r.status)
    if (!transitoire || essai === MAX) throw new Error(`${chemin} → HTTP ${r.status} · ${texte.slice(0, 300)}`)
    console.log(`  ↻ ${chemin} a répondu ${r.status}, un seul réessai…`)
  }
  // Jamais de troisième tentative sur un compte social : c'est comme ça qu'on se fait suspendre,
  // et une suspension coûte plus cher que dix publications ratées.
}

// ── 4a. Découverte, en LECTURE SEULE, avant d'écrire quoi que ce soit ─────────────────────────
let connexions = []
try {
  const d = await appel('/platform-connections', { method: 'GET' })
  connexions = d?.connections || []
} catch (e) {
  arret(`impossible de lister les connexions : ${e.message}`)
}
if (!connexions.length) arret('aucun réseau connecté dans Publora — les connecter dans le tableau de bord')

console.log('  Comptes connectés :')
const parReseau = {}
for (const c of connexions) {
  const reseau = String(c.platformId || '').split('-')[0]
  const sain = !c.tokenStatus || /ok|valid|active|healthy/i.test(String(c.tokenStatus))
  console.log(`    ${sain ? '✓' : '⚠️'} ${String(c.platformId).padEnd(30)} ${c.displayName || c.username || ''}${c.tokenStatus ? ` · ${c.tokenStatus}` : ''}${c.lastError ? ` · ${c.lastError}` : ''}`)
  if (sain && !parReseau[reseau]) parReseau[reseau] = c.platformId
}

const manquants = [...new Set(plan.map((p) => p.canal))].filter((r) => !parReseau[r])
if (manquants.length) arret(`aucune connexion saine pour : ${manquants.join(', ')}`)


// ── 4c. L'envoi ───────────────────────────────────────────────────────────────────────────────
const aFaire = UNE_SEULE ? plan.slice(0, 1) : plan
if (UNE_SEULE) console.log("\n  --une-seule : UNE publication, on lit ce que l'API répond, on ajuste.")
if (!PROGRAMMER) console.log('\n  Sans --programmer : les posts sont créés en BROUILLON (scheduledTime omis).')

// La carte des URL publiques, produite par scripts/promo-heberger.mjs. Son absence n'est pas une
// erreur : on retombe alors sur des posts texte, et on le DIT au lieu de le taire.
let enLigne = {}
const carteChemin = path.join(PUBLICATIONS, 'videos-en-ligne.json')
if (fs.existsSync(carteChemin)) {
  try { enLigne = JSON.parse(fs.readFileSync(carteChemin, 'utf8')) } catch { enLigne = {} }
  console.log(`  ${Object.keys(enLigne).length} vidéo(s) hébergée(s) : elles seront jointes automatiquement.`)
} else {
  console.log('  ⚠️ aucune vidéo hébergée (publications/videos-en-ligne.json absent) — posts TEXTE.')
  console.log('     Pour les joindre : node scripts/promo-heberger.mjs')
}

// ── Tout se vérifie AVANT le premier POST — après, c'est parti chez Publora ──────────────────
//
// 1. Doublons : le journal est relu, et tout couple (numéro, variante, canal) déjà créé arrête
//    le pipeline. C'est ce qui a manqué le 2026-09-10 : trois brouillons « linkedin | 01 | A ».
const dejaCrees = new Set()
if (fs.existsSync(JOURNAL)) {
  for (const l of fs.readFileSync(JOURNAL, 'utf8').split(/\r?\n/)) {
    const c = l.split('|').map((x) => x.trim())
    if (c.length >= 7 && /^\d{4}-\d{2}-\d{2}$/.test(c[1])) dejaCrees.add(`${c[4]}|${c[5]}|${c[3]}`)
  }
}
for (const p of aFaire) {
  if (dejaCrees.has(`${p.num}|${p.variante}|${p.canal}`) && !args.includes('--forcer-doublon')) {
    arret(`pub-${p.num} variante ${p.variante} sur ${p.canal} est DÉJÀ dans ${path.relative(RACINE, JOURNAL)} — supprimer le brouillon chez Publora d'abord, ou --forcer-doublon`)
  }
}
// 2. La variante envoyée doit être écrite pour le réseau de la ligne. Le 2026-09-10, la 06 partait
//    sur Instagram avec le texte Facebook — et son lien /a/facebook, non cliquable là-bas.
const reseauDe = (p) => {
  const t = fs.readFileSync(path.join(PUBLICATIONS, `pub-${p.num}`, 'texte.md'), 'utf8')
  // L'en-tête « ## Variante A — LinkedIn » : on prend ce qui suit le tiret, sans regex.
  const tete = t.split(/\r?\n/).find((l) => l.startsWith('## Variante ' + p.variante))
  if (!tete) return ''
  const i = tete.indexOf('—')
  return (i < 0 ? '' : tete.slice(i + 1)).trim().toLowerCase()
}
for (const p of aFaire) {
  const reseau = reseauDe(p)
  if (!reseau) arret(`pub-${p.num} : en-tête « ## Variante ${p.variante} — <réseau> » introuvable`)
  if (!reseau.includes(p.canal)) arret(`pub-${p.num} variante ${p.variante} est écrite pour « ${reseau} », pas pour ${p.canal}`)
}
// 3. Chaque vidéo qu'on va joindre répond en video/mp4, maintenant — pas au moment du POST.
for (const p of aFaire) {
  const f = FORMAT_PAR_CANAL[p.canal] || 'vertical'
  const u = enLigne[`pub-${p.num}-${f}`]
  if (!u) continue
  const h = await fetch(u, { method: 'HEAD' }).catch(() => null)
  if (!h || !h.ok || h.headers.get('content-type') !== 'video/mp4') arret(`vidéo injoignable : ${u} (${h ? h.status : 'réseau'})`)
}
console.log(`  ✓ ${aFaire.length} envoi(s) vérifié(s) : aucun doublon, variantes conformes, vidéos joignables.`)

// 4. Le journal s'écrit APRÈS CHAQUE post, pas après la boucle : un arrêt au 7e ne laisse plus six
//    publications chez Publora sans aucune trace ici.
if (!fs.existsSync(JOURNAL) || !/\| postGroupId \|/.test(fs.readFileSync(JOURNAL, 'utf8'))) {
  fs.appendFileSync(JOURNAL, '# Journal des publications\n\n| Créé le | Programmé | Canal | N° | Variante | postGroupId |\n|---|---|---|---|---|---|\n')
}
const journal = []
for (const p of aFaire) {
  const dossier = path.join(PUBLICATIONS, `pub-${p.num}`)
  const texte = fs.readFileSync(path.join(dossier, 'texte.md'), 'utf8')
  const bloc = texte.split(new RegExp(`^##\\s+Variante ${p.variante}\\b.*$`, 'm'))[1]
  if (!bloc) arret(`variante ${p.variante} introuvable dans pub-${p.num}/texte.md`)
  const contenu = bloc.split(/^##\s/m)[0].split(/\r?\n/)
    .filter((l) => /^>\s?/.test(l)).map((l) => l.replace(/^>\s?/, '')).join('\n').trim()
  if (!contenu) arret(`texte vide pour pub-${p.num} variante ${p.variante}`)

  const corps = { content: contenu, platforms: [parReseau[p.canal]] }
  if (PROGRAMMER) corps.scheduledTime = quand(p).toISOString()

  // Le format suit le réseau : paysage pour LinkedIn, carré pour Facebook, vertical pour Instagram.
  const format = FORMAT_PAR_CANAL[p.canal] || 'vertical'
  const urlVideo = enLigne[`pub-${p.num}-${format}`]
  if (urlVideo) corps.mediaUrls = [urlVideo]

  let rep
  try { rep = await appel('/create-post', { method: 'POST', body: JSON.stringify(corps), reessai: false }) }
  catch (e) { arret(`pub-${p.num} sur ${p.canal} : ${e.message}`) }

  const id = rep?.postGroupId || JSON.stringify(rep).slice(0, 90)
  const f = FORMAT_PAR_CANAL[p.canal] || 'vertical'
  const horo = PROGRAMMER ? quand(p).toISOString() : 'brouillon'
  console.log(`  ✓ pub-${p.num} → ${p.canal} · ${horo} · postGroupId ${id}`)
  if (urlVideo) console.log(`     ♪ vidéo jointe : ${format}`)
  else console.log(`     ⚠️ vidéo à joindre à la main : ${path.relative(RACINE, path.join(dossier, `${f}.mp4`))}`)
  const ligne = `| ${new Date().toISOString().slice(0, 10)} | ${horo} | ${p.canal} | ${p.num} | ${p.variante} | ${id} |`
  fs.appendFileSync(JOURNAL, ligne + '\n')
  journal.push(ligne)
}

// ── 5. Le journal ─────────────────────────────────────────────────────────────────────────────
titre('5. Journal')
// (chaque ligne a déjà été écrite au fil de la boucle)
console.log(`  ${journal.length} ligne(s) dans ${path.relative(RACINE, JOURNAL)}`)
console.log('\n\x1b[32m✓ Pipeline terminé.\x1b[0m')
  console.log('  Les vidéos sont hébergées et passées en mediaUrls.')
  console.log('  Publora n’expose AUCUNE route de lecture (GET /posts, /post, /post-groups : 404),')
  console.log('  donc l’attache ne se vérifie pas d’ici.')
  console.log('  ⚠️ Ouvrir UN brouillon dans le tableau de bord pour confirmer que la vidéo y est.')
