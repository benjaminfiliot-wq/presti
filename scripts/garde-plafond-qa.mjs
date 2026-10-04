#!/usr/bin/env node
// scripts/garde-plafond-qa.mjs — le juge hors ligne du PLAFOND DE 0 € PAR AGENT, mécanisé (écrit par Claude Code AVANT le
// correctif qu'il juge ; l'exécutant qui le lance n'y touche jamais).
//
// Règle actée : 0 € de plafond par agent (seule dépense décidée : Vercel Pro au premier site vendu). Le 30/09, Benj a décidé que
// l'écosystème agit seul : le plafond ne peut donc plus reposer sur une promesse, il doit être MÉCANISÉ. La revue du 30/09 a
// trouvé : la dépense inscrite APRÈS coup (0098), des coûts auto-déclarés à 0 (llm.ts), un plafond par défaut de 1 € (0096:58,
// et non 0010:52 — ce fichier n'a pas de plafond), des montants non bornés (scripts/chef/commun.mjs), un coupe-circuit de 150 €
// (veilleur.ts), ORB-9 qui survit au juge de mutations, des voies payantes appelables sans geste de Benj, des documents qui
// prévoient des dépenses. Ce juge les attrape TOUS, sur n'importe quelle racine.
//
//   node scripts/garde-plafond-qa.mjs [--racine=<dossier>]   GF-1 à GF-8, puis GF-9 et GF-0, une ligne par critère.
//   node scripts/garde-plafond-qa.mjs --temoin [--racine=<d>]  seulement GF-9 (non-régression) et GF-0 (les jeux d'essai) : vert
//                                                               aujourd'hui, avant tout correctif.
//   --ecrire-inventaire   (racine du dépôt seulement) écrit .orchestre/preuves/garde-plafond/inventaire.json.
// Codes : 0 tout est vert, 1 un critère est rouge, 2 un appel invalide ou un préalable manquant (racine qui n'est pas un dépôt
// Presti, Node trop ancien). Hors ligne ; écriture seulement sous .orchestre/travail/ (et l'inventaire ci-dessus, sur demande).
//
// ── Les critères ──────────────────────────────────────────────────────────────────────────────────────────────────────────
//  GF-1  scripts/chef/commun.mjs (validerPlan) refuse engage_cents et montant_cents > 0 : un agent n'engage aucun argent.
//  GF-2  un coût INCONNU (absent, non numérique, négatif, infini) est refusé, jamais assimilé à 0 : llm.ts (prise
//        deps.coutDeVoie), le SQL (ops_cout_ajouter), le point de contrôle lib/agents/depense.mjs (autoriserDepense).
//  GF-3  le contrôle précède la consommation : vérifier → appeler → inscrire (llm.ts, prise deps.verifierPlafond, refus par défaut
//        si la base est injoignable) ; en SQL, le plafond se compare AVANT l'insertion du coût.
//  GF-4  le plafond par défaut est 0 : défaut du schéma (ops.agents.plafond_euros_jour), lignes déjà semées, constantes du code.
//  GF-5  inventaire exhaustif des appels à un fournisseur du dépôt : chaque voie payante passe par le point de contrôle unique
//        lib/agents/depense.mjs (jeton de dépense de Benj, sinon refus) ou figure dans la LISTE FERMÉE justifiée ci-dessous.
//  GF-6  la quarantaine : promouvoir une proposition d'argent ou de prix sans --benj est refusé (ce que ORB-9 devrait attraper).
//  GF-7  aucun fichier versionné ne donne un budget de dépense à un agent (code, JSON, SQL, documents qui le prévoient).
//  GF-8  le coupe-circuit du veilleur ne tolère aucun euro (le seuil de 150 € est une autorisation de dépenser 150 €).
//  GF-9  (non-régression) les agents ne lisent aucune clé d'un fournisseur payant et n'importent aucun kit payant.
//  GF-0  (auto-contrôle) les jeux d'essai du juge sont cohérents et la référence en accepte le plan de base.
//
// ── Contrats précisés par ce juge (le texte de la règle ne les porte pas ; le correctif les tient) ───────────────────────
//  · lib/agents/llm.ts : DepsLecteur accepte coutDeVoie(id, detail) → nombre fini ≥ 0 (sinon l'appel est refusé AVANT tout appel)
//    et verifierPlafond(agent, coutPrevuEuros) → Promise<true> (tout autre retour, ou une exception, refuse). Par défaut, la
//    vérification interroge la base par une fonction du bus qui existe (bus.ts ET une migration) ; base injoignable : refus.
//    Aucun enregistrerCoutFn(…, 0, …) littéral : le coût inscrit est celui de la liste fermée des voies gratuites.
//  · lib/agents/depense.mjs : export autoriserDepense(demande, deps?) → { ok: boolean, motif: string }, sans exception. La demande :
//    { agent, fournisseur, cout_eur, jeton_depense? }. Gratuit prouvé (codex, freellmapi, ollama_local, laya à 0 €) : ok. Tout le
//    reste — payant, inconnu, coût > 0 — exige un jeton { emis_par: 'benj', fournisseur, montant_max_eur > 0, expire_le futur,
//    signature } dont deps.verifierSignature(jeton) rend true ; par défaut (sans vérificateur) un jeton est REFUSÉ.
//  · SQL : la dernière définition de public.ops_cout_ajouter refuse un montant nul/négatif et dépasse-plafond avant `insert into
//    ops.couts` ; une migration après 0096 pose `set default 0` sur plafond_euros_jour et remet les lignes existantes à 0.
//  Limites : le juge ne prouve pas l'authenticité cryptographique du jeton (seul Benj en détient le secret), ni l'exécution du SQL
//  (aucune base : lecture du texte), ni les fournisseurs absents de FOURNISSEURS (commun.mjs).
process.env.TZ = 'UTC'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { R, lireOptions, creerSortie, court, premiereLigne, lancer, sansCommentaires, exigerSousTravail, TRAVAIL } from './fixtures/026-pilotage/a/commun.mjs'
import {
  posix, existe, lireRel, lister, migrations, derniereFonction, sqlSansCommentaires, decouperArguments, entreParentheses,
  budgetsNonNuls, estPlafond, inventaire, FOURNISSEURS, EST_JUGE, HORS_TRAVAUX, ESTCODE,
} from './fixtures/026-garde/plafond/commun.mjs'
import {
  planDeBase, VARIANTES_GF1, COUTS_INCONNUS, PLAFONDS_REFUSES, DEMANDES, DEMANDE_SANS_VERIFICATEUR, PROPOSITIONS_ARGENT, PROPOSITIONS_ANODINES,
} from './fixtures/026-garde/plafond/corpus.mjs'

