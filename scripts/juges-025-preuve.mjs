// scripts/juges-025-preuve.mjs — la preuve des juges de la série 025 (fiche 025-01, point 12), écrite par Claude Code.
//
// Ce que la preuve établit, pour chacun des huit juges de la série : il échoue aujourd'hui sur l'arbre de référence 1620723
// (les fonctions n'y existent pas) par le critère que la fiche attend, et il passe sur son témoin conforme. Un juge qui
// passerait sur la référence ne mesure rien ; un juge qui échouerait sur son témoin ne pourrait jamais être satisfait.
//
//   REF    git archive 1620723 extrait (ou réutilisé) dans .orchestre/travail/025-01/reference/ par extraireReference de
//          scripts/fixtures/025/commun.mjs : chaque fichier comparé à son blob, rien d'écrit dans .git.
//   <juge> pour chaque juge, deux passages, dans cet ordre, sans shell :
//          1. node scripts/<juge>.mjs --racine=<référence>
//             → code 1 exactement (un code 2 est un appel refusé, null un dépassement du délai) ; une seule ligne d'en-tête
//               « <juge> — racine <référence> », sans « — témoin » ; dernière ligne « <juge> : FAIL — … » ; le critère attendu
//               (MQ-1, FS-1, VS-1, CF-1, PR-1, WM-1, PC-1) imprimé en FAIL, cité parmi les rouges, avec un détail qui dit ce
//               qui manque (ni « interrompu », ni « exception », ni « non évalué ») ;
//             prospects-hors-depot n'a pas de critère attendu (le point 12 n'en nomme pas) : la référence précède toute
//             prospection, il doit y passer en code 0 ; son cas d'échec est prouvé par PH-T dans son propre témoin ;
//          2. node scripts/<juge>.mjs --temoin
//             → code 0 ; en-tête « — témoin » ; dernière ligne « <juge> : PASS » ; aucune ligne FAIL ; chaque critère imprimé
//               sur la référence est imprimé ici en PASS (le témoin exerce tout ce qui a échoué), avec un détail qui mesure
//               quelque chose (15 signes au moins, pas le « conforme » par défaut de creerSortie).
//          Dans les deux passages : identifiants sans doublon, aucun critère non déclaré, aucun critère interrompu.
//   INTACT après les seize passages : l'arbre de référence est toujours identique à 1620723 blob pour blob (aucun juge n'y a
//          écrit, pas même un tsbuildinfo), et rien n'a bougé dans le dépôt sous les chemins interdits de la fiche (app/, lib/,
//          public/, supabase/, maquettes/, les quatre juges d'autres fiches, .orchestre/decisions.md) : même HEAD, mêmes
//          entrées de git status (fichiers ignorés compris), même taille et même date de chaque fichier listé.
//   EA     .orchestre/preuves/025-01/echecs-attendus.md écrit (une ligne par juge : critère attendu, extrait réel de la
//          sortie sur la référence, verdict du témoin), relu, non vide, une ligne par juge.
//
// Sorties complètes de chaque passage : .orchestre/travail/025-01/preuve/<juge>.reference.log et <juge>.temoin.log.
// Le détail de chaque passage (code, durée) est écrit au fil de l'eau sur stderr ; le verdict, une ligne par critère, sur stdout.
//
// Usage : node scripts/juges-025-preuve.mjs [--juge=a,b]
//   --juge=… ne relance que ces juges (pour corriger) : les autres restent « non évalué », le verdict est FAIL et
//   echecs-attendus.md n'est pas réécrit. Code 0 seulement si tout est vert ; 2 si l'appel est invalide.
import fs from 'node:fs'
import path from 'node:path'
import {
  R, TRAVAIL, REFERENCE_DOSSIER,
  lireOptionsOuQuitter, creerSortie, lancer, git, extraireReference, verifierArbre, analyserSortie, exigerSousTravail,
  fichierNonVide,
} from './fixtures/025/commun.mjs'

