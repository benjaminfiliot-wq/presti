#!/usr/bin/env node
// scripts/usine-routes-qa.mjs — le juge des routes de dépôt de l'usine (POST /api/agents/usine/entree et /depot, fiche 026-056),
// écrit par Claude Code (fiche 026-052) AVANT les routes qu'il juge. Lancé avec scripts/ts-loader.mjs.
//
// Méthode de la maison (scripts/agents-routes-qa.mjs, 026-038) : les VRAIES routes sont importées dans un processus à part (la
// sonde de scripts/fixtures/026-horloge-bus/doublures/), sans réseau ni secret, avec la vraie garde (lib/agents/garde.ts) et le
// vrai client @supabase/supabase-js ; seul lib/flags est doublé (le drapeau busAgents levé ou baissé par le juge). Le client
// parle à un faux Supabase (fixtures/026/usine-production/faux-stockage-supabase.mjs) qui juge chaque RPC au contrat et consigne
// chaque appel au stockage : le juge COMPTE les signatures reçues, il ne croit jamais ce qu'une route dit avoir fait.
//
//   UR-1  drapeau busAgents baissé → 404 sur les deux routes, le drapeau lu, aucun appel SQL ni stockage.
//   UR-2  sans jeton ou jeton inconnu → 401 ; jeton d'un agent sans la table taches → 403 ; aucun appel au stockage ni
//         aux fonctions de l'usine.
//   UR-3  entree sur une tâche tenue : la liste de usine/<tache>/entree/ (et rien d'autre), chaque objet signé pour 900 s,
//         { tache, entrees: [{ nom, url, octets }] } aux URL reçues ; p_agent = l'agent du jeton ; tâche inconnue, tenue par un
//         autre ou au bail expiré → 404 au corps identique, sans stockage ; plus de 50 objets → 409 sans signature ; capacité
//         absente de usineLimites.json → 403 sans signature.
//   UR-4  depot : trop de fichiers, un fichier trop gros, un total trop gros (413), un type hors capacité, un nom avec « .. »,
//         « / » en tête, « \ », « // », un caractère de contrôle, plus de 120 signes, deux noms égaux, un sha256 qui n'a pas 64
//         signes hexadécimaux, des octets qui ne sont pas un entier positif → refus, AUCUN appel au stockage (tout ou rien : un
//         seul fichier fautif et aucun n'est signé) ; tâche non détenue → 404 au même corps qu'entree.
//   UR-5  ops_stockage_octets au-delà de 60 % de 1 Go → 507 ; en erreur → 503 ; aucune signature.
//   UR-6  un dépôt valide → une signature de dépôt par fichier, au chemin exact <tache>/sortie/<nom> du bucket usine, et rien
//         d'autre ; { depots: [{ nom, url, jeton }] } aux URL et jetons reçus.
//   UR-7  corps de plus de 16 Ko → 413 ; JSON invalide ou champ au mauvais type → 400 ; aucun appel aux fonctions de l'usine
//         ni au stockage.
//   UR-8  les deux fichiers de route ne mentionnent ni supabaseAdmin, ni ANTHROPIC, ni acq_, ni ops_decision_trancher, ni
//         ops_interrupteur_poser ; aucune URL signée, aucun jeton, aucun nom d'entrée écrit sur la console (console.* espionnée).
//   UR-9  lib/agents/usineLimites.json égal aux limites de contrat-usine.json ; le bucket de la migration couvre ses types et
//         sa taille par fichier.
//   UR-10 npm run typecheck en code 0, les deux routes et lib/agents/usineDepot.ts parmi les fichiers vérifiés, sans
//         @ts-nocheck ni @ts-ignore (lecture de scripts/fixtures/026-horloge-bus/doublures/commun.mjs).
//   UR-R  (--reel, après déploiement et application de 0110) : un agent essai_e2e_<aléa> de capacité livraison et son jeton
//         tiré, une tâche d'essai (essai: true) créée et prise, entree (vide) → 200, depot d'un petit HTML → une URL signée, le
//         PUT réussit, l'objet existe ; ménage dans un finally (objet effacé, tâche close, agent retiré).
//
// Usage : node --import ./scripts/ts-loader.mjs scripts/usine-routes-qa.mjs [--racine=<copie>] [--critere=UR-3]
//         [--typecheck=lecture] | --reel | --preuve-echecs
//   --typecheck=lecture : UR-10 lit la sortie d'un tsc synthétique (code 0, les trois fichiers listés) et les vrais fichiers
//         (@ts-nocheck, @ts-ignore), sans relancer tsc : un outil de mise au point, jamais dans un verifier ni dans la preuve.
//   --preuve-echecs : autotest (AT-*), l'arbre de référence doit échouer sur UR-1 (PE-*), le TÉMOIN — un projet complet tiré de
//         HEAD, où UR-10 lance le vrai npm run typecheck — doit être vert (TV-1) et chaque sabotage rendre son critère rouge
//         (SB-1, dont une vraie erreur de type pour UR-10) ; écrit sa section de .orchestre/preuves/026-052/echecs-attendus.md.
// Codes : 0 vert · 1 un critère rouge · 2 préalable manquant ou argument invalide.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import * as H from './fixtures/026-horloge-bus/doublures/commun.mjs'
import * as K from './fixtures/026/usine-production/commun.mjs'
import { instructions, normaliser } from './lib/sql-essai.mjs'

const NOM = 'usine-routes-qa'
const FICHIER = fileURLToPath(import.meta.url)
const IDS = ['UR-1', 'UR-2', 'UR-3', 'UR-4', 'UR-5', 'UR-6', 'UR-7', 'UR-8', 'UR-9', 'UR-10']
const C = K.CONTRAT
const [ENTREE, DEPOT] = C.routes.fichiers
const LIB = C.routes.depot_lib, LIMITES = C.routes.limites_lib
const FAUX = path.join(K.FIX, 'faux-stockage-supabase.mjs')
const GARDE = new Set(['ops_agent_par_jeton', 'consommer_limite', 'ops_evenement_ajouter'])
const { court } = K
const res = (echecs, resume = '') => ({ ok: echecs.length === 0, echecs, resume })

// ══ Côté sonde (exécuté dans le processus de la sonde) ═══════════════════════════════════════════════════════════════
const hex = (n = 64) => crypto.randomBytes(Math.ceil(n / 2)).toString('hex').slice(0, n)
function fonctionsRpc() {
  const ops = H.lireContrat().fonctions
  return {
    ops_agent_par_jeton: { params: ops.ops_agent_par_jeton.params },
    ops_evenement_ajouter: { params: ops.ops_evenement_ajouter.params },
    consommer_limite: H.FONCTIONS_HORS_CONTRAT.consommer_limite,
    ops_tache_detenue: { params: C.fonction.params },
    ops_stockage_octets: { params: [] },
  }
}
/** Le montage d'une sonde : faux Supabase, agents, tâches, objets, espion de la console, appel d'une route. */
async function monter(ctx, { drapeau = true } = {}) {
  const { demarrerFauxSupabase } = await import(pathToFileURL(FAUX).href)
  const agents = new Map(), taches = new Map(), objets = new Map()
  const etat = { octets: 100_000_000 }
  const reponses = {
    ops_agent_par_jeton: (p) => ({ status: 200, body: agents.has(p.p_hash) ? [agents.get(p.p_hash)] : [] }),
    consommer_limite: () => ({ status: 200, body: true }),
    ops_evenement_ajouter: () => ({ status: 200, body: 1 }),
    ops_tache_detenue: (p) => {
      const t = taches.get(p.p_id)
      const ok = t && t.agent === p.p_agent && t.statut === 'bail' && Date.parse(t.bail_jusqua) > Date.now()
      return { status: 200, body: ok ? [{ id: p.p_id, type: t.type, cle_idempotence: t.cle, capacite: t.capacite, charge: t.charge, bail_jusqua: t.bail_jusqua }] : [] }
    },
    ops_stockage_octets: () => (etat.octets === 'erreur' ? { status: 500, body: { code: 'XX000', message: 'mesure impossible' } } : { status: 200, body: etat.octets }),
  }
  const serveur = await demarrerFauxSupabase({ fonctions: fonctionsRpc(), reponses, objets })
  process.env.NEXT_PUBLIC_SUPABASE_URL = serveur.url
  ctx.J.drapeaux = drapeau ? { busAgents: true } : {}
  // l'espion de la console : tout ce que le code jugé écrit
  const ecrit = []
  for (const m of ['log', 'error', 'warn', 'info', 'debug', 'trace']) {
    const orig = console[m].bind(console)
    console[m] = (...a) => { ecrit.push(a.map((x) => (typeof x === 'string' ? x : (() => { try { return JSON.stringify(x) } catch { return String(x) } })())).join(' ')); if (process.env.JUGE_ECHO) orig(...a) }
  }
  const agent = (nom, tables = ['taches', 'evenements']) => {
    const j = H.jetonEssai(nom)
    agents.set(H.sha256(j), { nom, capacites: ['livraison'], types_crees: [], tables_ecrites: tables, debit_minute: 1000, en_pause: false, disjoncteur_ouvert: false })
    return j
  }
  const tache = (agentNom, { statut = 'bail', dansMs = 20 * 60_000, capacite = 'livraison' } = {}) => {
    const id = H.uuid()
    taches.set(id, { agent: agentNom, statut, capacite, type: 'livrer_site', cle: `livrer_site:${H.uuid()}`, charge: { commande: H.uuid() }, bail_jusqua: new Date(Date.now() + dansMs).toISOString() })
    return id
  }
  const deposer = (tacheId, nom, octets = 1000, type = 'image/webp', dossier = 'entree') => objets.set(`usine/${tacheId}/${dossier}/${nom}`, { octets, type })
  const modules = new Map()
  let k = 20
  const appeler = async (quelle, { jeton, corps, brut } = {}) => {
    const f = quelle === 'entree' ? ENTREE : DEPOT
    if (!modules.has(f)) modules.set(f, await ctx.importer(f))
    const mod = modules.get(f)
    if (typeof mod.POST !== 'function') return { absente: true, texte: `POST n'est pas exportée par ${f}` }
    const h = { 'content-type': 'application/json', 'x-forwarded-for': `198.51.100.${(k++ % 200) + 20}` }
    if (jeton) h.authorization = `Bearer ${jeton}`
    const body = brut !== undefined ? brut : JSON.stringify(corps ?? {})
    const n0 = serveur.appels.length
    const rep = await mod.POST(new Request(`http://127.0.0.1/api/agents/usine/${quelle}`, { method: 'POST', headers: h, body }), { params: Promise.resolve({}) })
    const l = await ctx.lireReponse(rep)
    const appels = serveur.appels.slice(n0)
    return {
      ...l, appels,
      stockage: appels.filter((a) => a.genre === 'stockage'),
      signatures: appels.filter((a) => a.genre === 'stockage' && a.action !== 'list'),
      usine: appels.filter((a) => a.genre === 'rpc' && !GARDE.has(a.fonction)),
      fautes: appels.filter((a) => a.faute),
    }
  }
  const fichier = (nom, octets = 1200, type = 'text/html') => ({ nom, octets, type, sha256: hex() })
  return { serveur, etat, agents, taches, objets, agent, tache, deposer, appeler, fichier, ecrit, J: ctx.J }
}
const fin = async (m, echecs, resume) => { await m.serveur.arreter().catch(() => {}); return { echecs, resume, console: m.ecrit.length } }
const fautesDe = (x) => x.fautes.map((f) => `${f.fonction || f.action} (${f.faute})`).join(', ')

