// SUITE TRANSVERSE du prompt 6 (prompt 1 : Studio et Signature) — lot 036-012. Hors ligne, gratuite.
//
// Elle ne rejoue pas les juges des lots : elle vérifie que CHAQUE test obligatoire du § 1.7 (p6:393-403) a un juge qui le porte, que ce
// juge porte son MUTANT (la règle ôtée, et le juge qui doit rougir), et que le lanceur (scripts/tout-verifier.mjs) joue tous ces juges.
// Un juge absent du lanceur n'est joué par personne (CLAUDE.md, pièges du lanceur).
//   T1  le même événement rejoué deux fois : un seul envoi, une seule carte
//   T2  Studio : aucun envoi au client ; le brouillon Gmail est créé, pas envoyé
//   T3  Signature : un type non activé reste une carte
//   T4  Signature : un geste de OUTILS_JAMAIS_AUTO reste une carte
//   T5  Signature : 10 minutes avant le départ, 20 par jour et par compte         (mutants rejoués ICI sur lib/pilote/regles.ts)
//   T6  un prix sans source bloque envoi_devis
//   T7  un créneau absent de l'agenda ne peut pas être proposé
//   T8  une autorisation expirée : le département se tait, l'alerte part, rien ne plante
//   T9  deux comptes : aucun n'accède aux données de l'autre (filtre de chaque requête)
//   T10 l'avis négatif n'est jamais publié sans l'artisan
//   T11 le STOP d'un SMS coupe tout envoi suivant à ce client
//   T12 les empreintes des offres : Studio et Signature valent ce que dit lib/plans.ts   (mutant rejoué ICI sur lib/plans.ts)
//   L   aucun scripts/*-n8n-qa.mjs (ni juge de lot) hors du lanceur
// Elle prouve qu'elle sait rougir : chaque défaut simulé (un marqueur ôté d'un juge, un juge absent, un juge sorti du lanceur, un
// double, une garde sans mutant) doit la faire échouer ; les mutants des offres et du pilote sont rejoués sur une copie de la racine.
//
// Usage : node scripts/p6-transverse-qa.mjs            (statique + mutants rapides : quelques secondes)
//         node scripts/p6-transverse-qa.mjs --vivant   (joue en plus chaque juge porteur et exige « N mutants, N rouges »)