const JUGE = 'juges-025-preuve'
const JUGES = [
  { juge: 'maquette-qa', attendu: 'MQ-1', fiche: '025-02, 025-11' },
  { juge: 'formulaire-site-qa', attendu: 'FS-1', fiche: '025-03' },
  { juge: 'verrou-site-qa', attendu: 'VS-1', fiche: '025-04' },
  { juge: 'constructeur-ferme-qa', attendu: 'CF-1', fiche: '025-05' },
  { juge: 'promesses-qa', attendu: 'PR-1', fiche: '025-06' },
  { juge: 'webhook-muet-qa', attendu: 'WM-1', fiche: '025-07' },
  { juge: 'parcours-commande-qa', attendu: 'PC-1', fiche: '025-09' },
  { juge: 'prospects-hors-depot', attendu: null, fiche: '025-01 point 11', temoinExige: ['PH-T'] },
]
const IDS = ['REF', ...JUGES.map((j) => j.juge), 'INTACT', 'EA']
const PREUVES = path.join(R, '.orchestre', 'preuves', '025-01')
const ECHECS_ATTENDUS = path.join(PREUVES, 'echecs-attendus.md')
const JOURNAUX = path.join(TRAVAIL, '025-01', 'preuve')
const DELAI_MS = 20 * 60_000
const INTERDITS = ['app', 'lib', 'public', 'supabase', 'maquettes', 'scripts/fermeture-e2e.mjs', 'scripts/site-sorti-des-formules-verifier.mjs', 'scripts/familles-socle-suite-qa.mjs', 'scripts/signature-repos-qa.mjs', '.orchestre/decisions.md']
const DETAIL_CASSE = /^(?:interrompu :|exception :|non évalué$|critère non déclaré)/

const premiereLigne = (e) => String((e && e.message) || e).split('\n')[0].slice(0, 300)
const court = (t, n = 170) => { const x = String(t ?? '').replace(/\s+/g, ' ').trim(); return x.length > n ? `${x.slice(0, n - 1)}…` : x }
const rel = (p) => path.relative(R, p).split(path.sep).join('/')
const memeChemin = (a, b) => (process.platform === 'win32' ? path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase() : path.resolve(a) === path.resolve(b))
const substantiel = (d) => { const x = String(d ?? '').replace(/\s+/g, ' ').trim(); return x.length >= 15 && x !== 'conforme' }

// ── Options ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
const o = lireOptionsOuQuitter(process.argv.slice(2), { connues: ['juge'] })
const refuser = (m) => { console.error(`✗ ${m}`); process.exit(2) }
if (o.positionnels.length) refuser(`argument(s) inattendu(s) : ${o.positionnels.join(' ')} — usage : node scripts/juges-025-preuve.mjs [--juge=a,b]`)
if (o.temoin || o.reel || !o.racineParDefaut) refuser('la preuve lance elle-même chaque juge sur la référence et sur son témoin : ni --racine, ni --temoin, ni --reel')
if (o.drapeau('juge') || (o.valeur('juge') !== undefined && !o.liste('juge').length)) refuser('--juge attend une liste : --juge=maquette-qa,promesses-qa')
const inconnus = o.liste('juge').filter((n) => !JUGES.some((j) => j.juge === n))
if (inconnus.length) refuser(`--juge : juge(s) inconnu(s) : ${inconnus.join(', ')} (connus : ${JUGES.map((j) => j.juge).join(', ')})`)
const partiel = o.liste('juge').length > 0
const CHOISIS = partiel ? JUGES.filter((j) => o.liste('juge').includes(j.juge)) : JUGES

