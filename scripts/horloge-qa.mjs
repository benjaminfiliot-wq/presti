#!/usr/bin/env node
// scripts/horloge-qa.mjs — le juge de la fiche 026-138 (l'épreuve des 24 h sans le poste), écrit par Claude Code en 026-045.
// L'épreuve n'a de sens qu'en production : le juge lit lui-même la base par PostgREST avec la clé de service (.env.local chargé
// sans rien afficher). Aucune capture, aucun fichier déposé par un exécutant ne compte.
//
//   E24-0 préalables. Statiques (toujours) : ops_horloge_etat et ops_etat au contrat de l'arbre
//         (scripts/fixtures/026-horloge-bus/contrat-ops.json), app/api/agents/tic/route.ts présent — sinon FAIL, code 1.
//         En --reel : ops_horloge_etat et ops_etat répondent avec la clé de service ; la première exécution de
//         presti-agents-tic date de plus de la fenêtre — sinon code 2.
//   E24-1 ops_horloge_etat(<fenêtre en minutes>) : au moins 1 380 exécutions réussies (au prorata de la fenêtre), aucun trou
//         de plus de 10 min.
//   E24-2 au moins 276 événements « passage » de l'agent a0 (au prorata), aucun écart de plus de 15 min entre deux ; lus par
//         ops_evenements_lire sous un agent essai_e2e_<aléa>, enregistré puis retiré dans un finally.
//   E24-3 public.alertes : les deux digests (clés agents:<jour de Paris>:matin et agents:<jour>:soir) des deux derniers
//         créneaux passés de la fenêtre.
//   E24-4 passages_cron.tic de moins de 10 min, reussi = true.
//   E24-5 ops_argent_etat() : non_faits_plus_de_15_min = 0 ; abandonnes_24h > 0 → une ligne argent_bloque sur la fenêtre.
//   E24-6 chaque agent dont le battement dépasse deux périodes (hors a0, systeme, agents en pause et jamais vus) a une ligne
//         agent_muet ou panne_agent qui le nomme sur la fenêtre.
//   E24-7 3 événements « notification » au plus par jour de Paris couvert par la fenêtre.
//   E24-8 .orchestre/travail/horloge-qa/releve.json porte les chiffres mesurés ; jamais de code 0 si une mesure vaut null ou
//         si une lecture a échoué.
//
// Usage : node scripts/horloge-qa.mjs [--racine=<dossier>] [--temoin] [--reel] [--fenetre=24]
//   sans --reel : les seuls critères statiques ; FAIL E24-0 → code 1 ; statiques verts → code 2 (l'épreuve attend --reel).
//   --temoin    : E24-0 sur un témoin (la route du tic et le contrat du dépôt), chacun de ses sabotages rouge ; E24-1 à E24-8 :
//                 leur lecture éprouvée sur une journée synthétique conforme (verte) et un sabotage par critère (rouge).
// Code 0 si tout est vert, 1 sinon, 2 si un préalable manque.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import * as S from './fixtures/026-horloge-bus/veilleur/socle-lot04.mjs'

const { C, res, court } = S
const JUGE = 'horloge-qa'
const FICHIER = fileURLToPath(import.meta.url)
const IDS = ['E24-0', 'E24-1', 'E24-2', 'E24-3', 'E24-4', 'E24-5', 'E24-6', 'E24-7', 'E24-8']
const TIC = 'app/api/agents/tic/route.ts'
const CONTRAT = 'scripts/fixtures/026-horloge-bus/contrat-ops.json'
const RELEVE = path.join(C.TRAVAIL, JUGE, 'releve.json')
const MIN = 60_000, HEURE = 3_600_000