export const SONDES = {
  async drapeau(ctx) {
    const m = await monter(ctx, { drapeau: false })
    const e = []
    const j = m.agent('livreur_usine')
    const t = m.tache('livreur_usine'); m.deposer(t, 'commande.json', 300, 'application/json')
    for (const [q, corps] of [['entree', { tache: t }], ['depot', { tache: t, fichiers: [m.fichier('site/index.html')] }]]) {
      m.J.doublures ??= []
      const n0 = m.J.doublures.length
      const x = await m.appeler(q, { jeton: j, corps })
      if (x.absente) { e.push(x.texte); continue }
      if (x.status !== 404) e.push(`drapeau baissé : ${q} → ${x.status}, 404 attendu`)
      if (x.appels.length) e.push(`drapeau baissé : ${q} fait ${x.appels.length} appel(s) au faux Supabase (${x.appels.map((a) => a.fonction || a.action).join(', ')})`)
      const lus = m.J.doublures.slice(n0).filter((d) => d.quoi === 'flags.actif').map((d) => d.drapeau)
      if (!lus.includes('busAgents')) e.push(`${q} ne lit pas le drapeau busAgents (drapeaux lus : ${lus.join(', ') || 'aucun'})`)
    }
    return fin(m, e, 'drapeau busAgents baissé (lu par actif()) : entree et depot → 404, zéro appel SQL ou stockage')
  },
  async garde(ctx) {
    const m = await monter(ctx)
    const e = []
    const j = m.agent('livreur_usine'), sans = m.agent('essai_e2e_sans_taches', ['evenements'])
    const t = m.tache('livreur_usine'); m.deposer(t, 'commande.json', 300, 'application/json')
    const inconnu = H.jetonEssai('essai_e2e_inconnu')
    for (const q of ['entree', 'depot']) {
      const corps = q === 'entree' ? { tache: t } : { tache: t, fichiers: [m.fichier('site/index.html')] }
      for (const [cas, jeton, attendu] of [['sans jeton', null, 401], ['jeton inconnu', inconnu, 401], ['agent sans la table taches', sans, 403]]) {
        const x = await m.appeler(q, { jeton, corps })
        if (x.absente) { e.push(x.texte); continue }
        if (x.status !== attendu) e.push(`${q}, ${cas} : ${x.status} (${attendu} attendu)`)
        if (x.stockage.length) e.push(`${q}, ${cas} : ${x.stockage.length} appel(s) au stockage`)
        if (x.usine.length) e.push(`${q}, ${cas} : appel(s) ${x.usine.map((a) => a.fonction).join(', ')} avant le refus`)
        if (x.fautes.length) e.push(`${q}, ${cas} : appel(s) hors contrat : ${fautesDe(x)}`)
      }
    }
    return fin(m, e, 'sans jeton ou jeton inconnu → 401, agent sans la table taches → 403, sur les deux routes ; ni stockage ni fonction de l\'usine')
  },
  async entree(ctx) {
    const m = await monter(ctx)
    const e = []
    const j = m.agent('livreur_usine'); m.agent('essai_e2e_autre')
    const t = m.tache('livreur_usine')
    const noms = ['commande.json', 'photo-1.webp', 'photo-2.avif']
    m.deposer(t, 'commande.json', 812, 'application/json'); m.deposer(t, 'photo-1.webp', 7316); m.deposer(t, 'photo-2.avif', 4986, 'image/avif')
    m.deposer(t, 'site/index.html', 50, 'text/html', 'sortie') // un objet de la sortie : jamais listé ni signé
    const autreT = m.tache('essai_e2e_autre'); m.deposer(autreT, 'secret.json', 20, 'application/json')
    const x = await m.appeler('entree', { jeton: j, corps: { tache: t } })
    if (x.absente) return fin(m, [x.texte], '')
    if (x.status !== 200) e.push(`tâche tenue : ${x.status} (200 attendu) ${court(x.texte, 120)}`)
    else {
      const b = x.json || {}
      const cles = Object.keys(b).sort().join(',')
      if (cles !== 'entrees,tache') e.push(`réponse aux clés ${cles} (tache, entrees attendues)`)
      if (b.tache !== t) e.push('réponse : tache ≠ la tâche demandée')
      const listes = x.stockage.filter((a) => a.action === 'list'), signes = x.stockage.filter((a) => a.action === 'sign'), depots = x.stockage.filter((a) => a.action === 'upload')
      if (listes.length !== 1 || listes[0].bucket !== 'usine' || listes[0].prefixe !== `${t}/entree`) e.push(`liste : ${listes.map((a) => `${a.bucket}/${a.prefixe}`).join(', ') || 'aucune'} (une seule, usine/${t}/entree attendue)`)
      const chemins = signes.map((a) => `${a.bucket}/${a.chemin}`).sort()
      const attendus = noms.map((n) => `usine/${t}/entree/${n}`).sort()
      if (JSON.stringify(chemins) !== JSON.stringify(attendus)) e.push(`signatures de lecture : ${JSON.stringify(chemins)} (exactement ${JSON.stringify(attendus)} attendues)`)
      if (signes.some((a) => a.expiresIn !== C.routes.signature_lecture_s)) e.push(`durées de signature ${[...new Set(signes.map((a) => a.expiresIn))].join(', ')} s (${C.routes.signature_lecture_s} attendues)`)
      if (depots.length) e.push(`${depots.length} signature(s) de dépôt sur une lecture`)
      const ent = Array.isArray(b.entrees) ? b.entrees : []
      if (ent.length !== 3) e.push(`${ent.length} entrée(s) rendue(s) (3 attendues)`)
      for (const en of ent) {
        const s = signes.find((a) => a.chemin === `${t}/entree/${en.nom}`)
        if (Object.keys(en).sort().join(',') !== 'nom,octets,url') e.push(`entrée aux clés ${Object.keys(en).join(',')} (nom, url, octets attendues)`)
        if (!s) { e.push(`entrée « ${en.nom} » sans signature reçue`); continue }
        if (en.url !== `${m.serveur.url}/storage/v1/object/sign/usine/${t}/entree/${en.nom}?token=${s.jeton}`) e.push(`url de « ${en.nom} » ≠ celle que le stockage a signée`)
        const o = m.objets.get(`usine/${t}/entree/${en.nom}`)
        if (!o || en.octets !== o.octets) e.push(`octets de « ${en.nom} » : ${en.octets} (${o?.octets} attendus)`)
      }
      const d = x.usine.filter((a) => a.fonction === 'ops_tache_detenue')
      if (d.length !== 1 || d[0].params?.p_agent !== 'livreur_usine' || d[0].params?.p_id !== t) e.push(`ops_tache_detenue : ${JSON.stringify(d.map((a) => a.params))} (une fois, p_agent = l'agent du jeton, p_id = la tâche)`)
      if (x.fautes.length) e.push(`appel(s) hors contrat : ${fautesDe(x)}`)
    }
    // 404 au corps identique
    const expire = m.tache('livreur_usine', { dansMs: -60_000 }); m.deposer(expire, 'commande.json', 10, 'application/json')
    m.deposer(autreT, 'commande.json', 10, 'application/json')
    const corps404 = []
    for (const [cas, id] of [['tâche inconnue', H.uuid()], ['tenue par un autre agent', autreT], ['bail expiré', expire]]) {
      const y = await m.appeler('entree', { jeton: j, corps: { tache: id } })
      if (y.status !== 404) e.push(`${cas} : ${y.status} (404 attendu)`)
      if (y.stockage.length) e.push(`${cas} : ${y.stockage.length} appel(s) au stockage`)
      corps404.push(y.texte)
    }
    if (new Set(corps404).size !== 1) e.push(`les trois 404 n'ont pas le même corps : ${corps404.map((c) => court(c, 50)).join(' | ')}`)
    // plus de 50 objets → 409, aucune signature
    const pleine = m.tache('livreur_usine')
    for (let i = 0; i < C.limites.livraison.entrees_max + 10; i++) m.deposer(pleine, `photo-${String(i).padStart(3, '0')}.webp`)
    const z = await m.appeler('entree', { jeton: j, corps: { tache: pleine } })
    if (z.status !== 409) e.push(`${C.limites.livraison.entrees_max + 10} objets : ${z.status} (409 attendu)`)
    if (z.signatures.length) e.push(`${C.limites.livraison.entrees_max + 10} objets : ${z.signatures.length} signature(s)`)
    const juste = m.tache('livreur_usine')
    for (let i = 0; i < C.limites.livraison.entrees_max; i++) m.deposer(juste, `photo-${String(i).padStart(3, '0')}.webp`)
    const z2 = await m.appeler('entree', { jeton: j, corps: { tache: juste } })
    if (z2.status !== 200 || z2.signatures.length !== C.limites.livraison.entrees_max) e.push(`${C.limites.livraison.entrees_max} objets pile : ${z2.status}, ${z2.signatures.length} signature(s) (200 et ${C.limites.livraison.entrees_max} attendus)`)
    // capacité absente de usineLimites.json → 403, aucune signature
    const pub = m.tache('livreur_usine', { capacite: 'pubs' }); m.deposer(pub, 'brief.json', 100, 'application/json')
    const w = await m.appeler('entree', { jeton: j, corps: { tache: pub } })
    if (w.status !== 403) e.push(`capacité hors usineLimites.json : ${w.status} (403 attendu)`)
    if (w.signatures.length) e.push(`capacité hors usineLimites.json : ${w.signatures.length} signature(s)`)
    return fin(m, e, `tâche tenue : une liste de usine/<tache>/entree, 3 signatures de ${C.routes.signature_lecture_s} s aux chemins exacts, réponse aux URL reçues ; 404 au même corps (inconnue, autre agent, bail expiré) ; ${C.limites.livraison.entrees_max + 10} objets → 409 sans signature (${C.limites.livraison.entrees_max} pile → 200) ; capacité hors limites → 403`)
  },
  async depotBornes(ctx) {
    const m = await monter(ctx)
    const e = []
    const j = m.agent('livreur_usine'); m.agent('essai_e2e_autre')
    const t = m.tache('livreur_usine')
    const L = C.limites.livraison
    const ok = (nom = 'site/index.html') => m.fichier(nom)
    const cas = [
      ['trop de fichiers', Array.from({ length: L.fichiers_max + 1 }, (_, i) => ({ nom: `s/${i}.css`, octets: 1, type: 'text/css', sha256: 'a'.repeat(64) })), [400, 413]],
      ['un fichier trop gros', [ok(), m.fichier('site/grand.webp', L.octets_fichier_max + 1, 'image/webp')], [400, 413]],
      ['un total trop gros', Array.from({ length: Math.ceil(L.octets_total_max / L.octets_fichier_max) + 1 }, (_, i) => m.fichier(`site/i${i}.webp`, L.octets_fichier_max, 'image/webp')), [413]],
      ['un type hors capacité', [ok(), m.fichier('site/outil.php', 100, 'application/x-httpd-php')], null],
      ['un nom avec ..', [ok(), m.fichier('site/../x.html')], null],
      ['un nom avec / en tête', [ok(), m.fichier('/site/x.html')], null],
      ['un nom avec \\', [ok(), m.fichier('site\\x.html')], null],
      ['un nom avec //', [ok(), m.fichier('site//x.html')], null],
      ['un nom avec un caractère de contrôle', [ok(), m.fichier('site/x\u0001.html')], null],
      ['un nom de plus de 120 signes', [ok(), m.fichier(`site/${'a'.repeat(120)}.html`)], null],
      ['deux noms égaux', [ok(), ok()], null],
      ['un sha256 de 63 signes', [ok(), { ...ok('site/b.html'), sha256: hex(63) }], null],
      ['un sha256 non hexadécimal', [ok(), { ...ok('site/b.html'), sha256: `${hex(63)}z` }], null],
      ['des octets nuls', [ok(), m.fichier('site/b.html', 0)], null],
      ['des octets négatifs', [ok(), m.fichier('site/b.html', -5)], null],
      ['des octets non entiers', [ok(), m.fichier('site/b.html', 1.5)], null],
    ]
    for (const [nom, fichiers, statuts] of cas) {
      const x = await m.appeler('depot', { jeton: j, corps: { tache: t, fichiers } })
      if (x.absente) return fin(m, [x.texte], '')
      const refuse = x.status >= 400 && x.status < 500 && ![401, 404].includes(x.status)
      if (!refuse || (statuts && !statuts.includes(x.status))) e.push(`${nom} : ${x.status} (${statuts ? statuts.join(' ou ') : 'un refus 4xx'} attendu)`)
      if (x.stockage.length) e.push(`${nom} : ${x.stockage.length} appel(s) au stockage (${x.stockage.map((a) => a.action).join(', ')}) — aucune signature attendue`)
    }
    // 404 au même corps qu'entree
    const autreT = m.tache('essai_e2e_autre'), expire = m.tache('livreur_usine', { dansMs: -60_000 })
    const corps404 = []
    for (const [nom, id] of [['tâche inconnue', H.uuid()], ['tenue par un autre agent', autreT], ['bail expiré', expire]]) {
      const x = await m.appeler('depot', { jeton: j, corps: { tache: id, fichiers: [ok()] } })
      if (x.status !== 404) e.push(`depot, ${nom} : ${x.status} (404 attendu)`)
      if (x.signatures.length) e.push(`depot, ${nom} : ${x.signatures.length} signature(s)`)
      corps404.push(x.texte)
    }
    const y = await m.appeler('entree', { jeton: j, corps: { tache: H.uuid() } })
    corps404.push(y.texte)
    if (new Set(corps404).size !== 1) e.push(`404 de depot et d'entree aux corps différents : ${[...new Set(corps404)].map((c) => court(c, 50)).join(' | ')}`)
    return fin(m, e, `${cas.length} bornes du dépôt refusées sans aucun appel au stockage (dont total ${L.octets_total_max} dépassé → 413, un seul fichier fautif et aucun n'est signé) ; tâche non détenue → 404 au corps d'entree`)
  },
  async stockage(ctx) {
    const m = await monter(ctx)
    const e = []
    const j = m.agent('livreur_usine'); const t = m.tache('livreur_usine')
    const fichiers = [m.fichier('site/index.html'), m.fichier('rapport-qa.json', 300, 'application/json')]
    const seuil = C.routes.stockage.seuil * C.routes.stockage.total_octets
    for (const [nom, octets, attendu] of [['au-delà de 60 %', Math.ceil(seuil) + 1, 507], ['mesure en erreur', 'erreur', 503], ['bien au-delà', C.routes.stockage.total_octets, 507]]) {
      m.etat.octets = octets
      const x = await m.appeler('depot', { jeton: j, corps: { tache: t, fichiers } })
      if (x.absente) return fin(m, [x.texte], '')
      if (x.status !== attendu) e.push(`stockage ${nom} : ${x.status} (${attendu} attendu)`)
      if (x.signatures.length) e.push(`stockage ${nom} : ${x.signatures.length} signature(s) (aucune attendue)`)
      if (!x.usine.some((a) => a.fonction === 'ops_stockage_octets')) e.push(`stockage ${nom} : ops_stockage_octets jamais appelée`)
    }
    m.etat.octets = Math.floor(seuil) - 1
    const z = await m.appeler('depot', { jeton: j, corps: { tache: t, fichiers } })
    if (z.status !== 200 || z.signatures.length !== 2) e.push(`stockage juste sous 60 % : ${z.status}, ${z.signatures.length} signature(s) (200 et 2 attendus)`)
    return fin(m, e, 'stockage au-delà de 60 % de 1 Go → 507, mesure en erreur → 503, sans signature ; juste sous le seuil → 200')
  },
  async depotValide(ctx) {
    const m = await monter(ctx)
    const e = []
    const j = m.agent('livreur_usine'); const t = m.tache('livreur_usine')
    m.deposer(t, 'commande.json', 300, 'application/json')
    const fichiers = [m.fichier('site/index.html'), m.fichier('site/styles.css', 900, 'text/css'), m.fichier('site/images/photo.webp', 7316, 'image/webp'), m.fichier('rapport-qa.json', 300, 'application/json')]
    const x = await m.appeler('depot', { jeton: j, corps: { tache: t, fichiers } })
    if (x.absente) return fin(m, [x.texte], '')
    if (x.status !== 200) e.push(`dépôt valide : ${x.status} (200 attendu) ${court(x.texte, 120)}`)
    const up = x.stockage.filter((a) => a.action === 'upload'), autres = x.stockage.filter((a) => a.action !== 'upload')
    if (autres.length) e.push(`${autres.length} appel(s) au stockage en plus des dépôts (${autres.map((a) => a.action).join(', ')})`)
    const chemins = up.map((a) => `${a.bucket}/${a.chemin}`).sort(), attendus = fichiers.map((f) => `usine/${t}/sortie/${f.nom}`).sort()
    if (JSON.stringify(chemins) !== JSON.stringify(attendus)) e.push(`signatures de dépôt ${JSON.stringify(chemins)} (exactement ${JSON.stringify(attendus)} attendues)`)
    const d = Array.isArray(x.json?.depots) ? x.json.depots : []
    if (Object.keys(x.json || {}).join(',') !== 'depots') e.push(`réponse aux clés ${Object.keys(x.json || {}).join(',')} (depots attendue)`)
    if (d.length !== fichiers.length) e.push(`${d.length} dépôt(s) rendu(s) (${fichiers.length} attendus)`)
    for (const de of d) {
      if (Object.keys(de).sort().join(',') !== 'jeton,nom,url') e.push(`dépôt aux clés ${Object.keys(de).join(',')} (nom, url, jeton attendues)`)
      const s = up.find((a) => a.chemin === `${t}/sortie/${de.nom}`)
      if (!s) { e.push(`dépôt « ${de.nom} » sans signature reçue`); continue }
      if (de.url !== `${m.serveur.url}/storage/v1/object/upload/sign/usine/${t}/sortie/${de.nom}?token=${s.jeton}`) e.push(`url de « ${de.nom} » ≠ celle que le stockage a signée`)
      if (de.jeton !== s.jeton) e.push(`jeton de « ${de.nom} » ≠ celui que le stockage a rendu`)
    }
    const det = x.usine.filter((a) => a.fonction === 'ops_tache_detenue')
    if (det.length !== 1 || det[0].params?.p_agent !== 'livreur_usine') e.push('ops_tache_detenue : une fois, avec l\'agent du jeton, attendu')
    if (x.fautes.length) e.push(`appel(s) hors contrat : ${fautesDe(x)}`)
    return fin(m, e, `dépôt de ${fichiers.length} fichiers : ${fichiers.length} signatures de dépôt aux chemins exacts <tache>/sortie/<nom> du bucket usine, rien d'autre ; réponse { depots } aux URL et jetons reçus`)
  },
  async corps(ctx) {
    const m = await monter(ctx)
    const e = []
    const j = m.agent('livreur_usine'); const t = m.tache('livreur_usine'); m.deposer(t, 'commande.json', 300, 'application/json')
    const grand = JSON.stringify({ tache: t, fichiers: [{ nom: 'site/index.html', octets: 10, type: 'text/html', sha256: hex(), bourrage: 'x'.repeat(C.routes.corps_max_octets + 200) }] })
    const cas = [
      ['entree', 'corps de 16 Ko et plus', JSON.stringify({ tache: t, bourrage: 'x'.repeat(C.routes.corps_max_octets + 200) }), 413],
      ['depot', 'corps de 16 Ko et plus', grand, 413],
      ['entree', 'JSON invalide', '{"tache": ', 400],
      ['depot', 'JSON invalide', '{"tache": ', 400],
      ['entree', 'tache qui n\'est pas un uuid', JSON.stringify({ tache: 'tache-1' }), 400],
      ['entree', 'tache absente', JSON.stringify({}), 400],
      ['depot', 'tache nombre', JSON.stringify({ tache: 12, fichiers: [] }), 400],
      ['depot', 'fichiers qui n\'est pas une liste', JSON.stringify({ tache: t, fichiers: 'site/index.html' }), 400],
      ['depot', 'octets en texte', JSON.stringify({ tache: t, fichiers: [{ nom: 'site/index.html', octets: '12', type: 'text/html', sha256: hex() }] }), 400],
      ['depot', 'un tableau à la place de l\'objet', JSON.stringify([t]), 400],
    ]
    for (const [q, nom, brut, attendu] of cas) {
      const x = await m.appeler(q, { jeton: j, brut })
      if (x.absente) return fin(m, [x.texte], '')
      if (x.status !== attendu) e.push(`${q}, ${nom} : ${x.status} (${attendu} attendu)`)
      if (x.usine.length || x.stockage.length) e.push(`${q}, ${nom} : ${x.usine.length + x.stockage.length} appel(s) SQL ou stockage (${[...x.usine.map((a) => a.fonction), ...x.stockage.map((a) => a.action)].join(', ')}) — aucun attendu`)
    }
    return fin(m, e, `${cas.length} corps fautifs : 16 Ko et plus → 413, JSON invalide ou mauvais type → 400, sans appel SQL ni stockage`)
  },
  async console(ctx) {
    const m = await monter(ctx)
    const e = []
    const j = m.agent('livreur_usine'); const t = m.tache('livreur_usine')
    const secret = `photo-${hex(10)}.webp`
    m.deposer(t, secret); m.deposer(t, 'commande.json', 300, 'application/json')
    const vus = []
    const a = await m.appeler('entree', { jeton: j, corps: { tache: t } }); vus.push(a)
    const b = await m.appeler('depot', { jeton: j, corps: { tache: t, fichiers: [m.fichier('site/index.html')] } }); vus.push(b)
    vus.push(await m.appeler('entree', { jeton: j, corps: { tache: H.uuid() } }))
    m.etat.octets = C.routes.stockage.total_octets
    vus.push(await m.appeler('depot', { jeton: j, corps: { tache: t, fichiers: [m.fichier('site/index.html')] } }))
    m.etat.octets = 'erreur'
    vus.push(await m.appeler('depot', { jeton: j, corps: { tache: t, fichiers: [m.fichier('site/index.html')] } }))
    m.serveur.fixer({ stockage: 'erreur' }); m.etat.octets = 1000
    vus.push(await m.appeler('entree', { jeton: j, corps: { tache: t } }))
    vus.push(await m.appeler('depot', { jeton: j, corps: { tache: t, fichiers: [m.fichier('site/index.html')] } }))
    if (vus.some((x) => x.absente)) return fin(m, [vus.find((x) => x.absente).texte], '')
    const texte = m.ecrit.join('\n')
    const jetons = vus.flatMap((x) => x.stockage.map((s) => s.jeton).filter(Boolean))
    if (jetons.some((x) => texte.includes(x))) e.push('un jeton de signature du stockage est écrit sur la console')
    if (/\/storage\/v1\/object\/(sign|upload)/.test(texte)) e.push('une URL signée est écrite sur la console')
    if (texte.includes(j) || texte.includes(H.sha256(j))) e.push('le jeton de l\'agent (ou son empreinte) est écrit sur la console')
    if (texte.includes(secret)) e.push('un nom de fichier d\'entrée est écrit sur la console')
    const erreurStockage = vus.slice(-2)
    for (const x of erreurStockage) if (x.status < 500) e.push(`stockage en erreur : ${x.status} (5xx attendu)`)
    if (erreurStockage.some((x) => /internal|stockage en erreur \(mode du juge\)/.test(x.texte))) e.push('le détail de l\'erreur du stockage est rendu au client')
    return fin(m, e, `${vus.length} appels (réussis, 404, 507, 503, stockage en erreur) : ${m.ecrit.length} ligne(s) de console, sans URL signée, jeton ni nom d'entrée ; l'erreur du stockage rendue sans son détail`)
  },
}