// ── État des chemins interdits du dépôt (INTACT) ──────────────────────────────────────────────────────────────────────────
function empreinteFichier(relPosix) {
  try { const st = fs.statSync(path.join(R, relPosix)); return st.isFile() ? `${st.size}:${st.mtimeMs}` : `dossier` } catch { return 'absent' }
}
function etatInterdits() {
  const head = git(['rev-parse', 'HEAD'])
  const st = git(['status', '--porcelain=v1', '-z', '--untracked-files=all', '--', ...INTERDITS])
  const ig = git(['ls-files', '--others', '--ignored', '--exclude-standard', '-z', '--', ...INTERDITS])
  for (const [nom, r] of [['rev-parse HEAD', head], ['status', st], ['ls-files --ignored', ig]]) if (r.code !== 0) throw new Error(`git ${nom} en code ${r.code} : ${court(r.stderr || r.erreur)}`)
  const m = new Map()
  const champs = st.stdout.split('\0')
  for (let i = 0; i < champs.length; i++) {
    const e = champs[i]
    if (!e) continue
    const xy = e.slice(0, 2), p = e.slice(3)
    m.set(p, `${xy}|${empreinteFichier(p)}`)
    if (xy[0] === 'R' || xy[0] === 'C') i++ // porcelain -z : l'ancien chemin d'un renommage suit
  }
  for (const p of ig.stdout.split('\0').filter(Boolean)) m.set(p, `!!|${empreinteFichier(p)}`)
  return { head: head.stdout.trim(), m }
}
function ecartsInterdits(avant, apres) {
  const d = []
  if (avant.head !== apres.head) d.push(`HEAD a bougé : ${avant.head.slice(0, 7)} → ${apres.head.slice(0, 7)}`)
  const cles = new Set([...avant.m.keys(), ...apres.m.keys()])
  for (const k of [...cles].sort()) {
    const a = avant.m.get(k), b = apres.m.get(k)
    if (a === b) continue
    if (a === undefined) d.push(`${k} apparu (${b.split('|')[0].trim() || '?'})`)
    else if (b === undefined) d.push(`${k} revenu à l'état suivi ou disparu`)
    else d.push(`${k} modifié (${a.split('|')[0].trim()} → ${b.split('|')[0].trim()})`)
  }
  return d
}