// ── Les options ──────────────────────────────────────────────────────────────────────────────────────────────────────
function lireOptions(argv) {
  const o = { racine: C.R, temoin: false, reel: false, fenetre: 24 }
  for (const a of argv) {
    if (a === '--temoin') o.temoin = true
    else if (a === '--reel') o.reel = true
    else if (a.startsWith('--racine=') && a.length > 9) o.racine = path.resolve(a.slice(9))
    else if (/^--fenetre=\d+$/.test(a) && Number(a.slice(10)) >= 1 && Number(a.slice(10)) <= 72) o.fenetre = Number(a.slice(10))
    else { console.error(`✗ ${JUGE} : option inconnue « ${a} » (--racine=<dossier>, --temoin, --reel, --fenetre=<heures, 1 à 72>)`); process.exit(2) }
  }
  if (!fs.existsSync(o.racine) || !fs.statSync(o.racine).isDirectory()) { console.error(`✗ ${JUGE} : racine introuvable : ${o.racine}`); process.exit(2) }
  if (o.temoin && o.reel) { console.error(`✗ ${JUGE} : --temoin et --reel ne vont pas ensemble`); process.exit(2) }
  return o
}

// ── E24-0, statique ──────────────────────────────────────────────────────────────────────────────────────────────────
function jugerStatique(racine) {
  const e = []
  const t = C.lire(racine, CONTRAT)
  if (t === null) e.push(`${CONTRAT} absent de l'arbre : ops_horloge_etat n'y est pas au contrat`)
  else {
    let c = null
    try { c = JSON.parse(t) } catch { e.push(`${CONTRAT} illisible`) }
    if (c) for (const f of ['ops_horloge_etat', 'ops_etat']) if (!c.fonctions?.[f]) e.push(`${f} absente du contrat de l'arbre`)
    if (c?.fonctions?.ops_horloge_etat && JSON.stringify(c.fonctions.ops_horloge_etat.params) !== JSON.stringify([['p_minutes', 'integer']])) e.push('ops_horloge_etat au contrat sans son paramètre p_minutes integer')
  }
  if (!C.existe(racine, TIC)) e.push(`${TIC} absent`)
  return res(e, `contrat de l'arbre : ops_horloge_etat(p_minutes integer) et ops_etat ; ${TIC} présent`)
}

