#!/usr/bin/env node
// scripts/agents-garde-qa.mjs — le juge de la fiche 026-040 (la garde des jetons d'agents), écrit par Claude Code en 026-038.
// Le code est importé dans un processus à part (doublures/sonde.mjs), sans réseau ni secret, et parle à un faux PostgREST
// (scripts/lib/faux-postgrest.mjs) qui valide chaque nom de paramètre contre scripts/fixtures/026-horloge-bus/contrat-ops.json.
//
//   AG-1  lib/agents/jetons.ts, importé seul : FORMAT_JETON est celui de la fiche ; 1 000 jetons distincts, au format, 32 octets
//         au hasard, nomDuJeton les relit ; empreinteJeton = sha256 calculé par le juge ; null sur 12 formes invalides ; aucun
//         import réseau ou base dans son graphe d'importations (lecture statique, comme WM-1 de webhook-muet-qa).
//   AG-2  authAgent : sans en-tête, mal formé, inconnu → 401 au même corps ; sans en-tête ou mal formé : aucun appel à
//         ops_agent_par_jeton ; valide → l'agent (p_hash = sha256 du jeton) ; nom du jeton ≠ nom rendu → 401 ; en_pause ou
//         disjoncteur → 423 ; erreur 500 de ops_agent_par_jeton → 503.
//   AG-3  consommer_limite('agent:<nom>:minute', debit_minute, 60) ; false → 429 ; erreur → 503 (jamais « on laisse passer ») ;
//         31 jetons mal formés d'une même IP (agents:ip:<réseau>, 30 par 600 s) : le 31e → 429, sans appel ni hachage.
//   AG-4  exigerType / exigerTable : hors de ses types ou tables → 403 et un événement « refus » (p_agent, p_type) dont le
//         résumé ne porte ni « pa_ », ni 64 hexadécimaux, ni le corps ; aucun événement ne porte le jeton, son empreinte ou le
//         corps ; journal en panne (500) → le refus reste 403.
//   AG-5  lib/agents/bus.ts : chaque fonction des contrats 0097 et 0098 a sa fonction, appelée avec un objet aux clés p_… :
//         une seule fonction SQL, sans faute de paramètre, et { ok: true, data } ; STATUT_ERREUR couvre chaque code ops: de
//         026-011 et 026-013 avec le statut de la fiche ; ops:quota → 429, ops:profondeur → 409 ; une erreur « relation
//         "ops.taches" violates … » → 500 sans « ops. », « violates » ni « relation ».
//   AG-6  scripts/agents-jeton.mjs, lancé dans une copie sous .orchestre/travail/ avec un .env.local factice pointé sur le
//         faux PostgREST : jeton au format, affiché une fois, empreinte posée = son sha256, aucun fichier nouveau ; agent
//         inconnu → 1 ; aucun console.* d'une variable d'environnement ; --sortie=tube : exactement « <jeton>\n » ; sortie de
//         terminal simulée (isTTY) → code 2 et aucun appel.
//   AG-7  garde.ts, jetons.ts et bus.ts ne mentionnent ni ANTHROPIC, ni lib/agents/llm, ni lib/stripe ; lib/limites.ts égal à
//         HEAD et à la référence de preuve-01.json.
//   AG-8  npm run typecheck en code 0, --listFiles : les trois fichiers vérifiés, sans @ts-nocheck ni @ts-ignore.
//   AG-9  (--reel, après l'application de 0097) essai_e2e_<aléa> enregistré, empreinte posée, authAgent sur une vraie Request
//         contre la vraie base rend l'agent ; avec la clé anonyme, ops_agent_par_jeton refusée ; ménage dans un finally.
//
// Usage : node scripts/agents-garde-qa.mjs [--racine=<dossier>] [--temoin] [--reel]
//   --temoin : chaque critère sur le témoin (doublures/temoins/, implémentation de référence) doit être VERT, puis chaque
//              sabotage déclaré plus bas doit rendre son critère ROUGE ; plus l'auto-contrôle du faux PostgREST.
// Sortie : une ligne par critère, puis « agents-garde-qa : PASS » ou « … : FAIL — ids ». Code 0 si tout est vert, 1 sinon,
// 2 si un préalable manque (racine, contrat, faux PostgREST).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { syncBuiltinESMExports } from 'node:module'
import { pathToFileURL, fileURLToPath } from 'node:url'
import * as C from './fixtures/026-horloge-bus/doublures/commun.mjs'
import { demarrer, erreurOps, erreurPg } from './lib/faux-postgrest.mjs'

const JUGE = 'agents-garde-qa'
const FICHIER = fileURLToPath(import.meta.url)
const IDS = ['AG-1', 'AG-2', 'AG-3', 'AG-4', 'AG-5', 'AG-6', 'AG-7', 'AG-8', 'AG-9']
const JE = 'lib/agents/jetons.ts', GA = 'lib/agents/garde.ts', BU = 'lib/agents/bus.ts', SC = 'scripts/agents-jeton.mjs'
const RE_JETONS = /pa_[a-z0-9_]{2,40}_[A-Za-z0-9_-]{43}/g
const { court, hasard, sha256, jetonEssai, FORMAT_SPEC } = C

/** Le tableau de 026-040 : le statut HTTP de chaque code ops: (celui que STATUT_ERREUR doit porter). */
export const STATUTS_FICHE = {
  options: 400, defaut: 400, echeance: 400, choix: 400, resume: 400, preuve: 400, jeton_format: 400, purge: 400, type_argent: 400, vt: 400,
  type: 403, auteur: 403, opposition: 403, capacite: 403,
  agent_inconnu: 404, origine: 404, interrupteur: 404,
  profondeur: 409, sous_taches: 409, bail_perdu: 409, deja_tranchee: 409, jeton_deja_pris: 409, statut: 409, '90_jours': 409, '72_heures': 409, '3_messages': 409, relance_sans_contact: 409,
  agent_en_pause: 423, pause_generale: 423, quota_absent: 423,
  quota: 429,
}

const res = (echecs, resume = '') => ({ ok: echecs.length === 0, echecs, resume })
const absents = (racine, rels) => rels.filter((r) => !C.existe(racine, r))
const nonJuge = (racine, rels, id = 'AG-1') => { const a = absents(racine, rels); return a.length ? res(a.map((r) => `non jugé : ${r} absent (${id})`)) : null }
const sonde = (nom, racine, params = {}, extra = {}) => C.lancerSonde({ juge: JUGE, jugeFichier: FICHIER, nom, racine, params, ...extra })
const deSonde = (x, resumeSiVide = '') => (x.ok ? res(x.res.echecs || ['résultat de sonde sans liste'], x.res.resume || resumeSiVide) : res([x.erreur]))

