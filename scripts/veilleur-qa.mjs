#!/usr/bin/env node
// scripts/veilleur-qa.mjs — le juge de la fiche 026-047 (lib/agents/veilleur.ts, le veilleur A0, et ses motifs dans lib/alertes.ts),
// écrit par Claude Code en 026-045 (VA-11 à VA-18 de la rectification du 24/09 ; VA-7, VA-13, VA-16 et VA-19 réécrits par la voie
// gratuite du 25/09). Le vrai veilleur est importé dans un processus à part (la sonde du lot 03), sans réseau ni secret, avec
// l'horloge simulée (scripts/lib/horloge-simulee.mjs) et le VRAI lib/alertes.ts de la racine (verrou quotidien, persistance) ; le
// vrai client @supabase/supabase-js parle à une base factice : le faux PostgREST du lot 03 (contrat-ops.json, plus
// acq_disjoncteurs_etat et acq_jauges de 026-063) qui sert les jeux d'essai de scripts/fixtures/026-horloge-bus/veilleur/etats/
// et consigne chaque appel, consommer_limite sur l'horloge simulée, et les tables alertes et passages_cron. Doublures
// (veilleur/doublures/) : lib/email (aucun e-mail ne part), lib/direction/stripe (l'encaissé du cas), lib/agents/pause (la pause du
// cas), lib/agents/acquisition/jauges (calculerJauges imposée par le cas) ; lib/agents/acquisition/disjoncteurs est « absent ».
//
//   VA-1  lib/agents/veilleur.ts exporte veilleur, URGENTS (exactement la liste du point 2), COULEURS, AGENTS_DE_L_USINE et
//         creneauDigest.
//   VA-2  lignes d'attention (etats/lignes.json) : chaque cas rend exactement ses lignes, et ses urgents partent tout de suite ;
//         ops_argent_etat en erreur → « non mesuré », sans exception.
//   VA-3  une journée de Paris, un passage toutes les 5 min, 6 alertes non urgentes : 3 envois non urgents au plus (digests
//         compris), les deux digests une fois chacun, l'urgent une fois ; notifications_jour monte avec les digests.
//   VA-4  créneaux : 07 h 30 → matin une fois (pas à 07 h 35), 18 h 30 → soir, 12 h → rien ; creneauDigest juste au changement
//         d'heure ; le digest : sections dans l'ordre, 5 décisions au plus avec des liens decision=<uuid> et rien d'autre dans la
//         requête, 7 lignes d'attention au plus, aucune adresse, aucune valeur de prospect.
//   VA-5  coupe-circuit (etats/coupe-circuit.json) : 151 € sans recette → ops_agent_pause pour recenseur et chef seulement, la
//         décision coupe_circuit:<AAAA-MM>, un envoi urgent ; 149 € ou 300 € encaissés → rien ; recette inconnue → aucune
//         pause, une ligne.
//   VA-6  chaque passage : ops_battement('a0') et un événement « passage » de a0.
//   VA-7  lib/alertes.ts : les motifs nouveaux dans Motif, MOTIFS et simulation() (ronde({ simuler }) les rend), aucun des motifs
//         retirés par la voie gratuite ; CRONS_ATTENDUS (tic 1 h, acq-recenseur 14, acq-standardiste 1, acq-redacteur 18,
//         crieur 26, acq-facteur 1, acq-repondeur 1, acq-rge 26, et les entrées de HEAD inchangées) ; ronde() un lundi : sans
//         passage tic le digest hebdomadaire est candidat, avec un passage de 10 min il ne l'est pas ; garderAlerte garde sans
//         envoyer, avec la gravité critique des motifs rouges ; les corps de dix fonctions identiques à HEAD.
//   VA-8  le diff de app/api/controle/a-faire/route.ts se limite à l'entrée tic de NOMS_CRON.
//   VA-9  lecture de lib/agents/veilleur.ts : ni @anthropic-ai, ni lib/agents/llm, ni écriture de sites_commandes ni de Stripe,
//         aucun fetch ; parmi les rpc('acq_…'), seules les lectures acq_disjoncteurs_etat et acq_jauges (VA-18 l'exige) ; aucun
//         import statique de lib/agents/acquisition/.
//   VA-10 npm run typecheck en code 0, veilleur.ts et alertes.ts vérifiés (en --temoin : la lecture du typecheck éprouvée).
//   VA-11 l'usine (etats/usine.json).
//   VA-12 plus de crédit de clé : ni credit_bas ni cle_agents_vide, ni AGENTS_PLAFOND_MOIS ; couts_mois à 24 → aucune carte.
//   VA-13 l'envoi tenu par la base (etats/envoi.json) ; aucune fonction qui écrit côté envoi n'est appelée ; aucun titre ni geste
//         avec @ ou une valeur de prospect.
//   VA-14 Meta coupé dans 3 h → meta_erreur ; coupure passée → rien.
//   VA-15 9 lignes (3 rouges, 6 jaunes) → 7, les rouges d'abord ; couleur = COULEURS[motif], geste non vide ; le digest dans le
//         même ordre, préfixé des couleurs ; COULEURS égal à COULEUR_DE de la station (couleur-de-station.json).
//   VA-16 ni les clés d'alerte, ni les résumés d'événements, ni le corps du digest, ni les cartes ne portent une valeur de
//         prospect (prospects.json).
//   VA-17 carteAttention et calculerJauges absentes : les autres lignes, sans exception.
//   VA-18 jauges : attention → quota_haut, pleine → jauge_pleine sans envoi immédiat, acq_jauges absente → rien ; l'état vient
//         de calculerJauges (le juge en impose un qui contredit la part utilisée).
//   VA-19 bilan (arret_froid → « choisir un autre segment ou une autre offre » ; la veille → rien) ; vercel_pro au premier
//         encaissement, une seule décision sur deux passages ; le geste du jeton Meta cite presti-secrets/meta-bibliotheque-pubs.txt ;
//         aucun geste ne cite le SQL Editor, un séquenceur, une boîte ni un domaine de prospection ; crieur et acq-rge à 26 h.
//
// Usage : node scripts/veilleur-qa.mjs [--racine=<dossier>] [--temoin] [--reel]
//   --temoin : chaque critère sur le témoin (veilleur/temoins/lib/agents/veilleur.ts.temoin ; lib/alertes.ts et la route
//              « À faire » dérivées de HEAD ; bus et pause du lot 03) doit être VERT, puis chaque sabotage ROUGE.
// Sortie : une ligne par critère, puis « veilleur-qa : PASS » ou « … : FAIL — ids ». Code 0 si tout est vert, 1 sinon, 2 si un
// préalable manque.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import * as S from './fixtures/026-horloge-bus/veilleur/socle-lot04.mjs'
import { RACCOURCI_DIT } from './lib/horloge-simulee.mjs'

const { C, res, court } = S
const JUGE = 'veilleur-qa'
const FICHIER = fileURLToPath(import.meta.url)
const IDS = ['VA-1', 'VA-2', 'VA-3', 'VA-4', 'VA-5', 'VA-6', 'VA-7', 'VA-8', 'VA-9', 'VA-10', 'VA-11', 'VA-12', 'VA-13', 'VA-14', 'VA-15', 'VA-16', 'VA-17', 'VA-18', 'VA-19']
const MODULE = 'lib/agents/veilleur.ts'
const ALERTES = 'lib/alertes.ts'
const AFAIRE = 'app/api/controle/a-faire/route.ts'
const URGENTS_ATTENDUS = ['paiement', 'appel', 'panne_agent', 'argent_bloque', 'coupe_circuit', 'usine_injoignable', 'canal_arrete', 'gmail_bloque']
const NOUVEAUX_MOTIFS = ['agent_muet', 'panne_agent', 'disjoncteur', 'jeton_externe', 'stockage', 'argent_bloque', 'coupe_circuit', 'usine_injoignable', 'jeton_meta_expire', 'canal_arrete', 'gmail_bloque', 'technologie_en_pause', 'modele_suspendu', 'notice_perimee', 'bilan', 'vercel_pro', 'meta_erreur', 'changer_message', 'quota_haut', 'jauge_pleine', 'non_mesure']
const MOTIFS_RETIRES = ['boite_deconnectee', 'liste_noire', 'arret_email', 'sequenceur_non_arrete', 'retrait_echoue', 'boite_sans_notice']
const CRITIQUES = ['panne_agent', 'argent_bloque', 'coupe_circuit', 'usine_injoignable', 'jeton_meta_expire', 'canal_arrete', 'gmail_bloque', 'notice_perimee', 'jauge_pleine']
const CRONS_NOUVEAUX = { tic: 1, 'acq-recenseur': 14, 'acq-standardiste': 1, 'acq-redacteur': 18, crieur: 26, 'acq-facteur': 1, 'acq-repondeur': 1, 'acq-rge': 26 }
const CORPS_INCHANGES = ['verifierSoldeIA', 'verifierCreditsArtisans', 'verifierErreurs', 'verifierCrons', 'verifierDomaineMail', 'verifierSecurite', 'alertePaiement', 'digest', 'envoyerAlertes', 'envoyer']
const ACQ_LECTURES = ['acq_disjoncteurs_etat', 'acq_jauges']
const JOUR = 86_400_000

const nonJuge = (racine) => (C.existe(racine, MODULE) ? null : res([`non jugé : ${MODULE} absent (VA-1)`]))
const sonde = (nom, racine, params = {}) => S.sonde({ juge: JUGE, fichier: FICHIER, nom, racine, params, figer: '2026-10-20T10:00:00Z', delaiMs: 300_000 })
const parSonde = (nom, params = {}) => async (racine) => { const n = nonJuge(racine); if (n) return n; return S.deSonde(await sonde(nom, racine, params)) }