// ── Les lectures des mesures (pures, éprouvées en --temoin) ────────────────────────────────────────────────────────
const prorata = (n, fenetreH) => Math.ceil((n * fenetreH) / 24)
const ecartsMax = (ts) => { const t = [...ts].sort((a, b) => a - b); let m = 0; for (let i = 1; i < t.length; i++) m = Math.max(m, t[i] - t[i - 1]); return m }
const minutesDuTrou = (x) => {
  if (typeof x === 'number') return x
  if (x && typeof x.minutes === 'number') return x.minutes
  const a = Date.parse(x?.debut ?? x?.de ?? x?.depuis), b = Date.parse(x?.fin ?? x?.a ?? x?.jusqua)
  return Number.isFinite(a) && Number.isFinite(b) ? (b - a) / MIN : null
}
/** Les deux derniers créneaux de digest passés à `fin` : [{ creneau, jour, t }], le plus récent d'abord. */
export function derniersCreneaux(fin) {
  const out = []
  for (let j = 0; j < 3 && out.length < 2; j++) {
    const jour = S.jourParis(fin - j * 24 * HEURE)
    for (const [creneau, hm] of [['soir', '18:30'], ['matin', '07:30']]) {
      // l'instant UTC de hm à Paris ce jour-là : on cherche la minute dont l'heure de Paris vaut hm (changement d'heure compris)
      const base = Date.parse(`${jour}T00:00:00Z`)
      let t = null
      for (let h = 3; h <= 21 && t === null; h++) { const x = base + h * HEURE + (hm === '07:30' || hm === '18:30' ? 30 * MIN : 0); if (S.heureParis(x) === hm && S.jourParis(x) === jour) t = x }
      if (t !== null && t <= fin && out.length < 2) out.push({ creneau, jour, t })
    }
  }
  return out
}
export const LECTURES = {
  'E24-1': (m) => {
    const e = []
    const h = m.horloge
    const reussies = Number(h?.executions?.reussies)
    if (!Number.isFinite(reussies)) return res(['ops_horloge_etat : executions.reussies illisible'])
    const min = prorata(1380, m.fenetreH)
    if (reussies < min) e.push(`${reussies} exécutions réussies de presti-agents-tic, ${min} au moins attendues`)
    const trous = (Array.isArray(h.trous) ? h.trous : []).map(minutesDuTrou)
    if (trous.some((x) => x === null)) e.push('un trou illisible dans ops_horloge_etat')
    const pire = Math.max(0, ...trous.filter((x) => x !== null))
    if (pire > 10) e.push(`un trou de ${Math.round(pire)} min entre deux exécutions (10 au plus)`)
    return res(e, `${reussies} exécutions réussies (≥ ${min}), plus grand trou ${Math.round(pire)} min`)
  },
  'E24-2': (m) => {
    const e = []
    const p = m.passagesA0
    if (!Array.isArray(p)) return res(['passages de a0 illisibles'])
    const min = prorata(276, m.fenetreH)
    if (p.length < min) e.push(`${p.length} passages de a0, ${min} au moins attendus`)
    const ecart = ecartsMax(p) / MIN
    if (ecart > 15) e.push(`un écart de ${Math.round(ecart)} min entre deux passages de a0 (15 au plus)`)
    return res(e, `${p.length} passages de a0 (≥ ${min}), plus grand écart ${Math.round(ecart)} min`)
  },
  'E24-3': (m) => {
    const e = []
    if (!Array.isArray(m.alertes)) return res(['public.alertes illisible'])
    const attendus = derniersCreneaux(m.fin).map((c) => `agents:${c.jour}:${c.creneau}`)
    const cles = new Set(m.alertes.filter((a) => a.motif === 'digest').map((a) => a.cle))
    for (const k of attendus) if (!cles.has(k)) e.push(`aucun digest de clé ${k}`)
    return res(e, `digests ${attendus.join(' et ')} présents`)
  },
  'E24-4': (m) => {
    const p = m.passageTic
    if (!p || !p.dernier_passage) return res(['passages_cron.tic absent'])
    const e = []
    const age = (m.fin - Date.parse(p.dernier_passage)) / MIN
    if (!(age <= 10)) e.push(`passages_cron.tic date de ${Math.round(age)} min (10 au plus)`)
    if (p.reussi !== true) e.push('passages_cron.tic : reussi n\'est pas true')
    return res(e, `passages_cron.tic de ${Math.round(age)} min, réussi`)
  },
  'E24-5': (m) => {
    const a = m.argent
    if (!a || typeof a.non_faits_plus_de_15_min !== 'number' || typeof a.abandonnes_24h !== 'number') return res(['ops_argent_etat illisible'])
    const e = []
    if (a.non_faits_plus_de_15_min !== 0) e.push(`${a.non_faits_plus_de_15_min} message(s) d'argent non faits depuis plus de 15 min`)
    if (a.abandonnes_24h > 0 && !(m.alertes ?? []).some((x) => x.motif === 'argent_bloque')) e.push(`${a.abandonnes_24h} abandonné(s) en 24 h sans ligne argent_bloque dans public.alertes`)
    return res(e, `non faits de plus de 15 min : 0 ; abandonnés : ${a.abandonnes_24h}${a.abandonnes_24h ? ' (signalés)' : ''}`)
  },
  'E24-6': (m) => {
    if (!Array.isArray(m.agents)) return res(['ops_etat().agents illisible'])
    const e = [], muets = []
    for (const g of m.agents) {
      if (['a0', 'systeme'].includes(g.nom) || g.en_pause || !g.battement_le || !(g.periode_minutes > 0)) continue
      if (m.fin - Date.parse(g.battement_le) <= 2 * g.periode_minutes * MIN) continue
      muets.push(g.nom)
      const signale = (m.alertes ?? []).some((x) => ['agent_muet', 'panne_agent'].includes(x.motif) && String(x.cle ?? '').split(':').includes(g.nom))
      if (!signale) e.push(`${g.nom} muet depuis plus de deux périodes sans ligne agent_muet ni panne_agent`)
    }
    return res(e, muets.length ? `agents muets signalés : ${muets.join(', ')}` : 'aucun agent muet au-delà de deux périodes')
  },
  'E24-7': (m) => {
    if (!Array.isArray(m.notifications)) return res(['événements notification illisibles'])
    const e = []
    const parJour = new Map()
    for (const t of m.notifications) { const j = S.jourParis(t); parJour.set(j, (parJour.get(j) ?? 0) + 1) }
    for (const [j, n] of parJour) if (n > 3) e.push(`${n} notifications le ${j} (3 au plus par jour de Paris)`)
    return res(e, `notifications par jour de Paris : ${[...parJour].map(([j, n]) => `${j} ${n}`).join(', ') || 'aucune'}`)
  },
  'E24-8': (m) => {
    const e = []
    const chiffres = releveDe(m)
    const nuls = Object.entries(chiffres).filter(([, v]) => v === null || v === undefined || (typeof v === 'number' && !Number.isFinite(v))).map(([k]) => k)
    if (nuls.length) e.push(`mesure(s) nulle(s) : ${nuls.join(', ')} — une mesure absente n'est pas un succès`)
    if (m.lecturesEchouees?.length) e.push(`lecture(s) échouée(s) : ${m.lecturesEchouees.join(', ')}`)
    return res(e, `${Object.keys(chiffres).length} mesures, aucune nulle, aucune lecture échouée`)
  },
}
/** Les chiffres du relevé (releve.json). */
export function releveDe(m) {
  const trous = (Array.isArray(m.horloge?.trous) ? m.horloge.trous : []).map(minutesDuTrou).filter((x) => x !== null)
  const notifs = new Map()
  for (const t of m.notifications ?? []) { const j = S.jourParis(t); notifs.set(j, (notifs.get(j) ?? 0) + 1) }
  return {
    fenetre_heures: m.fenetreH ?? null,
    executions_reussies: m.horloge?.executions?.reussies ?? null,
    plus_grand_trou_min: m.horloge ? Math.max(0, ...trous) : null,
    passages_a0: Array.isArray(m.passagesA0) ? m.passagesA0.length : null,
    plus_grand_ecart_a0_min: Array.isArray(m.passagesA0) ? Math.round(ecartsMax(m.passagesA0) / MIN) : null,
    digests: Array.isArray(m.alertes) ? m.alertes.filter((a) => a.motif === 'digest').length : null,
    tic_age_min: m.passageTic?.dernier_passage ? Math.round((m.fin - Date.parse(m.passageTic.dernier_passage)) / MIN) : null,
    argent_non_faits_15_min: m.argent?.non_faits_plus_de_15_min ?? null,
    argent_abandonnes_24h: m.argent?.abandonnes_24h ?? null,
    agents: Array.isArray(m.agents) ? m.agents.length : null,
    notifications_max_par_jour: Array.isArray(m.notifications) ? Math.max(0, ...notifs.values()) : null,
  }
}

