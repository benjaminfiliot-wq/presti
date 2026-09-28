#!/usr/bin/env node
// scripts/juges-026-pubs-contenu-preuve.mjs — la preuve des juges du domaine « pubs-contenu » de la série 026 (fiche
// 026-108), écrite par Claude Code AVANT ce qu'elle prouve. GÉNÉRIQUE pour les lots 01, 06, 09, 10, 17 et 20 de cette
// série (fiche 026-108, « Ce qu'il faut faire », point 6) : tout ce qui est propre à un lot est déclaré dans
// scripts/fixtures/026-pubs-contenu/preuve-<NN>.json ; ce script n'en porte que le mécanisme, jamais le contenu.
//
// preuve-<NN>.json :
//   { reference: "<sha complet>", absents_de_la_reference?: [préfixes posix], juges: [{ commande, echec_attendu }] }
// `commande` est la ligne exacte à lancer (« node scripts/<juge>.mjs [--partie=…] »), SANS --racine, --temoin ni --reel
// (ajoutés ici, jamais par le fichier du lot).
//
// Ce qu'elle prouve, elle-même, sans rien lire qu'un autre agent aurait déposé :
//   REF     le commit `reference` (ancêtre de HEAD) est extrait par `git archive` sous .orchestre/travail/juges-026-
//           pubs-contenu/reference-<NN>/ (rien écrit dans .git ; réutilisé s'il est déjà là, identique blob pour blob) ;
//           il ne contient aucun préfixe de `absents_de_la_reference`.
//   <juge>  pour chaque juge du lot, deux passages, sans shell, avec un délai généreux (le typecheck du dépôt entier
//           peut y entrer) :
//           1. <commande> --racine=<référence>  → code ≠ 0, et une ligne « FAIL <echec_attendu> — … » dans sa sortie ;
//           2. <commande> --temoin              → code 0.
//   IMMOBILE  git status --porcelain (fichiers non suivis compris), avant et après tous les passages : rien de nouveau
//           hors .orchestre/travail/ et .orchestre/preuves/.
//   EA      .orchestre/preuves/<fiche du lot>/echecs-attendus.md écrit (une ligne par juge : critère attendu en échec
//           sur la référence, extrait réel de sa sortie, verdict du témoin), relu, non vide, une ligne par juge.
//
// Usage : node scripts/juges-026-pubs-contenu-preuve.mjs --lot=01|06|09|10|17|20
// Code 0 seulement si tout est vert ; 1 sinon ; 2 si l'appel ou preuve-<NN>.json est invalide.
// N'écrit que sous .orchestre/travail/juges-026-pubs-contenu/ et .orchestre/preuves/<fiche du lot>/echecs-attendus.md.
import fs from 'node:fs'
import path from 'node:path'
import { R, TRAVAIL, lireOptionsOuQuitter, git, lancer, extraireReference, exigerSousTravail } from './fixtures/025/commun.mjs'
import { analyserSortieJuge, court, lf } from './lib/sql-essai.mjs'

const NOM = 'juges-026-pubs-contenu-preuve'
// Lot → la fiche qui le dépose (fiche 026-108, point 6 : « lot 01 → 026-108, 06 → 026-110, 09 → 026-124, 10 → 026-126,
// 17 → 026-128, 20 → 026-116 »).
const LOTS = { '01': '026-108', '06': '026-110', '09': '026-124', '10': '026-126', '17': '026-128', '20': '026-116' }
const TRAV = path.join(TRAVAIL, 'juges-026-pubs-contenu')
const DELAI_MS = 8 * 60_000
const posix = (p) => String(p).split(path.sep).join('/')
const rel = (p) => posix(path.relative(R, p)) || '.'

const o = lireOptionsOuQuitter(process.argv.slice(2), { connues: ['lot'] })
const refuser = (m) => { console.error(`✗ ${NOM} : ${m}`); process.exit(2) }
if (o.positionnels.length) refuser(`argument(s) inattendu(s) : ${o.positionnels.join(' ')}`)
if (o.temoin || o.reel || !o.racineParDefaut) refuser('la preuve lance elle-même chaque juge sur la référence et sur son témoin : ni --racine, ni --temoin, ni --reel')
const LOT = o.valeur('lot')
if (!LOT || !LOTS[LOT]) refuser(`--lot=${Object.keys(LOTS).join('|')} attendu (reçu : ${LOT ?? 'rien'})`)
const FICHE_LOT = LOTS[LOT]
const FICHIER_LOT = path.join(R, 'scripts', 'fixtures', '026-pubs-contenu', `preuve-${LOT}.json`)