// ── Côté sonde (processus à part) ──────────────────────────────────────────────────────────────────────────────────
const estRefus = (r) => !!r && typeof r === 'object' && typeof r.status === 'number' && 'error' in r
const estAgent = (r) => !!r && typeof r === 'object' && typeof r.nom === 'string' && !estRefus(r)
const decrire = (r) => (estRefus(r) ? `refus ${r.status} (${court(r.code, 20)})` : estAgent(r) ? `agent ${r.nom}` : `rendu ${court(JSON.stringify(r), 60)}`)
const egaux = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/** Les réponses du faux PostgREST pour la garde, pilotées par un état que les cas changent. */
function montageGarde({ fp }) {
  const etat = { connus: new Map(), parJeton: 'ok', mode: new Map(), compte: new Map(), evenement: 'ok', n: 0 }
  const panne = (m) => ({ status: 500, body: { code: 'XX000', message: m, details: null, hint: null } })
  fp.reponses.ops_agent_par_jeton = (p) => (etat.parJeton === 'erreur' ? panne('panne simulée par le juge') : { status: 200, body: etat.connus.has(p.p_hash) ? [etat.connus.get(p.p_hash)] : [] })
  fp.reponses.consommer_limite = (p) => {
    const m = etat.mode.get(p.p_cle)
    if (m === 'erreur') return panne('consommer_limite en panne (juge)')
    if (m === 'faux') return { status: 200, body: false }
    const n = (etat.compte.get(p.p_cle) || 0) + 1
    etat.compte.set(p.p_cle, n)
    return { status: 200, body: n <= Number(p.p_max) }
  }
  fp.reponses.ops_evenement_ajouter = () => (etat.evenement === 'panne' ? panne('journal en panne (juge)') : { status: 200, body: ++etat.n })
  const ligne = (nom, x = {}) => ({ nom, capacites: ['essai'], types_crees: ['envoi'], tables_ecrites: ['taches'], debit_minute: 7, en_pause: false, disjoncteur_ouvert: false, ...x })
  const connaitre = (jeton, l) => { etat.connus.set(sha256(jeton), l); return jeton }
  let k = 10
  const requete = ({ jeton, entete, ip, corps } = {}) => {
    const h = { 'x-forwarded-for': ip || `198.51.100.${(k++ % 240) + 10}`, 'content-type': 'application/json' }
    const a = entete ?? (jeton ? `Bearer ${jeton}` : undefined)
    if (a !== undefined) h.authorization = a
    return new Request('http://127.0.0.1/api/agents/taches', { method: 'POST', headers: h, body: corps ?? '{}' })
  }
  return { etat, ligne, connaitre, requete }
}