// ── La journée synthétique de l'épreuve des lectures (--temoin) ──────────────────────────────────────────────────────
/** Une fenêtre conforme : chaque minute exécutée, a0 toutes les 5 min, les digests, l'argent à jour, un agent muet signalé. */
export function journeeConforme(fin = Date.parse('2026-10-26T20:00:00Z'), fenetreH = 24) {
  const debut = fin - fenetreH * HEURE
  const passagesA0 = []
  for (let t = debut + 2 * MIN; t <= fin; t += 5 * MIN) passagesA0.push(t)
  const creneaux = derniersCreneaux(fin)
  const alertes = [...creneaux.map((c) => ({ motif: 'digest', cle: `agents:${c.jour}:${c.creneau}`, cree_le: new Date(c.t + MIN).toISOString() })),
    { motif: 'agent_muet', cle: `agent_muet:recenseur:${S.jourParis(fin)}`, cree_le: new Date(fin - HEURE).toISOString() },
    { motif: 'argent_bloque', cle: `argent_bloque:file:${S.jourParis(fin)}`, cree_le: new Date(fin - 2 * HEURE).toISOString() }]
  return {
    fin, fenetreH,
    horloge: { job_actif: true, executions: { reussies: fenetreH * 60 - 4, echouees: 4 }, trous: [{ minutes: 6 }], derniere_execution: new Date(fin - 30_000).toISOString() },
    passagesA0,
    notifications: creneaux.map((c) => c.t + MIN),
    alertes,
    passageTic: { nom: 'tic', dernier_passage: new Date(fin - 40_000).toISOString(), reussi: true },
    argent: { en_file: 0, plus_vieux_s: 0, abandonnes_24h: 1, faits_24h: 3, non_faits_plus_de_15_min: 0 },
    agents: [
      { nom: 'a0', periode_minutes: 5, battement_le: new Date(fin - MIN).toISOString(), en_pause: false },
      { nom: 'recenseur', periode_minutes: 30, battement_le: new Date(fin - 3 * HEURE).toISOString(), en_pause: false },
      { nom: 'chef', periode_minutes: 60, battement_le: new Date(fin - 30 * MIN).toISOString(), en_pause: false },
      { nom: 'crieur', periode_minutes: 60, battement_le: new Date(fin - 9 * HEURE).toISOString(), en_pause: true },
    ],
    lecturesEchouees: [],
  }
}
/** Un sabotage par critère : la journée conforme altérée pour que CE critère soit rouge. */
export const SABOTAGES_JOURNEE = {
  'E24-1': [['un trou de 11 min', (m) => { m.horloge.trous.push({ debut: new Date(m.fin - 5 * HEURE).toISOString(), fin: new Date(m.fin - 5 * HEURE + 11 * MIN).toISOString() }) }], ['1 379 exécutions', (m) => { m.horloge.executions.reussies = 1379 }]],
  'E24-2': [['275 passages', (m) => { m.passagesA0 = m.passagesA0.slice(0, 275) }], ['un écart de 20 min', (m) => { m.passagesA0 = m.passagesA0.filter((t, i) => !(i > 50 && i < 54)) }]],
  'E24-3': [['le digest du soir manquant', (m) => { m.alertes = m.alertes.filter((a) => !(a.motif === 'digest' && a.cle.endsWith(':soir'))) }]],
  'E24-4': [['tic vieux de 11 min', (m) => { m.passageTic.dernier_passage = new Date(m.fin - 11 * MIN).toISOString() }], ['tic en échec', (m) => { m.passageTic.reussi = false }]],
  'E24-5': [['un message non fait depuis 15 min', (m) => { m.argent.non_faits_plus_de_15_min = 1 }], ['un abandon non signalé', (m) => { m.alertes = m.alertes.filter((a) => a.motif !== 'argent_bloque') }]],
  'E24-6': [['un agent muet non signalé', (m) => { m.alertes = m.alertes.filter((a) => a.motif !== 'agent_muet') }]],
  'E24-7': [['4 notifications un jour', (m) => { const t = m.notifications[0]; m.notifications.push(t + MIN, t + 2 * MIN) }]],
  'E24-8': [['une mesure nulle', (m) => { m.argent.abandonnes_24h = null }], ['une lecture échouée', (m) => { m.lecturesEchouees.push('ops_etat') }]],
}
function eprouver(id) {
  return async () => {
    const e = []
    const vert = LECTURES[id](journeeConforme())
    if (!vert.ok) return res([`journée synthétique conforme refusée : ${vert.echecs.join(' ; ')}`])
    // la même lecture au changement d'heure : fenêtre qui finit le 25/10/2026 au soir
    const dst = LECTURES[id](journeeConforme(Date.parse('2026-10-25T20:00:00Z')))
    if (!dst.ok) e.push(`journée du changement d'heure refusée : ${dst.echecs.join(' ; ')}`)
    const pris = []
    for (const [nom, f] of SABOTAGES_JOURNEE[id]) {
      const m = journeeConforme()
      f(m)
      const r = LECTURES[id](m)
      if (r.ok) e.push(`sabotage « ${nom} » accepté : la lecture ne sait pas échouer`)
      else pris.push(`« ${nom} » (${court(r.echecs[0], 70)})`)
    }
    // la lecture du journal elle-même (pagination), seulement pour E24-2 : celui qui compte les passages de a0 (E24-7 lit le même journal)
    if (id === 'E24-2') e.push(...await eprouverLectureJournal())
    return res(e, `lecture éprouvée : journée conforme verte (${court(vert.resume, 90)}), changement d'heure vert ; ${pris.length} sabotage(s) pris : ${pris.join(' ; ')}${id === 'E24-2' ? ' ; journal de 450 événements lu en entier par pages de 200, lecture tronquée / base en erreur / curseur immobile rejetés' : ''}`)
  }
}

