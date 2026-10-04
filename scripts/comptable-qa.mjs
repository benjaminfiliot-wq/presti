#!/usr/bin/env node
// scripts/comptable-qa.mjs — le juge du Comptable (fiche 026-242, cahier CPT-1 à CPT-8), écrit AVANT le module qu'il juge
// (026-243) : un juge n'est jamais écrit par l'exécutant qui l'utilise.
//
//   node scripts/comptable-qa.mjs [--partie=rapprochement,seuil,montants,libelle,mentions] [--racine=<d>] [--reel] [--temoin]
//   node scripts/comptable-qa.mjs --preuve-echecs      (la commande `verifier` de la fiche)
//
//   --racine=<d>  la racine jugée (le dépôt par défaut ; une copie d'essai pour les sabotages) ; --reel = le dépôt, explicitement
//   --temoin      juge le témoin (scripts/fixtures/026/comptable/temoin/), implémentation de RÉFÉRENCE jamais déployée : auto-contrôle
//   --preuve-echecs  (a) l'arbre courant : s'il n'a pas de module, doit sortir ≠ 0 avec CPT-2 en premier échec ; (b) le témoin passe
//                    les 8 critères ; (c) chaque sabotage de fixtures/…/sabotages.json (≥ 8) échoue avec SON critère nommé ;
//                    écrit .orchestre/preuves/026-242/echecs-attendus.md
//
// Sortie : une ligne par critère « ✅ PASS CPT-n — détail » / « ❌ FAIL CPT-n — détail » / « ⏭ NON JUGÉ CPT-n — raison », puis
// « comptable-qa : PASS|FAIL — ids ». Code 0 seulement si les huit critères sont verts ; 1 sinon (un critère non jugé n'est pas vert) ;
// 2 : usage ou fixtures fautives. Aucun appel réseau, aucune clé, aucune donnée réelle.
//
// ── LE CONTRAT QUE LE JUGE EXERCE (le module de 026-243 s'y conforme, ou le juge est amendé par Claude Code) ──────────────────
// Le module est cherché dans lib/direction/comptable.{ts,mjs}, lib/agents/comptable.{ts,mjs}, lib/comptable.{ts,mjs}. Exports :
//   rapprocher({ stripe, commandes, abonnements, journal }) → { rapproches[], orphelins[], ecarts[], doublons, … }   (async)
//        stripe = { evenements.lister() } en lecture ; commandes/abonnements = [{ ref, montant, statut }] en centimes (gelés) ;
//        journal = { lire() → lignes, ecrire(ligne) }, SANS déduplication de son côté.
//        rapproches[i] = { id_stripe, ref, montant, date 'AAAA-MM-JJ' } ; orphelins[i] = { id_stripe, montant, … } ; ecarts[i] = { id_stripe, … }
//   suivreSeuil(resultat, seuil, annee) → { cumul, etat: 'ok'|'approche_seuil'|'seuil_depasse', depasse_le: 'AAAA-MM-JJ'|null }
//        seuil = { montant_centimes, source, date_source } ; sans source datée : lève, ou rend etat 'seuil_sans_source'.
//   totalRecettes(resultat, periode) → centimes (le total de la future tuile « Recettes ») ; periode = 'AAAA' ou 'AAAA-Tn'
//   preparerDeclaration(periode, resultat) → { periode, recettes, tva: 0, source, prepare_le }
//   libelleRecette(ligne, { appeler }) → string ; appeler(demande) est la porte vers le moteur (demande.agent === 'comptable') ;
//        sans réponse, ou hors ligne, ou muet plus de 2,5 s : le libellé de gabarit fixe.
// Lecture seule : un module qui sait écrire dans Stripe, la base ou un gabarit légal échoue ici.
//
// Ce que ce juge NE prouve PAS (à lire avant de le citer) : il exerce le contrat ci-dessus sur un jeu d'essai fixe ; il ne dit rien du
// branchement réel (route, tuile, cron, vraie API Stripe, vraie base, vraie porte llm.ts). Le grep du source ne lit que le fichier du
// module et ses imports relatifs (jamais les alias @/lib hors direction/).

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const NOM = 'comptable-qa'
const DEPOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SCRIPT = fileURLToPath(import.meta.url)
const FIX = path.join(DEPOT, 'scripts', 'fixtures', '026', 'comptable')
const TRAVAIL = path.join(DEPOT, '.orchestre', 'travail', 'comptable-qa')
const PREUVES = path.join(DEPOT, '.orchestre', 'preuves', '026-242')

const CRITERES = ['CPT-1', 'CPT-2', 'CPT-3', 'CPT-4', 'CPT-5', 'CPT-6', 'CPT-7', 'CPT-8']
const PARTIES = {
  rapprochement: ['CPT-2', 'CPT-8'],
  seuil: ['CPT-3'],
  montants: ['CPT-4', 'CPT-7'],
  libelle: ['CPT-6'],
  mentions: ['CPT-5'],
}
const CANDIDATS_MODULE = ['lib/direction/comptable.ts', 'lib/direction/comptable.mjs', 'lib/agents/comptable.ts', 'lib/agents/comptable.mjs', 'lib/comptable.ts', 'lib/comptable.mjs']
const CANDIDATS_MOTEURS = ['lib/agents/moteurs.ts', 'lib/agents/moteurs.mjs']
const EXPORTS_ATTENDUS = ['rapprocher', 'suivreSeuil', 'totalRecettes', 'preparerDeclaration', 'libelleRecette']
const DELAI_LIBELLE_MAX_MS = 2500

// ── arguments ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const CONNUS = ['partie', 'racine', 'reel', 'temoin', 'preuve-echecs']
const opts = {}
for (const a of process.argv.slice(2)) {
  const m = /^--([a-z-]+)(?:=(.*))?$/.exec(a)
  if (!m || !CONNUS.includes(m[1])) { console.error(`✗ ${NOM} : argument inconnu « ${a} » (attendus : --partie=, --racine=, --reel, --temoin, --preuve-echecs)`); process.exit(2) }
  opts[m[1]] = m[2] === undefined ? true : m[2]
}
let SELECTION = CRITERES
if (typeof opts.partie === 'string') {
  const noms = opts.partie.split(',').map((s) => s.trim()).filter(Boolean)
  const inconnues = noms.filter((n) => !PARTIES[n])
  if (inconnues.length) { console.error(`✗ ${NOM} : partie inconnue « ${inconnues.join(', ')} » (attendues : ${Object.keys(PARTIES).join(', ')})`); process.exit(2) }
  SELECTION = CRITERES.filter((c) => noms.some((n) => PARTIES[n].includes(c)))
}