// ══ Côté juge ═════════════════════════════════════════════════════════════════════════════════════════════════════════
const ARGS = process.argv.slice(2)
const CONNUS = ['racine', 'critere', 'preuve-echecs', 'reel', 'typecheck']
function lireArgs() {
  for (const a of ARGS) {
    const m = /^--([a-z-]+)(=.*)?$/.exec(a)
    if (!m || !CONNUS.includes(m[1])) { console.error(`✗ ${NOM} : argument inconnu « ${a} » (--racine=, --critere=, --typecheck=lecture, --preuve-echecs, --reel)`); process.exit(2) }
  }
  const opt = (n) => { const a = ARGS.find((x) => x === `--${n}` || x.startsWith(`--${n}=`)); return a === undefined ? undefined : (a.includes('=') ? a.slice(a.indexOf('=') + 1) : true) }
  const o = { racine: typeof opt('racine') === 'string' ? path.resolve(opt('racine')) : H.R, critere: typeof opt('critere') === 'string' ? opt('critere') : null, preuve: !!opt('preuve-echecs'), reel: !!opt('reel'), typecheck: opt('typecheck') ?? 'reel' }
  if (!K.existe(o.racine)) { console.error(`✗ ${NOM} : racine introuvable : ${o.racine}`); process.exit(2) }
  if (o.critere && !IDS.includes(o.critere)) { console.error(`✗ ${NOM} : --critere=${o.critere} inconnu`); process.exit(2) }
  if (!['reel', 'lecture'].includes(o.typecheck)) { console.error(`✗ ${NOM} : --typecheck=lecture seulement`); process.exit(2) }
  return o
}
const manquants = (racine) => [ENTREE, DEPOT, LIB].filter((r) => !H.existe(racine, r))
async function parSonde(nom, racine) {
  const a = manquants(racine)
  if (a.length) return res([`non jugé : ${a.length} fichier(s) absent(s) : ${a.join(', ')}`])
  const x = await H.lancerSonde({ juge: NOM, jugeFichier: FICHIER, nom, racine, doublures: ['lib/flags'], delaiMs: 180_000 })
  return x.ok ? res(x.res.echecs || ['résultat de sonde sans liste'], x.res.resume || '') : res([x.erreur])
}
function jugerLecture(racine) {
  const e = []
  const MOTS = C.routes.interdits_dans_les_routes
  for (const f of [ENTREE, DEPOT]) {
    const t = H.lire(racine, f)
    if (t === null) { e.push(`${f} absent`); continue }
    for (const mot of MOTS) if (t.includes(mot)) e.push(`${f} mentionne ${mot}`)
    if (!/export\s+(const|async function|function)\s+POST\b/.test(t)) e.push(`${f} n'exporte pas POST`)
    if (!/export\s+const\s+runtime\s*=\s*['"]nodejs['"]/.test(t) || !/export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]/.test(t)) e.push(`${f} : runtime = 'nodejs' et dynamic = 'force-dynamic' attendus`)
    if (/export\s+(const|async function|function)\s+(GET|PUT|PATCH|DELETE)\b/.test(t)) e.push(`${f} exporte une autre méthode que POST`)
  }
  const d = H.lire(racine, LIB)
  if (d !== null && /console\.(log|info|debug)\([^)]*(signedUrl|token|url)/i.test(d)) e.push(`${LIB} écrit une URL ou un jeton sur la console`)
  return e
}
function jugerLimites(racine) {
  const e = []
  const t = H.lire(racine, LIMITES)
  if (t === null) return res([`${LIMITES} absent`])
  let L
  try { L = JSON.parse(t) } catch (x) { return res([`${LIMITES} illisible : ${x.message}`]) }
  const A = C.limites
  if (Object.keys(L).sort().join(',') !== Object.keys(A).sort().join(',')) e.push(`capacités ${Object.keys(L).join(', ')} (${Object.keys(A).join(', ')} attendues)`)
  for (const [cap, a] of Object.entries(A)) {
    const l = L[cap] || {}
    if (Object.keys(l).sort().join(',') !== Object.keys(a).sort().join(',')) e.push(`${cap} : clés ${Object.keys(l).sort().join(', ')} (${Object.keys(a).sort().join(', ')} attendues)`)
    for (const k of Object.keys(a)) {
      if (k === 'types') { const x = Array.isArray(l.types) ? l.types : []; if (x.length !== a.types.length || !a.types.every((y) => x.includes(y))) e.push(`${cap}.types ≠ contrat (en trop ${JSON.stringify(x.filter((y) => !a.types.includes(y)))}, manquants ${JSON.stringify(a.types.filter((y) => !x.includes(y)))})`) }
      else if (l[k] !== a[k]) e.push(`${cap}.${k} = ${JSON.stringify(l[k])} (${a[k]} attendu)`)
    }
  }
  const dir = path.join(racine, 'supabase', 'migrations')
  const mig = K.existe(dir) ? fs.readdirSync(dir).filter((f) => /^\d{4}_.*\.sql$/.test(f) && f.endsWith(C.migration.suffixe)) : []
  if (mig.length !== 1) e.push(`${mig.length} migration *_usine_socle.sql : les types du bucket ne se lisent pas`)
  else {
    const ins = instructions(fs.readFileSync(path.join(dir, mig[0]), 'utf8')).map(normaliser).find((n) => /^insert into storage\.buckets\b/.test(n)) || ''
    const types = [...ins.matchAll(/'([a-z]+\/[a-z0-9.+-]+)'/g)].map((m) => m[1])
    const taille = Number((/,\s*(\d+)\s*,\s*array\[/.exec(ins) || [])[1])
    for (const [cap, l] of Object.entries(L)) {
      const hors = (Array.isArray(l.types) ? l.types : []).filter((x) => !types.includes(x))
      if (hors.length) e.push(`${cap} : types absents du bucket de ${mig[0]} : ${hors.join(', ')}`)
      if (!(taille >= l.octets_fichier_max)) e.push(`${cap} : le bucket (${taille || '?'} octets par fichier) refuserait un fichier de ${l.octets_fichier_max}`)
    }
  }
  return res(e, `${LIMITES} égal aux limites du contrat (${Object.keys(A).join(', ')} : ${A.livraison.entrees_max} entrées, ${A.livraison.fichiers_max} fichiers, ${A.livraison.octets_fichier_max}/${A.livraison.octets_total_max} octets, ${A.livraison.types.length} types) ; le bucket de la migration couvre ses types et sa taille`)
}
async function jugerTypecheck(racine, mode) {
  const fichiers = [ENTREE, DEPOT, LIB]
  if (mode === 'lecture') {
    const l = H.lireTypecheck({ code: 0, sortie: `> tsc --noEmit\n${fichiers.map((r) => path.join(racine, r)).join('\n')}\n` }, racine, fichiers)
    const x = H.eprouverLectureTypecheck(racine, fichiers)
    return res([...l.echecs, ...x.echecs], `lecture : ${x.resume.split(' — ')[0]} ; les vrais fichiers sans @ts-nocheck ni @ts-ignore (--typecheck=lecture : tsc n'est pas relancé)`)
  }
  // Un fichier jugé qui se soustrait à tsc (@ts-nocheck, @ts-ignore, @ts-expect-error) rend UR-10 rouge quoi que dise tsc :
  // lu d'abord, sans lancer tsc (une minute de processeur épargnée par refus).
  const soustraits = fichiers.flatMap((rel) => {
    const t = H.lire(racine, rel)
    if (t === null) return [`${rel} absent`]
    return [...(/@ts-nocheck/.test(t) ? [`${rel} porte @ts-nocheck`] : []), ...(/@ts-(ignore|expect-error)/.test(t) ? [`${rel} porte @ts-ignore ou @ts-expect-error`] : [])]
  })
  if (soustraits.length) return res([...soustraits, 'npm run typecheck non lancé : ces fichiers échapperaient à la vérification'])
  return H.typecheck(NOM, racine, fichiers)
}

const CRITERES = {
  'UR-1': (o) => parSonde('drapeau', o.racine),
  'UR-2': (o) => parSonde('garde', o.racine),
  'UR-3': (o) => parSonde('entree', o.racine),
  'UR-4': (o) => parSonde('depotBornes', o.racine),
  'UR-5': (o) => parSonde('stockage', o.racine),
  'UR-6': (o) => parSonde('depotValide', o.racine),
  'UR-7': (o) => parSonde('corps', o.racine),
  'UR-8': async (o) => { const a = jugerLecture(o.racine); const b = await parSonde('console', o.racine); return res([...a, ...b.echecs], `routes sans ${C.routes.interdits_dans_les_routes.join(', ')}, POST seul, nodejs et force-dynamic ; ${b.resume}`) },
  'UR-9': (o) => jugerLimites(o.racine),
  'UR-10': (o) => jugerTypecheck(o.racine, o.typecheck),
}
async function juger(o) {
  const ids = o.critere ? [o.critere] : IDS
  const s = H.creerRapport(NOM, ids, { entete: `${NOM} — racine ${o.racine === H.R ? '(le dépôt)' : H.posix(path.relative(H.R, o.racine)) || o.racine}` })
  const a = manquants(o.racine)
  if (a.length) s.note(`fichier(s) jugé(s) absent(s) : ${a.join(', ')}`)
  for (const id of ids) {
    let r
    try { r = await CRITERES[id](o) } catch (e) { r = res([`le juge a planté sur ${id} : ${court(e.stack || e.message, 240)}`]) }
    if (r.ok) s.passe(id, r.resume); else for (const x of r.echecs) s.echoue(id, x)
  }
  return s.fin()
}

// ── --reel ───────────────────────────────────────────────────────────────────────────────────────────────────────────
async function reel() {
  const s = H.creerRapport(NOM, ['UR-R'], { entete: `${NOM} --reel` })
  const { lireEnvLocal } = await import('./lib/sql-essai.mjs')
  lireEnvLocal(H.R)
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, ''), service = process.env.SUPABASE_SERVICE_ROLE_KEY
  const base = (process.env.PRESTI_URL || 'https://prestiapp.fr').replace(/\/+$/, '')
  if (!/^https:\/\//.test(url) || !service) { console.error(`✗ ${NOM} --reel : préalable manquant (NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local)`); return 2 }
  const sb = async (chemin, corps, { methode = 'POST', entetes = {} } = {}) => {
    try {
      const r = await fetch(`${url}${chemin}`, { method: methode, headers: { apikey: service, authorization: `Bearer ${service}`, 'content-type': 'application/json', ...entetes }, body: corps === undefined ? undefined : JSON.stringify(corps) })
      const t = await r.text(); let j = null; try { j = JSON.parse(t) } catch { /* texte */ }
      return { status: r.status, json: j }
    } catch (e) { return { status: 0, json: null, erreur: e.message } }
  }
  const bus = async (chemin, jeton, corps) => {
    try {
      const r = await fetch(`${base}${chemin}`, { method: 'POST', headers: { authorization: `Bearer ${jeton}`, 'content-type': 'application/json' }, body: corps === undefined ? undefined : JSON.stringify(corps) })
      const t = await r.text(); let j = null; try { j = JSON.parse(t) } catch { /* texte */ }
      return { status: r.status, json: j }
    } catch (e) { return { status: 0, json: null, erreur: e.message } }
  }
  const nom = `essai_e2e_${K.lettres(8).toLowerCase()}`
  const jeton = H.jetonEssai(nom)
  let tache = null, objet = null, enregistre = false
  try {
    const etat = await sb('/rest/v1/rpc/ops_etat', {})
    if (etat.status !== 200) { console.error(`✗ ${NOM} --reel : ops_etat() en ${etat.status} (0096 à 0098 appliquées ?)`); return 2 }
    if (Number(etat.json?.taches?.file) > 0) { console.error(`✗ ${NOM} --reel : ${etat.json.taches.file} tâche(s) en file : l'essai prendrait peut-être une vraie tâche de livraison. Relancer quand la file est vide.`); return 2 }
    const e1 = await sb('/rest/v1/rpc/ops_agent_enregistrer', { p_nom: nom, p_libelle: 'Essai des routes de l\'usine', p_capacites: ['livraison'], p_types_crees: ['livrer_site'], p_tables: ['taches', 'evenements'], p_periode_minutes: 60, p_debit_minute: 30, p_quota_creations_jour: 5, p_plafond_euros_jour: 0 })
    if (e1.status >= 300) { s.echoue('UR-R', `ops_agent_enregistrer : ${e1.status}`); return s.fin() }
    enregistre = true
    const e2 = await sb('/rest/v1/rpc/ops_agent_poser_jeton', { p_nom: nom, p_hash: H.sha256(jeton) })
    if (e2.status >= 300) { s.echoue('UR-R', `ops_agent_poser_jeton : ${e2.status}`); return s.fin() }
    const cree = await bus('/api/agents/taches', jeton, { type: 'livrer_site', cle: `essai_e2e:usine:${K.lettres(10)}`, capacite: 'livraison', charge: { commande: crypto.randomUUID(), essai: true } })
    if (![200, 201].includes(cree.status)) { s.echoue('UR-R', `création de la tâche d'essai : ${cree.status}`); return s.fin() }
    const idCree = cree.json?.id ?? cree.json?.tache?.id
    const pris = await bus('/api/agents/taches/prendre', jeton)
    tache = pris.json?.tache?.id || null
    if (!tache || tache !== idCree) { s.echoue('UR-R', `prendre : ${pris.status}, tâche ${tache ? 'autre que celle de l\'essai (laissée, son bail expirera)' : 'absente'}`); if (tache !== idCree) tache = null; return s.fin() }
    const ent = await bus('/api/agents/usine/entree', jeton, { tache })
    if (ent.status !== 200 || !Array.isArray(ent.json?.entrees) || ent.json.entrees.length !== 0) s.echoue('UR-R', `entree (vide) : ${ent.status}, ${JSON.stringify(ent.json?.entrees ?? null).slice(0, 60)} (200 et [] attendus)`)
    const html = Buffer.from(`<!doctype html><title>essai ${K.lettres(6)}</title>\n`)
    const dep = await bus('/api/agents/usine/depot', jeton, { tache, fichiers: [{ nom: 'site/index.html', octets: html.length, type: 'text/html', sha256: K.sha256(html) }] })
    const u = dep.json?.depots?.[0]?.url
    if (dep.status !== 200 || !u) s.echoue('UR-R', `depot : ${dep.status}, aucune URL signée`)
    else {
      objet = `${tache}/sortie/site/index.html`
      const put = await fetch(u, { method: 'PUT', headers: { 'content-type': 'text/html' }, body: html }).then((r) => r.status).catch(() => 0)
      if (put < 200 || put >= 300) s.echoue('UR-R', `PUT sur l'URL signée : ${put}`)
      const liste = await sb(`/storage/v1/object/list/usine`, { prefix: `${tache}/sortie/site`, limit: 10, offset: 0 })
      const o = Array.isArray(liste.json) ? liste.json.find((x) => x.name === 'index.html') : null
      if (!o || Number(o.metadata?.size) !== html.length) s.echoue('UR-R', `l'objet déposé n'existe pas (ou pas à sa taille) : ${liste.status}`)
    }
    if (!s.enEchec('UR-R')) s.passe('UR-R', `agent ${nom} et jeton tiré ; tâche d'essai créée et prise ; entree vide → 200 ; depot → URL signée ; PUT ${html.length} octets ; objet relu à sa taille`)
  } finally {
    if (objet) await sb('/storage/v1/object/usine', { prefixes: [objet] }, { methode: 'DELETE' })
    if (tache) await bus(`/api/agents/taches/${tache}/rendre`, jeton, { resultat: 'faite', preuve_url: `supabase://usine/${tache}/sortie/` })
    if (enregistre) await sb('/rest/v1/rpc/ops_agent_retirer', { p_nom: nom })
  }
  return s.fin()
}

// ── --preuve-echecs ──────────────────────────────────────────────────────────────────────────────────────────────────
const HB_TEMOINS = path.join(H.R, 'scripts', 'fixtures', '026-horloge-bus', 'doublures', 'temoins')
const SABOTAGES = [
  ['UR-1', 'app/api/agents/usine/entree/route.ts', "if (!actif('busAgents')) return erreur('Introuvable.', 404)\n", ''],
  ['UR-1', 'app/api/agents/usine/depot/route.ts', "if (!actif('busAgents'))", "if (!actif('agentsUsine'))"],
  ['UR-2', 'app/api/agents/usine/depot/route.ts', "  const t = await exigerTable(agent, 'taches')\n  if (t) return reponseRefusAgent(t)\n", ''],
  ['UR-2', 'app/api/agents/usine/entree/route.ts', 'if (refus(agent)) return reponseRefusAgent(agent)', "if (refus(agent) && agent.status !== 401) return reponseRefusAgent(agent)\n  if (refus(agent)) return NextResponse.json({ tache: null, entrees: [] })"],
  ['UR-3', 'lib/agents/usineDepot.ts', 'createSignedUrl(`${prefixe}/${o.name}`, LECTURE_S)', 'createSignedUrl(`${prefixe}/${o.name}`, 3600)'],
  ['UR-3', 'lib/agents/usineDepot.ts', "  if (!t) return INTROUVABLE\n  const L = limitesDe(t.capacite)\n  if (!L) return { status: 403, error: 'capacite' }\n  const prefixe", "  if (!t) return { status: 404, error: `tache_introuvable_${tacheId.slice(0, 4)}` }\n  const L = limitesDe(t.capacite)\n  if (!L) return { status: 403, error: 'capacite' }\n  const prefixe", 'un 404 qui dit quelle tâche'],
  ['UR-3', 'lib/agents/usineDepot.ts', 'if (objets.length > L.entrees_max) return', 'if (objets.length > L.entrees_max + 20) return'],
  ['UR-3', 'lib/agents/usineDepot.ts', "  const L = limitesDe(t.capacite)\n  if (!L) return { status: 403, error: 'capacite' }\n  const prefixe", "  const L = limitesDe(t.capacite) ?? limitesDe('livraison')\n  if (!L) return { status: 403, error: 'capacite' }\n  const prefixe", 'une capacité inconnue servie avec les limites de la livraison'],
  ['UR-3', 'lib/agents/usineDepot.ts', "{ p_agent: agentNom, p_id: tacheId }", "{ p_agent: agentNom === 'livreur_usine' ? 'livreur' : agentNom, p_id: tacheId }"],
  ['UR-4', 'lib/agents/usineDepot.ts', "if (total > L.octets_total_max) return { status: 413, error: 'total_trop_gros' }", "if (total > L.octets_total_max) return { status: 400, error: 'total_trop_gros' }"],
  ['UR-4', 'lib/agents/usineDepot.ts', "f.nom.includes('..') || ", ''],
  ['UR-4', 'lib/agents/usineDepot.ts', "    if (vus.has(f.nom)) return { status: 400, error: 'nom_en_double' }\n", ''],
  ['UR-4', 'lib/agents/usineDepot.ts', "    if (!SHA.test(f.sha256)) return { status: 400, error: 'sha256' }\n", ''],
  ['UR-4', 'lib/agents/usineDepot.ts', "  const refus = valider(fichiers, L)\n  if (refus) return refus\n", "  const signe = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(`${tacheId}/sortie/${fichiers[0]?.nom}`)\n  const refus = valider(fichiers, L)\n  if (refus) return refus\n  void signe\n"],
  ['UR-5', 'lib/agents/usineDepot.ts', 'if (Number(o.data) > SEUIL * STOCKAGE_TOTAL)', 'if (Number(o.data) > 0.9 * STOCKAGE_TOTAL)'],
  ['UR-5', 'lib/agents/usineDepot.ts', "if (o.error || typeof o.data !== 'number' && typeof o.data !== 'string') return { status: 503, error: 'mesure_indisponible' }", "if (o.error) { /* on dépose quand même */ }"],
  ['UR-6', 'lib/agents/usineDepot.ts', 'createSignedUploadUrl(`${tacheId}/sortie/${f.nom}`)', 'createSignedUploadUrl(`${tacheId}/${f.nom}`)'],
  ['UR-6', 'lib/agents/usineDepot.ts', 'depots.push({ nom: f.nom, url: s.data.signedUrl, jeton: s.data.token })', 'depots.push({ nom: f.nom, url: s.data.signedUrl, jeton: s.data.token, chemin: s.data.path } as never)'],
  ['UR-6', 'lib/agents/usineDepot.ts', '  const depots = []\n', "  await supabaseAdmin.storage.from(BUCKET).list(`${tacheId}/sortie`)\n  const depots = []\n"],
  ['UR-7', 'app/api/agents/usine/depot/route.ts', 'if (Buffer.byteLength(brut) > MAX)', 'if (Buffer.byteLength(brut) > 4 * MAX)'],
  ['UR-7', 'app/api/agents/usine/entree/route.ts', "|| typeof b.tache !== 'string' || !UUID.test(b.tache)) return erreur('tache : un uuid.', 400)", ") return erreur('tache : un uuid.', 400)"],
  ['UR-7', 'app/api/agents/usine/depot/route.ts', "  if (!Array.isArray(b.fichiers) || !b.fichiers.every(fichierValide)) return erreur('fichiers : [{ nom, octets, type, sha256 }].', 400)\n", ''],
  ['UR-8', 'app/api/agents/usine/depot/route.ts', "import { depot, type FichierDepot } from '@/lib/agents/usineDepot'", "import { depot, type FichierDepot } from '@/lib/agents/usineDepot'\nimport { supabaseAdmin } from '@/lib/supabaseAdmin'\nvoid supabaseAdmin"],
  ['UR-8', 'lib/agents/usineDepot.ts', '    depots.push({ nom: f.nom, url: s.data.signedUrl, jeton: s.data.token })', "    console.error('[usine] dépôt signé', s.data.signedUrl)\n    depots.push({ nom: f.nom, url: s.data.signedUrl, jeton: s.data.token })"],
  ['UR-8', 'lib/agents/usineDepot.ts', "  if (error || !Array.isArray(data)) return INDISPONIBLE\n", "  if (error || !Array.isArray(data)) return INDISPONIBLE\n  console.log('[usine] entrées', data.map((o) => o.name).join(', '))\n"],
  ['UR-9', 'lib/agents/usineLimites.json', '"octets_total_max": 41943040', '"octets_total_max": 52428800'],
  ['UR-9', 'lib/agents/usineLimites.json', '"font/woff2", ', '"font/woff2", "font/woff", '],
  ['UR-9', 'supabase/migrations/0110_usine_socle.sql', "'image/svg+xml', 'font/woff2',", "'image/svg+xml',"],
  ['UR-10', 'lib/agents/usineDepot.ts', 'const LECTURE_S = 900', "const LECTURE_S: number = '900'", 'une vraie erreur de type : tsc en code 2'],
  ['UR-10', 'app/api/agents/usine/depot/route.ts', "import { NextResponse } from 'next/server'", "// @ts-nocheck\nimport { NextResponse } from 'next/server'"],
  ['UR-10', 'lib/agents/usineDepot.ts', '  const L = limitesDe(t.capacite)\n  if (!L) return { status: 403, error: \'capacite\' }\n  const refus', "  const L = limitesDe(t.capacite)\n  // @ts-ignore\n  if (!L) return { status: 403, error: 'capacite' }\n  const refus"],
]

/** La ligne « PASS|FAIL <id> — … » d'une sortie de juge, ou ''. */
const lignesDe = (sortie, id) => K.lf(sortie).split('\n').find((l) => l.startsWith(`PASS ${id} — `) || l.startsWith(`FAIL ${id} — `)) || ''
async function preuveEchecs() {
  const T = ['AT-1', 'AT-2', 'PE-1', 'PE-2', 'TV-1', 'SB-1', 'PE-3']
  const s = H.creerRapport(`${NOM} --preuve-echecs`, T)
  const at = []
  const note = (id, ok, m) => { at.push({ id, ok, m }); s.verdict(id, ok, m) }
  // AT-1 : le faux Supabase juge au contrat et consigne
  {
    const D = []
    const { demarrerFauxSupabase } = await import(pathToFileURL(FAUX).href)
    const objets = new Map([['usine/t1/entree/a.json', { octets: 12, type: 'application/json' }], ['usine/t1/entree/b.webp', { octets: 34, type: 'image/webp' }], ['usine/t1/sortie/c.html', { octets: 5, type: 'text/html' }]])
    const f = await demarrerFauxSupabase({ fonctions: fonctionsRpc(), reponses: { ops_tache_detenue: () => ({ status: 200, body: [] }) }, objets })
    try {
      const post = (p, corps) => fetch(`${f.url}${p}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corps) }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }))
      const a = await post('/rest/v1/rpc/ops_tache_detenue', { p_agent: 'x', p_id: H.uuid() })
      const b = await post('/rest/v1/rpc/ops_tache_detenue', { agent: 'x', p_id: H.uuid() })
      const c = await post('/rest/v1/rpc/ops_tache_detenue', { p_agent: 'x', p_id: 'pas-un-uuid' })
      const d = await post('/rest/v1/rpc/ops_inconnue', {})
      const l = await post('/storage/v1/object/list/usine', { prefix: 't1/entree', limit: 100, offset: 0 })
      const sg = await post('/storage/v1/object/sign/usine/t1/entree/a.json', { expiresIn: 900 })
      const sx = await post('/storage/v1/object/sign/usine/t1/entree/absent.json', { expiresIn: 900 })
      const up = await post('/storage/v1/object/upload/sign/usine/t1/sortie/d.html', {})
      if (a.status !== 200 || b.status !== 400 || c.status !== 400 || d.status !== 404) D.push(`RPC : conforme ${a.status}, nom faux ${b.status}, type faux ${c.status}, fonction inconnue ${d.status} (200, 400, 400, 404 attendus)`)
      if (!Array.isArray(l.json) || l.json.map((x) => x.name).sort().join(',') !== 'a.json,b.webp' || l.json[0].metadata?.size !== 12) D.push(`liste : ${JSON.stringify(l.json).slice(0, 80)} (a.json 12 octets, b.webp ; jamais la sortie)`)
      if (!/^\/object\/sign\/usine\/t1\/entree\/a\.json\?token=/.test(sg.json?.signedURL || '') || sx.status !== 400) D.push('signature de lecture : forme ou refus d\'un objet absent')
      if (!/^\/object\/upload\/sign\/usine\/t1\/sortie\/d\.html\?token=/.test(up.json?.url || '')) D.push('signature de dépôt : forme')
      if (f.appels.length !== 8 || f.fautes().length !== 3) D.push(`${f.appels.length} appels consignés dont ${f.fautes().length} fautes (8 et 3 attendus)`)
      if (f.appels.find((x) => x.action === 'sign')?.expiresIn !== 900) D.push('durée de signature non consignée')
    } finally { await f.arreter() }
    note('AT-1', !D.length, D.length ? D.join(' ; ') : 'faux Supabase : RPC jugées au contrat (nom de paramètre faux, type faux, fonction inconnue refusés et consignés), liste sans la sortie, signatures de lecture et de dépôt au format de storage-js, durée consignée')
  }
  // AT-2 : la sonde tourne (le crochet, les doublures, le faux Supabase branché avant l'import) et les témoins d'autres fiches existent
  {
    const D = []
    for (const f of ['lib/agents/garde.ts', 'lib/agents/bus.ts', 'lib/agents/jetons.ts']) if (!K.existe(path.join(HB_TEMOINS, `${f}.temoin`))) D.push(`témoin de 026-038 absent : ${f}`)
    const x = await H.autoControleFauxPostgrest().catch((e) => ({ ok: false, resume: e.message }))
    if (!x.ok) D.push(`faux PostgREST de 026-038 : ${x.resume}`)
    note('AT-2', !D.length, D.length ? D.join(' ; ') : `témoins de 026-038 (garde, bus, jetons) présents ; ${x.resume}`)
  }
  // PE-1, PE-2 : la référence échoue sur UR-1
  const pe = []
  const ref = K.extraireReference(NOM, ['app', 'lib', 'supabase'], [ENTREE, DEPOT, LIB, LIMITES])
  s.verdict('PE-1', !!ref.dest, `arbre de référence ${K.REFERENCE} (ancêtre de HEAD, sans aucun fichier jugé) extrait`, ref.echecs.join(' ; '))
  if (ref.dest) {
    const r = await K.lancer(process.execPath, ['--import', './scripts/ts-loader.mjs', FICHIER, `--racine=${ref.dest}`], { cwd: H.R, delaiMs: 600_000 })
    const premier = K.premierFail(r.sortie)
    pe.push({ attendu: 'UR-1', code: r.code, premier })
    s.verdict('PE-2', r.code === 1 && K.critereDe(premier) === 'UR-1', `sur la référence : code ${r.code}, premier échec « ${court(premier, 160)} »`, `sur la référence : code ${r.code} (1 attendu), premier échec « ${court(premier || r.erreur, 160)} » (UR-1 attendu)`)
  } else s.echoue('PE-2', 'pas d\'arbre de référence (PE-1)')
  // TV-1, SB-1 — le témoin est un projet COMPLET (ce que tsc lit à HEAD : les dossiers qui portent du TypeScript, tsconfig.json,
  // package.json, et supabase/ pour UR-9) : UR-10 y lance le vrai `npm run typecheck`, jamais une lecture synthétique.
  let tv = null, temoinDecrit = ''
  try {
    const aHead = (rel) => K.git(['cat-file', '-e', `HEAD:${rel}`]).code === 0
    const tsHead = [...new Set(K.git(['ls-files', '--', '*.ts', '*.tsx']).stdout.split('\n').filter(Boolean).map((f) => f.split('/')[0]))]
    const exclus = new Set(['mobile']) // exclu par tsconfig.json ; les dossiers en « . » ne sont jamais lus par l'include de tsc
    const depuisHead = [...tsHead.filter((x) => !x.startsWith('.') && !exclus.has(x)), 'tsconfig.json', 'package.json', 'supabase'].filter((x, i, a) => a.indexOf(x) === i && aHead(x))
    // Les témoins de 026-038 (garde, bus, jetons) seulement tant que HEAD n'a pas les vrais (026-040) : ensuite, ceux de HEAD.
    const deLaGarde = ['lib/agents/garde.ts', 'lib/agents/bus.ts', 'lib/agents/jetons.ts'].filter((rel) => !aHead(rel))
    const t = K.construireTemoin(NOM, { depuisHead, autres: [[HB_TEMOINS, deLaGarde]], prefixes: ['app/', 'lib/', 'supabase/migrations/0110_usine_socle.sql'] })
    // Le drapeau busAgents (026-042) : levé dans la copie de lib/flags.ts de HEAD s'il n'y est pas encore, pour que tsc
    // accepte actif('busAgents') ; la sonde, elle, double lib/flags (UR-1).
    const fFlags = path.join(t.dest, 'lib', 'flags.ts')
    const flags = K.lireSi(fFlags)
    if (flags === null) throw new Error('lib/flags.ts absent de HEAD')
    let flagsDerive = false
    if (!/\bbusAgents\s*:/.test(flags)) {
      const x = flags.replace(/export const FLAGS = \{\r?\n/, (m) => `${m}  /** témoin 026-052 : le drapeau de 026-042, levé. */\n  busAgents: true,\n`)
      if (x === flags) throw new Error('lib/flags.ts de HEAD : « export const FLAGS = { » introuvable, busAgents ne se pose pas')
      fs.writeFileSync(fFlags, x); flagsDerive = true
    }
    temoinDecrit = `${depuisHead.join(', ')} de HEAD${deLaGarde.length ? ` ; ${deLaGarde.join(', ')} des témoins de 026-038` : ''}${flagsDerive ? ' ; busAgents levé dans lib/flags.ts' : ''} ; puis \`scripts/fixtures/026/usine-production/temoin/\` (${t.superposes.filter((x) => !deLaGarde.includes(x)).join(', ')})`
    tv = await K.eprouver({ juge: FICHIER, racine: t.dest, prefixeNode: ['--import', './scripts/ts-loader.mjs'], args: (c, r) => [`--racine=${r}`, ...(c ? [`--critere=${c}`] : [])], sabotages: SABOTAGES, criteres: IDS, parallele: 2 })
    const tc = lignesDe(tv.temoin.sortie, 'UR-10')
    const tcReel = /npm run typecheck en code 0/.test(tc)
    if (!tcReel) tv.echecs.push(`témoin : UR-10 n'a pas lancé le vrai typecheck (« ${court(tc, 160)} »)`)
    s.verdict('TV-1', tv.temoin.code === 0 && !tv.echecs.some((e) => e.startsWith('témoin')), `témoin complet (${depuisHead.length} entrées de HEAD, ${t.superposes.length} fichiers superposés) : code 0, les ${IDS.length} critères verts, UR-10 par le vrai npm run typecheck (« ${court(tc.replace(/^PASS UR-10 — /, ''), 120)} »)`, tv.echecs.filter((e) => e.startsWith('témoin')).join(' ; ') || `témoin : code ${tv.temoin.code}`)
    const rates = tv.echecs.filter((e) => !e.startsWith('témoin'))
    s.verdict('SB-1', !rates.length, `${tv.lignes.length} sabotages, chacun rend son critère rouge (${[...new Set(tv.lignes.map((l) => l.critere))].join(', ')})`, rates.join(' ; '))
  } catch (e) { s.echoue('TV-1', `témoin impossible : ${e.message}`); s.echoue('SB-1', 'pas de témoin') }
  try {
    const md = [
      `## usine-routes-qa (juge de 026-056)`, '',
      `Écrit par \`node --import ./scripts/ts-loader.mjs scripts/usine-routes-qa.mjs --preuve-echecs\` le ${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}.`, '',
      '### Autotest des jeux d\'essai', '', '| Critère | Verdict | Ce qui est vérifié |', '|---|---|---|',
      ...at.map((x) => `| ${x.id} | ${x.ok ? 'PASS' : 'FAIL'} | ${String(x.m).replace(/\|/g, '\\|')} |`), '',
      `### Sur l'arbre de référence ${K.REFERENCE} (aucun fichier jugé)`, '', '| Critère attendu en premier | Code | Premier échec réel |', '|---|---|---|',
      ...pe.map((x) => `| ${x.attendu} | ${x.code} | ${x.premier.replace(/\|/g, '\\|')} |`), '',
      '### Le témoin et les sabotages', '',
      `Témoin (un projet complet) : ${temoinDecrit || '—'}. UR-10 y lance le vrai \`npm run typecheck\`. Code du témoin intact : ${tv?.temoin.code ?? '—'}.`, '',
      ...(tv ? K.tableSabotages(tv.lignes) : ['(pas de témoin)']),
    ]
    const w = K.ecrireSection(NOM, md)
    const manque = pe.filter((x) => !x.premier || !w.relu.includes(x.premier.replace(/\|/g, '\\|')))
    s.verdict('PE-3', !manque.length, `echecs-attendus.md : section ${NOM} écrite et relue (${w.octets} octets)`, 'l\'extrait de la référence n\'est pas dans echecs-attendus.md')
  } catch (e) { s.echoue('PE-3', e.message) }
  return s.fin()
}

// ── Principal ────────────────────────────────────────────────────────────────────────────────────────────────────────
const cle = (p) => (process.platform === 'win32' ? path.resolve(p).toLowerCase() : path.resolve(p))
if (process.argv[1] && cle(process.argv[1]) === cle(FICHIER)) {
  const o = lireArgs()
  if (o.reel) { if (o.racine !== H.R) { console.error(`✗ ${NOM} : --reel ne se lance que sur le dépôt`); process.exit(2) } process.exitCode = await reel() }
  else if (o.preuve) process.exitCode = await preuveEchecs()
  else process.exitCode = await juger(o)
}