// ── La lecture du journal, par pages (éprouvée en --temoin sur une base plafonnée) ───────────────────────────────────────
/** Le journal entier, lu par pages d'id croissants. `lirePage(apres, demande)` rend `{ data }` ou `{ error }`.
 *  La base plafonne chaque page (200 lignes, migration 0097) quelle que soit la taille demandée : on ne s'arrête donc JAMAIS sur une page
 *  « plus courte que demandé », seulement sur une page vide (le 04/10, cet arrêt-là ne laissait lire que les 200 plus anciens événements :
 *  0 passage de a0 sur 24 h alors qu'il y en avait 288). Une lecture qui ne finit pas (erreur, curseur immobile, limite de pages atteinte)
 *  rend un `echec` : un journal tronqué n'est pas un journal complet. */
export async function lireJournal(lirePage, { demande = 500, pagesMax = 500 } = {}) {
  const evts = []
  let apres = 0
  for (let page = 0; page < pagesMax; page++) {
    const r = await lirePage(apres, demande)
    if (r?.error) return { evts, echec: 'ops_evenements_lire' }
    const l = Array.isArray(r?.data) ? r.data : []
    if (!l.length) return { evts }
    const suite = Math.max(...l.map((x) => Number(x.id) || 0))
    if (!(suite > apres)) return { evts, echec: 'ops_evenements_lire : le curseur n\'avance pas' }
    evts.push(...l)
    apres = suite
  }
  return { evts, echec: `ops_evenements_lire : ${pagesMax} pages lues sans atteindre la fin du journal` }
}
/** Une base qui sert `journal` (id croissants) comme ops_evenements_lire : les événements d'id > apres, 200 lignes au plus par page. */
const fausseBase = (journal, plafond = 200) => async (apres, demande) => ({ data: journal.filter((x) => x.id > apres).slice(0, Math.max(1, Math.min(demande, plafond))) })
/** Un journal de 450 événements : de l'ancien bruit (hors fenêtre) puis les passages de a0 de la journée conforme ; la fenêtre n'est donc
 *  atteinte qu'à la troisième page. */
