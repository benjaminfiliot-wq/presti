#!/usr/bin/env node
// JUGE du provisionnement automatique (tâche 036-021, décision O3 voie a de Benj, 03/11). Hors ligne, à blanc, gratuit.
//
// Il ne croit pas le générateur : il fait générer le workflow `presti-provisionnement`, EXTRAIT le code de ses nœuds Code et le REJOUE
// (module vm) contre un FAUX n8n (qui refuse, comme l'API, les propriétés en trop) et une FAUSSE base. Ses attentes sont écrites ici.
// Comptes fictifs : uuid tirés au hasard, secrets tirés au hasard à chaque passage ; aucun réseau, aucun fichier hors de la sortie du juge.
//
//   P1  à blanc (défaut) : le plan se journalise, n8n ne reçoit AUCUNE écriture ;
//   P2  « Connecter » : l'identifiant OAuth2 est créé UNE fois avec le bon secret ; les copies `client-<slug>-*` sont créées inactives,
//       une par gabarit de l'offre, liées à CET identifiant ;
//   P3  rejeu : 5 passages de plus ne créent ni deuxième identifiant ni deuxième copie ; un crash entre réservation et appel ne double rien ;
//   P4  deux clients : noms, identifiants et copies sans rien de commun ;
//   P5  Studio : aucun nœud d'envoi actif dans la copie envoyée à n8n ; Signature garde les siens ;
//   P6  activation : jamais en blanc, jamais hors du compte de test nommé, jamais avec un emplacement restant ;
//   P7  retrait : copies désactivées, identifiant supprimé de n8n, rien ne reste, rejeu muet ;
//   P8  expiration : copies muettes, UNE alerte, l'identifiant gardé ; le renouvellement remplace l'identifiant et relie les copies ;
//   P9  secrets : aucun secret (jeton, secret client, clé) dans l'état, le journal, le plan ni les sorties ; export sans identifiant réel ;
//   P10 hors offre : essai, Essentiel, Entreprise sur mesure : rien n'est créé ;
//   P11 le workflow exporté : inactif, à blanc par défaut, aucun appel à n8n avant la porte « Mode réel ? », identique à la génération.
// Puis les MUTANTS : un secret écrit en clair, deux clients mélangés, un rejeu qui double la copie, une copie Studio qui envoie, un
// retrait qui laisse l'identifiant, et d'autres encore, doivent chacun faire rougir le juge.
//
// Usage : node scripts/provisionnement-qa.mjs   (code 0 = vert)
import crypto from 'node:crypto'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const RACINE = process.cwd()
const D = await import(pathToFileURL(path.join(RACINE, 'scripts/deployer-client-n8n.mjs')).href)
const t0 = Date.now()
const uuid = () => crypto.randomUUID()
const plat = (x) => (x.workflow && x.workflow.nodes ? x.workflow : x)

// ─── Les listes du juge (indépendantes du générateur) ────────────────────────────────────────────────────────────────
const ENVOIS = new Set(['emailSend', 'gmail', 'microsoftOutlook', 'sendInBlue', 'slack', 'telegram', 'twilio', 'whatsApp', 'microsoftTeams', 'googleChat',
  'mailchimp', 'activeCampaign', 'lemlist', 'linkedIn', 'youTube', 'twitter'].map((t) => `n8n-nodes-base.${t}`))
const LECTURE = /^(get|getAll|getMany|search|list|lookup|download|read|availability|getAvailability|getFreeBusy|getProfile|getStatus)$/i
const envoie = (n) => {
  const op = n.parameters?.operation
  if (n.type === 'n8n-nodes-base.facebookGraphApi') return String(n.parameters?.httpRequestMethod ?? 'GET').toUpperCase() !== 'GET'
  if (ENVOIS.has(n.type)) return !(typeof op === 'string' && LECTURE.test(op)) && n.parameters?.resource !== 'draft'
  if (n.type === 'n8n-nodes-base.httpRequest') {
    let h = ''
    try { h = new URL(String(n.parameters?.url ?? '')).host } catch { /* expression */ }
    return String(n.parameters?.method ?? 'GET').toUpperCase() !== 'GET' && !h.endsWith('.supabase.co')
  }
  return false
}
const TYPE_ATTENDU = { gmail: ['gmailOAuth2'], google_agenda: ['googleCalendarOAuth2Api'], google_drive: ['googleDriveOAuth2Api', 'googleSheetsOAuth2Api'] }