// ── Le fichier du lot ────────────────────────────────────────────────────────────────────────────────────────────────
const RE_ID = /^[A-Z0-9]{1,5}-[A-Z0-9-]+$/
const RE_COMMANDE = /^node (scripts\/[\w.-]+\.mjs)((?: --[\w-]+(?:=[\w.,'"-]+)?)*)$/
let L = null
{
  const e = []
  let brut
  try { brut = fs.readFileSync(FICHIER_LOT, 'utf8') } catch { refuser(`${rel(FICHIER_LOT)} introuvable`) }
  try { L = JSON.parse(brut) } catch (err) { refuser(`${rel(FICHIER_LOT)} illisible : ${err.message}`) }
  if (!/^[0-9a-f]{40}$/.test(L.reference || '')) e.push(`reference ${JSON.stringify(L.reference)} : un sha complet (40 hex) attendu`)
  if (!Array.isArray(L.juges) || !L.juges.length) e.push('juges : liste non vide attendue')
  for (const [i, j] of (L.juges || []).entries()) {
    const m = RE_COMMANDE.exec(j?.commande || '')
    if (!m) e.push(`juge ${i + 1} : commande ${JSON.stringify(j?.commande)} (« node scripts/<juge>.mjs [--option=valeur…] » attendu, sans --racine/--temoin/--reel)`)
    else if (/--(?:racine|temoin|reel)\b/.test(m[2])) e.push(`juge ${i + 1} : la commande porte déjà --racine, --temoin ou --reel`)
    else if (!fs.existsSync(path.join(R, m[1]))) e.push(`juge ${i + 1} : ${m[1]} n'existe pas`)
    if (!RE_ID.test(j?.echec_attendu || '')) e.push(`juge ${i + 1} : echec_attendu ${JSON.stringify(j?.echec_attendu)}`)
  }
  if (e.length) refuser(`${rel(FICHIER_LOT)} : ${e.join(' ; ')}`)
}
const decouper = (commande) => { const m = RE_COMMANDE.exec(commande); return { script: m[1], args: m[2].trim() ? m[2].trim().split(/\s+/) : [] } }
const labelJuge = (j) => { const d = decouper(j.commande); return `${path.basename(d.script, '.mjs')}${d.args.length ? ` ${d.args.join(' ')}` : ''}` }

// ── L'état du dépôt (IMMOBILE) ──────────────────────────────────────────────────────────────────────────────────────
const PERMIS = ['.orchestre/travail/', '.orchestre/preuves/']
function etatDepot() {
  const r = git(['status', '--porcelain=v1', '-z', '--untracked-files=all'])
  if (r.code !== 0) throw new Error(`git status : ${court(r.stderr || r.erreur)}`)
  const m = new Map()
  const champs = r.stdout.split('\0')
  for (let i = 0; i < champs.length; i++) {
    const e = champs[i]
    if (!e) continue
    const xy = e.slice(0, 2), p = e.slice(3)
    if (!PERMIS.some((pre) => p.startsWith(pre))) m.set(p, xy)
    if (xy[0] === 'R' || xy[0] === 'C') i++ // porcelain -z : l'ancien chemin d'un renommage suit
  }
  return m
}
function ecarts(avant, apres) {
  const d = []
  for (const [k, v] of apres) { if (!avant.has(k)) d.push(`${k} apparu (${v.trim() || v})`); else if (avant.get(k) !== v) d.push(`${k} : ${avant.get(k).trim()} → ${v.trim()}`) }
  for (const k of avant.keys()) if (!apres.has(k)) d.push(`${k} revenu à l'état suivi ou disparu`)
  return d
}

// ── Un passage d'un juge ────────────────────────────────────────────────────────────────────────────────────────────
function lancerJuge(j, argsSupp, mode, dossierSorties) {
  const d = decouper(j.commande)
  const args = [...d.args, ...argsSupp]
  const t0 = Date.now()
  const r = lancer(process.execPath, [path.join(R, d.script), ...args], { cwd: R, timeout: DELAI_MS })
  const duree = (Date.now() - t0) / 1000
  const journal = path.join(dossierSorties, `${path.basename(d.script, '.mjs')}${d.args.length ? `-${d.args.map((a) => a.replace(/^--/, '').replace(/[^a-z0-9]+/gi, '-')).join('-')}` : ''}.${mode}.log`)
  fs.mkdirSync(path.dirname(journal), { recursive: true })
  fs.writeFileSync(journal, `$ node ${d.script} ${args.join(' ')}\n${r.stdout}${r.stderr.trim() ? `\n--- stderr ---\n${r.stderr}` : ''}\n--- code ${r.code}${r.signal ? ` (signal ${r.signal})` : ''}${r.erreur ? ` (${r.erreur})` : ''} en ${duree.toFixed(1)} s\n`)
  const a = analyserSortieJuge(r.stdout)
  return { ...r, duree, journal, a }
}

// ── La preuve ────────────────────────────────────────────────────────────────────────────────────────────────────────
const verdicts = new Map()
const noter = (id, ok, detail) => verdicts.set(id, { ok, detail })
function finir() {
  console.log(`${NOM} --lot=${LOT} (${FICHE_LOT})`)
  const rouges = []
  for (const [id, v] of verdicts) { console.log(`${v.ok ? 'PASS' : 'FAIL'} ${id} — ${v.detail}`); if (!v.ok) rouges.push(id) }
  console.log(rouges.length ? `${NOM} : FAIL — ${rouges.join(', ')}` : `${NOM} : PASS`)
  process.exit(rouges.length ? 1 : 0)
}

fs.mkdirSync(TRAV, { recursive: true })
const DOSSIER_SORTIES = exigerSousTravail(path.join(TRAV, `sorties-${LOT}`))
fs.rmSync(DOSSIER_SORTIES, { recursive: true, force: true })
fs.mkdirSync(DOSSIER_SORTIES, { recursive: true })

const avant = etatDepot()

// REF
let REF = null
{
  const c = git(['rev-parse', '--verify', `${L.reference}^{commit}`])
  const d = []
  if (c.code !== 0) d.push(`référence ${L.reference} introuvable : ${court(c.stderr)}`)
  else {
    const sha = c.stdout.trim()
    if (git(['merge-base', '--is-ancestor', sha, 'HEAD']).code !== 0) d.push(`${sha.slice(0, 7)} n'est pas un ancêtre de HEAD`)
    for (const prefixe of L.absents_de_la_reference || []) {
      if (prefixe.includes('*')) {
        // un motif glob sur le dernier segment (ex. "supabase/migrations/*_packs_pubs.sql") : ls-tree du dossier, noms
        // comparés au motif (seul « * » est un joker) — un ls-tree direct sur le motif ne le développe pas.
        const dossier = path.posix.dirname(prefixe), motif = path.posix.basename(prefixe)
        const re = new RegExp(`^${motif.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`)
        const t = git(['ls-tree', '--name-only', '-r', sha, '--', dossier])
        const trouve = (t.stdout || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => path.posix.basename(l)).find((n) => re.test(n))
        if (trouve) d.push(`la référence contient déjà ${dossier}/${trouve}`)
      } else {
        const t = git(['ls-tree', '--name-only', '-r', sha, '--', prefixe.replace(/\/$/, '')])
        if ((t.stdout || '').trim()) d.push(`la référence contient déjà ${prefixe}`)
      }
    }
    if (!d.length) {
      try { REF = extraireReference({ commit: sha, dest: path.join(TRAV, `reference-${LOT}`) }) } catch (e) { d.push(court(e.message, 200)) }
    }
  }
  noter('REF', !d.length && !!REF, d.length ? d.join(' ; ') : `${REF.commit.slice(0, 7)} ${REF.reutilise ? 'réutilisé' : 'extrait'} dans ${rel(REF.dest)} (${REF.fichiers} fichiers)${L.absents_de_la_reference ? `, sans ${L.absents_de_la_reference.join(', ')}` : ''}`)
  if (!REF) { for (const j of L.juges) noter(labelJuge(j), false, "non jugé : pas de référence fiable (REF)"); noter('IMMOBILE', false, 'non jugé : REF en échec'); noter('EA', false, 'non jugé : REF en échec'); finir() }
}

// Chaque juge : référence puis témoin
const lignesEA = []
for (const j of L.juges) {
  const label = labelJuge(j)
  const d = []
  const ref = lancerJuge(j, [`--racine=${REF.dest}`], 'reference', DOSSIER_SORTIES)
  if (ref.code === 0) d.push(`sur la référence : code 0, aucun échec (« ${j.echec_attendu} » attendu en FAIL)`)
  else if (ref.code === null) d.push(`sur la référence : délai de ${DELAI_MS / 60_000} min dépassé`)
  const ligneAttendue = ref.a.lignes.find((l) => l.id === j.echec_attendu)
  if (!ligneAttendue) d.push(`sur la référence : aucune ligne « FAIL ${j.echec_attendu} — … » (fin de sortie : « ${court(ref.sortie.trim().split(/\r?\n/).pop(), 140)} »)`)
  else if (ligneAttendue.verdict !== 'FAIL') d.push(`sur la référence : ${j.echec_attendu} en ${ligneAttendue.verdict}, FAIL attendu (« ${court(ligneAttendue.detail, 120)} »)`)

  const tem = lancerJuge(j, ['--temoin'], 'temoin', DOSSIER_SORTIES)
  if (tem.code !== 0) d.push(`--temoin : code ${tem.code}${tem.signal ? ` (signal ${tem.signal})` : ''}${tem.erreur ? ` (${tem.erreur})` : ''} ; fin de sortie : « ${court(tem.sortie.trim().split(/\r?\n/).pop(), 140)} »`)

  noter(label, !d.length, d.length ? d.join(' ; ') : `référence : code ${ref.code}, FAIL ${j.echec_attendu} — ${court(ligneAttendue?.detail, 120)} (${ref.duree.toFixed(0)} s) ; témoin : code 0 (${tem.duree.toFixed(0)} s)`)
  lignesEA.push({ juge: label, fiche: j.fiche_jugee || '', attendu: j.echec_attendu, extraitReference: ligneAttendue ? `FAIL ${ligneAttendue.id} — ${ligneAttendue.detail}` : `(aucune ligne trouvée ; fin de sortie : ${court(ref.sortie.trim().split(/\r?\n/).pop(), 140)})`, verdictTemoin: tem.code === 0 ? `PASS, code 0 (${tem.duree.toFixed(0)} s)` : `FAIL, code ${tem.code} (${tem.duree.toFixed(0)} s)` })
}

// IMMOBILE
{
  const apres = etatDepot()
  const d = ecarts(avant, apres)
  noter('IMMOBILE', !d.length, d.length ? `git status a bougé hors de .orchestre/travail/ et .orchestre/preuves/ : ${d.slice(0, 6).join(' ; ')}${d.length > 6 ? ' …' : ''}` : `git status --porcelain : ${apres.size} entrée(s) suivie(s), rien de nouveau hors ${PERMIS.join(', ')}`)
}

// EA
{
  const dossier = path.join(R, '.orchestre', 'preuves', FICHE_LOT)
  const fichier = path.join(dossier, 'echecs-attendus.md')
  const echapper = (t) => String(t ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim()
  const t = []
  t.push(`# Échecs attendus des juges du lot ${LOT} (${FICHE_LOT}) sur leur arbre de référence`)
  t.push('')
  t.push(`Écrit par \`node scripts/juges-026-pubs-contenu-preuve.mjs --lot=${LOT}\` le ${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}. Chaque juge est lancé par la preuve elle-même, sans shell : \`--racine=<référence>\` (extraite par \`git archive\` de \`${REF.commit.slice(0, 12)}\` sous \`${rel(REF.dest)}\`) puis \`--temoin\` sur l'arbre courant.`)
  t.push('')
  t.push('| Juge | Critère attendu en échec sur la référence | Extrait réel de sa sortie | Verdict du témoin |')
  t.push('|---|---|---|---|')
  for (const l of lignesEA) t.push(`| ${echapper(l.juge)} | ${echapper(l.attendu)} | ${echapper(l.extraitReference)} | ${echapper(l.verdictTemoin)} |`)
  t.push('')
  fs.mkdirSync(dossier, { recursive: true })
  fs.writeFileSync(fichier, t.join('\n'))
  const relu = fs.existsSync(fichier) ? fs.readFileSync(fichier, 'utf8') : ''
  const rangs = relu.split(/\r?\n/).filter((l) => l.startsWith('| ') && !l.startsWith('| Juge') && !l.startsWith('|---'))
  const e = []
  if (!relu.trim()) e.push(`${rel(fichier)} : 0 octet après écriture`)
  if (rangs.length !== lignesEA.length) e.push(`${rangs.length} ligne(s), ${lignesEA.length} attendue(s)`)
  noter('EA', !e.length, e.length ? e.join(' ; ') : `${rel(fichier)} : ${Buffer.byteLength(relu)} octets, ${rangs.length} ligne(s)`)
}

finir()
