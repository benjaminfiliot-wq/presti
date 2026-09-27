#!/usr/bin/env node
// scripts/agents-routes-qa.mjs — le juge de la fiche 026-042 (les routes /api/agents/* du bus), écrit par Claude Code en 026-038.
// Les routes sont importées dans un processus à part (doublures/sonde.mjs), sans réseau ni secret, avec la vraie garde et le
// vrai bus de la racine (lib/agents/garde.ts, bus.ts) : le vrai client @supabase/supabase-js parle à un faux PostgREST
// (scripts/lib/faux-postgrest.mjs) qui refuse tout nom de paramètre hors de contrat-ops.json. Seul lib/flags est doublé
// (doublures/lib/flags.mjs : le drapeau busAgents baissé ou levé par le juge).
//
//   AR-1  les 7 fichiers de routes existent, chacun avec runtime = 'nodejs' et dynamic = 'force-dynamic' ; [id] typé en
//         promesse et attendu.
//   AR-2  lib/flags.ts porte busAgents: false, et son diff avec HEAD se limite à ce drapeau et à son commentaire ; la carte de
//         scripts/fermeture-e2e.mjs gagne exactement la ligne 'busAgents': ['route', '/api/agents/etat', 'GET', <les 7>], et
//         rien d'autre ; drapeau baissé, les 9 méthodes des 7 routes répondent 404 sans aucun appel au faux PostgREST.
//   AR-3  drapeau levé, sans jeton : 401 partout, et aucun appel hors d'ops_agent_par_jeton et consommer_limite.
//   AR-4  un type hors typesCrees → 403 sans ops_tache_creer ; un agent sans la table evenements, ou sans decisions → 403.
//   AR-5  chaque méthode appelle exactement sa fonction (noms de paramètres acceptés par le faux PostgREST) ; un corps qui porte
//         agent: 'a0' envoyé avec le jeton de essai_e2e_x donne p_agent = 'essai_e2e_x'.
//   AR-6  17 Ko → 413 ; JSON invalide → 400 ; résumé de 201 signes → 400 ; resultat: 'reussi' → 400 ; sans appel SQL.
//   AR-7  ops:quota → 429, ops:profondeur → 409, ops:bail_perdu → 409, erreur sans code ops: → 500 sans « ops. »,
//         « violates » ni « relation ».
//   AR-8  app/api/agents/** (hors tic/, fiche 026-049) ne mentionne ni ops_decision_trancher, ops_interrupteur_poser,
//         ops_agent_poser_jeton, ops_agent_enregistrer, ops_agent_retirer, acq_, supabaseAdmin ni ANTHROPIC.
//   AR-9  GET /api/agents/etat rend le JSON d'ops_etat, sans rien qui ressemble à une adresse e-mail.
//   AR-10 npm run typecheck en code 0, --listFiles : les 7 routes vérifiées, sans @ts-nocheck ni @ts-ignore.
//   AR-11 (--reel, après déploiement, drapeau levé, 0096 à 0098 appliquées) sur https://prestiapp.fr : essai_e2e_<aléa>
//         enregistré, POST taches 201, prendre, rendre faite, POST decisions, sans jeton 401 ; ménage dans un finally.
//   AR-12 idempotence : creee true puis false pour la même clé → 201 puis 200, même id, sur taches et sur decisions.
//   AR-13 GET decisions?tranchees=1&depuis=<il y a 2 jours> : ops_decisions_tranchees une fois, p_agent = l'agent du jeton
//         (un agent=a0 dans la requête n'y change rien), p_depuis = la date passée, la liste rendue telle quelle ; sans
//         tranchees=1, depuis absent, mal formé ou vieux de 31 jours → 400 sans appel SQL.
//   AR-14 (correction du 27/09 de 026-042) le vocabulaire des consignes : consigne, consigne_lue, reunion_compte_rendu et
//         cycle_termine postés passent tels quels (p_type, p_objet, p_agent du jeton) ; GET evenements rend la liste du bus
//         sans en ôter aucun événement.
//
// Usage : node scripts/agents-routes-qa.mjs [--racine=<dossier>] [--temoin] [--reel]
//   --temoin : chaque critère sur le témoin (doublures/temoins/ ; lib/flags.ts et scripts/fermeture-e2e.mjs dérivés de HEAD)
//              doit être VERT, puis chaque sabotage déclaré plus bas doit rendre son critère ROUGE.
// Sortie : une ligne par critère, puis « agents-routes-qa : PASS » ou « … : FAIL — ids ». Code 0 si tout est vert, 1 sinon,
// 2 si un préalable manque.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as C from './fixtures/026-horloge-bus/doublures/commun.mjs'
import { erreurOps, erreurPg } from './lib/faux-postgrest.mjs'

const JUGE = 'agents-routes-qa'
const FICHIER = fileURLToPath(import.meta.url)
const IDS = ['AR-1', 'AR-2', 'AR-3', 'AR-4', 'AR-5', 'AR-6', 'AR-7', 'AR-8', 'AR-9', 'AR-10', 'AR-11', 'AR-12', 'AR-13', 'AR-14']
const { court, hasard, sha256, jetonEssai } = C
const T = 'app/api/agents/taches/route.ts', P = 'app/api/agents/taches/prendre/route.ts', RE = 'app/api/agents/taches/[id]/rendre/route.ts'
const EV = 'app/api/agents/evenements/route.ts', DE = 'app/api/agents/decisions/route.ts', BA = 'app/api/agents/battement/route.ts', ET = 'app/api/agents/etat/route.ts'
export const FICHIERS = [T, P, RE, EV, DE, BA, ET]
const FLAGS = 'lib/flags.ts', FERMETURE = 'scripts/fermeture-e2e.mjs'
const GARDE = new Set(['ops_agent_par_jeton', 'consommer_limite'])
const JOUR = 86_400_000

const res = (echecs, resume = '') => ({ ok: echecs.length === 0, echecs, resume })
const nonJuge = (racine) => { const a = [...FICHIERS, 'lib/agents/garde.ts', 'lib/agents/bus.ts'].filter((r) => !C.existe(racine, r)); return a.length ? res([`non jugé : ${a.length} fichier(s) absent(s) (${a.slice(0, 3).join(', ')}${a.length > 3 ? '…' : ''}) (AR-1)`]) : null }
const sonde = (nom, racine, params = {}) => C.lancerSonde({ juge: JUGE, jugeFichier: FICHIER, nom, racine, params, doublures: ['lib/flags'] })
const deSonde = (x) => (x.ok ? res(x.res.echecs || ['résultat de sonde sans liste'], x.res.resume || '') : res([x.erreur]))

