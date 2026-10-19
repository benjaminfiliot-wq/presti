#!/usr/bin/env node
// scripts/coherence-flux-qa.mjs — AUDIT DE COHÉRENCE DES FLUX (18/10/2026) : « quand je crée un devis, apparaît-il partout où il doit ? »
//
// Un compte de test (@presti-test.invalid, offre Signature) traverse le parcours d'un artisan :
//   demande → devis → envoi → acceptation (+ facture d'acompte automatique) → chantier → tâches → équipe → matériel (réservation, sortie de
//   stock) → commande fournisseur → facture payée → chantier terminé → facture du solde → notes client,
// puis quelques parcours « de travers » (devis créé depuis une conversation, signature à la main, e-mail ajouté après coup, facture d'un
// brouillon). À CHAQUE étape, on relit ce que les écrans lisent :
//   • les VRAIES routes (handlers importés et appelés dans ce processus, avec le jeton du compte de test, donc la même garde, la même
//     lecture, le même calcul que le navigateur) : GET /api/crm/vue, /api/crm/clients, /api/crm/chantiers/[id], /api/compta/tableau,
//     /api/inventaire, et les routes d'écriture (devis, factures, chantiers, tâches, matériel, commandes, notes, acceptation du client) ;
//   • les pages qui lisent la base directement sous RLS (Devis, Factures, Tableau de bord /dashboard) : mêmes requêtes que la page,
//     avec le client Supabase du compte de test ;
//   • les calculs de « Mes chiffres » (lib/comptaTableau.ts, lib/tableau-de-bord/calculer.ts) rejoués sur la réponse de la route ;
//   • le TEMPS RÉEL : un client abonné comme app/crm/useTempsReel.ts (lib/crm/tempsReel.ts) note chaque évènement reçu.
//
// Ce qui n'est PAS joué ici, et pourquoi :
//   • POST /api/devis/[id]/envoyer : la route rend un PDF (lib/DevisPDF.tsx, JSX non chargeable hors Next) puis envoie un e-mail. Son
//     écriture du devis passe par LA fonction de la route (lib/devisEnvoi.ts : statut « envoye » et date d'envoi) ; celle de la
//     demande (« repondu ») est reproduite à l'identique, voir `envoyerComme()`.
//   • Le passage quotidien (app/api/cron/relances) : seule l'expiration des devis dépassés est rejouée (lib/devisExpiration.ts),
//     restreinte au compte de test.
// Mis à jour le 18/10 après la correction des cassures C1 à C8 : chaque cassure garde ses vérifications, qui sont passées au vert.
//   • POST /api/leads (formulaire public) : il appelle le modèle de langage (coût) et envoie des e-mails. La demande est insérée avec les
//     colonnes exactes que la route écrit (canal formulaire, statut nouveau, ville, type_chantier).
//   • « Devis auto » (lib/devisAuto.ts, appelle l'IA) : son effet utile ici — le devis porte `lead_id` — est posé par la clé de service,
//     et dit comme tel.
//
// Aucun e-mail réel : RESEND_API_KEY est vidée dans ce processus, et lib/email.ts ignore de toute façon les adresses en .invalid.
// Aucune modification de code : seul ce fichier est nouveau. NETTOYAGE dans un `finally` (purger_compte_test, puis contrôle qu'il ne reste rien).
//
// Prérequis : .env.local (clés Supabase). La base visée est celle de .env.local (il n'existe pas de base de test distincte) ; seuls des
// comptes @presti-test.invalid sont créés, touchés et supprimés.
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/coherence-flux-qa.mjs
// Codes : 0 aucune cassure · 1 au moins une cassure · 2 non exécutable (variables, base)
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { register } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.removeAllListeners('warning')
for (const l of fs.readFileSync(path.join(RACINE, '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
process.env.RESEND_API_KEY = '' // aucun e-mail réel, quoi qu'il arrive
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_ || !ANON || !SERVICE) { console.error('Variables Supabase manquantes dans .env.local : non exécutable.'); process.exit(2) }
// Les routes importent « next/server » sans extension : Node ESM ne le résout pas seul (ts-loader.mjs ne s'en occupe pas).
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s, c, n) { if (/^next\\/[a-z-]+$/.test(s)) return n(s + '.js', c); return n(s, c) }`))

const { createClient } = await import('@supabase/supabase-js')
const imp = (p) => import(pathToFileURL(path.join(RACINE, p)).href)
const { abonnements, TABLES_TEMPS_REEL } = await imp('lib/crm/tempsReel.ts')
const { calculerCompta, jourParis, euros } = await imp('lib/comptaTableau.ts')
const { calculer } = await imp('lib/tableau-de-bord/calculer.ts')
const { estStockBas } = await imp('lib/crm/alertes.ts')
const { verifierSessionTest } = await imp('scripts/lib/connexion-test.mjs')
const { enregistrerEnvoi } = await imp('lib/devisEnvoi.ts')
const { expirerDevisDepasses } = await imp('lib/devisExpiration.ts')
const { regrouperClients } = await imp('lib/crm/clients.ts')
const { notesClientAPurger } = await imp('lib/crm/effacement.ts')
const { idClientPour } = await imp('lib/crm/empreinte.ts')
const { chargerDossiers } = await imp('lib/crm/serveur.ts')
const H = {
  devisCreer: await imp('app/api/devis/route.ts'),
  devisMaj: await imp('app/api/devis/[id]/route.ts'),
  accepter: await imp('app/api/conversation/devis/route.ts'),
  factureCreer: await imp('app/api/factures/route.ts'),
  factureMaj: await imp('app/api/factures/[id]/route.ts'),
  avoir: await imp('app/api/factures/[id]/avoir/route.ts'),
  vue: await imp('app/api/crm/vue/route.ts'),
  clients: await imp('app/api/crm/clients/route.ts'),
  chantiers: await imp('app/api/crm/chantiers/route.ts'),
  chantier: await imp('app/api/crm/chantiers/[id]/route.ts'),
  taches: await imp('app/api/crm/taches/[id]/route.ts'),
  reserver: await imp('app/api/crm/chantiers/[id]/materiaux/route.ts'),
  reservation: await imp('app/api/crm/materiaux/[id]/route.ts'),
  commandes: await imp('app/api/crm/commandes/route.ts'),
  equipe: await imp('app/api/crm/equipe/route.ts'),
  vehicules: await imp('app/api/crm/vehicules/route.ts'),
  notes: await imp('app/api/crm/notes/route.ts'),
  pipeline: await imp('app/api/crm/pipeline/route.ts'),
  compta: await imp('app/api/compta/tableau/route.ts'),
  inventaire: await imp('app/api/inventaire/route.ts'),
}

// ── Petites mains ───────────────────────────────────────────────────────────────────────────────────────────────────
let ok = 0, ko = 0
const CASSURES = []   // { id, titre, detail }
const CONSTATS = []   // ce qui n'est pas une panne mais une limite à connaître
const T = (nom, cond, detail = '', cassure = null) => {
  if (cond) { ok++; console.log(`  ✅ ${nom}`); return true }
  ko++
  console.log(`  ❌ ${nom}${detail ? ` — ${String(detail).slice(0, 400)}` : ''}${cassure ? `  [${cassure}]` : ''}`)
  if (cassure) CASSURES.push({ id: cassure, titre: nom, detail: String(detail) })
  return false
}
const INFO = (nom, detail = '') => { console.log(`  ℹ️  ${nom}${detail ? ` — ${detail}` : ''}`); CONSTATS.push(`${nom}${detail ? ` — ${detail}` : ''}`) }
const titre = (s) => console.log(`\n── ${s}`)
const dormir = (ms) => new Promise((r) => setTimeout(r, ms))
const admin = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } })
const AUJOURDHUI = jourParis(new Date())
const jourDecale = (n) => jourParis(new Date(Date.now() + n * 86_400_000))
const cts = (eur) => Math.round(eur * 100)

/** Appelle un handler de route comme le ferait Next : une Request avec le jeton, des paramètres de chemin, et la réponse JSON. */
async function appel(handler, methode, chemin, { jeton, corps, params } = {}) {
  const req = new Request('http://localhost' + chemin, {
    method: methode,
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9', ...(jeton ? { authorization: `Bearer ${jeton}` } : {}) },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  })
  const rep = await handler(req, { params: Promise.resolve(params ?? {}) })
  const texte = await rep.text()
  let json = null
  try { json = JSON.parse(texte) } catch { /* corps non JSON */ }
  return { statut: rep.status, corps: json, texte }
}

// ── Les comptes ─────────────────────────────────────────────────────────────────────────────────────────────────────
const comptes = []
async function creerCompte(nom) {
  const slug = `coh-${nom}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`
  const email = `${slug}@presti-test.invalid`, mdp = crypto.randomUUID() + 'Aa1!'
  const { data: u, error } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true })
  if (error) throw new Error(`compte ${nom} : ${error.message}`)
  const c = { nom, uid: u.user.id, email, slug, client: createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } }), evenements: [], canaux: [] }
  comptes.push(c)
  const { error: ea } = await admin.from('artisans').insert({
    id: c.uid, email, nom: `Plomberie Cohérence ${nom}`, metier: 'plombier', slug, plan: 'signature',
    // Toutes les mentions obligatoires à l'émission (lib/legalArtisan.ts) : sans elles, facture et devis sont refusés (422).
    forme_juridique: 'EI', siret: '73282932000074', adresse: '12 rue des Essais', code_postal: '69001', ville: 'Lyon',
    tel_public: '0102030405', email_public: email, assurance_nom: 'Assureur Test', assurance_contrat: 'TEST-0001',
    assurance_activites: 'Plomberie, chauffage', assurance_zone: 'France entière', zone_intervention: 'Rhône',
    mediateur_nom: 'Médiateur Test', mediateur_url: 'https://mediation.example.invalid', tva_regime: 'franchise',
  })
  if (ea) throw new Error(`fiche artisan ${nom} : ${ea.message}`)
  const { data: s, error: es } = await c.client.auth.signInWithPassword({ email, password: mdp })
  if (es) throw new Error(`connexion ${nom} : ${es.message}`)
  c.jeton = s.session.access_token
  await verifierSessionTest(c.jeton) // l'opérateur atteste la session (code e-mail), comme les autres suites
  return c
}

/** Abonne le compte exactement comme app/crm/useTempsReel.ts, et consigne chaque évènement. */
async function abonner(c) {
  const canal = c.client.channel(`crm:${c.uid}`)
  // Une table du temps réel encore absente de la base (0162 non appliquée : crm_rappels) n'est pas écoutée, comme à l'écran.
  const { error: sansRappels } = await admin.from('crm_rappels').select('id').limit(1)
  for (const a of abonnements(c.uid, sansRappels ? ['crm_rappels'] : [])) {
    canal.on('postgres_changes', { event: a.event, schema: a.schema, table: a.table, filter: a.filter }, (p) => c.evenements.push({ table: a.table, type: p.eventType, nouveau: p.new, a: Date.now() }))
  }
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('abonnement temps réel : délai dépassé')), 15000)
    canal.subscribe((s, err) => { if (s === 'SUBSCRIBED') { clearTimeout(t); resolve() } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') { clearTimeout(t); reject(new Error(`abonnement temps réel : ${s} ${err?.message ?? ''}`)) } })
  })
  c.canaux.push(canal)
  // Deux tables que l'écran N'écoute PAS (crm_notes, crm_journal) : on regarde si, par hasard, elles émettent.
  c.horsListe = []
  const sonde = c.client.channel(`sonde:${c.uid}`)
  for (const table of ['crm_notes', 'crm_journal']) sonde.on('postgres_changes', { event: '*', schema: 'public', table, filter: `artisan_id=eq.${c.uid}` }, (p) => c.horsListe.push({ table, type: p.eventType }))
  await new Promise((r) => { const t = setTimeout(r, 6000); sonde.subscribe((s) => { if (s === 'SUBSCRIBED' || s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') { clearTimeout(t); r() } }) })
  c.canaux.push(sonde)
}
/** Vrai si le client « écran » a reçu l'évènement attendu depuis `depuis` (attend jusqu'à `ms`). */
async function evenement(c, table, type, depuis, ms = 7000, test = () => true) {
  const fin = Date.now() + ms
  while (Date.now() < fin) {
    if (c.evenements.some((e) => e.a >= depuis && e.table === table && (!type || e.type === type) && e.nouveau?.artisan_id === c.uid && test(e))) return true
    await dormir(60)
  }
  return false
}

// ── Ce que les écrans lisent ────────────────────────────────────────────────────────────────────────────────────────
async function lire(c) {
  const vueR = await appel(H.vue.GET, 'GET', '/api/crm/vue', { jeton: c.jeton })
  if (vueR.statut !== 200) throw new Error(`GET /api/crm/vue → ${vueR.statut} ${vueR.texte.slice(0, 200)}`)
  const comptaR = await appel(H.compta.GET, 'GET', '/api/compta/tableau', { jeton: c.jeton })
  if (comptaR.statut !== 200) throw new Error(`GET /api/compta/tableau → ${comptaR.statut} ${comptaR.texte.slice(0, 200)}`)
  const vue = vueR.corps, d = comptaR.corps
  const entrees = { artisanId: c.uid, factures: d.factures, devis: d.devis, demandes: d.demandes, lignes: [], maintenant: new Date(d.maintenant) }
  const rls = c.client
  const [dashLeads, listeDevis, listeFactures] = await Promise.all([
    rls.from('leads').select('id, nom_prospect, contact, message, statut, created_at').eq('artisan_id', c.uid).order('created_at', { ascending: false }),
    rls.from('devis').select('id, numero, objet, client_nom, statut, total_ttc, date_emission').eq('artisan_id', c.uid).order('created_at', { ascending: false }),
    rls.from('factures').select('id, numero, objet, client_nom, statut, total_ttc, date_echeance, avoir_de').eq('artisan_id', c.uid).order('created_at', { ascending: false }),
  ])
  return {
    vue,
    mois: calculerCompta({ ...entrees, periode: 'mois' }),
    an: calculerCompta({ ...entrees, periode: '12mois' }),
    gestion: calculer({ artisanId: c.uid, factures: d.factures, devis: d.devis, demandes: d.demandes, maintenant: new Date(d.maintenant) }),
    dashLeads: dashLeads.data ?? [], listeDevis: listeDevis.data ?? [], listeFactures: listeFactures.data ?? [],
  }
}
const cartes = (vue) => vue.pipeline.colonnes.flatMap((col) => col.cartes.map((x) => ({ ...x, colonne: col.etape })))
const carte = (vue, cle) => cartes(vue).find((x) => x.cle === cle)
const colonne = (vue, etape) => vue.pipeline.colonnes.find((x) => x.etape === etape)
const clientDe = (vue, email) => vue.clients.find((x) => x.email === email)
async function fiche(c, ref) {
  const r = await appel(H.clients.GET, 'GET', `/api/crm/clients?ref=${ref}`, { jeton: c.jeton })
  return r.statut === 200 ? r.corps : null
}
async function ficheChantier(c, id) {
  const r = await appel(H.chantier.GET, 'GET', `/api/crm/chantiers/${id}`, { jeton: c.jeton, params: { id } })
  return r.statut === 200 ? r.corps : null
}
const W = async (c, h, m, chemin, corps, params) => appel(h[m], m, chemin, { jeton: c.jeton, corps, params })

/** Les écritures de POST /api/devis/[id]/envoyer (hors PDF et e-mail) : celle du devis par LA fonction de la route
 *  (lib/devisEnvoi.ts, enregistrerEnvoi), celle de la demande reproduite à l'identique (app/api/devis/[id]/envoyer/route.ts). */
async function envoyerComme(c, devisId, leadId) {
  const { data: d } = await admin.from('devis').select('id, statut, envoye_le, accepte_le').eq('id', devisId).eq('artisan_id', c.uid).single()
  const { error } = await enregistrerEnvoi(d, c.uid)
  if (error) throw new Error(`envoi du devis : ${error.message}`)
  if (leadId) await admin.from('leads').update({ statut: 'repondu', updated_at: new Date().toISOString() }).eq('id', leadId)
}
const LIGNES = [
  { designation: 'Dépose de l’ancien chauffe-eau', quantite: 1, unite: 'u', prix_unitaire_ht: 200, tva_taux: 0 },
  { designation: 'Fourniture et pose chauffe-eau 200 L', quantite: 1, unite: 'u', prix_unitaire_ht: 800, tva_taux: 0 },
]
/** Le corps que l'écran Devis envoie (app/devis/[id]/page.tsx, fonction save). */
const corpsDevis = (o) => ({ objet: o.objet, client_nom: o.client_nom, client_email: o.client_email ?? '', client_adresse: o.client_adresse ?? '', validite_jours: 90, remise_pct: 0, acompte_pct: o.acompte_pct ?? 0, statut: o.statut ?? 'brouillon', lignes: o.lignes ?? LIGNES, ...(o.lead_id ? { lead_id: o.lead_id } : {}) })

const AUTRES_TABLES = ['devis', 'factures', 'leads', 'chantiers', 'chantier_taches', 'chantier_equipe', 'chantier_materiaux', 'materiaux', 'mouvements_stock', 'vehicules', 'equipe_membres', 'commandes_fournisseur', 'crm_notes', 'crm_journal', 'regles_automatisation']

async function nettoyer() {
  for (const c of comptes) {
    for (const k of c.canaux) { try { await c.client.removeChannel(k) } catch { /* déjà fermé */ } }
    try { await c.client.auth.signOut() } catch { /* session déjà fermée */ }
  }
  for (const c of comptes) {
    const { error } = await admin.rpc('purger_compte_test', { p_id: c.uid })
    if (error) console.log(`  ⚠️ purge de ${c.nom} : ${error.message}`)
  }
  let restes = 0
  for (const c of comptes) {
    for (const t of AUTRES_TABLES) {
      const { count, error } = await admin.from(t).select('*', { count: 'exact', head: true }).eq('artisan_id', c.uid)
      if (!error) restes += count ?? 0
    }
    const { count } = await admin.from('artisans').select('*', { count: 'exact', head: true }).eq('id', c.uid)
    restes += count ?? 0
    const { data: u } = await admin.auth.admin.getUserById(c.uid)
    if (u?.user) restes += 1
  }
  console.log(restes === 0 ? '\n🧹 Nettoyage : aucun compte ni aucune ligne de test ne reste.' : `\n⚠️ Nettoyage incomplet : ${restes} élément(s) restent (comptes ${comptes.map((c) => c.email).join(', ')}).`)
  if (restes) ko++
}

// ═════════════════════════════════════════════════════════ LE PARCOURS ═════════════════════════════════════════════════════════
const t0 = Date.now()
try {
  const A = await creerCompte('A'), B = await creerCompte('B')
  await abonner(A)
  console.log(`Comptes de test : ${A.email} et ${B.email} (supprimés à la fin).`)

  // ── 0. Compte vide ────────────────────────────────────────────────────────────────────────────────────────────────
  titre('0. Compte vide : rien nulle part')
  let e = await lire(A)
  T('pipeline vide, aucun client, aucun chantier', e.vue.pipeline.vide && !e.vue.clients.length && !e.vue.chantiers.length)
  T('Mes chiffres : « vide »', e.mois.vide === true)

  // ── 1. La demande ─────────────────────────────────────────────────────────────────────────────────────────────────
  titre('1. Une demande arrive (formulaire de la page de l’artisan)')
  const MAIL1 = 'alice.coherence@presti-test.invalid'
  let depuis = Date.now()
  const { data: lead1, error: eL } = await admin.from('leads').insert({
    artisan_id: A.uid, nom_prospect: 'Mme Alice Cohérence', contact: MAIL1, message: 'Bonjour, mon chauffe-eau fuit, pouvez-vous le remplacer ?',
    canal: 'formulaire', statut: 'nouveau', type_chantier: 'Plomberie', ville: 'Lyon', token: crypto.randomUUID(),
  }).select('id, token').single()
  if (eL) throw new Error(`insertion de la demande : ${eL.message}`)
  e = await lire(A)
  T('CRM pipeline : une carte « Demande » (lead)', carte(e.vue, `lead:${lead1.id}`)?.colonne === 'demande')
  const cl1 = clientDe(e.vue, MAIL1)
  T('CRM clients : Alice existe avec 1 demande', cl1?.demandes === 1, JSON.stringify(e.vue.clients))
  const f1 = cl1 ? await fiche(A, cl1.id) : null
  T('fiche client : la demande y figure', f1?.demandes?.length === 1)
  T('Tableau de bord /dashboard : la demande est listée, statut « nouveau »', e.dashLeads.some((l) => l.id === lead1.id && l.statut === 'nouveau'))
  T('Mes chiffres : 1 demande ce mois (canal formulaire)', e.mois.demandes.total === 1 && e.mois.demandes.parCanal[0]?.libelle)
  T('Mes chiffres (calcul de gestion) : 1 demande dans le graphique', e.gestion.demandes.total === 1)
  T('Atelier : la demande apparaît dans les demandes du jour', (e.vue.atelier.demandes ?? []).length >= 1, JSON.stringify(e.vue.atelier.demandes))
  T('temps réel : évènement « leads » reçu', await evenement(A, 'leads', 'INSERT', depuis))

  // ── 2. Le devis créé depuis la conversation ───────────────────────────────────────────────────────────────────────
  titre('2. Le devis est créé avec « Créer un devis » depuis la demande (l’écran lit ?lead=… puis enregistre)')
  depuis = Date.now()
  // L'écran Devis ouvert par /devis/nouveau?lead=… envoie lead_id à la création (app/devis/[id]/page.tsx, fonction save).
  const rD = await W(A, H.devisCreer, 'POST', '/api/devis', corpsDevis({ objet: 'Remplacement chauffe-eau 200 L', client_nom: 'Mme Alice Cohérence', client_email: MAIL1, acompte_pct: 30, lead_id: lead1.id }))
  T('POST /api/devis : devis créé', rD.statut === 200 && rD.corps?.ok, rD.texte)
  const D1 = rD.corps?.id
  const { data: d1 } = await admin.from('devis').select('id, numero, total_ttc, lead_id, statut, envoye_le, accepte_le, date_emission').eq('id', D1).single()
  T('total du devis = 1 000 € (2 lignes, franchise de TVA)', Number(d1.total_ttc) === 1000, d1.total_ttc)
  T('le devis est RATTACHÉ à la demande dont il vient (lead_id)', d1.lead_id === lead1.id, `lead_id = ${d1.lead_id} : l'écran Devis (app/devis/[id]/page.tsx, save) doit envoyer lead_id et POST /api/devis le poser`, 'C2')
  const rLeadAutre = await W(B, H.devisCreer, 'POST', '/api/devis', corpsDevis({ objet: 'Tentative', client_nom: 'Intrus', lead_id: lead1.id }))
  const { count: devisB } = await admin.from('devis').select('id', { count: 'exact', head: true }).eq('artisan_id', B.uid)
  T('POST /api/devis : la demande d’un AUTRE compte est refusée (404), aucun devis créé', rLeadAutre.statut === 404 && (devisB ?? 0) === 0, `${rLeadAutre.statut} ${rLeadAutre.texte} / devis de B : ${devisB}`, 'C2')
  e = await lire(A)
  T('écran Devis : le devis est listé (brouillon)', e.listeDevis.some((x) => x.id === D1 && x.statut === 'brouillon'))
  T('CRM pipeline : le devis est en « Demande »', carte(e.vue, `devis:${D1}`)?.colonne === 'demande')
  const dossiersDemande = colonne(e.vue, 'demande').cartes.filter((x) => /alice/i.test(x.client ?? ''))
  T('CRM pipeline : UNE seule carte pour le dossier d’Alice (pas la demande ET le devis)', dossiersDemande.length === 1, `${dossiersDemande.length} cartes : ${dossiersDemande.map((x) => x.cle).join(', ')}`, 'C2')
  const cl1b = clientDe(e.vue, MAIL1)
  T('CRM clients : la fiche d’Alice regroupe demande + devis (1 client)', e.vue.clients.length === 1 && cl1b?.devis === 1 && cl1b?.demandes === 1, JSON.stringify(e.vue.clients))
  T('temps réel : évènement « devis » reçu', await evenement(A, 'devis', 'INSERT', depuis))

  // ── 3. Rattachement (ce que fait « Devis auto ») puis envoi ───────────────────────────────────────────────────────
  titre('3. Le devis porte sa demande (posé par POST /api/devis), puis il est envoyé')
  e = await lire(A)
  T('pipeline : une seule carte, le devis, qui porte la demande', !carte(e.vue, `lead:${lead1.id}`) && carte(e.vue, `devis:${D1}`)?.leadId === lead1.id)
  depuis = Date.now()
  await envoyerComme(A, D1, lead1.id)
  e = await lire(A)
  const { data: d1e } = await admin.from('devis').select('statut, envoye_le').eq('id', D1).single()
  T('CRM pipeline : « Devis envoyé », 1 000 €', carte(e.vue, `devis:${D1}`)?.colonne === 'devis_envoye' && colonne(e.vue, 'devis_envoye').montant === cts(1000))
  T('CRM tableau : « devis en attente » = 1 / 1 000 €', e.vue.tableau.devisEnAttente?.nombre === 1 && e.vue.tableau.devisEnAttente?.montant === cts(1000))
  T('Mes chiffres : « devis en attente » identique au CRM', e.mois.devis.enAttente.nombre === e.vue.tableau.devisEnAttente?.nombre && e.mois.devis.enAttente.montant === e.vue.tableau.devisEnAttente?.montant)
  T('la date d’envoi est enregistrée (devis.envoye_le)', !!d1e.envoye_le, `envoye_le = ${d1e.envoye_le} : l'envoi (lib/devisEnvoi.ts, appelé par app/api/devis/[id]/envoyer/route.ts) doit l'écrire`, 'C1')
  T('/dashboard : la demande passe à « repondu »', e.dashLeads.find((l) => l.id === lead1.id)?.statut === 'repondu')
  T('temps réel : évènement « devis » (UPDATE) reçu', await evenement(A, 'devis', 'UPDATE', depuis))

  // ── 4. Acceptation par le client (carte du fil) + facture d'acompte automatique ───────────────────────────────────
  titre('4. Le client accepte depuis la conversation : acceptation, demande gagnée, facture d’acompte automatique (règle 30 %)')
  await admin.from('regles_automatisation').upsert({ artisan_id: A.uid, maillons: { acompte_pct: 30 }, actif: true }, { onConflict: 'artisan_id' })
  depuis = Date.now()
  const rAcc = await appel(H.accepter.POST, 'POST', '/api/conversation/devis', { corps: { token: lead1.token, action: 'accepter' } })
  T('POST /api/conversation/devis : accepté', rAcc.statut === 200 && rAcc.corps?.ok && rAcc.corps?.statut === 'accepte', rAcc.texte)
  const { data: d1a } = await admin.from('devis').select('statut, accepte_le').eq('id', D1).single()
  T('devis « accepté » avec sa date (accepte_le)', d1a.statut === 'accepte' && !!d1a.accepte_le)
  const { data: facs1 } = await admin.from('factures').select('id, numero, total_ttc, statut, acompte_pct, verrouillee, devis_id, objet, date_emission').eq('artisan_id', A.uid)
  const F1 = facs1.find((x) => x.devis_id === D1)
  T('facture d’acompte créée : 300 € (30 % de 1 000 €), émise et scellée', !!F1 && Number(F1.total_ttc) === 300 && F1.statut === 'emise' && F1.verrouillee === true, JSON.stringify(facs1))
  e = await lire(A)
  T('CRM pipeline : « Signé » (l’acompte ne couvre pas le devis)', carte(e.vue, `devis:${D1}`)?.colonne === 'signe')
  T('CRM tableau : « signé ce mois » = 1 / 1 000 €', e.vue.tableau.signeMois?.nombre === 1 && e.vue.tableau.signeMois?.montant === cts(1000))
  T('Mes chiffres : « acceptés » identique au CRM', e.mois.devis.acceptes.nombre === 1 && e.mois.devis.acceptes.montant === cts(1000))
  T('Mes chiffres : facturé ce mois = l’acompte (300 €), impayés = 1 facture de 300 €', e.mois.cartes.facture.total === cts(300) && e.mois.cartes.impayes.nombre === 1 && e.mois.cartes.impayes.total === cts(300), JSON.stringify(e.mois.cartes.facture))
  T('CRM « devis signés sans chantier » : le devis est proposé', e.vue.devisSignesSansChantier.some((x) => x.id === D1))
  T('/dashboard : « Chantiers gagnés » = 1 (la demande est gagnée)', e.dashLeads.filter((l) => l.statut === 'gagne').length === 1)
  T('écran Factures : l’acompte est listé', e.listeFactures.some((x) => x.id === F1?.id && x.statut === 'emise'))
  const cl1c = clientDe(e.vue, MAIL1)
  const f1c = cl1c ? await fiche(A, cl1c.id) : null
  T('fiche client : devis signé, 1 facture, « signé » = 1 000 €', f1c?.factures?.length === 1 && f1c?.signe === cts(1000), JSON.stringify({ f: f1c?.factures?.length, signe: f1c?.signe }))
  T('temps réel : « factures » INSERT et « leads » UPDATE reçus', (await evenement(A, 'factures', 'INSERT', depuis)) && (await evenement(A, 'leads', 'UPDATE', depuis, 4000, (x) => x.nouveau?.statut === 'gagne')))

  // ── 5. Le chantier ────────────────────────────────────────────────────────────────────────────────────────────────
  titre('5. Chantier créé depuis le devis signé, tâches nées des lignes, équipe, camionnette')
  depuis = Date.now()
  const rCh = await W(A, H.chantiers, 'POST', '/api/crm/chantiers', { devis_id: D1, generer_taches: true, date_debut: AUJOURDHUI, date_fin_prevue: jourDecale(5) })
  T('POST /api/crm/chantiers : 201 + 2 tâches', rCh.statut === 201 && rCh.corps?.taches === 2, rCh.texte)
  const CH = rCh.corps?.id
  const rMb = await W(A, H.equipe, 'POST', '/api/crm/equipe', { nom: 'Compagnon Test', role: 'compagnon' })
  const rVh = await W(A, H.vehicules, 'POST', '/api/crm/vehicules', { nom: 'Camionnette Test' })
  const MB = rMb.corps?.id, VH = rVh.corps?.id
  const rPatch = await W(A, H.chantier, 'PATCH', `/api/crm/chantiers/${CH}`, { statut: 'en_cours', equipe: [MB], vehicule_id: VH }, { id: CH })
  T('équipe et camionnette affectées', rMb.statut < 300 && rVh.statut < 300 && rPatch.statut === 200, `${rMb.statut}/${rVh.statut}/${rPatch.statut} ${rPatch.texte}`)
  e = await lire(A)
  T('CRM pipeline : « Chantier »', carte(e.vue, `devis:${D1}`)?.colonne === 'chantier')
  T('CRM : le devis n’est plus proposé comme « signé sans chantier »', !e.vue.devisSignesSansChantier.some((x) => x.id === D1))
  const ligneCh = e.vue.chantiers.find((x) => x.id === CH)
  T('CRM chantiers : le chantier est listé (client, n° de devis, 0 % d’avancement)', ligneCh?.client === 'Mme Alice Cohérence' && !!ligneCh?.devis_numero && ligneCh?.avancement.pct === 0, JSON.stringify(ligneCh))
  T('CRM tableau : 1 chantier actif, pas en retard', e.vue.tableau.chantiers?.actifs === 1 && e.vue.tableau.chantiers?.enRetard?.nombre === 0)
  T('Atelier : le chantier est dans la maquette, le véhicule et le membre aussi', (e.vue.atelier.chantiers ?? []).some((x) => x.id === CH) && (e.vue.atelier.vehicules ?? []).some((x) => x.id === VH) && (e.vue.atelier.membres ?? []).some((x) => x.id === MB))
  let fc = await ficheChantier(A, CH)
  T('fiche chantier : devis, acompte compté, 2 tâches, équipe, camionnette', fc?.devis?.id === D1 && fc?.factures?.length === 1 && fc.factures[0].comptee === true && fc?.taches?.length === 2 && fc?.equipe?.length === 1 && fc?.vehicule?.id === VH, JSON.stringify({ d: fc?.devis?.id, f: fc?.factures?.length, t: fc?.taches?.length, eq: fc?.equipe?.length }))
  // 18/10 : depuis la correction de C3 (facture de SOLDE, acomptes déduits), « Facturer » reste proposé après un acompte : il émet le solde.
  T('fiche chantier : après un acompte seul, « Facturer » propose le SOLDE (acomptes déduits, lib/factureDepuisDevis.ts)', fc?.actions?.facturer?.actif === true && fc?.actions?.facturer?.solde === true, JSON.stringify(fc?.actions?.facturer))
  T('fiche chantier : « Signé le » renseigné', !!fc?.devis?.accepte_le)
  const f1d = await fiche(A, clientDe(e.vue, MAIL1).id)
  T('fiche client : le chantier y figure, avec son « prochain chantier »', f1d?.chantiers?.length === 1 && f1d?.prochainChantier?.id === CH)
  if (f1d?.prochainRendezVous === null) INFO('fiche client : « prochain rendez-vous » toujours vide', 'aucun agenda de rendez-vous n’existe côté artisan (lib/crm/vue.ts, construireFicheClient) : la case ne peut jamais se remplir')
  T('temps réel : « chantiers », « chantier_taches », « chantier_equipe », « vehicules », « equipe_membres » reçus',
    (await evenement(A, 'chantiers', 'INSERT', depuis)) && (await evenement(A, 'chantier_taches', 'INSERT', depuis)) && (await evenement(A, 'chantier_equipe', 'INSERT', depuis)) && (await evenement(A, 'vehicules', 'INSERT', depuis)) && (await evenement(A, 'equipe_membres', 'INSERT', depuis)))
  // Tâche cochée.
  depuis = Date.now()
  const t1 = fc.taches[0]
  const rT = await W(A, H.taches, 'PATCH', `/api/crm/taches/${t1.id}`, { faite: true }, { id: t1.id })
  e = await lire(A)
  T('tâche cochée → avancement 50 % dans la liste, la fiche et le calcul', rT.statut === 200 && e.vue.chantiers.find((x) => x.id === CH)?.avancement.pct === 50 && (await ficheChantier(A, CH))?.avancement.pct === 50)
  T('temps réel : tâche cochée (UPDATE) reçue', await evenement(A, 'chantier_taches', 'UPDATE', depuis, 7000, (x) => x.nouveau?.faite === true))

  // ── 6. Stock et matériel ──────────────────────────────────────────────────────────────────────────────────────────
  titre('6. Inventaire : article, entrée en stock, réservation pour le chantier, sortie, seuil d’alerte, commande fournisseur')
  depuis = Date.now()
  const rArt = await W(A, H.inventaire, 'POST', '/api/inventaire', { nom: 'Chauffe-eau 200 L (test)', unite: 'u', categorie: 'Chauffe-eau', seuil_alerte: 2 })
  const MAT = rArt.corps?.id
  const rEnt = await W(A, H.inventaire, 'POST', '/api/inventaire', { mouvement: { materiau_id: MAT, type: 'entree', quantite: 5, lieu: 'atelier', source: 'manuel', cout_unitaire_ht: 450 } })
  T('article créé + entrée de 5 en stock', rArt.statut === 200 && rEnt.statut === 200 && rEnt.corps?.reste === 5, `${rArt.texte} ${rEnt.texte}`)
  const rRes = await W(A, H.reserver, 'POST', `/api/crm/chantiers/${CH}/materiaux`, { materiau_id: MAT, quantite: 1, lieu: 'atelier' }, { id: CH })
  T('réservation pour le chantier', rRes.statut === 201, rRes.texte)
  e = await lire(A)
  T('CRM atelier : l’article est au dépôt avec 5 en stock', (e.vue.atelier.materiaux ?? []).find((x) => x.id === MAT)?.reste === 5)
  T('CRM tableau : stock bas = 0 article (seuil 2, reste 5), mais la carte existe', e.vue.tableau.stockBas?.nombre === 0)
  const rSort = await W(A, H.reservation, 'PATCH', `/api/crm/materiaux/${rRes.corps?.id}`, { action: 'sortir' }, { id: rRes.corps?.id })
  T('sortie du stock pour le chantier : reste 4', rSort.statut === 200 && rSort.corps?.reste === 4, rSort.texte)
  const { data: mv } = await admin.from('mouvements_stock').select('type, quantite, devis_id').eq('artisan_id', A.uid).eq('materiau_id', MAT).order('cree_le')
  T('le mouvement de sortie est rattaché au devis du chantier', mv?.some((x) => x.type === 'sortie' && x.devis_id === D1), JSON.stringify(mv))
  fc = await ficheChantier(A, CH)
  T('fiche chantier : la réservation est « sortie »', fc?.materiaux?.some((x) => x.materiau_id === MAT && x.statut === 'sorti'), JSON.stringify(fc?.materiaux))
  const rSort2 = await W(A, H.inventaire, 'POST', '/api/inventaire', { mouvement: { materiau_id: MAT, type: 'sortie', quantite: 3, lieu: 'atelier', source: 'manuel' } })
  e = await lire(A)
  const inv = await W(A, H.inventaire, 'GET', '/api/inventaire')
  T('stock sous le seuil (reste 1 ≤ 2) : CRM tableau, Inventaire et Atelier disent la même chose',
    rSort2.corps?.reste === 1 && e.vue.tableau.stockBas?.nombre === 1 && inv.corps?.alertes?.length === 1 && inv.corps.alertes[0].id === e.vue.tableau.stockBas.liste[0].id && (e.vue.atelier.materiaux ?? []).filter(estStockBas).length === 1,
    JSON.stringify({ crm: e.vue.tableau.stockBas, inv: inv.corps?.alertes }))
  const rCmd = await W(A, H.commandes, 'POST', '/api/crm/commandes', { fournisseur: 'Négoce Test', livraison_prevue: jourDecale(3), chantier_id: CH, lignes: [{ materiau_id: MAT, nom: 'Chauffe-eau 200 L (test)', quantite: 4, unite: 'u' }] })
  e = await lire(A)
  T('commande fournisseur créée et visible dans l’Atelier', rCmd.statut === 201 && (e.vue.atelier.commandes ?? []).some((x) => x.id === rCmd.corps?.id), rCmd.texte)
  T('temps réel : « materiaux », « mouvements_stock », « chantier_materiaux », « commandes_fournisseur » reçus',
    (await evenement(A, 'materiaux', 'INSERT', depuis)) && (await evenement(A, 'mouvements_stock', 'INSERT', depuis)) && (await evenement(A, 'chantier_materiaux', 'UPDATE', depuis, 7000, (x) => x.nouveau?.statut === 'sorti')) && (await evenement(A, 'commandes_fournisseur', 'INSERT', depuis)))
  INFO('lien matériel → argent', 'la matière sortie du stock (450 € l’unité à l’entrée) n’apparaît ni sur la fiche chantier, ni dans « Mes chiffres », ni dans une marge : aucun calcul ne rapproche coût du matériel et montant du devis (idée n°1 du plan)')

  // ── 7. Paiement de l'acompte ──────────────────────────────────────────────────────────────────────────────────────
  titre('7. L’acompte est payé (« marquer payée »)')
  depuis = Date.now()
  const rPay = await W(A, H.factureMaj, 'PATCH', `/api/factures/${F1.id}`, { statut: 'payee' }, { id: F1.id })
  const { data: f1p } = await admin.from('factures').select('statut, payee_le').eq('id', F1.id).single()
  T('facture payée, date de règlement posée par la base', rPay.statut === 200 && f1p.statut === 'payee' && f1p.payee_le === AUJOURDHUI, JSON.stringify(f1p))
  e = await lire(A)
  T('Mes chiffres : encaissé ce mois = 300 €, plus aucun impayé', e.mois.cartes.encaisse.total === cts(300) && e.mois.cartes.impayes.nombre === 0)
  T('Mes chiffres (calcul de gestion) : encaissé de l’année = 300 €', e.gestion.argent.encaisseAnnee === 300, e.gestion.argent.encaisseAnnee)
  T('CRM pipeline : le dossier reste en « Chantier » (acompte payé ≠ devis payé)', carte(e.vue, `devis:${D1}`)?.colonne === 'chantier')
  T('fiche chantier : l’acompte est « payée »', (await ficheChantier(A, CH))?.factures?.[0]?.statut === 'payee')
  T('temps réel : « factures » UPDATE reçu', await evenement(A, 'factures', 'UPDATE', depuis, 7000, (x) => x.nouveau?.statut === 'payee'))
  INFO('CRM tableau de bord', 'aucune case « à encaisser / impayés » : la somme due par les clients n’est visible que dans « Mes chiffres » et dans la colonne « À facturer / encaisser » du pipeline')

  // ── 8. Chantier terminé, puis la facture du solde ─────────────────────────────────────────────────────────────────
  titre('8. Chantier terminé, puis facture du solde (« Créer la facture » de l’écran Devis)')
  depuis = Date.now()
  const rFin = await W(A, H.chantier, 'PATCH', `/api/crm/chantiers/${CH}`, { statut: 'termine' }, { id: CH })
  e = await lire(A)
  T('chantier terminé → fin réelle posée, pipeline « À facturer / encaisser » (chantier terminé, pas encore facturé)', rFin.statut === 200 && carte(e.vue, `devis:${D1}`)?.colonne === 'a_facturer' && carte(e.vue, `devis:${D1}`)?.preuve === 'chantier_termine', JSON.stringify(carte(e.vue, `devis:${D1}`)))
  T('CRM tableau : plus aucun chantier actif', e.vue.tableau.chantiers?.actifs === 0)
  const rF2 = await W(A, H.factureCreer, 'POST', '/api/factures', { devis_id: D1 })
  T('POST /api/factures {devis_id} : facture créée', rF2.statut === 200 && rF2.corps?.ok, rF2.texte)
  const F2 = rF2.corps?.id
  const { data: f2 } = await admin.from('factures').select('total_ttc, objet').eq('id', F2).single()
  T('la facture du solde porte 700 € (1 000 € − 300 € d’acompte déjà facturé)', Number(f2.total_ttc) === 700, `la facture porte ${f2.total_ttc} € : elle doit reprendre le devis et déduire l’acompte (lib/factureDepuisDevis.ts, facture de solde)`, 'C3')
  const { data: l2 } = await admin.from('factures_lignes').select('designation, quantite, prix_unitaire_ht').eq('facture_id', F2).order('ordre')
  const deduction = (l2 ?? []).find((l) => /Déduction de l’acompte facturé/.test(l.designation ?? ''))
  T('facture du solde : les 2 lignes du devis, puis « Déduction de l’acompte facturé <n°> » (−1 × 300 €), objet « Solde — … »',
    (l2 ?? []).length === 3 && !!deduction && deduction.designation.includes(F1.numero) && Number(deduction.quantite) === -1 && Number(deduction.prix_unitaire_ht) === 300 && /^Solde — /.test(f2.objet ?? ''),
    JSON.stringify({ objet: f2.objet, lignes: l2 }), 'C3')
  const rF2bis = await W(A, H.factureCreer, 'POST', '/api/factures', { devis_id: D1 })
  T('un second « Créer la facture » ne refait pas le solde (409)', rF2bis.statut === 409, `${rF2bis.statut} ${rF2bis.texte}`, 'C3')
  e = await lire(A)
  T('Mes chiffres : total facturé sur ce devis = 1 000 € (acompte + solde)', e.an.cartes.facture.total === cts(1000), `total facturé = ${e.an.cartes.facture.total / 100} € pour un devis de 1 000 €`, 'C3')
  T('CRM : le dossier passe en « À facturer / encaisser » (facturé, règlement attendu)', carte(e.vue, `devis:${D1}`)?.preuve === 'facture_impayee')
  await W(A, H.factureMaj, 'PATCH', `/api/factures/${F2}`, { statut: 'payee' }, { id: F2 })
  e = await lire(A)
  T('toutes les factures payées → pipeline « Payé »', carte(e.vue, `devis:${D1}`)?.colonne === 'paye')
  T('Mes chiffres : « meilleur client » = 1 000 € (le devis), pas plus', e.an.meilleursClients[0]?.montant === cts(1000), `${(e.an.meilleursClients[0]?.montant ?? 0) / 100} €`, 'C3')
  T('fiche client : 2 factures, « signé » = 1 000 €', (await fiche(A, clientDe(e.vue, MAIL1).id))?.factures?.length === 2)
  T('temps réel : « factures » INSERT (solde) reçu', await evenement(A, 'factures', 'INSERT', depuis))

  // ── 9. Notes ──────────────────────────────────────────────────────────────────────────────────────────────────────
  titre('9. Notes sur le client et le chantier')
  const idAlice = clientDe(e.vue, MAIL1).id
  depuis = Date.now()
  const rN = await W(A, H.notes, 'POST', '/api/crm/notes', { texte: 'Préfère être appelée après 18 h.', client: idAlice })
  const rN2 = await W(A, H.notes, 'POST', '/api/crm/notes', { texte: 'Accès par la cour.', chantier_id: CH })
  T('notes créées (client, chantier)', rN.statut === 201 && rN2.statut === 201, `${rN.texte} ${rN2.texte}`)
  T('fiche client : la note est là', (await fiche(A, idAlice))?.notes?.length === 1)
  await dormir(3500)
  const noteEmise = A.horsListe.some((x) => x.table === 'crm_notes') || A.evenements.some((x) => x.table === 'crm_notes')
  if (!noteEmise) INFO('temps réel : une note créée sur un autre appareil ne prévient pas l’écran', 'crm_notes n’est pas dans la publication supabase_realtime ni dans TABLES_TEMPS_REEL : l’écran la voit au bout de 60 s ou au retour sur l’onglet')

  // ── 10. Le client dont on complète l'e-mail ───────────────────────────────────────────────────────────────────────
  titre('10. Un client connu par son seul nom reçoit son e-mail (obligatoire pour envoyer le devis) : sa fiche et ses notes le suivent-elles ?')
  const rD6 = await W(A, H.devisCreer, 'POST', '/api/devis', corpsDevis({ objet: 'Dépannage fuite', client_nom: 'Mme Sansmail' }))
  const D6 = rD6.corps?.id
  e = await lire(A)
  const sansMail = e.vue.clients.find((x) => /sansmail/i.test(x.nom ?? ''))
  T('le client « Mme Sansmail » existe dans le CRM', !!sansMail, JSON.stringify(e.vue.clients.map((x) => x.nom)))
  const rN3 = await W(A, H.notes, 'POST', '/api/crm/notes', { texte: 'Voisine de Mme Alice, rappeler avant mardi.', client: sansMail?.id })
  T('note posée sur sa fiche', rN3.statut === 201, rN3.texte)
  await W(A, H.devisMaj, 'POST', `/api/devis/${D6}`, corpsDevis({ objet: 'Dépannage fuite', client_nom: 'Mme Sansmail', client_email: 'sansmail@presti-test.invalid' }), { id: D6 })
  e = await lire(A)
  const apres = e.vue.clients.find((x) => /sansmail/i.test(x.nom ?? ''))
  const ficheApres = apres ? await fiche(A, apres.id) : null
  // L'identifiant public suit la clé la plus forte (ici, l'e-mail désormais) : il change. Ce qui ne doit pas changer : l'ancienne
  // adresse de la fiche mène toujours au même client, ses notes s'y affichent, et la purge ne les tient pas pour orphelines.
  const ficheAncienne = sansMail ? await fiche(A, sansMail.id) : null
  T('l’ancien identifiant de la fiche ouvre toujours le même client', !!apres && ficheAncienne?.client?.id === apres.id && ficheAncienne?.devis?.some((x) => x.id === D6) && ficheAncienne?.notes?.length === 1, `fiche par l’ancien identifiant : ${ficheAncienne ? `client ${String(ficheAncienne.client?.id).slice(0, 10)}…, ${ficheAncienne.notes?.length} note(s)` : 'introuvable'}`, 'C4')
  T('la note posée avant l’e-mail est toujours sur la fiche', ficheApres?.notes?.length === 1, `notes visibles : ${ficheApres?.notes?.length ?? 'fiche introuvable'}`, 'C4')
  const parAncien = await W(A, H.notes, 'GET', `/api/crm/notes?client=${sansMail?.id}`)
  const parNouveau = await W(A, H.notes, 'GET', `/api/crm/notes?client=${apres?.id}`)
  T('GET /api/crm/notes : la note se lit par l’ancien ET par le nouvel identifiant', parAncien.corps?.notes?.length === 1 && parNouveau.corps?.notes?.length === 1, `${parAncien.corps?.notes?.length} / ${parNouveau.corps?.notes?.length}`, 'C4')
  // La purge quotidienne (lib/purgesRgpd.ts → notesClientAPurger) rejouée sur ce compte, avec ses vraies pièces.
  const dos = await chargerDossiers(A.uid)
  const groupesA = regrouperClients({ artisanId: A.uid, devis: dos.devis, factures: dos.factures, leads: dos.leads, chantiers: dos.chantiers, carnet: dos.carnet, idDe: idClientPour(A.uid) })
  const { data: notesA } = await admin.from('crm_notes').select('id, client_cle, cree_le, maj_le').eq('artisan_id', A.uid).not('client_cle', 'is', null)
  const purge = notesClientAPurger(notesA ?? [], groupesA, new Date(Date.now() - 3 * 365 * 86_400_000).toISOString())
  T('la purge quotidienne ne supprime pas la note posée avant l’e-mail (elle n’est pas orpheline)', !purge.suspect && !purge.ids.includes(rN3.corps?.id), JSON.stringify(purge), 'C4')
  const rN4 = await W(A, H.notes, 'POST', '/api/crm/notes', { texte: 'Note posée depuis une fiche ouverte avant l’ajout de l’e-mail.', client: sansMail?.id })
  const { data: n4 } = rN4.corps?.id ? await admin.from('crm_notes').select('client_cle').eq('id', rN4.corps.id).single() : { data: null }
  T('une note posée depuis l’ancienne adresse de la fiche est rangée sous l’identifiant ACTUEL', rN4.statut === 201 && n4?.client_cle === apres?.id, `${rN4.statut} ${rN4.texte}`, 'C4')

  // ── 11. Signature à la main ───────────────────────────────────────────────────────────────────────────────────────
  titre('11. Le devis est signé « à la main » (l’artisan choisit « Accepté » dans l’écran Devis, ou l’assistant change le statut)')
  const rD7 = await W(A, H.devisCreer, 'POST', '/api/devis', corpsDevis({ objet: 'Rénovation salle d’eau', client_nom: 'M. Manuel Main', client_email: 'manuel.main@presti-test.invalid', acompte_pct: 30 }))
  const D7 = rD7.corps?.id
  // Un devis préparé le mois dernier et signé aujourd'hui : created_at et date_emission datent d'il y a 40 jours.
  const ilYa40 = new Date(Date.now() - 40 * 86_400_000)
  await admin.from('devis').update({ created_at: ilYa40.toISOString(), date_emission: jourParis(ilYa40) }).eq('id', D7)
  await envoyerComme(A, D7, null)
  const avantAcc = (await lire(A)).mois.devis.acceptes.nombre
  depuis = Date.now()
  const rMain = await W(A, H.devisMaj, 'POST', `/api/devis/${D7}`, corpsDevis({ objet: 'Rénovation salle d’eau', client_nom: 'M. Manuel Main', client_email: 'manuel.main@presti-test.invalid', acompte_pct: 30, statut: 'accepte' }), { id: D7 })
  const { data: d7 } = await admin.from('devis').select('statut, accepte_le').eq('id', D7).single()
  e = await lire(A)
  T('devis marqué « accepté » à la main', rMain.statut === 200 && d7.statut === 'accepte')
  T('la date de signature est enregistrée (accepte_le)', !!d7.accepte_le, `accepte_le = ${d7.accepte_le} : POST /api/devis/[id] n'écrit que le statut (app/api/devis/[id]/route.ts:48)`, 'C5')
  T('Mes chiffres et CRM : « signé ce mois » compte ce devis (signé aujourd’hui)', e.mois.devis.acceptes.nombre === avantAcc + 1 && e.vue.tableau.signeMois?.nombre === avantAcc + 1, `signés ce mois : ${e.mois.devis.acceptes.nombre} (attendu ${avantAcc + 1}) ; faute de accepte_le, le devis est rangé au mois de sa date d’émission (lib/comptaTableau.ts:338)`, 'C5')
  T('CRM pipeline : le devis est en « Signé »', carte(e.vue, `devis:${D7}`)?.colonne === 'signe')
  const { data: facs7 } = await admin.from('factures').select('id').eq('devis_id', D7)
  INFO('signature à la main', `aucune facture d'acompte n'est créée malgré la règle « acompte 30 % » (${facs7?.length ?? 0} facture) : la règle ne se déclenche que sur l'acceptation par le client dans la conversation (app/api/conversation/devis/route.ts:78-90) ; et la demande liée, s'il y en a une, reste « répondu » (pas « gagné »)`)

  // ── 12. Relance due dès l'envoi ───────────────────────────────────────────────────────────────────────────────────
  titre('12. Un devis préparé il y a 20 jours est envoyé aujourd’hui : est-il déjà « à relancer » ?')
  const rD5 = await W(A, H.devisCreer, 'POST', '/api/devis', corpsDevis({ objet: 'Remplacement robinetterie', client_nom: 'M. Relance Récent', client_email: 'relance.recent@presti-test.invalid' }))
  const D5 = rD5.corps?.id
  const ilYa20 = new Date(Date.now() - 20 * 86_400_000)
  await admin.from('devis').update({ created_at: ilYa20.toISOString(), date_emission: jourParis(ilYa20) }).eq('id', D5)
  await envoyerComme(A, D5, null)
  e = await lire(A)
  T('« Relances dues » (CRM) = 0 : le devis vient de partir', e.vue.tableau.relancesDues?.nombre === 0, `relances dues = ${e.vue.tableau.relancesDues?.nombre} : sans envoye_le, le délai part de la date de création du devis (lib/tableau-de-bord/calculer.ts:304-309)`, 'C1')
  T('Mes chiffres (devis à relancer) = 0', e.gestion.aRelancer.total === 0, `à relancer = ${e.gestion.aRelancer.total}`, 'C1')

  // ── 12 bis. Un devis resté sans réponse bien au-delà de sa validité ───────────────────────────────────────────────────
  titre('12 bis. Un devis envoyé il y a 120 jours (validité 90 jours) : le pipeline et la tuile « devis en attente » disent-ils la même chose ?')
  const rD9 = await W(A, H.devisCreer, 'POST', '/api/devis', corpsDevis({ objet: 'Devis oublié', client_nom: 'M. Oublié', client_email: 'oublie@presti-test.invalid' }))
  const D9 = rD9.corps?.id
  const ilYa120 = new Date(Date.now() - 120 * 86_400_000)
  await admin.from('devis').update({ created_at: ilYa120.toISOString(), date_emission: jourParis(ilYa120) }).eq('id', D9)
  await envoyerComme(A, D9, null)
  // Envoyé il y a 120 jours : la date d'envoi est remise à ce jour-là (l'envoi vient de poser « aujourd'hui »).
  await admin.from('devis').update({ envoye_le: ilYa120.toISOString() }).eq('id', D9)
  // Le passage quotidien (app/api/cron/relances → lib/devisExpiration.ts), restreint à ce compte de test.
  const exp = await expirerDevisDepasses({ artisanId: A.uid })
  const { data: d9 } = await admin.from('devis').select('statut').eq('id', D9).single()
  T('passage quotidien : le devis dépassé passe à « expiré » (et lui seul)', exp.expires === 1 && d9.statut === 'expire' && !exp.erreurs.length, JSON.stringify({ exp, statut: d9.statut }), 'C8')
  const { data: j9 } = await admin.from('crm_journal').select('champ, de, vers, origine').eq('artisan_id', A.uid).eq('objet_id', D9)
  T('l’expiration est tracée dans le journal du CRM (origine « systeme »)', (j9 ?? []).some((x) => x.champ === 'statut' && x.vers === 'expire' && x.origine === 'systeme'), JSON.stringify(j9), 'C8')
  e = await lire(A)
  const colEnvoye = colonne(e.vue, 'devis_envoye')
  T('le total de la colonne « Devis envoyé » = la tuile « devis en attente » (hors devis dépassés)', colEnvoye.montant === (e.vue.tableau.devisEnAttente?.montant ?? 0), `colonne : ${colEnvoye.montant / 100} € (${colEnvoye.cartes.length} cartes), tuile : ${(e.vue.tableau.devisEnAttente?.montant ?? 0) / 100} € (${e.vue.tableau.devisEnAttente?.nombre}) — aucun code ne passe un devis envoyé à « expiré » tout seul ; la colonne le garde pour toujours, la tuile l'écarte après sa validité (etapeDevis dans lib/crm/pipeline.ts, ligne « s === 'envoye' », contre lib/comptaTableau.ts:341-345)`, 'C8')

  // ── 13. Facture d'un brouillon ────────────────────────────────────────────────────────────────────────────────────
  titre('13. « Créer la facture » sur un devis qui n’est pas signé')
  const rD8 = await W(A, H.devisCreer, 'POST', '/api/devis', corpsDevis({ objet: 'Devis jamais signé', client_nom: 'Mme Brouillon', client_email: 'brouillon@presti-test.invalid' }))
  const D8 = rD8.corps?.id
  const { data: cpt8a } = await admin.from('artisans').select('compteur_facture').eq('id', A.uid).single()
  const rF8 = await W(A, H.factureCreer, 'POST', '/api/factures', { devis_id: D8 })
  const { data: cpt8b } = await admin.from('artisans').select('compteur_facture').eq('id', A.uid).single()
  const { count: fac8 } = await admin.from('factures').select('id', { count: 'exact', head: true }).eq('devis_id', D8)
  T('la facture d’un devis non signé est refusée (409), sans facture ni numéro consommé', rF8.statut === 409 && (fac8 ?? 0) === 0 && cpt8a?.compteur_facture === cpt8b?.compteur_facture, `${rF8.statut} ${rF8.texte} / factures : ${fac8} / compteur ${cpt8a?.compteur_facture} → ${cpt8b?.compteur_facture}`, 'C6')
  T('le refus dit pourquoi (devis non signé)', /pas signé/.test(rF8.corps?.error ?? ''), rF8.corps?.error, 'C6')

  // ── 13 bis. L'avoir qui annule une facture ─────────────────────────────────────────────────────────────────────────
  titre('13 bis. Un devis signé à la main, facturé, puis annulé par un avoir : tous les écrans reviennent à leur valeur d’avant')
  const rD10 = await W(A, H.devisCreer, 'POST', '/api/devis', corpsDevis({ objet: 'Devis signé puis annulé', client_nom: 'Mme Avoir', client_email: 'avoir@presti-test.invalid' }))
  const D10 = rD10.corps?.id
  await W(A, H.devisMaj, 'POST', `/api/devis/${D10}`, corpsDevis({ objet: 'Devis signé puis annulé', client_nom: 'Mme Avoir', client_email: 'avoir@presti-test.invalid', statut: 'accepte' }), { id: D10 })
  const avantFacture = (await lire(A)).an.cartes.facture.total
  const rF10 = await W(A, H.factureCreer, 'POST', '/api/factures', { devis_id: D10 })
  T('la facture d’un devis signé à la main se crée (1 000 €)', rF10.statut === 200 && (await lire(A)).an.cartes.facture.total === avantFacture + cts(1000), rF10.texte)
  if (rF10.statut === 200) {
    const avantAvoir = (await lire(A)).an.cartes.facture.total
    const rAv = await W(A, H.avoir, 'POST', `/api/factures/${rF10.corps.id}/avoir`, { motif: 'test de cohérence' }, { id: rF10.corps.id })
    e = await lire(A)
    T('avoir émis', rAv.statut === 200, rAv.texte)
    T('Mes chiffres : la facture et son avoir s’annulent (facturé − 1 000 €)', e.an.cartes.facture.total === avantAvoir - cts(1000), `avant ${avantAvoir / 100} €, après ${e.an.cartes.facture.total / 100} €`)
    T('écran Factures : la facture est « annulée », l’avoir est listé', e.listeFactures.some((x) => x.id === rF10.corps.id && x.statut === 'annulee') && e.listeFactures.some((x) => x.avoir_de === rF10.corps.id))
  }

  // ── 14. Le pipeline à la main + le journal ────────────────────────────────────────────────────────────────────────
  titre('14. Déplacement manuel d’une carte du pipeline')
  const avantJ = A.horsListe.filter((x) => x.table === 'crm_journal').length
  const rMv = await W(A, H.pipeline, 'POST', '/api/crm/pipeline', { objet: 'devis', id: D8, vers: 'signe' })
  e = await lire(A)
  T('le déplacement est pris en compte au rechargement', rMv.statut === 200 && carte(e.vue, `devis:${D8}`)?.colonne === 'signe' && carte(e.vue, `devis:${D8}`)?.manuel === true, rMv.texte)
  await dormir(2500)
  INFO('déplacement manuel et temps réel', `crm_journal n'est pas écouté : ${A.horsListe.filter((x) => x.table === 'crm_journal').length - avantJ} évènement reçu ; un second appareil ne voit le déplacement qu'après sa relecture de 60 s`)

  // ── 15. Isolation entre comptes ───────────────────────────────────────────────────────────────────────────────────
  titre('15. Isolation : le compte B ne voit rien du compte A')
  const eB = await lire(B)
  T('B : pipeline vide, aucun client, aucun chiffre', eB.vue.pipeline.vide && !eB.vue.clients.length && eB.mois.vide === true)

  // ── 15 bis. Un compte très actif ───────────────────────────────────────────────────────────────────────────────────
  titre('15 bis. Un compte très actif (1 010 demandes) : « Mes chiffres » les voit-il toutes, ou le dit-il ?')
  const lots = []
  for (let i = 0; i < 1010; i++) lots.push({ artisan_id: B.uid, nom_prospect: `Prospect ${i}`, contact: `p${i}@presti-test.invalid`, message: 'x', canal: 'formulaire', statut: 'nouveau', token: crypto.randomUUID() })
  for (let i = 0; i < lots.length; i += 500) { const { error: eIns } = await admin.from('leads').insert(lots.slice(i, i + 500)); if (eIns) throw new Error(`insertion en masse : ${eIns.message}`) }
  const rMax = await appel(H.compta.GET, 'GET', '/api/compta/tableau', { jeton: B.jeton })
  T('GET /api/compta/tableau rend les 1 010 demandes', rMax.corps?.demandes?.length === 1010, `${rMax.corps?.demandes?.length} demandes rendues, tronque = ${rMax.corps?.tronque} : la route demande .limit(2000) mais le serveur coupe à 1 000 lignes sans erreur (même piège que celui décrit dans lib/crm/serveur.ts:80-83) ; le drapeau « tronque » ne se lève que si 2 000 lignes reviennent`, 'C7')
  const rVueMax = await appel(H.vue.GET, 'GET', '/api/crm/vue', { jeton: B.jeton })
  T('GET /api/crm/vue (lecture par pages) voit les 1 010 demandes', rVueMax.statut === 200 && rVueMax.corps.clients.length === 1010, `${rVueMax.corps?.clients?.length} clients`)

  // ── 16. Temps réel : bilan par table ──────────────────────────────────────────────────────────────────────────────
  titre('16. Temps réel : bilan des tables')
  const vus = new Map()
  for (const x of A.evenements) vus.set(x.table, (vus.get(x.table) ?? 0) + 1)
  for (const t of TABLES_TEMPS_REEL) console.log(`     ${vus.has(t) ? '✓' : '·'} ${t.padEnd(22)} ${vus.get(t) ?? 0} évènement(s)`)
  const ecrites = ['devis', 'factures', 'leads', 'chantiers', 'chantier_taches', 'chantier_equipe', 'chantier_materiaux', 'materiaux', 'mouvements_stock', 'vehicules', 'equipe_membres', 'commandes_fournisseur']
  T('chaque table écrite pendant le parcours a émis au moins un évènement', ecrites.every((t) => vus.has(t)), ecrites.filter((t) => !vus.has(t)).join(', '))
  INFO('tables écrites par le parcours mais absentes de la publication', 'crm_notes, crm_journal, clients (carnet), regles_automatisation, relances_impayes* : aucune ne déclenche de relecture instantanée')
  INFO('autres écrans lus sous RLS', 'les pages Devis, Factures et Tableau de bord /dashboard relisent à l’ouverture seulement : aucun abonnement temps réel, une modification faite sur un autre appareil n’y apparaît qu’au rechargement')

  console.log(`\nDurée : ${((Date.now() - t0) / 1000).toFixed(0)} s`)
} catch (err) {
  console.log(`\n⛔ ${err.stack || err.message}`)
  ko++
} finally {
  await nettoyer().catch((x) => { console.log(`⚠️ nettoyage : ${x.message}`); ko++ })
}

console.log(`\n══ ${ok} vérification(s) vertes, ${ko} rouge(s) ══`)
if (CASSURES.length) {
  const ids = [...new Set(CASSURES.map((c) => c.id))]
  console.log(`Cassures distinctes : ${ids.join(', ')}`)
  for (const id of ids) console.log(`  ${id} :\n${CASSURES.filter((c) => c.id === id).map((c) => `     - ${c.titre} → ${c.detail}`).join('\n')}`)
}
if (CONSTATS.length) { console.log('\nConstats :'); for (const c of CONSTATS) console.log(`  - ${c}`) }
process.exit(ko ? 1 : 0)