// ── Les jeux d'essai ───────────────────────────────────────────────────────────────────────────────────────────────
const lireEtat = (f) => S.lireJson(path.join('etats', f))
const PROSPECTS = () => S.lireJson('prospects.json')
const valeursProspects = () => { const p = PROSPECTS(); return [...p.nom, ...p.email, ...p.site, ...p.telephone] }
/** Les jetons d'un jeu d'essai : { $hasard: [a, b] }, « $uuid », « $jour », « $demain », « …$prospect.<clé>.<n>… ». */
function jetons(v, t0) {
  if (Array.isArray(v)) return v.map((x) => jetons(x, t0))
  if (v && typeof v === 'object') {
    if (Array.isArray(v.$hasard)) return v.$hasard[0] + crypto.randomInt(v.$hasard[1] - v.$hasard[0] + 1)
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, jetons(x, t0)]))
  }
  if (typeof v !== 'string') return v
  if (v === '$uuid') return crypto.randomUUID()
  if (v === '$jour') return S.jourParis(t0)
  if (v === '$demain') return S.jourParis(t0 + JOUR)
  if (v.includes('$prospect.')) { const p = PROSPECTS(); return v.replace(/\$prospect\.(\w+)\.(\d+)/g, (_, k, n) => p[k][Number(n)]) }
  return v
}
const fusionner = (a, b) => {
  if (b === undefined) return a
  if (!a || typeof a !== 'object' || Array.isArray(a) || !b || typeof b !== 'object' || Array.isArray(b)) return b
  const o = { ...a }
  for (const [k, v] of Object.entries(b)) o[k] = fusionner(a[k], v)
  return o
}
/** L'état d'un cas : base.json, les agents en plus, les champs du cas ; jetons puis dates relatives résolus sur t0. */
function etatDuCas(cas, t0, { agentsEnPlus = [], envoiEnPlus = null, agentsSeuls = false } = {}) {
  const b = lireEtat('base.json')
  let agents = agentsSeuls ? [] : [...b.ops_etat.agents]
  const poser = (a) => { const i = agents.findIndex((x) => x.nom === a.nom); if (i >= 0) agents[i] = { ...agents[i], ...a }; else agents.push(a) }
  for (const a of agentsEnPlus) poser(a)
  for (const a of cas.agents ?? []) poser(a)
  if (cas.sans_usine) agents = agents.filter((a) => a.nom !== 'usine')
  const ops = { ...b.ops_etat, agents }
  if (cas.couts_mois !== undefined) ops.couts_mois = cas.couts_mois
  if (cas.decisions_ouvertes) ops.decisions_ouvertes = cas.decisions_ouvertes
  let envoi = cas.envoi === undefined ? b.envoi : typeof cas.envoi === 'string' ? cas.envoi : fusionner(b.envoi_calme, cas.envoi)
  if (envoiEnPlus && envoi && typeof envoi === 'object') envoi = envoiEnPlus(envoi)
  const e = {
    ops_etat: ops,
    stockage_octets: cas.stockage_octets ?? b.stockage_octets,
    argent: cas.argent === 'erreur' ? 'erreur' : { ...b.argent, ...(cas.argent ?? {}) },
    envoi,
    jauges: cas.jauges === 'presente' ? lireEtat('jauges.json').acq_jauges : cas.jauges ?? b.jauges,
    encaisse: cas.encaisse ?? b.encaisse,
    pause: cas.pause ?? b.pause,
  }
  return S.resoudre(jetons(e, t0), t0)
}

// ── Côté sonde ─────────────────────────────────────────────────────────────────────────────────────────────────────
const r500 = { status: 500, body: { code: 'XX000', message: 'panne de la base (essai)', details: null, hint: null } }
const absente = (f) => ({ status: 404, body: { code: 'PGRST202', message: `Could not find the function public.${f} without parameters in the schema cache`, details: null, hint: null } })
async function monter(ctx, { calculer = 'doublure' } = {}) {
  const J = S.journal({})
  const reseau = S.tenirReseau()
  const monde = { etat: null, evenements: [], battements: [], decisions: new Map(), creees: [], pauses: [], octrois: [], jt: [], alertes: [], passages: [], artisans: [] }
  const lim = S.limiteur()
  const reponses = {
    ops_battement: (p) => { monde.battements.push({ nom: p.p_nom, le: Date.now() }); return { status: 200, body: new Date().toISOString() } },
    ops_evenement_ajouter: (p) => { monde.evenements.push({ agent: p.p_agent, type: p.p_type, objet: p.p_objet, resume: p.p_resume, le: Date.now() }); return { status: 200, body: monde.evenements.length } },
    ops_etat: () => {
      const e = monde.etat
      if (e.ops_etat === 'erreur') return r500
      const jour = S.jourParis(Date.now())
      const n = monde.evenements.filter((x) => x.type === 'notification' && S.jourParis(x.le) === jour).length
      return { status: 200, body: { ...e.ops_etat, notifications_jour: Number(e.ops_etat.notifications_jour || 0) + n } }
    },
    ops_stockage_octets: () => (monde.etat.stockage_octets === 'erreur' ? r500 : { status: 200, body: monde.etat.stockage_octets }),
    ops_argent_etat: () => (monde.etat.argent === 'erreur' ? r500 : { status: 200, body: monde.etat.argent }),
    acq_disjoncteurs_etat: () => (monde.etat.envoi === 'absente' ? absente('acq_disjoncteurs_etat') : monde.etat.envoi === 'erreur' ? r500 : { status: 200, body: monde.etat.envoi }),
    acq_jauges: () => (monde.etat.jauges === 'absente' ? absente('acq_jauges') : monde.etat.jauges === 'erreur' ? r500 : { status: 200, body: monde.etat.jauges }),
    ops_agent_pause: (p) => { monde.pauses.push(p); return { status: 200, body: null } },
    ops_decision_creer: (p) => {
      const d = monde.decisions.get(p.p_cle)
      if (d) return { status: 200, body: [{ id: d.id, creee: false }] }
      const id = crypto.randomUUID()
      monde.decisions.set(p.p_cle, { id, ...p })
      monde.creees.push(p.p_cle)
      return { status: 200, body: [{ id, creee: true }] }
    },
    consommer_limite: (p) => { const r = lim(p); monde.octrois.push({ cle: p.p_cle, ok: r.body === true, le: Date.now() }); return r },
  }
  const base = await S.demarrerBase({ reponses, tables: {
    alertes: S.table('alertes', monde.alertes, monde.jt), passages_cron: S.table('passages_cron', monde.passages, monde.jt, { cle: 'nom' }),
    artisans: S.table('artisans', monde.artisans, monde.jt), app_errors: S.table('app_errors', [], monde.jt),
  } })
  S.doubler(ctx.racine, { 'lib/email': 'email.mjs', 'lib/direction/stripe': 'stripe.mjs', 'lib/agents/pause': 'pause.mjs', 'lib/agents/acquisition/disjoncteurs': 'absent.mjs', 'lib/agents/acquisition/jauges': calculer === 'absente' ? 'absent.mjs' : 'jauges.mjs' })
  const fermer = async () => { reseau.rendre(); await base.arreter() }
  let mod
  try { mod = await ctx.importer(MODULE) } catch (e) { await fermer(); throw e }
  const reinit = () => {
    lim.vus.clear()
    for (const k of ['evenements', 'battements', 'creees', 'pauses', 'octrois', 'alertes', 'jt']) monde[k].length = 0
    monde.decisions.clear()
    J.emails.length = 0; J.appels.length = 0
    base.fp.appels.length = 0
  }
  /** Joue un cas : l'état posé, puis un passage du veilleur à chaque décalage de `passages`. → { resultats, t0, jour } */
  const jouer = async (cas, { t0 = Date.parse(cas.maintenant ?? lireEtat('base.json').maintenant), passages = cas.passages ?? [0], etat = null, calculerCas } = {}) => {
    reinit()
    monde.etat = etat ?? etatDuCas(cas, t0)
    J.config = { pause: monde.etat.pause === true, encaisse: monde.etat.encaisse, jauges: Array.isArray(calculerCas ?? cas.calculer) ? (calculerCas ?? cas.calculer) : [] }
    const resultats = []
    for (const dt of passages) {
      S.horloge().figer(new Date(t0 + dt).toISOString())
      resultats.push(await mod.veilleur({ maintenant: new Date() }))
    }
    return { resultats, t0, jour: S.jourParis(t0) }
  }
  /** Les envois urgents (hors digest) accordés par le verrou de lib/alertes : motif → nombre. */
  const urgentsEnvoyes = () => {
    const n = {}
    for (const o of monde.octrois) { const m = /^alerte:([a-z_]+):/.exec(o.cle); if (o.ok && m && m[1] !== 'digest') n[m[1]] = (n[m[1]] ?? 0) + 1 }
    return n
  }
  const digestsEnvoyes = () => monde.octrois.filter((o) => o.ok && o.cle.startsWith('alerte:digest:')).map((o) => o.cle.slice('alerte:digest:'.length))
  const appelsAcqEcriture = () => base.fp.appels.filter((a) => a.fonction && a.fonction.startsWith('acq_') && !ACQ_LECTURES.includes(a.fonction)).map((a) => a.fonction)
  return { J, reseau, monde, base, mod, jouer, fermer, urgentsEnvoyes, digestsEnvoyes, appelsAcqEcriture }
}

