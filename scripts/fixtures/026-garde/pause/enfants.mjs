// scripts/fixtures/026-garde/pause/enfants.mjs — les scénarios du juge garde-pause-qa, joués DANS un processus enfant (le juge les
// relance par --enfant=<groupe>) : le code de la racine jugée est importé sur les doublures de doublures.mjs, sans réseau, sans
// base, sans modèle. Chaque groupe rend des OBSERVATIONS (ce qui a été appelé, dans quel ordre) ; le juge en tire les verdicts.
import fs from 'node:fs'
import path from 'node:path'
import { premiereLigne, MARQUE } from './commun.mjs'
import { installer, Base, importerDepuis, lire } from './doublures.mjs'

const G_ = () => globalThis.__GP
const FUTUR = () => new Date(Date.now() + 86_400_000).toISOString()
const PASSE = '2020-01-01T00:00:00.000Z'
const NEXT = class NextResponse { static json(corps, init) { return Response.json(corps, init) } }
const existe = (racine, rel) => fs.existsSync(path.join(racine, rel))

/** Les lignes du journal rendues à plat pour le juge. */
function observer(G, extra = {}) {
  const j = G.journal
  const appels = (spec, nom) => j.filter((e) => e.f === 'appel' && e.spec === spec && e.nom === nom)
  const lectures = j.filter((e) => e.f === 'from').map((e) => ({ table: e.table, op: e.op, seq: e.seq, lim: e.lim, nb: e.nb, panne: !!e.panne }))
  return {
    emails: appels('lib/email', 'sendEmail').map((e) => ({ to: e.args?.[0]?.to ?? null, seq: e.seq, critique: !!e.args?.[0]?.critique })),
    ia: appels('lib/ai', 'generateRelanceReply').length,
    livraison: appels('lib/siteLivraison', 'tourLivraison').length,
    publications: appels('lib/crieur/publora', 'creerPublication').map((e) => e.seq),
    notifications: appels('lib/email', 'notifierEntreprise').map((e) => ({ seq: e.seq, sujet: String(e.args?.[0] ?? ''), corps: String(e.args?.[1] ?? '') })),
    pausesLues: [...appels('lib/agents/pause', 'pauseGenerale'), ...appels('lib/agents/bus', 'ops_interrupteur')].map((e) => e.seq),
    lectures, fetchs: j.filter((e) => e.f === 'fetch').map((e) => ({ url: e.url, seq: e.seq })), ...extra,
  }
}
const requete = (chemin) => new Request(`http://127.0.0.1${chemin}`, { headers: { authorization: 'Bearer essai' } })
async function appeler(GET, chemin) {
  try { return await lire(await GET(requete(chemin))) } catch (e) { return { status: null, j: null, t: '', erreur: premiereLigne(e) } }
}
function poserFetch() {
  globalThis.fetch = async (u, init) => { G_().noter({ f: 'fetch', url: String(u?.url ?? u), methode: init?.method ?? 'GET' }); return new Response(JSON.stringify({ id: 'essai' }), { status: 200 }) }
}