// ─── Le monde : faux n8n, fausse base, exécuteur de nœuds Code ───────────────────────────────────────────────────────
function chargerGabarits() {
  return D.lireGabarits('studio').map((g) => {
    const w = plat(g.brut)
    return { id: `g-${w.name}`, name: w.name, active: false, nodes: w.nodes, connections: w.connections, settings: w.settings ?? {}, registre: g.registre }
  })
}
class FauxN8n {
  constructor(gabarits) { this.wf = gabarits.map((g) => ({ ...g })); this.cred = new Map(); this.appels = []; this.n = 0 }
  ecritures() { return this.appels.filter((a) => a.method !== 'GET') }
  request({ method, url, body }) {
    const chemin = url.replace(/^https?:\/\/[^/]+\/api\/v1/, '')
    this.appels.push({ method, chemin, body: body ? JSON.parse(JSON.stringify(body)) : null })
    const refus = (m) => ({ error: m, statusCode: 400 })
    const CLES_WF = ['name', 'nodes', 'connections', 'settings']
    if (method === 'POST' && chemin === '/credentials') {
      if (!body || !body.name || !body.type || !body.data || Object.keys(body).some((k) => !['name', 'type', 'data'].includes(k))) return refus('credentials : corps invalide')
      const id = `c${++this.n}`
      this.cred.set(id, { id, ...body })
      return { id, name: body.name, type: body.type }
    }
    let m = chemin.match(/^\/credentials\/([^/]+)$/)
    if (method === 'DELETE' && m) { if (!this.cred.delete(m[1])) return { error: 'introuvable', statusCode: 404 }; return { id: m[1] } }
    if (method === 'POST' && chemin === '/workflows') {
      if (Object.keys(body ?? {}).some((k) => !CLES_WF.includes(k))) return refus('workflows : propriété en trop')
      const w = { id: `w${++this.n}`, active: false, ...body }
      this.wf.push(w)
      return { id: w.id, name: w.name }
    }
    m = chemin.match(/^\/workflows\/([^/]+)$/)
    if (method === 'PUT' && m) {
      if (Object.keys(body ?? {}).some((k) => !CLES_WF.includes(k))) return refus('workflows : propriété en trop')
      const w = this.wf.find((x) => x.id === m[1]); if (!w) return { error: 'introuvable', statusCode: 404 }
      Object.assign(w, body); return { id: w.id }
    }
    m = chemin.match(/^\/workflows\/([^/]+)\/(activate|deactivate)$/)
    if (method === 'POST' && m) { const w = this.wf.find((x) => x.id === m[1]); if (!w) return { error: 'introuvable', statusCode: 404 }; w.active = m[2] === 'activate'; return { id: w.id } }
    return refus(`appel inconnu ${method} ${chemin}`)
  }
}

function monde(gabarits) {
  const env = { N8N_API_URL: 'http://n8n.test', BOITE_CLE_N8N: crypto.randomBytes(32).toString('base64'), GOOGLE_OAUTH_CLIENT_ID: `id-${crypto.randomBytes(6).toString('hex')}`,
    GOOGLE_OAUTH_CLIENT_SECRET: `cs-${crypto.randomBytes(12).toString('hex')}` }
  return { n8n: new FauxN8n(gabarits), env, connexions: [], artisans: [], pilote: [], etats: [], journal: [], alertes: [], secrets: [], sorties: [] }
}
/** Ajoute un artisan et ses connexions actives ; rend { artisan, connexions }. Les secrets sont chiffrés comme le fait lib/connexions/chiffrement.ts. */
function brancher(m, { plan = 'studio', fournisseurs = ['gmail'], types = null } = {}) {
  const artisan = uuid()
  m.artisans.push({ id: artisan, plan })
  if (types) m.pilote.push({ artisan_id: artisan, actif: true, types: Object.fromEntries(types.map((t) => [t, true])) })
  const out = []
  for (const f of fournisseurs) {
    const id = uuid()
    const secret = { refresh_token: `rt-${crypto.randomBytes(18).toString('hex')}`, access_token: `at-${crypto.randomBytes(18).toString('hex')}`, access_expire: Date.now() + 3_600_000 }
    m.secrets.push(secret.refresh_token, secret.access_token)
    const iv = crypto.randomBytes(12)
    const c = crypto.createCipheriv('aes-256-gcm', Buffer.from(m.env.BOITE_CLE_N8N, 'base64'), iv)
    c.setAAD(Buffer.from(`connexions:${id}:n8n`, 'utf8'))
    const data = Buffer.concat([c.update(JSON.stringify(secret), 'utf8'), c.final()])
    const ligne = { id, artisan_id: artisan, fournisseur: f, etat: 'active', secret_n8n: ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), data.toString('base64url')].join('.') }
    m.connexions.push(ligne); out.push(ligne)
  }
  return { artisan, connexions: out }
}
const SECRETS_FIXES = (m) => [...m.secrets, m.env.BOITE_CLE_N8N, m.env.GOOGLE_OAUTH_CLIENT_SECRET]

function executer(code, ctx) {
  const dollar = (nom) => ({ first: () => ({ json: ctx.sorties[nom][0] }), all: () => ctx.sorties[nom].map((json) => ({ json })), item: { json: ctx.item?.[nom] } })
  const fn = vm.runInNewContext(`(function ($, $json, $env, $input) {\n${code}\n})`, { require, Buffer, JSON, Math, Date, Object, Array, String, Number, Set, Map, RegExp, Error, URL })
  const sortie = fn(dollar, ctx.json, ctx.env, { all: () => (ctx.entrees ?? []).map((json) => ({ json })) })
  return sortie.map((i) => i.json)
}
const noeud = (wf, nom) => wf.nodes.find((n) => n.name === nom)