// ── utilitaires ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const lireJson = (f) => JSON.parse(fs.readFileSync(path.join(FIX, f), 'utf8'))
const cloner = (x) => structuredClone(x)
function geler(o) { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o)) geler(v) } return o }
const gele = (x) => geler(cloner(x))
const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const idDe = (x) => x?.id_stripe ?? x?.id
const ids = (l) => (Array.isArray(l) ? l.map(idDe) : [])
const trier = (l) => [...l].sort()
const message = (e) => String(e?.message ?? e).split('\n')[0].slice(0, 160)
const euros = (c) => `${(c / 100).toFixed(2).replace('.', ',')} €`

/** Retire les commentaires d'un source (les greps ne lisent que le code, pas les explications). */
function sansCommentaires(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1')
}

function empreintes(racine, chemins) {
  const sortie = {}
  const parcourir = (rel) => {
    const abs = path.join(racine, rel)
    let st; try { st = fs.statSync(abs) } catch { return }
    if (st.isDirectory()) { for (const f of fs.readdirSync(abs).sort()) if (f !== 'node_modules') parcourir(path.posix.join(rel.split(path.sep).join('/'), f)) }
    else sortie[rel] = crypto.createHash('sha1').update(fs.readFileSync(abs)).digest('hex')
  }
  for (const c of chemins) parcourir(c)
  return sortie
}

function trouverModule(racine) {
  for (const rel of CANDIDATS_MODULE) { const abs = path.join(racine, rel); if (fs.existsSync(abs)) return { rel, abs } }
  return null
}

/** Le source du module + ses imports relatifs (ou @/lib/direction/), sur trois niveaux ; jamais le fichier des moteurs. */
function lireSources(racine, mod) {
  const vus = new Set(); const textes = []
  const resoudre = (de, spec) => {
    let base
    if (spec.startsWith('.')) base = path.resolve(path.dirname(de), spec)
    else if (spec.startsWith('@/lib/direction/')) base = path.join(racine, spec.slice(2))
    else return null
    for (const c of [base, `${base}.ts`, `${base}.mjs`, `${base}.js`, path.join(base, 'index.ts')]) { try { if (fs.statSync(c).isFile()) return c } catch {} }
    return null
  }
  const visiter = (abs, prof) => {
    if (vus.has(abs) || prof > 3) return
    vus.add(abs)
    const brut = fs.readFileSync(abs, 'utf8')
    if (!/[\\/]moteurs\.(ts|mjs)$/.test(abs)) textes.push(brut)
    for (const m of brut.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) { const r = resoudre(abs, m[1]); if (r) visiter(r, prof + 1) }
  }
  visiter(mod.abs, 0)
  const brut = textes.join('\n')
  return { brut, code: sansCommentaires(brut) }
}

function poserPieges(obs) {
  const sauve = { fetch: globalThis.fetch, hr: http.request, hg: http.get, sr: https.request, sg: https.get, nc: net.connect, ncc: net.createConnection }
  const piege = (nom) => () => { obs.reseau.push(nom); throw new Error(`RESEAU_INTERDIT : ${nom}`) }
  globalThis.fetch = piege('fetch'); http.request = piege('http.request'); http.get = piege('http.get'); https.request = piege('https.request'); https.get = piege('https.get'); net.connect = piege('net.connect'); net.createConnection = piege('net.createConnection')
  return () => { globalThis.fetch = sauve.fetch; http.request = sauve.hr; http.get = sauve.hg; https.request = sauve.sr; https.get = sauve.sg; net.connect = sauve.nc; net.createConnection = sauve.ncc }
}

/** Importe le module dans un processus neuf et relève ses effets de bord à l'import (sortie, réseau, environnement, fichiers voisins). */
function essaiImport(racine, mod) {
  const dossier = path.dirname(mod.abs)
  const vide = path.join(TRAVAIL, 'cwd-import'); fs.rmSync(vide, { recursive: true, force: true }); fs.mkdirSync(vide, { recursive: true })
  const code = `
    import http from 'node:http'; import https from 'node:https'
    let reseau = 0, sortie = 0
    const piege = () => { reseau++; throw new Error('RESEAU_INTERDIT') }
    globalThis.fetch = piege; http.request = piege; http.get = piege; https.request = piege; https.get = piege
    const ecrire = process.stdout.write.bind(process.stdout)
    process.stdout.write = () => { sortie++; return true }; process.stderr.write = () => { sortie++; return true }
    const env0 = JSON.stringify(process.env)
    let erreur = null
    try { await import(${JSON.stringify(pathToFileURL(mod.abs).href)}) } catch (e) { erreur = String((e && e.message) || e).split('\\n')[0] }
    ecrire(JSON.stringify({ reseau, sortie, env: JSON.stringify(process.env) === env0, erreur }) + '\\n')`
  const avant = empreintes(dossier, ['.'])
  const args = mod.abs.endsWith('.ts') ? ['--experimental-strip-types', '--import', path.join(DEPOT, 'scripts', 'ts-loader.mjs')] : []
  const r = spawnSync(process.execPath, [...args, '--input-type=module', '-e', code], { cwd: mod.abs.endsWith('.ts') ? DEPOT : vide, encoding: 'utf8', timeout: 30_000 })
  const apres = empreintes(dossier, ['.'])
  let rapport = null
  try { rapport = JSON.parse(r.stdout.trim().split('\n').pop()) } catch {}
  return { rapport, stderr: (r.stderr || '').split('\n')[0], fichiersModifies: !egal(avant, apres) }
}