// ── Un passage d'un juge ──────────────────────────────────────────────────────────────────────────────────────────────────
function lancerJuge(j, args, mode) {
  const script = path.join(R, 'scripts', `${j.juge}.mjs`)
  const t0 = Date.now()
  process.stderr.write(`… ${j.juge} ${args.map((a) => (a.startsWith('--racine=') ? `--racine=${rel(a.slice(9))}` : a)).join(' ')}\n`)
  const r = lancer(process.execPath, [script, ...args], { cwd: R, timeout: DELAI_MS })
  const duree = (Date.now() - t0) / 1000
  const journal = path.join(JOURNAUX, `${j.juge}.${mode}.log`)
  fs.writeFileSync(journal, `$ node scripts/${j.juge}.mjs ${args.join(' ')}\n${r.stdout}${r.stderr.trim() ? `\n--- stderr ---\n${r.stderr}` : ''}\n--- code ${r.code}${r.signal ? ` (signal ${r.signal})` : ''}${r.erreur ? ` (${r.erreur})` : ''} en ${duree.toFixed(1)} s\n`)
  process.stderr.write(`  ${j.juge} ${mode} : code ${r.code}${r.signal ? ` (signal ${r.signal})` : ''} en ${duree.toFixed(1)} s → ${rel(journal)}\n`)
  const lignes = r.stdout.split(/\r?\n/)
  const a = analyserSortie(r.stdout)
  const reEntete = new RegExp(`^${j.juge.replace(/[-]/g, '\\-')} — racine (.+?)( — témoin)?$`)
  const entetes = lignes.map((l) => reEntete.exec(l)).filter(Boolean)
  const derniere = lignes.filter((l) => l.trim()).pop() || ''
  return { ...r, duree, journal, a, entetes, derniere, fin: court(r.sortie.split('\n').filter((l) => l.trim()).slice(-2).join(' / '), 200) }
}
/** Défauts communs aux deux passages : sortie lisible, identifiants propres, rien d'interrompu. */
function defautsForme(j, p, attenduVerdict) {
  const d = []
  if (p.a.juge !== j.juge) d.push(`dernière ligne de verdict introuvable ou d'un autre juge (${p.a.juge ?? 'aucune'}) ; fin de sortie : « ${p.fin} »`)
  else if (p.a.verdict !== attenduVerdict) d.push(`verdict ${p.a.verdict}, ${attenduVerdict} attendu`)
  const verdictAttendu = new RegExp(`^${j.juge} : ${attenduVerdict}(?: — .*)?$`)
  if (!verdictAttendu.test(p.derniere)) d.push(`la sortie ne se termine pas par « ${j.juge} : ${attenduVerdict} » mais par « ${court(p.derniere, 120)} »`)
  if (!p.a.lignes.length) d.push('aucune ligne de critère')
  const vus = new Set(), doubles = new Set()
  for (const l of p.a.lignes) { if (vus.has(l.id)) doubles.add(l.id); vus.add(l.id) }
  if (doubles.size) d.push(`critère(s) imprimé(s) deux fois : ${[...doubles].join(', ')}`)
  const casses = p.a.lignes.filter((l) => DETAIL_CASSE.test(l.detail))
  if (casses.length) d.push(`critère(s) non jugé(s) : ${casses.map((l) => `${l.id} « ${court(l.detail, 90)} »`).join(' ; ')}`)
  if (p.entetes.length !== 1) d.push(`${p.entetes.length} ligne(s) d'en-tête « ${j.juge} — racine … », une attendue`)
  return d
}
/** Les deux passages d'un juge → { ok, echecs[], resume, ligne (pour echecs-attendus.md) } */
function jugerUnJuge(j) {
  const echecs = []
  const script = path.join(R, 'scripts', `${j.juge}.mjs`)
  const ligne = { juge: j.juge, attendu: j.attendu, fiche: j.fiche, reference: '', temoin: '', verdict: 'FAIL' }
  if (!fichierNonVide(script)) {
    echecs.push(`scripts/${j.juge}.mjs absent ou vide`)
    ligne.reference = ligne.temoin = 'juge absent'
    return { ok: false, echecs, resume: '', ligne }
  }

  // 1. sur la référence
  const ref = lancerJuge(j, [`--racine=${REFERENCE_DOSSIER}`], 'reference')
  const codeRef = j.attendu ? 1 : 0
  if (ref.code !== codeRef) echecs.push(`référence : code ${ref.code}${ref.signal ? ` (signal ${ref.signal})` : ''}, ${codeRef} attendu${ref.code === 2 ? ' (appel refusé)' : ref.code === null ? ` (délai de ${DELAI_MS / 60_000} min dépassé ?)` : ''} ; fin de sortie : « ${ref.fin} »`)
  for (const x of defautsForme(j, ref, j.attendu ? 'FAIL' : 'PASS')) echecs.push(`référence : ${x}`)
  if (ref.entetes.length === 1) {
    const [, racine, temoin] = ref.entetes[0]
    if (temoin) echecs.push('référence : l\'en-tête annonce un témoin')
    if (!memeChemin(racine, REFERENCE_DOSSIER)) echecs.push(`référence : le juge a jugé ${racine}, pas ${REFERENCE_DOSSIER}`)
  }
  let ligneAttendue = null
  if (j.attendu) {
    ligneAttendue = ref.a.lignes.find((l) => l.id === j.attendu)
    if (!ligneAttendue) echecs.push(`référence : aucune ligne ${j.attendu}`)
    else {
      if (ligneAttendue.verdict !== 'FAIL') echecs.push(`référence : ${j.attendu} en ${ligneAttendue.verdict}, FAIL attendu (« ${court(ligneAttendue.detail, 120)} »)`)
      else if (!substantiel(ligneAttendue.detail)) echecs.push(`référence : FAIL ${j.attendu} sans détail qui dise ce qui manque (« ${ligneAttendue.detail} »)`)
      if (!ref.a.rouges.includes(j.attendu)) echecs.push(`référence : ${j.attendu} absent des rouges de la dernière ligne (${ref.a.rouges.join(', ') || 'aucun'})`)
    }
  } else {
    const rouges = ref.a.lignes.filter((l) => l.verdict !== 'PASS')
    if (rouges.length) echecs.push(`référence : ${rouges.map((l) => `${l.id} « ${court(l.detail, 100)} »`).join(' ; ')} — aucun échec attendu`)
  }
  const rougesRef = ref.a.lignes.filter((l) => l.verdict === 'FAIL').map((l) => l.id)

  // 2. sur le témoin
  const tem = lancerJuge(j, ['--temoin'], 'temoin')
  if (tem.code !== 0) echecs.push(`témoin : code ${tem.code}${tem.signal ? ` (signal ${tem.signal})` : ''}, 0 attendu ; fin de sortie : « ${tem.fin} »`)
  for (const x of defautsForme(j, tem, 'PASS')) echecs.push(`témoin : ${x}`)
  if (tem.entetes.length === 1 && !tem.entetes[0][2]) echecs.push('témoin : l\'en-tête n\'annonce pas « — témoin »')
  const rougesTem = tem.a.lignes.filter((l) => l.verdict !== 'PASS')
  if (rougesTem.length) echecs.push(`témoin : ${rougesTem.map((l) => `${l.id} « ${court(l.detail, 110)} »`).join(' ; ')}`)
  const passesTem = new Map(tem.a.lignes.filter((l) => l.verdict === 'PASS').map((l) => [l.id, l]))
  const exiges = [...new Set([...ref.a.lignes.map((l) => l.id), ...(j.temoinExige || []), ...(j.attendu ? [j.attendu] : [])])]
  const manquants = exiges.filter((id) => !passesTem.has(id))
  if (manquants.length) echecs.push(`témoin : ${manquants.join(', ')} jugé(s) sur la référence ou exigé(s), pas en PASS sur le témoin`)
  const creux = [...passesTem.values()].filter((l) => !substantiel(l.detail))
  if (creux.length) echecs.push(`témoin : PASS sans mesure dite : ${creux.map((l) => `${l.id} « ${l.detail} »`).join(', ')}`)

  // ligne de echecs-attendus.md
  const temAttendu = j.attendu ? passesTem.get(j.attendu) : passesTem.get('PH-T')
  ligne.reference = j.attendu
    ? `code ${ref.code} en ${ref.duree.toFixed(0)} s, ${rougesRef.length} critère(s) en échec (${rougesRef.join(', ') || 'aucun'}) ; ${ligneAttendue ? `${ligneAttendue.verdict} ${ligneAttendue.id} — ${court(ligneAttendue.detail, 300)}` : `aucune ligne ${j.attendu}`}`
    : `code ${ref.code} en ${ref.duree.toFixed(0)} s ; ${ref.a.lignes.map((l) => `${l.verdict} ${l.id} — ${court(l.detail, 140)}`).join(' ; ') || 'aucune ligne'}`
  ligne.temoin = `code ${tem.code} en ${tem.duree.toFixed(0)} s, ${passesTem.size}/${tem.a.lignes.length} critère(s) en PASS${temAttendu ? ` ; PASS ${temAttendu.id} — ${court(temAttendu.detail, 220)}` : ''}${rougesTem.length ? ` ; FAIL ${rougesTem.map((l) => l.id).join(', ')}` : ''}`
  ligne.verdict = echecs.length ? 'FAIL' : 'PASS'
  ligne.journaux = [rel(ref.journal), rel(tem.journal)]

  const resume = j.attendu
    ? `référence : code 1 en ${ref.duree.toFixed(0)} s, FAIL ${j.attendu} « ${court(ligneAttendue?.detail, 150)} » (${rougesRef.length} en échec : ${rougesRef.join(', ')}) ; témoin : code 0 en ${tem.duree.toFixed(0)} s, ${passesTem.size} critères en PASS dont ${j.attendu} « ${court(temAttendu?.detail, 110)} »`
    : `référence : code 0 en ${ref.duree.toFixed(0)} s (aucun échec attendu : ${ref.a.lignes.map((l) => `${l.id} « ${court(l.detail, 60)} »`).join(', ')}) ; témoin : code 0 en ${tem.duree.toFixed(0)} s, ${passesTem.size} critères en PASS dont PH-T « ${court(temAttendu?.detail, 110)} »`
  return { ok: echecs.length === 0, echecs, resume, ligne }
}