/** Un passage complet du workflow, nœud après nœud, dans l'ordre d'n8n (chaque nœud traite tous ses éléments avant le suivant). */
const PRESTI = { supabaseApi: { id: 'presti-sb', name: 'Supabase Presti' }, anthropicApi: { id: 'presti-ia', name: 'IA Presti' } }
function passer(wf, m, { mode = 'a_blanc', test = [], presti = {} } = {}) {
  const code = (nom) => noeud(wf, nom).parameters.jsCode
  const sorties = {}
  sorties['Réglages'] = executer(code('Réglages'), { sorties, env: m.env }).map(() => ({ mode, comptes_de_test: test, identifiants_presti: presti }))
  sorties['Lire les connexions'] = m.connexions.map((c) => ({ ...c }))
  sorties['Lire les comptes'] = m.artisans.map((a) => ({ ...a }))
  sorties['Lire le pilote'] = m.pilote.map((p) => ({ ...p }))
  sorties['Lire l’état'] = m.etats.map((l) => ({ ...l }))
  sorties['Lire les workflows'] = m.n8n.wf.map((w) => JSON.parse(JSON.stringify(w)))
  const actions = executer(code('Planifier'), { sorties, env: m.env })
  const plan = actions.length ? executer(code('Journaliser le plan'), { sorties, env: m.env, entrees: actions }) : []
  for (const j of plan) m.journal.push(j)
  m.sorties.push(JSON.stringify(actions), JSON.stringify(plan))
  const resultat = { actions, ecritures: 0 }
  if (mode !== 'reel') return resultat // la porte « Mode réel ? »
  const preps = actions.map((a) => ({ ...executer(code('Préparer la requête'), { sorties, env: m.env, json: a })[0] }))
  const maj = (r) => { const i = m.etats.findIndex((l) => l.connexion_id === r.connexion_id); const ligne = { ...r }; if (i < 0) m.etats.push(ligne); else m.etats[i] = ligne }
  for (const p of preps) if (p.reservation) maj(p.reservation) // « Réserver »
  const reponses = preps.map((p) => (p.requete ? m.n8n.request(p.requete) : {}))
  preps.forEach((p, i) => {
    const r = executer(code('Résultat'), { sorties, env: m.env, json: reponses[i], item: { 'Préparer la requête': p } })[0]
    m.sorties.push(JSON.stringify(r))
    if (r.etat) maj(r.etat) // « Écrire l’état »
    m.journal.push(r.journal)
    if (r.alerte) m.alertes.push(r.journal)
  })
  return resultat
}
const passes = (wf, m, n, opt) => { for (let i = 0; i < n; i++) passer(wf, m, opt) }

// ─── Les épreuves ────────────────────────────────────────────────────────────────────────────────────────────────────
const copiesDe = (m, slug) => m.n8n.wf.filter((w) => w.name.startsWith(`client-${slug}-`))
const credsDe = (copie) => (copie.nodes ?? []).flatMap((n) => Object.values(n.credentials ?? {}).map((c) => String(c.id)))