const JUGE = 'garde-plafond-qa'
const o = lireOptions(process.argv.slice(2), { connues: [] })
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
const DRAPEAUX_CONNUS = new Set(['temoin', 'ecrire-inventaire', 'racine'])
const inconnues = [...o.drapeaux].filter((d) => !DRAPEAUX_CONNUS.has(d))
if (inconnues.length || o.positionnels.length || Object.keys(o.valeurs).some((k) => k !== 'racine')) refuser(`option(s) inconnue(s) : ${[...inconnues.map((d) => `--${d}`), ...o.positionnels, ...Object.keys(o.valeurs).filter((k) => k !== 'racine').map((k) => `--${k}`)].join(' ')}`)
const RAC = o.racine
if (!fs.existsSync(RAC) || !fs.statSync(RAC).isDirectory()) refuser(`--racine : ${RAC} n'est pas un dossier`)
if (!existe(path.join(RAC, 'package.json')) || !existe(path.join(RAC, 'lib'))) refuser(`--racine : ${RAC} n'est pas un dépôt Presti (package.json ou lib/ absent)`)
if (Number(process.versions.node.split('.')[0]) < 22) refuser(`Node ${process.versions.node} : le juge lance lib/agents/llm.ts par --experimental-strip-types (Node ≥ 22 attendu)`)
if (o.drapeaux.has('ecrire-inventaire') && !o.racineParDefaut) refuser('--ecrire-inventaire : seulement sur la racine du dépôt')

const rel = (p) => posix(path.relative(R, p)) || '.'
const NOM = `${JUGE}${o.temoin ? ' --temoin' : ''}`
const IDS = o.temoin ? ['GF-9', 'GF-0'] : ['GF-1', 'GF-2', 'GF-3', 'GF-4', 'GF-5', 'GF-6', 'GF-7', 'GF-8', 'GF-9', 'GF-0']
const s = creerSortie(NOM, IDS, `${NOM} — racine ${rel(RAC)}${o.temoin ? ' — non-régression et jeux d’essai seulement' : ''}`)
const src = (r) => { const t = lireRel(RAC, r); return t === null ? null : (ESTCODE.test(r) ? sansCommentaires(t) : t) }

// ── L'enfant qui joue lib/agents/llm.ts (une seule fois : GF-2 et GF-3 lisent le même résultat) ──────────────────────────────────
let enfantLlm = null
function jouerLlm() {
  if (enfantLlm) return enfantLlm
  if (!existe(path.join(RAC, 'lib', 'agents', 'llm.ts'))) return (enfantLlm = { erreur: 'lib/agents/llm.ts absent' })
  const dossier = exigerSousTravail(path.join(TRAVAIL, JUGE))
  fs.mkdirSync(dossier, { recursive: true })
  const env = { PATH: process.env.PATH ?? '', TZ: 'UTC' }
  for (const k of ['NODE_OPTIONS', 'PIEGE_RESEAU_JOURNAL']) if (process.env[k]) env[k] = process.env[k]
  const r = lancer(process.execPath, [
    '--experimental-strip-types', '--import', pathToFileURL(path.join(R, 'scripts', 'ts-loader.mjs')).href,
    path.join(R, 'scripts', 'fixtures', '026-garde', 'plafond', 'executer-llm.mjs'),
    JSON.stringify({ couts: COUTS_INCONNUS, plafonds: PLAFONDS_REFUSES }),
  ], { cwd: RAC, env, timeout: 180_000 })
  const ligne = r.stdout.split(/\r?\n/).find((l) => l.startsWith('@@JSON@@'))
  if (!ligne) return (enfantLlm = { erreur: `l'enfant n'a rendu aucun résultat (code ${r.code}${r.erreur ? `, ${r.erreur}` : ''}) — ${court(r.stderr.split('\n').filter((l) => !/ExperimentalWarning|MODULE_TYPELESS|trace-warnings|Reparsing|eliminate this warning/.test(l)).join(' '), 260)}` })
  try { enfantLlm = { resultats: Object.fromEntries(JSON.parse(ligne.slice(8)).resultats.map((x) => [x.nom, x])) } } catch (e) { enfantLlm = { erreur: `sortie de l'enfant illisible : ${premiereLigne(e)}` } }
  return enfantLlm
}

// ── Le point de contrôle lib/agents/depense.mjs ─────────────────────────────────────────────────────────────────────────────
async function importerDepense() {
  const f = path.join(RAC, 'lib', 'agents', 'depense.mjs')
  if (!existe(f)) return { erreur: 'lib/agents/depense.mjs absent : aucun point de contrôle unique de la dépense' }
  try {
    const m = await import(`${pathToFileURL(f).href}?garde=${Date.now()}`)
    if (typeof m.autoriserDepense !== 'function') return { erreur: 'lib/agents/depense.mjs n’exporte pas autoriserDepense' }
    return { m }
  } catch (e) { return { erreur: `lib/agents/depense.mjs : import impossible (${premiereLigne(e)})` } }
}
const MAINTENANT = Date.parse('2026-09-30T10:00:00Z')
function decision(m, demande, deps) {
  try {
    const r = m.autoriserDepense(demande, deps)
    if (!r || typeof r !== 'object' || typeof r.ok !== 'boolean' || typeof r.motif !== 'string') return { forme: `rend ${court(JSON.stringify(r) ?? 'undefined', 60)}, { ok: boolean, motif: string } attendu` }
    return { ok: r.ok }
  } catch (e) { return { forme: `lève une exception (${premiereLigne(e)}) : un refus se rend, il ne se lève pas` } }
}