// ── l'exercice : on joue le contrat une fois, les critères lisent ce qui s'est passé ────────────────────────────────────────
async function exercer(M, racine, mod, src) {
  const obs = { err: {}, reseau: [], tentativesStripe: [] }
  const ventes = lireJson('ventes-factices.json')
  const seuilJ = lireJson('seuil.json')
  const mentions = lireJson('mentions.json')
  const { fabriquerStripeFactice, fabriquerJournalFactice } = await import(pathToFileURL(path.join(FIX, 'stripe-factice.mjs')).href)
  obs.import = essaiImport(racine, mod)

  const cwd0 = process.cwd()
  const cwdEssai = path.join(TRAVAIL, 'cwd-exercice'); fs.rmSync(cwdEssai, { recursive: true, force: true }); fs.mkdirSync(cwdEssai, { recursive: true })
  const retablir = poserPieges(obs)
  process.chdir(cwdEssai)
  const etape = async (nom, f) => { try { return await f() } catch (e) { obs.err[nom] = e; return undefined } }
  try {
    obs.avant = empreintes(racine, mentions.proteges)

    // rapprochement, deux passages sur le même journal
    const commandes = gele(ventes.commandes), abonnements = gele(ventes.abonnements)
    const journal = fabriquerJournalFactice()
    const s1 = fabriquerStripeFactice(), s2 = fabriquerStripeFactice()
    obs.r1 = await etape('rapprocher', () => M.rapprocher({ stripe: s1, commandes, abonnements, journal }))
    obs.lignes1 = cloner(journal.lignes)
    await etape('rapprocher-2', () => M.rapprocher({ stripe: s2, commandes, abonnements, journal }))
    obs.lignes2 = cloner(journal.lignes)
    obs.tentativesStripe = [...s1.etat.tentativesEcriture, ...s2.etat.tentativesEcriture]
    obs.ventesIntactes = egal({ commandes, abonnements }, { commandes: ventes.commandes, abonnements: ventes.abonnements })
    const r1 = obs.r1 ? gele(obs.r1) : null

    // seuil
    obs.seuil = []
    for (const sc of seuilJ.scenarios) {
      const entree = gele({ rapproches: sc.rapproches, orphelins: sc.orphelins, ecarts: sc.ecarts })
      obs.seuil.push({ sc, retour: await etape(`seuil:${sc.nom}`, () => M.suivreSeuil(entree, gele(seuilJ.seuil), sc.annee)), erreur: obs.err[`seuil:${sc.nom}`] })
    }
    try { obs.sansDate = { retour: await M.suivreSeuil(gele({ rapproches: seuilJ.scenarios[3].rapproches, orphelins: [], ecarts: [] }), gele(seuilJ.seuil_sans_date), 2026) } } catch (e) { obs.sansDate = { leve: message(e) } }
    obs.pipeline = r1 ? await etape('pipeline', () => M.suivreSeuil(r1, gele(seuilJ.seuil), 2026)) : undefined

    // montants préparés et total de la tuile, sur trois périodes
    obs.montants = {}
    for (const p of ['2026-T1', '2026-T2', '2026']) {
      obs.montants[p] = r1 ? { d: await etape(`prep:${p}`, () => M.preparerDeclaration(p, r1)), t: await etape(`total:${p}`, () => M.totalRecettes(r1, p)) } : {}
    }

    // pureté des fonctions nommées « declarer » ou « payer »
    obs.impurs = []; obs.puresVerifiees = []
    const noms = new Set([...src.code.matchAll(/(?:function\*?\s+|\b(?:const|let|var)\s+)([A-Za-z_$][\w$]*)/g)].map((m) => m[1]).filter((n) => /declarer|payer/i.test(n)))
    for (const n of noms) {
      if (typeof M[n] !== 'function') { obs.impurs.push(`${n} : nommée declarer/payer mais non exportée, pureté non prouvable`); continue }
      try {
        const a = await M[n]('2026-T2', r1 ?? gele({ rapproches: [], orphelins: [], ecarts: [] }))
        const b = await M[n]('2026-T2', r1 ?? gele({ rapproches: [], orphelins: [], ecarts: [] }))
        if (!egal(a, b)) obs.impurs.push(`${n} : deux appels identiques, deux résultats différents`); else obs.puresVerifiees.push(n)
      } catch (e) { obs.impurs.push(`${n} : lève (${message(e)}) sur entrées gelées`) }
    }

    // libellé
    const ligne = { montant: 15000, ref: 'cmd_001' }
    const demandes = []
    obs.lib = {}
    obs.lib.ok = { texte: await etape('libelle-ok', () => M.libelleRecette(ligne, { appeler: async (d) => { demandes.push(cloner(d)); return 'Libellé du moteur de test' } })), demandes }
    obs.lib.nul = await etape('libelle-nul', () => M.libelleRecette(ligne, { appeler: async () => null }))
    obs.lib.rejet = await etape('libelle-rejet', () => M.libelleRecette(ligne, { appeler: async () => { throw new Error('indisponible') } }))
    obs.lib.sans = await etape('libelle-sans', () => M.libelleRecette(ligne, {}))
    const t0 = Date.now()
    let minuteur
    obs.lib.muet = await Promise.race([
      etape('libelle-muet', () => M.libelleRecette(ligne, { appeler: () => new Promise(() => {}) })),
      new Promise((res) => { minuteur = setTimeout(() => res('__DELAI_DEPASSE__'), DELAI_LIBELLE_MAX_MS) }),
    ])
    clearTimeout(minuteur)
    obs.lib.muetMs = Date.now() - t0

    obs.apres = empreintes(racine, mentions.proteges)
  } finally {
    retablir()
    process.chdir(cwd0)
  }
  obs.mentions = mentions
  return obs
}

// ── les critères ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const ok = (detail) => ({ ok: true, detail })
const ko = (detail) => ({ ok: false, detail })
const erreur = (obs, ...noms) => noms.map((n) => (obs.err[n] ? `${n} lève (${message(obs.err[n])})` : null)).filter(Boolean)