// ═══ Les relances ═══════════════════════════════════════════════════════════════════════════════════════════════════════
const PAUSE_INACTIVE = { active: false, source: 'base' }
function tablesRelances(n, { memeLead = false } = {}) {
  const relances = [], leads = [], vus = new Set()
  for (let i = 1; i <= n; i++) {
    const lead = memeLead ? 'l1' : `l${i}`
    relances.push({ id: `r${i}`, lead_id: lead, rang: memeLead ? i : 1, planifiee_le: PASSE, envoyee: false })
    if (!vus.has(lead)) { vus.add(lead); leads.push({ id: lead, nom_prospect: `Prospect ${lead}`, contact: `${lead}@exemple.test`, message: 'Besoin', statut: 'repondu', artisan_id: 'a1' }) }
  }
  return { relances, leads, artisans: [{ id: 'a1', nom: 'Atelier Essai', metier: 'plombier', ton_style: null, email: 'artisan@exemple.test', is_founder: false, plan: 'studio' /* 15/10 : les relances de conversation font partie de la plateforme (Studio et au-dessus) */ }], messages: [] }
}
async function groupeRelances(racine) {
  process.env.CRON_SECRET = 'essai'
  const G = installer(racine, ['next/server', 'lib/alerteService', 'lib/alertes', 'lib/supabaseAdmin', 'lib/suspension', 'lib/purgeComptes', 'lib/purgesRgpd', 'lib/packPubPurge', 'lib/ai', 'lib/email', 'lib/direction/courriers', 'lib/flags', 'lib/siteLivraison', 'lib/agents/pause'], {
    'next/server.NextResponse': NEXT,
    'lib/supabaseAdmin.supabaseAdmin': { from: (t) => G_().base.from(t), rpc: (n, a) => G_().base.rpc(n, a) },
  })
  Object.assign(G.comportements, {
    'lib/agents/pause.pauseGenerale': () => { const e = G_().etat.pause; if (e === 'throw') throw new Error('base injoignable'); return typeof e === 'function' ? e() : e },
    'lib/flags.actif': () => false,
    'lib/suspension.suspensionEnCours': async () => null,
    'lib/ai.generateRelanceReply': async () => 'Bonjour, petite relance.',
    'lib/ai.relanceTemplate': () => 'Modèle de relance',
    'lib/email.sendEmail': async (o) => { const n = G_().appels('lib/email', 'sendEmail').length; const f = G_().etat.sendEmail; return f ? f(n, o) : { ok: true, id: 'essai' } },
    'lib/purgeComptes.purgerComptes': async () => ({ purges: 0, en_attente: 0 }),
    'lib/purgesRgpd.purgerRgpd': async () => ({ erreurs: [] }),
    'lib/packPubPurge.purgerPacksExpires': async () => ({ erreurs: [] }),
    'lib/alertes.ronde': async () => ({ envoyees: [], ignorees: [] }),
    'lib/alertes.enregistrerPassage': async () => {},
    'lib/siteLivraison.tourLivraison': async () => ({}),
    'lib/alerteService.signalerPanneIA': async () => {},
    'lib/direction/courriers.relever': async () => ({ ok: true, nouveaux: 0, lus: 0 }),
  })
  G.rpc.purger_cache_recherche = () => ({ data: 0, error: null })
  poserFetch()
  const { GET } = await importerDepuis(racine, 'app/api/cron/relances/route.ts')
  const preparer = (cfg = {}) => { G.vider(); G.base = new Base(tablesRelances(cfg.dues ?? 3, cfg), cfg.pannes ?? []); G.etat = { pause: 'pause' in cfg ? cfg.pause : PAUSE_INACTIVE, sendEmail: cfg.sendEmail, passe: 1 } }
  const rendre = (rep, extra) => ({ ...observer(G_(), extra), statut: rep?.status ?? null, corps: rep?.j ?? null, erreur: rep?.erreur ?? null })
  const passage = async (cfg) => { preparer(cfg); return rendre(await appeler(GET, '/api/cron/relances')) }
  const sortie = {}
  sortie.normal = await passage({ dues: 3 })
  sortie.pause = await passage({ dues: 3, pause: { active: true, source: 'base' } })
  sortie.panne = await passage({ dues: 3, pause: { active: true, source: 'panne' } })
  sortie.leve = await passage({ dues: 3, pause: 'throw' })
  sortie.douteuses = []
  for (const [nom, v] of [['undefined', undefined], ['objet vide', {}], ['active en chaîne', { active: 'non' }], ['null', null]]) sortie.douteuses.push({ nom, ...(await passage({ dues: 3, pause: v })) })
  sortie.bascule = await passage({ dues: 5, sendEmail: (n) => { if (n >= 2) G_().etat.pause = { active: true, source: 'base' }; return { ok: true, id: 'essai' } } })
  sortie.plafondPassage = await passage({ dues: 150 })
  sortie.refusPlafond = await passage({ dues: 10, sendEmail: (n) => (n >= 3 ? { ok: false, error: 'plafond quotidien d’envois atteint' } : { ok: true, id: 'essai' }) })
  sortie.memeContact = await passage({ dues: 2, memeLead: true })
  // deux passages de suite, l'écriture « envoyée » en panne au premier : le mail ne doit pas repartir au second
  preparer({ dues: 2, pannes: [{ table: 'relances', op: 'update', si: (g) => g.etat.passe === 1 }] })
  const p1 = await appeler(GET, '/api/cron/relances'); const n1 = G.journal.length
  G.etat.passe = 2
  const p2 = await appeler(GET, '/api/cron/relances')
  sortie.deuxPassages = { ...observer(G, {}), apres1: G.journal.slice(0, n1).filter((e) => e.f === 'appel' && e.nom === 'sendEmail').length, statuts: [p1.status, p2.status] }
  // deux passages en même temps (le bouton « purges-rgpd » rejoue le cron pendant que Vercel le lance)
  preparer({ dues: 2 })
  const [c1, c2] = await Promise.all([appeler(GET, '/api/cron/relances'), appeler(GET, '/api/cron/relances')])
  sortie.simultanes = { ...observer(G, {}), statuts: [c1.status, c2.status] }
  return sortie
}