// ── Côté sonde ─────────────────────────────────────────────────────────────────────────────────────────────────────
const egaux = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const ETAT = { taches: { file: 2, bail: 1, faite: 5, echecs_24h: 0 }, agents: [{ nom: 'chef', capacites: ['plan'], en_pause: false }], genere_le: '2026-09-27T08:00:00Z' }
/** Les 9 méthodes des 7 routes, avec un appel valide de chacune. */
function methodes(id) {
  const echeance = new Date(Date.now() + JOUR).toISOString(), depuis = new Date(Date.now() - 2 * JOUR).toISOString()
  return [
    { f: T, m: 'POST', chemin: '/api/agents/taches', fonction: 'ops_tache_creer', corps: { type: 'envoi', cle: `cle-${hasard(6)}`, capacite: 'essai', charge: { a: 1 }, objet: 'objet du juge', agent: 'a0' } },
    { f: P, m: 'POST', chemin: '/api/agents/taches/prendre', fonction: 'ops_tache_prendre' },
    { f: RE, m: 'POST', chemin: `/api/agents/taches/${id}/rendre`, fonction: 'ops_tache_rendre', id, corps: { resultat: 'faite', preuve_url: 'https://prestiapp.fr/preuve-du-juge', agent: 'a0' } },
    { f: EV, m: 'POST', chemin: '/api/agents/evenements', fonction: 'ops_evenement_ajouter', corps: { type: 'essai', resume: 'essai du juge', objet: 'objet du juge', agent: 'a0' } },
    { f: EV, m: 'GET', chemin: '/api/agents/evenements?apres=5&limite=10', fonction: 'ops_evenements_lire' },
    { f: DE, m: 'POST', chemin: '/api/agents/decisions', fonction: 'ops_decision_creer', corps: { question: 'Lancer l’essai du juge ?', options: [{ cle: 'oui', libelle: 'Oui', recommandee: true }, { cle: 'non', libelle: 'Non', recommandee: false }], defaut: 'non', portee: 'essai', echeance, cle: `dec-${hasard(6)}`, agent: 'a0' } },
    { f: DE, m: 'GET', chemin: `/api/agents/decisions?tranchees=1&depuis=${encodeURIComponent(depuis)}`, fonction: 'ops_decisions_tranchees', depuis },
    { f: BA, m: 'POST', chemin: '/api/agents/battement', fonction: 'ops_battement' },
    { f: ET, m: 'GET', chemin: '/api/agents/etat', fonction: 'ops_etat' },
  ]
}
function montage({ fp, J, importer, depuis, lireReponse }, { drapeau = true } = {}) {
  J.drapeaux = drapeau ? { busAgents: true } : {}
  const connus = new Map()
  const ids = { tache: C.uuid(), decision: C.uuid() }
  const liste = [{ id: C.uuid(), cle_idempotence: 'dec-1', choix: 'oui', tranchee_le: new Date(Date.now() - JOUR).toISOString() }]
  const valeurs = {
    ops_agent_par_jeton: (p) => ({ status: 200, body: connus.has(p.p_hash) ? [connus.get(p.p_hash)] : [] }),
    consommer_limite: () => ({ status: 200, body: true }),
    ops_evenement_ajouter: () => ({ status: 200, body: 42 }),
    ops_tache_creer: () => ({ status: 200, body: [{ id: ids.tache, creee: true }] }),
    ops_tache_prendre: () => ({ status: 200, body: [{ id: ids.tache, type: 'envoi', cle_idempotence: 'k', objet: null, capacite: 'essai', charge: {}, tentatives: 0, bail_jusqua: new Date(Date.now() + 600_000).toISOString(), origine_id: null, profondeur: 0 }] }),
    ops_tache_rendre: () => ({ status: 200, body: 'faite' }),
    ops_evenements_lire: () => ({ status: 200, body: [] }),
    ops_decision_creer: () => ({ status: 200, body: [{ id: ids.decision, creee: true }] }),
    ops_decisions_tranchees: () => ({ status: 200, body: liste }),
    ops_battement: () => ({ status: 200, body: new Date().toISOString() }),
    ops_etat: () => ({ status: 200, body: ETAT }),
  }
  Object.assign(fp.reponses, valeurs)
  const agent = (nom, x = {}) => {
    const jeton = jetonEssai(nom)
    connus.set(sha256(jeton), { nom, capacites: ['essai'], types_crees: ['envoi', 'essai'], tables_ecrites: ['taches', 'evenements', 'decisions'], debit_minute: 1000, en_pause: false, disjoncteur_ouvert: false, ...x })
    return jeton
  }
  const modules = new Map()
  let k = 20
  /** Appelle une méthode : { status, texte, json, appels, metier, fautes } ; metier = les appels hors de la garde. */
  const appeler = async (meth, { jeton, corps = meth.corps, brut, chemin = meth.chemin } = {}) => {
    if (!modules.has(meth.f)) modules.set(meth.f, await importer(meth.f))
    const mod = modules.get(meth.f)
    if (typeof mod[meth.m] !== 'function') return { status: null, texte: `${meth.m} n'est pas exportée par ${meth.f}`, json: null, appels: [], metier: [], fautes: [], absente: true }
    const h = { 'x-forwarded-for': `198.51.100.${(k++ % 200) + 20}` }
    if (jeton) h.authorization = `Bearer ${jeton}`
    let body
    if (meth.m !== 'GET') { body = brut !== undefined ? brut : corps !== undefined ? JSON.stringify(corps) : undefined; if (body !== undefined) { h['content-type'] = 'application/json'; h['content-length'] = String(Buffer.byteLength(body)) } }
    let req
    try { req = new Request(`http://127.0.0.1${chemin}`, { method: meth.m, headers: h, body }) } catch { delete h['content-length']; req = new Request(`http://127.0.0.1${chemin}`, { method: meth.m, headers: h, body }) }
    const n0 = fp.appels.length
    const rep = await mod[meth.m](req, { params: Promise.resolve({ id: meth.id ?? '' }) })
    const l = await lireReponse(rep)
    const appels = depuis(n0)
    const metier = appels.filter((a) => !(a.fonction && GARDE.has(a.fonction)) && !(a.fonction === 'ops_evenement_ajouter' && a.params?.p_type === 'refus'))
    return { ...l, appels, metier, fautes: appels.filter((a) => a.faute) }
  }
  return { connus, ids, liste, agent, appeler }
}
const nomDe = (meth) => `${meth.m} ${meth.chemin.split('?')[0].replace(/[0-9a-f]{8}-[0-9a-f-]{27}/, '<id>')}`
const fautesDe = (x) => x.fautes.map((f) => `${f.fonction || f.table} (${f.faute})`).join(', ')