const normaliser = (t) => String(t ?? '').replace(/[’‘]/g, '\'').toLowerCase()
/** Juge un cas : les lignes exactes (motif et couleur), les urgents, et les attendus propres (nomme, nombre, geste…). */
function jugerCas(m, cas, x) {
  const e = []
  const q = `« ${cas.nom} »`
  const r = x.resultats[0]
  if (!r || !Array.isArray(r.attention)) return [`${q} : veilleur() ne rend pas { attention: [] }`]
  const motifs = r.attention.map((l) => l.motif)
  const att = cas.attendu.lignes ?? {}
  const attMotifs = Object.keys(att).sort()
  // lignes: null — le cas ne fixe pas le motif de ses lignes (ex. recette inconnue : « une ligne d'attention »)
  if (cas.attendu.lignes !== null && JSON.stringify([...motifs].sort()) !== JSON.stringify(attMotifs)) e.push(`${q} : lignes ${motifs.join(', ') || '(aucune)'} ; ${attMotifs.join(', ') || '(aucune)'} attendue(s)`)
  for (const l of r.attention) if (att[l.motif] && l.couleur !== att[l.motif]) e.push(`${q} : ${l.motif} en ${l.couleur}, ${att[l.motif]} attendu`)
  const envoyes = m.urgentsEnvoyes()
  const totaux = cas.attendu.urgents_total ?? Object.fromEntries((cas.attendu.urgents ?? []).map((u) => [u, 1]))
  const tous = [...new Set([...Object.keys(envoyes), ...Object.keys(totaux)])]
  for (const u of tous) if ((envoyes[u] ?? 0) !== (totaux[u] ?? 0)) e.push(`${q} : ${u} envoyé ${envoyes[u] ?? 0} fois tout de suite, ${totaux[u] ?? 0} attendu(s)`)
  const ligne = (motif) => r.attention.find((l) => l.motif === motif)
  for (const n of cas.attendu.nomme ?? []) { const l = r.attention.find((x) => x.motif in att); if (!l || !String(l.texte ?? '').includes(n)) e.push(`${q} : la ligne ne nomme pas ${n}`) }
  for (const n of cas.attendu.ne_nomme_pas ?? []) for (const l of r.attention) if (String(l.texte ?? '').includes(n)) e.push(`${q} : la ligne ${l.motif} nomme ${n}, qui ne devait pas sonner`)
  for (const [motif, n] of Object.entries(cas.attendu.nombre ?? {})) { const l = ligne(motif); if (l && l.nombre !== n && !new RegExp(`(^|\\D)${n}(\\D|$)`).test(String(l.texte))) e.push(`${q} : la ligne ${motif} ne dit pas ${n} (nombre ${l.nombre})`) }
  for (const [motif, g] of Object.entries(cas.attendu.geste ?? {})) { const l = ligne(motif); if (l && !normaliser(l.geste).includes(normaliser(g))) e.push(`${q} : le geste de ${motif} ne dit pas « ${g} » (« ${court(l.geste, 70)} »)`) }
  if (cas.attendu.cle_urgent) {
    // la clé de l'alerte est <motif>:<objet>:<jour de Paris> ; lib/alertes la verrouille sous alerte:<motif>:<clé>
    const cle = `alerte:${cas.attendu.cle_urgent.split(':')[0]}:${cas.attendu.cle_urgent}${x.jour}`
    if (!m.monde.octrois.some((o) => o.cle === cle)) e.push(`${q} : aucun envoi de clé ${cas.attendu.cle_urgent}<jour de Paris> (${m.monde.octrois.filter((o) => !o.cle.startsWith('alerte:digest')).map((o) => o.cle).join(', ') || 'aucun'})`)
  }
  if (cas.attendu.decisions_vercel !== undefined) {
    const n = m.monde.creees.filter((k) => k === 'vercel_pro').length
    if (n !== cas.attendu.decisions_vercel) e.push(`${q} : ${n} décision(s) vercel_pro créée(s), ${cas.attendu.decisions_vercel} attendue(s)`)
    const appels = m.base.fp.appels.filter((a) => a.fonction === 'ops_decision_creer' && a.params?.p_cle === 'vercel_pro')
    if (cas.attendu.decisions_vercel && appels.some((a) => a.params?.p_portee !== 'argent')) e.push(`${q} : la décision vercel_pro n'a pas la portée argent`)
  }
  for (const l of r.attention) {
    if (typeof l.geste !== 'string' || !l.geste.trim()) e.push(`${q} : la ligne ${l.motif} n'a pas de geste`)
    if (/@/.test(`${l.texte} ${l.geste}`)) e.push(`${q} : la ligne ${l.motif} contient « @ »`)
  }
  const ecr = m.appelsAcqEcriture()
  if (ecr.length) e.push(`${q} : appel(s) qui écrivent côté envoi : ${[...new Set(ecr)].join(', ')}`)
  const f = m.base.fp.fautes().filter((a) => !(a.fonction ?? '').startsWith('acq_') || ACQ_LECTURES.includes(a.fonction))
  if (f.length) e.push(`${q} : appel(s) refusés par le faux PostgREST (noms ou types hors contrat) : ${f.slice(0, 3).map((a) => `${a.fonction || a.table} (${a.faute})`).join(', ')}`)
  if (m.reseau.horsDns().length) e.push(`${q} : réseau : ${m.reseau.horsDns().slice(0, 3).join(', ')}`)
  return e
}
async function jouerFichier(ctx, fichier, filtre = () => true, options = {}) {
  const f = lireEtat(fichier)
  const m = await monter(ctx, options)
  const e = [], vus = []
  try {
    for (const cas of f.cas.filter(filtre)) {
      let x
      try { x = await m.jouer(cas, { etat: etatDuCas(cas, Date.parse(cas.maintenant ?? f.maintenant ?? lireEtat('base.json').maintenant), { agentsEnPlus: [...(f.agents ?? []), ...(f.usine ? [f.usine, ...f.atelier] : [])], envoiEnPlus: options.envoiEnPlus, agentsSeuls: f.agents_seuls === true }), t0: Date.parse(cas.maintenant ?? f.maintenant ?? lireEtat('base.json').maintenant) }) } catch (err) { e.push(`« ${cas.nom} » : exception ${court(err.message, 120)}`); continue }
      const d = options.jugerAussi ? [...jugerCas(m, cas, x), ...options.jugerAussi(m, cas, x)] : jugerCas(m, cas, x)
      e.push(...d)
      vus.push(cas.nom)
    }
  } finally { await m.fermer() }
  return { echecs: e, resume: `${vus.length} cas de ${fichier} : ${court(vus.join(' ; '), 220)}` }
}

