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
async function banc(fichier, { methode = 'GET', url, entetes = {}, corps, comportements = {}, valeurs = {} } = {}) {
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

/** Les comportements communs des doublures pour un appel qui doit passer la garde (busAgents, jeton, pause). */
function gardeOk({ pause = false } = {}) {
  return {
    actif: (flag) => (flag === 'busAgents' ? true : flag === 'varianteA' ? false : flag === 'siteAchatPublic' ? true : false),
    authAgent: () => ({ ok: true, agent: 'atelier_maquettes' }),
    pauseGenerale: () => (pause ? { active: true, source: 'variable' } : { active: false, source: 'base' }),
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
    if (x.entrantSansFait && (x.entrantSansFait.source_fait?.fait !== 'Maquette demandée par l\'entreprise le JJ/MM/AAAA' || x.entrantSansFait.source_fait?.source !== 'demande')) e.push(`entrant sans fait : source_fait ${json(x.entrantSansFait?.source_fait)}`)
    return e
  },
  'AM-3': (x) => {
    const e = []
    if (x.dansDepot.code !== 2 || x.dansDepot.appels !== 0) e.push(`dossierSortie dans le dépôt : code ${json(x.dansDepot.code)}, ${x.dansDepot.appels} appel(s), 2 et zéro attendus`)
    if (x.sousPublic.code !== 2 || x.sousPublic.appels !== 0) e.push(`dossierSortie sous public/ : code ${json(x.sousPublic.code)}, ${x.sousPublic.appels} appel(s), 2 et zéro attendus`)
    if (x.coffreAbsent.code !== 3) e.push(`coffre absent : code ${json(x.coffreAbsent.code)}, 3 attendu`)
    if (x.coffreServiceRole.code !== 3) e.push(`coffre avec SUPABASE_SERVICE_ROLE_KEY : code ${json(x.coffreServiceRole.code)}, 3 attendu`)
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
    if (x.battementEnPause) e.push('le battement a eu lieu alors que la route était en pause')
    return e
  },
  'AM-7': (x) => {
    const e = []
    if (x.fauxJpeg.statut !== 422 || !x.fauxJpeg.objetsRetires) e.push(`JPEG annoncé qui commence par %PDF : statut ${x.fauxJpeg.statut}, objets retirés ${x.fauxJpeg.objetsRetires} (422 et true attendus)`)
    if (x.empreinteFausse.statut !== 422) e.push(`empreinte fausse : statut ${x.empreinteFausse.statut}, 422 attendu`)
    if (x.conforme.statut !== 200 || x.conforme.appelsMaquettePrete !== 1) e.push(`tout conforme : statut ${x.conforme.statut}, ${x.conforme.appelsMaquettePrete} appel(s) à enregistrerMaquettePrete, 200 et 1 attendus`)
    return e
  },
  'AM-8': (x) => {
    const e = []
    if (!/^[0-9a-f]{64}$/.test(x.valeurCreerLien ?? '')) e.push(`valeur passée à creerLienMaquette : ${json(x.valeurCreerLien)}, un SHA-256 hex de 64 signes attendu`)
    if (x.valeurCreerLien === x.jeton) e.push('le jeton en clair a été passé à creerLienMaquette')
    if (!x.messageContientLien || !x.messageContientPaiement || !x.messageContientRdv) e.push('le message préparé ne contient pas le lien de maquette, de paiement ou de rendez-vous')
    if (x.jugerMessageDisponible && x.jugerMessageOk === false) e.push(`le message préparé refusé par jugerMessage rejoué (${json(x.jugerMessageRaisons)})`)
    if (x.reponseContientJeton) e.push('la réponse HTTP contient le jeton en clair')
    if (x.occupationHaute.statut !== 507 || x.occupationHaute.depose) e.push(`occupation à 61 % : statut ${x.occupationHaute.statut}, dépôt ${x.occupationHaute.depose} (507 et false attendus)`)
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
    if (x.sansGmail.raison !== 'en_attente_gmail') e.push(`sans variables Gmail : raison ${json(x.sansGmail.raison)}, en_attente_gmail attendu`)
    if (x.froidOui.canal !== 'email_sollicite' || !x.froidOui.preuveEstOui) e.push(`froid ayant dit oui : ${json(x.froidOui)}`)
    if (x.mentionneBoite) e.push('une route mentionne une boîte (boite / aucune_boite)')
    return e
  },
  'AM-12': (x) => {
    const e = []
    if (x.baisse.contientPaiement) e.push('siteAchatPublic baissé : le message contient encore le lien de paiement')
    if (!x.leve.contientPaiement) e.push('siteAchatPublic levé : le message ne contient pas le lien de paiement')
    if (!x.litActif) e.push('la route ne lit pas actif(\'siteAchatPublic\') dans le source')
    return e
  },
}
const DETAILS = {
  'AM-2': "chaque maquette.json : exactement entreprise, metier, ville, communes, modele, source_fait ; entrant sans fait → phrase et source exactes",
  'AM-3': "dossierSortie dans le dépôt ou public/ → code 2, zéro lancement ; coffre absent ou avec une clé interdite → code 3, zéro réseau ; aucune lecture de .env.local",
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
    return { maquettesJson, entrantSansFait }
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
    const dossierCoffre = dossierEssai('am-3-coffre')
    fs.rmSync(dossierCoffre, { recursive: true, force: true })
    fs.mkdirSync(path.join(dossierCoffre, '.config', 'presti'), { recursive: true })
    const lancer = (env) => spawnSync(process.execPath, ['--import', pathToFileURL(LOADER).href, path.join(RAC2, FICHIER_SCRIPT), '--une-passe'], { cwd: RAC2, encoding: 'utf8', timeout: 20_000, env: { ...process.env, HOME: dossierCoffre, USERPROFILE: dossierCoffre, PRESTI_URL: '', PRESTI_JETON_ATELIER: '' } })
    const coffreAbsent = lancer({})
    fs.writeFileSync(path.join(dossierCoffre, '.config', 'presti', 'agents.env'), 'SUPABASE_SERVICE_ROLE_KEY=x\n')
    const coffreServiceRole = lancer({})
    const src = fs.readFileSync(path.join(RAC2, FICHIER_SCRIPT), 'utf8')
    return { dansDepot, sousPublic, coffreAbsent: { code: coffreAbsent.status }, coffreServiceRole: { code: coffreServiceRole.status }, litEnvLocal: /\.env\.local/.test(sansCommentaires(src)) }
  })

  await tente('AM-4', async () => {
    const cas = {}
    for (const [nom, sc] of Object.entries({ 'capture 0 octet': { capturer: 'zero' }, 'capture 1,4 Mo': { capturer: 'lourde' }, 'capture uniforme': { capturer: 'uniforme' }, 'vidéo 3,2 Mo': { video: 'lourde' }, 'échec generer.mjs': { generer: 'echec' }, 'échec capturer': { capturer: 'echec' }, 'échec vidéo': { video: 'echec' } })) {
      const dossier = dossierEssai(`am-4-${nom.replace(/[^a-z0-9]+/gi, '-')}`)
      fs.rmSync(dossier, { recursive: true, force: true })
      const magasinUsine = creerMagasinUsineFactice({ aFabriquer: [{ prospect_id: 'p1', cle: 'clecasfautif0001', entreprise: 'Menuiserie Témoin', metier: 'menuisier', ville: 'Nantes', communes: ['Nantes'], fait: { extrait: 'Menuiserie Témoin, artisan à Nantes', url: 'https://menuiserie-temoin.invalid/', id: 'f'.repeat(16), lu_le: '2026-10-14T07:00:00.000Z' }, entrant: false }] })
      const executer = creerExecuteurFactice({ clecasfautif0001: sc })
      await mod.passeAtelier({ magasin: magasinUsine, executer, horloge: creerHorloge(T0), dossierSortie: dossier })
      cas[nom] = { maquettePrete: magasinUsine.maquettesPretes.length > 0 }
    }
    return { cas }
  })

  await tente('AM-5', async () => {
    const busAgentsBaisse = (await banc(routeFichier('travail'), { comportements: { actif: () => false } })).statut
    const sansJeton = (await banc(routeFichier('travail'), { comportements: { actif: () => true, authAgent: () => ({ ok: false, statut: 401 }) } })).statut
    const autreAgent = (await banc(routeFichier('travail'), { comportements: { actif: () => true, authAgent: () => ({ ok: false, statut: 403 }) } })).statut
    const pauseTravail = (await banc(routeFichier('travail'), { comportements: gardeOk({ pause: true }) })).json
    const pauseAutres = []
    for (const nom of ['depot', 'maquette', 'lien']) pauseAutres.push((await banc(routeFichier(nom), { methode: 'POST', corps: {}, comportements: gardeOk({ pause: true }) })).statut)
    const t = await banc(routeFichier('travail'), { comportements: gardeOk() })
    const fuite = /@[\w.-]+\.\w+|8123456\d{2}|[A-Za-z0-9_-]{43}/.test(t.texte ?? '') ? 'travail' : null
    return { busAgentsBaisse, sansJeton, autreAgent, pauseTravail, pauseAutres, fuite }
  })

  obs['AM-6'] = { exception: 'route absente : non observable sans un vrai module' }
  obs['AM-7'] = { exception: 'route absente : non observable sans un vrai module' }
  obs['AM-8'] = { exception: 'route absente : non observable sans un vrai module' }
  obs['AM-11'] = { exception: 'route absente : non observable sans un vrai module' }
  obs['AM-12'] = { exception: 'route absente : non observable sans un vrai module' }

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
  return {
    'AM-2': { maquettesJson: [{ entreprise: 'x', metier: 'menuisier', ville: 'Nantes', communes: ['Nantes'], modele: 'menuisier', source_fait: { fait: 'x', source: 'ademe_rge', repere: 'f1', releve_le: '2026-10-14' } }], entrantSansFait: { source_fait: { fait: "Maquette demandée par l'entreprise le JJ/MM/AAAA", source: 'demande' } } },
    'AM-3': { dansDepot: { code: 2, appels: 0 }, sousPublic: { code: 2, appels: 0 }, coffreAbsent: { code: 3 }, coffreServiceRole: { code: 3 }, litEnvLocal: false },
    'AM-4': { cas: Object.fromEntries(['capture 0 octet', 'capture 1,4 Mo', 'capture uniforme', 'vidéo 3,2 Mo', 'échec generer.mjs', 'échec capturer', 'échec vidéo'].map((n) => [n, { maquettePrete: false }])) },
    'AM-5': { busAgentsBaisse: 404, sansJeton: 401, autreAgent: 403, pauseTravail: { pause: true }, pauseAutres: [423, 423, 423], fuite: null },
    'AM-6': { varianteABaissee: { avance: 0 }, deuxEntrants: { n: 2 }, entrantsPlafond: { n: 0 }, douzeOui: { n: 10 }, entrantsAvant: true, battementEnPause: false },
    'AM-7': { fauxJpeg: { statut: 422, objetsRetires: true }, empreinteFausse: { statut: 422 }, conforme: { statut: 200, appelsMaquettePrete: 1 } },
    'AM-8': { valeurCreerLien: 'e'.repeat(64), jeton: 'x'.repeat(43), messageContientLien: true, messageContientPaiement: true, messageContientRdv: true, jugerMessageDisponible: false, jugerMessageOk: null, jugerMessageRaisons: [], reponseContientJeton: false, occupationHaute: { statut: 507, depose: false } },
    'AM-9': { applicable: false, ok: true, detail: 'non applicable' },
    'AM-10': { console: 'atelier : 3 maquette(s) fabriquée(s)\n', valeursCoffre: ['JETON-SECRET-TEMOIN'] },
    'AM-11': { metaRecent: { canal: 'messagerie', modele: 'lien_maquette_entrant_meta_v1' }, emailAncien: { canal: 'email_sollicite', envoyeur: 'gmail', modele: 'lien_maquette_entrant_email_v1', preuveType: 'case_entrant' }, sansAdresse: { raison: 'aucune_adresse', jetonCree: false }, sansGmail: { raison: 'en_attente_gmail' }, froidOui: { canal: 'email_sollicite', preuveEstOui: true }, mentionneBoite: false },
    'AM-12': { baisse: { contientPaiement: false }, leve: { contientPaiement: true }, litActif: true },
  }
}
function muter(base, id, m) { const x = JSON.parse(JSON.stringify(base[id])); m(x); return x }
function echantillons() {
  const b = obsBase()
  return {
    'AM-2': [['conforme', b['AM-2'], false], ['clé photo en trop', muter(b, 'AM-2', (x) => { x.maquettesJson[0].photo = 'y' }), true], ['phrase entrant différente', muter(b, 'AM-2', (x) => { x.entrantSansFait.source_fait.fait = 'Maquette demandée le 1/1' }), true]],
    'AM-3': [['conforme', b['AM-3'], false], ['un appel malgré le dossier interdit', muter(b, 'AM-3', (x) => { x.dansDepot.appels = 1 }), true], ['.env.local lu', muter(b, 'AM-3', (x) => { x.litEnvLocal = true }), true]],
    'AM-4': [['conforme', b['AM-4'], false], ['une maquette prête malgré une capture vide', muter(b, 'AM-4', (x) => { x.cas['capture 0 octet'].maquettePrete = true }), true]],
    'AM-5': [['conforme', b['AM-5'], false], ['200 sans jeton', muter(b, 'AM-5', (x) => { x.sansJeton = 200 }), true], ['une adresse dans une réponse', muter(b, 'AM-5', (x) => { x.fuite = 'travail' }), true]],
    'AM-6': [['conforme', b['AM-6'], false], ['avance malgré varianteA baissé', muter(b, 'AM-6', (x) => { x.varianteABaissee.avance = 2 }), true], ['dix prospects oui à fabriquer', muter(b, 'AM-6', (x) => { x.douzeOui.n = 12 }), true]],
    'AM-7': [['conforme', b['AM-7'], false], ['%PDF accepté', muter(b, 'AM-7', (x) => { x.fauxJpeg.statut = 200 }), true]],
    'AM-8': [['conforme', b['AM-8'], false], ['le jeton en clair passé', muter(b, 'AM-8', (x) => { x.valeurCreerLien = x.jeton }), true], ['dépôt malgré 61 % d\'occupation', muter(b, 'AM-8', (x) => { x.occupationHaute.depose = true }), true]],
    'AM-9': [['conforme', b['AM-9'], false], ['une passe réelle en échec', muter(b, 'AM-9', (x) => { x.applicable = true; x.ok = false; x.detail = 'capture non décodable' }), true]],
    'AM-10': [['conforme', b['AM-10'], false], ['une valeur du coffre dans la console', muter(b, 'AM-10', (x) => { x.console += 'JETON-SECRET-TEMOIN\n' }), true]],
    'AM-11': [['conforme', b['AM-11'], false], ['jeton créé sans adresse', muter(b, 'AM-11', (x) => { x.sansAdresse.jetonCree = true }), true], ['une route mentionne une boîte', muter(b, 'AM-11', (x) => { x.mentionneBoite = true }), true]],
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