export const SONDES = {
  async drapeau(ctx) {
    const m = montage(ctx, { drapeau: false })
    const jeton = m.agent('essai_e2e_x')
    const e = []
    for (const meth of methodes(C.uuid())) {
      const x = await m.appeler(meth, { jeton })
      if (x.absente) { e.push(x.texte); continue }
      if (x.status !== 404) e.push(`drapeau baissé : ${nomDe(meth)} → ${x.status}, 404 attendu`)
      if (x.appels.length) e.push(`drapeau baissé : ${nomDe(meth)} fait ${x.appels.length} appel(s) au faux PostgREST (${x.appels.map((a) => a.fonction || a.table).join(', ')})`)
    }
    return { echecs: e, resume: 'drapeau baissé : les 9 méthodes des 7 routes → 404, zéro appel' }
  },
  async garde(ctx) {
    const m = montage(ctx)
    const e = []
    for (const meth of methodes(C.uuid())) {
      const x = await m.appeler(meth, {})
      if (x.absente) { e.push(x.texte); continue }
      if (x.status !== 401) e.push(`sans jeton : ${nomDe(meth)} → ${x.status}, 401 attendu`)
      const hors = x.appels.filter((a) => !(a.fonction && GARDE.has(a.fonction)))
      if (hors.length) e.push(`sans jeton : ${nomDe(meth)} appelle ${hors.map((a) => a.fonction || a.table).join(', ')}`)
    }
    return { echecs: e, resume: 'drapeau levé, sans jeton : 401 sur les 9 méthodes, aucun appel hors d\'ops_agent_par_jeton et consommer_limite' }
  },
  async permissions(ctx) {
    const m = montage(ctx)
    const e = []
    const M = Object.fromEntries(methodes(C.uuid()).map((x) => [`${x.m} ${x.f}`, x]))
    const a = m.agent(`essai_e2e_${hasard(4)}`, { types_crees: ['publication'] })
    const x1 = await m.appeler(M[`POST ${T}`], { jeton: a })
    if (x1.status !== 403) e.push(`type hors de typesCrees : POST taches → ${x1.status}, 403 attendu`)
    if (x1.appels.some((c) => c.fonction === 'ops_tache_creer')) e.push('type hors de typesCrees : ops_tache_creer est appelée')
    const b = m.agent(`essai_e2e_${hasard(4)}`, { tables_ecrites: ['taches'] })
    const x2 = await m.appeler(M[`POST ${EV}`], { jeton: b })
    if (x2.status !== 403) e.push(`agent sans la table evenements : POST evenements → ${x2.status}, 403 attendu`)
    if (x2.metier.length) e.push(`agent sans la table evenements : ${x2.metier.map((c) => c.fonction).join(', ')} appelée(s)`)
    const x3 = await m.appeler(M[`POST ${DE}`], { jeton: b })
    if (x3.status !== 403) e.push(`agent sans la table decisions : POST decisions → ${x3.status}, 403 attendu`)
    if (x3.metier.length) e.push(`agent sans la table decisions : ${x3.metier.map((c) => c.fonction).join(', ')} appelée(s)`)
    return { echecs: e, resume: 'type hors de typesCrees → 403 sans ops_tache_creer ; sans la table evenements → 403 ; sans la table decisions → 403' }
  },
  async appels(ctx) {
    const m = montage(ctx)
    const e = []
    const nom = 'essai_e2e_x'
    const jeton = m.agent(nom)
    for (const meth of methodes(C.uuid())) {
      const x = await m.appeler(meth, { jeton })
      if (x.absente) { e.push(x.texte); continue }
      if (!(x.status >= 200 && x.status < 300)) e.push(`${nomDe(meth)} → ${x.status} (« ${court(x.texte, 70)} »), 2xx attendu`)
      if (x.fautes.length) e.push(`${nomDe(meth)} : appel(s) refusé(s) par le faux PostgREST : ${fautesDe(x)}`)
      const fn = x.metier.map((c) => c.fonction || `table ${c.table}`)
      if (fn.length !== 1 || fn[0] !== meth.fonction) { e.push(`${nomDe(meth)} appelle ${fn.join(', ') || 'rien'} ; exactement ${meth.fonction} attendue`); continue }
      const p = x.metier[0].params || {}
      const qui = meth.fonction === 'ops_battement' ? 'p_nom' : 'p_agent'
      if (meth.fonction !== 'ops_etat' && p[qui] !== nom) e.push(`${nomDe(meth)} : ${qui} = « ${court(p[qui], 30)} », ${nom} (le jeton) attendu`)
      if (meth.fonction === 'ops_tache_creer' && (p.p_type !== 'envoi' || p.p_cle !== meth.corps.cle || p.p_capacite !== 'essai')) e.push(`POST taches : p_type, p_cle ou p_capacite ne sont pas ceux du corps (${court(JSON.stringify(p), 90)})`)
      if (meth.fonction === 'ops_tache_rendre' && (p.p_id !== meth.id || p.p_resultat !== 'faite' || p.p_preuve_url !== meth.corps.preuve_url)) e.push(`POST rendre : p_id, p_resultat ou p_preuve_url ne sont pas ceux de la requête (${court(JSON.stringify(p), 90)})`)
      if (meth.fonction === 'ops_evenements_lire' && (Number(p.p_apres) !== 5 || Number(p.p_limite) !== 10)) e.push(`GET evenements : p_apres ${p.p_apres}, p_limite ${p.p_limite} ; 5 et 10 attendus`)
      if (meth.fonction === 'ops_decision_creer' && (p.p_defaut !== 'non' || !egaux(p.p_options, meth.corps.options) || p.p_cle !== meth.corps.cle)) e.push('POST decisions : p_options, p_defaut ou p_cle ne sont pas ceux du corps')
    }
    return { echecs: e, resume: 'les 9 méthodes : 2xx, exactement leur fonction, noms acceptés par le faux PostgREST ; agent: \'a0\' dans le corps → p_agent = essai_e2e_x (le jeton)' }
  },
  async bornes(ctx) {
    const m = montage(ctx)
    const e = []
    const M = Object.fromEntries(methodes(C.uuid()).map((x) => [`${x.m} ${x.f}`, x]))
    const jeton = m.agent('essai_e2e_x')
    const cas = [
      ['17 Ko sur POST taches', M[`POST ${T}`], { corps: { type: 'envoi', cle: 'k', capacite: 'essai', objet: 'x', charge: { remplissage: 'x'.repeat(17 * 1024) } } }, 413],
      ['JSON invalide sur POST taches', M[`POST ${T}`], { brut: '{"type": "envoi", ' }, 400],
      ['résumé de 201 signes sur POST evenements', M[`POST ${EV}`], { corps: { type: 'essai', resume: 'r'.repeat(201) } }, 400],
      ["resultat: 'reussi' sur POST rendre", M[`POST ${RE}`], { corps: { resultat: 'reussi', preuve_url: 'https://prestiapp.fr/x' } }, 400],
    ]
    for (const [quoi, meth, o, statut] of cas) {
      const x = await m.appeler(meth, { jeton, ...o })
      if (x.status !== statut) e.push(`${quoi} → ${x.status}, ${statut} attendu`)
      if (x.metier.length) e.push(`${quoi} : appel SQL ${x.metier.map((c) => c.fonction || c.table).join(', ')}`)
    }
    return { echecs: e, resume: '17 Ko → 413 ; JSON invalide → 400 ; résumé de 201 signes → 400 ; resultat « reussi » → 400 ; aucun appel SQL' }
  },
  async erreurs(ctx) {
    const { fp } = ctx
    const m = montage(ctx)
    const e = []
    const M = Object.fromEntries(methodes(C.uuid()).map((x) => [`${x.m} ${x.f}`, x]))
    const jeton = m.agent('essai_e2e_x')
    const cas = [
      ['ops:quota', 'ops_tache_creer', M[`POST ${T}`], erreurOps('quota'), 429],
      ['ops:profondeur', 'ops_tache_creer', M[`POST ${T}`], erreurOps('profondeur'), 409],
      ['ops:bail_perdu', 'ops_tache_rendre', M[`POST ${RE}`], erreurOps('bail_perdu'), 409],
      ['erreur sans code ops:', 'ops_tache_creer', M[`POST ${T}`], erreurPg('insert or update on table "taches" violates foreign key constraint : relation "ops.taches"', '23503', 409), 500],
    ]
    for (const [quoi, fonction, meth, rep, statut] of cas) {
      const avant = fp.reponses[fonction]
      fp.reponses[fonction] = () => rep
      const x = await m.appeler(meth, { jeton })
      fp.reponses[fonction] = avant
      if (x.status !== statut) e.push(`${quoi} (${fonction}) → ${x.status}, ${statut} attendu`)
      if (/ops\.|violates|relation/i.test(x.texte)) e.push(`${quoi} : la réponse laisse passer le texte de Postgres (« ${court(x.texte, 80)} »)`)
    }
    return { echecs: e, resume: 'ops:quota → 429, ops:profondeur → 409, ops:bail_perdu → 409, erreur sans code → 500, sans texte de Postgres' }
  },
  async etat(ctx) {
    const m = montage(ctx)
    const e = []
    const meth = methodes(C.uuid()).find((x) => x.f === ET)
    const x = await m.appeler(meth, { jeton: m.agent('essai_e2e_x') })
    if (x.absente) return { echecs: [x.texte] }
    if (x.status !== 200) e.push(`GET etat → ${x.status}, 200 attendu`)
    if (!egaux(x.json, ETAT)) e.push(`GET etat ne rend pas le JSON d'ops_etat tel quel (« ${court(x.texte, 90)} »)`)
    if (C.RE_COURRIEL.test(x.texte)) e.push('GET etat : une adresse e-mail dans la réponse')
    return { echecs: e, resume: 'GET etat : le JSON d\'ops_etat tel quel, sans adresse e-mail' }
  },
  async idempotence(ctx) {
    const { fp } = ctx
    const m = montage(ctx)
    const e = []
    const M = Object.fromEntries(methodes(C.uuid()).map((x) => [`${x.m} ${x.f}`, x]))
    const jeton = m.agent('essai_e2e_x')
    for (const [quoi, fonction, meth] of [['taches', 'ops_tache_creer', M[`POST ${T}`]], ['decisions', 'ops_decision_creer', M[`POST ${DE}`]]]) {
      const id = C.uuid()
      let n = 0
      fp.reponses[fonction] = () => ({ status: 200, body: [{ id, creee: n++ === 0 }] })
      const a = await m.appeler(meth, { jeton }), b = await m.appeler(meth, { jeton })
      if (a.status !== 201 || b.status !== 200) e.push(`${quoi} : même clé rejouée → ${a.status} puis ${b.status}, 201 puis 200 attendus`)
      if (a.json?.id !== id || b.json?.id !== id) e.push(`${quoi} : les deux réponses ne portent pas le même id (${court(a.texte, 50)} ; ${court(b.texte, 50)})`)
      if (a.json?.creee !== true || b.json?.creee !== false) e.push(`${quoi} : creee vaut ${a.json?.creee} puis ${b.json?.creee}, true puis false attendus`)
    }
    return { echecs: e, resume: 'taches et decisions : creee true puis false → 201 puis 200, même id' }
  },
  async tranchees(ctx) {
    const m = montage(ctx)
    const e = []
    const nom = 'essai_e2e_x'
    const jeton = m.agent(nom)
    const base = methodes(C.uuid()).find((x) => x.f === DE && x.m === 'GET')
    const depuis = new Date(Date.now() - 2 * JOUR).toISOString()
    const x = await m.appeler(base, { jeton, chemin: `/api/agents/decisions?tranchees=1&depuis=${encodeURIComponent(depuis)}&agent=a0` })
    if (x.absente) return { echecs: [x.texte] }
    const ap = x.metier.filter((c) => c.fonction === 'ops_decisions_tranchees')
    if (x.status !== 200) e.push(`tranchees=1&depuis=<il y a 2 jours> → ${x.status}, 200 attendu`)
    if (ap.length !== 1 || x.metier.length !== 1) e.push(`ops_decisions_tranchees appelée ${ap.length} fois (appels : ${x.metier.map((c) => c.fonction).join(', ') || 'aucun'}), une fois attendue`)
    else {
      if (ap[0].params.p_agent !== nom) e.push(`p_agent = « ${court(ap[0].params.p_agent, 30)} » (agent=a0 dans la requête), ${nom} attendu`)
      if (Date.parse(ap[0].params.p_depuis) !== Date.parse(depuis)) e.push(`p_depuis = ${ap[0].params.p_depuis}, ${depuis} attendu`)
    }
    if (!egaux(x.json, m.liste)) e.push(`la liste n'est pas rendue telle quelle (« ${court(x.texte, 80)} »)`)
    const vieux = new Date(Date.now() - 31 * JOUR).toISOString()
    for (const [quoi, q] of [['sans tranchees=1', `depuis=${encodeURIComponent(depuis)}`], ['depuis absent', 'tranchees=1'], ['depuis mal formé', 'tranchees=1&depuis=hier'], ['depuis vieux de 31 jours', `tranchees=1&depuis=${encodeURIComponent(vieux)}`]]) {
      const y = await m.appeler(base, { jeton, chemin: `/api/agents/decisions?${q}` })
      if (y.status !== 400) e.push(`${quoi} → ${y.status}, 400 attendu`)
      if (y.metier.length) e.push(`${quoi} : appel SQL ${y.metier.map((c) => c.fonction).join(', ')}`)
    }
    return { echecs: e, resume: 'tranchees=1&depuis=<2 jours> : une fois ops_decisions_tranchees, p_agent du jeton (agent=a0 ignoré), p_depuis passé, liste telle quelle ; sans tranchees, depuis absent, mal formé ou de 31 jours → 400 sans appel' }
  },
  async consignes(ctx) {
    const { fp } = ctx
    const m = montage(ctx)
    const e = []
    const nom = 'essai_e2e_x'
    const jeton = m.agent(nom)
    const M = Object.fromEntries(methodes(C.uuid()).map((x) => [`${x.m} ${x.f}`, x]))
    const types = ['consigne', 'consigne_lue', 'reunion_compte_rendu', 'cycle_termine']
    for (const type of types) {
      const objet = `consigne:${C.uuid()}`
      const x = await m.appeler(M[`POST ${EV}`], { jeton, corps: { type, objet, resume: `${type} du juge` } })
      if (!(x.status >= 200 && x.status < 300)) { e.push(`POST evenements type ${type} → ${x.status} (« ${court(x.texte, 60)} »)`); continue }
      const a = x.metier.filter((c) => c.fonction === 'ops_evenement_ajouter')
      if (a.length !== 1 || a[0].params.p_type !== type || a[0].params.p_objet !== objet || a[0].params.p_agent !== nom) e.push(`POST evenements type ${type} : ops_evenement_ajouter reçoit ${court(JSON.stringify(a.map((c) => c.params)), 100)}`)
    }
    const vus = [...types, 'refus', 'interrupteur'].map((type, i) => ({ id: 100 + i, le: new Date(Date.now() - i * 60_000).toISOString(), agent: i % 2 ? 'systeme' : 'chef', type, objet: `consigne:${i}`, resume: `événement ${type}`, tache_id: null }))
    fp.reponses.ops_evenements_lire = () => ({ status: 200, body: vus })
    const g = await m.appeler(M[`GET ${EV}`], { jeton })
    const liste = Array.isArray(g.json) ? g.json : Object.values(g.json ?? {}).find(Array.isArray)
    if (g.status !== 200 || !egaux(liste, vus)) e.push(`GET evenements ne rend pas la liste du bus telle quelle, les ${vus.length} événements (« ${court(g.texte, 80)} »)`)
    return { echecs: e, resume: 'consigne, consigne_lue, reunion_compte_rendu et cycle_termine postés tels quels (p_type, p_objet, p_agent du jeton) ; GET evenements rend les 6 événements du bus, aucun ôté' }
  },
}