function journalSynthetique(m) {
  const bruit = Math.max(0, 450 - m.passagesA0.length)
  const vieux = Array.from({ length: bruit }, (_, i) => ({ id: i + 1, agent: 'recenseur', type: 'battement', cree_le: new Date(m.fin - (30 + bruit - i) * HEURE).toISOString() }))
  const recents = m.passagesA0.map((t, i) => ({ id: bruit + i + 1, agent: 'a0', type: 'passage', cree_le: new Date(t).toISOString() }))
  return [...vieux, ...recents]
}
async function eprouverLectureJournal() {
  const e = []
  const m = journeeConforme()
  const journal = journalSynthetique(m)
  if (journal.length <= 200) return [`journal synthétique trop court (${journal.length} événements) : il doit dépasser la page de 200`]
  const j = await lireJournal(fausseBase(journal))
  if (j.echec || j.evts.length !== journal.length) e.push(`la lecture rend ${j.evts.length} événement(s) sur ${journal.length}${j.echec ? ` (${j.echec})` : ''} : elle doit aller jusqu'au bout d'une base qui plafonne les pages à 200`)
  else {
    const dansLaFenetre = (x) => { const t = Date.parse(x.cree_le); return t >= m.fin - m.fenetreH * HEURE && t <= m.fin }
    const lu = { ...m, passagesA0: j.evts.filter((x) => x.agent === 'a0' && x.type === 'passage' && dansLaFenetre(x)).map((x) => Date.parse(x.cree_le)) }
    const r = LECTURES['E24-2'](lu)
    if (!r.ok) e.push(`E24-2 refuse le journal lu en entier : ${r.echecs.join(' ; ')}`)
  }
  const sabotages = [
    ['lecture limitée à une page (pagesMax: 1)', () => lireJournal(fausseBase(journal), { pagesMax: 1 }), /pages lues sans atteindre la fin/],
    ['base en erreur à la deuxième page', () => { let n = 0; return lireJournal(async (a, d) => (++n > 1 ? { error: { code: 'XX000' } } : fausseBase(journal)(a, d))) }, /^ops_evenements_lire$/],
    ['curseur qui n\'avance pas', () => lireJournal(async () => ({ data: journal.slice(0, 200) })), /curseur/],
  ]
  for (const [nom, f, attendu] of sabotages) {
    const s = await f()
    if (!s.echec) e.push(`sabotage « ${nom} » accepté : une lecture tronquée n'est pas rejetée`)
    else if (!attendu.test(s.echec)) e.push(`sabotage « ${nom} » rejeté pour une autre raison que la sienne : ${court(s.echec, 80)}`)
  }
  // `mesurer` (le seul lecteur de la production, que --temoin ne peut pas lancer) doit passer par lireJournal, pas par une boucle à lui
  const source = fs.readFileSync(FICHIER, 'utf8')
  const lecteur = source.slice(source.lastIndexOf('async function mesurer'))
  if (!/await lireJournal\(/.test(lecteur)) e.push('mesurer ne lit pas le journal par lireJournal')
  if (/p_limite:\s*500|\.length\s*<\s*500/.test(lecteur)) e.push('mesurer garde une lecture du journal qui s\'arrête sur une page courte')
  return e
}

// ── --reel : les mesures en production ───────────────────────────────────────────────────────────────────────────────
async function mesurer(fenetreH) {
  const k = S.clesReelles()
  if (!k.url || !k.service) return { prealable: '.env.local : adresse ou clé de service absente (rien n\'est affiché)' }
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(k.url, k.service, { auth: { persistSession: false, autoRefreshToken: false } })
  const fin = Date.now(), debut = fin - fenetreH * HEURE
  const m = { fin, fenetreH, lecturesEchouees: [] }
  const echec = (quoi) => m.lecturesEchouees.push(quoi)
  const h = await sb.rpc('ops_horloge_etat', { p_minutes: fenetreH * 60 })
  const etat = await sb.rpc('ops_etat')
  if (h.error || !h.data) return { prealable: `ops_horloge_etat ne répond pas (${court(h.error?.code ?? 'vide', 30)})` }
  if (etat.error || !etat.data) return { prealable: `ops_etat ne répond pas (${court(etat.error?.code ?? 'vide', 30)})` }
  const avant = await sb.rpc('ops_horloge_etat', { p_minutes: fenetreH * 60 + 120 })
  const total = (x) => Number(x?.executions?.reussies ?? 0) + Number(x?.executions?.echouees ?? 0)
  const premiere = Date.parse(h.data.premiere_execution ?? '')
  const assezVieille = Number.isFinite(premiere) ? premiere <= debut : !avant.error && total(avant.data) > total(h.data)
  if (!assezVieille) return { prealable: `la première exécution de presti-agents-tic date de moins de ${fenetreH} h` }
  m.horloge = h.data
  m.agents = Array.isArray(etat.data?.agents) ? etat.data.agents : (echec('ops_etat.agents'), null)
  const nom = `essai_e2e_${crypto.randomBytes(5).toString('hex')}`
  let enregistre = false
  try {
    const a = await sb.rpc('ops_agent_enregistrer', { p_nom: nom, p_libelle: 'lecteur de l’épreuve des 24 h (horloge-qa)', p_capacites: ['essai'], p_types_crees: [], p_tables: [], p_periode_minutes: 60, p_debit_minute: 60, p_quota_creations_jour: 0, p_plafond_euros_jour: 0 })
    if (a.error) echec('ops_agent_enregistrer')
    else {
      enregistre = true
      const j = await lireJournal((apres, demande) => sb.rpc('ops_evenements_lire', { p_agent: nom, p_apres: apres, p_limite: demande }))
      if (j.echec) echec(j.echec)
      const evts = j.evts
      const dans = (x) => { const t = Date.parse(x.cree_le ?? x.le ?? ''); return Number.isFinite(t) && t >= debut && t <= fin }
      m.passagesA0 = evts.filter((x) => x.agent === 'a0' && x.type === 'passage' && dans(x)).map((x) => Date.parse(x.cree_le ?? x.le))
      m.notifications = evts.filter((x) => x.type === 'notification' && dans(x)).map((x) => Date.parse(x.cree_le ?? x.le))
    }
  } finally {
    if (enregistre) { const f = await sb.rpc('ops_agent_retirer', { p_nom: nom }); if (f.error) echec(`ménage : ops_agent_retirer(${nom}), à retirer à la main`) }
  }
  const al = await sb.from('alertes').select('motif, cle, cree_le').gte('cree_le', new Date(debut).toISOString()).limit(5000)
  if (al.error) echec('public.alertes'); else m.alertes = al.data
  const p = await sb.from('passages_cron').select('nom, dernier_passage, reussi').eq('nom', 'tic').maybeSingle()
  if (p.error) echec('passages_cron'); else m.passageTic = p.data
  const ar = await sb.rpc('ops_argent_etat')
  if (ar.error) echec('ops_argent_etat'); else m.argent = ar.data
  return { m }
}

// ── Principal ────────────────────────────────────────────────────────────────────────────────────────────────────────
export const SABOTAGES = [
  { id: 'E24-0', nom: 'route du tic absente', fichier: TIC, supprimer: true },
  { id: 'E24-0', nom: 'ops_horloge_etat hors du contrat', fichier: CONTRAT, chercher: '"ops_horloge_etat"', remplacer: '"ops_horloge_etat_retiree"' },
  { id: 'E24-0', nom: 'ops_horloge_etat sans paramètre', fichier: CONTRAT, chercher: /("ops_horloge_etat"\s*:\s*\{[^}]*"params"\s*:\s*)\[\s*\[\s*"p_minutes"\s*,\s*"integer"\s*\]\s*\]/, remplacer: '$1[]' },
]
export const CRITERES = Object.fromEntries(IDS.map((id) => [id, id === 'E24-0' ? { juger: async (r) => jugerStatique(r) } : { reel: true, eprouver: eprouver(id), juger: async () => res(['--reel seulement']) }]))

async function principal() {
  const o = lireOptions(process.argv.slice(2))
  if (o.temoin) {
    await S.derouler({ juge: JUGE, ids: IDS, criteres: CRITERES, sabotages: SABOTAGES, o, temoin: { propres: [TIC], copies: [CONTRAT] }, notes: ['en --temoin : E24-0 statique sur le témoin ; E24-1 à E24-8 : leur lecture éprouvée sur une journée synthétique (aucune lecture de la production)'] })
    return
  }
  const s = C.creerRapport(JUGE, IDS, { entete: `${JUGE} — ${o.reel ? `réel, fenêtre de ${o.fenetre} h` : `racine ${o.racine === C.R ? '(le dépôt)' : C.posix(path.relative(C.R, o.racine)) || o.racine}`}` })
  const st = jugerStatique(o.racine)
  if (!st.ok) {
    for (const x of st.echecs) s.echoue('E24-0', x)
    for (const id of IDS.slice(1)) s.saute(id, 'non jugé : préalables statiques absents (E24-0)')
    process.exit(s.fin())
  }
  if (!o.reel) { console.error(`✗ ${JUGE} : critères statiques verts (${st.resume}) ; l'épreuve des 24 h ne se juge qu'en --reel, après la fenêtre (Claude Code)`); process.exit(2) }
  const x = await mesurer(o.fenetre)
  if (x.prealable) { console.error(`✗ ${JUGE} : préalable manquant — ${x.prealable}`); process.exit(2) }
  s.passe('E24-0', `${st.resume} ; ops_horloge_etat et ops_etat répondent ; la première exécution date de plus de ${o.fenetre} h`)
  for (const id of IDS.slice(1)) {
    let r
    try { r = LECTURES[id](x.m) } catch (e) { r = res([`lecture impossible : ${court(e.message, 120)}`]) }
    if (r.ok) s.passe(id, r.resume); else for (const t of r.echecs) s.echoue(id, t)
  }
  fs.mkdirSync(path.dirname(RELEVE), { recursive: true })
  fs.writeFileSync(RELEVE, `${JSON.stringify({ mesure_le: new Date(x.m.fin).toISOString(), fenetre_heures: o.fenetre, chiffres: releveDe(x.m), lectures_echouees: x.m.lecturesEchouees }, null, 2)}\n`)
  s.note(`relevé : ${C.posix(path.relative(C.R, RELEVE))}`)
  process.exitCode = s.fin()
}
if (S.estLance(FICHIER)) await principal()