// ── GF-1 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function gf1() {
  const rc = 'scripts/chef/commun.mjs'
  if (!existe(path.join(RAC, rc))) return { echecs: [`${rc} absent`] }
  let m
  try { m = await import(`${pathToFileURL(path.join(RAC, rc)).href}?garde=${Date.now()}`) } catch (e) { return { echecs: [`${rc} : import impossible (${premiereLigne(e)})`] } }
  if (typeof m.validerPlan !== 'function') return { echecs: [`${rc} n’exporte pas validerPlan`] }
  const maintenant = new Date('2026-09-30T10:00:00Z')
  const base = m.validerPlan(planDeBase(maintenant), 'plein', maintenant)
  if (base.length) return { echecs: [`le plan de base, sans aucun argent, est refusé lui-même : ${court(base.join(' | '), 200)} (le jeu d’essai n’est plus applicable)`] }
  const e = []
  for (const v of VARIANTES_GF1) {
    const p = planDeBase(maintenant)
    v.modifier(p)
    const fautes = m.validerPlan(p, 'plein', maintenant)
    if (!fautes.some((x) => x.includes(v.mot))) e.push(`${v.nom} : validerPlan l’accepte (${fautes.length ? `fautes sans « ${v.mot} » : ${court(fautes.join(' | '), 90)}` : 'aucune faute'})`)
  }
  return { echecs: e, detail: `le plan sans argent passe ; ${VARIANTES_GF1.length} variantes avec engage_cents ou montant_cents > 0 refusées (${VARIANTES_GF1.map((v) => v.nom).join(', ')})` }
}