function epreuves(wf, gabarits) {
  const echecs = []
  const ko = (r, msg) => echecs.push(`${r} ${msg}`)
  const noms = gabarits.map((g) => g.name).filter((n) => n.startsWith('gabarit-artisan-')).sort()
  if (noms.length < 3) ko('P0', `moins de trois gabarits d’artisan sur le disque (${noms.length})`)
  const attendu = (slug) => noms.map((n) => `client-${slug}-${n.replace('gabarit-artisan-', '')}`).sort()
  const slugDe = (artisan) => `a-${artisan.replace(/-/g, '').slice(0, 12)}` // l'attente du juge, écrite ici
  const tous = ['gmail', 'google_agenda', 'google_drive']

  // P1 — à blanc
  {
    const m = monde(gabarits); const { artisan } = brancher(m, { plan: 'studio' })
    const r = passer(wf, m, { mode: 'a_blanc' })
    if (!r.actions.length) ko('P1', 'le plan à blanc est vide : rien à journaliser')
    if (m.n8n.ecritures().length) ko('P1', `à blanc : n8n a reçu ${m.n8n.ecritures().length} écriture(s)`)
    if (m.etats.length) ko('P1', 'à blanc : l’état a été écrit')
    if (!m.journal.length || !m.journal.every((j) => j.issue === 'prevu' && j.mode === 'a_blanc')) ko('P1', 'à blanc : le journal doit dire « prevu » / a_blanc')
    void artisan
  }

  // P2, P3, P5 — un client Studio qui se connecte, puis les rejeux
  {
    const m = monde(gabarits); const { artisan, connexions } = brancher(m, { plan: 'studio', fournisseurs: ['gmail'] })
    const slug = slugDe(artisan)
    passer(wf, m, { mode: 'reel' })
    const creds = [...m.n8n.cred.values()]
    if (creds.length !== 1) ko('P2', `un « Connecter » doit créer 1 identifiant, il en crée ${creds.length}`)
    else {
      const c = creds[0]
      if (c.type !== 'gmailOAuth2') ko('P2', `type d’identifiant ${c.type} au lieu de gmailOAuth2`)
      if (c.name !== `client-${slug}-gmail-gmailOAuth2`) ko('P2', `nom d’identifiant ${c.name}`)
      const d = c.data ?? {}
      if (d.oauthTokenData?.refresh_token !== m.secrets[0] || d.oauthTokenData?.access_token !== m.secrets[1]) ko('P2', 'l’identifiant ne porte pas les jetons de CET artisan')
      if (d.clientId !== m.env.GOOGLE_OAUTH_CLIENT_ID || d.clientSecret !== m.env.GOOGLE_OAUTH_CLIENT_SECRET) ko('P2', 'l’identifiant ne porte pas l’application OAuth de Presti')
      if (m.n8n.wf.some((w) => w.name.startsWith('client-'))) ko('P2', 'des copies ont été créées avant que l’identifiant existe')
    }
    passer(wf, m, { mode: 'reel' })
    const copies = copiesDe(m, slug)
    if (JSON.stringify(copies.map((x) => x.name).sort()) !== JSON.stringify(attendu(slug))) ko('P2', `copies ${JSON.stringify(copies.map((x) => x.name))} au lieu de ${JSON.stringify(attendu(slug))}`)
    if (copies.some((x) => x.active)) ko('P2', 'une copie est active alors que personne ne l’a demandé')
    const idReel = creds[0]?.id
    for (const x of copies) {
      for (const n of x.nodes) for (const [t, c] of Object.entries(n.credentials ?? {})) {
        if (t === 'gmailOAuth2' && c.id !== idReel) ko('P2', `${x.name} / ${n.name} : gmailOAuth2 non lié à l’identifiant créé (${c.id})`)
        if (t !== 'gmailOAuth2' && !String(c.id).startsWith('EMPLACEMENT_')) ko('P2', `${x.name} / ${n.name} : ${t} lié à autre chose qu’un emplacement`)
        if (String(c.id).startsWith('EMPLACEMENT_') && !n.disabled) ko('P2', `${x.name} / ${n.name} : ${t} sans compte mais le nœud n’est pas désactivé`)
      }
      // P5 Studio : rien n'envoie dans la copie telle qu'envoyée à n8n
      for (const n of x.nodes) if (envoie(n) && !n.disabled) ko('P5', `Studio : ${x.name} / ${n.name} envoie`)
    }
    const avant = { cred: m.n8n.cred.size, wf: m.n8n.wf.length }
    passes(wf, m, 5, { mode: 'reel' })
    if (m.n8n.cred.size !== avant.cred) ko('P3', `rejeu : ${m.n8n.cred.size - avant.cred} identifiant(s) de plus`)
    if (m.n8n.wf.length !== avant.wf) ko('P3', `rejeu : ${m.n8n.wf.length - avant.wf} copie(s) de plus`)
    const dup = copiesDe(m, slug).map((x) => x.name); if (new Set(dup).size !== dup.length) ko('P3', 'rejeu : deux copies de même nom')
    if (m.n8n.ecritures().length !== avant.cred + (avant.wf - gabarits.length)) ko('P3', `rejeu : écritures ${m.n8n.ecritures().length} pour ${avant.cred + avant.wf - gabarits.length} objets créés`)
    void connexions
  }

  // P3 bis — un crash entre la réservation et la réponse : l'identifiant n'est JAMAIS recréé
  {
    const m = monde(gabarits); const { artisan, connexions } = brancher(m, { plan: 'studio' })
    const code = (nom) => noeud(wf, nom).parameters.jsCode
    const sorties = { 'Réglages': [{ mode: 'reel', comptes_de_test: [], identifiants_presti: {} }], 'Lire les connexions': m.connexions, 'Lire les comptes': m.artisans, 'Lire le pilote': [],
      'Lire l’état': [], 'Lire les workflows': m.n8n.wf }
    const [a] = executer(code('Planifier'), { sorties, env: m.env })
    const [p] = executer(code('Préparer la requête'), { sorties, env: m.env, json: a })
    m.etats.push({ ...p.reservation }) // « Réserver » a eu lieu, puis le crash : aucune réponse de n8n
    passes(wf, m, 3, { mode: 'reel' })
    if (m.n8n.cred.size !== 0) ko('P3', 'après un crash entre la réservation et l’appel, l’identifiant a été recréé (doublon possible)')
    if (!m.journal.some((j) => j.cible === 'gmailOAuth2' && /creation_en_cours/.test(j.issue + '') === false && j.action === 'ignorer')) ko('P3', 'le crash doit laisser une trace « ignorer » au journal')
    void artisan; void connexions
  }

  // P4, P6 — deux clients, activation
  {
    const m = monde(gabarits)
    const A = brancher(m, { plan: 'studio', fournisseurs: tous })
    const B = brancher(m, { plan: 'signature', fournisseurs: tous, types: ['relance_devis'] })
    const [sa, sb] = [slugDe(A.artisan), slugDe(B.artisan)]
    passes(wf, m, 6, { mode: 'reel', test: [A.artisan], presti: PRESTI })
    const ca = copiesDe(m, sa), cb = copiesDe(m, sb)
    if (ca.length !== noms.length || cb.length !== noms.length) ko('P4', `copies ${ca.length} / ${cb.length} au lieu de ${noms.length} chacun`)
    const idsA = new Set([...m.n8n.cred.values()].filter((c) => c.name.startsWith(`client-${sa}-`)).map((c) => c.id))
    const idsB = new Set([...m.n8n.cred.values()].filter((c) => c.name.startsWith(`client-${sb}-`)).map((c) => c.id))
    if (idsA.size !== 4 || idsB.size !== 4) ko('P4', `identifiants ${idsA.size} / ${idsB.size} au lieu de 4 chacun (gmail, agenda, drive, sheets)`)
    for (const x of ca) { if (credsDe(x).some((c) => idsB.has(c) || c.includes(sb))) ko('P4', `${x.name} touche un identifiant ou un nom de l’autre client`); if (JSON.stringify(x).includes(sb)) ko('P4', `${x.name} cite l’autre client`) }
    for (const x of cb) { if (credsDe(x).some((c) => idsA.has(c) || c.includes(sa))) ko('P4', `${x.name} touche un identifiant ou un nom de l’autre client`); if (JSON.stringify(x).includes(sa)) ko('P4', `${x.name} cite l’autre client`) }
    // P6 : activation du seul compte de test, et seulement les copies sans emplacement
    if (cb.some((x) => x.active)) ko('P6', 'une copie d’un compte hors liste de test est active')
    for (const x of [...ca, ...cb]) if (x.active && x.nodes.some((n) => ['supabaseApi', 'anthropicApi'].some((t) => n.credentials?.[t] && String(n.credentials[t].id).startsWith('EMPLACEMENT_')))) ko('P6', `${x.name} active sans les identifiants de Presti`)
    if (!ca.some((x) => x.active)) ko('P6', 'le compte de test n’a aucune copie active après six passages')
    // P5 Signature garde ses envois
    if (!cb.some((x) => x.nodes.some((n) => envoie(n) && !n.disabled))) ko('P5', 'Signature : aucune copie ne garde un envoi (le rôle de l’offre est perdu)')
    for (const x of ca) for (const n of x.nodes) if (envoie(n) && !n.disabled) ko('P5', `Studio : ${x.name} / ${n.name} envoie`)
    // à blanc ensuite : rien ne change même avec la liste de test
    const avant = JSON.stringify(m.n8n.wf.map((w) => [w.name, w.active]))
    const ecr = m.n8n.ecritures().length
    passes(wf, m, 2, { mode: 'a_blanc', test: [A.artisan], presti: PRESTI })
    if (m.n8n.ecritures().length !== ecr || JSON.stringify(m.n8n.wf.map((w) => [w.name, w.active])) !== avant) ko('P6', 'à blanc, n8n a changé')

    // P7 — retrait de Gmail chez A : copies qui en dépendent désactivées, identifiant supprimé, plus rien ensuite
    const gA = A.connexions.find((c) => c.fournisseur === 'gmail')
    const gmailId = [...m.n8n.cred.values()].find((c) => c.name === `client-${sa}-gmail-gmailOAuth2`)?.id
    const lig = m.connexions.find((c) => c.id === gA.id); lig.etat = 'retiree'; lig.secret_n8n = null
    passes(wf, m, 4, { mode: 'reel', test: [A.artisan], presti: PRESTI })
    if (gmailId && m.n8n.cred.has(gmailId)) ko('P7', 'le retrait laisse l’identifiant dans n8n')
    if (m.n8n.wf.some((w) => w.name.startsWith(`client-${sa}-`) && w.active && credsDe(w).includes(gmailId))) ko('P7', 'une copie liée à l’identifiant retiré reste active')
    for (const x of copiesDe(m, sa)) if (x.active && !x.nodes.some((n) => n.disabled)) ko('P7', `${x.name} reste active après le retrait de Gmail`)
    const dependaient = copiesDe(m, sa).filter((x) => x.nodes.some((n) => n.credentials?.gmailOAuth2))
    for (const x of dependaient) if (x.active) ko('P7', `${x.name} utilisait Gmail et reste active après son retrait`)
    const ligneRetiree = m.etats.find((l) => l.connexion_id === gA.id)
    if (!ligneRetiree || ligneRetiree.etape !== 'retire' || Object.keys(JSON.parse(ligneRetiree.identifiants)).length) ko('P7', 'la ligne d’état n’est pas « retire » et vide')
    const n0 = m.n8n.ecritures().length
    passes(wf, m, 3, { mode: 'reel', test: [A.artisan], presti: PRESTI })
    if (m.n8n.ecritures().length !== n0) ko('P7', `rejeu après retrait : ${m.n8n.ecritures().length - n0} écriture(s) de plus`)
    if (idsB.size && [...idsB].some((i) => !m.n8n.cred.has(i))) ko('P7', 'le retrait de A a supprimé un identifiant de B')
  }

  // P8 — expiration puis renouvellement
  {
    const m = monde(gabarits)
    const A = brancher(m, { plan: 'studio', fournisseurs: ['gmail'] })
    const sa = slugDe(A.artisan)
    passes(wf, m, 4, { mode: 'reel', test: [A.artisan], presti: PRESTI })
    const lig = m.connexions[0]
    const ancien = [...m.n8n.cred.values()][0]?.id
    const copies0 = copiesDe(m, sa)
    // activer à la main une copie liée (le compte de test les aurait activées une fois les trois outils branchés)
    for (const x of copies0.filter((c) => credsDe(c).includes(ancien))) x.active = true
    lig.etat = 'expiree'
    passes(wf, m, 5, { mode: 'reel', test: [A.artisan], presti: PRESTI })
    if (copiesDe(m, sa).some((x) => x.active && credsDe(x).includes(ancien))) ko('P8', 'une copie liée à l’autorisation expirée reste active')
    if (m.alertes.length !== 1) ko('P8', `${m.alertes.length} alerte(s) pour une expiration (une seule attendue)`)
    if (!m.n8n.cred.has(ancien)) ko('P8', 'l’expiration a supprimé l’identifiant (seul le retrait le supprime)')
    // renouvellement : même ligne, nouveaux secrets
    lig.etat = 'active'
    passes(wf, m, 6, { mode: 'reel', test: [], presti: PRESTI })
    if (m.n8n.cred.has(ancien)) ko('P8', 'le renouvellement garde l’ancien identifiant')
    const nouveau = [...m.n8n.cred.values()]
    if (nouveau.length !== 1) ko('P8', `${nouveau.length} identifiants après renouvellement (1 attendu)`)
    else if (copiesDe(m, sa).some((x) => credsDe(x).includes(ancien))) ko('P8', 'une copie pointe encore l’ancien identifiant après renouvellement')
    else if (!copiesDe(m, sa).some((x) => credsDe(x).includes(nouveau[0].id))) ko('P8', 'aucune copie reliée au nouvel identifiant')
    if (m.alertes.length !== 1) ko('P8', 'le renouvellement a lancé une alerte de plus')
  }

  // P9 — aucun secret nulle part
  {
    const m = monde(gabarits)
    const A = brancher(m, { plan: 'signature', fournisseurs: tous, types: ['relance_devis'] })
    passes(wf, m, 6, { mode: 'reel', test: [A.artisan], presti: PRESTI })
    m.connexions[0].etat = 'expiree'; passes(wf, m, 2, { mode: 'reel' })
    const lieux = { 'l’état': JSON.stringify(m.etats), 'le journal': JSON.stringify(m.journal), 'les alertes': JSON.stringify(m.alertes), 'les sorties': m.sorties.join('\n') }
    for (const [nom, texte] of Object.entries(lieux)) for (const s of SECRETS_FIXES(m)) if (texte.includes(s)) ko('P9', `un secret apparaît dans ${nom}`)
    // seul le corps de POST /credentials porte les jetons ; aucune copie de workflow ne les porte
    for (const w of m.n8n.wf.filter((x) => x.name.startsWith('client-'))) for (const s of SECRETS_FIXES(m)) if (JSON.stringify(w).includes(s)) ko('P9', `${w.name} porte un secret`)
    for (const l of m.etats) if (Object.keys(l).some((k) => /secret|jeton|token/i.test(k))) ko('P9', `la ligne d’état a une colonne ${Object.keys(l).join(',')}`)
  }

  // P10 — hors offre
  {
    const m = monde(gabarits)
    for (const plan of ['gratuit', 'essentiel', 'entreprise', null]) brancher(m, { plan, fournisseurs: ['gmail'] })
    passes(wf, m, 3, { mode: 'reel' })
    if (m.n8n.cred.size || m.n8n.ecritures().length) ko('P10', 'un compte hors Studio/Signature a provoqué des écritures dans n8n')
    const f = brancher(m, { plan: 'business', fournisseurs: ['gmail'] }) // fondateur : même autonomie que Signature (lib/plans.ts offreDeReference)
    passes(wf, m, 2, { mode: 'reel' })
    if (m.n8n.cred.size !== 1) ko('P10', 'un fondateur (Business) doit être branché comme Signature')
    void f
  }
  return echecs
}