const EVALUATION = {
  'CPT-1': (c) => {
    const { obs, M, src } = c
    const pb = []
    const manquants = EXPORTS_ATTENDUS.filter((n) => typeof M[n] !== 'function')
    if (manquants.length) pb.push(`export(s) manquant(s) : ${manquants.join(', ')}`)
    const i = obs.import
    if (!i.rapport) pb.push(`l'import n'a pas pu être relevé (${i.stderr || 'sortie illisible'})`)
    else {
      if (i.rapport.erreur) pb.push(`l'import lève : ${i.rapport.erreur}`)
      if (i.rapport.reseau) pb.push(`appel réseau à l'import (${i.rapport.reseau})`)
      if (i.rapport.sortie) pb.push(`écriture sur la sortie à l'import (${i.rapport.sortie})`)
      if (!i.rapport.env) pb.push("l'import modifie process.env")
    }
    if (i.fichiersModifies) pb.push("l'import modifie des fichiers voisins du module")
    const ecriture = /\b(?:stripe\w*|charges|refunds|subscriptions|customers|paymentIntents|invoices|payouts|transfers|sessions)(?:\.\w+)*\.(?:create|update|del|cancel|capture|confirm)\s*\(/.exec(src.code)
    if (ecriture) pb.push(`méthode d'écriture Stripe dans le source : « ${ecriture[0]} »`)
    if (obs.tentativesStripe.length) pb.push(`le client Stripe piégé a vu une écriture : ${[...new Set(obs.tentativesStripe)].join(', ')}`)
    return pb.length ? ko(pb.join(' ; ')) : ok(`module ${c.mod.rel} : 5 exports, import sans effet de bord, aucune écriture Stripe (source lu et client piégé intact)`)
  },

  'CPT-2': (c) => {
    const { obs } = c
    const e = erreur(obs, 'rapprocher')
    if (e.length) return ko(e.join(' ; '))
    const A = c.attendu, r = obs.r1
    const pb = []
    const rap = ids(r.rapproches)
    if (!egal(trier(rap), trier(A.rapproches))) pb.push(`rapprochés ${JSON.stringify(trier(rap))} ≠ attendus ${JSON.stringify(A.rapproches)} (doublons ou écarts ou orphelins mal rangés ?)`)
    if (!egal(trier(ids(r.orphelins)), trier(A.orphelins))) pb.push(`orphelins ${JSON.stringify(trier(ids(r.orphelins)))} ≠ ${JSON.stringify(A.orphelins)}`)
    if (!egal(trier(ids(r.ecarts)), trier(A.ecarts))) pb.push(`écarts ${JSON.stringify(trier(ids(r.ecarts)))} ≠ ${JSON.stringify(A.ecarts)}`)
    const total = (r.rapproches ?? []).reduce((t, x) => t + Number(x.montant || 0), 0)
    if (total !== A.recettes_2026) pb.push(`recettes rapprochées ${total} ≠ ${A.recettes_2026} centimes`)
    for (const orph of A.orphelins) if (rap.includes(orph)) pb.push(`l'orphelin ${orph} est compté en recette`)
    for (const refus of (r.rapproches ?? []).filter((x) => ['cmd_009', 'cmd_010', 'abo_003'].includes(x.ref))) pb.push(`la vente ${refus.ref} (impayée, jamais rapprochée ou annulée) est comptée`)
    if (rap.some((x) => ['re_01', 'in_f1', 'in_f2', 'in_f3', 'sub_03'].includes(x))) pb.push('un remboursement, un échec ou une annulation est traité comme un paiement')
    if (!obs.ventesIntactes) pb.push('les commandes ont été modifiées (un écart ne se corrige pas tout seul)')
    return pb.length ? ko(pb.join(' ; ')) : ok(`10 rapprochés (${euros(total)}), 2 orphelins, 1 écart (ch_08), 2 doublons comptés une fois, remboursement/échecs/annulation écartés, commandes intactes`)
  },

  'CPT-3': (c) => {
    const { obs } = c
    const pb = []
    for (const s of obs.seuil) {
      if (s.erreur) { pb.push(`« ${s.sc.nom} » lève (${message(s.erreur)})`); continue }
      const r = s.retour
      if (r?.etat !== s.sc.attendu_etat) pb.push(`« ${s.sc.nom} » : état ${JSON.stringify(r?.etat)} ≠ ${s.sc.attendu_etat}`)
      if (r?.cumul !== s.sc.attendu_cumul) pb.push(`« ${s.sc.nom} » : cumul ${r?.cumul} ≠ ${s.sc.attendu_cumul} (orphelin, écart ou année précédente dans le cumul ?)`)
      if ((r?.depasse_le ?? null) !== s.sc.attendu_depasse_le) pb.push(`« ${s.sc.nom} » : date de franchissement ${JSON.stringify(r?.depasse_le ?? null)} ≠ ${JSON.stringify(s.sc.attendu_depasse_le)}`)
    }
    const sd = obs.sansDate
    if (!sd) pb.push('seuil sans date : non exercé')
    else if (!sd.leve && sd.retour?.etat !== 'seuil_sans_source') pb.push(`un seuil sans source datée est accepté (état ${JSON.stringify(sd.retour?.etat)})`)
    if (obs.err.pipeline) pb.push(`rapprocher puis suivreSeuil : ${message(obs.err.pipeline)}`)
    else if (obs.pipeline && (obs.pipeline.cumul !== c.attendu.recettes_2026 || obs.pipeline.etat !== 'ok')) pb.push(`sur le jeu complet : cumul ${obs.pipeline.cumul} (attendu ${c.attendu.recettes_2026}), état ${obs.pipeline.etat} (attendu ok)`)
    return pb.length ? ko(pb.join(' ; ')) : ok('60 % → ok (recette 2025, orphelin et écart ignorés) ; pile 90 % et 92 % → approche_seuil ; 101 % → seuil_depasse daté 2026-07-20 ; seuil sans date refusé ; jeu complet 133700 → ok')
  },

  'CPT-4': (c) => {
    const { obs, src } = c
    const pb = []
    const attendu = { '2026-T1': c.attendu.recettes_2026_T1, '2026-T2': c.attendu.recettes_2026_T2, '2026': c.attendu.recettes_2026 }
    for (const [p, v] of Object.entries(obs.montants)) {
      const d = v.d
      if (!d) { pb.push(`${p} : preparerDeclaration ne rend rien (${erreur(obs, `prep:${p}`)[0] ?? 'non exercée'})`); continue }
      for (const k of ['periode', 'recettes', 'tva', 'source', 'prepare_le']) if (!(k in d)) pb.push(`${p} : champ « ${k} » absent`)
      if (d.periode !== p) pb.push(`${p} : periode ${JSON.stringify(d.periode)} non reprise`)
      if (d.tva !== 0) pb.push(`${p} : tva ${JSON.stringify(d.tva)} ≠ 0 (franchise en base)`)
      if (d.recettes !== attendu[p]) pb.push(`${p} : recettes ${d.recettes} ≠ ${attendu[p]}`)
      if (typeof d.source !== 'string' || !d.source.trim()) pb.push(`${p} : source vide`)
      if (Number.isNaN(Date.parse(d.prepare_le))) pb.push(`${p} : prepare_le illisible`)
    }
    const reseau = /\b(?:fetch|axios|XMLHttpRequest|WebSocket|undici|node-fetch)\b|\bhttps?\.(?:request|get)\b|\bnet\.connect\b|\bfrom\s*['"](?:node:)?(?:https?|net|tls|dgram|child_process)['"]|\bimport\s*\(\s*['"](?:node:)?(?:https?|net|tls|dgram|child_process)['"]/.exec(src.code)
    if (reseau) pb.push(`appel réseau possible dans le source : « ${reseau[0]} »`)
    if (obs.reseau.length) pb.push(`appel réseau observé pendant l'exercice : ${[...new Set(obs.reseau)].join(', ')}`)
    pb.push(...obs.impurs)
    return pb.length ? ko(pb.join(' ; ')) : ok(`T1 48000, T2 54800, année 133700 ; tva 0 ; ni réseau ni dépôt ; ${obs.puresVerifiees.length ? `fonctions declarer/payer prouvées pures : ${obs.puresVerifiees.join(', ')}` : 'aucune fonction nommée declarer/payer'}`)
  },

  'CPT-5': (c) => {
    const { obs, src, racine } = c
    const pb = []
    for (const [rel, h] of Object.entries(obs.avant)) if (obs.apres[rel] !== h) pb.push(`le module a modifié ${rel}`)
    for (const rel of Object.keys(obs.apres)) if (!(rel in obs.avant)) pb.push(`le module a créé ${rel}`)
    const ecriture = /\b(?:writeFile(?:Sync)?|appendFile(?:Sync)?|createWriteStream|copyFile(?:Sync)?|rename(?:Sync)?|unlink(?:Sync)?|rmSync|truncate(?:Sync)?|mkdirSync|writeFileSync)\b/.exec(src.code)
    if (ecriture) pb.push(`écriture de fichier possible dans le source : « ${ecriture[0]} »`)
    const ref = /\b(?:facturation|legalArtisan|DevisPDF|mentionFranchise)\b|\/(?:cgu|cgv|mentions-legales)\b/.exec(src.code)
    if (ref) pb.push(`le source cite un gabarit légal : « ${ref[0]} »`)
    const re = new RegExp(obs.mentions.motif)
    const etat = obs.mentions.trois.map((rel) => { const abs = path.join(racine, rel); return { rel, present: fs.existsSync(abs), porte: fs.existsSync(abs) && re.test(fs.readFileSync(abs, 'utf8')) } })
    const absents = etat.filter((x) => !x.present).map((x) => x.rel)
    if (absents.length) pb.push(`emplacement(s) de la mention introuvable(s) : ${absents.join(', ')}`)
    else {
      const portent = etat.filter((x) => x.porte).map((x) => x.rel), nonPortent = etat.filter((x) => !x.porte).map((x) => x.rel)
      if (portent.length && nonPortent.length) pb.push(`mention changée seule : ${nonPortent.join(', ')} ne la porte(nt) plus alors que ${portent.join(', ')} la porte(nt) encore (les trois changent ensemble, par Benj ou Claude Code)`)
    }
    return pb.length ? ko(pb.join(' ; ')) : ok('gabarits légaux inchangés avant/après (empreintes), aucune écriture de fichier ni référence à un gabarit dans le source, la mention de franchise est cohérente sur ses trois emplacements')
  },

  'CPT-6': (c) => {
    const { obs, src, racine } = c
    const pb = []
    if (!/\bMOTEUR_DE\b/.test(src.code)) pb.push("le source ne passe pas par MOTEUR_DE")
    const interdit = /freellmapi|ollama|perplexity|groq|gemini|openrouter|anthropic|:cloud/i.exec(src.code)
    if (interdit) pb.push(`le source désigne un moteur interdit : « ${interdit[0]} »`)
    const fm = CANDIDATS_MOTEURS.map((r) => path.join(racine, r)).find((p) => fs.existsSync(p))
    if (!fm) pb.push('table des moteurs (lib/agents/moteurs.ts) introuvable')
    else if (!/\bcomptable\s*:\s*\{[^}]*\bmoteur\s*:\s*['"]codex['"][^}]*\bpersonnelles\s*:\s*true/.test(fs.readFileSync(fm, 'utf8'))) pb.push("MOTEUR_DE.comptable n'est pas { moteur: 'codex', personnelles: true } (le Comptable manipule des données financières et de client : Codex ou local, jamais un gratuit ni :cloud)")
    const ok1 = obs.lib.ok
    pb.push(...erreur(obs, 'libelle-ok', 'libelle-nul', 'libelle-rejet', 'libelle-sans', 'libelle-muet'))
    if (ok1.demandes.length !== 1) pb.push(`avec un moteur disponible, ${ok1.demandes.length} demande(s) au lieu d'une`)
    else {
      const d = ok1.demandes[0], brut = JSON.stringify(d)
      if (d.agent !== 'comptable') pb.push(`la demande ne désigne pas l'agent « comptable » (${JSON.stringify(d.agent)}) : la porte ne pourrait pas appliquer MOTEUR_DE.comptable`)
      if (d.moteur !== undefined && d.moteur !== 'codex') pb.push(`la demande impose le moteur ${JSON.stringify(d.moteur)}`)
      if (/:cloud|freellmapi|ollama|perplexity|groq/i.test(brut)) pb.push('la demande cite un moteur gratuit ou :cloud')
      if (d.personnelles === false) pb.push('la demande déclare personnelles: false')
    }
    if (ok1.texte !== 'Libellé du moteur de test') pb.push(`le texte du moteur n'est pas repris (${JSON.stringify(ok1.texte)})`)
    const replis = { nul: obs.lib.nul, rejet: obs.lib.rejet, sans: obs.lib.sans, muet: obs.lib.muet }
    for (const [k, v] of Object.entries(replis)) if (typeof v !== 'string' || !v.trim()) pb.push(`repli « ${k} » : pas de libellé de gabarit (${JSON.stringify(v)})`)
    if (obs.lib.muet === '__DELAI_DEPASSE__') pb.push(`un moteur muet bloque le libellé plus de ${DELAI_LIBELLE_MAX_MS} ms (jamais une attente qui bloque le calcul)`)
    if (new Set(Object.values(replis)).size > 1) pb.push(`le libellé de repli n'est pas fixe : ${JSON.stringify(replis)}`)
    if (Object.values(replis).includes('Libellé du moteur de test')) pb.push('un repli rend le texte du moteur')
    return pb.length ? ko(pb.join(' ; ')) : ok(`MOTEUR_DE.comptable = codex/personnelles ; 1 demande à l'agent « comptable » sans moteur imposé ; repli fixe si moteur absent, nul, en erreur ou muet (${obs.lib.muetMs} ms)`)
  },

  'CPT-7': (c) => {
    const { obs } = c
    const pb = []
    const attendu = { '2026-T1': c.attendu.recettes_2026_T1, '2026-T2': c.attendu.recettes_2026_T2, '2026': c.attendu.recettes_2026 }
    for (const [p, v] of Object.entries(obs.montants)) {
      if (v.t === undefined || !v.d) { pb.push(`${p} : un des deux chemins ne rend rien (${[...erreur(obs, `total:${p}`, `prep:${p}`)].join(' ; ') || 'non exercé'})`); continue }
      if (v.t !== v.d.recettes) pb.push(`${p} : la tuile dirait ${v.t}, la déclaration ${v.d.recettes} (écart ${Math.abs(v.t - v.d.recettes)} centimes)`)
      if (v.t !== attendu[p]) pb.push(`${p} : total ${v.t} ≠ ${attendu[p]}`)
    }
    if (obs.pipeline && obs.montants['2026']?.t !== undefined && obs.pipeline.cumul !== obs.montants['2026'].t) pb.push(`le cumul du seuil (${obs.pipeline.cumul}) diffère du total de la tuile (${obs.montants['2026'].t})`)
    return pb.length ? ko(pb.join(' ; ')) : ok('tuile, déclaration et cumul du seuil rendent le même total au centime sur T1, T2 et l\'année (48000, 54800, 133700)')
  },

  'CPT-8': (c) => {
    const { obs } = c
    const pb = []
    const e = erreur(obs, 'rapprocher', 'rapprocher-2')
    if (e.length) return ko(e.join(' ; '))
    const n = obs.r1.rapproches?.length ?? 0
    if (obs.lignes1.length < n) pb.push(`${obs.lignes1.length} ligne(s) de journal pour ${n} rapprochements`)
    for (const [i, l] of obs.lignes1.entries()) {
      if (typeof l.type !== 'string' || !l.type) pb.push(`ligne ${i} sans type`)
      if (!Number.isFinite(l.montant)) pb.push(`ligne ${i} sans montant numérique`)
    }
    const secret = /\b(?:sk|rk|pk)_(?:live|test)_|whsec_|\b\d{13,19}\b|4242|PIEGE|cleEcriture/.exec(JSON.stringify(obs.lignes1))
    if (secret) pb.push(`le journal contient un numéro de carte ou un secret (« ${secret[0]} »)`)
    if (obs.lignes2.length !== obs.lignes1.length) pb.push(`deux passages sur le même jeu : ${obs.lignes1.length} puis ${obs.lignes2.length} lignes (pas d'idempotence)`)
    return pb.length ? ko(pb.join(' ; ')) : ok(`${obs.lignes1.length} ligne(s) (type + montant, ni carte ni secret) ; un second passage n'en ajoute aucune`)
  },
}

// ── le juge d'une racine ────────────────────────────────────────────────────────────────────────────────────────────────────
async function juger(racine) {
  fs.mkdirSync(TRAVAIL, { recursive: true })
  const mod = trouverModule(racine)
  const lignes = []
  if (!mod) {
    const premier = SELECTION.find((c) => c !== 'CPT-1')
    for (const c of SELECTION) {
      if (c === premier) lignes.push({ id: c, etat: 'FAIL', detail: `module du Comptable ABSENT de ${racine} (cherché : ${CANDIDATS_MODULE.join(', ')}) — rien à rapprocher, rien n'est prouvé` })
      else lignes.push({ id: c, etat: 'NJ', detail: c === 'CPT-1' ? `non jugé : module absent (le premier échec est ${premier ?? 'CPT-1'})` : 'non jugé : module absent' })
    }
    if (!premier) lignes[0].etat = 'FAIL'
    return lignes
  }
  const attendu = (await import(pathToFileURL(path.join(FIX, 'stripe-factice.mjs')).href)).ATTENDU
  const src = lireSources(racine, mod)
  let M, obs
  try { M = await import(pathToFileURL(mod.abs).href) } catch (e) {
    return SELECTION.map((id) => ({ id, etat: 'FAIL', detail: `le module ${mod.rel} ne s'importe pas : ${message(e)}` }))
  }
  try { obs = await exercer(M, racine, mod, src) } catch (e) {
    return SELECTION.map((id) => ({ id, etat: 'FAIL', detail: `exercice impossible : ${message(e)}` }))
  }
  const contexte = { M, obs, src, racine, mod, attendu }
  for (const id of SELECTION) {
    let r
    try { r = EVALUATION[id](contexte) } catch (e) { r = ko(`évaluation impossible : ${message(e)}`) }
    lignes.push({ id, etat: r.ok ? 'PASS' : 'FAIL', detail: r.detail })
  }
  return lignes
}

function imprimer(lignes) {
  const icone = { PASS: '✅ PASS', FAIL: '❌ FAIL', NJ: '⏭ NON JUGÉ' }
  for (const l of lignes) console.log(`${icone[l.etat]} ${l.id} — ${l.detail}`)
  const vert = lignes.every((l) => l.etat === 'PASS')
  console.log(vert ? `${NOM} : PASS — ${lignes.map((l) => l.id).join(', ')}` : `${NOM} : FAIL — ${lignes.filter((l) => l.etat !== 'PASS').map((l) => `${l.id}${l.etat === 'FAIL' ? ' (rouge)' : ' (non jugé)'}`).join(', ')}`)
  return vert ? 0 : 1
}

function copierTemoin(nom, remplacements = []) {
  const dest = path.join(TRAVAIL, 'racines', nom)
  fs.rmSync(dest, { recursive: true, force: true })
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.cpSync(path.join(FIX, 'temoin'), dest, { recursive: true })
  for (const r of remplacements) {
    const f = path.join(dest, r.fichier)
    const t = fs.readFileSync(f, 'utf8')
    const n = t.split(r.de).length - 1
    if (n !== 1) throw new Error(`sabotage « ${nom} » : « ${r.de.slice(0, 60)} » trouvé ${n} fois dans ${r.fichier} (attendu : 1)`)
    fs.writeFileSync(f, t.replace(r.de, () => r.par))
  }
  return dest
}

/** Relance le juge dans un processus neuf sur une racine (le chargeur TypeScript n'est posé que si le module est en .ts). */
function soiMeme(args) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: DEPOT, encoding: 'utf8', timeout: 120_000, maxBuffer: 16 * 1024 * 1024 })
  const sortie = (r.stdout || '').split('\n')
  const lignes = sortie.filter((l) => /^(✅ PASS|❌ FAIL|⏭ NON JUGÉ) CPT-\d/.test(l)).map((l) => ({ texte: l, etat: l.startsWith('✅') ? 'PASS' : l.startsWith('❌') ? 'FAIL' : 'NJ', id: /CPT-\d/.exec(l)[0] }))
  return { code: r.status ?? 2, lignes, brut: r.stdout + (r.stderr || '') }
}

// ── --preuve-echecs ─────────────────────────────────────────────────────────────────────────────────────────────────────────
async function preuveEchecs() {
  const pb = []
  const rapport = { courant: null, temoin: null, sabotages: [], fixtures: [] }
  fs.rmSync(TRAVAIL, { recursive: true, force: true }); fs.mkdirSync(TRAVAIL, { recursive: true })

  // (0) les fixtures sont justes
  const { EVENEMENTS, ATTENDU, fabriquerStripeFactice } = await import(pathToFileURL(path.join(FIX, 'stripe-factice.mjs')).href)
  const aut = (nom, vrai, detail) => { rapport.fixtures.push({ nom, ok: !!vrai, detail }); if (!vrai) pb.push(`fixture : ${nom} — ${detail}`) }
  aut('20 événements Stripe fixes', EVENEMENTS.length === 20, `${EVENEMENTS.length}`)
  const types = {}; for (const e of EVENEMENTS) types[e.type] = (types[e.type] ?? 0) + 1
  aut('composition des événements', types['charge.succeeded'] === 15 && types['charge.refunded'] === 1 && types['invoice.payment_failed'] === 3 && types['customer.subscription.deleted'] === 1, JSON.stringify(types))
  const st = fabriquerStripeFactice()
  let leves = 0
  for (const f of [() => st.charges.create(), () => st.refunds.create(), () => st.subscriptions.cancel(), () => st.cleEcriture]) { try { f() } catch { leves++ } }
  aut('le client Stripe factice lève sur toute écriture et sur sa clé', leves === 4 && st.etat.tentativesEcriture.length === 4, `${leves} levées, ${st.etat.tentativesEcriture.length} consignées`)
  const ventes = lireJson('ventes-factices.json')
  const refs = new Map([...ventes.commandes, ...ventes.abonnements].map((v) => [v.ref, v.montant]))
  const dedup = new Map(); for (const e of EVENEMENTS.filter((x) => x.type === 'charge.succeeded')) dedup.set(e.id_stripe, e)
  const calcul = { rap: [], orph: [], ec: [] }
  for (const e of dedup.values()) { if (!e.ref_externe || !refs.has(e.ref_externe)) calcul.orph.push(e.id_stripe); else if (refs.get(e.ref_externe) !== e.montant) calcul.ec.push(e.id_stripe); else calcul.rap.push(e) }
  aut('le jeu d\'essai donne bien l\'ATTENDU (calcul indépendant)', egal(trier(calcul.rap.map((e) => e.id_stripe)), trier(ATTENDU.rapproches)) && egal(trier(calcul.orph), trier(ATTENDU.orphelins)) && egal(calcul.ec, ATTENDU.ecarts) && calcul.rap.reduce((t, e) => t + e.montant, 0) === ATTENDU.recettes_2026, `rapprochés ${calcul.rap.length}, orphelins ${calcul.orph}, écarts ${calcul.ec}`)
  const t12 = (a, b) => calcul.rap.filter((e) => e.date >= a && e.date <= b).reduce((t, e) => t + e.montant, 0)
  aut('T1 et T2 attendus', t12('2026-01-01', '2026-03-31') === ATTENDU.recettes_2026_T1 && t12('2026-04-01', '2026-06-30') === ATTENDU.recettes_2026_T2, `${t12('2026-01-01', '2026-03-31')} / ${t12('2026-04-01', '2026-06-30')}`)
  const seuilJ = lireJson('seuil.json')
  aut('seuil daté et scénarios 60/90/92/101 %', !!seuilJ.seuil.date_source && !seuilJ.seuil_sans_date.date_source && seuilJ.scenarios.length === 4 && seuilJ.scenarios.every((s) => s.rapproches.filter((r) => r.date.startsWith('2026')).reduce((t, r) => t + r.montant, 0) === s.attendu_cumul), `${seuilJ.scenarios.length} scénarios`)
  const sabotages = lireJson('sabotages.json')
  aut('au moins 8 sabotages, chacun avec un critère CPT existant', sabotages.length >= 8 && sabotages.every((s) => CRITERES.includes(s.critere)), `${sabotages.length}`)
  aut('chaque critère CPT est visé par au moins un sabotage', CRITERES.every((c) => sabotages.some((s) => s.critere === c)), [...new Set(sabotages.map((s) => s.critere))].sort().join(','))
  if (pb.length) { console.error(`✗ ${NOM} --preuve-echecs : fixtures fautives\n  ${pb.join('\n  ')}`); return 2 }

  // (a) l'arbre courant
  const courant = soiMeme(['--racine=' + DEPOT])
  const moduleCourant = trouverModule(DEPOT)
  const premierRouge = courant.lignes.find((l) => l.etat === 'FAIL')
  rapport.courant = { module: moduleCourant?.rel ?? null, code: courant.code, premier: premierRouge?.id ?? null, lignes: courant.lignes.map((l) => l.texte) }
  if (!moduleCourant) {
    if (courant.code === 0) pb.push("arbre courant : sort 0 alors que le module n'existe pas (FAUX PASS)")
    if (premierRouge?.id !== 'CPT-2') pb.push(`arbre courant : premier échec ${premierRouge?.id ?? 'aucun'} au lieu de CPT-2`)
    if (courant.lignes.some((l) => l.etat === 'PASS')) pb.push('arbre courant : un critère vert alors que le module est absent')
  }

  // (b) le témoin passe tout
  const tem = soiMeme(['--racine=' + copierTemoin('temoin')])
  rapport.temoin = { code: tem.code, verts: tem.lignes.filter((l) => l.etat === 'PASS').length, lignes: tem.lignes.map((l) => l.texte) }
  if (tem.code !== 0 || rapport.temoin.verts !== CRITERES.length) pb.push(`témoin : code ${tem.code}, ${rapport.temoin.verts}/${CRITERES.length} critères verts\n${tem.lignes.filter((l) => l.etat !== 'PASS').map((l) => '    ' + l.texte).join('\n')}`)

  // (c) les sabotages
  for (const s of sabotages) {
    let dest
    try { dest = copierTemoin(`sabotage-${s.id}`, s.remplacements) } catch (e) { console.error(`✗ ${NOM} --preuve-echecs : ${message(e)}`); return 2 }
    const r = soiMeme(['--racine=' + dest])
    const rouges = r.lignes.filter((l) => l.etat === 'FAIL')
    const attrape = rouges.some((l) => l.id === s.critere)
    rapport.sabotages.push({ ...s, code: r.code, rouges: rouges.map((l) => l.id), attrape, detail: rouges.find((l) => l.id === s.critere)?.texte ?? '' })
    if (r.code === 0) pb.push(`sabotage « ${s.id} » : le juge sort 0 (FAUX PASS)`)
    else if (!attrape) pb.push(`sabotage « ${s.id} » : ${s.critere} n'a pas rougi (rouges : ${rouges.map((l) => l.id).join(', ') || 'aucun'})`)
  }

  // le rapport
  fs.mkdirSync(PREUVES, { recursive: true })
  const L = []
  L.push('# 026-242 — échecs attendus du juge du Comptable (`scripts/comptable-qa.mjs --preuve-echecs`)', '')
  L.push(`Généré par le juge lui-même. Verdict : **${pb.length ? 'ÉCHEC' : 'conforme'}**.`, '')
  L.push('## (a) L\'arbre courant', '', rapport.courant.module ? `Module trouvé : \`${rapport.courant.module}\` — verdict du juge dessus (information, pas une exigence de cette preuve) : code ${courant.code}.` : `Module du Comptable **absent** du dépôt : code ${courant.code}, premier échec **${rapport.courant.premier}** (attendu : CPT-2).`, '', '```', ...rapport.courant.lignes, '```', '')
  L.push('## (b) Le témoin (référence jamais déployée)', '', `Code ${rapport.temoin.code}, ${rapport.temoin.verts}/${CRITERES.length} critères verts.`, '', '```', ...rapport.temoin.lignes, '```', '')
  L.push(`## (c) ${rapport.sabotages.length} sabotages du témoin, chacun doit rougir son critère nommé`, '', '| sabotage | ce qu\'il fait | critère attendu | rouges | verdict |', '|---|---|---|---|---|')
  for (const s of rapport.sabotages) L.push(`| ${s.id} | ${s.quoi} | ${s.critere} | ${s.rouges.join(', ') || '—'} | ${s.attrape && s.code !== 0 ? 'attrapé' : 'RATÉ'} |`)
  L.push('', '## Limites', '', "Un test vert ne prouve que ce qu'il regarde : ces sabotages prouvent que le juge sait rougir sur ces fautes-là, dans le contrat qu'il exerce (en-tête de `scripts/comptable-qa.mjs`) ; ils ne prouvent rien du module de 026-243 ni de son branchement réel.", '')
  fs.writeFileSync(path.join(PREUVES, 'echecs-attendus.md'), L.join('\n'))

  if (pb.length) { console.error(`✗ ${NOM} --preuve-echecs : ${pb.length} écart(s)\n  ${pb.join('\n  ')}`); return 1 }
  console.log(`✓ ${NOM} --preuve-echecs : fixtures justes, arbre courant ${moduleCourant ? `(module ${moduleCourant.rel} présent)` : `rouge (module absent, ${rapport.courant.premier} en premier)`}, témoin vert (${CRITERES.length}/${CRITERES.length}), ${rapport.sabotages.length} sabotages attrapés chacun par son critère`)
  console.log(`  preuve : ${path.relative(DEPOT, path.join(PREUVES, 'echecs-attendus.md'))}`)
  return 0
}

// ── point d'entrée ──────────────────────────────────────────────────────────────────────────────────────────────────────────
async function main() {
  if (opts['preuve-echecs']) return preuveEchecs()
  fs.mkdirSync(TRAVAIL, { recursive: true })
  const racine = opts.temoin ? copierTemoin('temoin') : path.resolve(typeof opts.racine === 'string' ? opts.racine : DEPOT)
  const mod = trouverModule(racine)
  if (mod?.abs.endsWith('.ts') && !process.execArgv.some((a) => a.includes('ts-loader'))) {
    const r = spawnSync(process.execPath, ['--experimental-strip-types', '--import', path.join(DEPOT, 'scripts', 'ts-loader.mjs'), SCRIPT, ...process.argv.slice(2)], { cwd: DEPOT, stdio: 'inherit' })
    return r.status ?? 2
  }
  return imprimer(await juger(racine))
}

main().then((code) => { process.exit(code) }, (e) => { console.error(`✗ ${NOM} : ${e?.stack ?? e}`); process.exit(2) })