export const SONDES = {
  async jetons({ importer }) {
    const e = []
    const m = await importer(JE)
    for (const f of ['genererJeton', 'empreinteJeton', 'nomDuJeton']) if (typeof m[f] !== 'function') e.push(`${f} n'est pas exportée par ${JE}`)
    if (!(m.FORMAT_JETON instanceof RegExp)) e.push('FORMAT_JETON n\'est pas une expression régulière exportée')
    else if (m.FORMAT_JETON.source !== FORMAT_SPEC.source || m.FORMAT_JETON.flags !== '') e.push(`FORMAT_JETON vaut /${m.FORMAT_JETON.source}/${m.FORMAT_JETON.flags}, /${FORMAT_SPEC.source}/ attendu (celui de 026-040)`)
    if (e.length) return { echecs: e }
    const noms = ['essai_e2e_x', 'a0', 'chef', 'pont_orchestre', 'z'.repeat(40), 'recenseur_2']
    const vus = new Set()
    let hors = 0, taille = 0, nom = 0, emp = 0, exc = 0
    for (let i = 0; i < 1000; i++) {
      const n = noms[i % noms.length]
      let j
      try { j = m.genererJeton(n) } catch { exc++; continue }
      vus.add(j)
      const x = FORMAT_SPEC.exec(String(j))
      if (!x) hors++
      else if (Buffer.from(x[2], 'base64url').length !== 32 || Buffer.from(x[2], 'base64url').toString('base64url') !== x[2]) taille++
      if (m.nomDuJeton(j) !== n) nom++
      if (m.empreinteJeton(j) !== sha256(String(j))) emp++
    }
    if (exc) e.push(`genererJeton lève une exception ${exc} fois sur des noms valides`)
    if (vus.size !== 1000 - exc) e.push(`${1000 - exc - vus.size} doublon(s) sur ${1000 - exc} jetons`)
    if (hors) e.push(`${hors} jeton(s) hors du format de la fiche`)
    if (taille) e.push(`${taille} jeton(s) dont la partie au hasard n'est pas 32 octets en base64url`)
    if (nom) e.push(`nomDuJeton ne rend pas le nom de ${nom} jeton(s)`)
    if (emp) e.push(`empreinteJeton ≠ sha256 hexadécimal sur ${emp} jeton(s)`)
    const r43 = crypto.randomBytes(32).toString('base64url').replace(/[_-]/g, 'x')
    const invalides = ['', 'pa_', `pa_x_${r43}`, `pa_Essai_${r43}`, `pa_essai_${r43.slice(1)}`, `pa_essai_${r43}A`, `pb_essai_${r43}`, ` pa_essai_${r43}`, `pa_essai_${r43}\n`, `pa_es-sai_${r43}`, `pa_${'a'.repeat(41)}_${r43}`, `pa_essai_${r43.slice(0, 42)}+`]
    const acceptes = invalides.filter((j) => { try { return m.nomDuJeton(j) !== null } catch { return false } })
    if (acceptes.length) e.push(`nomDuJeton ne rend pas null sur ${acceptes.length} forme(s) invalide(s) sur 12 : ${acceptes.map((j) => court(JSON.stringify(j).replace(r43, '<43>').replace(r43.slice(0, 42), '<42>').replace(r43.slice(1), '<42>'), 30)).join(', ')}`)
    return { echecs: e, resume: `FORMAT_JETON de la fiche ; 1 000 jetons distincts, au format, 32 octets au hasard, relus par nomDuJeton ; empreinteJeton = sha256 ; null sur 12 formes invalides` }
  },

  async garde_auth(ctx) {
    const { fp, importer, depuis, lireReponse } = ctx
    const g = await importer(GA)
    const e = []
    for (const n of ['authAgent', 'reponseRefusAgent']) if (typeof g[n] !== 'function') e.push(`${n} n'est pas exportée par ${GA}`)
    if (e.length) return { echecs: e }
    const m = montageGarde(ctx)
    const cas = async (quoi, req) => {
      const n0 = fp.appels.length
      const r = await g.authAgent(req)
      const corps = estRefus(r) ? await lireReponse(g.reponseRefusAgent(r)) : null
      const ap = depuis(n0)
      return { quoi, r, corps, par: ap.filter((a) => a.fonction === 'ops_agent_par_jeton'), fautes: ap.filter((a) => a.faute) }
    }
    const nom = `essai_e2e_${hasard(6)}`
    const bon = m.connaitre(jetonEssai(nom), m.ligne(nom))
    const a = await cas('sans en-tête', m.requete({}))
    const b = await cas('mal formé', m.requete({ entete: 'Bearer pa_x_court' }))
    const c = await cas('inconnu', m.requete({ jeton: jetonEssai(`inconnu_${hasard(4)}`) }))
    for (const x of [a, b, c]) if (!estRefus(x.r) || x.r.status !== 401) e.push(`${x.quoi} : ${decrire(x.r)}, 401 attendu`)
    if (a.corps && b.corps && c.corps) {
      if (!(a.corps.texte === b.corps.texte && b.corps.texte === c.corps.texte)) e.push(`les trois refus n'ont pas le même corps : « ${court(a.corps.texte, 50)} », « ${court(b.corps.texte, 50)} », « ${court(c.corps.texte, 50)} »`)
      if ([a, b, c].some((x) => x.corps.status !== 401)) e.push(`reponseRefusAgent ne rend pas 401 (${[a, b, c].map((x) => x.corps.status).join(', ')})`)
    }
    if (a.par.length || b.par.length) e.push(`ops_agent_par_jeton appelée sans jeton au format (${a.par.length} fois sans en-tête, ${b.par.length} mal formé)`)
    if (c.par.length !== 1) e.push(`jeton inconnu : ops_agent_par_jeton appelée ${c.par.length} fois, 1 attendue`)
    const d = await cas('valide', m.requete({ jeton: bon }))
    if (!estAgent(d.r)) e.push(`jeton valide : ${decrire(d.r)}, l'agent attendu`)
    else {
      const att = { nom, capacites: ['essai'], typesCrees: ['envoi'], tablesEcrites: ['taches'], debitMinute: 7 }
      for (const [k, v] of Object.entries(att)) if (!egaux(d.r[k], v)) e.push(`jeton valide : ${k} vaut ${court(JSON.stringify(d.r[k]), 40)}, ${JSON.stringify(v)} attendu`)
    }
    if (d.par.length !== 1 || d.par[0].params?.p_hash !== sha256(bon)) e.push(`jeton valide : ops_agent_par_jeton ${d.par.length === 1 ? `reçoit p_hash ${court(d.par[0].params?.p_hash, 20)} au lieu du sha256 du jeton` : `appelée ${d.par.length} fois`}`)
    const alpha = `alpha_${hasard(4)}`
    const x1 = await cas('nom différent', m.requete({ jeton: m.connaitre(jetonEssai(alpha), m.ligne(`beta_${hasard(4)}`)) }))
    if (!estRefus(x1.r) || x1.r.status !== 401) e.push(`nom du jeton ≠ nom rendu : ${decrire(x1.r)}, 401 attendu`)
    const np = `pause_${hasard(4)}`, nd = `disj_${hasard(4)}`
    const x2 = await cas('en_pause', m.requete({ jeton: m.connaitre(jetonEssai(np), m.ligne(np, { en_pause: true })) }))
    const x3 = await cas('disjoncteur', m.requete({ jeton: m.connaitre(jetonEssai(nd), m.ligne(nd, { disjoncteur_ouvert: true })) }))
    for (const x of [x2, x3]) if (!estRefus(x.r) || x.r.status !== 423) e.push(`${x.quoi} : ${decrire(x.r)}, 423 attendu`)
    m.etat.parJeton = 'erreur'
    const x4 = await cas('erreur 500', m.requete({ jeton: bon }))
    m.etat.parJeton = 'ok'
    if (!estRefus(x4.r) || x4.r.status !== 503) e.push(`ops_agent_par_jeton en erreur 500 : ${decrire(x4.r)}, 503 attendu`)
    const fautes = fp.fautes()
    if (fautes.length) e.push(`${fautes.length} appel(s) refusé(s) par le faux PostgREST : ${fautes.slice(0, 3).map((f) => `${f.fonction || f.table} (${f.faute})`).join(', ')}`)
    return { echecs: e, resume: `sans en-tête, mal formé, inconnu : 401 au même corps (« ${court(a.corps?.texte, 50)} »), ops_agent_par_jeton appelée 0, 0 et 1 fois ; valide : ${nom} rendu, p_hash = sha256 du jeton ; nom différent 401 ; en_pause et disjoncteur 423 ; erreur 500 → 503` }
  },

  async garde_debit(ctx) {
    const { fp, importer, depuis } = ctx
    const g = await importer(GA)
    if (typeof g.authAgent !== 'function') return { echecs: [`authAgent n'est pas exportée par ${GA}`] }
    const m = montageGarde(ctx)
    const e = []
    const nom = `essai_e2e_${hasard(6)}`
    const bon = m.connaitre(jetonEssai(nom), m.ligne(nom, { debit_minute: 7 }))
    const cle = `agent:${nom}:minute`
    let n0 = fp.appels.length
    const r1 = await g.authAgent(m.requete({ jeton: bon }))
    const lim = depuis(n0).filter((a) => a.fonction === 'consommer_limite')
    const sienne = lim.find((a) => a.params?.p_cle === cle)
    if (!estAgent(r1)) e.push(`jeton valide sous le débit : ${decrire(r1)}, l'agent attendu`)
    if (!sienne) e.push(`consommer_limite n'est pas appelée avec p_cle = « agent:<nom>:minute » (appels : ${lim.map((a) => court(a.params?.p_cle, 40)).join(', ') || 'aucun'})`)
    else if (Number(sienne.params.p_max) !== 7 || Number(sienne.params.p_fenetre_s) !== 60) e.push(`consommer_limite(${cle}) : p_max ${sienne.params.p_max}, p_fenetre_s ${sienne.params.p_fenetre_s} ; debit_minute (7) et 60 attendus`)
    m.etat.mode.set(cle, 'faux')
    const r2 = await g.authAgent(m.requete({ jeton: bon }))
    if (!estRefus(r2) || r2.status !== 429) e.push(`consommer_limite rend false : ${decrire(r2)}, 429 attendu`)
    m.etat.mode.set(cle, 'erreur')
    const r3 = await g.authAgent(m.requete({ jeton: bon }))
    if (!estRefus(r3) || r3.status !== 503) e.push(`consommer_limite en erreur : ${decrire(r3)}, 503 attendu (on ne laisse pas passer, à l'inverse de lib/limites.ts)`)
    m.etat.mode.delete(cle)
    // 31 jetons mal formés d'une même adresse : le 31e refusé en 429, sans appel à ops_agent_par_jeton ni hachage
    let hachages = 0
    const origine = crypto.createHash
    crypto.createHash = function espion(alg, ...reste) { if (String(alg).toLowerCase() === 'sha256') hachages++; return origine.call(this, alg, ...reste) }
    syncBuiltinESMExports()
    const ip = '203.0.113.77', statuts = []
    let par31 = 0, h31 = 0
    try {
      for (let i = 1; i <= 31; i++) {
        if (i === 31) { hachages = 0; n0 = fp.appels.length }
        const r = await g.authAgent(m.requete({ entete: `Bearer pa_mal_forme_${i}`, ip }))
        statuts.push(estRefus(r) ? r.status : estAgent(r) ? 200 : '?')
        if (i === 31) { h31 = hachages; par31 = depuis(n0).filter((a) => a.fonction === 'ops_agent_par_jeton').length }
      }
    } finally { crypto.createHash = origine; syncBuiltinESMExports() }
    const cleIp = `agents:ip:${ip}`
    const ipAppels = fp.appels.filter((a) => a.fonction === 'consommer_limite' && a.params?.p_cle === cleIp)
    if (statuts.slice(0, 30).some((s) => s !== 401)) e.push(`jetons mal formés 1 à 30 : ${[...new Set(statuts.slice(0, 30))].join(', ')}, 401 attendu`)
    if (statuts[30] !== 429) e.push(`31e jeton mal formé de la même adresse : ${statuts[30]}, 429 attendu`)
    if (!ipAppels.length) e.push(`aucun appel à consommer_limite avec p_cle = « ${cleIp} »`)
    else if (ipAppels.some((a) => Number(a.params.p_max) !== 30 || Number(a.params.p_fenetre_s) !== 600)) e.push(`plafond par adresse : p_max ${ipAppels[0].params.p_max}, p_fenetre_s ${ipAppels[0].params.p_fenetre_s} ; 30 et 600 attendus`)
    if (par31 || h31) e.push(`31e jeton mal formé : ${par31} appel(s) à ops_agent_par_jeton, ${h31} hachage(s) sha256`)
    const fautes = fp.fautes()
    if (fautes.length) e.push(`${fautes.length} appel(s) refusé(s) par le faux PostgREST : ${fautes.slice(0, 3).map((f) => `${f.fonction || f.table} (${f.faute})`).join(', ')}`)
    return { echecs: e, resume: `consommer_limite(agent:<nom>:minute, 7, 60) ; false → 429 ; erreur → 503 ; 31 jetons mal formés de ${ip} : 30 × 401 puis 429, sans appel ni hachage (${cleIp}, 30 par 600 s)` }
  },

  async garde_exiger(ctx) {
    const { fp, importer, depuis, attendre } = ctx
    const g = await importer(GA)
    const e = []
    for (const n of ['authAgent', 'exigerType', 'exigerTable']) if (typeof g[n] !== 'function') e.push(`${n} n'est pas exportée par ${GA}`)
    if (e.length) return { echecs: e }
    const m = montageGarde(ctx)
    const nom = `essai_e2e_${hasard(6)}`
    const bon = m.connaitre(jetonEssai(nom), m.ligne(nom, { types_crees: ['envoi'], tables_ecrites: ['taches'] }))
    const canari = `canari-corps-${hasard(10)}`
    const corps = JSON.stringify({ type: 'publication', objet: canari, rappel: bon })
    const agent = await g.authAgent(m.requete({ jeton: bon, corps }))
    if (!estAgent(agent)) return { echecs: [`jeton valide : ${decrire(agent)}, l'agent attendu`] }
    const essai = async (f, arg) => { const n0 = fp.appels.length; const r = await g[f](agent, arg); await attendre(80); return { r, ev: depuis(n0).filter((a) => a.fonction === 'ops_evenement_ajouter') } }
    const t1 = await essai('exigerType', 'envoi'), t2 = await essai('exigerType', 'publication')
    const x1 = await essai('exigerTable', 'taches'), x2 = await essai('exigerTable', 'decisions')
    if (t1.r !== null) e.push(`exigerType(envoi), type de l'agent : ${decrire(t1.r)}, null attendu`)
    if (x1.r !== null) e.push(`exigerTable(taches), table de l'agent : ${decrire(x1.r)}, null attendu`)
    if (t1.ev.length || x1.ev.length) e.push('un événement est écrit sans refus')
    for (const [quoi, x] of [['exigerType(publication)', t2], ['exigerTable(decisions)', x2]]) {
      if (!estRefus(x.r) || x.r.status !== 403) e.push(`${quoi} : ${decrire(x.r)}, 403 attendu`)
      const refus = x.ev.filter((a) => a.params?.p_type === 'refus')
      if (!refus.length) { e.push(`${quoi} : aucun événement « refus » écrit (${x.ev.length} événement(s) : ${x.ev.map((a) => court(a.params?.p_type, 20)).join(', ') || 'aucun'})`); continue }
      for (const a of refus) {
        if (a.params.p_agent !== nom) e.push(`${quoi} : l'événement porte p_agent « ${court(a.params.p_agent, 30)} », ${nom} attendu`)
        const resume = String(a.params.p_resume ?? '')
        if (/pa_/.test(resume)) e.push(`${quoi} : le résumé contient « pa_ »`)
        if (/[0-9a-f]{64}/i.test(resume)) e.push(`${quoi} : le résumé contient 64 hexadécimaux`)
        if (resume.includes(canari) || resume.includes(corps)) e.push(`${quoi} : le résumé contient le corps de la requête`)
        const tout = JSON.stringify(a.params)
        if (tout.includes(bon) || tout.includes(sha256(bon)) || tout.includes(canari)) e.push(`${quoi} : l'événement porte le jeton, son empreinte ou le corps`)
      }
    }
    m.etat.evenement = 'panne'
    const t3 = await essai('exigerType', 'publication'), x3 = await essai('exigerTable', 'decisions')
    if (!estRefus(t3.r) || t3.r.status !== 403) e.push(`journal en panne : exigerType rend ${decrire(t3.r)}, 403 attendu`)
    if (!estRefus(x3.r) || x3.r.status !== 403) e.push(`journal en panne : exigerTable rend ${decrire(x3.r)}, 403 attendu`)
    const fautes = fp.fautes()
    if (fautes.length) e.push(`${fautes.length} appel(s) refusé(s) par le faux PostgREST : ${fautes.slice(0, 3).map((f) => `${f.fonction || f.table} (${f.faute})`).join(', ')}`)
    return { echecs: e, resume: 'hors de ses types ou tables → 403 et un événement « refus » (p_agent, sans pa_, 64 hex, corps, jeton ni empreinte) ; dans ses types et tables → null, aucun événement ; journal en panne → 403 quand même' }
  },

  async bus({ fp, importer, depuis }) {
    const e = []
    const b = await importer(BU)
    const contrat = C.lireContrat()
    const fonctions = C.fonctionsDuBus(contrat)
    const types = new Map()
    for (const [, ps] of fonctions) for (const [n, t] of ps) { if (types.has(n) && types.get(n) !== t) throw new Error(`le contrat donne deux types à ${n} : le juge ne sait pas bâtir l'objet universel`); types.set(n, t) }
    const valeur = (t) => {
      const x = String(t).toLowerCase()
      if (x.endsWith('[]')) return ['essai']
      if (x === 'uuid') return C.uuid()
      if (/^(int|integer|bigint|smallint)/.test(x)) return 3
      if (/^(numeric|real|double)/.test(x)) return 1.5
      if (/^bool/.test(x)) return true
      if (/^jsonb?$/.test(x)) return { essai: true }
      if (/^(timestamptz|timestamp|date)/.test(x)) return new Date().toISOString()
      return `essai_${hasard(4)}`
    }
    const universel = Object.fromEntries([...types].map(([n, t]) => [n, valeur(t)]))
    for (const [F] of fonctions) fp.reponses[F] = { temoin: F }
    const carte = new Map(), fautes = []
    for (const [n, f] of Object.entries(b).filter(([, v]) => typeof v === 'function')) {
      const n0 = fp.appels.length
      let r
      try { r = await f(structuredClone(universel)) } catch { continue }
      const ap = depuis(n0).filter((a) => a.fonction)
      for (const a of ap.filter((x) => x.faute)) fautes.push(`${n} → ${a.fonction} : ${a.faute === 'parametres' ? 'paramètres refusés (noms hors du contrat)' : a.faute}`)
      if (ap.length === 1 && !ap[0].faute) { if (!carte.has(ap[0].fonction)) carte.set(ap[0].fonction, []); carte.get(ap[0].fonction).push({ n, f, r }) }
    }
    for (const x of fautes.slice(0, 6)) e.push(x)
    const sans = fonctions.map(([F]) => F).filter((F) => !carte.has(F))
    if (sans.length) e.push(`${sans.length} fonction(s) du contrat sans fonction dans bus.ts (ou appelée avec des paramètres refusés) : ${sans.join(', ')}`)
    const mal = [...carte].filter(([F, l]) => !l.some((x) => x.r && x.r.ok === true && egaux(x.r.data, { temoin: F }))).map(([F]) => F)
    if (mal.length) e.push(`${mal.length} fonction(s) qui ne rendent pas { ok: true, data } : ${mal.slice(0, 6).join(', ')}`)
    const T = b.STATUT_ERREUR
    const codes = Object.entries(contrat.erreurs).filter(([, fi]) => fi.some((x) => x === '026-011' || x === '026-013')).map(([c]) => c.replace(/^ops:/, ''))
    if (!T || typeof T !== 'object') e.push('STATUT_ERREUR n\'est pas exportée')
    else {
      const faux = codes.filter((c) => T[c] !== STATUTS_FICHE[c])
      if (faux.length) e.push(`STATUT_ERREUR : ${faux.length} code(s) des contrats 0097 et 0098 absent(s) ou au mauvais statut : ${faux.slice(0, 8).map((c) => `${c}=${T[c] ?? '∅'} (${STATUTS_FICHE[c]} attendu)`).join(', ')}`)
    }
    const creer = carte.get('ops_tache_creer')?.[0]
    if (creer) {
      const essais = [
        ['ops:quota', erreurOps('quota'), { ok: false, code: 'quota', status: 429 }],
        ['ops:profondeur', erreurOps('profondeur'), { ok: false, code: 'profondeur', status: 409 }],
      ]
      for (const [quoi, rep, att] of essais) {
        fp.reponses.ops_tache_creer = () => rep
        const r = await creer.f(structuredClone(universel))
        if (!r || r.ok !== false || r.code !== att.code || r.status !== att.status) e.push(`${quoi} : ${creer.n} rend ${court(JSON.stringify(r), 80)}, ${JSON.stringify(att)} attendu`)
      }
      fp.reponses.ops_tache_creer = () => erreurPg('new row for relation "ops.taches" violates check constraint "taches_charge_check"', '23514', 400)
      const r = await creer.f(structuredClone(universel))
      if (!r || r.ok !== false || r.status !== 500) e.push(`erreur Postgres sans code ops: : ${creer.n} rend ${court(JSON.stringify(r), 80)}, un statut 500 attendu`)
      if (/ops\.|violates|relation/i.test(JSON.stringify(r ?? ''))) e.push(`erreur Postgres sans code ops: : le texte brut sort de bus.ts (${court(JSON.stringify(r), 80)})`)
    }
    return { echecs: e, resume: `${fonctions.length} fonctions des contrats 0097 et 0098, chacune appelée avec un objet aux clés p_… : une fonction SQL, noms acceptés par le faux PostgREST, { ok: true, data } ; STATUT_ERREUR couvre les ${codes.length} codes ops: de 026-011 et 026-013 au statut de la fiche ; ops:quota 429, ops:profondeur 409 ; erreur brute → 500 sans texte Postgres` }
  },

  async reel({ importer, params }) {
    const g = await importer(GA)
    const r = await g.authAgent(new Request('https://prestiapp.fr/api/agents/etat', { headers: { authorization: `Bearer ${params.jeton}`, 'x-forwarded-for': '203.0.113.9' } }))
    return { echecs: estAgent(r) && r.nom === params.nom ? [] : [`authAgent contre la vraie base : ${decrire(r)}, l'agent ${params.nom} attendu`], resume: `authAgent contre la vraie base rend ${params.nom}` }
  },
}