export const SONDES = {
  async exports(ctx) {
    const m = await monter(ctx)
    try {
      const e = []
      const x = m.mod
      if (typeof x.veilleur !== 'function') e.push('veilleur n\'est pas une fonction exportée')
      if (typeof x.creneauDigest !== 'function') e.push('creneauDigest n\'est pas une fonction exportée')
      if (!Array.isArray(x.URGENTS)) e.push('URGENTS n\'est pas une liste exportée')
      else if (JSON.stringify([...x.URGENTS].sort()) !== JSON.stringify([...URGENTS_ATTENDUS].sort())) e.push(`URGENTS = ${x.URGENTS.join(', ')} ; ${URGENTS_ATTENDUS.join(', ')} attendu`)
      if (!x.COULEURS || typeof x.COULEURS !== 'object') e.push('COULEURS n\'est pas exporté')
      if (!Array.isArray(x.AGENTS_DE_L_USINE) || JSON.stringify([...x.AGENTS_DE_L_USINE].sort()) !== JSON.stringify(['atelier_maquettes', 'chef', 'livreur_usine'])) e.push(`AGENTS_DE_L_USINE = ${JSON.stringify(x.AGENTS_DE_L_USINE)} ; atelier_maquettes, livreur_usine, chef attendus`)
      return { echecs: e, resume: 'veilleur, URGENTS (la liste du point 2), COULEURS, AGENTS_DE_L_USINE et creneauDigest exportés' }
    } finally { await m.fermer() }
  },
  lignes: (ctx) => jouerFichier(ctx, 'lignes.json'),
  usine: (ctx) => jouerFichier(ctx, 'usine.json'),
  coupe: (ctx) => jouerFichier(ctx, 'coupe-circuit.json', () => true, {
    jugerAussi: (m, cas, x) => {
      const e = []
      const q = `« ${cas.nom} »`
      const pauses = [...new Set(m.monde.pauses.filter((p) => p.p_pause === true).map((p) => p.p_nom))].sort()
      if (JSON.stringify(pauses) !== JSON.stringify([...cas.attendu.pauses].sort())) e.push(`${q} : ops_agent_pause pour ${pauses.join(', ') || 'personne'} ; ${cas.attendu.pauses.join(', ') || 'personne'} attendu`)
      const coupes = m.monde.creees.filter((k) => k.startsWith('coupe_circuit'))
      const mois = S.jourParis(x.t0).slice(0, 7)
      if (cas.attendu.decision_coupe) {
        if (coupes.length !== 1 || coupes[0] !== `coupe_circuit:${mois}`) e.push(`${q} : décision(s) ${coupes.join(', ') || 'aucune'} ; coupe_circuit:${mois} attendue`)
        const d = m.monde.decisions.get(`coupe_circuit:${mois}`)
        if (d && d.p_portee !== 'argent') e.push(`${q} : la décision du coupe-circuit n'a pas la portée argent`)
      } else if (coupes.length) e.push(`${q} : décision ${coupes[0]} créée à tort`)
      if (cas.attendu.une_ligne && !x.resultats[0]?.attention?.length) e.push(`${q} : aucune ligne d'attention alors que la recette est inconnue`)
      return e
    },
  }),
  async passages(ctx) {
    const m = await monter(ctx)
    try {
      const e = []
      const x = await m.jouer({ nom: 'deux passages', attendu: {} }, { passages: [0, 300_000] })
      const bat = m.monde.battements.filter((b) => b.nom === 'a0').length
      const pas = m.monde.evenements.filter((v) => v.agent === 'a0' && v.type === 'passage').length
      if (bat !== 2) e.push(`${bat} ops_battement('a0') pour 2 passages`)
      if (pas !== 2) e.push(`${pas} événement(s) « passage » de a0 pour 2 passages`)
      if (m.monde.battements.some((b) => b.nom !== 'a0')) e.push(`ops_battement pour un autre agent : ${m.monde.battements.find((b) => b.nom !== 'a0').nom}`)
      return { echecs: e, resume: `2 passages : ${bat} ops_battement('a0'), ${pas} événements « passage » de a0 (${x.resultats.length} rendus)` }
    } finally { await m.fermer() }
  },
  async journee(ctx) {
    const j = lireEtat('journee.json').journee
    const m = await monter(ctx)
    try {
      const e = []
      const t0 = Date.parse(j.debut)
      const etat = etatDuCas({ agents: j.agents, argent: j.argent, stockage_octets: j.stockage_octets, envoi: j.envoi }, t0)
      await m.jouer({ nom: 'journée' }, { t0, etat, passages: Array.from({ length: j.passages }, (_, i) => i * j.pas_ms) })
      const jours = new Set(Array.from({ length: j.passages }, (_, i) => S.jourParis(t0 + i * j.pas_ms)))
      if (jours.size !== 1) e.push(`la journée simulée couvre ${jours.size} jours de Paris (1 attendu : le jeu d'essai est faux)`)
      const jour = [...jours][0]
      const urgents = m.urgentsEnvoyes()
      const nUrgents = Object.values(urgents).reduce((a, b) => a + b, 0)
      const emails = m.J.emails.length
      const nonUrgents = emails - nUrgents
      if (nonUrgents > 3) e.push(`${nonUrgents} envois non urgents dans la journée (3 au plus, digests compris)`)
      for (const u of j.urgents) if (urgents[u] !== 1) e.push(`urgent ${u} envoyé ${urgents[u] ?? 0} fois dans la journée, 1 attendu`)
      for (const u of j.non_urgents) if (urgents[u]) e.push(`${u} (non urgent) envoyé ${urgents[u]} fois`)
      const d = m.digestsEnvoyes()
      for (const c of ['matin', 'soir']) { const n = d.filter((k) => k === `agents:${jour}:${c}`).length; if (n !== 1) e.push(`digest ${c} envoyé ${n} fois, 1 attendu`) }
      const notif = m.monde.evenements.filter((v) => v.agent === 'a0' && v.type === 'notification').length
      if (notif !== 2) e.push(`${notif} événement(s) « notification » de a0, 2 attendus (un par digest)`)
      return { echecs: e, resume: `${j.passages} passages le ${jour} : ${emails} e-mail(s), dont ${nUrgents} urgent(s) et ${nonUrgents} non urgent(s) (digests ${d.join(', ')}) ; ${notif} notifications` }
    } finally { await m.fermer() }
  },
  async creneaux(ctx) {
    const c = lireEtat('journee.json').creneaux
    const o = lireEtat('ordre.json')
    const m = await monter(ctx)
    try {
      const e = []
      for (const k of c.creneau_digest) {
        let v
        try { v = m.mod.creneauDigest(new Date(k.a)) } catch (err) { v = `exception ${err.message}` }
        if (v !== k.attendu) e.push(`creneauDigest(${k.a}) = ${JSON.stringify(v)}, ${JSON.stringify(k.attendu)} attendu (${k.pourquoi})`)
      }
      const t0 = Date.parse(c.passages[0].a)
      const etat = etatDuCas(o, t0, {})
      await m.jouer(o, { t0, etat, passages: c.passages.map((p) => Date.parse(p.a) - t0) })
      const jour = S.jourParis(t0)
      const d = m.digestsEnvoyes()
      const att = c.passages.filter((p) => p.digest).map((p) => `agents:${jour}:${p.digest}`)
      if (JSON.stringify(d) !== JSON.stringify(att)) e.push(`digests envoyés : ${d.join(', ') || 'aucun'} ; ${att.join(', ')} attendus (07 h 30 et 18 h 30, ni 07 h 35 ni 12 h)`)
      const corps = m.J.emails.filter((x) => /point du (matin|soir)/i.test(x.sujet) || /^Argent/m.test(x.corps)).map((x) => x.corps)
      if (!corps.length) e.push('aucun corps de digest reçu par la doublure de lib/email')
      const ids = new Set(etat.ops_etat.decisions_ouvertes.map((x) => x.id))
      for (const t of corps.slice(0, 1)) e.push(...jugerCorps(t, c.sections, ids))
      return { echecs: e, resume: `creneauDigest juste sur ${c.creneau_digest.length} instants (dont le 25/10/2026) ; digests ${d.join(', ')} ; corps : ${c.sections.length} sections dans l'ordre, liens decision=<uuid>, 7 lignes au plus, ni adresse ni prospect` }
    } finally { await m.fermer() }
  },
  async ordre(ctx) {
    const o = lireEtat('ordre.json')
    const station = S.lireJson('couleur-de-station.json')
    const m = await monter(ctx)
    try {
      const e = []
      const x = await m.jouer(o)
      const a = x.resultats[0]?.attention ?? []
      if (a.length !== 7) e.push(`${a.length} lignes d'attention pour 9 produites, 7 attendues`)
      const rouges = a.slice(0, 3).map((l) => l.motif).sort()
      if (JSON.stringify(rouges) !== JSON.stringify([...o.attendu.rouges].sort())) e.push(`les 3 premières lignes : ${rouges.join(', ')} ; les rouges ${o.attendu.rouges.join(', ')} attendues`)
      for (const l of a.slice(3)) if (l.couleur !== 'jaune' || !o.attendu.jaunes.includes(l.motif)) e.push(`après les rouges : ${l.motif} (${l.couleur}), une jaune attendue`)
      const C0 = m.mod.COULEURS ?? {}
      for (const l of a) {
        if (l.couleur !== C0[l.motif]) e.push(`${l.motif} : couleur ${l.couleur}, COULEURS dit ${C0[l.motif]}`)
        if (typeof l.geste !== 'string' || !l.geste.trim()) e.push(`${l.motif} sans geste`)
      }
      for (const mo of station.motifs_du_veilleur) {
        const att = station.COULEUR_DE[mo] ?? station.inconnu
        if (C0[mo] !== att) e.push(`COULEURS.${mo} = ${C0[mo] ?? '(absent)'}, la station dit ${att}`)
      }
      for (const [mo, c] of Object.entries(C0)) if ((station.COULEUR_DE[mo] ?? station.inconnu) !== c) e.push(`COULEURS.${mo} = ${c}, la station dit ${station.COULEUR_DE[mo] ?? station.inconnu}`)
      const corps = m.J.emails.find((z) => /point du (matin|soir)/i.test(z.sujet))?.corps
      if (!corps) e.push('aucun digest à 07 h 30 : l\'ordre dans le digest ne peut pas être jugé')
      else {
        const couleurs = lignesAttentionDuDigest(corps).map((l) => l.couleur)
        if (JSON.stringify(couleurs) !== JSON.stringify(a.map((l) => l.couleur))) e.push(`couleurs dans le digest : ${couleurs.join(', ') || '(aucune)'} ; ${a.map((l) => l.couleur).join(', ')} attendu (même ordre)`)
      }
      return { echecs: e, resume: `9 lignes → 7 : ${a.map((l) => `${l.couleur} ${l.motif}`).join(', ')} ; COULEURS égal à COULEUR_DE de la station ; digest dans le même ordre` }
    } finally { await m.fermer() }
  },
  async prospects(ctx) {
    const o = lireEtat('ordre.json')
    const valeurs = valeursProspects().map((v) => v.toLowerCase())
    const m = await monter(ctx)
    try {
      const e = []
      const fuite = (quoi, t) => { const s = String(t ?? '').toLowerCase(); const v = valeurs.find((x) => s.includes(x)); if (v) e.push(`${quoi} porte « ${v} »`) }
      const planter = (envoi) => ({ ...envoi, technologies: (envoi.technologies ?? []).map((t, i) => ({ ...t, dernier_prospect: PROSPECTS().site[i % 3] })), modeles_suspendus: (envoi.modeles_suspendus ?? []).map((x, i) => (typeof x === 'object' ? { ...x, dernier_prospect: PROSPECTS().nom[i % 3] } : x)) })
      const cas = [o, ...lireEtat('envoi.json').cas.filter((c) => c.critere === 'VA-13' && typeof c.envoi === 'object')]
      for (const c of cas) {
        const t0 = Date.parse(c.maintenant ?? lireEtat('base.json').maintenant)
        const etat = etatDuCas(c, t0, { envoiEnPlus: planter })
        const x = await m.jouer(c, { t0, etat })
        for (const l of x.resultats[0]?.attention ?? []) { fuite(`la carte ${l.motif} (« ${c.nom} »)`, `${l.texte} ${l.geste}`); if (/@/.test(`${l.texte} ${l.geste}`)) e.push(`la carte ${l.motif} contient « @ »`) }
        for (const k of m.monde.octrois) fuite(`la clé d'alerte ${court(k.cle, 40)}`, k.cle)
        for (const a of m.monde.alertes) { fuite(`la clé gardée ${court(a.cle, 40)}`, a.cle); fuite(`le sujet gardé (${a.motif})`, a.sujet) }
        for (const v of m.monde.evenements) { fuite(`le résumé d'événement ${v.type}`, `${v.resume} ${v.objet ?? ''}`); if (/@/.test(`${v.resume}`)) e.push(`le résumé d'événement ${v.type} contient « @ »`) }
        for (const z of m.J.emails) { fuite(`le corps envoyé « ${court(z.sujet, 30)} »`, `${z.sujet}\n${z.corps}`); if (S.RE_COURRIEL.test(z.corps)) e.push(`le corps envoyé « ${court(z.sujet, 30)} » contient une adresse`) }
      }
      return { echecs: [...new Set(e)], resume: `${cas.length} états (décisions et états de l'envoi porteurs de prospects fictifs) : aucune valeur de prospect dans les cartes, les clés, les résumés ni les corps envoyés` }
    } finally { await m.fermer() }
  },
  jauges: (ctx) => jouerFichier(ctx, 'jauges.json', (c) => c.calculer !== 'absente', { calculer: 'doublure', jugerAussi: (m, cas, x) => {
    const e = []
    const appel = m.J.appels.filter((a) => a.quoi === 'jauges.calculerJauges')
    if (cas.jauges === 'presente' && !appel.length) e.push(`« ${cas.nom} » : calculerJauges jamais appelée alors qu'acq_jauges répond`)
    return e
  } }),
  absents: (ctx) => jouerFichier(ctx, 'jauges.json', (c) => c.calculer === 'absente', { calculer: 'absente' }),
  envoi: (ctx, critere) => jouerFichier(ctx, 'envoi.json', (c) => c.critere === ctx.params.critere),
  async couts(ctx) {
    const m = await monter(ctx)
    try {
      const x = await m.jouer({ nom: 'coûts du mois à 24 €', couts_mois: 24, attendu: {} })
      const a = x.resultats[0]?.attention ?? []
      return { echecs: a.length ? [`couts_mois à 24 € : ${a.length} carte(s) (${a.map((l) => l.motif).join(', ')}), aucune attendue`] : [], resume: 'couts_mois à 24 € : aucune carte' }
    } finally { await m.fermer() }
  },
  async alertes(ctx) {
    const e = []
    const J = S.journal({})
    const reseau = S.tenirReseau()
    const jt = [], alertes = [], passages = [], artisans = []
    const base = await S.demarrerBase({ reponses: { consommer_limite: S.limiteur() }, tables: { alertes: S.table('alertes', alertes, jt), passages_cron: S.table('passages_cron', passages, jt, { cle: 'nom' }), artisans: S.table('artisans', artisans, jt), app_errors: S.table('app_errors', [], jt) } })
    S.doubler(ctx.racine, { 'lib/email': 'email.mjs' })
    try {
      const A = await ctx.importer(ALERTES)
      const motifs = Array.isArray(A.MOTIFS) ? A.MOTIFS : []
      for (const mo of NOUVEAUX_MOTIFS) if (!motifs.includes(mo)) e.push(`MOTIFS sans ${mo}`)
      for (const mo of MOTIFS_RETIRES) if (motifs.includes(mo)) e.push(`MOTIFS porte ${mo} (retiré par la voie gratuite)`)
      const sansSimulation = []
      for (const mo of NOUVEAUX_MOTIFS) {
        try { const r = await A.ronde({ simuler: mo, aSec: true }); if (!r.candidates?.some((c) => c.motif === mo && c.sujet && c.corps)) sansSimulation.push(mo) } catch { sansSimulation.push(mo) }
      }
      if (sansSimulation.length) e.push(`simulation() sans exemple pour : ${sansSimulation.join(', ')}`)
      const crons = Array.isArray(A.CRONS_ATTENDUS) ? A.CRONS_ATTENDUS : []
      for (const [nom, h] of Object.entries(CRONS_NOUVEAUX)) { const c = crons.find((x) => x.nom === nom); if (!c || c.maxHeures !== h) e.push(`CRONS_ATTENDUS : ${nom} à ${c ? `${c.maxHeures} h` : '(absent)'}, ${h} h attendu`) }
      for (const c of ctx.params.cronsHead ?? []) { const x = crons.find((y) => y.nom === c.nom); if (!x || x.maxHeures !== c.maxHeures) e.push(`CRONS_ATTENDUS : l'entrée de HEAD ${c.nom} (${c.maxHeures} h) a changé`) }
      // ronde() un lundi (19/10/2026) : sans passage tic, le digest hebdomadaire est candidat ; avec un passage de 10 min, non
      S.horloge().figer('2026-10-19T06:00:00Z')
      const r1 = await A.ronde({ aSec: true })
      if (!r1.candidates.some((c) => c.motif === 'digest')) e.push('ronde() un lundi sans passage tic : le digest hebdomadaire n\'est pas candidat')
      passages.push({ nom: 'tic', dernier_passage: new Date(Date.now() - 10 * 60_000).toISOString(), detail: {}, reussi: true })
      const r2 = await A.ronde({ aSec: true })
      if (r2.candidates.some((c) => c.motif === 'digest')) e.push('ronde() un lundi avec un passage tic de 10 min : le digest hebdomadaire est encore candidat (deux digests le lundi)')
      if (J.emails.length) e.push(`ronde({ aSec: true }) a envoyé ${J.emails.length} e-mail(s)`)
      // garderAlerte : gardée (table alertes), jamais envoyée, gravité critique pour les motifs rouges
      if (typeof A.garderAlerte !== 'function') e.push('garderAlerte n\'est pas exportée')
      else {
        const n0 = alertes.length
        for (const mo of ['panne_agent', 'canal_arrete', 'agent_muet', 'stockage']) await A.garderAlerte({ motif: mo, a: 'entreprise', cle: `${mo}:essai:${crypto.randomBytes(3).toString('hex')}`, sujet: `essai ${mo}`, corps: 'corps d’essai' })
        const gardees = alertes.slice(n0)
        if (gardees.length !== 4) e.push(`garderAlerte : ${gardees.length} ligne(s) gardée(s) pour 4 alertes`)
        for (const g of gardees) { const att = CRITIQUES.includes(g.motif) ? 'critique' : 'attention'; if (g.gravite !== att) e.push(`garderAlerte(${g.motif}) : gravité ${g.gravite}, ${att} attendue`) }
        if (J.emails.length) e.push(`garderAlerte a envoyé ${J.emails.length} e-mail(s)`)
      }
      if (reseau.horsDns().length) e.push(`réseau : ${reseau.horsDns().slice(0, 3).join(', ')}`)
      return { echecs: e, resume: `${NOUVEAUX_MOTIFS.length} motifs nouveaux dans MOTIFS et simulation() ; CRONS_ATTENDUS à jour ; ronde() du lundi sans digest si le tic a battu ; garderAlerte garde sans envoyer (gravité critique des rouges)` }
    } finally { reseau.rendre(); await base.arreter() }
  },
}