/** P11 — le texte exporté. */
function statique(wf, gabarits) {
  const echecs = []
  const ko = (msg) => echecs.push(`P11 ${msg}`)
  if (wf.active !== false) ko('le workflow exporté est actif')
  if (wf.name !== 'presti-provisionnement') ko(`nom ${wf.name}`)
  const brut = JSON.stringify(wf)
  const ids = [...brut.matchAll(/"credentials":\{[^}]*?"id":"([^"]+)"/g)].map((x) => x[1])
  for (const id of ids) if (!/^EMPLACEMENT_[A-Z0-9_]+$/.test(id)) ko(`identifiant réel dans l’export : ${id}`)
  if (/(sk-ant|ya29\.|eyJ[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{20,}|-----BEGIN)/.test(brut)) ko('un secret a la forme d’un jeton dans l’export')
  if (!(wf.settings?.executionTimeout > 0 && wf.settings.executionTimeout < 300)) ko('aucun délai maximal sous l’intervalle de 5 minutes : deux passages pourraient se chevaucher')
  const reglage = noeud(wf, 'Réglages')?.parameters?.jsCode ?? ''
  if (!/mode: 'a_blanc'/.test(reglage) || /mode: 'reel'/.test(reglage)) ko('le mode par défaut n’est pas « a_blanc »')
  if (/comptes_de_test: \[[^\]]/.test(reglage)) ko('un compte de test est nommé dans l’export')
  // La porte : tout chemin du déclencheur à « Appeler n8n » passe par « Mode réel ? » (sortie 0)
  const suivants = (nom) => (wf.connections[nom]?.main ?? []).flatMap((sortie, i) => (sortie ?? []).map((c) => ({ vers: c.node, sortie: i })))
  const atteint = (depart, interdit) => { const vus = new Set([depart]); const pile = [depart]; while (pile.length) { const n = pile.pop(); for (const s of suivants(n)) { if (n === interdit.de && s.vers === interdit.nom && s.sortie === interdit.sortie) continue; if (!vus.has(s.vers)) { vus.add(s.vers); pile.push(s.vers) } } } return vus }
  const sansPorte = atteint('Toutes les 5 minutes', { de: 'Mode réel ?', nom: 'Préparer la requête', sortie: 0 })
  for (const nom of ['Appeler n8n', 'Réserver', 'Écrire l’état', 'Alerter']) if (sansPorte.has(nom)) ko(`« ${nom} » s’atteint sans passer par la porte « Mode réel ? »`)
  if (!suivants('Mode réel ?').some((s) => s.vers === 'Préparer la requête' && s.sortie === 0)) ko('« Mode réel ? » ne mène pas à la préparation par sa sortie vraie')
  for (const n of wf.nodes) if (n.type === 'n8n-nodes-base.httpRequest' && /n8n|127\.0\.0\.1|localhost/.test(String(n.parameters.url).replace(/secret_n8n/g, '')) && n.name !== 'Appeler n8n' && !/\$\(/.test(n.parameters.url)) ko(`${n.name} appelle n8n hors de la porte`)
  const porte = noeud(wf, 'Mode réel ?')?.parameters?.conditions?.conditions?.[0]
  if (!porte || !/Réglages/.test(porte.leftValue) || !/\.mode/.test(porte.leftValue) || porte.rightValue !== 'reel' || porte.operator?.operation !== 'equals') ko('la porte « Mode réel ? » ne teste pas « mode = reel »')
  const generee = D.genererWorkflowProvisionnement()
  if (JSON.stringify(generee) !== JSON.stringify(wf)) ko('l’export diffère de la génération')
  void gabarits
  return echecs
}

// ─── Les mutants : chacun doit faire rougir le juge ──────────────────────────────────────────────────────────────────
function muterCode(wf, de, vers) {
  const copie = JSON.parse(JSON.stringify(wf)); let n = 0
  for (const x of copie.nodes) if (x.parameters?.jsCode?.includes(de)) { x.parameters.jsCode = x.parameters.jsCode.split(de).join(vers); n++ }
  if (!n) throw new Error(`mutant sans effet : « ${de.slice(0, 60)} » introuvable dans le workflow généré`)
  return copie
}
const MUTANTS = [
  ['un secret écrit en clair au journal', (w) => muterCode(w, "cible: p.copie || p.type || ''", "cible: JSON.stringify(p.requete || '')"), /^P9 /],
  ['un secret écrit dans l’état', (w) => muterCode(w, "const etat = p.reservation ? { ...p.reservation,", "const etat = p.reservation ? { jeton: JSON.stringify(p.requete), ...p.reservation,"), /^P9 /],
  ['deux clients mélangés (même slug)', (w) => muterCode(w, "return `a-${h.slice(0, 12)}`", "return 'a-000000000000'"), /^P4 /],
  ['un rejeu qui double la copie', (w) => muterCode(w, 'if (!cp) {', 'if (true) {'), /^P3 /],
  ['un rejeu qui double l’identifiant', (w) => muterCode(w, "const manque = types.filter((t) => !ligne?.identifiants?.[t])", "const manque = types.filter(() => true)"), /^P3 /],
  ['une copie Studio qui envoie', (w) => muterCode(w, 'if (studio && envoieAuDehors(n)) n.disabled = true', ''), /^P5 /],
  ['un retrait qui laisse l’identifiant', (w) => muterCode(w, "for (const [type, i] of Object.entries(ligne.identifiants ?? {})) actions.push({ ...base, action: 'supprimer_identifiant', type, identifiant: i.id })\n      if (!Object.keys", "if (!Object.keys"), /^P7 /],
  ['un retrait qui laisse la copie active', (w) => muterCode(w, "if (cp.name.startsWith(`client-${slug}-`) && cp.active && dependDe(cp, tousIds)) actions.push({ ...base, action: 'desactiver_copie', copie: cp.name })", ''), /^P7 /],
  ['une activation hors du compte de test', (w) => muterCode(w, 'reel && !cp.active && test.has(c.artisan_id) &&', 'reel && !cp.active &&'), /^P6 /],
  ['la porte laisse passer l’à blanc', (w) => { const c = JSON.parse(JSON.stringify(w)); c.nodes.find((n) => n.name === 'Mode réel ?').parameters.conditions.conditions[0].rightValue = 'a_blanc'; return c }, /^P11 /],
  ['une alerte répétée à chaque passage', (w) => muterCode(w, 'if (!ligne.alerte_envoyee) actions.push', 'if (true) actions.push'), /^P8 /],
  ['un renouvellement qui garde l’ancien identifiant', (w) => muterCode(w, 'if (ligne?.alerte_envoyee) {', 'if (false) {'), /^P8 /],
  ['un crash qui permet le doublon', (w) => muterCode(w, "const enCours = types.filter((t) => String(ligne?.etape ?? '').split(',').includes(`en_cours:${t}`))", 'const enCours = []'), /^P3 /],
  ['deux actions sur la même ligne d’état', (w) => muterCode(w, 'if (deja.has(a.connexion_id)) return false', ''), /^P4 /],
  ['un compte hors offre branché', (w) => muterCode(w, "if (plan === 'studio') return 'studio'", "if (plan === 'studio' || plan === 'essentiel' || plan === 'gratuit') return 'studio'"), /^P10 /],
  ['le mode à blanc contourné (la porte saute)', (w) => { const c = JSON.parse(JSON.stringify(w)); c.connections['Écrire le plan'] = { main: [[{ node: 'Préparer la requête', type: 'main', index: 0 }]] }; return c }, /^P11 /],
  ['un identifiant réel dans l’export', (w) => { const c = JSON.parse(JSON.stringify(w)); c.nodes.find((n) => n.credentials).credentials = { supabaseApi: { id: '42', name: 'x' } }; return c }, /^P11 /],
  ['le workflow exporté actif', (w) => ({ ...JSON.parse(JSON.stringify(w)), active: true }), /^P11 /],
  ['un passage sans délai maximal (chevauchement possible)', (w) => { const c = JSON.parse(JSON.stringify(w)); delete c.settings.executionTimeout; return c }, /^P11 /],
  ['le mode réel par défaut', (w) => muterCode(w, "mode: 'a_blanc', comptes_de_test: []", "mode: 'reel', comptes_de_test: []"), /^P1 |^P11 /],
]

// ─── Déroulé ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const gabarits = chargerGabarits()
const wfOriginal = JSON.parse(JSON.stringify(D.genererWorkflowProvisionnement()))
const exporte = (() => { try { return JSON.parse(readFileSync(path.join(RACINE, '.orchestre/preuves/036-021/presti-provisionnement.workflow.json'), 'utf8')) } catch { return null } })()
let echecs = []
const jouer = (wf) => [...statique(wf, gabarits), ...epreuves(wf, gabarits)]
echecs = jouer(wfOriginal)
if (!exporte) echecs.push('P11 l’export .orchestre/preuves/036-021/presti-provisionnement.workflow.json est absent (node scripts/deployer-client-n8n.mjs --provisionnement)')
else if (JSON.stringify(exporte) !== JSON.stringify(wfOriginal)) echecs.push('P11 l’export déposé diffère de la génération : le régénérer')
for (const e of echecs) console.log(`✗ ${e}`)
if (!echecs.length) console.log(`✓ presti-provisionnement : P1 à P11 tenues (${wfOriginal.nodes.length} nœuds, ${gabarits.filter((g) => g.name.startsWith('gabarit-artisan-')).length} gabarits d’artisan)`)

let rouges = 0
for (const [nom, fabriquer, motif] of MUTANTS) {
  let rouge = false; let detail = ''
  try {
    const e = jouer(fabriquer(wfOriginal))
    const vise = e.find((x) => motif.test(x))
    rouge = Boolean(vise); detail = vise ?? (e.length ? `rouge mais ailleurs : ${e[0]}` : 'AUCUNE règle n’a rougi')
  } catch (err) { detail = `erreur du juge : ${err.message}` }
  console.log(`  ${rouge ? '✓' : '✗'} mutant « ${nom} » → ${detail.slice(0, 150)}`)
  if (rouge) rouges++
}
console.log(`provisionnement-qa : ${MUTANTS.length} mutants, ${rouges} rouges (${Math.round((Date.now() - t0) / 1000)} s)`)
if (echecs.length || rouges !== MUTANTS.length) { console.log('ÉCHEC'); process.exit(1) }
console.log('OK')