// ── Côté juge ──────────────────────────────────────────────────────────────────────────────────────────────────────
async function jugerJetons(racine) {
  if (!C.existe(racine, JE)) return res([`${JE} absent`])
  const g = C.grapheExecution(racine, path.join(racine, JE))
  const x = await sonde('jetons', racine)
  const r = deSonde(x)
  return res([...g.defauts.map((d) => `graphe d'importations : ${d}`), ...r.echecs], `${r.resume} ; graphe d'importations : ${g.locaux.length} fichier(s) local(aux), paquets ${g.externes.join(', ') || 'aucun'}`)
}
async function jugerGarde(racine, nom) {
  const n = nonJuge(racine, [GA, BU, JE])
  if (n) return n
  return deSonde(await sonde(nom, racine))
}
async function jugerBus(racine) {
  const n = nonJuge(racine, [BU])
  if (n) return n
  return deSonde(await sonde('bus', racine))
}

function lister(d, pre = '') {
  const out = []
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) out.push(...lister(path.join(d, e.name), `${pre}${e.name}/`))
    else out.push(`${pre}${e.name}`)
  }
  return out
}
const TTY = `data:text/javascript,${encodeURIComponent("Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true })")}`
async function jugerScript(racine) {
  if (!C.existe(racine, SC)) return res([`non jugé : ${SC} absent`])
  const e = []
  const src = C.lire(racine, SC)
  if (/console\.\w+\s*\([^;]*process\.env/.test(C.sansCommentairesTs(src))) e.push(`${SC} affiche une variable d'environnement (console.* de process.env)`)
  const d = path.join(C.dossierTravail(JUGE, 'jeton'), hasard(8))
  fs.mkdirSync(path.join(d, 'scripts'), { recursive: true })
  if (fs.existsSync(path.join(racine, 'lib'))) fs.cpSync(path.join(racine, 'lib'), path.join(d, 'lib'), { recursive: true })
  fs.copyFileSync(path.join(racine, SC), path.join(d, SC))
  const fp = await demarrer({ contrat: C.lireContrat(), reponses: { ops_agent_poser_jeton: (p) => (String(p.p_nom).startsWith('inconnu_') ? erreurOps('agent_inconnu') : { status: 200, body: null }) } })
  const cle = ['cle', 'factice', 'juge', hasard(6)].join('-')
  fs.writeFileSync(path.join(d, '.env.local'), `NEXT_PUBLIC_SUPABASE_URL=${fp.url}\nSUPABASE_SERVICE_ROLE_KEY=${cle}\n`)
  const avant = lister(d)
  const lancerScript = (args, tty = false) => C.lancer(process.execPath, ['--experimental-strip-types', '--no-warnings', '--import', pathToFileURL(C.CHARGEUR).href, ...(tty ? ['--import', TTY] : []), SC, ...args], { cwd: d, env: C.envSansSecret(), delaiMs: 60_000 })
  const poses = (n0) => fp.appels.slice(n0).filter((a) => a.fonction === 'ops_agent_poser_jeton')
  try {
    const nom = `essai_e2e_${hasard(6)}`
    let n0 = fp.appels.length
    const a = await lancerScript([nom])
    const sortieA = `${a.stdout}${a.stderr}`
    const vus = sortieA.match(RE_JETONS) || []
    const pa = poses(n0)
    if (a.code !== 0) e.push(`agent connu : code ${a.code} (« ${court(sortieA, 100)} »)`)
    if (vus.length !== 1) e.push(`agent connu : ${vus.length} jeton(s) dans la sortie, un seul attendu`)
    else {
      const j = vus[0]
      if (!FORMAT_SPEC.test(j)) e.push('le jeton affiché n\'est pas au format')
      if (sortieA.split(j).length - 1 !== 1) e.push(`le jeton paraît ${sortieA.split(j).length - 1} fois dans la sortie, une seule attendue`)
      if (pa.length !== 1) e.push(`ops_agent_poser_jeton appelée ${pa.length} fois, 1 attendue`)
      else if (pa[0].params?.p_hash !== sha256(j) || pa[0].params?.p_nom !== nom) e.push(`ops_agent_poser_jeton reçoit ${pa[0].params?.p_nom === nom ? 'une empreinte qui n\'est pas le sha256 du jeton affiché' : `p_nom « ${court(pa[0].params?.p_nom, 30)} »`}`)
    }
    if (sortieA.includes(cle)) e.push('la clé de service du .env.local paraît dans la sortie')
    const b = await lancerScript([`inconnu_${hasard(5)}`])
    if (b.code !== 1) e.push(`agent inconnu : code ${b.code}, 1 attendu`)
    n0 = fp.appels.length
    const c = await lancerScript([nom, '--sortie=tube'])
    if (c.code !== 0) e.push(`--sortie=tube : code ${c.code} (« ${court(c.stderr, 80)} »)`)
    if (!/^pa_[a-z0-9_]{2,40}_[A-Za-z0-9_-]{43}\n$/.test(c.stdout)) e.push(`--sortie=tube : la sortie n'est pas exactement « <jeton>\\n » (${court(JSON.stringify(c.stdout.replace(RE_JETONS, '<jeton>')), 80)})`)
    else {
      const pc = poses(n0)
      if (pc.length !== 1 || pc[0].params?.p_hash !== sha256(c.stdout.slice(0, -1))) e.push('--sortie=tube : l\'empreinte posée n\'est pas le sha256 du jeton écrit')
    }
    n0 = fp.appels.length
    const t = await lancerScript([nom, '--sortie=tube'], true)
    if (t.code !== 2) e.push(`--sortie=tube vers un terminal (isTTY) : code ${t.code}, 2 attendu`)
    if (fp.appels.length > n0) e.push(`--sortie=tube vers un terminal : ${fp.appels.length - n0} appel(s) au faux PostgREST, aucun attendu`)
    if (RE_JETONS.test(t.stdout)) e.push('--sortie=tube vers un terminal : un jeton est écrit')
    RE_JETONS.lastIndex = 0
    const nouveaux = lister(d).filter((f) => !avant.includes(f))
    if (nouveaux.length) e.push(`fichier(s) nouveau(x) dans la copie : ${nouveaux.slice(0, 4).join(', ')}`)
    const fautes = fp.fautes()
    if (fautes.length) e.push(`${fautes.length} appel(s) refusé(s) par le faux PostgREST (${fautes[0].fonction} : ${fautes[0].faute})`)
  } finally {
    await fp.arreter()
    try { fs.rmSync(d, { recursive: true, force: true, maxRetries: 3 }) } catch { /* ménage au prochain passage */ }
  }
  return res(e, `copie sous .orchestre/travail/${JUGE}/jeton/, .env.local factice : jeton au format affiché une fois, empreinte posée = son sha256, aucun fichier nouveau ; agent inconnu → 1 ; --sortie=tube : « <jeton>\\n » seul ; terminal (isTTY) → 2 sans appel ; aucun console.* de process.env`)
}

function jugerStatique(racine) {
  const e = []
  for (const rel of [GA, JE, BU]) {
    const t = C.lire(racine, rel)
    if (t === null) { e.push(`non jugé : ${rel} absent (AG-1)`); continue }
    const code = C.sansCommentairesTs(t)
    for (const [re, quoi] of [[/ANTHROPIC/, 'ANTHROPIC'], [/lib\/agents\/llm/, 'lib/agents/llm'], [/lib\/stripe/, 'lib/stripe']]) if (re.test(code)) e.push(`${rel} mentionne ${quoi}`)
    for (const imp of C.importsDe(code)) {
      const cible = imp.spec.startsWith('@/') ? imp.spec.slice(2) : imp.spec.startsWith('.') ? C.posix(path.relative(racine, path.resolve(path.dirname(path.join(racine, rel)), imp.spec))) : null
      if (cible && (/^lib\/stripe(\.ts)?$/.test(cible) || /^lib\/agents\/llm(\.ts)?$/.test(cible))) e.push(`${rel} importe ${cible}`)
    }
  }
  const lim = C.lire(racine, 'lib/limites.ts'), h = C.aHead('lib/limites.ts'), ref = C.aLaReference('lib/limites.ts')
  if (lim === null) e.push('lib/limites.ts absent de la racine')
  else {
    if (h === null || lim !== h) e.push('lib/limites.ts diffère de HEAD')
    if (ref === null || lim !== ref) e.push('lib/limites.ts diffère de la référence de preuve-01.json')
  }
  return res(e, 'garde.ts, jetons.ts et bus.ts sans ANTHROPIC, lib/agents/llm ni lib/stripe ; lib/limites.ts égal à HEAD et à la référence')
}

async function jugerTypecheck(racine) {
  const n = nonJuge(racine, [GA, JE, BU])
  if (n) return n
  return C.typecheck(JUGE, racine, [GA, JE, BU])
}

function lireEnvLocal() {
  const env = {}
  try { for (const l of fs.readFileSync(path.join(C.R, '.env.local'), 'utf8').split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '') } } catch { /* absent */ }
  return env
}
async function jugerReel(racine) {
  const n = nonJuge(racine, [GA, JE, BU])
  if (n) return n
  const env = lireEnvLocal()
  const url = env.NEXT_PUBLIC_SUPABASE_URL, service = env.SUPABASE_SERVICE_ROLE_KEY, anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !service || !anon) return res(['.env.local : adresse, clé de service ou clé anonyme absente (rien n\'est affiché)'])
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
  const nom = `essai_e2e_${hasard(8)}`
  const jeton = jetonEssai(nom)
  const e = []
  let enregistre = false
  try {
    const a = await sb.rpc('ops_agent_enregistrer', { p_nom: nom, p_libelle: 'essai du juge agents-garde-qa', p_capacites: ['essai'], p_types_crees: [], p_tables: [], p_periode_minutes: 60, p_debit_minute: 5, p_quota_creations_jour: 0, p_plafond_euros_jour: 0 })
    if (a.error) return res([`ops_agent_enregistrer : ${court(a.error.code || 'erreur', 40)}`])
    enregistre = true
    const b = await sb.rpc('ops_agent_poser_jeton', { p_nom: nom, p_hash: sha256(jeton) })
    if (b.error) return res([`ops_agent_poser_jeton : ${court(b.error.code || 'erreur', 40)}`])
    const x = await sonde('reel', racine, { reel: true, jeton, nom }, { env: { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: service } })
    const r = deSonde(x)
    e.push(...r.echecs.map((m) => m.split(service).join('<clé>')))
    const anonyme = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
    const z = await anonyme.rpc('ops_agent_par_jeton', { p_hash: sha256(jeton) })
    if (!z.error) e.push('avec la clé anonyme, ops_agent_par_jeton répond : elle devrait être refusée')
  } finally {
    if (enregistre) { const f = await sb.rpc('ops_agent_retirer', { p_nom: nom }); if (f.error) e.push(`ménage : ops_agent_retirer(${nom}) a échoué, à retirer à la main`) }
  }
  return res(e, `${nom} enregistré, empreinte posée ; authAgent contre la vraie base rend l'agent ; clé anonyme refusée ; retiré dans le finally`)
}

