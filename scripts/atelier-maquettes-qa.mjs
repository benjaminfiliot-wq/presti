#!/usr/bin/env node
// scripts/atelier-maquettes-qa.mjs — juge hors ligne d'A2, l'Atelier des maquettes sur l'usine (fiche 026-080), écrit par
// Claude Code AVANT les modules qu'il juge (scripts/agents/atelier-maquettes.mjs, lib/agents/acquisition/magasinUsine.ts,
// et les quatre routes app/api/usine/atelier/*, fiche 026-097). L'exécutant qui écrit ces modules ne touche jamais ce
// fichier.
//
//   node --import ./scripts/ts-loader.mjs scripts/atelier-maquettes-qa.mjs [--racine=<dossier>] [--auto-controle]
//   node … --reel --bout-en-bout --etape=preparer|conclure --confirmer-reel [--pc-eteint-de=<ISO> --pc-eteint-a=<ISO>
//         --recu-le=<ISO>]   (Claude Code seulement, l'épreuve de bout en bout de la fiche 026-163 : BE-1 à BE-6)
//
// Les critères AM de 026-097.md. `passeAtelier` est éprouvé avec un magasin de l'usine factice (les quatre méthodes de
// magasinUsine.ts) et l'exécuteur factice de maquettes/executeur-factice.mjs (qui imite generer.mjs --maquette,
// maquette-capturer.mjs et maquette-video.mjs) ; les quatre routes, par le BANC de routes-acquisition-qa.mjs
// (scripts/fixtures/026-acquisition/cli/banc-crochet.mjs, réutilisé tel quel : chaque import `@/lib/…` de la route
// devient une doublure consignée).
//
// Signatures attendues (026-097) : passeAtelier(deps), deps = { magasin, executer, horloge, dossierSortie } ; les routes
// `GET travail`, `POST depot`, `POST maquette`, `POST lien` sous app/api/usine/atelier/ ; lib/agents/acquisition/
// magasinUsine.ts exporte travail(), deposer(prospectId, fichier, octets), maquettePrete(prospectId, objets, empreintes),
// demanderLien(prospectId).
//
//   --racine=<d>     importe <d>/scripts/agents/atelier-maquettes.mjs et ses routes (défaut : le dépôt).
//   --auto-controle  AC-1 les jeux d'essai se lisent (exécuteur factice, JPEG et MP4 d'essai) ; AC-2 le magasin factice de
//                    l'acquisition applique ses règles sur son propre scénario ; AC-3 chaque contrôle AM-2 à AM-12 repère
//                    son échantillon fautif et laisse passer son échantillon conforme.
//
// Sortie : une ligne par critère, puis « atelier-maquettes-qa : PASS|FAIL — … ». Code 0 seulement si tout est vert ;
// 1 sinon ; 2 si l'appel est invalide. Module absent : AM-1 en échec, les suivants « non jugés ». Hors ligne (sauf
// --reel), fuseau UTC. Écriture seulement sous .orchestre/travail/atelier-maquettes-qa/.
process.env.TZ = 'UTC'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { register } from 'node:module'
import {
  R, TRAVAIL, LOADER, lireOptions, creerSortie, importerDepuis, typecheck, piegerReseau, sansCommentaires, court, premiereLigne,
  exigerSousTravail,
} from './fixtures/026-acquisition/commun.mjs'
import { creerHorloge } from './fixtures/026-acquisition/horloge-factice.mjs'
import { creerMagasin, scenario as scenarioMagasin, REGLES_JP6 } from './fixtures/026-acquisition/magasin-memoire.mjs'
import { creerExecuteurFactice, JPEG_TELEPHONE, JPEG_ORDINATEUR, VIDEO_OK, jpegZeroOctet, jpegLourde, jpegUniforme, videoLourde } from './fixtures/026-acquisition/maquettes/executeur-factice.mjs'
import { creerStockageFactice } from './fixtures/026-acquisition/maquettes/stockage-factice.mjs'

const JUGE = 'atelier-maquettes-qa'
const CLI = path.join(R, 'scripts', 'fixtures', '026-acquisition', 'cli')
const o = lireOptions(process.argv.slice(2), { connues: ['etape', 'pc-eteint-de', 'pc-eteint-a', 'recu-le'], drapeauxConnus: ['reel', 'bout-en-bout', 'confirmer-reel'] })
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
const REEL = o.drapeaux.has('reel'), BOUT = o.drapeaux.has('bout-en-bout')
if (BOUT && !REEL) refuser('--bout-en-bout exige --reel')
if (REEL && !o.drapeaux.has('confirmer-reel')) refuser('--reel exige --confirmer-reel (geste réel, Claude Code seulement)')
if (BOUT && !['preparer', 'conclure'].includes(o.valeurs.etape)) refuser('--bout-en-bout exige --etape=preparer|conclure')
if (!REEL && (o.inconnues.length || o.positionnels.length)) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (!fs.existsSync(o.racine) || !fs.statSync(o.racine).isDirectory()) refuser(`--racine : ${o.racine} n'est pas un dossier`)
if (!process.execArgv.some((a) => /ts-loader/.test(a)) && !String(process.env.NODE_OPTIONS ?? '').includes('ts-loader')) await import(pathToFileURL(LOADER).href)

const RAC = o.racine
const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
const NOM = `${JUGE}${o.autoControle ? ' --auto-controle' : REEL ? ` --reel${BOUT ? ` --bout-en-bout --etape=${o.valeurs.etape}` : ''}` : ''}`
const T0 = Date.parse('2026-10-14T08:00:00.000Z')
const H_ = 3600_000
const IDS = ['AM-1', 'AM-2', 'AM-3', 'AM-4', 'AM-5', 'AM-6', 'AM-7', 'AM-8', 'AM-9', 'AM-10', 'AM-11', 'AM-12']
const EXPORTS_ROUTES = { travail: 'app/api/usine/atelier/travail/route.ts', depot: 'app/api/usine/atelier/depot/route.ts', maquette: 'app/api/usine/atelier/maquette/route.ts', lien: 'app/api/usine/atelier/lien/route.ts' }
const FICHIER_MAGASIN_USINE = 'lib/agents/acquisition/magasinUsine.ts'
const FICHIER_SCRIPT = 'scripts/agents/atelier-maquettes.mjs'
const json = (x) => { try { return JSON.stringify(x) ?? '' } catch { return String(x) } }
const piege = piegerReseau()

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// L'épreuve de bout en bout (026-163) : mode --reel --bout-en-bout. Non applicable tant que la chaîne (026-085, 026-089,
// 026-094 à 026-097, 026-143, 026-145, 026-148) n'est pas déployée : elle est écrite ici pour que la CLI existe, refuse
// proprement les appels invalides, et soit prête à recevoir sa vraie logique le jour venu (fiche 026-163).
if (BOUT) {
  console.log(`${NOM} — épreuve de bout en bout (fiche 026-163)`)
  console.log(`❌ BE-1 non applicable : la chaîne complète (Atelier sur l'usine, Facteur, Standard, Répondeur, porteur du formulaire) n'est pas encore déployée — refaire cette épreuve depuis 026-163 une fois 026-085, 026-089, 026-094 à 026-097, 026-143, 026-145 et 026-148 PASS et déployées`)
  console.log(`${NOM} : FAIL — BE-1`)
  process.exit(2)
}
if (REEL) {
  console.log(`${NOM} : geste réel — Atelier des maquettes en production`)
  console.log(`${NOM} : rien à faire pour l'instant (atelier-maquettes.mjs n'est pas encore écrit) — refait quand 026-097 sera déployée`)
  process.exit(2)
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Le magasin de l'usine factice (le client de magasinUsine.ts, injecté dans passeAtelier)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function creerMagasinUsineFactice({ aFabriquer = [], liensACreer = [] } = {}) {
  const appels = [], maquettesPretes = [], liensDemandes = []
  return {
    appels, maquettesPretes, liensDemandes,
    async travail() { appels.push({ methode: 'travail' }); return { a_fabriquer: aFabriquer, liens_a_creer: liensACreer } },
    async deposer(prospectId, fichier, octets) { appels.push({ methode: 'deposer', prospectId, fichier, taille: octets?.length ?? 0 }); return { ok: true } },
    async maquettePrete(prospectId, objets, empreintes) { appels.push({ methode: 'maquettePrete', prospectId, objets, empreintes }); maquettesPretes.push({ prospectId, objets, empreintes }); return { ok: true } },
    async demanderLien(prospectId) { appels.push({ methode: 'demanderLien', prospectId }); liensDemandes.push(prospectId); return { ok: true } },
  }
}
function dossierEssai(nom) { return exigerSousTravail(path.join(TRAVAIL, JUGE, nom)) }

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Le BANC des quatre routes (repris tel quel de scripts/routes-acquisition-qa.mjs, 026-037 : lecture seule)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const D = (globalThis.__DBL = { journal: [], comportements: {}, valeurs: {}, evenements: [], n: 0 })
const jsonSur = (x) => { try { const vus = new WeakSet(); return JSON.stringify(x, (k, v) => { if (typeof v === 'function') return '[fonction]'; if (typeof v === 'bigint') return String(v); if (v && typeof v === 'object') { if (vus.has(v)) return '[cycle]'; vus.add(v) } return v }) ?? 'undefined' } catch { return '[illisible]' } }
D.appel = (chemin, args) => {
  const [mod, exp] = chemin.split('::')
  const nom = exp.split('.').pop()
  D.journal.push({ mod, exp, nom, args, json: jsonSur(args), n: ++D.n })
  for (const k of [exp, nom]) if (Object.hasOwn(D.comportements, k)) return D.comportements[k](...args)
  return undefined
}
function universel(chemin) {
  return new Proxy(function () {}, {
    get(_, p) { if (p === 'then' || typeof p === 'symbol' || p === 'toJSON' || p === 'prototype') return undefined; return universel(`${chemin}.${String(p)}`) },
    apply(_, __, args) { return D.appel(chemin, args) },
    construct(_, args) { D.appel(`${chemin}#new`, args); return universel(`${chemin}#instance`) },
  })
}
D.fab = (mod, exp) => (Object.hasOwn(D.valeurs, exp) ? D.valeurs[exp] : universel(`${mod}::${exp}`))
let bancEnregistre = false
function enregistrerBanc() { if (bancEnregistre) return; register(pathToFileURL(path.join(CLI, 'banc-crochet.mjs')).href, import.meta.url, { data: { contrat: pathToFileURL(path.join(R, 'lib', 'agents', 'acquisition', 'contrat.ts')).href } }); bancEnregistre = true }
let BANC = 0
/** Exécute une route du banc : { statut, json, texte, erreur, journal, console }. */
async function banc(fichier, { methode = 'GET', url = 'http://localhost/api/usine/atelier/', entetes = {}, corps, comportements = {}, valeurs = {} } = {}) {
  enregistrerBanc()
  D.journal = []; D.comportements = comportements; D.valeurs = valeurs; D.n = 0
  const sortie = []
  const console0 = {}
  for (const k of ['log', 'error', 'warn', 'info', 'debug']) { console0[k] = console[k]; console[k] = (...a) => sortie.push(a.map((x) => (typeof x === 'string' ? x : jsonSur(x))).join(' ')) }
  const fetch0 = globalThis.fetch
  globalThis.fetch = async () => { throw new Error('réseau coupé par le juge') }
  let statut = null, jsonRep = null, texte = '', erreur = null
  try {
    const mod = await import(`${pathToFileURL(fichier).href}?banc=${++BANC}`)
    if (typeof mod[methode] !== 'function') throw new Error(`${methode} non exportée`)
    const req = new Request(url, { method: methode, headers: entetes, body: corps === undefined ? undefined : typeof corps === 'string' ? corps : JSON.stringify(corps) })
    const rep = await mod[methode](req)
    statut = rep?.status ?? null
    texte = rep ? await rep.text() : ''
    try { jsonRep = JSON.parse(texte) } catch { jsonRep = null }
  } catch (e) { erreur = premiereLigne(e) } finally {
    for (const k of Object.keys(console0)) console[k] = console0[k]
    globalThis.fetch = fetch0
  }
  return { statut, json: jsonRep, texte, erreur, journal: D.journal.slice(), console: sortie.join('\n') }
}
const appelsDe = (x, nom) => x.journal.filter((e) => e.nom === nom || e.exp === nom)
const JETON = 'JETON-ATELIER-TEMOIN-1234'