// ── Côté juge ──────────────────────────────────────────────────────────────────────────────────────────────────────
function jugerFichiers(racine) {
  const e = []
  const absents = FICHIERS.filter((f) => !C.existe(racine, f))
  if (absents.length) e.push(`${absents.length} fichier(s) de route absent(s) : ${absents.join(', ')}`)
  for (const f of FICHIERS.filter((x) => !absents.includes(x))) {
    const code = C.sansCommentairesTs(C.lire(racine, f))
    if (!/export\s+const\s+runtime\s*=\s*['"]nodejs['"]/.test(code)) e.push(`${f} : runtime = 'nodejs' absent`)
    if (!/export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]/.test(code)) e.push(`${f} : dynamic = 'force-dynamic' absent`)
    if (f === RE) {
      if (!/params\s*:\s*Promise\s*<\s*\{\s*id\s*:\s*string\s*;?\s*\}\s*>/.test(code)) e.push(`${f} : [id] n'est pas typé en promesse (params: Promise<{ id: string }>)`)
      if (!/await\s+(?:\w+\.)?params\b/.test(code)) e.push(`${f} : les paramètres ne sont pas attendus (await … params)`)
    }
  }
  return res(e, '7 fichiers, runtime nodejs et dynamic force-dynamic ; [id] typé Promise<{ id: string }> et attendu')
}
const ligneCarte = () => `    'busAgents': ['route', '/api/agents/etat', 'GET', ${FICHIERS.map((f) => `'${f}'`).join(', ')}],`
const lireLigneCarte = (l) => {
  const m = /^\s*['"]?busAgents['"]?\s*:\s*\[(.*)\]\s*,?\s*$/.exec(l)
  if (!m) return null
  return [...m[1].matchAll(/'([^']*)'|"([^"]*)"|`([^`]*)`/g)].map((x) => x[1] ?? x[2] ?? x[3])
}
const carteConforme = (v) => !!v && v[0] === 'route' && v[1] === '/api/agents/etat' && v[2] === 'GET' && v.length === 10 && egaux([...v.slice(3)].sort(), [...FICHIERS].sort())
async function jugerDrapeau(racine) {
  const e = []
  const t = C.lire(racine, FLAGS), h = C.aHead(FLAGS)
  if (t === null || h === null) e.push(`${FLAGS} introuvable (racine ou HEAD)`)
  else {
    const i = t.indexOf('export const FLAGS = {'), j = t.indexOf('} as const', i)
    const bloc = i < 0 || j < 0 ? '' : t.slice(i, j)
    if (!/^\s*busAgents\s*:\s*false\s*,?\s*$/m.test(bloc)) e.push(`${FLAGS} : busAgents: false absent de FLAGS`)
    const { ajoutes, retires } = C.diffLignes(h, t)
    if (/\bbusAgents\b/.test(h)) { if (ajoutes.length || retires.length) e.push(`${FLAGS} : ${ajoutes.length + retires.length} ligne(s) changée(s) alors que busAgents est déjà à HEAD`) }
    else {
      const drapeau = ajoutes.filter((l) => /^\s*busAgents\s*:/.test(l)), com = ajoutes.filter((l) => /^\s*(\/\/|\/\*|\*)/.test(l)), autres = ajoutes.filter((l) => !drapeau.includes(l) && !com.includes(l))
      if (retires.length || autres.length || drapeau.length > 1) e.push(`${FLAGS} : le diff avec HEAD ne se limite pas à busAgents et son commentaire (${retires.length} retirée(s), ${autres.length} autre(s) ajoutée(s)${autres.length ? ` : « ${court(autres[0], 50)} »` : ''})`)
      if (drapeau.length === 1 && !com.length) e.push(`${FLAGS} : busAgents ajouté sans commentaire (ce qu'il ferme, quand le lever)`)
    }
  }
  const f = C.lire(racine, FERMETURE), fh = C.aHead(FERMETURE)
  if (f === null || fh === null) e.push(`${FERMETURE} introuvable (racine ou HEAD)`)
  else {
    const { ajoutes, retires } = C.diffLignes(fh, f)
    if (/'busAgents'/.test(fh)) { if (ajoutes.length || retires.length) e.push(`${FERMETURE} : ${ajoutes.length + retires.length} ligne(s) changée(s) alors que la carte porte déjà busAgents à HEAD`) }
    else if (retires.length || ajoutes.length !== 1) e.push(`${FERMETURE} : ${ajoutes.length} ligne(s) ajoutée(s), ${retires.length} retirée(s) ; une seule ligne ajoutée à la carte attendue`)
    else if (!carteConforme(lireLigneCarte(ajoutes[0]))) e.push(`${FERMETURE} : la ligne ajoutée n'est pas 'busAgents': ['route', '/api/agents/etat', 'GET', <les 7 fichiers>] (« ${court(ajoutes[0], 90)} »)`)
    const L = f.split('\n'), iC = L.findIndex((l) => /const CARTE = \{/.test(l))
    let fC = iC
    while (fC >= 0 && fC < L.length && !/^\s*\}\s*$/.test(L[fC])) fC++
    const k = L.findIndex((l) => /^\s*['"]?busAgents['"]?\s*:/.test(l))
    if (k < 0 || iC < 0 || k < iC || k > fC) e.push(`${FERMETURE} : busAgents n'est pas dans la carte CARTE`)
    else if (!carteConforme(lireLigneCarte(L[k]))) e.push(`${FERMETURE} : la ligne busAgents de la carte ne liste pas exactement les 7 fichiers`)
  }
  const n = nonJuge(racine)
  if (n) e.push(...n.echecs)
  else { const x = deSonde(await sonde('drapeau', racine)); e.push(...x.echecs) }
  return res(e, `${FLAGS} : busAgents: false et son commentaire, rien d'autre ; ${FERMETURE} : la ligne de carte des 7 fichiers, rien d'autre ; drapeau baissé : 404 sur les 9 méthodes, zéro appel`)
}
const jugerSonde = (nom) => async (racine) => { const n = nonJuge(racine); if (n) return n; return deSonde(await sonde(nom, racine)) }

const INTERDITS = ['ops_decision_trancher', 'ops_interrupteur_poser', 'ops_agent_poser_jeton', 'ops_agent_enregistrer', 'ops_agent_retirer', 'acq_', 'supabaseAdmin', 'ANTHROPIC']
function jugerLecture(racine) {
  const d = path.join(racine, 'app', 'api', 'agents')
  if (!fs.existsSync(d)) return res(['non jugé : app/api/agents/ absent (AR-1)'])
  const e = []
  const lister = (x, pre = '') => fs.readdirSync(x, { withFileTypes: true }).flatMap((f) => (f.isDirectory() ? (pre === '' && f.name === 'tic' ? [] : lister(path.join(x, f.name), `${pre}${f.name}/`)) : [`${pre}${f.name}`]))
  const fichiers = lister(d)
  for (const f of fichiers) {
    const t = fs.readFileSync(path.join(d, f), 'utf8')
    for (const mot of INTERDITS) if (t.includes(mot)) e.push(`app/api/agents/${f} mentionne ${mot}`)
  }
  return res(e, `${fichiers.length} fichier(s) sous app/api/agents/ (hors tic/, fiche 026-049) : aucune mention de ${INTERDITS.join(', ')}`)
}
async function jugerTypecheck(racine) {
  const n = nonJuge(racine)
  if (n) return n
  return C.typecheck(JUGE, racine, FICHIERS)
}
function lireEnvLocal() {
  const env = {}
  try { for (const l of fs.readFileSync(path.join(C.R, '.env.local'), 'utf8').split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '') } } catch { /* absent */ }
  return env
}
async function jugerReel(racine) {
  const n = nonJuge(racine)
  if (n) return n
  const env = lireEnvLocal()
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return res(['.env.local : adresse ou clé de service absente (rien n\'est affiché)'])
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const nom = `essai_e2e_${hasard(8)}`, jeton = jetonEssai(nom), base = 'https://prestiapp.fr/api/agents'
  const e = []
  let enregistre = false
  const appel = async (chemin, init = {}, avecJeton = true) => { const r = await fetch(`${base}${chemin}`, { ...init, headers: { 'content-type': 'application/json', ...(avecJeton ? { authorization: `Bearer ${jeton}` } : {}) } }); let j = null; try { j = await r.json() } catch { /* vide */ } return { status: r.status, j } }
  try {
    const a = await sb.rpc('ops_agent_enregistrer', { p_nom: nom, p_libelle: 'essai du juge agents-routes-qa', p_capacites: ['essai'], p_types_crees: ['essai'], p_tables: ['taches', 'decisions'], p_periode_minutes: 60, p_debit_minute: 30, p_quota_creations_jour: 5, p_plafond_euros_jour: 0 })
    if (a.error) return res([`ops_agent_enregistrer : ${court(a.error.code || 'erreur', 40)}`])
    enregistre = true
    const b = await sb.rpc('ops_agent_poser_jeton', { p_nom: nom, p_hash: sha256(jeton) })
    if (b.error) return res([`ops_agent_poser_jeton : ${court(b.error.code || 'erreur', 40)}`])
    const t = await appel('/taches', { method: 'POST', body: JSON.stringify({ type: 'essai', cle: `essai-${hasard(6)}`, capacite: 'essai' }) })
    if (t.status !== 201) e.push(`POST taches → ${t.status}, 201 attendu`)
    const p = await appel('/taches/prendre', { method: 'POST' })
    const id = p.j?.tache?.id ?? p.j?.id ?? (Array.isArray(p.j) ? p.j[0]?.id : null)
    if (p.status !== 200 || !id) e.push(`prendre → ${p.status}, la tâche attendue`)
    else { const r = await appel(`/taches/${id}/rendre`, { method: 'POST', body: JSON.stringify({ resultat: 'faite', preuve_url: 'https://prestiapp.fr/' }) }); if (r.status !== 200 || !JSON.stringify(r.j).includes('faite')) e.push(`rendre faite → ${r.status}, faite attendu`) }
    const d = await appel('/decisions', { method: 'POST', body: JSON.stringify({ question: 'Essai du juge ?', options: [{ cle: 'oui', libelle: 'Oui', recommandee: true }, { cle: 'non', libelle: 'Non', recommandee: false }], defaut: 'non', portee: 'essai', echeance: new Date(Date.now() + JOUR).toISOString(), cle: `essai-${hasard(6)}` }) })
    if (![200, 201].includes(d.status) || !d.j?.id) e.push(`POST decisions → ${d.status}, un id attendu`)
    const s = await appel('/etat', {}, false)
    if (s.status !== 401) e.push(`sans jeton → ${s.status}, 401 attendu`)
  } finally {
    if (enregistre) { const f = await sb.rpc('ops_agent_retirer', { p_nom: nom }); if (f.error) e.push(`ménage : ops_agent_retirer(${nom}) a échoué, à retirer à la main`) }
  }
  return res(e, `${nom} : POST taches 201, prendre, rendre faite, POST decisions, sans jeton 401 ; retiré dans le finally`)
}

// ── Les dérivés de HEAD pour le témoin, et les sabotages ──────────────────────────────────────────────────────────────
export function flagsDerive(h) {
  if (/\bbusAgents\b/.test(h)) return h
  const i = h.indexOf('export const FLAGS = {'), j = h.indexOf('} as const', i)
  if (i < 0 || j < 0) throw new Error('FLAGS introuvable à HEAD')
  const ajout = '  /** 026-042 — ferme les routes /api/agents/* du bus (404) tant que les migrations 0096 à 0098 ne sont pas appliquées ;\n   *  se lève après leur application et le PASS de 026-042, sur décision de Benj. */\n  busAgents: false,\n'
  return `${h.slice(0, j)}${ajout}${h.slice(j)}`
}
export function fermetureDerive(h) {
  if (/'busAgents'/.test(h)) return h
  const L = h.split('\n'), i = L.findIndex((l) => /const CARTE = \{/.test(l))
  if (i < 0) throw new Error('CARTE introuvable à HEAD')
  let j = i
  while (j < L.length && !/^\s*\}\s*$/.test(L[j])) j++
  L.splice(j, 0, ligneCarte())
  return L.join('\n')
}
export const SABOTAGES = [
  { id: 'AR-1', nom: 'runtime edge', fichier: T, chercher: "export const runtime = 'nodejs'", remplacer: "export const runtime = 'edge'" },
  { id: 'AR-1', nom: '[id] synchrone', fichier: RE, chercher: 'ctx: { params: Promise<{ id: string }> }', remplacer: 'ctx: { params: { id: string } }' },
  { id: 'AR-1', nom: 'route manquante', fichier: BA, supprimer: true },
  { id: 'AR-1', nom: 'dynamic oublié', fichier: ET, chercher: "export const dynamic = 'force-dynamic'\n", remplacer: '' },
  { id: 'AR-2', nom: 'drapeau non lu par etat', fichier: ET, chercher: "  if (!actif('busAgents')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })\n", remplacer: '' },
  { id: 'AR-2', nom: 'drapeau levé', fichier: FLAGS, chercher: 'busAgents: false,', remplacer: 'busAgents: true,' },
  { id: 'AR-2', nom: 'autre drapeau touché', fichier: FLAGS, chercher: 'codeEmail: true,', remplacer: 'codeEmail: false,' },
  { id: 'AR-2', nom: 'carte sans battement', fichier: FERMETURE, chercher: ", 'app/api/agents/battement/route.ts'", remplacer: '' },
  { id: 'AR-2', nom: 'ligne de carte absente', fichier: FERMETURE, chercher: ligneCarte() + '\n', remplacer: '' },
  { id: 'AR-3', nom: 'battement sans garde', fichier: BA, chercher: '  const agent = await authAgent(req)\n  if (refus(agent)) return reponseRefusAgent(agent)\n  const r = await ops_battement({ p_nom: agent.nom })', remplacer: "  const r = await ops_battement({ p_nom: 'inconnu' })" },
  { id: 'AR-3', nom: 'etat lu avant la garde', fichier: ET, chercher: '  const agent = await authAgent(req)', remplacer: '  await ops_etat()\n  const agent = await authAgent(req)' },
  { id: 'AR-4', nom: 'type non exigé', fichier: T, chercher: '  const ty = await exigerType(agent, b.type as string)\n  if (ty) return reponseRefusAgent(ty)\n', remplacer: '' },
  { id: 'AR-4', nom: 'table evenements non exigée', fichier: EV, chercher: "const t = await exigerTable(agent, 'evenements')", remplacer: 'const t = null' },
  { id: 'AR-4', nom: 'decisions gardée par taches', fichier: DE, chercher: "exigerTable(agent, 'decisions')", remplacer: "exigerTable(agent, 'taches')" },
  { id: 'AR-5', nom: 'nom pris du corps', fichier: T, chercher: 'p_agent: agent.nom, p_type: b.type', remplacer: 'p_agent: (b.agent as string) ?? agent.nom, p_type: b.type' },
  { id: 'AR-5', nom: 'limite mal nommée', fichier: EV, chercher: 'p_limite: Number(limite)', remplacer: 'limite: Number(limite)' },
  { id: 'AR-5', nom: 'prendre deux fois', fichier: P, chercher: '  const r = await ops_tache_prendre({ p_agent: agent.nom })', remplacer: '  await ops_tache_prendre({ p_agent: agent.nom })\n  const r = await ops_tache_prendre({ p_agent: agent.nom })' },
  { id: 'AR-6', nom: '413 à 64 Ko', fichier: T, chercher: 'if (Buffer.byteLength(brut) > MAX)', remplacer: 'if (Buffer.byteLength(brut) > MAX * 4)' },
  { id: 'AR-6', nom: 'JSON invalide rattrapé', fichier: T, chercher: "try { b = JSON.parse(brut) } catch { return erreur('JSON invalide.', 400) }", remplacer: "try { b = JSON.parse(brut) } catch { b = { type: 'envoi', cle: 'k', capacite: 'essai' } }" },
  { id: 'AR-6', nom: 'résumé de 250 signes', fichier: EV, chercher: 'b.resume.length > 200', remplacer: 'b.resume.length > 250' },
  { id: 'AR-6', nom: 'resultat libre', fichier: RE, chercher: "if (b.resultat !== 'faite' && b.resultat !== 'echec')", remplacer: "if (typeof b.resultat !== 'string')" },
  { id: 'AR-7', nom: 'erreurs du bus en 500', fichier: T, chercher: "return erreur('Refusé par le bus.', r.status, r.code)", remplacer: "return erreur('Refusé par le bus.', 500, r.code)" },
  { id: 'AR-7', nom: 'bail perdu en 400', fichier: RE, chercher: "return erreur('Refusé par le bus.', r.status, r.code)", remplacer: "return erreur('Refusé par le bus.', 400, r.code)" },
  { id: 'AR-7', nom: 'texte de Postgres qui remonte du bus', fichier: 'lib/agents/bus.ts', chercher: "return { ok: false, code: 'erreur', status: 500 }", remplacer: 'return { ok: false, code: String(r.error.message), status: 500 }' },
  { id: 'AR-8', nom: 'supabaseAdmin cité', fichier: ET, chercher: "export const runtime = 'nodejs'", remplacer: "// lecture directe : supabaseAdmin\nexport const runtime = 'nodejs'" },
  { id: 'AR-8', nom: 'trancher cité', fichier: DE, chercher: "export const runtime = 'nodejs'", remplacer: "const GESTE = 'ops_decision_trancher'\nexport const runtime = 'nodejs'" },
  { id: 'AR-8', nom: 'acquisition citée', fichier: P, chercher: "export const runtime = 'nodejs'", remplacer: "const SUITE = 'acq_prospects_oui'\nexport const runtime = 'nodejs'" },
  { id: 'AR-9', nom: 'état enrichi d\'un e-mail', fichier: ET, chercher: 'return NextResponse.json(r.data ?? {})', remplacer: "return NextResponse.json({ ...(r.data as object), contact: 'benj@exemple.fr' })" },
  { id: 'AR-9', nom: 'état résumé', fichier: ET, chercher: 'return NextResponse.json(r.data ?? {})', remplacer: 'return NextResponse.json({ ok: true })' },
  { id: 'AR-12', nom: 'taches toujours 201', fichier: T, chercher: '{ status: ligne?.creee === true ? 201 : 200 }', remplacer: '{ status: 201 }' },
  { id: 'AR-12', nom: 'decisions toujours 200', fichier: DE, chercher: '{ status: ligne?.creee === true ? 201 : 200 }', remplacer: '{ status: 200 }' },
  { id: 'AR-13', nom: 'depuis borné à 60 jours', fichier: DE, chercher: 'Date.now() - t > 30 * JOUR', remplacer: 'Date.now() - t > 60 * JOUR' },
  { id: 'AR-13', nom: 'agent pris de la requête', fichier: DE, chercher: 'p_agent: agent.nom, p_depuis', remplacer: "p_agent: q.get('agent') ?? agent.nom, p_depuis" },
  { id: 'AR-13', nom: 'tranchees facultatif', fichier: DE, chercher: "  if (q.get('tranchees') !== '1') return erreur('tranchees=1 attendu.', 400)\n", remplacer: '' },
  { id: 'AR-13', nom: 'liste enveloppée', fichier: DE, chercher: 'return NextResponse.json(r.data ?? [])', remplacer: 'return NextResponse.json({ decisions: r.data ?? [] })' },
  { id: 'AR-14', nom: 'vocabulaire des consignes refusé', fichier: EV, chercher: '/^[a-z0-9_]{2,60}$/.test(b.type)', remplacer: '/^(essai|refus|interrupteur)$/.test(b.type)' },
  { id: 'AR-14', nom: 'consignes ôtées de la liste', fichier: EV, chercher: 'evenements: r.data ?? []', remplacer: "evenements: ((r.data ?? []) as { type: string }[]).filter((x) => x.type !== 'consigne')" },
]

export const CRITERES = {
  'AR-1': { juger: async (r) => jugerFichiers(r) },
  'AR-2': { juger: jugerDrapeau },
  'AR-3': { juger: jugerSonde('garde') },
  'AR-4': { juger: jugerSonde('permissions') },
  'AR-5': { juger: jugerSonde('appels') },
  'AR-6': { juger: jugerSonde('bornes') },
  'AR-7': { juger: jugerSonde('erreurs') },
  'AR-8': { juger: async (r) => jugerLecture(r) },
  'AR-9': { juger: jugerSonde('etat') },
  'AR-10': { juger: jugerTypecheck, temoin: async (r) => C.eprouverLectureTypecheck(r, FICHIERS) },
  'AR-11': { juger: jugerReel, reel: true },
  'AR-12': { juger: jugerSonde('idempotence') },
  'AR-13': { juger: jugerSonde('tranchees') },
  'AR-14': { juger: jugerSonde('consignes') },
}

async function principal() {
  const o = C.lireOptions(process.argv.slice(2), JUGE)
  await C.derouler({
    juge: JUGE, ids: IDS, criteres: CRITERES, sabotages: SABOTAGES, o,
    temoin: { attendus: [...FICHIERS, 'lib/agents/garde.ts', 'lib/agents/bus.ts', 'lib/agents/jetons.ts'], derives: [[FLAGS, flagsDerive], [FERMETURE, fermetureDerive]] },
    prealables: [C.autoControleFauxPostgrest],
  })
}
const pareil = (a, b) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b)
if (process.argv[1] && pareil(path.resolve(process.argv[1]), FICHIER)) await principal()