// ═══ Le Crieur ══════════════════════════════════════════════════════════════════════════════════════════════════════════
const PUB = (canal) => ({ canal, fait_ids: [], texte: `Texte ${canal}`, programmee_pour: FUTUR(), visuel: 'v1' })
async function groupeCrieur(racine) {
  process.env.CRON_SECRET = 'essai'
  process.env.PUBLORA_COUT_PAR_PUBLICATION_EUR = '0'
  const G = installer(racine, ['next/server', 'lib/supabaseAdmin', 'lib/agents/pause', 'lib/agents/bus', 'lib/alertes', 'lib/email', 'lib/flags', 'lib/crieur/composer', 'lib/crieur/faits', 'lib/crieur/juge', 'lib/crieur/publora'], {
    'next/server.NextResponse': NEXT, 'lib/flags.FLAGS': {}, 'lib/crieur/faits.FAITS': [], 'lib/crieur/composer.PHRASES_GABARIT': [],
    'lib/supabaseAdmin.supabaseAdmin': { from: (t) => G_().base.from(t), rpc: (n, a) => G_().base.rpc(n, a) },
  })
  Object.assign(G.comportements, {
    'lib/agents/pause.pauseGenerale': () => { const e = G_().etat.pause; if (e === 'throw') throw new Error('base injoignable'); return typeof e === 'function' ? e() : e },
    'lib/flags.actif': () => true,
    'lib/alertes.enregistrerPassage': async () => {},
    'lib/agents/bus.ops_battement': async () => ({ ok: true, data: null }),
    'lib/email.notifierEntreprise': async () => ({ ok: true }),
    'lib/crieur/composer.cleSemaine': () => '2026-W40',
    'lib/crieur/composer.horairesSemaine': () => [],
    'lib/crieur/composer.composerLot': () => G_().etat.lot,
    'lib/crieur/juge.jugerPublication': () => ({ ok: true, raisons: [] }),
    'lib/crieur/publora.connexions': async () => ['instagram-a', 'facebook-a', 'linkedin-a'],
    'lib/crieur/publora.creerPublication': async () => { const n = G_().appels('lib/crieur/publora', 'creerPublication').length; const f = G_().etat.apresPublication; if (f) f(n); return `pub-${n}` },
    'lib/crieur/publora.programmerPublication': async () => {},
    'lib/crieur/publora.suspendrePublication': async () => { if (G_().etat.refusSuspension) throw new Error('suspension non confirmée') },
  })
  poserFetch()
  const { GET } = await importerDepuis(racine, 'app/api/cron/crieur/route.ts')
  const programmee = (i) => ({ id: `p${i}`, publora_id: `pub-existante-${i}`, semaine: '2026-W39', canal: 'linkedin', fait_ids: [], statut: 'programmee', programmee_pour: FUTUR(), cree_le: new Date().toISOString() })
  const passage = async (cfg = {}) => {
    G.vider(); G.base = new Base({ crieur_posts: cfg.lignes ?? [] }, cfg.pannes ?? [])
    G.etat = { pause: 'pause' in cfg ? cfg.pause : PAUSE_INACTIVE, lot: cfg.lot ?? [PUB('instagram'), PUB('facebook'), PUB('linkedin')], apresPublication: cfg.apresPublication, refusSuspension: cfg.refusSuspension }
    const rep = await appeler(GET, '/api/cron/crieur')
    return { ...observer(G_()), statut: rep.status, corps: rep.j, erreur: rep.erreur ?? null, inscriptions: G_().journal.filter((e) => e.f === 'from' && e.table === 'crieur_posts' && e.op === 'insert').length,
      suspensions: G_().appels('lib/crieur/publora', 'suspendrePublication').map(e => e.args[0]),
      programmations: G_().appels('lib/crieur/publora', 'programmerPublication').length,
      registre: G_().base.t.crieur_posts.map(l => ({ id: l.id, statut: l.statut, programmee_pour: l.programmee_pour })),
    }
  }
  const sortie = {}
  sortie.normal = await passage()
  sortie.pause = await passage({ pause: { active: true, source: 'base' }, lignes: [programmee(1), programmee(2)] })
  sortie.pauseSansProgrammee = await passage({ pause: { active: true, source: 'base' } })
  sortie.pauseRegistreEnPanne = await passage({ pause: { active: true, source: 'base' }, pannes: [{ table: 'crieur_posts', op: 'select' }], lignes: [programmee(1)] })
  sortie.pauseSuspensionRefusee = await passage({ pause: { active: true, source: 'base' }, refusSuspension: true, lignes: [programmee(1)] })
  sortie.panne = await passage({ pause: { active: true, source: 'panne' } })
  sortie.leve = await passage({ pause: 'throw' })
  sortie.douteuses = []
  for (const [nom, v] of [['undefined', undefined], ['objet vide', {}], ['active en chaîne', { active: 'non' }], ['null', null]]) sortie.douteuses.push({ nom, ...(await passage({ pause: v })) })
  sortie.bascule = await passage({ apresPublication: (n) => { if (n >= 1) G_().etat.pause = { active: true, source: 'base' } } })
  return sortie
}