// ── echecs-attendus.md ────────────────────────────────────────────────────────────────────────────────────────────────────
// une cellule de tableau : sur une ligne, les « | » échappés (le reste est recopié tel quel, c'est l'extrait réel)
const cellule = (t) => String(t ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim()
function ecrireEchecsAttendus({ ref, head, lignes, verdict, debut }) {
  fs.mkdirSync(PREUVES, { recursive: true })
  const t = []
  t.push('# 025-01 — échecs attendus des juges de la série 025')
  t.push('')
  t.push(`Écrit par \`node scripts/juges-025-preuve.mjs\` le ${new Date().toISOString()} (passages lancés à ${debut}). Dépôt à \`${head.slice(0, 7)}\`.`)
  t.push(`Référence : \`${ref.commit.slice(0, 7)}\` (${ref.commit}) extraite dans \`${rel(REFERENCE_DOSSIER)}/\` : ${ref.fichiers} fichiers, identiques blob pour blob avant et après les passages.`)
  t.push('')
  t.push('Chaque juge est lancé deux fois, sans shell, depuis la racine du dépôt : `--racine=<référence>` (il doit y échouer en code 1, sur le critère attendu, avec un détail qui dit ce qui manque) puis `--temoin` (il doit y passer en code 0, chaque critère jugé sur la référence en PASS). Les extraits ci-dessous sont recopiés des sorties réelles ; les sorties complètes sont dans `.orchestre/travail/025-01/preuve/`.')
  t.push('')
  t.push('| Juge (fiche) | Critère attendu en échec sur la référence | Extrait réel de la sortie sur la référence | Verdict du témoin | Preuve |')
  t.push('|---|---|---|---|---|')
  for (const l of lignes) {
    const attendu = l.attendu ?? 'aucun : la fiche n\'en nomme pas, la référence précède toute prospection ; l\'échec est prouvé par PH-T dans le témoin'
    t.push(`| ${cellule(l.juge)} (${cellule(l.fiche)}) | ${cellule(attendu)} | ${cellule(l.reference)} | ${cellule(l.temoin)} | ${cellule(l.verdict)} |`)
  }
  t.push('')
  t.push(`Verdict de la preuve : ${verdict}.`)
  t.push('')
  fs.writeFileSync(ECHECS_ATTENDUS, t.join('\n'))
}

// ── La preuve ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const debut = new Date().toISOString()
const s = creerSortie(JUGE, IDS, { racine: R })
if (partiel) s.note(`lancement partiel : ${CHOISIS.map((j) => j.juge).join(', ')} — les autres juges restent non évalués, echecs-attendus.md n'est pas réécrit`)
await s.executer(async () => {
  const avant = etatInterdits()
  exigerSousTravail(JOURNAUX)
  fs.mkdirSync(JOURNAUX, { recursive: true })

  // REF
  const t0 = Date.now()
  process.stderr.write(`… référence ${REFERENCE_DOSSIER}\n`)
  const ref = extraireReference()
  const v0 = verifierArbre(REFERENCE_DOSSIER, ref.commit)
  s.verdict('REF', v0.ok && v0.fichiers > 0,
    `${ref.commit.slice(0, 7)} ${ref.reutilise ? 'réutilisé' : 'extrait'} dans ${rel(REFERENCE_DOSSIER)} : ${v0.fichiers} fichiers, ${(v0.octets / 1e6).toFixed(1)} Mo, identiques blob pour blob (${((Date.now() - t0) / 1000).toFixed(1)} s)`,
    `arbre de référence différent de ${ref.commit.slice(0, 7)} : ${v0.manquants.length} manquant(s), ${v0.intrus.length} en trop, ${v0.differents.length} différent(s)`)
  if (!v0.ok) { for (const j of JUGES) s.echoue(j.juge, 'pas de référence fiable (REF)'); s.echoue('INTACT', 'pas de référence fiable (REF)'); s.echoue('EA', 'pas de référence fiable (REF)'); return }

  // les juges
  const lignes = []
  for (const j of CHOISIS) {
    let r
    try { r = jugerUnJuge(j) } catch (e) { r = { ok: false, echecs: [`interrompu : ${premiereLigne(e)}`], resume: '', ligne: { juge: j.juge, attendu: j.attendu, fiche: j.fiche, reference: `preuve interrompue : ${premiereLigne(e)}`, temoin: '', verdict: 'FAIL' } } }
    s.resultat(j.juge, r)
    lignes.push(r.ligne)
  }

  // INTACT
  const v1 = verifierArbre(REFERENCE_DOSSIER, ref.commit)
  const d = []
  if (!v1.ok) d.push(`arbre de référence modifié pendant les passages : ${[...v1.manquants.map((x) => `${x} disparu`), ...v1.intrus.map((x) => `${x} ajouté`), ...v1.differents.map((x) => `${x} modifié`)].slice(0, 4).join(', ')}`)
  const ecarts = ecartsInterdits(avant, etatInterdits())
  if (ecarts.length) d.push(`chemins interdits changés pendant les passages (${ecarts.length}) : ${ecarts.slice(0, 4).join(' ; ')}${ecarts.length > 4 ? ' …' : ''}`)
  s.verdict('INTACT', !d.length, `référence toujours identique à ${ref.commit.slice(0, 7)} (${v1.fichiers} fichiers, blob pour blob) ; ${INTERDITS.length} chemins interdits du dépôt inchangés (HEAD ${avant.head.slice(0, 7)}, ${avant.m.size} entrée(s) de git status et d'ignorés, mêmes tailles et dates)`, d.join(' ; '))

  // EA
  if (partiel) { s.echoue('EA', 'lancement partiel (--juge=…) : echecs-attendus.md non réécrit'); return }
  const verdictGlobal = IDS.filter((id) => id !== 'EA').some((id) => s.enEchec(id) || !s.evalue(id)) ? 'FAIL' : 'PASS'
  ecrireEchecsAttendus({ ref, head: avant.head, lignes, verdict: verdictGlobal, debut })
  const relu = fs.existsSync(ECHECS_ATTENDUS) ? fs.readFileSync(ECHECS_ATTENDUS, 'utf8') : ''
  const rangs = relu.split('\n').filter((l) => /^\| [a-z0-9-]+ \(/.test(l))
  const e = []
  if (!relu.trim()) e.push('echecs-attendus.md absent ou vide')
  if (rangs.length !== JUGES.length) e.push(`${rangs.length} ligne(s) de juge, ${JUGES.length} attendues`)
  for (const j of JUGES) if (!rangs.some((l) => l.startsWith(`| ${j.juge} (`))) e.push(`pas de ligne pour ${j.juge}`)
  for (const l of rangs) if (l.split(' | ').some((c) => !c.replace(/[|\s]/g, ''))) e.push(`cellule vide : ${court(l, 60)}`)
  s.verdict('EA', !e.length, `${rel(ECHECS_ATTENDUS)} : ${Buffer.byteLength(relu)} octets, une ligne par juge (${rangs.length}), verdict écrit ${verdictGlobal}`, e.join(' ; '))
})