// ── GF-2 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const COUT_ZERO_LITTERAL = /enregistrerCoutFn\(\s*[^,()]+,\s*0\s*,/
async function gf2() {
  const e = []
  const llm = src('lib/agents/llm.ts')
  const j = jouerLlm()
  if (llm === null) e.push('lib/agents/llm.ts absent')
  else {
    const lit = llm.match(new RegExp(COUT_ZERO_LITTERAL, 'g'))
    if (lit) e.push(`llm.ts inscrit ${lit.length} coût(s) par un 0 littéral (enregistrerCoutFn(…, 0, …)) : un coût déclaré 0 par l’agent ne prouve pas la gratuité`)
    const gratuitFaux = /\b(?:anthropic|openai|firecrawl|perplexity|elevenlabs|gemini|groq)\w*['"]?\s*:\s*0\b/i.exec(llm)
    if (gratuitFaux) e.push(`llm.ts déclare un fournisseur payant à 0 € (« ${gratuitFaux[0]} ») : la liste fermée des voies gratuites ne contient que l’abonnement et le local`)
    const reel = /async function enregistrerCoutReel\s*\([^)]*\)[^{]*\{([\s\S]*?)\n\}/.exec(llm)
    if (!reel) e.push('llm.ts : enregistrerCoutReel introuvable')
    else if (!/Number\.isFinite\(/.test(reel[1])) e.push('llm.ts : enregistrerCoutReel n’écarte pas un montant non numérique (Number.isFinite absent) avant d’inscrire')
  }
  if (j.erreur) e.push(`llm.ts non joué : ${j.erreur}`)
  else {
    for (const c of COUTS_INCONNUS) {
      const r = j.resultats[`cout-inconnu:${c.nom}`]
      if (!r) { e.push(`scénario cout-inconnu:${c.nom} sans résultat`); continue }
      if (r.ok || r.journal.includes('appel')) e.push(`coût ${c.nom} : l’appel a eu lieu (prise deps.coutDeVoie ignorée, ou coût assimilé à 0)`)
      else if (r.couts.length) e.push(`coût ${c.nom} : un coût a quand même été inscrit (${JSON.stringify(r.couts)})`)
    }
    const z = j.resultats['cout-zero'], d = j.resultats['cout-par-defaut']
    if (!z?.ok || z.couts.length !== 1 || z.couts[0] !== 0) e.push(`coût 0 déclaré par la prise : l’appel doit passer et inscrire le nombre 0 (ok ${z?.ok}, inscrit ${JSON.stringify(z?.couts)}, ${z?.erreur ?? ''})`)
    if (!d?.ok || d.couts.length !== 1 || d.couts[0] !== 0) e.push(`sans prise coutDeVoie, la voie gratuite de la liste fermée inscrit le nombre 0 (ok ${d?.ok}, inscrit ${JSON.stringify(d?.couts)}, ${d?.erreur ?? ''})`)
  }
  const sql = derniereFonction(RAC, 'ops_cout_ajouter')
  if (!sql) e.push('SQL : aucune définition de public.ops_cout_ajouter')
  else {
    const i = sql.corps.search(/insert\s+into\s+ops\.couts/i)
    const avant = i < 0 ? sql.corps : sql.corps.slice(0, i)
    if (i < 0) e.push(`SQL (${sql.rel}) : ops_cout_ajouter n’insère plus dans ops.couts`)
    if (!/p_montant_eur\s+is\s+null/i.test(avant)) e.push(`SQL (${sql.rel}) : un montant NULL n’est pas refusé avant l’insertion`)
    if (!/p_montant_eur\s*<\s*0/.test(avant)) e.push(`SQL (${sql.rel}) : un montant négatif n’est pas refusé avant l’insertion`)
    if (!/raise\s+exception/i.test(avant)) e.push(`SQL (${sql.rel}) : aucun refus (raise exception) avant l’insertion`)
  }
  const dep = await importerDepense()
  if (dep.erreur) e.push(dep.erreur)
  else {
    for (const nom of ['cout-absent', 'cout-chaine', 'cout-nan', 'cout-negatif', 'payant-zero-sans-jeton', 'jeton-cout-chaine', 'jeton-cout-nan']) {
      const c = DEMANDES.find((x) => x.nom === nom)
      const r = decision(dep.m, c.demande, { verifierSignature: () => true, maintenant: () => MAINTENANT })
      if (r.forme) e.push(`autoriserDepense « ${nom} » : ${r.forme}`)
      else if (r.ok) e.push(`autoriserDepense « ${nom} » : accordée (un coût inconnu ou une voie payante à 0 déclaré n’est pas une gratuité prouvée)`)
    }
  }
  return { echecs: e, detail: `${COUTS_INCONNUS.length} coûts inconnus refusés avant tout appel (llm.ts), coût 0 inscrit en nombre, SQL refuse NULL et négatif avant l’insertion, autoriserDepense refuse les coûts absents, chaînes, NaN et négatifs, même munis d’un jeton valable` }
}

// ── GF-3 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const VERIF = /\b(?:plafondAutorise|verifierPlafondFn|verifierPlafondReel)\s*\(|\bdeps\.verifierPlafond\s*\(/
const MARQUES = { creerLecteur: /(?<!function\s)\bessayerUneVoie\s*\(/, demanderConseil: /\bappelerHttpCompatibleOpenAI\s*\(/, appelerJev: /\blancer\s*\(\s*process\.execPath/ }
function fonctionsTop(texte) {
  const marques = [...texte.matchAll(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)/gm)].map((m) => ({ nom: m[1], i: m.index }))
  return marques.map((m, k) => ({ nom: m.nom, corps: texte.slice(m.i, marques[k + 1]?.i ?? texte.length) }))
}
async function gf3() {
  const e = []
  const llm = src('lib/agents/llm.ts')
  const j = jouerLlm()
  if (llm === null) e.push('lib/agents/llm.ts absent')
  else {
    const fonctions = fonctionsTop(llm)
    for (const [nom, marque] of Object.entries(MARQUES)) {
      const f = fonctions.find((x) => x.nom === nom)
      if (!f) { e.push(`llm.ts : ${nom} introuvable`); continue }
      const appel = f.corps.search(marque)
      if (appel < 0) { e.push(`llm.ts : ${nom} n’a plus de point d’appel reconnaissable (${marque})`); continue }
      const v = f.corps.search(VERIF)
      if (v < 0 || v > appel) e.push(`llm.ts : ${nom} appelle le fournisseur sans contrôle du plafond avant (vérifier → appeler → inscrire)`)
    }
    const creer = fonctions.find((x) => x.nom === 'creerLecteur')
    const defaut = creer && /(\w+)\s*=\s*deps\.verifierPlafond\s*\?\?\s*(\w+)/.exec(creer.corps)
    if (!defaut) e.push('llm.ts : le contrôle par défaut (deps.verifierPlafond ?? <fonction>) est absent de creerLecteur')
    else {
      const f = fonctions.find((x) => x.nom === defaut[2])
      const base = f && /\b(ops_\w+)\s*\(/.exec(f.corps)
      if (!f) e.push(`llm.ts : le contrôle par défaut ${defaut[2]} n’est pas une fonction de premier niveau`)
      else if (!base) e.push(`llm.ts : ${defaut[2]} n’interroge aucune fonction de la base (ops_…) : un contrôle sans donnée n’en est pas un`)
      else {
        if (!/return\s+false/.test(f.corps) || !/===\s*true/.test(f.corps)) e.push(`llm.ts : ${defaut[2]} n’est pas fail-closed (return false en panne, === true en succès)`)
        const bus = src('lib/agents/bus.ts') ?? ''
        if (!new RegExp(`export\\s+const\\s+${base[1]}\\b`).test(bus)) e.push(`bus.ts n’exporte pas ${base[1]}, appelée par ${defaut[2]}`)
        if (!derniereFonction(RAC, base[1])) e.push(`aucune migration ne définit public.${base[1]}, appelée par ${defaut[2]}`)
      }
    }
  }
  if (j.erreur) e.push(`llm.ts non joué : ${j.erreur}`)
  else {
    for (const p of PLAFONDS_REFUSES) {
      const r = j.resultats[`plafond-refuse:${p.nom}`]
      if (!r) { e.push(`scénario plafond-refuse:${p.nom} sans résultat`); continue }
      if (r.ok || r.journal.includes('appel') || r.journal.includes('inscrire')) e.push(`plafond « ${p.nom} » : l’appel ou l’inscription a eu lieu (${r.journal.join('→')}) — un plafond non prouvé respecté doit refuser AVANT`)
    }
    const ordre = j.resultats['ordre-et-arguments']
    const seq = (ordre?.journal ?? []).filter((x) => x !== 'cout')
    if (!ordre?.ok || seq.join('>') !== 'verifier>appel>inscrire') e.push(`ordre des événements « ${(ordre?.journal ?? []).join('→') || 'aucun'} », verifier→appel→inscrire attendu (inscrire après coup n’est pas un contrôle)`)
    else if (ordre.recus.agent !== 'douleurs' || typeof ordre.recus.cout !== 'number' || !Number.isFinite(ordre.recus.cout)) e.push(`verifierPlafond reçoit (${JSON.stringify(ordre.recus.agent)}, ${JSON.stringify(ordre.recus.cout)}), l’agent et un coût prévu numérique attendus`)
    const sb = j.resultats['defaut-sans-base']
    if (!sb || sb.ok || sb.journal.includes('appel')) e.push(`le contrôle par défaut laisse passer quand la base est injoignable (${sb?.journal?.join('→') ?? 'aucun résultat'}) : il doit refuser`)
  }
  const sql = derniereFonction(RAC, 'ops_cout_ajouter')
  if (!sql) e.push('SQL : aucune définition de public.ops_cout_ajouter')
  else {
    const i = sql.corps.search(/insert\s+into\s+ops\.couts/i)
    const avant = i < 0 ? '' : sql.corps.slice(0, i)
    const cond = /\bif\s+([^;]*?)\s+then\s+raise\s+exception[^;]*plafond/i.exec(avant)
    if (!cond || !/p_montant_eur/.test(cond[1]) || !/plafond_euros_jour/.test(cond[1])) e.push(`SQL (${sql.rel}) : le plafond (plafond_euros_jour + p_montant_eur) n’est pas comparé AVANT l’insertion du coût : la dépense s’inscrit avant d’être contrôlée`)
  }
  return { echecs: e, detail: 'vérifier → appeler → inscrire joué sur llm.ts, six retours de plafond refusés avant l’appel, refus par défaut base injoignable, contrôle présent avant chaque appel (creerLecteur, demanderConseil, appelerJev), SQL compare avant d’insérer' }
}

// ── GF-4 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function gf4() {
  const e = []
  const ms = migrations(RAC)
  let effectif = null, ou = null
  for (const m of ms) {
    const re = /plafond_euros_jour\s+numeric(?:\s*\(\s*\d+\s*,\s*\d+\s*\))?\s+not\s+null\s+default\s+(\d+(?:\.\d+)?)|alter\s+table\s+ops\.agents\s+alter\s+column\s+plafond_euros_jour\s+set\s+default\s+(\d+(?:\.\d+)?)/gi
    let x
    while ((x = re.exec(m.texte))) { effectif = Number(x[1] ?? x[2]); ou = m.rel }
  }
  if (effectif === null) e.push('SQL : aucune déclaration du défaut de ops.agents.plafond_euros_jour')
  else if (effectif !== 0) e.push(`SQL : le plafond par défaut d’un agent est ${effectif} € (dernière déclaration : ${ou}), 0 attendu — tout agent semé sans plafond explicite reçoit cette dépense`)
  const semeSansPlafond = ms.filter((m) => { const re = /insert\s+into\s+ops\.agents\s*\(([^)]*)\)/gi; let x; while ((x = re.exec(m.texte))) if (!/plafond_euros_jour/.test(x[1])) return true; return false })
  const remise = ms.find((m) => /update\s+ops\.agents\s+set\s+plafond_euros_jour\s*=\s*0\b/i.test(m.texte))
  if (semeSansPlafond.length && !remise) e.push(`SQL : ${semeSansPlafond.map((m) => path.basename(m.rel)).join(', ')} sème des agents sans plafond explicite (ils portent l’ancien défaut) et aucune migration ne remet plafond_euros_jour à 0 sur les lignes existantes`)
  const tenus = []
  for (const r of lister(RAC, ['lib', 'app', 'scripts'], (x) => !x.endsWith('/') && (!ESTCODE.test(x) || EST_JUGE(x) || HORS_TRAVAUX(x)))) {
    for (const h of budgetsNonNuls(lireRel(RAC, r) ?? '')) if (estPlafond(h.ident) && !h.ident.startsWith('p_')) tenus.push(`${r}:${h.ligne} ${h.ident} ${h.op} ${h.valeur}`)
  }
  for (const t of tenus.slice(0, 5)) e.push(`code : plafond d’argent non nul par défaut — ${t}`)
  return { echecs: e, detail: `défaut du schéma ${effectif} (${ou}), ${semeSansPlafond.length} migration(s) qui sèment sans plafond ${remise ? `remises à 0 par ${path.basename(remise.rel)}` : 'sans objet'}, aucune constante de plafond d’argent non nulle dans lib/, app/, scripts/` }
}

// ── GF-5 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const PAYANTS = new Set(['anthropic', 'openai', 'firecrawl', 'perplexity', 'elevenlabs', 'gemini', 'groq'])
const LIBRES = {
  publora: 'formule Starter gratuite (docs/marketing/README.md, règle « Outils gratuits seulement »), quota mensuel borné par le code',
  resend: 'envoi transactionnel du produit, palier gratuit, sans génération',
  stripe: 'recette : l’argent entre, aucune dépense par appel',
  meta: 'API Graph de lecture et de publication, gratuite',
  telegram: 'Bot API, gratuite',
}
/** La LISTE FERMÉE : les seuls appels payants dispensés du point de contrôle, chacun avec sa raison. Toute autre voie le passe. */
const EXEMPTIONS = [
  { fichier: 'lib/ai.ts', fournisseur: 'anthropic', motif: 'IA du produit vendu à l’artisan : coût borné par les crédits et les quotas de chaque artisan (lib/plans.ts), aucun agent ne l’appelle (vérifié ci-dessous)' },
  { fichier: 'lib/ai/outils.ts', fournisseur: 'anthropic', motif: 'outils de l’IA du produit, mêmes bornes par artisan' },
  { fichier: 'lib/recherche-fournisseurs.ts', fournisseur: 'anthropic', motif: 'recherche de prix de l’inventaire du produit, plafonds durs par recherche et par artisan' },
  { fichier: 'lib/alertes.ts', fournisseur: 'anthropic', motif: 'lecture du rapport de coûts de l’organisation (cost_report), aucune génération' },
  { fichier: 'scripts/cle-produit.mjs', fournisseur: 'anthropic', motif: 'geste manuel de Benj à son terminal : administration de la clé du produit (une sonde d’un jeton)' },
  { fichier: 'scripts/ma-probe.mjs', fournisseur: 'anthropic', motif: 'geste manuel de Benj : sonde de l’administration des clés' },
  { fichier: 'scripts/ranger-env.mjs', fournisseur: 'anthropic', motif: 'geste manuel de Benj : rangement d’une clé dans .env.local' },
]
const DOSSIERS_AGENTS = ['lib/agents/', 'app/api/agents/', 'scripts/agents/', 'scripts/chef/', 'scripts/savoir/']
const IMPORT_IA_PRODUIT = /['"](?:@\/lib\/ai|@\/lib\/ai\/outils|[^'"]*\/recherche-fournisseurs|@anthropic-ai\/sdk)['"]/
const IMPORT_DEPENSE = /from\s+['"][^'"]*\/depense(?:\.mjs)?['"]|import\(\s*['"][^'"]*\/depense(?:\.mjs)?['"]/
const FETCH = /\bfetch\s*\(/g
async function gf5() {
  const e = [], vus = []
  const inv = inventaire(RAC)
  const payants = inv.filter((x) => PAYANTS.has(x.fournisseur))
  const libres = inv.filter((x) => !PAYANTS.has(x.fournisseur))
  for (const x of payants) {
    const ex = EXEMPTIONS.find((y) => y.fichier === x.fichier && y.fournisseur === x.fournisseur)
    if (ex) { vus.push(`${x.fournisseur} ${x.fichier} (liste fermée)`); continue }
    const texte = src(x.fichier) ?? ''
    const defauts = []
    if (!IMPORT_DEPENSE.test(texte)) defauts.push('n’importe pas lib/agents/depense')
    // Le verdict est demandé POUR CE FOURNISSEUR (fournisseur: '<id>…'), puis lu (.ok) juste après : un appel sans lecture ne garde rien.
    const porte = new RegExp(`autoriserDepense\\s*\\(\\s*\\{[^}]*fournisseur\\s*:\\s*['"\`]${x.fournisseur}`, 'g')
    const appels = [...texte.matchAll(porte)]
    if (!appels.length) defauts.push(`n’appelle jamais autoriserDepense pour ${x.fournisseur}`)
    for (const a of appels) {
      const debutLigne = texte.lastIndexOf('\n', a.index) + 1
      const avant = texte.slice(debutLigne, a.index)
      const ligne = texte.slice(0, a.index).split('\n').length
      if (!/(?:=|\(|!|return)\s*(?:await\s+)?$/.test(avant) && !/\b(?:if|while)\b[^\n]*$/.test(avant)) defauts.push(`un appel d’autoriserDepense dont le verdict n’est pas pris (ligne ${ligne})`)
      else if (!/\b\w+\.ok\b/.test(texte.slice(a.index, a.index + 520))) defauts.push(`un appel d’autoriserDepense dont le verdict (.ok) n’est jamais lu (ligne ${ligne})`)
    }
    const hote = FOURNISSEURS.find((f) => f.id === x.fournisseur).re
    const ids = [...texte.matchAll(/(\w+)\s*=\s*(['"`])[^'"`\n]*?/g)].filter((m) => hote.test(texte.slice(m.index, m.index + 200).split('\n')[0])).map((m) => m[1])
    let nonGardes = 0
    for (const f of texte.matchAll(FETCH)) {
      const arg = texte.slice(f.index, f.index + 260)
      if (!hote.test(arg) && !ids.some((id) => arg.includes(id))) continue
      if (!new RegExp(porte.source).test(texte.slice(Math.max(0, f.index - 1400), f.index))) nonGardes++
    }
    if (nonGardes) defauts.push(`${nonGardes} fetch vers ${x.fournisseur} sans autoriserDepense pour lui dans les 1400 signes qui le précèdent`)
    if (defauts.length) e.push(`${x.fournisseur} — ${x.fichier} : payant, hors liste fermée, ${defauts.join(' ; ')}`)
    else vus.push(`${x.fournisseur} ${x.fichier} (point de contrôle)`)
  }
  for (const f of DOSSIERS_AGENTS) {
    for (const r of lister(RAC, [f.replace(/\/$/, '')], (x) => !x.endsWith('/') && (!ESTCODE.test(x) || EST_JUGE(x)))) {
      if (IMPORT_IA_PRODUIT.test(src(r) ?? '')) e.push(`${r} importe l’IA payante du produit : une voie payante appelable par un agent hors point de contrôle`)
    }
  }
  const dep = await importerDepense()
  if (dep.erreur) e.push(dep.erreur)
  else {
    for (const c of DEMANDES) {
      const r = decision(dep.m, c.demande, { verifierSignature: () => true, maintenant: () => MAINTENANT })
      if (r.forme) e.push(`autoriserDepense « ${c.nom} » : ${r.forme}`)
      else if (r.ok !== c.ok) e.push(`autoriserDepense « ${c.nom} » : ${r.ok ? 'accordée' : 'refusée'}, ${c.ok ? 'accordée' : 'refusée'} attendu`)
    }
    const sans = decision(dep.m, DEMANDE_SANS_VERIFICATEUR, { maintenant: () => MAINTENANT })
    if (sans.forme) e.push(`autoriserDepense sans vérificateur : ${sans.forme}`)
    else if (sans.ok) e.push('autoriserDepense accorde un jeton dont la signature n’est vérifiée par personne (sans deps.verifierSignature, un jeton doit être refusé)')
    for (const garbage of [undefined, null, 42, 'x', []]) { const r = decision(dep.m, garbage, {}); if (r.forme) { e.push(`autoriserDepense(${JSON.stringify(garbage) ?? 'undefined'}) : ${r.forme}`); break } else if (r.ok) { e.push(`autoriserDepense(${JSON.stringify(garbage) ?? 'undefined'}) accorde une demande sans forme`); break } }
  }
  if (o.drapeaux.has('ecrire-inventaire')) {
    const d = path.join(R, '.orchestre', 'preuves', 'garde-plafond')
    fs.mkdirSync(d, { recursive: true })
    fs.writeFileSync(path.join(d, 'inventaire.json'), `${JSON.stringify({ racine: rel(RAC), payants: payants.map((x) => ({ fournisseur: x.fournisseur, fichier: x.fichier, statut: EXEMPTIONS.some((y) => y.fichier === x.fichier && y.fournisseur === x.fournisseur) ? 'liste fermée' : 'point de contrôle' })), libres: libres.map((x) => ({ fournisseur: x.fournisseur, fichier: x.fichier, motif: LIBRES[x.fournisseur] ?? '?' })), exemptions: EXEMPTIONS }, null, 2)}\n`)
  }
  return { echecs: e, detail: `${inv.length} appels inventoriés : ${payants.length} payants (${vus.length} en règle : ${court(vus.join(', '), 160)}), ${libres.length} libres (${[...new Set(libres.map((x) => x.fournisseur))].join(', ')}) ; autoriserDepense joué sur ${DEMANDES.length} demandes` }
}

// ── GF-6 : la quarantaine de scripts/orchestre.mjs, jouée dans un bac à sable ─────────────────────────────────────────────────
function gf6() {
  const e = []
  const f = path.join(RAC, 'scripts', 'orchestre.mjs'), p = path.join(RAC, 'scripts', 'lib', 'preuves.mjs')
  if (!existe(f) || !existe(p)) return { echecs: ['scripts/orchestre.mjs ou scripts/lib/preuves.mjs absent'] }
  const bac = exigerSousTravail(path.join(TRAVAIL, JUGE, 'quarantaine'))
  fs.rmSync(bac, { recursive: true, force: true })
  fs.mkdirSync(path.join(bac, 'scripts', 'lib'), { recursive: true })
  fs.mkdirSync(path.join(bac, '.orchestre'), { recursive: true })
  fs.copyFileSync(f, path.join(bac, 'scripts', 'orchestre.mjs'))
  fs.copyFileSync(p, path.join(bac, 'scripts', 'lib', 'preuves.mjs'))
  const env = { PATH: process.env.PATH ?? '', TZ: 'UTC' }
  for (const k of ['NODE_OPTIONS', 'PIEGE_RESEAU_JOURNAL']) if (process.env[k]) env[k] = process.env[k]
  const decisions = path.join(bac, '.orchestre', 'decisions.md')
  const jouer = (phrase, args = []) => {
    const texte = `# Décisions\n\n## Proposées (quarantaine)\n\n- ${phrase}\n\n## Décisions ajoutées par les agents\n\n`
    fs.writeFileSync(decisions, texte)
    const r = lancer(process.execPath, ['scripts/orchestre.mjs', 'promouvoir', '1', ...args], { cwd: bac, env, timeout: 60_000 })
    const apres = fs.readFileSync(decisions, 'utf8')
    return { code: r.code, sortie: r.sortie, restee: apres.slice(0, apres.indexOf('## Décisions ajoutées')).includes(phrase), promue: apres.slice(apres.indexOf('## Décisions ajoutées')).includes(phrase.slice(0, 30)) }
  }
  for (const phrase of PROPOSITIONS_ARGENT) {
    const r = jouer(phrase)
    if (r.code !== 3 || !r.restee) e.push(`« ${court(phrase, 50)} » : promue sans --benj (code ${r.code}${r.restee ? '' : ', sortie de la quarantaine'}), code 3 et quarantaine intacte attendus`)
  }
  for (const phrase of PROPOSITIONS_ANODINES) {
    const r = jouer(phrase)
    if (r.code !== 0 || !r.promue) e.push(`« ${court(phrase, 50)} » : refusée (code ${r.code}) alors qu’elle ne touche ni l’argent ni la marque — « tout refuser » n’est pas une garde`)
  }
  const avecBenj = jouer(PROPOSITIONS_ARGENT[0], ['--benj'])
  if (avecBenj.code !== 0 || !avecBenj.promue) e.push(`--benj ne lève pas le refus (code ${avecBenj.code}) : Benj doit pouvoir promouvoir l’argent`)
  return { echecs: e, detail: `${PROPOSITIONS_ARGENT.length} propositions d’argent refusées sans --benj (code 3, quarantaine intacte), ${PROPOSITIONS_ANODINES.length} anodines promues, --benj lève le refus` }
}

// ── GF-7 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const MONTANT = /(\d[\d\s.,]*)\s*(\$|€|euros?\b|dollars?\b|USD)/i
const CLE_AGENTS = /cl[ée]\s*(?:Anthropic\s*)?[«"“]\s*agents\s*[»"”]|\bR16\b/i
const PUB_PAYANTE = /(?:\bR15\b|pub(?:licit[ée])?s?\s+(?:payante|Meta))[^\n]*(?:€\s*\/\s*jour|par jour)/i
const NEUTRE = /annul|abandonn|retir|~~|aucun achat|refus|supprim|ne rien cr|\b0\s?(?:€|euro)|jamais|interdit|exclu|hors périmètre|sans achat|pas d'achat|gratuit/i
function gf7() {
  const e = []
  const codes = lister(RAC, ['app', 'lib', 'components', 'scripts', 'supabase', '.github', 'vercel.json', 'proxy.ts'], (x) => !x.endsWith('/') && (!/\.(?:ts|tsx|mjs|js|cjs|json|yml|yaml|sql)$/.test(x) || /_A_COLLER_/.test(x) || EST_JUGE(x) || HORS_TRAVAUX(x)))
  for (const r of codes) {
    const texte = lireRel(RAC, r) ?? ''
    if (r.endsWith('.sql')) {
      const sql = sqlSansCommentaires(texte)
      const re = /ops_agent_enregistrer\s*\(/gi
      let m
      while ((m = re.exec(sql))) { const a = decouperArguments(entreParentheses(sql, m.index + m[0].length - 1) ?? ''); if (a.length === 9 && Number(a[8]) > 0) e.push(`${r} : ops_agent_enregistrer donne ${a[8]} € par jour à l’agent ${a[0]}`) }
      const ins = /insert\s+into\s+ops\.agents\s*\(([^)]*)\)\s*values\s*\(/gi
      while ((m = ins.exec(sql))) {
        const cols = m[1].split(',').map((x) => x.trim()), i = cols.indexOf('plafond_euros_jour')
        const vals = decouperArguments(entreParentheses(sql, m.index + m[0].length - 1) ?? '')
        if (i >= 0 && Number(vals[i]) > 0) e.push(`${r} : un agent semé avec plafond_euros_jour = ${vals[i]}`)
      }
      const up = /update\s+ops\.agents\s+set\s+plafond_euros_jour\s*=\s*(\d+(?:\.\d+)?)/gi
      while ((m = up.exec(sql))) if (Number(m[1]) > 0) e.push(`${r} : update ops.agents … plafond_euros_jour = ${m[1]}`)
    } else if (/\.(?:ts|tsx|mjs|js|cjs|json)$/.test(r)) {
      for (const h of budgetsNonNuls(texte)) if (!(estPlafond(h.ident) && !h.ident.startsWith('p_'))) e.push(`${r}:${h.ligne} ${h.ident} ${h.op} ${h.valeur} : un budget de dépense donné à un agent`)
      for (const m of texte.matchAll(/--max-budget-usd[=\s]+([1-9]\d*(?:\.\d+)?)/g)) e.push(`${r} : --max-budget-usd ${m[1]}`)
    }
  }
  const docs = lister(RAC, ['docs', 'plans', 'reprise-cloud', '.orchestre', 'README.md', 'AGENTS.md', 'CLAUDE.md'], (x) => !x.endsWith('/') ? !x.endsWith('.md') || HORS_TRAVAUX(x) : /^\.orchestre\/(?:travail|preuves|scratch)\/$/.test(x))
  for (const r of docs) {
    (lireRel(RAC, r) ?? '').split('\n').forEach((l, i) => { if (MONTANT.test(l) && (CLE_AGENTS.test(l) || PUB_PAYANTE.test(l)) && !NEUTRE.test(l)) e.push(`${r}:${i + 1} ${court(l, 100)} : une dépense prévue, ni annulée ni refusée sur la ligne`) })
  }
  return { echecs: e, detail: `${codes.length} fichiers de code, de configuration et de SQL et ${docs.length} documents lus : aucun budget de dépense donné à un agent, aucune dépense prévue sans mention d’annulation` }
}

// ── GF-8 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function gf8() {
  const v = src('lib/agents/veilleur.ts')
  if (v === null) return { echecs: ['lib/agents/veilleur.ts absent'] }
  const e = []
  const m = /\bcouts\s*(>=?)\s*(\d+(?:[.,]\d+)?)/.exec(v)
  if (!m) e.push('veilleur.ts : le coupe-circuit (couts > seuil) est introuvable')
  else if (!(m[1] === '>' && Number(m[2]) === 0) && !(m[1] === '>=' && Number(m[2]) > 0 && Number(m[2]) <= 0.01)) e.push(`veilleur.ts : le coupe-circuit se déclenche à « couts ${m[1]} ${m[2]} » — tout euro dépensé est une faute quand le plafond est 0 € (« couts > 0 » attendu)`)
  const l = /\b150\b/.exec(v)
  if (l) e.push(`veilleur.ts : le nombre 150 figure encore dans le code (ligne ${v.slice(0, l.index).split('\n').length}) : un seuil ou un message de 150 € autorise 150 € de dépense`)
  return { echecs: e, detail: 'le coupe-circuit du veilleur se déclenche dès le premier euro de coût du mois, sans seuil de 150 €' }
}

// ── GF-9 : non-régression ──────────────────────────────────────────────────────────────────────────────────────────────────
const CLES_PAYANTES = /\b(?:process\.env|env)\s*(?:\.|\[\s*['"])(?:ANTHROPIC|OPENAI|FIRECRAWL|PERPLEXITY|ELEVENLABS|GEMINI|GOOGLE_API|GROQ)\w*/
function gf9() {
  const e = []
  const fichiers = lister(RAC, ['lib/agents', 'app/api/agents', 'scripts/chef'], (x) => !x.endsWith('/') && (!ESTCODE.test(x)))
  for (const r of fichiers) {
    const t = src(r) ?? ''
    if (CLES_PAYANTES.test(t)) e.push(`${r} lit la clé d’un fournisseur payant`)
    if (/['"](?:@anthropic-ai\/sdk|openai)['"]/.test(t)) e.push(`${r} importe le kit d’un fournisseur payant`)
  }
  for (const r of ['lib/agents/llm.ts', 'lib/agents/moteurs.ts']) if (!existe(path.join(RAC, r))) e.push(`${r} absent`)
  return { echecs: e, detail: `${fichiers.length} fichiers des agents (lib/agents, app/api/agents, scripts/chef) : aucune clé de fournisseur payant lue, aucun kit payant importé` }
}

// ── GF-0 : les jeux d'essai ─────────────────────────────────────────────────────────────────────────────────────────────────
async function gf0() {
  const e = []
  if (PROPOSITIONS_ARGENT.length < 10 || PROPOSITIONS_ANODINES.length < 3) e.push('corpus de la quarantaine trop court')
  if (new Set([...PROPOSITIONS_ARGENT, ...PROPOSITIONS_ANODINES]).size !== PROPOSITIONS_ARGENT.length + PROPOSITIONS_ANODINES.length) e.push('corpus de la quarantaine : doublon')
  if (new Set(DEMANDES.map((d) => d.nom)).size !== DEMANDES.length || DEMANDES.length < 15) e.push('demandes de dépense : noms en double ou moins de 15')
  if (!DEMANDES.some((d) => d.ok) || !DEMANDES.some((d) => !d.ok)) e.push('demandes de dépense : il faut des accordées ET des refusées')
  if (COUTS_INCONNUS.length < 6 || PLAFONDS_REFUSES.length < 5) e.push('coûts inconnus ou plafonds refusés : effectifs trop courts')
  if (VARIANTES_GF1.length < 4) e.push('variantes de GF-1 : moins de 4')
  const rc = path.join(RAC, 'scripts', 'chef', 'commun.mjs')
  if (existe(rc)) {
    try {
      const m = await import(`${pathToFileURL(rc).href}?gf0=${Date.now()}`)
      const maintenant = new Date('2026-09-30T10:00:00Z')
      const fautes = m.validerPlan(planDeBase(maintenant), 'plein', maintenant)
      if (fautes.length) e.push(`le plan de base est refusé par ${rel(rc)} : ${court(fautes.join(' | '), 160)}`)
    } catch (x) { e.push(`${rel(rc)} : import impossible (${premiereLigne(x)})`) }
  } else e.push('scripts/chef/commun.mjs absent')
  return { echecs: e, detail: `${PROPOSITIONS_ARGENT.length}+${PROPOSITIONS_ANODINES.length} propositions, ${DEMANDES.length} demandes de dépense, ${COUTS_INCONNUS.length} coûts inconnus, ${PLAFONDS_REFUSES.length} plafonds refusés, plan de base accepté par la racine` }
}

const CRITERES = { 'GF-1': gf1, 'GF-2': gf2, 'GF-3': gf3, 'GF-4': gf4, 'GF-5': gf5, 'GF-6': gf6, 'GF-7': gf7, 'GF-8': gf8, 'GF-9': gf9, 'GF-0': gf0 }
for (const id of IDS) await s.critere(id, CRITERES[id])
process.exit(s.finir())