// ═══ La pause, sa lecture, le point de passage des e-mails ═══════════════════════════════════════════════════════════════════
async function groupePause(racine) {
  process.env.RESEND_API_KEY = 're_essai'
  delete process.env.PAUSE_GENERALE; delete process.env.EMAILS_PAR_JOUR
  const G = installer(racine, ['lib/agents/bus', 'lib/limites'], {})
  Object.assign(G.comportements, {
    'lib/agents/bus.ops_interrupteur': async () => { const e = G_().etat.bus; if (e === 'throw') throw new Error('base injoignable'); return typeof e === 'function' ? e() : e },
    'lib/limites.consommerLimite': async (cle, max, fen) => { const f = G_().etat.limite; return f ? f(cle, max, fen) : true },
  })
  poserFetch()
  const { pauseGenerale } = await importerDepuis(racine, 'lib/agents/pause.ts')
  const { sendEmail } = await importerDepuis(racine, 'lib/email.ts')
  const ETATS = [
    ['base : false', { ok: true, data: false }], ['base : true', { ok: true, data: true }], ['erreur du bus', { ok: false, code: 'erreur', status: 500 }],
    ['lecture qui lève', 'throw'], ['valeur absente', { ok: true, data: undefined }], ['null', { ok: true, data: null }], ['chaîne « false »', { ok: true, data: 'false' }], ['zéro', { ok: true, data: 0 }],
  ]
  const sortie = { lecture: [], courriers: [] }
  for (const [nom, bus] of ETATS) {
    G.vider(); G.etat = { bus }
    let etat = null, erreur = null
    try { etat = await pauseGenerale() } catch (e) { erreur = premiereLigne(e) }
    sortie.lecture.push({ nom, etat, erreur })
    G.vider(); G.etat = { bus }
    const r1 = await sendEmail({ to: 'prospect@exemple.test', subject: 'Essai', text: 'Bonjour' }).catch((e) => ({ ok: false, error: premiereLigne(e) }))
    const n1 = G.journal.filter((e) => e.f === 'fetch' && /api\.resend\.com/.test(e.url)).length
    G.vider(); G.etat = { bus }
    const r2 = await sendEmail({ to: 'fondateur@exemple.test', subject: 'Alerte', text: 'Bonjour', critique: true }).catch((e) => ({ ok: false, error: premiereLigne(e) }))
    const n2 = G.journal.filter((e) => e.f === 'fetch' && /api\.resend\.com/.test(e.url)).length
    sortie.courriers.push({ nom, ordinaire: { envoyes: n1, ok: !!r1?.ok }, critique: { envoyes: n2, ok: !!r2?.ok } })
  }
  process.env.PAUSE_GENERALE = '1'
  G.vider(); G.etat = { bus: { ok: true, data: false } }
  const v = await pauseGenerale()
  sortie.variable = { etat: v, appelsBus: G.appels('lib/agents/bus', 'ops_interrupteur').length }
  G.vider()
  const m = await sendEmail({ to: 'prospect@exemple.test', subject: 'Essai', text: 'Bonjour' }).catch((e) => ({ ok: false, error: premiereLigne(e) }))
  sortie.variable.courrier = { envoyes: G.journal.filter((e) => e.f === 'fetch' && /api\.resend\.com/.test(e.url)).length, ok: !!m?.ok }
  delete process.env.PAUSE_GENERALE
  // la limite de débit : pause levée, plafond du jour atteint → rien ne part ; le plafond par défaut
  G.vider(); G.etat = { bus: { ok: true, data: false }, limite: () => false }
  const l = await sendEmail({ to: 'prospect@exemple.test', subject: 'Essai', text: 'Bonjour' }).catch((e) => ({ ok: false, error: premiereLigne(e) }))
  sortie.limite = { envoyes: G.journal.filter((e) => e.f === 'fetch' && /api\.resend\.com/.test(e.url)).length, ok: !!l?.ok, appels: G.appels('lib/limites', 'consommerLimite').map((e) => e.args) }
  G.vider(); G.etat = { bus: { ok: true, data: false } }
  const s = await sendEmail({ to: 'prospect@exemple.test', subject: 'Essai', text: 'Bonjour' }).catch((e) => ({ ok: false, error: premiereLigne(e) }))
  sortie.sain = { envoyes: G.journal.filter((e) => e.f === 'fetch' && /api\.resend\.com/.test(e.url)).length, ok: !!s?.ok }
  return sortie
}

export async function jouer(groupe, racine) {
  if (!existe(racine, 'lib/agents/pause.ts')) return { erreur: 'lib/agents/pause.ts absent de la racine jugée' }
  try {
    const obs = groupe === 'relances' ? await groupeRelances(racine) : groupe === 'crieur' ? await groupeCrieur(racine) : groupe === 'pause' ? await groupePause(racine) : { erreur: `groupe inconnu : ${groupe}` }
    return obs
  } catch (e) { return { erreur: premiereLigne(e) } }
}
export function emettre(obs) { console.log(`${MARQUE}${JSON.stringify(obs)}`) }