// La garde réelle (lib/agents/garde.ts) : authAgent rend un AgentAuth { nom, … } ou un RefusAgent { status, code, error } ;
// estRefusAgent les distingue par la présence de `error`. Les doublures rendent exactement ces deux formes.
const AGENT_ATELIER = { nom: 'atelier_maquettes', capacites: [], typesCrees: [], tablesEcrites: [], debitMinute: 60, route: '/api/usine/atelier' }
const refusAgent = (status, code) => ({ status, code, error: code })
const estRefusAgent = (r) => !!r && typeof r === 'object' && 'error' in r
/** Les comportements communs des doublures pour un appel qui doit passer la garde (busAgents, jeton, pause). */
function gardeOk({ pause = false, drapeaux = {}, agent = AGENT_ATELIER } = {}) {
  return {
    actif: (flag) => (Object.hasOwn(drapeaux, flag) ? drapeaux[flag] : flag === 'busAgents' ? true : flag === 'siteAchatPublic' ? true : false),
    authAgent: () => agent,
    estRefusAgent,
    pauseGenerale: () => (pause ? { active: true, source: 'variable' } : { active: false, source: 'base' }),
  }
}
const BASE_URL = 'http://localhost/api/usine/atelier/'
const urlDe = (nom) => `${BASE_URL}${nom}`
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const shaHex = (b) => crypto.createHash('sha256').update(b).digest('hex')
/** Un prospect de ops.prospects tel que `acq_prospects_*` le rend (p.*). */
const prospectEssai = (n, o = {}) => ({
  id: uuid(n), cle_dedup: o.cle ?? `siren:81234567${n}`, source: o.source ?? 'sirene', cible: 'artisan', siren: `81234567${n}`,
  entreprise: `Entreprise Témoin ${n}`, metier: o.metier ?? 'menuisier', commune: 'Nantes',
  faits: o.faits ?? [{ id: 'f'.repeat(16), type: 'site', extrait: 'Menuiserie Témoin, artisan à Nantes', url: 'https://menuiserie-temoin.invalid/', lu_le: '2026-10-14T07:00:00.000Z', verifie: 'ok' }],
  canaux: o.canaux ?? [], froid: (o.source ?? 'sirene') !== 'entrant', etape: o.etape ?? 'verifie', tentatives: 0, conversation_id: o.conversation_id ?? null,
})
const entrantEssai = (n, o = {}) => prospectEssai(n, { source: 'entrant', etape: 'verifie', cle: `instagram:entrant${n}`, faits: [], ...o })
const froidOuiEssai = (n, o = {}) => prospectEssai(n, { etape: 'oui', ...o })
/** Les comportements d'une demande à `GET travail`. */
function comportementsTravail({ demandes = [], avance = [], oui = [], jour = {}, palier = 'P1', drapeaux = {}, pause = false } = {}) {
  return {
    ...gardeOk({ drapeaux, pause }),
    maquettesDuJour: () => ({ faites_aujourdhui: 0, pretes_non_utilisees: 0, entrants_faites_aujourdhui: 0, ...jour }),
    etatEnvoi: () => ({ palier, envoi_froid: false }),
    prospectsPourMaquette: (n, froid) => (froid ? avance : demandes).slice(0, n),
    prospectsOui: (n) => oui.slice(0, n),
    ops_battement: () => 'ok',
  }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Les contrôles, purs : observations → défauts
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const C = {
  'AM-2': (x) => {
    const e = []
    const CLES = ['entreprise', 'metier', 'ville', 'communes', 'modele', 'source_fait']
    for (const j of x.maquettesJson) {
      const cles = Object.keys(j).sort()
      if (json(cles) !== json([...CLES].sort())) e.push(`clés ${json(cles)}, exactement ${json(CLES)} attendues`)
      if (['photo', 'telephone', 'siren', 'email'].some((k) => k in j)) e.push('une clé interdite (photo, téléphone, siren ou e-mail) présente')
    }
    // « JJ/MM/AAAA » de la fiche est le gabarit d'une date : la phrase porte la date du passage, jamais les lettres du gabarit.
    if (x.entrantSansFait) {
      const sf = x.entrantSansFait.source_fait
      const m = /^Maquette demandée par l'entreprise le (\d{2})\/(\d{2})\/(\d{4})$/.exec(sf?.fait ?? '')
      if (!m || sf?.source !== 'demande') e.push(`entrant sans fait : source_fait ${json(sf)}, la phrase « Maquette demandée par l'entreprise le JJ/MM/AAAA » (une vraie date) et la source « demande » sont attendues`)
      else if (x.dateAttendue && `${m[1]}/${m[2]}/${m[3]}` !== x.dateAttendue) e.push(`entrant sans fait : la date écrite est ${m[1]}/${m[2]}/${m[3]}, celle du passage (${x.dateAttendue}) est attendue`)
    }
    if (x.avecFait) {
      const sf = x.avecFait.json?.source_fait
      if (sf?.fait !== x.avecFait.extrait || sf?.source !== x.avecFait.url || sf?.repere !== x.avecFait.id) e.push(`avec fait : source_fait ${json(sf)}, l'extrait, l'adresse et l'identifiant reçus sont attendus`)
    }
    return e
  },
  'AM-3': (x) => {
    const e = []
    if (x.dansDepot.code !== 2 || x.dansDepot.appels !== 0) e.push(`dossierSortie dans le dépôt : code ${json(x.dansDepot.code)}, ${x.dansDepot.appels} appel(s), 2 et zéro attendus`)
    if (x.sousPublic.code !== 2 || x.sousPublic.appels !== 0) e.push(`dossierSortie sous public/ : code ${json(x.sousPublic.code)}, ${x.sousPublic.appels} appel(s), 2 et zéro attendus`)
    // 05/10/2026 (D-0510-A3, trou de juge vu par 026-101) : la règle « jamais sous public/ » était doublée par « jamais dans le dépôt » (le cas d'essai
    // était dans le dépôt : refusé par la première garde, la seconde ne se voyait pas). Ce cas-ci est HORS du dépôt, avec un segment public/ : seule la
    // règle sur public/ peut le refuser.
    if (!x.sousPublicHorsDepot) e.push('dossierSortie hors dépôt sous public/ : observation absente')
    else if (x.sousPublicHorsDepot.code !== 2 || x.sousPublicHorsDepot.appels !== 0) e.push(`dossierSortie hors du dépôt mais sous public/ : code ${json(x.sousPublicHorsDepot.code)}, ${x.sousPublicHorsDepot.appels} appel(s), 2 et zéro attendus (la règle « jamais sous public/ » doit suffire)`)
    if (x.coffreAbsent.code !== 3) e.push(`coffre absent : code ${json(x.coffreAbsent.code)}, 3 attendu`)
    if (x.coffreServiceRole.code !== 3) e.push(`coffre avec SUPABASE_SERVICE_ROLE_KEY : code ${json(x.coffreServiceRole.code)}, 3 attendu`)
    // Un coffre COMPLET (les deux variables permises) qui porte en plus une clé interdite : le seul cas où la garde se voit, un coffre incomplet étant refusé de toute façon.
    for (const [nom, c] of Object.entries(x.coffresMixtes ?? {})) if (c.code !== 3) e.push(`coffre complet + ${nom} : code ${json(c.code)}, 3 attendu (la clé interdite doit suffire à refuser le démarrage)`)
    if (x.litEnvLocal) e.push('.env.local est lu dans le source')
    return e
  },
  'AM-4': (x) => {
    const e = []
    for (const [nom, r] of Object.entries(x.cas)) if (r.maquettePrete) e.push(`${nom} : maquettePrete appelée, aucune attendue`)
    return e
  },
  'AM-5': (x) => {
    const e = []
    if (x.busAgentsBaisse !== 404) e.push(`busAgents baissé : statut ${x.busAgentsBaisse}, 404 attendu`)
    if (x.sansJeton !== 401) e.push(`sans jeton : statut ${x.sansJeton}, 401 attendu`)
    if (x.autreAgent !== 403) e.push(`jeton d'un autre agent : statut ${x.autreAgent}, 403 attendu`)
    if (!x.pauseTravail?.pause) e.push(`pause active, travail : ${json(x.pauseTravail)}, { pause: true } attendu`)
    for (const s of x.pauseAutres) if (s !== 423) e.push(`pause active, une autre route : statut ${s}, 423 attendu`)
    if (x.fuite) e.push(`une réponse contient une donnée personnelle (${x.fuite})`)
    return e
  },
  'AM-6': (x) => {
    const e = []
    if (x.varianteABaissee.avance !== 0) e.push(`varianteA baissé : ${x.varianteABaissee.avance} maquette(s) d'avance, zéro attendu`)
    if (x.deuxEntrants.n !== 2) e.push(`deux entrants vérifiés sans maquette : ${x.deuxEntrants.n} à fabriquer, 2 attendus`)
    if (x.entrantsPlafond.n !== 0) e.push(`entrants au-delà du plafond du jour : ${x.entrantsPlafond.n} de plus, zéro attendu`)
    if (x.douzeOui.n !== 10) e.push(`douze prospects froids oui : ${x.douzeOui.n} à fabriquer, 10 attendus (plafond du jour)`)
    if (!x.entrantsAvant) e.push('les entrants ne viennent pas avant les froids « oui »')
    if (x.entrantsFormulaires && x.entrantsFormulaires.some((n) => n !== 2)) e.push(`deux entrants, formulaire fermé puis ouvert : ${json(x.entrantsFormulaires)} à fabriquer, 2 et 2 attendus`)
    if (x.entrantsTousRendus === false) e.push('un entrant d\'empreinte impaire n\'est pas rendu : la parité ne vaut que pour la variante A')
    if (x.douzeOuiApres4 !== undefined && x.douzeOuiApres4 !== 6) e.push(`douze froids oui, 4 faites aujourd'hui : ${x.douzeOuiApres4} à fabriquer, 6 attendus`)
    if (x.avanceLevee) {
      if (x.avanceLevee.n !== 10) e.push(`varianteA levé, P1, 3 prêtes : ${json(x.avanceLevee.n)} d'avance demandées, 10 attendues (MAQUETTES_PAR_JOUR)`)
      if (x.avanceLevee.nSaturee !== 0) e.push(`varianteA levé, 25 prêtes non utilisées : ${json(x.avanceLevee.nSaturee)} d'avance, zéro attendu (jamais sous 0)`)
      if (x.avanceLevee.nPlafondJour !== 4) e.push(`varianteA levé, 6 faites aujourd'hui : ${json(x.avanceLevee.nPlafondJour)} d'avance, 4 attendues (10 − 6)`)
    }
    if (x.liensCrees !== undefined && !x.liensCrees) e.push('une maquette prête : le prospect ne sort pas dans liens_a_creer')
    if (x.battementSucces !== undefined && x.battementSucces !== 1) e.push(`réponse réussie : ${x.battementSucces} battement(s) atelier_maquettes, un seul attendu`)
    if (x.battementEnPause) e.push('le battement a eu lieu alors que la route était en pause')
    if (x.battementEnErreur) e.push('le battement a eu lieu alors que la route répondait en erreur')
    return e
  },
  'AM-7': (x) => {
    const e = []
    if (x.fauxJpeg.statut !== 422 || !x.fauxJpeg.objetsRetires) e.push(`JPEG annoncé qui commence par %PDF : statut ${x.fauxJpeg.statut}, objets retirés ${x.fauxJpeg.objetsRetires} (422 et true attendus)`)
    if (x.fauxJpeg.appelsMaquettePrete) e.push('JPEG annoncé qui commence par %PDF : une maquette prête a été enregistrée')
    if (x.empreinteFausse.statut !== 422) e.push(`empreinte fausse : statut ${x.empreinteFausse.statut}, 422 attendu`)
    if (x.empreinteFausse.appelsMaquettePrete) e.push('empreinte fausse : une maquette prête a été enregistrée')
    if (x.conforme.statut !== 200 || x.conforme.appelsMaquettePrete !== 1) e.push(`tout conforme : statut ${x.conforme.statut}, ${x.conforme.appelsMaquettePrete} appel(s) à enregistrerMaquettePrete, 200 et 1 attendus`)
    // La page privée (maquettesLien.ts) et la purge retrouvent chaque fichier par la table `objets` : sans elle, le lien envoyé est mort.
    if (x.conforme.objetsEnregistres === false) e.push('tout conforme : enregistrerMaquettePrete ne reçoit pas la table des trois objets (capture-telephone.jpg, capture-ordinateur.jpg, video.mp4) : la page privée ne les retrouverait pas')
    if (x.prospectHorsEtat && (x.prospectHorsEtat.statut !== 409 || x.prospectHorsEtat.appelsMaquettePrete)) e.push(`prospect qui n'attend pas de maquette : statut ${x.prospectHorsEtat.statut}, ${x.prospectHorsEtat.appelsMaquettePrete} enregistrement(s), 409 et zéro attendus`)
    return e
  },
  'AM-8': (x) => {
    const e = []
    if (!/^[0-9a-f]{64}$/.test(x.valeurCreerLien ?? '')) e.push(`valeur passée à creerLienMaquette : ${json(x.valeurCreerLien)}, un SHA-256 hex de 64 signes attendu`)
    if (x.valeurCreerLien === x.jeton) e.push('le jeton en clair a été passé à creerLienMaquette')
    if (x.jeton && x.valeurCreerLien && x.valeurCreerLien !== shaHex(x.jeton)) e.push('la valeur passée à creerLienMaquette n\'est pas le SHA-256 du jeton écrit dans le message')
    if (!x.messageContientLien || !x.messageContientPaiement || !x.messageContientRdv) e.push('le message préparé ne contient pas le lien de maquette, de paiement ou de rendez-vous')
    if (x.jugerMessageDisponible && x.jugerMessageOk === false) e.push(`le message préparé refusé par jugerMessage rejoué (${json(x.jugerMessageRaisons)})`)
    if (x.reponseContientJeton) e.push('la réponse HTTP contient le jeton en clair')
    if (x.reponseOk !== true) e.push(`un lien après un oui : réponse ${json(x.reponseJson)}, { ok: true } attendu (la ligne de la maquette rendue par la base n'a pas de champ etat)`)
    if (x.occupationHaute.statut !== 507 || x.occupationHaute.depose) e.push(`occupation à 61 % : statut ${x.occupationHaute.statut}, dépôt ${x.occupationHaute.depose} (507 et false attendus)`)
    if (x.occupationHaute.decisions !== 1) e.push(`occupation à 61 % : ${x.occupationHaute.decisions} décision(s) « stockage », une attendue`)
    return e
  },
  'AM-9': (x) => (x.applicable && !x.ok ? [`vraie passe (generer.mjs --maquette) : ${x.detail}`] : []),
  'AM-10': (x) => {
    const e = []
    for (const v of x.valeursCoffre) if (x.console.includes(v)) e.push(`la console contient une valeur du coffre (${court(v, 20)})`)
    if (/JETON-|[0-9a-zA-Z_-]{43}/.test(x.console)) e.push('la console contient un jeton (43 signes ou préfixe JETON-)')
    return e
  },
  'AM-11': (x) => {
    const e = []
    if (x.metaRecent.canal !== 'messagerie' || x.metaRecent.modele !== 'lien_maquette_entrant_meta_v1') e.push(`conversation à 2 h : canal ${json(x.metaRecent.canal)}, modèle ${json(x.metaRecent.modele)}`)
    if (x.emailAncien.canal !== 'email_sollicite' || x.emailAncien.envoyeur !== 'gmail' || x.emailAncien.modele !== 'lien_maquette_entrant_email_v1' || x.emailAncien.preuveType !== 'case_entrant') e.push(`conversation à 30 h avec adresse : ${json(x.emailAncien)}`)
    if (x.sansAdresse.raison !== 'aucune_adresse' || x.sansAdresse.jetonCree) e.push(`30 h sans adresse : raison ${json(x.sansAdresse.raison)}, jeton créé ${x.sansAdresse.jetonCree}`)
    if (x.sansGmail.raison !== 'en_attente_gmail' || x.sansGmail.rienCree === false) e.push(`sans variables Gmail : raison ${json(x.sansGmail.raison)}, rien créé ${x.sansGmail.rienCree} (en_attente_gmail et true attendus)`)
    if (x.froidOui.canal !== 'email_sollicite' || !x.froidOui.preuveEstOui) e.push(`froid ayant dit oui : ${json(x.froidOui)}`)
    if (x.froidOui.envoyeur !== undefined && (x.froidOui.envoyeur !== 'gmail' || !x.froidOui.destinataireEstExpediteur || !x.froidOui.filEstEnvoi)) e.push(`froid ayant dit oui : envoyeur ${json(x.froidOui.envoyeur)}, destinataire = expéditeur du oui ${x.froidOui.destinataireEstExpediteur}, fil = envoi auquel il répond ${x.froidOui.filEstEnvoi} (gmail, true et true attendus)`)
    if (x.froidOuiMeta && (x.froidOuiMeta.canal !== 'messagerie' || !x.froidOuiMeta.destinataireEstMetaId || !x.froidOuiMeta.conversationEstLaSienne)) e.push(`froid ayant dit oui sur Meta : ${json(x.froidOuiMeta)}, canal messagerie, destinataire = identifiant Meta de la personne (jamais l'identifiant de la conversation) et conversation_id de son fil attendus`)
    if (x.mentionneBoite) e.push('une route mentionne une boîte (boite / aucune_boite)')
    return e
  },
  'AM-12': (x) => {
    const e = []
    if (x.baisse.contientPaiement) e.push('siteAchatPublic baissé : le message contient encore le lien de paiement')
    if (x.baisse.modele !== undefined && !/_rdv_v1$/.test(x.baisse.modele)) e.push(`siteAchatPublic baissé : modèle ${json(x.baisse.modele)}, un modèle _rdv attendu`)
    if (!x.leve.contientPaiement) e.push('siteAchatPublic levé : le message ne contient pas le lien de paiement')
    if (!x.litActif) e.push('la route ne lit pas actif(\'siteAchatPublic\') dans le source')
    return e
  },
}
const DETAILS = {
  'AM-2': "chaque maquette.json : exactement entreprise, metier, ville, communes, modele, source_fait ; entrant sans fait → phrase et source exactes",
  'AM-3': "dossierSortie dans le dépôt, sous public/, ou hors du dépôt mais sous public/ → code 2, zéro lancement ; coffre absent ou avec une clé interdite → code 3, zéro réseau ; aucune lecture de .env.local",
  'AM-4': "capture de 0 octet, 1,4 Mo, uniforme, vidéo de 3,2 Mo, code 1 d'un lanceur → aucune maquette prête",
  'AM-5': "busAgents baissé → 404 ; sans jeton → 401 ; mauvais agent → 403 ; pause → { pause: true } sur travail, 423 ailleurs ; aucune donnée personnelle dans une réponse",
  'AM-6': "varianteA baissé → aucune avance ; entrants d'abord, plafonnés ; froids oui plafonnés au jour ; battement seulement hors pause",
  'AM-7': "%PDF annoncé JPEG → 422, objets retirés ; empreinte fausse → 422 ; tout conforme → une maquette prête",
  'AM-8': "creerLienMaquette reçoit un SHA-256, jamais le jeton ; message complet, conforme à jugerMessage ; réponse sans jeton ; 61 % d'occupation → 507, aucun dépôt",
  'AM-9': "si generer.mjs --maquette existe : une vraie passe donne deux captures décodables, non uniformes, de 1 Mo au plus",
  'AM-10': "la console ne contient aucune valeur du coffre, aucun jeton",
  'AM-11': "entrant à 2 h → messagerie ; à 30 h avec adresse → email_sollicite/gmail, preuve case_entrant ; sans adresse → aucune_adresse ; sans Gmail → en_attente_gmail ; froid oui → email_sollicite",
  'AM-12': "siteAchatPublic baissé → pas de lien de paiement, levé → présent ; lu dans le source",
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Les observations (mode normal : les vrais modules)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function observer(mod, RAC2) {
  const obs = {}
  const tente = async (id, f) => { try { obs[id] = await f() } catch (e) { obs[id] = { exception: premiereLigne(e) } } }
  const routeFichier = (nom) => path.join(RAC2, EXPORTS_ROUTES[nom])

  await tente('AM-2', async () => {
    const dossier = dossierEssai('am-2')
    fs.rmSync(dossier, { recursive: true, force: true })
    const magasinUsine = creerMagasinUsineFactice({ aFabriquer: [{ prospect_id: 'p1', cle: 'cle0000000000001', entreprise: 'Menuiserie Témoin', metier: 'menuisier', ville: 'Nantes', communes: ['Nantes'], fait: { extrait: 'Menuiserie Témoin, artisan à Nantes', url: 'https://menuiserie-temoin.invalid/', id: 'f'.repeat(16), lu_le: '2026-10-14T07:00:00.000Z' }, entrant: false }, { prospect_id: 'p2', cle: 'cle0000000000002', entreprise: 'Plomberie Témoin', metier: 'plombier', ville: 'Lyon', communes: ['Lyon'], fait: null, entrant: true }] })
    const H = creerHorloge(T0)
    const executer = creerExecuteurFactice({})
    await mod.passeAtelier({ magasin: magasinUsine, executer, horloge: H, dossierSortie: dossier })
    const lus = fs.existsSync(dossier) ? fs.readdirSync(dossier, { recursive: true }).filter((f) => String(f).endsWith('maquette.json')) : []
    const maquettesJson = lus.map((f) => JSON.parse(fs.readFileSync(path.join(dossier, f), 'utf8')))
    const entrantSansFait = maquettesJson.find((j) => j.metier === 'plombier')
    const avecFait = maquettesJson.find((j) => j.metier === 'menuisier')
    return { maquettesJson, entrantSansFait, dateAttendue: '14/10/2026', avecFait: { json: avecFait, extrait: 'Menuiserie Témoin, artisan à Nantes', url: 'https://menuiserie-temoin.invalid/', id: 'f'.repeat(16) } }
  })

  await tente('AM-3', async () => {
    const H = creerHorloge(T0)
    const appeler = async (dossierSortie) => {
      const executer = creerExecuteurFactice({})
      let code = 0
      try { await mod.passeAtelier({ magasin: creerMagasinUsineFactice({}), executer, horloge: H, dossierSortie }) } catch (e) { code = e?.code ?? 2 }
      return { code, appels: executer.appels.length }
    }
    const dansDepot = await appeler(R)
    const sousPublic = await appeler(path.join(R, 'public', 'atelier-essai-temoin'))
    const horsDepot = fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-am3-'))
    let sousPublicHorsDepot
    try { sousPublicHorsDepot = await appeler(path.join(horsDepot, 'public', 'atelier-essai-temoin')) } finally { fs.rmSync(horsDepot, { recursive: true, force: true }) }
    const dossierCoffre = dossierEssai('am-3-coffre')
    fs.rmSync(dossierCoffre, { recursive: true, force: true })
    fs.mkdirSync(path.join(dossierCoffre, '.config', 'presti'), { recursive: true })
    const lancer = (env) => spawnSync(process.execPath, ['--import', pathToFileURL(LOADER).href, path.join(RAC2, FICHIER_SCRIPT), '--une-passe'], { cwd: RAC2, encoding: 'utf8', timeout: 20_000, env: { ...process.env, HOME: dossierCoffre, USERPROFILE: dossierCoffre, PRESTI_URL: '', PRESTI_JETON_ATELIER: '' } })
    const coffreAbsent = lancer({})
    fs.writeFileSync(path.join(dossierCoffre, '.config', 'presti', 'agents.env'), 'SUPABASE_SERVICE_ROLE_KEY=x\n')
    const coffreServiceRole = lancer({})
    const coffresMixtes = {}
    for (const cle of ['SUPABASE_SERVICE_ROLE_KEY=essai', 'STRIPE_SECRET_KEY=essai', 'ANTHROPIC_API_KEY=essai']) {
      fs.writeFileSync(path.join(dossierCoffre, '.config', 'presti', 'agents.env'), `PRESTI_URL=http://127.0.0.1:9/
PRESTI_JETON_ATELIER=jeton-essai
${cle}
`)
      coffresMixtes[cle.split('=')[0]] = { code: lancer({}).status }
    }
    const src = fs.readFileSync(path.join(RAC2, FICHIER_SCRIPT), 'utf8')
    return { dansDepot, sousPublic, sousPublicHorsDepot, coffreAbsent: { code: coffreAbsent.status }, coffreServiceRole: { code: coffreServiceRole.status }, coffresMixtes, litEnvLocal: /\.env\.local/.test(sansCommentaires(src)) }
  })

  await tente('AM-4', async () => {
    const cas = {}
    // L'échantillon « uniforme » du jeu d'essai écrase aussi l'en-tête (le segment SOF disparaît) : il serait refusé pour cette seule raison.
    // Celui-ci garde TOUTE la structure (SOI, SOF, SOS, EOI) et n'uniformise que les données compressées qui suivent l'en-tête du scan.
    const uniformeSurDonnees = (b) => { const c = Buffer.from(b); let i = 2; while (i < c.length - 4) { if (c[i] !== 0xff) { i++; continue } const m = c[i + 1]; const l = c.readUInt16BE(i + 2); if (m === 0xda) { for (let k = i + 2 + l; k < c.length - 2; k++) c[k] = 0x41; break } i += 2 + l } return c }
    const executeurUniformeIntact = (cle) => {
      const base = creerExecuteurFactice({ [cle]: { capturer: 'ok' } })
      const ex = (commande, args = [], options = {}) => {
        const r = base(commande, args, options)
        if (/maquette-capturer.mjs/.test(args.join(' '))) { const d = args[args.length - 1]; for (const n of ['capture-bureau.jpg', 'capture-telephone.jpg']) { const fichier = path.join(d, n); if (fs.existsSync(fichier)) fs.writeFileSync(fichier, uniformeSurDonnees(fs.readFileSync(fichier))) } }
        return r
      }
      ex.appels = base.appels
      return ex
    }
    for (const [nom, sc] of Object.entries({ 'capture 0 octet': { capturer: 'zero' }, 'capture uniforme (structure intacte)': { uniforme: 'intact' }, 'capture 1,4 Mo': { capturer: 'lourde' }, 'capture uniforme': { capturer: 'uniforme' }, 'vidéo 3,2 Mo': { video: 'lourde' }, 'échec generer.mjs': { generer: 'echec' }, 'échec capturer': { capturer: 'echec' }, 'échec vidéo': { video: 'echec' } })) {
      const dossier = dossierEssai(`am-4-${nom.replace(/[^a-z0-9]+/gi, '-')}`)
      fs.rmSync(dossier, { recursive: true, force: true })
      const magasinUsine = creerMagasinUsineFactice({ aFabriquer: [{ prospect_id: 'p1', cle: 'clecasfautif0001', entreprise: 'Menuiserie Témoin', metier: 'menuisier', ville: 'Nantes', communes: ['Nantes'], fait: { extrait: 'Menuiserie Témoin, artisan à Nantes', url: 'https://menuiserie-temoin.invalid/', id: 'f'.repeat(16), lu_le: '2026-10-14T07:00:00.000Z' }, entrant: false }] })
      const executer = sc.uniforme === 'intact' ? executeurUniformeIntact('clecasfautif0001') : creerExecuteurFactice({ clecasfautif0001: sc })
      await mod.passeAtelier({ magasin: magasinUsine, executer, horloge: creerHorloge(T0), dossierSortie: dossier })
      cas[nom] = { maquettePrete: magasinUsine.maquettesPretes.length > 0 }
    }
    return { cas }
  })

  // Les quatre routes, chacune avec les trois refus de la garde : busAgents baissé → 404 ; sans jeton → 401 ; un autre agent → 403.
  const toutesLesRoutes = [['travail', 'GET'], ['depot', 'POST'], ['maquette', 'POST'], ['lien', 'POST']]
  const refusDe = async (nom, methode, comportements) => (await banc(routeFichier(nom), { methode, url: urlDe(nom), corps: methode === 'POST' ? {} : undefined, comportements })).statut
  await tente('AM-5', async () => {
    const parRoute = async (comportements) => { const r = []; for (const [nom, methode] of toutesLesRoutes) r.push(await refusDe(nom, methode, comportements)); return r }
    const busAgentsBaisse = (await parRoute({ actif: () => false })).find((s) => s !== 404) ?? 404
    const sansJeton = (await parRoute({ ...gardeOk(), authAgent: () => refusAgent(401, 'jeton') })).find((s) => s !== 401) ?? 401
    const autreAgent = (await parRoute({ ...gardeOk(), authAgent: () => ({ ...AGENT_ATELIER, nom: 'chef' }) })).find((s) => s !== 403) ?? 403
    const pauseTravail = (await banc(routeFichier('travail'), { url: urlDe('travail'), comportements: gardeOk({ pause: true }) })).json
    const pauseAutres = []
    for (const nom of ['depot', 'maquette', 'lien']) pauseAutres.push((await banc(routeFichier(nom), { methode: 'POST', url: urlDe(nom), corps: {}, comportements: gardeOk({ pause: true }) })).statut)
    // Une réponse réussie de `travail`, sur des prospects qui portent une adresse et un SIREN : aucune ne doit sortir.
    const avecAdresse = prospectEssai(1, { source: 'entrant', etape: 'verifie', canaux: [{ canal: 'email_sollicite', valeur: 'artisan.temoin@exemple.invalid', url_source: 'landing', nature: 'donnee_par_la_personne' }] })
    const t = await banc(routeFichier('travail'), { url: urlDe('travail'), comportements: comportementsTravail({ demandes: [avecAdresse, froidOuiEssai(2)], oui: [froidOuiEssai(3)] }) })
    const fuite = !t.json?.a_fabriquer?.length ? 'travail ne rend rien (l\'essai est vide)' : /@[\w.-]+\.\w+|81234567\d|[A-Za-z0-9_-]{43}/.test(t.texte ?? '') ? 'travail' : null
    return { busAgentsBaisse, sansJeton, autreAgent, pauseTravail, pauseAutres, fuite }
  })

  await tente('AM-6', async () => {
    const T = (o) => banc(routeFichier('travail'), { url: urlDe('travail'), comportements: comportementsTravail(o) })
    const aFabriquer = (r) => r.json?.a_fabriquer ?? []
    const appelsAvance = (r) => appelsDe(r, 'prospectsPourMaquette').filter((e) => e.args[1] === true)
    const A = (n) => prospectEssai(n, { etape: 'verifie', cle: `siren:avance${n}` })
    // Le banc remplace console et fetch le temps d'une route : jamais deux appels en même temps.
    const baissee = [await T({ avance: [A(1), A(2)], palier: 'P0' }), await T({ avance: [A(1), A(2)], palier: 'P4' })]
    const avance = baissee.reduce((n, r) => n + aFabriquer(r).length + appelsAvance(r).length, 0)
    const entrantsFormulaires = []
    for (const palier of ['P0', 'P2']) entrantsFormulaires.push(aFabriquer(await T({ demandes: [entrantEssai(1), entrantEssai(2)], palier })).filter((x) => x.entrant).length)
    const six = Array.from({ length: 6 }, (_, i) => entrantEssai(i + 1))
    const plafond = await T({ demandes: six, jour: { entrants_faites_aujourdhui: 5 } })
    const impair = await T({ demandes: [entrantEssai(1, { cle: 'instagram:impair-1' }), entrantEssai(2, { cle: 'instagram:pair-2' })] })
    const douze = Array.from({ length: 12 }, (_, i) => froidOuiEssai(i + 1))
    const douzeOui = await T({ demandes: douze })
    const douzeApres4 = await T({ demandes: douze, jour: { faites_aujourdhui: 4 } })
    const melange = await T({ demandes: [froidOuiEssai(1), entrantEssai(2), froidOuiEssai(3), entrantEssai(4)] })
    const prete = await T({ oui: [froidOuiEssai(7)] })
    const avanceLevee = await T({ avance: Array.from({ length: 12 }, (_, i) => A(i + 1)), palier: 'P1', drapeaux: { varianteA: true }, jour: { pretes_non_utilisees: 3 } })
    const avanceSaturee = await T({ avance: [A(1)], palier: 'P1', drapeaux: { varianteA: true }, jour: { pretes_non_utilisees: 25 } })
    const avancePlafondJour = await T({ avance: Array.from({ length: 12 }, (_, i) => A(i + 1)), palier: 'P1', drapeaux: { varianteA: true }, jour: { faites_aujourdhui: 6 } })
    const nAvance = (r) => appelsAvance(r)[0]?.args?.[0] ?? 0
    const battement = (r) => appelsDe(r, 'ops_battement').length
    const enPause = await banc(routeFichier('travail'), { url: urlDe('travail'), comportements: comportementsTravail({ demandes: [entrantEssai(1)], pause: true }) })
    const enErreur = await banc(routeFichier('travail'), { url: urlDe('travail'), comportements: { ...comportementsTravail({}), prospectsPourMaquette: () => { throw new Error('base injoignable') } } })
    return {
      varianteABaissee: { avance },
      deuxEntrants: { n: aFabriquer(await T({ demandes: [entrantEssai(1), entrantEssai(2)] })).filter((x) => x.entrant).length },
      entrantsFormulaires,
      entrantsPlafond: { n: aFabriquer(plafond).filter((x) => x.entrant).length },
      entrantsTousRendus: aFabriquer(impair).filter((x) => x.entrant).length === 2,
      douzeOui: { n: aFabriquer(douzeOui).length },
      douzeOuiApres4: aFabriquer(douzeApres4).length,
      entrantsAvant: aFabriquer(melange).length === 4 && aFabriquer(melange).slice(0, 2).every((x) => x.entrant) && aFabriquer(melange).slice(2).every((x) => !x.entrant),
      avanceLevee: { n: nAvance(avanceLevee), nSaturee: nAvance(avanceSaturee) + aFabriquer(avanceSaturee).length, nPlafondJour: nAvance(avancePlafondJour) },
      liensCrees: (prete.json?.liens_a_creer ?? []).includes(uuid(7)),
      battementSucces: battement(await T({ demandes: [entrantEssai(1)] })),
      battementEnPause: battement(enPause) > 0,
      battementEnErreur: battement(enErreur) > 0,
    }
  })

  // ── AM-7 : `maquette` relit chaque objet déposé ─────────────────────────────────────────────────────────────────────────
  await tente('AM-7', async () => {
    const pid = uuid(1)
    const noms = ['capture-telephone.jpg', 'capture-ordinateur.jpg', 'video.mp4']
    const objetsDe = Object.fromEntries(noms.map((n, i) => [n, `${pid}/${uuid(101 + i)}/${n}`]))
    const conformes = { 'capture-telephone.jpg': JPEG_TELEPHONE, 'capture-ordinateur.jpg': JPEG_ORDINATEUR, 'video.mp4': VIDEO_OK }
    const pdf = Buffer.from(`%PDF-1.4\n${'x'.repeat(400)}\n%%EOF`)
    const essai = async ({ octets, empreintes, prospects = [prospectEssai(1, { source: 'entrant', etape: 'verifie' })] }) => {
      const retires = []
      const stock = { from: () => ({ download: async (chemin) => { const k = noms.find((n) => objetsDe[n] === chemin); return k && octets[k] ? { data: new Blob([octets[k]]), error: null } : { data: null, error: { message: 'absent' } } }, remove: async (liste) => { retires.push(...liste); return { error: null } } }) }
      const r = await banc(routeFichier('maquette'), { methode: 'POST', url: urlDe('maquette'), corps: { prospect_id: pid, objets: objetsDe, empreintes: empreintes ?? Object.fromEntries(noms.map((n) => [n, shaHex(octets[n])])) }, comportements: { ...gardeOk(), ...stock, prospectsPourMaquette: () => prospects, enregistrerMaquettePrete: () => undefined } })
      const appels = appelsDe(r, 'enregistrerMaquettePrete')
      const infos = appels[0]?.args?.[1] ?? {}
      const objetsOk = noms.every((n) => infos.objets?.[n] === objetsDe[n]) && noms.every((n) => /^[0-9a-f]{64}$/.test(infos.empreintes?.[n] ?? ''))
      return { statut: r.statut, appelsMaquettePrete: appels.length, objetsRetires: noms.every((n) => retires.includes(objetsDe[n])), objetsEnregistres: objetsOk }
    }
    const fauxJpeg = await essai({ octets: { ...conformes, 'capture-telephone.jpg': pdf } })
    const empreinteFausse = await essai({ octets: conformes, empreintes: { ...Object.fromEntries(noms.map((n) => [n, shaHex(conformes[n])])), 'capture-ordinateur.jpg': 'a'.repeat(64) } })
    const conforme = await essai({ octets: conformes })
    const horsEtat = await essai({ octets: conformes, prospects: [] })
    return { fauxJpeg, empreinteFausse, conforme, prospectHorsEtat: { statut: horsEtat.statut, appelsMaquettePrete: horsEtat.appelsMaquettePrete } }
  })

  // ── AM-8, AM-11, AM-12 : `lien` ─────────────────────────────────────────────────────────────────────────────────────────
  const reelRedacteur = await importerDepuis(RAC2, 'lib/agents/acquisition/redacteur.ts')
  const reelLien = await importerDepuis(RAC2, 'lib/agents/acquisition/maquettesLien.ts')
  const ADRESSE_REPONSE = 'prospection@exemple.invalid'
  /** Une requête `POST lien`, sur les VRAIES `preparerMessageLien` (modèles du dépôt, approuvés) et `creerJeton` / `hacherJeton`. */
  async function scenarioLien({ p, maquette, conversation = null, reponses = [], drapeaux = {}, octetsOccupes = 1000, gmail = true } = {}) {
    const jetons = []
    const comportements = {
      ...gardeOk({ drapeaux }),
      prospectsOui: () => [p],
      // La ligne que rend acq_maquette_de : to_jsonb(ops.maquettes) — pas de champ `etat`.
      maquetteDe: () => maquette === undefined ? { id: uuid(900), prospect_id: p.id, objet: `${p.id}/${uuid(910)}/capture-telephone.jpg`, objets: {}, jeton_hache: null, expire_le: new Date(Date.now() + 15 * 86_400_000).toISOString(), purgee_le: null, prete_le: new Date().toISOString() } : maquette,
      conversation: () => conversation,
      reponsesARepondre: () => reponses,
      listBuckets: () => ({ data: [{ name: 'maquettes' }], error: null }),
      from: () => ({ list: async (prefixe) => (prefixe === '' ? { data: [{ id: 'o1', name: 'gros.mp4', metadata: { size: octetsOccupes } }], error: null } : { data: [], error: null }) }),
      creerDecision: () => ({ id: 'd1', cree: true }),
      creerJeton: () => { const j = reelLien.creerJeton(); jetons.push(j); return j },
      hacherJeton: reelLien.hacherJeton,
      expiration: reelLien.expiration,
      historiqueContacts: () => [],
      estOppose: () => false,
      preparerMessageLien: (pp, params, deps) => reelRedacteur.preparerMessageLien(pp, params, deps),
      creerLienMaquette: () => undefined,
      creerLienRdv: () => undefined,
      preparerEnvoi: () => ({ ok: true, id: 'envoi-essai' }),
    }
    const env0 = { a: process.env.ACQ_ADRESSE_REPONSE, u: process.env.PROSPECTION_GMAIL_USER, w: process.env.PROSPECTION_GMAIL_PASS }
    if (gmail) { process.env.ACQ_ADRESSE_REPONSE = ADRESSE_REPONSE; process.env.PROSPECTION_GMAIL_USER = 'u@exemple.invalid'; process.env.PROSPECTION_GMAIL_PASS = 'mdp-essai' }
    else { delete process.env.ACQ_ADRESSE_REPONSE; delete process.env.PROSPECTION_GMAIL_USER; delete process.env.PROSPECTION_GMAIL_PASS }
    let r
    try { r = await banc(routeFichier('lien'), { methode: 'POST', url: urlDe('lien'), corps: { prospect_id: p.id }, comportements }) }
    finally { for (const [k, v] of [['ACQ_ADRESSE_REPONSE', env0.a], ['PROSPECTION_GMAIL_USER', env0.u], ['PROSPECTION_GMAIL_PASS', env0.w]]) { if (v === undefined) delete process.env[k]; else process.env[k] = v } }
    const envoi = appelsDe(r, 'preparerEnvoi')[0]?.args?.[0] ?? null
    const liens = appelsDe(r, 'creerLienMaquette')
    return {
      r, envoi, jetons, texte: envoi?.texte ?? '', statut: r.statut, json: r.json,
      valeurCreerLien: liens[0]?.args?.[2], liensCrees: liens.length, rdvCrees: appelsDe(r, 'creerLienRdv').length, preparations: appelsDe(r, 'preparerEnvoi').length,
      decisions: appelsDe(r, 'creerDecision').filter((e) => e.args?.[0]?.type === 'stockage').length,
    }
  }
  const maintenant = Date.now()
  const iso = (ms) => new Date(ms).toISOString()
  const conversationEssai = (depuisMs, id = uuid(50)) => ({ id, plateforme: 'instagram', pseudo: 'artisan_essai', suit_le_compte: true, fenetre_jusqua: null, meta_id: 'meta-essai-1', dernier_message_recu_le: iso(maintenant - depuisMs) })
  const canalAdresse = [{ canal: 'email_sollicite', valeur: 'artisan.temoin@exemple.invalid', url_source: 'landing:formulaire', nature: 'donnee_par_la_personne' }]
  const ouiDe = (pid, o = {}) => ({ id: 'reponse-oui-1', id_externe: 'ext-1', envoi_id: 'envoi-0', conversation_id: null, prospect_id: pid, canal: 'email_sollicite', source: 'courriel', texte: 'Oui, je veux bien.', auto: false, accuse_site: false, en_reponse_a: null, expediteur: 'artisan.temoin@exemple.invalid', recu_le: iso(maintenant - 3600_000), classement: { classe: 'oui' }, notre_dernier_envoi_le: null, notre_dernier_envoi_type: 'premier_contact', ...o })
  const TEXTE_ROUTES = Object.values(EXPORTS_ROUTES).map((f) => sansCommentaires(fs.readFileSync(path.join(RAC2, f), 'utf8'))).join('\n')

  await tente('AM-8', async () => {
    const froid = froidOuiEssai(1)
    const s = await scenarioLien({ p: froid, reponses: [ouiDe(froid.id)] })
    const jeton = s.jetons[0] ?? null
    const messageLien = s.texte.match(/https:\/\/prestiapp\.fr\/maquette\/([A-Za-z0-9_-]{43})/)
    const haute = await scenarioLien({ p: froidOuiEssai(2), reponses: [ouiDe(uuid(2))], octetsOccupes: Math.ceil(0.61 * 1024 * 1048576) })
    return {
      valeurCreerLien: s.valeurCreerLien, jeton: jeton ?? messageLien?.[1] ?? null,
      messageContientLien: !!messageLien, messageContientPaiement: s.texte.includes('https://prestiapp.fr/site/acheter'), messageContientRdv: /https:\/\/prestiapp\.fr\/rendez-vous\/[A-Za-z0-9_-]{43}/.test(s.texte),
      // `preparerMessageLien` passe le message au second juge `jugerMessage` avant de le rendre : un message refusé ne vient jamais jusqu'ici.
      jugerMessageDisponible: true, jugerMessageOk: s.envoi !== null, jugerMessageRaisons: s.json?.raison ? [s.json.raison] : [],
      reponseContientJeton: jeton ? (s.r.texte ?? '').includes(jeton) : false, reponseOk: s.json?.ok === true, reponseJson: s.json,
      occupationHaute: { statut: haute.statut, depose: haute.liensCrees > 0 || haute.preparations > 0, decisions: haute.decisions },
    }
  })

  await tente('AM-11', async () => {
    const entrant = (o = {}) => entrantEssai(1, { etape: 'maquette_prete', conversation_id: uuid(50), canaux: canalAdresse, ...o })
    const meta = await scenarioLien({ p: entrant(), conversation: conversationEssai(2 * 3600_000) })
    const ancien = await scenarioLien({ p: entrant(), conversation: conversationEssai(30 * 3600_000) })
    const sansAdresse = await scenarioLien({ p: entrant({ canaux: [] }), conversation: conversationEssai(30 * 3600_000) })
    const sansGmail = await scenarioLien({ p: entrant(), conversation: conversationEssai(30 * 3600_000), gmail: false })
    const froid = froidOuiEssai(2)
    const oui = ouiDe(froid.id)
    const froidOui = await scenarioLien({ p: froid, reponses: [oui] })
    const froidMeta = froidOuiEssai(3, { conversation_id: uuid(60) })
    const ouiMeta = ouiDe(froidMeta.id, { canal: 'messagerie', source: 'meta', conversation_id: uuid(60), expediteur: null })
    const froidOuiMeta = await scenarioLien({ p: froidMeta, reponses: [ouiMeta], conversation: conversationEssai(3600_000, uuid(60)) })
    const sans = (s) => s.liensCrees === 0 && s.jetons.length === 0 && s.preparations === 0
    return {
      metaRecent: { canal: meta.envoi?.canal ?? null, modele: meta.envoi?.modele_id ?? null },
      emailAncien: { canal: ancien.envoi?.canal ?? null, envoyeur: ancien.envoi?.envoyeur ?? null, modele: ancien.envoi?.modele_id ?? null, preuveType: ancien.envoi?.preuve_demande?.type ?? null },
      sansAdresse: { raison: sansAdresse.json?.raison ?? null, jetonCree: !sans(sansAdresse) },
      sansGmail: { raison: sansGmail.json?.raison ?? null, rienCree: sans(sansGmail) },
      froidOui: { canal: froidOui.envoi?.canal ?? null, preuveEstOui: froidOui.envoi?.preuve_demande?.type === 'message_recu' && froidOui.envoi?.preuve_demande?.id === oui.id, envoyeur: froidOui.envoi?.envoyeur ?? null, destinataireEstExpediteur: froidOui.envoi?.destinataire === oui.expediteur, filEstEnvoi: froidOui.envoi?.fil_envoi_id === oui.envoi_id },
      froidOuiMeta: { canal: froidOuiMeta.envoi?.canal ?? null, destinataireEstMetaId: froidOuiMeta.envoi?.destinataire === 'meta-essai-1', conversationEstLaSienne: froidOuiMeta.envoi?.conversation_id === uuid(60) },
      mentionneBoite: /\baucune_boite\b|\bboite\b|\bboîte\b/i.test(TEXTE_ROUTES),
    }
  })

  await tente('AM-12', async () => {
    const froid = froidOuiEssai(1)
    const baisse = await scenarioLien({ p: froid, reponses: [ouiDe(froid.id)], drapeaux: { siteAchatPublic: false } })
    const leve = await scenarioLien({ p: froid, reponses: [ouiDe(froid.id)], drapeaux: { siteAchatPublic: true } })
    return { baisse: { contientPaiement: baisse.texte.includes('https://prestiapp.fr/site/acheter'), modele: baisse.envoi?.modele_id }, leve: { contientPaiement: leve.texte.includes('https://prestiapp.fr/site/acheter') }, litActif: /actif\(\s*['"]siteAchatPublic['"]\s*\)/.test(TEXTE_ROUTES) }
  })

  await tente('AM-9', async () => {
    const generer = path.join(RAC2, 'public', 'sites-demo', 'generer.mjs')
    if (!fs.existsSync(generer)) return { applicable: false, ok: true, detail: 'generer.mjs absent' }
    return { applicable: false, ok: true, detail: 'passe réelle non lancée par ce juge (coûteuse) : à vérifier lors de la mise en service (026-097)' }
  })

  await tente('AM-10', async () => {
    const dossier = dossierEssai('am-10')
    fs.rmSync(dossier, { recursive: true, force: true })
    const magasinUsine = creerMagasinUsineFactice({ aFabriquer: [{ prospect_id: 'p1', cle: 'clejetontemoinam10', entreprise: 'Domaine Secret Témoin', metier: 'menuisier', ville: 'Nantes', communes: ['Nantes'], fait: null, entrant: false }] })
    const executer = creerExecuteurFactice({})
    let texteConsole = ''
    const orig = console.log
    console.log = (...a) => { texteConsole += `${a.join(' ')}\n` }
    try { await mod.passeAtelier({ magasin: magasinUsine, executer, horloge: creerHorloge(T0), dossierSortie: dossier }) } finally { console.log = orig }
    return { console: texteConsole, valeursCoffre: ['PRESTI_JETON_ATELIER_VALEUR_TEMOIN', 'Domaine Secret Témoin'] }
  })

  return obs
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function jeuxLisibles() {
  const e = []
  if (JPEG_TELEPHONE.length < 100 || JPEG_ORDINATEUR.length < 100 || VIDEO_OK.length < 100) e.push('un fichier d\'essai est vide ou trop petit')
  if (jpegZeroOctet().length !== 0) e.push('jpegZeroOctet ne rend pas un tampon vide')
  if (jpegLourde().length < 1024 * 1024) e.push('jpegLourde fait moins de 1 Mo')
  if (jpegUniforme().length !== JPEG_TELEPHONE.length) e.push('jpegUniforme change la taille de l\'image')
  if (videoLourde().length < 3 * 1024 * 1024) e.push('videoLourde fait moins de 3 Mo')
  const S = creerStockageFactice({ occupationOctets: 100 })
  return { e, detail: `exécuteur factice, JPEG (${JPEG_TELEPHONE.length}/${JPEG_ORDINATEUR.length} o), MP4 (${VIDEO_OK.length} o), stockage factice (occupation ${100}) chargés` }
}
function obsBase() {
  const jeton = 'x'.repeat(43)
  return {
    'AM-2': {
      maquettesJson: [{ entreprise: 'x', metier: 'menuisier', ville: 'Nantes', communes: ['Nantes'], modele: 'menuisier', source_fait: { fait: 'x', source: 'ademe_rge', repere: 'f1', releve_le: '2026-10-14' } }],
      entrantSansFait: { source_fait: { fait: "Maquette demandée par l'entreprise le 14/10/2026", source: 'demande', repere: 'entrant', releve_le: '2026-10-14T08:00:00.000Z' } }, dateAttendue: '14/10/2026',
      avecFait: { json: { source_fait: { fait: 'extrait', source: 'https://x.invalid/', repere: 'f1', releve_le: '2026-10-14' } }, extrait: 'extrait', url: 'https://x.invalid/', id: 'f1' },
    },
    'AM-3': { dansDepot: { code: 2, appels: 0 }, sousPublic: { code: 2, appels: 0 }, sousPublicHorsDepot: { code: 2, appels: 0 }, coffreAbsent: { code: 3 }, coffreServiceRole: { code: 3 }, coffresMixtes: { SUPABASE_SERVICE_ROLE_KEY: { code: 3 }, STRIPE_SECRET_KEY: { code: 3 } }, litEnvLocal: false },
    'AM-4': { cas: Object.fromEntries(['capture 0 octet', 'capture uniforme (structure intacte)', 'capture 1,4 Mo', 'capture uniforme', 'vidéo 3,2 Mo', 'échec generer.mjs', 'échec capturer', 'échec vidéo'].map((n) => [n, { maquettePrete: false }])) },
    'AM-5': { busAgentsBaisse: 404, sansJeton: 401, autreAgent: 403, pauseTravail: { pause: true }, pauseAutres: [423, 423, 423], fuite: null },
    'AM-6': { varianteABaissee: { avance: 0 }, deuxEntrants: { n: 2 }, entrantsFormulaires: [2, 2], entrantsPlafond: { n: 0 }, entrantsTousRendus: true, douzeOui: { n: 10 }, douzeOuiApres4: 6, entrantsAvant: true, avanceLevee: { n: 10, nSaturee: 0, nPlafondJour: 4 }, liensCrees: true, battementSucces: 1, battementEnPause: false, battementEnErreur: false },
    'AM-7': { fauxJpeg: { statut: 422, objetsRetires: true, appelsMaquettePrete: 0 }, empreinteFausse: { statut: 422, appelsMaquettePrete: 0 }, conforme: { statut: 200, appelsMaquettePrete: 1, objetsEnregistres: true }, prospectHorsEtat: { statut: 409, appelsMaquettePrete: 0 } },
    'AM-8': { valeurCreerLien: shaHex(jeton), jeton, messageContientLien: true, messageContientPaiement: true, messageContientRdv: true, jugerMessageDisponible: true, jugerMessageOk: true, jugerMessageRaisons: [], reponseContientJeton: false, reponseOk: true, reponseJson: { ok: true }, occupationHaute: { statut: 507, depose: false, decisions: 1 } },
    'AM-9': { applicable: false, ok: true, detail: 'non applicable' },
    'AM-10': { console: 'atelier : 3 maquette(s) fabriquée(s)\n', valeursCoffre: ['JETON-SECRET-TEMOIN'] },
    'AM-11': { metaRecent: { canal: 'messagerie', modele: 'lien_maquette_entrant_meta_v1' }, emailAncien: { canal: 'email_sollicite', envoyeur: 'gmail', modele: 'lien_maquette_entrant_email_v1', preuveType: 'case_entrant' }, sansAdresse: { raison: 'aucune_adresse', jetonCree: false }, sansGmail: { raison: 'en_attente_gmail', rienCree: true }, froidOui: { canal: 'email_sollicite', preuveEstOui: true, envoyeur: 'gmail', destinataireEstExpediteur: true, filEstEnvoi: true }, froidOuiMeta: { canal: 'messagerie', destinataireEstMetaId: true, conversationEstLaSienne: true }, mentionneBoite: false },
    'AM-12': { baisse: { contientPaiement: false, modele: 'lien_maquette_email_rdv_v1' }, leve: { contientPaiement: true }, litActif: true },
  }
}
function muter(base, id, m) { const x = JSON.parse(JSON.stringify(base[id])); m(x); return x }
function echantillons() {
  const b = obsBase()
  return {
    'AM-2': [['conforme', b['AM-2'], false], ['clé photo en trop', muter(b, 'AM-2', (x) => { x.maquettesJson[0].photo = 'y' }), true], ['phrase entrant différente', muter(b, 'AM-2', (x) => { x.entrantSansFait.source_fait.fait = 'Maquette demandée le 1/1' }), true], ['gabarit JJ/MM/AAAA recopié tel quel', muter(b, 'AM-2', (x) => { x.entrantSansFait.source_fait.fait = "Maquette demandée par l'entreprise le JJ/MM/AAAA" }), true], ['une autre date que celle du passage', muter(b, 'AM-2', (x) => { x.entrantSansFait.source_fait.fait = "Maquette demandée par l'entreprise le 15/10/2026" }), true], ["le fait n'est pas l'extrait reçu", muter(b, 'AM-2', (x) => { x.avecFait.json.source_fait.fait = 'autre chose' }), true]],
    'AM-3': [['conforme', b['AM-3'], false], ['un appel malgré le dossier interdit', muter(b, 'AM-3', (x) => { x.dansDepot.appels = 1 }), true], ['dossier hors dépôt sous public/ accepté', muter(b, 'AM-3', (x) => { x.sousPublicHorsDepot = { code: 0, appels: 3 } }), true], ['observation hors dépôt absente', muter(b, 'AM-3', (x) => { delete x.sousPublicHorsDepot }), true], ['.env.local lu', muter(b, 'AM-3', (x) => { x.litEnvLocal = true }), true], ['coffre complet + clé de service accepté', muter(b, 'AM-3', (x) => { x.coffresMixtes.SUPABASE_SERVICE_ROLE_KEY.code = 1 }), true]],
    'AM-4': [['conforme', b['AM-4'], false], ['une maquette prête malgré une capture vide', muter(b, 'AM-4', (x) => { x.cas['capture 0 octet'].maquettePrete = true }), true]],
    'AM-5': [['conforme', b['AM-5'], false], ['200 sans jeton', muter(b, 'AM-5', (x) => { x.sansJeton = 200 }), true], ['une adresse dans une réponse', muter(b, 'AM-5', (x) => { x.fuite = 'travail' }), true], ['la pause ne coupe pas travail', muter(b, 'AM-5', (x) => { x.pauseTravail = {} }), true]],
    'AM-6': [['conforme', b['AM-6'], false], ['avance malgré varianteA baissé', muter(b, 'AM-6', (x) => { x.varianteABaissee.avance = 2 }), true], ['dix prospects oui à fabriquer', muter(b, 'AM-6', (x) => { x.douzeOui.n = 12 }), true], ['entrants au-delà du plafond', muter(b, 'AM-6', (x) => { x.entrantsPlafond.n = 1 }), true], ['formulaire fermé : aucun entrant', muter(b, 'AM-6', (x) => { x.entrantsFormulaires = [0, 2] }), true], ['avance sous zéro', muter(b, 'AM-6', (x) => { x.avanceLevee.nSaturee = 3 }), true], ['le prospect prêt ne sort pas', muter(b, 'AM-6', (x) => { x.liensCrees = false }), true], ['battement en erreur', muter(b, 'AM-6', (x) => { x.battementEnErreur = true }), true]],
    'AM-7': [['conforme', b['AM-7'], false], ['%PDF accepté', muter(b, 'AM-7', (x) => { x.fauxJpeg.statut = 200 }), true], ['maquette sans la table des objets', muter(b, 'AM-7', (x) => { x.conforme.objetsEnregistres = false }), true], ['prospect hors état accepté', muter(b, 'AM-7', (x) => { x.prospectHorsEtat.statut = 200 }), true]],
    'AM-8': [['conforme', b['AM-8'], false], ['le jeton en clair passé', muter(b, 'AM-8', (x) => { x.valeurCreerLien = x.jeton }), true], ["dépôt malgré 61 % d'occupation", muter(b, 'AM-8', (x) => { x.occupationHaute.depose = true }), true], ['lien refusé 409 faute de champ etat', muter(b, 'AM-8', (x) => { x.reponseOk = false; x.reponseJson = { ok: false, raison: 'etat' } }), true]],
    'AM-9': [['conforme', b['AM-9'], false], ['une passe réelle en échec', muter(b, 'AM-9', (x) => { x.applicable = true; x.ok = false; x.detail = 'capture non décodable' }), true]],
    'AM-10': [['conforme', b['AM-10'], false], ['une valeur du coffre dans la console', muter(b, 'AM-10', (x) => { x.console += 'JETON-SECRET-TEMOIN\n' }), true]],
    'AM-11': [['conforme', b['AM-11'], false], ['jeton créé sans adresse', muter(b, 'AM-11', (x) => { x.sansAdresse.jetonCree = true }), true], ['une route mentionne une boîte', muter(b, 'AM-11', (x) => { x.mentionneBoite = true }), true], ['sur Meta, la conversation prise pour destinataire', muter(b, 'AM-11', (x) => { x.froidOuiMeta.destinataireEstMetaId = false }), true]],
    'AM-12': [['conforme', b['AM-12'], false], ['paiement présent malgré le drapeau baissé', muter(b, 'AM-12', (x) => { x.baisse.contientPaiement = true }), true]],
  }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const ids = o.autoControle ? ['AC-1', 'AC-2', 'AC-3'] : IDS.slice()
const s = creerSortie(NOM, ids, `${NOM} — racine ${rel(RAC)} — jeux d'essai du dépôt du juge (scripts/fixtures/026-acquisition/maquettes, magasin-memoire, cli/banc-crochet)`)
if (o.autoControle) {
  try { const r = jeuxLisibles(); s.juger('AC-1', r.e, r.detail) } catch (e) { s.echoue('AC-1', `interrompu : ${premiereLigne(e)}`) }
  try {
    const l = await scenarioMagasin()
    const manquantes = REGLES_JP6.filter((k) => !l.some((x) => x.cle === k))
    s.juger('AC-2', [...l.filter((x) => !x.ok).map((x) => `${x.nom} : obtenu ${court(json(x.obtenu), 80)}`), ...manquantes.map((k) => `règle ${k} absente du scénario`)], `magasin-memoire : ${l.length} règles vertes sur son scénario, dont les ${REGLES_JP6.length} de JP-6`)
  } catch (e) { s.echoue('AC-2', `interrompu : ${premiereLigne(e)}`) }
  try {
    const E = echantillons()
    const e = [], compte = { conformes: 0, fautifs: 0 }
    for (const id of IDS.slice(1)) {
      const liste = E[id]
      if (!liste || !liste.some(([, , rouge]) => rouge) || !liste.some(([, , rouge]) => !rouge)) { e.push(`${id} : pas d'échantillon conforme et fautif`); continue }
      for (const [nom, x, rouge] of liste) {
        let d
        try { d = C[id](x) } catch (err) { d = [`contrôle interrompu : ${premiereLigne(err)}`] }
        if (rouge && !d.length) e.push(`${id} : l'échantillon fautif « ${nom} » n'est pas repéré`)
        if (!rouge && d.length) e.push(`${id} : l'échantillon conforme « ${nom} » est refusé (${court(d[0], 100)})`)
        compte[rouge ? 'fautifs' : 'conformes']++
      }
    }
    s.juger('AC-3', e, `${compte.fautifs} échantillons fautifs repérés et ${compte.conformes} conformes acceptés par les contrôles AM-2 à AM-12`)
  } catch (e) { s.echoue('AC-3', `interrompu : ${premiereLigne(e)}`) }
} else {
  const fScript = path.join(RAC, FICHIER_SCRIPT)
  const fMagasin = path.join(RAC, FICHIER_MAGASIN_USINE)
  const e1 = []
  if (!fs.existsSync(fScript)) e1.push(`module absent : ${rel(fScript)}`)
  if (!fs.existsSync(fMagasin)) e1.push(`module absent : ${rel(fMagasin)}`)
  for (const [nom, p] of Object.entries(EXPORTS_ROUTES)) if (!fs.existsSync(path.join(RAC, p))) e1.push(`route absente : ${p}`)
  let mod = null
  if (!e1.length) {
    try { mod = await importerDepuis(RAC, FICHIER_SCRIPT) } catch (e) { e1.push(`${FICHIER_SCRIPT} ne s'importe pas : ${premiereLigne(e)}`) }
    if (mod && typeof mod.passeAtelier !== 'function') e1.push('export passeAtelier absent (ou pas une fonction)')
  }
  s.juger('AM-1', e1, `${FICHIER_SCRIPT}, ${FICHIER_MAGASIN_USINE} et les quatre routes de ${rel(RAC)} : présence et export passeAtelier`)
  if (e1.length) s.nonJuges(IDS.slice(1), 'AM-1 en échec')
  else {
    let obs
    try { obs = await observer(mod, RAC) } catch (e) { s.nonJuges(IDS.slice(1), `observation interrompue : ${premiereLigne(e)}`) }
    if (obs) for (const id of IDS.slice(1)) {
      const x = obs[id]
      if (!x) { s.echoue(id, 'non observé'); continue }
      if (x.exception && Object.keys(x).length === 1) { s.echoue(id, `interrompu : ${x.exception}`); continue }
      let d
      try { d = C[id](x) } catch (e) { d = [`contrôle interrompu : ${premiereLigne(e)}`] }
      s.juger(id, d, DETAILS[id] ?? 'conforme')
    }
  }
}
piege.retirer()
if (piege.tentatives.length) s.echoue(ids[0], `accès au réseau tenté pendant le juge : ${court(piege.tentatives.join(' ; '), 200)}`)
process.exit(s.finir())