/** Les lignes d'attention d'un corps de digest : celles qui commencent (après une puce) par une couleur. */
function lignesAttentionDuDigest(t) {
  return String(t).split('\n').map((l) => /^\s*(?:[-*•·]\s*)?(rouge|orange|jaune|bleu)\b/i.exec(l)).filter(Boolean).map((m) => ({ couleur: m[1].toLowerCase() }))
}
function jugerCorps(t, sections, ids) {
  const e = []
  const L = String(t).split('\n')
  let pos = -1
  for (const s of sections) {
    const motif = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[’']/g, '[\'’]')
    // la section commence sa ligne, éventuellement après une décoration de titre (#, **, __, puce, numéro)
    const re = new RegExp(`^[\\s#*_•·\\-\\d.)]*${motif}`, 'i')
    const i = L.findIndex((l, k) => k > pos && re.test(l))
    if (i < 0) { e.push(`digest : section « ${s} » absente ou hors d'ordre`); continue }
    pos = i
  }
  const liens = [...String(t).matchAll(/\/controle\?[^\s)\]>"']*/g)].map((m) => m[0])
  if (!liens.length) e.push('digest : aucun lien de décision')
  if (liens.length > 5) e.push(`digest : ${liens.length} liens de décision, 5 au plus`)
  for (const l of liens) {
    const m = /^\/controle\?onglet=pilotage&decision=([0-9a-f-]{36})$/i.exec(l)
    if (!m) e.push(`digest : lien « ${court(l, 80)} » : /controle?onglet=pilotage&decision=<uuid> et rien d'autre attendu`)
    else if (!ids.has(m[1])) e.push(`digest : le lien porte un id inconnu des décisions ouvertes`)
  }
  const att = lignesAttentionDuDigest(t)
  if (att.length > 7) e.push(`digest : ${att.length} lignes d'attention, 7 au plus`)
  if (!att.length) e.push('digest : aucune ligne d\'attention préfixée de sa couleur')
  if (S.RE_COURRIEL.test(t)) e.push('digest : une adresse e-mail dans le corps')
  const v = valeursProspects().find((x) => String(t).toLowerCase().includes(x.toLowerCase()))
  if (v) e.push(`digest : une valeur de prospect dans le corps (« ${v} »)`)
  return e
}

// ── Côté juge : les lectures statiques ─────────────────────────────────────────────────────────────────────────────
async function jugerExports(racine) {
  if (!C.existe(racine, MODULE)) return res([`${MODULE} absent`])
  return S.deSonde(await sonde('exports', racine))
}
function motifsDuType(src) {
  const m = /export\s+type\s+Motif\s*=([\s\S]*?)(?:\n\s*\n|\n(?=export\s)|;)/.exec(src)
  return m ? [...m[1].matchAll(/['"]([a-z_]+)['"]/g)].map((x) => x[1]) : null
}
function cronsDe(src) {
  const m = /export\s+const\s+CRONS_ATTENDUS[^=]*=\s*\[([\s\S]*?)\n\]/.exec(src)
  return m ? [...m[1].matchAll(/\{\s*nom:\s*['"]([\w-]+)['"]\s*,\s*maxHeures:\s*(\d+)\s*\}/g)].map((x) => ({ nom: x[1], maxHeures: Number(x[2]) })) : []
}
async function jugerAlertes(racine) {
  const n = nonJuge(racine)
  if (n) return n
  const e = []
  const h = C.aHead(ALERTES), t = C.lire(racine, ALERTES)
  if (h === null || t === null) return res([`${ALERTES} introuvable (HEAD ou racine)`])
  const src = C.sansCommentairesTs(t)
  const motifs = motifsDuType(src)
  if (!motifs) e.push('type Motif introuvable')
  else {
    for (const mo of NOUVEAUX_MOTIFS) if (!motifs.includes(mo)) e.push(`type Motif sans ${mo}`)
    for (const mo of motifsDuType(C.sansCommentairesTs(h)) ?? []) if (!motifs.includes(mo)) e.push(`type Motif : ${mo} (de HEAD) a disparu`)
  }
  for (const mo of MOTIFS_RETIRES) if (t.includes(mo)) e.push(`${ALERTES} cite ${mo}`)
  const a = S.corpsDeFonctions(h, CORPS_INCHANGES), b = S.corpsDeFonctions(t, CORPS_INCHANGES)
  for (const f of CORPS_INCHANGES) { if (a[f] === null) continue; if (b[f] !== a[f]) e.push(`le corps de ${f} diffère de HEAD (commentaires ôtés)`) }
  const x = await sonde('alertes', racine, { cronsHead: cronsDe(C.sansCommentairesTs(h)) })
  const r = S.deSonde(x)
  return res([...e, ...r.echecs], `type Motif et corps de ${CORPS_INCHANGES.length} fonctions identiques à HEAD ; ${r.resume}`)
}
const NOMS_CRON = /const\s+NOMS_CRON[^=]*=\s*\{([^}]*)\}/
const entrees = (t) => { const m = NOMS_CRON.exec(t); return m ? Object.fromEntries([...m[1].matchAll(/(?:['"]([\w-]+)['"]|([\w]+))\s*:\s*['"]([^'"]*)['"]/g)].map((x) => [x[1] ?? x[2], x[3]])) : null }
function jugerAfaire(racine) {
  const n = nonJuge(racine)
  if (n) return n
  const e = []
  const h = C.aHead(AFAIRE), t = C.lire(racine, AFAIRE)
  if (h === null || t === null) return res([`${AFAIRE} introuvable (HEAD ou racine)`])
  const { ajoutes, retires } = C.diffLignes(h, t)
  if (retires.length !== 1 || ajoutes.length !== 1 || !NOMS_CRON.test(retires[0]) || !NOMS_CRON.test(ajoutes[0])) e.push(`${AFAIRE} : le diff avec HEAD (${retires.length} retirée(s), ${ajoutes.length} ajoutée(s)) ne se limite pas à la ligne NOMS_CRON`)
  const a = entrees(h), b = entrees(t)
  if (!a || !b) e.push('NOMS_CRON introuvable')
  else {
    const plus = Object.keys(b).filter((k) => !(k in a)), change = Object.keys(a).filter((k) => b[k] !== a[k])
    if (plus.length !== 1 || plus[0] !== 'tic' || b.tic !== 'Horloge des agents') e.push(`NOMS_CRON : ajouté ${plus.map((k) => `${k}: '${b[k]}'`).join(', ') || 'rien'} ; tic: 'Horloge des agents' seul attendu`)
    if (change.length) e.push(`NOMS_CRON : entrée(s) de HEAD changée(s) : ${change.join(', ')}`)
  }
  return res(e, `${AFAIRE} : seule l'entrée tic: 'Horloge des agents' ajoutée à NOMS_CRON`)
}
function jugerLecture(racine) {
  const n = nonJuge(racine)
  if (n) return n
  const t = C.lire(racine, MODULE)
  const src = C.sansCommentairesTs(t)
  const e = []
  if (/@anthropic-ai/.test(src)) e.push('@anthropic-ai cité')
  if (/lib\/agents\/llm/.test(src)) e.push('lib/agents/llm cité')
  if (/\.from\(\s*['"`]sites_commandes['"`]\s*\)[\s\S]{0,200}?\.(update|insert|upsert|delete)\s*\(/.test(src)) e.push('écriture dans sites_commandes')
  if (/from\s+['"]@\/lib\/stripe['"]|new\s+Stripe\s*\(|stripe\.\w+\.(create|update|del)\s*\(/i.test(src)) e.push('écriture dans Stripe (lib/stripe importé ou appel qui écrit)')
  if (/\bfetch\s*\(/.test(src)) e.push('un fetch : le veilleur lit la base par supabaseAdmin et n\'appelle aucun autre hôte')
  for (const m of src.matchAll(/\.rpc\(\s*['"`](acq_[a-z0-9_]+)['"`]/g)) if (!ACQ_LECTURES.includes(m[1])) e.push(`rpc('${m[1]}') : seules les lectures ${ACQ_LECTURES.join(' et ')} sont permises`)
  for (const m of src.matchAll(/['"`](acq_[a-z0-9_]+)['"`]/g)) if (!ACQ_LECTURES.includes(m[1])) e.push(`« ${m[1]} » cité : une fonction de l'envoi hors des lectures permises`)
  for (const imp of C.importsDe(src)) if (!imp.dynamique && !imp.typeSeul && /lib\/agents\/acquisition\//.test(imp.spec)) e.push(`import statique de ${imp.spec} (dynamique et protégé attendu)`)
  return res([...new Set(e)], `${MODULE} : ni @anthropic-ai, ni lib/agents/llm, ni écriture de sites_commandes ou de Stripe, aucun fetch ; rpc acq_ : ${ACQ_LECTURES.join(', ')} seulement ; lib/agents/acquisition/ chargé dynamiquement`)
}
async function jugerCredit(racine) {
  const n = nonJuge(racine)
  if (n) return n
  const e = []
  for (const rel of [MODULE, ALERTES]) { const t = C.lire(racine, rel) ?? ''; for (const mo of ['credit_bas', 'cle_agents_vide']) if (t.includes(mo)) e.push(`${rel} cite ${mo}`) }
  if ((C.lire(racine, MODULE) ?? '').includes('AGENTS_PLAFOND_MOIS')) e.push(`${MODULE} lit AGENTS_PLAFOND_MOIS`)
  const r = S.deSonde(await sonde('couts', racine))
  return res([...e, ...r.echecs], `ni credit_bas, ni cle_agents_vide, ni AGENTS_PLAFOND_MOIS ; ${r.resume}`)
}
async function jugerJauges(racine) {
  const n = nonJuge(racine)
  if (n) return n
  const e = []
  if (!/calculerJauges/.test(C.sansCommentairesTs(C.lire(racine, MODULE)))) e.push(`${MODULE} ne lit pas l'état des jauges dans calculerJauges`)
  const r = S.deSonde(await sonde('jauges', racine))
  return res([...e, ...r.echecs], r.resume)
}
async function jugerVa19(racine) {
  const n = nonJuge(racine)
  if (n) return n
  const e = []
  const t = C.sansCommentairesTs(C.lire(racine, MODULE))
  for (const [re, quoi] of [[/SQL\s*Editor/i, 'le SQL Editor'], [/s[ée]quenceur/i, 'un séquenceur'], [/bo[iî]tes?\b/i, 'une boîte'], [/domaines?\s+de\s+prospection/i, 'un domaine de prospection']]) if (re.test(t)) e.push(`${MODULE} cite ${quoi}`)
  const crons = cronsDe(C.sansCommentairesTs(C.lire(racine, ALERTES) ?? ''))
  for (const nom of ['crieur', 'acq-rge']) { const c = crons.find((x) => x.nom === nom); if (!c || c.maxHeures !== 26) e.push(`CRONS_ATTENDUS : ${nom} à ${c ? `${c.maxHeures} h` : '(absent)'}, 26 h attendu`) }
  const r = S.deSonde(await sonde('envoi', racine, { critere: 'VA-19' }))
  return res([...e, ...r.echecs], `${r.resume} ; aucun geste vers le SQL Editor, un séquenceur, une boîte ni un domaine de prospection ; crieur et acq-rge à 26 h`)
}
async function jugerTypecheck(racine) {
  const n = nonJuge(racine)
  if (n) return n
  return C.typecheck(JUGE, racine, [MODULE, ALERTES])
}

// ── Le témoin : lib/alertes.ts et la route « À faire » dérivées de HEAD ─────────────────────────────────────────────
const EXEMPLES = {
  agent_muet: ['redacteur est muet depuis 130 min', 'Période de 60 min. À faire : vérifier que redacteur tourne.'],
  panne_agent: ['facteur ne bat plus depuis 3 h', 'Période de 15 min. À faire : lire ses journaux et le relancer depuis la station.'],
  disjoncteur: ['Le disjoncteur de facteur est ouvert', 'Trois échecs de suite. À faire : lire la cause, puis le reprendre depuis la station.'],
  jeton_externe: ['Le jeton Meta expire dans 6 jours', 'À faire : générer un nouveau jeton et le coller dans presti-secrets/meta-bibliotheque-pubs.txt ; Claude Code le pose.'],
  stockage: ['La base occupe 700 Mo sur 1 024', 'À faire : purger les événements anciens.'],
  argent_bloque: ['File de l’argent : 1 message abandonné', 'À faire : node scripts/file-argent-qa.mjs --reel.'],
  coupe_circuit: ['Coupe-circuit : 151 € sans recette', 'Deux agents en pause. À faire : trancher la décision dans la station.'],
  usine_injoignable: ['L’usine ne bat plus depuis 61 min', 'À faire : node scripts/usine.mjs etat depuis le poste.'],
  jeton_meta_expire: ['Le jeton Meta a expiré', 'À faire : coller le nouveau jeton dans presti-secrets/meta-bibliotheque-pubs.txt ; Claude Code le pose.'],
  canal_arrete: ['Formulaire arrêté : 1 avis d’abus', 'Arrêt de 48 h. À faire : lire la salle des envois.'],
  gmail_bloque: ['Le Gmail de prospection refuse', 'À faire : vérifier le mot de passe d’application dans Vercel.'],
  technologie_en_pause: ['2 technologies de formulaire en pause', 'À faire : les reprendre depuis la station quand la cause est comprise.'],
  modele_suspendu: ['2 modèles de message suspendus', 'À faire : en écrire un nouveau et l’approuver.'],
  notice_perimee: ['La notice n’a pas été revérifiée depuis 8 jours', 'Le formulaire est arrêté. À faire : Claude Code la republie.'],
  bilan: ['Jour du bilan : arrêt du froid', 'À faire : choisir un autre segment ou une autre offre.'],
  vercel_pro: ['Premier site vendu : passer Vercel en Pro', 'C’est la seule dépense décidée.'],
  meta_erreur: ['Meta a refusé : réponses privées coupées 24 h', 'À faire : attendre la fin de la coupure.'],
  changer_message: ['300 envois sans réponse', 'À faire : écrire un nouveau message et l’approuver.'],
  quota_haut: ['8 sur 10 ce mois-ci chez formulaires du jour', 'À faire : surveiller la jauge.'],
  jauge_pleine: ['Jauge pleine : 10 sur 10', 'À faire : attendre la remise à zéro.'],
  non_mesure: ['La file de l’argent n’a pas pu être lue', 'À faire : relancer le passage.'],
}
export function alertesDerive(h) {
  let t = h
  const rep = (a, b, quoi) => { if (typeof a === 'string' ? !t.includes(a) : !a.test(t)) throw new Error(`lib/alertes.ts de HEAD : ${quoi} introuvable`); t = t.replace(a, b) }
  const liste = NOUVEAUX_MOTIFS.map((m) => `'${m}'`)
  rep(/(export type Motif = [^\n]*'digest')/, `$1\n  | ${liste.join(' | ')}`, 'type Motif')
  rep(/(export const MOTIFS: Motif\[\] = \[[^\]]*'digest')\]/, `$1,\n  ${liste.join(', ')}]`, 'MOTIFS')
  rep(/(\n {4}case 'digest': return [^\n]*\n)/, `$1${NOUVEAUX_MOTIFS.map((m) => `    case '${m}': return [{ motif, a: 'entreprise', cle: 's', sujet: ${JSON.stringify(EXEMPLES[m][0])}, corps: ${JSON.stringify(EXEMPLES[m][1])} }]\n`).join('')}`, 'simulation()')
  rep('/solde_ia|paiement|securite|cron_muet/.test(al.motif)', `/solde_ia|paiement|securite|cron_muet|${CRITIQUES.join('|')}/.test(al.motif)`, 'la gravité de persisterAlerte')
  rep(/(export const CRONS_ATTENDUS[^\n]*\n(?:[^\n]*\n)*?)\]/, `$1${Object.entries(CRONS_NOUVEAUX).map(([nom, h]) => `  { nom: '${nom}', maxHeures: ${h} },`).join('\n')}\n]`, 'CRONS_ATTENDUS')
  rep('lundi ? digest() : Promise.resolve([])', 'lundi && !(await passageTicRecent()) ? digest() : Promise.resolve([])', 'le digest du lundi dans ronde()')
  rep(/(\n\/\*\*\n \* La ronde\.)/, `\n/** Un passage « tic » de moins de 26 h : l'horloge de Supabase tourne, le digest du veilleur remplace celui du lundi. */\nasync function passageTicRecent(): Promise<boolean> {\n  const { data, error } = await supabaseAdmin.from('passages_cron').select('nom, dernier_passage').eq('nom', 'tic')\n  if (error || !data?.length) return false\n  return data.some((p) => Date.now() - new Date(p.dernier_passage).getTime() < 26 * 3_600_000)\n}\n$1`, 'la ronde')
  rep(/(\n\/\*\* Exemples réalistes de chaque motif)/, `\n/** Garde une alerte adressée à l'entreprise pour « À faire », SANS l'envoyer (le veilleur, hors urgences). */\nexport async function garderAlerte(al: Alerte): Promise<void> {\n  await persisterAlerte(al)\n}\n$1`, 'garderAlerte')
  return t
}
export function afaireDerive(h) {
  const m = NOMS_CRON.exec(h)
  if (!m) throw new Error('NOMS_CRON introuvable à HEAD')
  if (/\btic\s*:/.test(m[1])) return h
  return h.replace(NOMS_CRON, (x) => x.replace(/\s*\}$/, ", tic: 'Horloge des agents' }"))
}

// ── Les sabotages du témoin : chacun doit rendre son critère ROUGE ────────────────────────────────────────────────────
const V = MODULE
export const SABOTAGES = [
  { id: 'VA-1', nom: 'gmail_bloque hors des urgents', fichier: V, chercher: "'canal_arrete', 'gmail_bloque']", remplacer: "'canal_arrete']" },
  { id: 'VA-1', nom: 'creneauDigest non exportée', fichier: V, chercher: 'export function creneauDigest', remplacer: 'function creneauDigest' },
  { id: 'VA-2', nom: 'muet à 3,2 périodes', fichier: V, chercher: 'if (!a.periode_minutes || x <= seuil) continue', remplacer: 'if (!a.periode_minutes || x <= seuil * 1.6) continue' },
  { id: 'VA-2', nom: 'agent en pause surveillé', fichier: V, chercher: "!a.battement_le || a.en_pause || pause.active", remplacer: '!a.battement_le || pause.active' },
  { id: 'VA-2', nom: 'panne sans envoi', fichier: V, chercher: "export const URGENTS = ['paiement', 'appel', 'panne_agent',", remplacer: "export const URGENTS = ['paiement', 'appel'," },
  { id: 'VA-2', nom: 'jeton à J-8 signalé', fichier: V, chercher: 'reste <= 7 * 24 * HEURE', remplacer: 'reste <= 9 * 24 * HEURE' },
  { id: 'VA-3', nom: 'non urgents envoyés', fichier: V, chercher: '  for (const l of triees.filter((x) => !x.urgent)) await garderAlerte(alerte(l))', remplacer: '  await envoyerAlertes(triees.filter((x) => !x.urgent).map(alerte))' },
  { id: 'VA-3', nom: 'notification non comptée', fichier: V, chercher: "      await ops_evenement_ajouter({ p_agent: 'a0', p_type: 'notification'", remplacer: "      if (Math.random() > 2) await ops_evenement_ajouter({ p_agent: 'a0', p_type: 'notification'" },
  { id: 'VA-4', nom: 'soir dès 18 h', fichier: V, chercher: 'if (m >= 18 * 60 + 30 && m < 20 * 60)', remplacer: 'if (m >= 18 * 60 && m < 20 * 60)' },
  { id: 'VA-4', nom: 'heure de Paris lue en UTC', fichier: V, chercher: "new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d)", remplacer: "new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d)" },
  { id: 'VA-4', nom: 'lien de décision bavard', fichier: V, chercher: '/controle?onglet=pilotage&decision=${d.id}', remplacer: '/controle?onglet=pilotage&decision=${d.id}&portee=${d.portee}' },
  { id: 'VA-4', nom: 'section des coûts renommée', fichier: V, chercher: 'L.push(\'\', `Coûts du mois :', remplacer: 'L.push(\'\', `Dépenses :' },
  { id: 'VA-5', nom: 'systeme mis en pause', fichier: V, chercher: "const epargne = (a: Agent) => ['a0', 'systeme'].includes(a.nom)", remplacer: "const epargne = (a: Agent) => ['a0'].includes(a.nom)" },
  { id: 'VA-5', nom: 'support non épargné', fichier: V, chercher: "const CAPACITES_EPARGNEES = ['livraison', 'support', 'surveillance']", remplacer: "const CAPACITES_EPARGNEES = ['livraison', 'surveillance']" },
  { id: 'VA-5', nom: 'coupe à 100 €', fichier: V, chercher: 'if (couts > 150) {', remplacer: 'if (couts > 100) {' },
  { id: 'VA-6', nom: 'passage non noté', fichier: V, chercher: "  await ops_evenement_ajouter({ p_agent: 'a0', p_type: 'passage', p_objet: null, p_resume: 'passage du veilleur', p_tache: null })\n", remplacer: '' },
  { id: 'VA-6', nom: 'battement oublié', fichier: V, chercher: "  await ops_battement({ p_nom: 'a0' })\n", remplacer: '' },
  { id: 'VA-7', nom: 'tic à 2 h', fichier: ALERTES, chercher: "{ nom: 'tic', maxHeures: 1 }", remplacer: "{ nom: 'tic', maxHeures: 2 }" },
  { id: 'VA-7', nom: 'digest du lundi sans condition', fichier: ALERTES, chercher: 'lundi && !(await passageTicRecent()) ? digest()', remplacer: 'lundi ? digest()' },
  { id: 'VA-7', nom: 'verrou de envoyer relâché', fichier: ALERTES, chercher: 'consommerLimite(cle, 1, 86_400)', remplacer: 'consommerLimite(cle, 2, 86_400)' },
  { id: 'VA-7', nom: 'simulation du bilan oubliée', fichier: ALERTES, chercher: "    case 'bilan': return", remplacer: "    // case 'bilan': return" },
  { id: 'VA-7', nom: 'garderAlerte qui envoie', fichier: ALERTES, chercher: '  await persisterAlerte(al)\n}', remplacer: '  await persisterAlerte(al)\n  await notifierEntreprise(al.sujet, al.corps)\n}' },
  { id: 'VA-8', nom: 'autre entrée ajoutée', fichier: AFAIRE, chercher: "tic: 'Horloge des agents' }", remplacer: "tic: 'Horloge des agents', veilleur: 'Veilleur' }" },
  { id: 'VA-8', nom: 'libellé changé', fichier: AFAIRE, chercher: "relances: 'Relances de devis'", remplacer: "relances: 'Relances'" },
  { id: 'VA-9', nom: 'palier réévalué', fichier: V, chercher: "  const rj = await lire('acq_jauges')", remplacer: "  const rj = await lire('acq_jauges')\n  if (rj.absente) await supabaseAdmin.rpc('acq_palier_evaluer')" },
  { id: 'VA-9', nom: 'fetch vers Meta', fichier: V, chercher: "  const rj = await lire('acq_jauges')", remplacer: "  const rj = await lire('acq_jauges')\n  if (rj.absente && Math.random() > 2) await fetch('https://graph.facebook.com/v19.0/me')" },
  { id: 'VA-11', nom: 'usine muette pendant la pause', fichier: V, chercher: '  if (usine && usineMuette) {', remplacer: '  if (usine && usineMuette && !pause.active) {' },
  { id: 'VA-11', nom: 'agents de l\'usine en double', fichier: V, chercher: '    if (usineMuette && AGENTS_DE_L_USINE.includes(a.nom)) continue\n', remplacer: '' },
  { id: 'VA-11', nom: 'usine absente signalée', fichier: V, chercher: "  const usineMuette = !!usine && muet(usine)", remplacer: "  const usineMuette = !usine || muet(usine)" },
  { id: 'VA-12', nom: 'carte des coûts', fichier: V, chercher: '  if (couts > 150) {', remplacer: "  if (couts > 20 && couts <= 150) ajouter('non_mesure', 'couts', couts, `Coûts du mois : ${couts} €.`, 'vérifier les coûts')\n  if (couts > 150) {" },
  { id: 'VA-12', nom: 'crédit de clé', fichier: V, chercher: 'const MIN = 60_000', remplacer: "const MIN = 60_000\nexport const MOTIF_CREDIT = 'credit_bas'" },
  { id: 'VA-13', nom: 'absente = non mesurée', fichier: V, chercher: 'if (!rd.ok && !rd.absente)', remplacer: 'if (!rd.ok)' },
  { id: 'VA-13', nom: 'une ligne par technologie', fichier: V, chercher: "    if (tech.length) {\n      const c = await carteDe({ type: 'disjoncteur_technologie', nombre: tech.length })", remplacer: "    for (const x of tech.slice(1)) ajouter('technologie_en_pause', x.technologie, 1, `${x.technologie} en pause.`, 'reprendre la technologie depuis la station')\n    if (tech.length) {\n      const c = await carteDe({ type: 'disjoncteur_technologie', nombre: tech.length })" },
  { id: 'VA-13', nom: 'arrêt jusqu\'à Benj ignoré', fichier: V, chercher: "const futur = (iso: string | null | undefined, t: number) => iso === 'infinity' || (!!iso && Date.parse(iso) > t)", remplacer: 'const futur = (iso: string | null | undefined, t: number) => !!iso && Date.parse(iso) > t' },
  { id: 'VA-13', nom: 'notice périmée à 5 jours', fichier: V, chercher: 't - Date.parse(envoi.notice_verifiee_le) > 7 * 24 * HEURE', remplacer: 't - Date.parse(envoi.notice_verifiee_le) > 5 * 24 * HEURE' },
  { id: 'VA-14', nom: 'coupure Meta passée signalée', fichier: V, chercher: 'if (futur(envoi.meta_coupe_jusqua, t))', remplacer: 'if (envoi.meta_coupe_jusqua)' },
  { id: 'VA-15', nom: 'jaunes d\'abord', fichier: V, chercher: 'const rang: Record<Couleur, number> = { rouge: 0, orange: 1, jaune: 2, bleu: 3 }', remplacer: 'const rang: Record<Couleur, number> = { rouge: 2, orange: 1, jaune: 0, bleu: 3 }' },
  { id: 'VA-15', nom: 'neuf lignes', fichier: V, chercher: 'triees.slice(0, 7)', remplacer: 'triees.slice(0, 9)' },
  { id: 'VA-15', nom: 'stockage hors de COULEURS', fichier: V, chercher: "const JAUNES = ['agent_muet', 'disjoncteur', 'jeton_externe', 'stockage',", remplacer: "const JAUNES = ['agent_muet', 'disjoncteur', 'jeton_externe'," },
  { id: 'VA-16', nom: 'question dans le digest', fichier: V, chercher: "L.push(`- ${d.portee ?? 'décision'}", remplacer: "L.push(`- ${d.question ?? ''} ${d.portee ?? 'décision'}" },
  { id: 'VA-16', nom: 'technologie recopiée', fichier: V, chercher: "tech.map((x) => `${x.technologie} (${x.pause_motif ?? '3 échecs de soumission d’affilée'})`)", remplacer: 'tech.map((x) => JSON.stringify(x))' },
  { id: 'VA-17', nom: 'import statique des disjoncteurs', fichier: V, chercher: "import { pauseGenerale } from '@/lib/agents/pause'", remplacer: "import { pauseGenerale } from '@/lib/agents/pause'\nimport { carteAttention } from '@/lib/agents/acquisition/disjoncteurs'\nexport const _carte = carteAttention" },
  { id: 'VA-17', nom: 'absence qui lève', fichier: V, chercher: "    return typeof m.carteAttention === 'function' ? m.carteAttention(evenement) : null\n  } catch { return null }", remplacer: "    return typeof m.carteAttention === 'function' ? m.carteAttention(evenement) : null\n  } catch (e) { throw e }" },
  { id: 'VA-18', nom: 'seuil recalculé', fichier: V, chercher: "      else if (j.etat === 'attention')", remplacer: "      else if ((j.utilise ?? 0) / (j.plafond || 1) >= 0.75)" },
  { id: 'VA-18', nom: 'jauge pleine envoyée', fichier: V, chercher: "ajouter('jauge_pleine', String(j.id ?? nom), j.utilise ?? 0,", remplacer: "ajouter('jauge_pleine', String(j.id ?? nom), j.utilise ?? 0, 'x', 'y', true) || ajouter('jauge_pleine', String(j.id ?? nom), j.utilise ?? 0," },
  { id: 'VA-19', nom: 'bilan la veille', fichier: V, chercher: 'if (envoi.bilan?.le === jour) {', remplacer: 'if (envoi.bilan?.le) {' },
  { id: 'VA-19', nom: 'vercel sans décision', fichier: V, chercher: "    await ops_decision_creer({ p_agent: 'a0', p_question: 'Le premier site est vendu", remplacer: "    if (Math.random() > 2) await ops_decision_creer({ p_agent: 'a0', p_question: 'Le premier site est vendu" },
  { id: 'VA-19', nom: 'jeton sans le chemin du coffre', fichier: V, chercher: "const JETON_META = 'presti-secrets/meta-bibliotheque-pubs.txt'", remplacer: "const JETON_META = 'le coffre'" },
  { id: 'VA-19', nom: 'geste vers le SQL Editor', fichier: V, chercher: "'lire la salle des envois ; rouvrir le canal depuis la station quand la cause est réglée'", remplacer: "'lire la salle des envois ; rouvrir le canal depuis le SQL Editor'" },
]

export const CRITERES = {
  'VA-1': { juger: jugerExports },
  'VA-2': { juger: parSonde('lignes') },
  'VA-3': { juger: parSonde('journee') },
  'VA-4': { juger: parSonde('creneaux') },
  'VA-5': { juger: parSonde('coupe') },
  'VA-6': { juger: parSonde('passages') },
  'VA-7': { juger: jugerAlertes },
  'VA-8': { juger: async (r) => jugerAfaire(r) },
  'VA-9': { juger: async (r) => jugerLecture(r) },
  'VA-10': { juger: jugerTypecheck, temoin: async (r) => C.eprouverLectureTypecheck(r, [MODULE, ALERTES]) },
  'VA-11': { juger: parSonde('usine') },
  'VA-12': { juger: jugerCredit },
  'VA-13': { juger: parSonde('envoi', { critere: 'VA-13' }) },
  'VA-14': { juger: parSonde('envoi', { critere: 'VA-14' }) },
  'VA-15': { juger: parSonde('ordre') },
  'VA-16': { juger: parSonde('prospects') },
  'VA-17': { juger: parSonde('absents') },
  'VA-18': { juger: jugerJauges },
  'VA-19': { juger: jugerVa19 },
}

async function principal() {
  const o = C.lireOptions(process.argv.slice(2), JUGE)
  await S.derouler({
    juge: JUGE, ids: IDS, criteres: CRITERES, sabotages: SABOTAGES, o,
    temoin: { lot03: ['lib/agents/bus.ts'], propres: [MODULE], derives: [[ALERTES, alertesDerive], [AFAIRE, afaireDerive]] },
    prealables: [C.autoControleFauxPostgrest],
    notes: [`horloge simulée dans chaque sonde (figée à l'instant de chaque cas) ; ${RACCOURCI_DIT}`, 'lib/agents/acquisition/disjoncteurs (026-063) tenu pour absent : le veilleur est jugé sur ses propres titres et gestes'],
  })
}
if (S.estLance(FICHIER)) await principal()