import { readFileSync, readdirSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, copyFileSync, symlinkSync, rmSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'

const RACINE = process.cwd()
const VIVANT = process.argv.includes('--vivant')
const t0 = Date.now()
const lire = (rel) => readFileSync(path.join(RACINE, rel), 'utf8')
const TS = ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs']

/** Les tests du § 1.7 et leurs porteurs. `marqueur` : ce qui doit figurer dans le juge (la règle et son mutant, ou l'assertion). */
const TESTS = [
  { id: 'T1', titre: 'le même événement rejoué deux fois : un seul envoi, une seule carte', porteurs: [
    { juge: 'cerveau-accueil-n8n-qa.mjs', marqueur: /le même événement rejoué deux fois/ },
    { juge: 'boite-n8n-qa.mjs', marqueur: /un message importé deux fois/ }] },
  { id: 'T2a', titre: 'Studio : aucun envoi au client, quel que soit le réglage', porteurs: [
    { juge: 'cerveau-accueil-n8n-qa.mjs', marqueur: /Studio qui envoie/ },
    { juge: 'deployer-client-n8n-qa.mjs', marqueur: /Studio qui envoie/ }] },
  { id: 'T2b', titre: 'Studio : le brouillon Gmail est créé, pas envoyé', porteurs: [
    { juge: 'boite-n8n-qa.mjs', marqueur: /un brouillon envoyé en Studio/ }] },
  { id: 'T3', titre: 'Signature : un type non activé reste une carte', porteurs: [
    { juge: 'cerveau-accueil-n8n-qa.mjs', marqueur: /un type non activé/ }] },
  { id: 'T4', titre: 'Signature : un geste de OUTILS_JAMAIS_AUTO reste une carte même activé', porteurs: [
    { juge: 'cerveau-accueil-n8n-qa.mjs', marqueur: /OUTILS_JAMAIS_AUTO qui part/ }] },
  { id: 'T5', titre: 'Signature : 10 minutes d’annulation et 20 envois par jour et par compte', porteurs: [
    { juge: 'pilote-qa.mjs', marqueur: /A12 délai d[’']annulation : 10 minutes/, ts: true },
    { juge: 'pilote-qa.mjs', marqueur: /B10 plafond compté pendant le passage/, ts: true }], vivant: 'pilote' },
  { id: 'T6', titre: 'un prix sans source bloque envoi_devis', porteurs: [
    { juge: 'devis-facture-n8n-qa.mjs', marqueur: /un prix sans source présenté comme sourcé/ }] },
  { id: 'T7', titre: 'un créneau absent de l’agenda ne peut pas être proposé', porteurs: [
    { juge: 'operations-n8n-qa.mjs', marqueur: /un créneau absent de l[’']agenda proposé/ }] },
  { id: 'T8', titre: 'une autorisation expirée : le département se tait, l’alerte part, rien ne plante', porteurs: [
    { juge: 'boite-n8n-qa.mjs', marqueur: /un jeton expiré qui fait planter/ },
    { juge: 'connexions-qa.mjs', marqueur: /jeton expiré qui fait planter/ },
    { juge: 'connexions-qa.mjs', marqueur: /traité comme une panne \(ni état ni alerte\)/ }] },
  { id: 'T9', titre: 'deux comptes : aucun n’accède aux données de l’autre', porteurs: [
    { juge: 'cerveau-accueil-n8n-qa.mjs', marqueur: /une requête sans filtre artisan_id/ },
    { juge: 'cerveau-accueil-n8n-qa.mjs', marqueur: /d[’']un autre compte routé/ }] },
  { id: 'T10', titre: 'l’avis négatif n’est jamais publié sans l’artisan', porteurs: [
    { juge: 'apres-reputation-n8n-qa.mjs', marqueur: /un avis négatif publié \(la publication devient automatique\)/ },
    { juge: 'apres-reputation-n8n-qa.mjs', marqueur: /un avis négatif publié \(un effet de publication Google ajouté\)/ }] },
  { id: 'T11', titre: 'le STOP d’un SMS coupe tout envoi suivant à ce client', porteurs: [
    { juge: 'apres-reputation-n8n-qa.mjs', marqueur: /un STOP ignoré/ }] },
  { id: 'T12', titre: 'les empreintes des offres : Studio et Signature valent exactement lib/plans.ts', porteurs: [
    { juge: 'offres-affichage-qa.mjs', marqueur: /mutation 9 non vue/, ts: true },
    { juge: 'offres-affichage-qa.mjs', marqueur: /a changé depuis l[’']ajout de l[’']Entreprise \(empreinte/, ts: true }], vivant: 'offres' },
]
/** Les juges attendus au lanceur en plus de ceux des tests (lots 036-001 à 036-018 et leurs gardes). */
const JUGES_DE_LOTS = ['cerveau-accueil-n8n-qa.mjs', 'systeme-agents-schema-qa.mjs', 'boite-n8n-qa.mjs', 'suivi-n8n-qa.mjs', 'devis-facture-n8n-qa.mjs', 'apres-reputation-n8n-qa.mjs',
  'direction-n8n-qa.mjs', 'operations-n8n-qa.mjs', 'connexions-qa.mjs', 'gabarits-accueil-qa.mjs', 'gabarits-argent-qa.mjs', 'gabarits-terrain-qa.mjs', 'gabarits-entreprise-qa.mjs',
  'gabarits-entreprise-2-qa.mjs', 'n8n-specs-qa.mjs', 'lib-socle-n8n-qa.mjs', 'lib-metier-n8n-qa.mjs', 'lib-relance-n8n-qa.mjs', 'deployer-client-n8n-qa.mjs', 'p6-transverse-qa.mjs',
  'offres-affichage-qa.mjs', 'pilote-qa.mjs']
/** Les juges des lots pas encore faits (écrits par leur propre lot, parfois en cours) : dès que la tâche est dans .orchestre/fait/, ils DOIVENT être au lanceur. */
const JUGES_A_VENIR = { 'maquettes-p6-qa.mjs': '036-010', 'interface-p6-qa.mjs': '036-011' }

// ─── Ce que le lanceur joue ──────────────────────────────────────────────────────────────────────────────────────
function lanceurDe(texte) {
  const suites = [...texte.matchAll(/args:\s*\[([^\]]*)\]/g)].flatMap((m) => [...m[1].matchAll(/'scripts\/([^']+\.mjs)'/g)].map((x) => x[1]))
  const horsBloc = texte.match(/export const HORS_LANCEUR = \{([\s\S]*?)\n\}/)?.[1] ?? ''
  const hors = [...horsBloc.matchAll(/^\s*'([^']+\.m?js|[^']+\.cjs)':/gm)].map((x) => x[1])
  return { suites, hors }
}

/** Juge un état du monde : { sources (nom → texte), lanceur, fichiers (scripts/*.mjs) }. Rend les manquements. */
function juger(M) {
  const e = []
  const ko = (code, msg) => e.push(`${code} ${msg}`)
  const joues = new Set(M.lanceur.suites), hors = new Set(M.lanceur.hors)
  // L : le lanceur
  const doublons = M.lanceur.suites.filter((s, i) => M.lanceur.suites.indexOf(s) !== i)
  for (const d of new Set(doublons)) ko('L2', `${d} est deux fois dans SUITES du lanceur`)
  for (const f of M.fichiers) {
    if (!/(-n8n-qa|-p6-qa)\.mjs$|^gabarits-.*-qa\.mjs$|^(deployer-client|systeme-agents-schema|connexions|n8n-specs)-?.*qa\.mjs$/.test(f)) continue
    if (JUGES_A_VENIR[f]) continue // son lot l'inscrit ; contrôlé plus bas dès que la tâche est dans fait/
    if (!joues.has(f) && !hors.has(f)) ko('L1', `scripts/${f} n'est ni dans SUITES ni dans HORS_LANCEUR : un juge que personne ne joue`)
  }
  for (const j of JUGES_DE_LOTS) {
    if (!M.fichiers.includes(j)) ko('L1', `le juge attendu scripts/${j} n'existe pas`)
    else if (!joues.has(j)) ko('L1', `scripts/${j} existe mais le lanceur ne le joue pas`)
  }
  for (const [j, tache] of Object.entries(JUGES_A_VENIR)) {
    if (!(M.faits ?? new Set()).has(tache)) continue
    if (!M.fichiers.includes(j)) ko('L1', `la tâche ${tache} est faite mais scripts/${j} n'existe pas`)
    else if (!joues.has(j) && !hors.has(j)) ko('L1', `scripts/${j} (lot ${tache}, fait) n'est ni dans SUITES ni dans HORS_LANCEUR`)
  }
  for (const j of hors) if (joues.has(j)) ko('L3', `${j} est à la fois dans SUITES et dans HORS_LANCEUR`)
  // T : les tests du § 1.7
  for (const t of TESTS) {
    if (!t.porteurs.length) ko(t.id, `aucun juge ne porte « ${t.titre} »`)
    for (const p of t.porteurs) {
      const src = M.sources[p.juge]
      if (src === undefined) { ko(t.id, `${t.titre} : le juge ${p.juge} est absent`); continue }
      if (!joues.has(p.juge)) ko(t.id, `${t.titre} : ${p.juge} n'est pas joué par le lanceur`)
      if (!p.marqueur.test(src)) ko(t.id, `${t.titre} : ${p.juge} ne porte plus « ${p.marqueur.source.slice(0, 60)} »`)
      if (!/mutant|mutation/i.test(src)) ko(t.id, `${t.titre} : ${p.juge} n'a aucun mutant : il ne prouve pas qu'il sait rougir`)
      if (p.ts && !joues.has(p.juge)) ko(t.id, `${p.juge} : suite TypeScript hors lanceur`)
    }
  }
  return e
}

const fichiers = readdirSync(path.join(RACINE, 'scripts')).filter((f) => f.endsWith('.mjs'))
const lanceurTexte = lire('scripts/tout-verifier.mjs')
const faits = new Set(existsSync(path.join(RACINE, '.orchestre/fait')) ? readdirSync(path.join(RACINE, '.orchestre/fait')).map((f) => f.replace(/\.md$/, '')) : [])
const M0 = { lanceur: lanceurDe(lanceurTexte), fichiers, sources: {}, faits }
for (const f of new Set([...TESTS.flatMap((t) => t.porteurs.map((p) => p.juge)), ...JUGES_DE_LOTS])) if (fichiers.includes(f)) M0.sources[f] = lire(`scripts/${f}`)
const echecs = juger(M0)

// ─── Les mutants de la suite elle-même ───────────────────────────────────────────────────────────────────────────
const clone = (M) => ({ lanceur: { suites: [...M.lanceur.suites], hors: [...M.lanceur.hors] }, fichiers: [...M.fichiers], sources: { ...M.sources }, faits: new Set(M.faits) })
const sans = (M, juge, re) => { const C = clone(M); C.sources[juge] = C.sources[juge].replace(re, 'XXXXX'); return C }
const MUTANTS_SUITE = [
  ['un marqueur du § 1.7 ôté du juge cerveau (Studio qui envoie)', () => sans(M0, 'cerveau-accueil-n8n-qa.mjs', /Studio qui envoie/g), /^T2a /],
  ['le mutant « prix sans source » ôté de devis-facture', () => sans(M0, 'devis-facture-n8n-qa.mjs', /un prix sans source présenté comme sourcé/g), /^T6 /],
  ['le mutant « STOP ignoré » ôté', () => sans(M0, 'apres-reputation-n8n-qa.mjs', /un STOP ignoré/g), /^T11 /],
  ['un juge porteur disparu', () => { const C = clone(M0); delete C.sources['operations-n8n-qa.mjs']; return C }, /^T7 .*absent/],
  ['un juge sorti du lanceur', () => { const C = clone(M0); C.lanceur.suites = C.lanceur.suites.filter((s) => s !== 'boite-n8n-qa.mjs'); return C }, /^(L1|T2b|T1|T8) .*boite-n8n-qa/],
  ['un nouveau *-n8n-qa.mjs que personne ne joue', () => { const C = clone(M0); C.fichiers.push('nouveau-n8n-qa.mjs'); return C }, /^L1 .*nouveau-n8n-qa/],
  ['un juge de lot fait mais sorti du lanceur (interface-p6-qa, lot 036-011 déclaré fait)', () => { const C = clone(M0); C.fichiers.push('interface-p6-qa.mjs'); C.faits.add('036-011'); return C }, /^L1 .*interface-p6-qa/],
  ['un lot déclaré fait dont le juge n’existe pas (036-010 sans maquettes-p6-qa)', () => { const C = clone(M0); C.fichiers = C.fichiers.filter((f) => f !== 'maquettes-p6-qa.mjs'); C.faits.add('036-010'); return C }, /^L1 .*maquettes-p6-qa/],
  ['une suite deux fois dans le lanceur', () => { const C = clone(M0); C.lanceur.suites.push('suivi-n8n-qa.mjs'); return C }, /^L2 /],
  ['un juge sans aucun mutant', () => { const C = clone(M0); C.sources['offres-affichage-qa.mjs'] = C.sources['offres-affichage-qa.mjs'].replace(/mutant|mutation/gi, 'x'); return C }, /^T12 .*aucun mutant/],
  ['un juge à la fois joué et écarté', () => { const C = clone(M0); C.lanceur.hors.push('direction-n8n-qa.mjs'); return C }, /^L3 /],
]
let rouges = 0
const lignes = []
for (const [nom, fab, motif] of MUTANTS_SUITE) {
  let res
  try { res = juger(fab()) } catch (err) { res = [`mutant inapplicable : ${err.message}`] }
  const vu = res.find((l) => motif.test(l))
  if (vu) rouges++
  lignes.push(`  ${vu ? '✓' : '✗'} suite : « ${nom} » → ${vu ? vu.slice(0, 140) : `LAISSE LA SUITE VERTE (${res[0] ?? 'aucun manquement'})`}`)
  if (!vu) echecs.push(`mutant de suite « ${nom} » non vu`)
}

// ─── Les mutants rejoués sur une copie de la racine : T5 (pilote) et T12 (offres) ─────────────────────────────────
/** Une racine jumelle : tout est un lien vers le dépôt, sauf les dossiers qui mènent aux fichiers mutés, copiés pour de vrai. */
function racineMutee(mutations, scriptsReels = []) {
  const tmp = mkdtempSync(path.join(tmpdir(), 'presti-transverse-'))
  const aCopier = new Map() // chemin relatif de dossier → enfants à NE PAS lier (ils mènent à un fichier copié)
  for (const rel of [...Object.keys(mutations), ...scriptsReels]) {
    const parts = rel.split('/')
    for (let i = 0; i < parts.length - 1; i++) {
      const dir = parts.slice(0, i).join('/')
      if (!aCopier.has(dir)) aCopier.set(dir, new Set())
      aCopier.get(dir).add(parts[i])
    }
  }
  const dossiersCopies = new Set(Object.keys(mutations).map((r) => path.dirname(r)))
  const peupler = (dir) => {
    const reel = path.join(RACINE, dir), cible = path.join(tmp, dir)
    mkdirSync(cible, { recursive: true })
    for (const enfant of readdirSync(reel)) {
      const rel = dir ? `${dir}/${enfant}` : enfant
      const estDossier = statSync(path.join(RACINE, rel)).isDirectory()
      if (estDossier && aCopier.get(dir)?.has(enfant)) { peupler(rel); continue }
      // un script réel (pour que sa racine soit la copie) ; les frères d'un fichier muté, copiés : leurs imports relatifs visent la copie
      if (!estDossier && (scriptsReels.includes(rel) || dossiersCopies.has(dir))) copyFileSync(path.join(RACINE, rel), path.join(tmp, rel))
      else symlinkSync(path.join(RACINE, rel), path.join(tmp, rel))
    }
  }
  peupler('')
  for (const [rel, fn] of Object.entries(mutations)) {
    const avant = lire(rel), apres = fn(avant)
    if (apres === avant) throw new Error(`mutant inapplicable : ${rel} n'a pas changé`)
    writeFileSync(path.join(tmp, rel), apres)
  }
  return tmp
}
const jouer = (cwd, script, ts) => {
  const r = spawnSync('node', [...(ts ? TS : []), script], { cwd, encoding: 'utf8' })
  return { code: r.status, sortie: `${r.stdout ?? ''}${r.stderr ?? ''}` }
}
function mutantRejoue(nom, mutations, script, motifRouge, reels = []) {
  let tmp
  try {
    tmp = racineMutee(mutations, [script, ...reels])
    const r = jouer(tmp, script, true)
    const vu = r.code !== 0 && motifRouge.test(r.sortie)
    if (vu) rouges++
    lignes.push(`  ${vu ? '✓' : '✗'} copie de la racine : « ${nom} » → ${vu ? (r.sortie.match(motifRouge)?.[0] ?? '').slice(0, 130) : `LAISSE ${script} VERT (code ${r.code})`}`)
    if (!vu) echecs.push(`mutant « ${nom} » non vu par ${script}`)
  } catch (err) { echecs.push(`mutant « ${nom} » inapplicable : ${err.message}`) } finally { if (tmp) rmSync(tmp, { recursive: true, force: true }) }
}
// La racine saine doit d'abord passer (sinon un rouge ne prouverait rien).
{
  let tmp
  try {
    tmp = racineMutee({ 'lib/pilote/regles.ts': (t) => `${t}\n// copie saine` }, ['scripts/pilote-qa.mjs'])
    const r = jouer(tmp, 'scripts/pilote-qa.mjs', true)
    if (r.code !== 0) echecs.push(`la racine jumelle saine ne passe pas pilote-qa (code ${r.code}) : ${r.sortie.split('\n').filter((l) => /^FAIL/.test(l)).slice(0, 2).join(' | ')}`)
    else lignes.push('  ✓ copie de la racine saine : pilote-qa vert (les mutants qui suivent rougissent pour leur seule modification)')
  } catch (err) { echecs.push(`racine jumelle : ${err.message}`) } finally { if (tmp) rmSync(tmp, { recursive: true, force: true }) }
}
// T5 : les deux constantes du § 1.7 sont aussi épinglées ici, car pilote-qa raisonne en `R.PLAFOND_AUTO_JOUR` (relatif).
const regles = lire('lib/pilote/regles.ts')
const delai = Number(regles.match(/export const DELAI_ANNULATION_MIN = (\d+)/)?.[1]), plafond = Number(regles.match(/export const PLAFOND_AUTO_JOUR = (\d+)/)?.[1])
if (delai !== 10) echecs.push(`T5 DELAI_ANNULATION_MIN vaut ${delai} (10 minutes attendues, p6:399)`)
if (plafond !== 20) echecs.push(`T5 PLAFOND_AUTO_JOUR vaut ${plafond} (20 par jour attendus, p6:399)`)
mutantRejoue('T5 le délai d’annulation passe de 10 à 0 minute', { 'lib/pilote/regles.ts': (t) => t.replace('DELAI_ANNULATION_MIN = 10', 'DELAI_ANNULATION_MIN = 0') }, 'scripts/pilote-qa.mjs', /FAIL A12|FAIL B[0-9]+ /)
mutantRejoue('T4 OUTILS_JAMAIS_AUTO vidée', { 'lib/pilote/regles.ts': (t) => t.replace(/(export const OUTILS_JAMAIS_AUTO: readonly string\[\] = )\[[^\]]*\]/, '$1[]') }, 'scripts/pilote-qa.mjs', /^FAIL /m)
mutantRejoue('T5 le plafond de 20 par jour retiré (2 000)', { 'lib/pilote/regles.ts': (t) => t.replace('PLAFOND_AUTO_JOUR = 20', 'PLAFOND_AUTO_JOUR = 2000') }, 'scripts/pilote-qa.mjs', /^FAIL /m)
mutantRejoue('T12 Studio reçoit la réponse automatique (plateforme.ia.auto)', { 'lib/plans.ts': (t) => t.replace('const STUDIO: Capacite[] = [', "const STUDIO: Capacite[] = [\n  'plateforme.ia.auto',") }, 'scripts/offres-affichage-qa.mjs', /Studio|studio|changé/)
// Les deux constantes épinglées ci-dessus rougissent sur leur propre mutant : la valeur lue doit changer.
for (const [nom, re, bon] of [['le délai à 0', /DELAI_ANNULATION_MIN = (\d+)/, 10], ['le plafond à 2000', /PLAFOND_AUTO_JOUR = (\d+)/, 20]]) {
  const mut = regles.replace(re, (m) => m.replace(/\d+$/, nom.includes('délai') ? '0' : '2000'))
  const lu = Number(mut.match(re)[1])
  const vu = lu !== bon
  if (vu) rouges++
  lignes.push(`  ${vu ? '✓' : '✗'} épingle T5 : « ${nom} » → lu ${lu} au lieu de ${bon}`)
  if (!vu) echecs.push(`épingle T5 « ${nom} » non vue`)
}

// ─── --vivant : joue chaque juge porteur et exige ses mutants rouges ──────────────────────────────────────────────
const vivants = []
if (VIVANT) {
  const aJouer = [...new Set(TESTS.flatMap((t) => t.porteurs.map((p) => p.juge)))].filter((j) => !['p6-transverse-qa.mjs'].includes(j))
  for (const j of aJouer) {
    const ts = TESTS.some((t) => t.porteurs.some((p) => p.juge === j && p.ts))
    const d0 = Date.now()
    const r = jouer(RACINE, `scripts/${j}`, ts)
    const m = r.sortie.match(/(\d+) mutants?,\s*(\d+) rouges?/)
    const ok = r.code === 0 && (!m || m[1] === m[2])
    vivants.push(`  ${ok ? '✓' : '✗'} ${j} : code ${r.code}${m ? `, ${m[2]}/${m[1]} mutants rouges` : ''} (${Math.round((Date.now() - d0) / 1000)} s)`)
    if (!ok) echecs.push(`--vivant : ${j} rend le code ${r.code}${m ? ` et ${m[2]} rouges sur ${m[1]} mutants` : ''}`)
  }
}

const nbTests = TESTS.length
if (!echecs.length) console.log(`✓ transverse § 1.7 : ${nbTests} tests obligatoires, chacun porté par un juge au lanceur qui porte son mutant ; ${M0.lanceur.suites.length} suites au lanceur, aucun juge de lot hors lanceur`)
for (const t of TESTS) console.log(`  ${t.id.padEnd(4)} ${t.titre}\n       ← ${t.porteurs.map((p) => p.juge).filter((x, i, a) => a.indexOf(x) === i).join(' + ')}`)
for (const l of lignes) console.log(l)
for (const l of vivants) console.log(l)
for (const x of echecs) console.log(`✗ ${x}`)
console.log(`p6-transverse-qa : ${rouges} mutants rouges sur ${MUTANTS_SUITE.length + 4 + 2} attendus (${Math.round((Date.now() - t0) / 1000)} s)${VIVANT ? ' — mode vivant' : ''}`)
console.log(echecs.length ? 'ÉCHEC' : 'OK')
process.exit(echecs.length ? 1 : 0)