// ── Les sabotages du témoin : chacun doit rendre son critère ROUGE ────────────────────────────────────────────────────
const TJ = JE, TG = GA, TB = BU, TS = SC
export const SABOTAGES = [
  { id: 'AG-1', nom: 'format assoupli', fichier: TJ, chercher: '{43})$/', remplacer: '{40,43})$/' },
  { id: 'AG-1', nom: 'jeton de 30 octets', fichier: TJ, chercher: 'randomBytes(32)', remplacer: 'randomBytes(30)' },
  { id: 'AG-1', nom: 'empreinte en base64', fichier: TJ, chercher: ".digest('hex')", remplacer: ".digest('base64')" },
  { id: 'AG-1', nom: 'nomDuJeton laxiste', fichier: TJ, chercher: 'const m = FORMAT_JETON.exec(jeton)', remplacer: 'const m = /^pa_(.+?)_(.+)$/.exec(jeton)' },
  { id: 'AG-1', nom: 'import de la base', fichier: TJ, chercher: "import crypto from 'node:crypto'", remplacer: "import crypto from 'node:crypto'\nimport { supabaseAdmin } from '@/lib/supabaseAdmin'\nexport const base = supabaseAdmin" },
  { id: 'AG-2', nom: 'jeton inconnu au corps différent', fichier: TG, chercher: 'ligne.nom !== nomDuJeton(jeton)) return JETON', remplacer: "ligne.nom !== nomDuJeton(jeton)) return { ...JETON, error: 'Jeton inconnu.' }" },
  { id: 'AG-2', nom: 'hachage avant le format', fichier: TG, chercher: 'if (!FORMAT_JETON.test(jeton)) {', remplacer: 'await ops_agent_par_jeton({ p_hash: empreinteJeton(jeton) })\n  if (!FORMAT_JETON.test(jeton)) {' },
  { id: 'AG-2', nom: 'nom du jeton non comparé', fichier: TG, chercher: " || ligne.nom !== nomDuJeton(jeton)", remplacer: '' },
  { id: 'AG-2', nom: 'disjoncteur ignoré', fichier: TG, chercher: ' || ligne.disjoncteur_ouvert === true', remplacer: '' },
  { id: 'AG-2', nom: 'panne de la base en 401', fichier: TG, chercher: 'if (!r.ok) return INJOIGNABLE', remplacer: 'if (!r.ok) return JETON' },
  { id: 'AG-3', nom: 'fail-open sur le débit', fichier: TG, chercher: "if (error) { console.error('[agents] consommer_limite :', error.message); return null }", remplacer: "if (error) { console.error('[agents] consommer_limite :', error.message); return true }" },
  { id: 'AG-3', nom: 'clé du débit sans la minute', fichier: TG, chercher: 'agent:${agent.nom}:minute', remplacer: 'agent:${agent.nom}' },
  { id: 'AG-3', nom: 'fenêtre d\'une heure', fichier: TG, chercher: 'agent.debitMinute, 60)', remplacer: 'agent.debitMinute, 3600)' },
  { id: 'AG-3', nom: 'plafond par adresse à 31', fichier: TG, chercher: ', 30, 600)', remplacer: ', 31, 600)' },
  { id: 'AG-4', nom: 'type non vérifié', fichier: TG, chercher: 'if (agent.typesCrees.includes(type)) return null', remplacer: 'if (agent.typesCrees.length) return null' },
  { id: 'AG-4', nom: 'jeton dans le journal', fichier: TG, chercher: 'route: new URL(req.url).pathname', remplacer: 'route: `${new URL(req.url).pathname} ${jeton}`' },
  { id: 'AG-4', nom: 'journal en panne fatal', fichier: TG, chercher: "if (!journal) console.error('[agents] refus non journalisé :', agent.nom, r.code)", remplacer: "if (!journal) return { status: 503, code: 'journal', error: 'Journal indisponible.' }" },
  { id: 'AG-4', nom: 'événement mal typé', fichier: TG, chercher: "p_type: 'refus'", remplacer: "p_type: 'essai'" },
  { id: 'AG-5', nom: 'paramètre renommé', fichier: TB, chercher: "appeler('ops_tache_creer', ['p_agent',", remplacer: "appeler('ops_tache_creer', ['agent'," },
  { id: 'AG-5', nom: 'fonction manquante', fichier: TB, chercher: /^export const ops_battement = .*$/m, remplacer: '' },
  { id: 'AG-5', nom: 'statut oublié', fichier: TB, chercher: 'bail_perdu: 409, ', remplacer: '' },
  { id: 'AG-5', nom: 'quota en 500', fichier: TB, chercher: 'quota: 429,', remplacer: 'quota: 500,' },
  { id: 'AG-5', nom: 'texte Postgres qui sort', fichier: TB, chercher: "return { ok: false, code: 'erreur', status: 500 }", remplacer: 'return { ok: false, code: String(r.error.message), status: 500 }' },
  { id: 'AG-6', nom: 'jeton affiché deux fois', fichier: TS, chercher: 'if (tube) process.stdout.write(', remplacer: 'console.error(`rappel : ${jeton}`)\nif (tube) process.stdout.write(' },
  { id: 'AG-6', nom: 'empreinte d\'autre chose', fichier: TS, chercher: '.update(jeton).digest', remplacer: '.update(nom + jeton).digest' },
  { id: 'AG-6', nom: 'terminal accepté', fichier: TS, chercher: 'if (tube && process.stdout.isTTY)', remplacer: 'if (tube && process.stdout.isTTY && false)' },
  { id: 'AG-6', nom: 'tube bavard', fichier: TS, chercher: 'if (tube) process.stdout.write(`${jeton}\\n`)', remplacer: 'if (tube) process.stdout.write(`jeton : ${jeton}\\n`)' },
  { id: 'AG-6', nom: 'fichier écrit', fichier: TS, chercher: 'if (tube) process.stdout.write(', remplacer: "fs.writeFileSync('.dernier-jeton', empreinte)\nif (tube) process.stdout.write(" },
  { id: 'AG-6', nom: 'agent inconnu en code 0', fichier: TS, chercher: '(le script n’enregistre jamais un agent)`); process.exit(1)', remplacer: '(le script n’enregistre jamais un agent)`); process.exit(0)' },
  { id: 'AG-6', nom: 'clé affichée', fichier: TS, chercher: 'const jeton = `pa_', remplacer: 'console.log(process.env.SUPABASE_SERVICE_ROLE_KEY)\nconst jeton = `pa_' },
  { id: 'AG-7', nom: 'moteur de modèle cité', fichier: TG, chercher: "export type RefusAgent", remplacer: "export const MOTEUR = 'lib/agents/llm'\nexport type RefusAgent" },
  { id: 'AG-7', nom: 'clé Anthropic lue', fichier: TB, chercher: 'export type ResultatBus', remplacer: 'export const CLE = process.env.ANTHROPIC_API_KEY\nexport type ResultatBus' },
  { id: 'AG-7', nom: 'lib/limites.ts touché', fichier: 'lib/limites.ts', chercher: 'fail-open', remplacer: 'fail-open assumé' },
]

export const CRITERES = {
  'AG-1': { juger: jugerJetons },
  'AG-2': { juger: (r) => jugerGarde(r, 'garde_auth') },
  'AG-3': { juger: (r) => jugerGarde(r, 'garde_debit') },
  'AG-4': { juger: (r) => jugerGarde(r, 'garde_exiger') },
  'AG-5': { juger: jugerBus },
  'AG-6': { juger: jugerScript },
  'AG-7': { juger: async (r) => jugerStatique(r) },
  'AG-8': { juger: jugerTypecheck, temoin: async (r) => C.eprouverLectureTypecheck(r, [GA, JE, BU]) },
  'AG-9': { juger: jugerReel, reel: true },
}

async function principal() {
  const o = C.lireOptions(process.argv.slice(2), JUGE)
  await C.derouler({
    juge: JUGE, ids: IDS, criteres: CRITERES, sabotages: SABOTAGES, o,
    temoin: { attendus: [JE, GA, BU, SC] },
    prealables: [C.autoControleFauxPostgrest],
  })
}
const pareil = (a, b) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b)
if (process.argv[1] && pareil(path.resolve(process.argv[1]), FICHIER)) await principal()
