#!/usr/bin/env node
// scripts/securite-assistant-0211-qa.mjs — juge des trois brèches de la liste §3.2 « ce qui ne s'automatise jamais » (prompt de Benj
// du 01/11, plans/011-cadrage-01-11/prompts-benj/p3-assistant.md, annexe 2 : « Envoyer un devis signé ou modifier un prix sans source ;
// encaisser, rembourser ou toucher un moyen de paiement ; […] supprimer des données ; parler au nom de l'artisan sur un sujet
// d'escalade (litige, sinistre, « fuite », menace, avocat) […]. Ces gestes restent des cartes, toujours. »), trouvées dans le code en
// production la nuit du 01 au 02/11 :
//  A. le mode « fait tout seul » de l'assistant (29/10) exécutait d'office l'encaissement, l'émission d'une facture, les suppressions et
//     le lot de prix ; et une simple QUESTION (« Quels devis dois-je relancer ? ») ouvrait ce mode ;
//  B. la règle « tout auto » envoyait un devis chiffré par l'IA sans relire la provenance de ses prix ;
//  C. le pilote automatique ne relisait pas, au départ, les messages du client : un litige, un sinistre, un avocat… partaient seuls.
//  B bis (S5, trouvée en vérifiant) : l'acompte d'une règle s'émettait SEUL à l'acceptation du devis, sans verrou d'offre (un compte
//     Studio l'obtenait en écrivant sa règle depuis le navigateur). Verrou posé ; et, décision de Benj du 02/11, l'artisan d'une offre
//     qui a les règles choisit : la facture part seule (par défaut, comme avant) ou elle est préparée et il l'émet d'un clic.
// Reprise du 02/11 après l'audit offensif 032-001 (« ne tient pas ») : D1, un devis au prix estimé envoyé d'office (A3) ; D2, une
// négation, une hésitation ou un fait passé lus comme un ordre (A2 bis) ; D3, la conversation illisible lue « rien à escalader » (C3k-m) ;
// D5, les synonymes du lexique d'escalade (C4) ; D6, la relance de conversation validée sans relire le registre (C5).
// Chaque correctif a son essai, ET l'essai est rejoué sur un MUTANT (le code avec le correctif retiré, copié dans un dossier
// temporaire, imports relatifs repointés vers les vrais fichiers) : le juge doit y voir la brèche — sinon il ne prouve rien.
// Gratuit : sans réseau (fetch remplacé par une doublure de PostgREST ; toute autre adresse lève), sans base, sans modèle, sans e-mail.
// Aucune donnée réelle : comptes, conversations et montants inventés pour l'essai.
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/securite-assistant-0211-qa.mjs
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { register } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
// Les paquets de node_modules s'importent sans extension dans Next (next/server) : ici, next/server.js (comme scripts/assistant-tout-qa.mjs).
register(`data:text/javascript,${encodeURIComponent("export async function resolve(spec, ctx, next) { if (spec.startsWith('next/') && !spec.slice(5).includes('.') && !spec.slice(5).includes('/')) return next(spec + '.js', ctx); return next(spec, ctx) }")}`)

process.removeAllListeners('warning')
process.on('warning', (w) => { if (w.code !== 'MODULE_TYPELESS_PACKAGE_JSON' && w.name !== 'ExperimentalWarning') console.error(w) })
// Une base qui n'existe pas : lib/supabaseAdmin lit ces variables à l'import ; aucune clé réelle, aucun e-mail possible.
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://base.test'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-essai'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-essai'
delete process.env.RESEND_API_KEY

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rouges = []
let verts = 0
const ok = (nom, cond, detail = '') => { if (cond) verts++; else rouges.push(nom); console.log(`${cond ? 'PASS' : 'FAIL'} ${nom}${cond || !detail ? '' : ' — ' + String(detail).slice(0, 500)}`) }
const lire = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8').replace(/\r\n/g, '\n')
const imp = (rel) => import(pathToFileURL(path.join(RACINE, rel)).href)

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
// Un profil complet pour l'essai (mentions bloquantes remplies) : valeurs inventées.
const PROFIL_A = {
  id: A, plan: 'signature', is_founder: false, nom: 'Atelier Essai', email: 'atelier@essai.test', metier: 'Plombier', forme_juridique: 'EI',
  siret: '12345678900011', adresse: '1 rue de l’Essai', code_postal: '17000', ville: 'Essai-sur-Mer', tel_public: null, email_public: 'contact@essai.test',
  tva_num: null, assurance_nom: 'Assureur Essai', assurance_contrat: '0001', assurance_activites: 'plomberie', assurance_zone: 'France',
  zone_intervention: 'Essai-sur-Mer', mediateur_nom: 'Médiateur Essai', mediateur_url: null, leads_pause: false, plateforme_active: true,
}

// ═══════════════════════ La doublure de PostgREST (fetch remplacé AVANT tout import du projet) ═══════════════════════
const T = {}
const requetes = []
const valeur = (v) => decodeURIComponent(v)
function cond(champ, brut) {
  let v = brut, non = false
  if (v.startsWith('not.')) { non = true; v = v.slice(4) }
  const [op, ...r] = v.split('.'); const x = valeur(r.join('.'))
  let res
  if (op === 'eq') res = String(champ) === x
  else if (op === 'neq') res = String(champ) !== x
  else if (op === 'is') res = x === 'null' ? champ === null || champ === undefined : String(champ) === x
  else if (op === 'in') res = x.replace(/^\(|\)$/g, '').split(',').map((s) => s.replace(/^"|"$/g, '')).includes(String(champ))
  else if (op === 'gte') res = String(champ) >= x
  else if (op === 'lte') res = String(champ) <= x
  else if (op === 'gt') res = String(champ) > x
  else if (op === 'lt') res = String(champ) < x
  else if (op === 'ilike') res = new RegExp('^' + x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$', 'i').test(String(champ))
  else res = true
  return non ? !res : res
}
const ORDRE = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'])
const correspond = (ligne, params) => params.every(([k, v]) => (k === 'or'
  ? v.replace(/^\(|\)$/g, '').split(',').some((c) => { const [col, ...reste] = c.split('.'); return cond(ligne[col], reste.join('.')) })
  : cond(ligne[k], v)))
const entete = (h, k) => (h ? (typeof h.get === 'function' ? h.get(k) : h[k] ?? h[k.toLowerCase()] ?? Object.entries(h).find(([x]) => x.toLowerCase() === k.toLowerCase())?.[1]) : undefined)
const reseau = { interceptes: 0, refuses: [] }
/** Tables dont la LECTURE tombe en panne (HTTP 500) pendant un essai : pour prouver qu'une lecture en erreur ne laisse rien partir. */
const PANNES = new Set()
globalThis.fetch = async (entree, init = {}) => {
  const url = new URL(typeof entree === 'string' ? entree : entree.url ?? String(entree))
  if (url.hostname !== 'base.test') { reseau.refuses.push(url.host); throw new Error(`réseau interdit dans ce juge : ${url.host}`) }
  reseau.interceptes++
  const methode = String(init.method ?? 'GET').toUpperCase()
  const rep = (corps, statut = 200, h = {}) => new Response(corps === undefined ? null : JSON.stringify(corps), { status: statut, headers: { 'content-type': 'application/json', ...h } })
  if (url.pathname.startsWith('/rest/v1/rpc/')) { requetes.push({ methode, table: 'rpc', url, params: [] }); return rep(true) }
  if (!url.pathname.startsWith('/rest/v1/')) return rep({ message: 'hors doublure' }, 404)
  const table = url.pathname.slice('/rest/v1/'.length)
  const lignes = (T[table] ??= [])
  const params = [...url.searchParams].filter(([k]) => !ORDRE.has(k))
  requetes.push({ methode, table, url, params })
  const prefer = String(entete(init.headers, 'Prefer') ?? '')
  const corps = init.body ? JSON.parse(init.body) : null
  const plage = (n) => ({ 'content-range': `0-${Math.max(0, n - 1)}/${n}` })
  if (methode === 'GET' || methode === 'HEAD') {
    if (PANNES.has(table)) return rep({ code: 'XX000', message: `panne de lecture (essai) : ${table}` }, 500)
    let r = lignes.filter((l) => correspond(l, params))
    const ordre = url.searchParams.get('order')
    if (ordre) {
      const [col, sens] = ordre.split(',')[0].split('.')
      r = [...r].sort((x, y) => (String(x[col] ?? '') < String(y[col] ?? '') ? -1 : String(x[col] ?? '') > String(y[col] ?? '') ? 1 : 0) * (sens === 'desc' ? -1 : 1))
    }
    const lim = url.searchParams.get('limit'); if (lim) r = r.slice(0, Number(lim))
    if (String(entete(init.headers, 'Accept') ?? '').includes('vnd.pgrst.object')) return r.length === 1 ? rep(r[0]) : rep({ code: 'PGRST116', message: 'no rows' }, 406)
    return methode === 'HEAD' ? new Response(null, { status: 200, headers: plage(r.length) }) : rep(r, 200, plage(r.length))
  }
  if (methode === 'PATCH') {
    const r = lignes.filter((l) => correspond(l, params)); for (const l of r) Object.assign(l, corps)
    return prefer.includes('return=representation') ? rep(r) : rep(undefined, 204)
  }
  if (methode === 'DELETE') { const r = lignes.filter((l) => correspond(l, params)); T[table] = lignes.filter((l) => !r.includes(l)); return rep(r) }
  if (methode === 'POST') {
    const sortie = []
    for (const n of Array.isArray(corps) ? corps : [corps]) { const neuf = { ...n }; if (neuf.id === undefined) neuf.id = id(7000 + lignes.length); lignes.push(neuf); sortie.push(neuf) }
    if (prefer.includes('return=representation') && String(entete(init.headers, 'Accept') ?? '').includes('vnd.pgrst.object')) return rep(sortie[0])
    return prefer.includes('return=representation') ? rep(sortie) : rep(undefined, 201)
  }
  return rep({ message: 'méthode' }, 405)
}
const vider = () => { for (const k of Object.keys(T)) delete T[k]; requetes.length = 0 }
/** Les écritures (hors compteurs rpc) faites depuis l'indice n du journal des requêtes. */
const ecrituresDepuis = (n) => requetes.slice(n).filter((q) => q.table !== 'rpc' && !['GET', 'HEAD'].includes(q.methode)).map((q) => `${q.methode} ${q.table}`)

// ═══════════════════════ Les MUTANTS : le correctif retiré, dans un dossier temporaire ═══════════════════════
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'presti-mutants-0211-'))
let nCopies = 0
/**
 * Une COPIE de `rel` hors du dépôt, imports relatifs repointés vers les vrais fichiers. `remplacer` : les mutations (chaque motif DOIT
 * exister, sinon le mutant serait l'original et ne prouverait rien). `doublures` : des imports remplacés par un module minimal — pour
 * charger hors de Next un module qui tire un composant .tsx sans rapport avec ce qui est essayé (le code essayé reste inchangé).
 */
async function copie(rel, { remplacer = [], doublures = {} } = {}) {
  let code = lire(rel)
  for (const [avant, apres] of remplacer) {
    if (!code.includes(avant)) throw new Error(`copie de ${rel} : motif introuvable « ${avant.slice(0, 80)} »`)
    code = code.replace(avant, apres)
  }
  for (const [spec, contenu] of Object.entries(doublures)) {
    if (!code.includes(`from '${spec}'`)) throw new Error(`copie de ${rel} : import introuvable « ${spec} »`)
    const f = path.join(TMP, `doublure-${++nCopies}.ts`)
    fs.writeFileSync(f, contenu)
    code = code.split(`from '${spec}'`).join(`from '${pathToFileURL(f).href}'`)
  }
  const dir = path.dirname(path.join(RACINE, rel))
  code = code.replace(/(from\s+|import\s*\()(['"])(\.{1,2}\/[^'"]+)\2/g, (_m, a, q, spec) => `${a}${q}${pathToFileURL(path.resolve(dir, spec)).href}${q}`)
  const f = path.join(TMP, `${path.basename(rel, '.ts')}-copie-${++nCopies}.ts`)
  fs.writeFileSync(f, code)
  return import(pathToFileURL(f).href)
}
const mutant = (rel, avant, apres) => copie(rel, { remplacer: [[avant, apres]] })

try {
  // ── Les modules (après l'environnement et la doublure)
  const R = await imp('lib/pilote/regles.ts')
  const { traiterFile } = await imp('lib/pilote/file.ts')
  const cadrage = await imp('lib/assistant/cadrage.ts')
  const oa = await imp('lib/assistant/outils-actions.ts')
  const conf = await imp('lib/assistant/confirmation.ts')
  const srvMod = await imp('lib/assistant/actions-serveur.ts')
  const RS = await imp('lib/reglesServeur.ts')
  const { PREREGLAGES } = await imp('lib/regles.ts')
  const legal = await imp('lib/legalArtisan.ts')
  const { CONFIG_DEFAUT } = await imp('lib/plateformeConfig.ts')
  // lib/pilote/executeur.ts tire lib/envoisPdfServeur.ts → lib/DevisPDF.tsx (JSX, illisible par Node) : la copie le remplace par une
  // doublure qui lève. Ni carteDe ni escalade ne l'utilisent ; leur code est celui du fichier, à l'octet.
  const EXE = await copie('lib/pilote/executeur.ts', { doublures: { '@/lib/envoisPdfServeur': "export async function envoyerDevisServeur(): Promise<never> { throw new Error('doublure : aucun PDF dans ce juge') }\nexport async function envoyerFactureServeur(): Promise<never> { throw new Error('doublure : aucun PDF dans ce juge') }\n" } })

  // ═══════════════════════ A. Le mode « fait tout seul » de l'assistant ═══════════════════════
  console.log('\n── A1. Les gestes §3.2 restent une carte, même demandés par l’artisan (fait tout seul)')
  const JAMAIS = ['marquer_facture_payee', 'creer_facture', 'creer_facture_libre', 'rembourser', 'payer', 'creer_avoir', 'supprimer_devis_brouillon', 'supprimer_tarif', 'supprimer_article', 'augmenter_tarifs']
  ok('A1a une seule liste (lib/pilote/regles.ts OUTILS_JAMAIS_AUTO) : argent, factures (avec la facture SANS devis), suppressions (avec l’article), lot de prix',
    JSON.stringify([...R.OUTILS_JAMAIS_AUTO].sort()) === JSON.stringify([...JAMAIS].sort()) && JAMAIS.every((o) => R.jamaisAutomatique(o)), R.OUTILS_JAMAIS_AUTO.join(','))
  ok('A1b le pilote lit la MÊME liste : creer_facture_libre et supprimer_article ne sont ni pilotables ni « auto » (motif jamais_auto)',
    ['creer_facture_libre', 'supprimer_article'].every((o) => R.typePiloteDeOutil(o) === null && R.decisionPilote({ drapeau: true, plan: 'signature', reglages: { actif: true, types: { envoi_facture: true } }, type: 'envoi_facture', outil: o, partiesDepuis24h: 0 }).motif === 'jamais_auto'))
  ok('A1c chaque geste a sa raison dite à l’artisan : argent, comptabilité scellée, suppression, prix en lot ; un geste ordinaire n’en a pas',
    /argent/.test(R.raisonJamaisAuto('marquer_facture_payee')) && /comptabilit/.test(R.raisonJamaisAuto('creer_facture_libre')) && /comptabilit/.test(R.raisonJamaisAuto('creer_facture'))
    && /suppression/.test(R.raisonJamaisAuto('supprimer_article')) && /prix en lot/.test(R.raisonJamaisAuto('augmenter_tarifs')) && R.raisonJamaisAuto('envoyer_facture') === null)
  const CATALOGUE_JAMAIS = JAMAIS.filter((o) => oa.NOMS_ACTIONS.includes(o))
  ok('A1d les gestes §3.2 du catalogue de l’assistant sont tous « à confirmer » (aucune action directe ne les contourne)', CATALOGUE_JAMAIS.length >= 7 && CATALOGUE_JAMAIS.every((o) => oa.categorieDe(o) === 'confirmation'), CATALOGUE_JAMAIS.join(','))

  // Le monde de l'essai : le compte A (profil complet), un devis brouillon, un devis signé, une facture émise, un tarif, un article.
  const mondeA = () => {
    vider()
    Object.assign(T, {
      artisans: [{ ...PROFIL_A }],
      devis: [
        { id: id(11), artisan_id: A, numero: 'DEV-2026-0011', statut: 'brouillon', objet: 'Essai brouillon', client_nom: 'M. Essai', client_email: 'client@essai.test', client_adresse: null, total_ht: 100, total_tva: 10, total_ttc: 110, remise_pct: 0, acompte_pct: 0, validite_jours: 90, conditions: null, notes: null, lead_id: null, envoye_le: null },
        { id: id(12), artisan_id: A, numero: 'DEV-2026-0012', statut: 'accepte', objet: 'Essai signé', client_nom: 'Mme Essai', client_email: 'cliente@essai.test', client_adresse: null, total_ht: 1000, total_tva: 100, total_ttc: 1100, remise_pct: 0, acompte_pct: 0, validite_jours: 90, conditions: null, notes: null, lead_id: null, envoye_le: '2026-10-01T10:00:00Z' },
      ],
      factures: [{ id: id(21), artisan_id: A, numero: 'FAC-2026-0021', statut: 'emise', objet: 'Dépannage', client_nom: 'M. Essai', client_email: 'client@essai.test', total_ttc: 220, date_echeance: '2026-10-01', avoir_de: null, devis_id: null }],
      prix_artisan: [{ id: id(31), artisan_id: A, designation: 'Main d’œuvre', unite: 'h', prix_ht: 45, tva_taux: 10, actif: true, fournisseur: null, reference: null, date_prix: '2026-10-01' }],
      materiaux: [{ id: id(41), artisan_id: A, nom: 'Colle carrelage', unite: 'sac', seuil_alerte: 2, stock: [{ lieu: 'atelier', quantite: 5 }] }],
      assistant_journal: [],
    })
  }
  const ENTREES = {
    marquer_facture_payee: { numero: 'FAC-2026-0021' },
    creer_facture: { devis_numero: 'DEV-2026-0012' },
    creer_facture_libre: { client_nom: 'M. Essai', objet: 'Dépannage fuite', lignes: [{ designation: 'Déplacement', quantite: 1, prix_unitaire_ht: 45 }], tva_taux: 10 },
    supprimer_devis_brouillon: { numero: 'DEV-2026-0011' },
    supprimer_tarif: { tarif_id: id(31) },
    supprimer_article: { article: 'Colle carrelage' },
    augmenter_tarifs: { pourcentage: 5 },
  }
  const vrai = (nom, entree) => { const v = oa.validerAction(nom, entree); if (!v.ok) throw new Error(`${nom} : ${v.erreur}`); return v.entree }
  /** Fait jouer chaque geste §3.2 du catalogue, DEMANDÉ par l'artisan (autonome = vrai), avec la fabrique d'actions `mod`. */
  async function jouerGestes(mod, autonome = true) {
    mondeA()
    const appels = [], factures = [], piloteAppels = []
    const deps = {
      appeler: async (_g, chemin, o = {}) => { appels.push({ chemin, methode: o.methode ?? (o.corps === undefined ? 'GET' : 'POST') }); return { status: 200, json: { ok: true } } },
      envoyerFacture: async () => new Response('{}'),
      creerFacture: async (p) => { factures.push(p); return { ok: true, id: id(97), numero: 'FAC-2026-0042' } },
      simulerFacture: async () => ({ ok: true, simulation: true, type: 'standard', total_ht: 45, total_tva: 4.5, total_ttc: 49.5, deduites: [] }),
      envoyerMail: async () => { throw new Error('aucun e-mail dans ce juge') },
      piloterCarte: async (uid, fiche) => { piloteAppels.push(fiche.outil); return null },
      maintenant: () => new Date('2026-11-02T09:00:00Z'),
    }
    const magasin = conf.magasinEnMemoire()
    const srv = mod.actionsDeSession({ uid: A, jeton: 'jeton-essai', origine: 'http://localhost', isFounder: false, crm: false, meilleursClients: false, conversationId: id(900), tour: () => 1, magasin, dependances: deps, autonome: () => autonome })
    const res = {}
    for (const nom of Object.keys(ENTREES)) {
      const n = requetes.length, a = appels.length, f = factures.length
      const r = await srv.executeurs[nom](vrai(nom, ENTREES[nom]))
      res[nom] = { r, ecritures: ecrituresDepuis(n), routes: appels.slice(a), factures: factures.length - f }
    }
    return { res, appels, factures, piloteAppels, srv, deps, magasin }
  }
  const faitDOffice = (x) => x.r.donnees?.fait_tout_seul === true || x.ecritures.length > 0 || x.routes.length > 0 || x.factures > 0
  const reel = await jouerGestes(srvMod, true)
  const gestes = Object.keys(ENTREES)
  const executes = gestes.filter((g) => faitDOffice(reel.res[g]))
  ok(`A1e DEMANDÉS par l’artisan (fait tout seul vrai) : les ${gestes.length} gestes §3.2 du catalogue restent une CARTE « en attente » — rien d’écrit, aucune route, aucune facture émise`,
    executes.length === 0 && gestes.every((g) => reel.res[g].r.carte?.statut === 'en_attente' && reel.res[g].r.carte?.mode === 'confirmation' && reel.res[g].r.donnees?.en_attente_de_confirmation === true),
    `exécutés d’office : ${executes.join(', ')} ; ${gestes.map((g) => `${g}=${reel.res[g].r.carte?.statut ?? reel.res[g].r.resultat}`).join(' ')}`)
  ok('A1f le résultat de l’outil dit au modèle qu’une carte attend le clic de l’artisan, et POURQUOI (jamais « c’est fait »)',
    gestes.every((g) => { const d = reel.res[g].r.donnees ?? {}; return d.jamais_d_office === true && d.pourquoi_une_carte === R.raisonJamaisAuto(g) && /RIEN n'a été fait/.test(d.a_savoir) && /JAMAIS d'office/.test(d.a_savoir) && d.a_savoir.includes(R.raisonJamaisAuto(g)) && !/C'est FAIT/.test(d.a_savoir) }),
    JSON.stringify(reel.res.supprimer_article.r.donnees).slice(0, 400))
  ok('A1g … et la carte, confirmée d’un clic par l’artisan, s’exécute (le geste existe toujours, il n’est seulement jamais d’office)',
    await (async () => {
      const fiche = reel.res.supprimer_article.r.carte
      const avant = reel.appels.length
      const c = await conf.confirmerAction({ magasin: reel.magasin, realisateurs: reel.srv.realisateurs, inverses: reel.srv.inverses, journaliser: async () => {}, maintenant: new Date('2026-11-02T09:30:00Z') }, A, fiche.id)
      return c.ok === true && reel.appels.slice(avant).some((x) => x.methode === 'DELETE' && /\/api\/inventaire\?id=/.test(x.chemin))
    })())
  // Le témoin : un geste ordinaire à confirmer (envoyer une facture émise), demandé, part tout de suite — le juge distingue bien.
  {
    mondeA()
    const appels = []
    const srv = srvMod.actionsDeSession({ uid: A, jeton: 'jeton-essai', origine: 'http://localhost', isFounder: false, crm: false, meilleursClients: false, conversationId: id(901), tour: () => 1, magasin: conf.magasinEnMemoire(),
      dependances: { appeler: async (_g, chemin, o = {}) => { appels.push({ chemin, methode: o.methode ?? 'POST' }); return { status: 200, json: { ok: true } } }, envoyerFacture: async () => new Response('{}'), piloterCarte: async () => null, maintenant: () => new Date('2026-11-02T09:00:00Z') },
      autonome: () => true })
    const r = await srv.executeurs.envoyer_facture(vrai('envoyer_facture', { numero: 'FAC-2026-0021' }))
    ok('A1h témoin : « envoie la facture FAC-2026-0021 » (geste hors §3.2) part toujours tout de suite en fait tout seul (choix de Benj du 29/10 inchangé)',
      r.donnees?.fait_tout_seul === true && r.carte?.statut === 'executee' && appels.some((x) => x.chemin === `/api/factures/${id(21)}/envoyer`), JSON.stringify(r.donnees).slice(0, 300))
  }
  const sansDemande = await jouerGestes(srvMod, false)
  ok('A1i non demandés : carte aussi (comportement inchangé), avec la même raison', gestes.every((g) => sansDemande.res[g].r.carte?.statut === 'en_attente' && !faitDOffice(sansDemande.res[g]) && sansDemande.res[g].r.donnees?.jamais_d_office === true))
  const mutA = await mutant('lib/assistant/actions-serveur.ts', 'if (!jamaisSeul && !horsAuto && ctx.autonome?.() === true) {', 'if (!horsAuto && ctx.autonome?.() === true) {')
  const surMutant = await jouerGestes(mutA, true)
  const brechesMutant = gestes.filter((g) => faitDOffice(surMutant.res[g]))
  ok('A1j MUTANT (garde retirée : la version du 29/10) : le juge VOIT la brèche — les gestes §3.2 demandés y sont exécutés d’office',
    brechesMutant.length === gestes.length && surMutant.res.supprimer_article.routes.some((x) => x.methode === 'DELETE') && surMutant.res.creer_facture_libre.factures === 1 && surMutant.res.marquer_facture_payee.routes.some((x) => x.methode === 'PATCH'),
    brechesMutant.join(','))

  console.log('\n── A2. Une QUESTION n’est jamais une action exécutée d’office')
  const c = (m, d = null) => cadrage.cadrerDemande(m, d)
  const ft = (m) => cadrage.faitToutSeul(c(m), { contenuTiersLu: false })
  const Q = 'Quels devis dois-je relancer ?'
  ok('A2a la brèche : « Quels devis dois-je relancer ? » contient « relanc » (action demandée) — c’est une QUESTION, rien d’office', c(Q).actionDemandee === true && c(Q).question === true && ft(Q) === false)
  const QUESTIONS = [
    'Quels devis dois-je relancer', 'Quelle facture est en retard', 'Combien de factures dois-je relancer', 'Est-ce que je dois relancer M. Durand',
    'Est-ce qu’il faut supprimer le brouillon', 'Qu’est-ce que je dois relancer', 'Pourquoi le devis DEV-2026-0012 n’est pas parti', 'Comment relancer un client',
    'Où en sont mes relances', 'Ou en sont mes relances', 'Quand relancer la facture FAC-2026-0021', 'Qui dois-je relancer cette semaine', 'Lequel relancer en premier',
    'Laquelle supprimer', 'Dois-je relancer Mme Martin', 'Faut-il relancer le devis de M. Leroy', 'Ai-je relancé Julie', 'Y a-t-il des factures à relancer',
    'Peux-tu relancer le devis DEV-2026-0012', 'Pouvez-vous supprimer l’article colle', 'Pourrais-tu marquer la facture FAC-2026-0021 payée',
    'Bonjour, quels devis dois-je relancer', 'Et combien de devis à relancer', 'Relance le devis de M. Durand ?', 'Supprime l’article colle ? 🙂', 'Marque la facture payée ?!',
  ]
  const ratees = QUESTIONS.filter((m) => c(m).question !== true || ft(m) !== false)
  ok(`A2b ${QUESTIONS.length} questions (mot interrogatif en tête, normalisé, ou « ? » final, même suivi d’un émoji) : question === true, jamais d’office`, ratees.length === 0, ratees.join(' | '))
  const ORDRES = [
    'Relance les devis envoyés il y a plus de 5 jours', 'Relance les factures impayées de plus de 30 jours', 'Envoie la facture FAC-2026-0021 à M. Dupont',
    'Supprime l’article colle', 'Oui s’il te plaît', 'oui', 'Oui, vas-y', 'Fais le devis de Mme Martin pour 12 m² de carrelage', 'Cherche le prix du placo',
    'Je voudrais un tableau Excel de mon stock', 'Il me faut une facture pour le dépannage d’hier', 'Commande ce qui manque', 'Nouveau devis pour M. Durand',
    'Ouvre la conversation de Julie et réponds-lui', 'Quitte pas, relance M. Leroy',
  ]
  const fausses = ORDRES.filter((m) => c(m).question !== false)
  ok(`A2c ${ORDRES.length} ordres (impératifs, « oui ») : question === false — « Relance les devis envoyés il y a plus de 5 jours » part toujours d’office`, fausses.length === 0 && ft('Relance les devis envoyés il y a plus de 5 jours') === true && ft('Oui, vas-y') === true, fausses.join(' | '))
  ok('A2d faitToutSeul exige question === false et un ordre net (absents : carte, fail-closed) ; texte de tiers lu : carte, comme avant',
    cadrage.faitToutSeul({ actionDemandee: true, question: false, ordre: true }, { contenuTiersLu: false }) === true && cadrage.faitToutSeul({ actionDemandee: true, question: true, ordre: true }, { contenuTiersLu: false }) === false
    && cadrage.faitToutSeul({ actionDemandee: true, ordre: true }, { contenuTiersLu: false }) === false && cadrage.faitToutSeul({ actionDemandee: true, question: false }, { contenuTiersLu: false }) === false
    && cadrage.faitToutSeul({ actionDemandee: true, question: false, ordre: true }, { contenuTiersLu: true }) === false)
  const sQ = cadrage.systemeAssistant({ nom: 'Atelier Essai', metier: 'Plombier', jour: '02/11/2026', actions: true }, c(Q))
  const sO = cadrage.systemeAssistant({ nom: 'Atelier Essai', metier: 'Plombier', jour: '02/11/2026', actions: true }, c('Relance le devis DEV-2026-0012'))
  ok('A2e le prompt le dit au modèle : une question n’exécute rien d’office (carte proposée) ; un ordre, si — sauf les gestes §3.2, toujours une carte',
    /Son message est une QUESTION/.test(sQ) && !/Il l'a demandée lui-même : les outils « à confirmer » l'EXÉCUTENT/.test(sQ) && /l'EXÉCUTENT directement/.test(sO) && /restent TOUJOURS une carte/.test(sO) && /SAUF l'encaissement, la facture émise, une suppression et un lot de prix/.test(sO))
  const mutC = await mutant('lib/assistant/cadrage.ts', 'c.question === false && c.ordre === true && ', '')
  ok('A2f MUTANT (faitToutSeul sans les conditions « question » et « ordre net ») : le juge VOIT la brèche — « Quels devis dois-je relancer ? » y passe en fait tout seul',
    mutC.faitToutSeul(mutC.cadrerDemande(Q), { contenuTiersLu: false }) === true && ft(Q) === false)

  console.log('\n── A2 bis. Une négation, une hésitation ou un fait passé n’ouvrent pas le « fait tout seul » (audit 032-001, D2)')
  // Les neuf phrases de l'attaque 1 de l'audit, et d'autres formes de la même famille.
  const NON_ORDRES = [
    'Ne relance surtout pas Dupont', 'Il ne faut pas relancer le devis DEV-2026-0011', 'Est-ce utile de relancer Dupont', 'Tu penses qu’il faut relancer Dupont',
    'Je me demandais s’il fallait relancer Dupont', 'Et si on relançait Dupont', 'J’ai déjà relancé Dupont hier, rien à faire', 'Relancer Dupont maintenant, bonne idée ou pas',
    'Vaut-il mieux relancer Dupont ou attendre', 'Pas besoin de relancer Dupont', 'Arrête de relancer Dupont', 'Tu ne relances pas Dupont', 'Je ne veux pas que tu relances Dupont',
    'Surtout pas de relance pour Dupont', 'N’envoie rien à Dupont', 'Mais ne relance pas Dupont', 'Est-ce utile d’envoyer le devis DEV-2026-0011', 'Je veux pas que tu envoies la facture',
    // Contre-audit 032-004 (annexe C) : la négation familière, l'arrêt, le report, la condition, l'hésitation, le fait au passif.
    'Pas question de relancer Dupont', 'Hors de question de relancer Dupont', 'Laisse tomber la relance de Dupont', 'On attend pour relancer Dupont', 'Relance Dupont plus tard',
    'Évitons de relancer Dupont', 'Oublie la relance de Dupont', 'Relance pas Dupont', 'Faut pas relancer Dupont', 'Surtout ne relance pas Dupont', 'Attends avant de relancer Dupont',
    'Relance Dupont la semaine prochaine', 'Ne t’embête pas à relancer Dupont', 'Inutile de relancer Dupont', 'Dupont, on le relance pas', 'Je préfère ne pas relancer Dupont',
    'Je ne pense pas qu’il faille relancer Dupont', 'Relancer Dupont ? Non', 'Non, pas de relance pour Dupont', 'Plus de relance pour Dupont', 'Stop les relances à Dupont',
    'Envoie pas le devis à Dupont', 'N’envoie le devis DEV-2026-0011 qu’après mon appel', 'Envoie le devis à Dupont seulement s’il rappelle', 'Faudrait relancer Dupont un de ces jours',
    'Il faudrait peut-être relancer Dupont', 'Relance Dupont si tu veux', 'Tu pourrais relancer Dupont', 'Pourrais-tu me dire qui relancer', 'J’hésite à relancer Dupont',
    'Je relance Dupont moi-même', 'Je m’occupe de relancer Dupont', 'Dupont a été relancé hier', 'Le devis de Dupont est déjà parti', 'Relance de Dupont faite',
    'C’est bon pour la relance de Dupont, déjà fait', 'Relance Dupont demain matin', 'Envoie le devis quand il aura rappelé', 'Relance Dupont dans 3 jours', 'Envoie la facture, on verra bien',
  ]
  const ouverts = NON_ORDRES.filter((m) => ft(m) !== false)
  ok(`A2g ${NON_ORDRES.length} phrases qui ne sont pas des ordres (négation, arrêt, report, condition, hésitation, fait passé) : jamais d’office`, ouverts.length === 0, ouverts.map((m) => `${m} ${JSON.stringify(c(m))}`).join(' | '))
  // Les témoins : des ORDRES NETS (verbe à l'impératif en tête, ou « oui »), dont une négation dans une relative qui n'en est pas une.
  const ORDRES_NETS = [
    'Relance les devis envoyés il y a plus de 5 jours', 'Relance les factures impayées de plus de 30 jours', 'Envoie la facture FAC-2026-0021 à M. Dupont', 'Supprime l’article colle',
    'Oui s’il te plaît', 'oui', 'Oui, vas-y', 'Fais le devis de Mme Martin pour 12 m² de carrelage', 'Cherche le prix du placo', 'Commande ce qui manque',
    'Ouvre la conversation de Julie et réponds-lui', 'Relance tous les clients qui n’ont pas répondu', 'Relance ceux qui ne m’ont pas payé', 'Envoie le devis DEV-2026-0011 à M. Essai',
    'Bonjour, relance Dupont s’il te plaît', 'Relance le devis DEV-2026-0012', 'Ok, envoie-lui le devis', 'Relance-le, merci', 'Envoie la facture de Mme Martin',
    'ok', 'Ok, vas-y', 'Oui merci', 'Oui, et ajoute la pose', 'Allez, relance-le', 'Fais-le',
  ]
  const fermes = ORDRES_NETS.filter((m) => ft(m) !== true)
  ok(`A2h témoins : ${ORDRES_NETS.length} ordres nets, dont « relance ceux qui n’ont pas répondu », partent toujours d’office`, fermes.length === 0, fermes.map((m) => `${m} ${JSON.stringify(c(m))}`).join(' | '))
  // Le prix du côté sûr, écrit pour qu'on le voie : ces demandes deviennent une carte d'un clic (contre-audit 032-004 : « renverser la charge »).
  const CARTES_VOULUES = ['Je voudrais un tableau Excel de mon stock', 'Nouveau devis pour M. Durand', 'Quitte pas, relance M. Leroy', 'N’oublie pas de relancer Dupont',
    'N’hésite pas à relancer Dupont', 'Dupont ne veut plus être relancé, note son opposition', 'Relance Dupont si ce n’est pas déjà fait', 'Relance Dupont, peut-être en ton ferme',
    'Relance Dupont, je ne veux pas perdre ce chantier', 'Réponds-lui que je passe demain', 'Réponds-lui que je passe jeudi', 'Relance les devis envoyés hier']
  const ouvertesBis = CARTES_VOULUES.filter((m) => ft(m) !== false)
  ok(`A2h2 ${CARTES_VOULUES.length} demandes qui ne sont pas un ordre net (« N’oublie pas de… », une condition, un report) : une carte, d’un clic`, ouvertesBis.length === 0, ouvertesBis.join(' | '))
  const sI = cadrage.systemeAssistant({ nom: 'Atelier Essai', metier: 'Plombier', jour: '02/11/2026', actions: true }, c('Ne relance surtout pas Dupont'))
  const sD = cadrage.systemeAssistant({ nom: 'Atelier Essai', metier: 'Plombier', jour: '02/11/2026', actions: true }, c('J’ai déjà relancé Dupont hier, rien à faire'))
  ok('A2i le prompt le dit au modèle : un interdit n’est pas fait (et jamais « FAIS-LA ») ; un « déjà fait » n’est pas refait',
    /NE PAS faire quelque chose/.test(sI) && !/FAIS-LA/.test(sI) && /DÉJÀ fait/.test(sD) && !/FAIS-LA/.test(sD) && c('Ne relance surtout pas Dupont').interdit === true && c('J’ai déjà relancé Dupont hier, rien à faire').dejaFait === true)
  const mutH = await copie('lib/assistant/cadrage.ts', { remplacer: [['|| contient(n, HESITATION)', ''], [' && !contient(texte, HESITATION)\n', '\n']] })
  ok('A2j MUTANT (hésitations non lues, ni dans la question ni dans l’ordre) : le juge VOIT la brèche — « Relance Dupont, bonne idée » y passe en fait tout seul',
    mutH.faitToutSeul(mutH.cadrerDemande('Relance Dupont, bonne idée'), { contenuTiersLu: false }) === true && ft('Relance Dupont, bonne idée') === false)
  const mutN = await copie('lib/assistant/cadrage.ts', { remplacer: [
    ['actionDemandee: !interdit && !dejaFait && (', 'actionDemandee: ('],
    [' && c.ordre === true && c.interdit !== true && c.dejaFait !== true', ''],
  ] })
  ok('A2k MUTANT (interdits, « déjà fait » et ordre net ignorés, les gardes retirées) : le juge VOIT la brèche — « Ne relance surtout pas Dupont » y passe en fait tout seul',
    mutN.faitToutSeul(mutN.cadrerDemande('Ne relance surtout pas Dupont'), { contenuTiersLu: false }) === true && ft('Ne relance surtout pas Dupont') === false)
  const mutO = await mutant('lib/assistant/cadrage.ts', 'c.ordre === true && ', '')
  ok('A2l MUTANT (ordre net ignoré : la version du contre-audit 032-004) : le juge VOIT la brèche — « Relance Dupont plus tard » et « Relance pas Dupont » y passent en fait tout seul',
    ['Relance Dupont plus tard', 'Relance pas Dupont'].every((m) => mutO.faitToutSeul(mutO.cadrerDemande(m), { contenuTiersLu: false }) === true && ft(m) === false))
  // Troisième audit 032-005 (D2) : le refus poli après une proposition, la rétractation, le report, la condition, le fait au participe.
  const PROPOSE = 'Voulez-vous que je le relance ?'
  const NON_ORDRES_3 = ['C’est bon, je m’en occupe', 'Ok, je vais réfléchir', 'Ok merci, je gère', 'Parfait, je l’appelle moi-même', 'D’accord, mais je préfère l’appeler', 'Oui, enfin non',
    'Ok, on en reparle', 'Oui mais attends que je vérifie', 'Relance Dupont ? Je préfère attendre.', 'Relance Dupont… ah non, il a payé', 'Relance Dupont, enfin non, laisse', 'Relance Dupont — en fait non.',
    'Envoie le devis à Dupont. Attends, je dois encore vérifier les prix.', 'Relance Dupont, mais attends mon feu vert', 'Relance Dupont lundi', 'Relance Dupont après les vacances',
    'Relance Dupont à la fin du mois', 'Envoie le devis à Dupont après mon rendez-vous', 'Relance Dupont la semaine d’après', 'Relance Dupont, à moins qu’il ait payé', 'Relance Dupont en cas de silence',
    'Relance Dupont au besoin', 'Relance Dupont, je te laisse juger', 'Envoie le devis à Dupont, à valider par Paul d’abord', 'Relance Dupont envoyée ce matin', 'Relance Dupont faite hier',
    'Facture Dupont réglée hier par chèque', 'Note : Dupont a déjà été relancé', 'Relance Dupont, il a payé hier en fait', 'Ok, Dupont est un bon client']
  const ouverts3 = NON_ORDRES_3.filter((m) => cadrage.faitToutSeul(c(m, PROPOSE), { contenuTiersLu: false }) !== false)
  ok(`A2n les ${NON_ORDRES_3.length} tournures du troisième audit (dont « C’est bon, je m’en occupe » après « Voulez-vous que je le relance ? ») : jamais d’office`, ouverts3.length === 0, ouverts3.join(' | '))
  const mutAcc = await mutant('lib/assistant/cadrage.ts', 'const enTete = (ouiNet && premier === undefined) || (', 'const enTete = accord !== null || (')
  ok('A2o MUTANT (un accord en tête ouvre, quoi qu’il suive : la version du troisième audit) : le juge VOIT la brèche — « Ok, Dupont est un bon client » y passe en fait tout seul',
    mutAcc.faitToutSeul(mutAcc.cadrerDemande('Ok, Dupont est un bon client', PROPOSE), { contenuTiersLu: false }) === true && cadrage.faitToutSeul(c('Ok, Dupont est un bon client', PROPOSE), { contenuTiersLu: false }) === false)
  // Quatrième audit 032-006 (D2) : les dates, mois et moments, « bof », « nan », « ok noté », « ok merci », les participes masculins.
  const NON_ORDRES_4 = ['Relance Dupont le 15', 'Relance Dupont le 15 novembre', 'Relance Dupont en décembre', 'Relance Dupont début janvier', 'Relance Dupont mi-novembre',
    'Relance Dupont ce week-end', 'Relance Dupont à la fin des travaux', 'Relance Dupont à 18 h', 'Relance Dupont à 18h', 'Relance Dupont dans la soirée', 'Relance Dupont sous huitaine',
    'Envoie le devis une fois signé', 'Envoie le devis dès réception', 'Relance Dupont à la Toussaint', 'Relance Dupont au retour de Paul', 'Relance Dupont ? Bof.', 'Relance Dupont ? Mouais.',
    'Relance Dupont ? Euh…', 'Relance Dupont, nan', 'Ok noté', 'Bien noté', 'Noté, merci', 'Ok merci', 'Relance Dupont envoyé', 'Facture Dupont payé', 'Facture Dupont réglé',
    'Relance Dupont ok c’est parti', 'C’est bon', 'Parfait']
  const ouverts4 = NON_ORDRES_4.filter((m) => cadrage.faitToutSeul(c(m, PROPOSE), { contenuTiersLu: false }) !== false)
  ok(`A2q les ${NON_ORDRES_4.length} tournures du quatrième audit (dont « Ok noté », « Ok merci », « C’est bon » après une proposition) : jamais d’office`, ouverts4.length === 0, ouverts4.join(' | '))
  const OUI_NETS = ['oui', 'Oui merci', 'ok', 'Ok, vas-y', 'D’accord', 'Vas-y', 'Parfait, envoie-le', 'Note son opposition']
  const fermes4 = OUI_NETS.filter((m) => cadrage.faitToutSeul(c(m, PROPOSE), { contenuTiersLu: false }) !== true)
  ok('A2r témoins : un oui net (« oui », « oui merci », « ok », « d’accord », « vas-y »), ou un accord suivi d’un ordre, ouvre toujours', fermes4.length === 0, fermes4.join(' | '))
  // Cinquième audit 032-007 (D2) : les heures et moments que REPORT ignorait, les participes que FAIT_EN_FIN ignorait.
  const NON_ORDRES_5 = ['Relance Dupont à 14h30', 'Relance Dupont vers 10h', 'Envoie le devis vers 17 h', 'Relance Dupont à midi', 'Relance Dupont cet aprèm', 'Relance Dupont cet après-midi',
    'Relance Dupont la semaine pro', 'Relance Dupont la semaine qui vient', 'Relance Dupont dans un moment', 'Relance Dupont tantôt', 'Relance Dupont à 9h',
    'Relance Dupont partie', 'Relance Dupont effectuée', 'Relance Dupont transmise', 'Facture Dupont expédiée', 'Devis Dupont transmis', 'Relances Dupont effectuées']
  const ouverts5 = NON_ORDRES_5.filter((m) => cadrage.faitToutSeul(c(m, PROPOSE), { contenuTiersLu: false }) !== false)
  ok(`A2s les ${NON_ORDRES_5.length} tournures du cinquième audit (« à 14h30 », « vers 10h », « à midi », « cet aprèm », « la semaine pro », « partie », « effectuée », « transmise », « expédiée »…) : jamais d’office`,
    ouverts5.length === 0, ouverts5.join(' | '))
  // … et les trois vrais ordres que 032-007 voyait devenir des cartes (faible), rouverts sans rouvrir aucune des tournures fermées (A2g, A2n, A2q, A2s).
  const ORDRES_5 = [['Ok ça marche', PROPOSE], ['Relance tous ceux qui n’ont pas signé depuis le 15 octobre', null], ['Refais le devis de Martin, chantier le 15/11, et envoie-le', null],
    ['Relance ceux qui n’ont pas signé depuis octobre', null], ['Facture la première partie du chantier Dupont', null]]
  const fermes5 = ORDRES_5.filter(([m, d]) => cadrage.faitToutSeul(c(m, d), { contenuTiersLu: false }) !== true).map(([m]) => m)
  const ENCORE_FERMES = [['Ok ça marche merci', PROPOSE], ['Ça marche', PROPOSE], ['Relance Dupont le 15', null], ['Relance Dupont depuis le 15, mais demain', null], ['Relance Dupont, chantier le 15, plus tard', null]]
  const rouverts5 = ENCORE_FERMES.filter(([m, d]) => cadrage.faitToutSeul(c(m, d), { contenuTiersLu: false }) !== false).map(([m]) => m)
  ok('A2t les trois vrais ordres de 032-007 (« Ok ça marche », une date qui filtre — « depuis le 15 octobre » — ou qui décrit le chantier) partent d’office ; « Relance Dupont le 15 », « ok ça marche merci » restent des cartes',
    fermes5.length === 0 && rouverts5.length === 0, `fermés : ${fermes5.join(' | ')} ; rouverts : ${rouverts5.join(' | ')}`)
  const mutRep = await mutant('lib/assistant/cadrage.ts', '|a \\d{1,2} ?h\\d{2}|vers \\d{1,2}(?: ?h\\d{0,2}| heures?)?|midi|aprem|apres midi|semaine pro|qui vient|un moment|tantot|', '|')
  const mutFait = await mutant('lib/assistant/cadrage.ts', '|partie|parties|parti|partis|effectue|effectuee|effectues|effectuees|transmis|transmise|transmises|expedie|expediee|expedies|expediees|', '|')
  ok('A2u MUTANTS (REPORT et FAIT_EN_FIN de 032-006) : le juge VOIT les brèches — « Relance Dupont à 14h30 » et « Relance Dupont partie » y passent en fait tout seul',
    mutRep.faitToutSeul(mutRep.cadrerDemande('Relance Dupont à 14h30'), { contenuTiersLu: false }) === true && mutFait.faitToutSeul(mutFait.cadrerDemande('Relance Dupont partie'), { contenuTiersLu: false }) === true
    && ft('Relance Dupont à 14h30') === false && ft('Relance Dupont partie') === false)
  const mutDate = await mutant('lib/assistant/cadrage.ts', "!REPORT.test(texte.replace(DATE_QUI_DECRIT, ' '))", '!REPORT.test(texte)')
  ok('A2v MUTANT (toute date lue comme un report : la version de 032-006) : le juge VOIT la carte de trop — « Relance tous ceux qui n’ont pas signé depuis le 15 octobre » y devient une carte',
    mutDate.faitToutSeul(mutDate.cadrerDemande('Relance tous ceux qui n’ont pas signé depuis le 15 octobre'), { contenuTiersLu: false }) === false && ft('Relance tous ceux qui n’ont pas signé depuis le 15 octobre') === true)
  const mutRet = await mutant('lib/assistant/cadrage.ts', '&& !RETRACTATION.test(texte) ', '')
  ok('A2p MUTANT (rétractations non lues) : le juge VOIT la brèche — « Relance Dupont — en fait non. » y passe en fait tout seul',
    mutRet.faitToutSeul(mutRet.cadrerDemande('Relance Dupont — en fait non.'), { contenuTiersLu: false }) === true && ft('Relance Dupont — en fait non.') === false)
  const sR = cadrage.systemeAssistant({ nom: 'Atelier Essai', metier: 'Plombier', jour: '02/11/2026', actions: true }, c('Relance Dupont plus tard'))
  ok('A2m le prompt le dit au modèle : une demande qui n’est pas un ordre net (un report) n’est pas faite « tout de suite », une carte est proposée',
    /pas un ordre net/.test(sR) && !/FAIS-LA/.test(sR) && /ne programme rien/.test(sR))

  console.log('\n── A3. « Fait tout seul » : un devis au prix estimé, à chiffrer ou nul ne part jamais d’office (audit 032-001, D1)')
  /** « Envoie le devis DEV-2026-0011 à M. Essai », DEMANDÉ par l'artisan (autonome vrai), avec ces lignes au devis (fabrique `mod`). */
  async function jouerEnvoiDevis(mod, lignes, { panne = false } = {}) {
    mondeA()
    T.devis_lignes = lignes.map((l, i) => ({ id: id(810 + i), devis_id: id(11), ordre: i, designation: `Ligne ${i + 1}`, quantite: 1, unite: 'u', tva_taux: 10, ...l }))
    const appels = []
    const srv = mod.actionsDeSession({ uid: A, jeton: 'jeton-essai', origine: 'http://localhost', isFounder: false, crm: false, meilleursClients: false, conversationId: id(902), tour: () => 1, magasin: conf.magasinEnMemoire(),
      dependances: { appeler: async (_g, chemin, o = {}) => { appels.push({ chemin, methode: o.methode ?? 'POST' }); return { status: 200, json: { ok: true } } }, envoyerDevis: async () => new Response('{}'), piloterCarte: async () => null, maintenant: () => new Date('2026-11-02T09:00:00Z') },
      autonome: () => true })
    if (panne) PANNES.add('devis_lignes')
    try {
      const r = await srv.executeurs.envoyer_devis(vrai('envoyer_devis', { numero: 'DEV-2026-0011' }))
      return { r, routes: appels.filter((x) => x.chemin === `/api/devis/${id(11)}/envoyer`) }
    } finally { PANNES.delete('devis_lignes') }
  }
  const ESTIMEES = [{ prix_unitaire_ht: 100, source_prix: 'estimation' }, { prix_unitaire_ht: 0, source_prix: null }]
  const TARIFEES = [{ prix_unitaire_ht: 45, source_prix: 'tarif de l’artisan' }, { prix_unitaire_ht: 12.5, source_prix: 'prix donné par l’artisan' }]
  {
    const { r, routes } = await jouerEnvoiDevis(srvMod, ESTIMEES)
    ok('A3a la brèche de l’attaque 2 : une ligne estimée et une à 0 € — demandé par l’artisan, le devis reste une CARTE, aucune route d’envoi atteinte',
      routes.length === 0 && r.carte?.statut === 'en_attente' && r.donnees?.en_attente_de_confirmation === true && r.donnees?.fait_tout_seul !== true, JSON.stringify(r.donnees).slice(0, 400))
    ok('A3b … et le modèle sait pourquoi (le motif du pilote, jamais « c’est fait »), la carte avertit l’artisan',
      r.donnees?.pas_d_office === true && r.donnees?.pourquoi_une_carte === R.LIBELLE_MOTIF.prix_non_source && /RIEN n'a été fait/.test(r.donnees?.a_savoir ?? '') && r.donnees.a_savoir.includes(R.LIBELLE_MOTIF.prix_non_source)
      && (r.carte?.alertes ?? []).some((a) => /prix estimé, à chiffrer ou nul/.test(a)), JSON.stringify(r.donnees).slice(0, 400))
  }
  {
    const { r, routes } = await jouerEnvoiDevis(srvMod, TARIFEES)
    ok('A3c témoin : toutes les lignes tarifées (vos tarifs, prix donné par l’artisan), le devis part d’office comme avant (choix de Benj du 29/10)',
      routes.length === 1 && r.donnees?.fait_tout_seul === true && r.carte?.statut === 'executee', JSON.stringify(r.donnees).slice(0, 300))
  }
  {
    const vide = await jouerEnvoiDevis(srvMod, [])
    const panne = await jouerEnvoiDevis(srvMod, TARIFEES, { panne: true })
    ok('A3d devis sans aucune ligne, ou lignes illisibles (lecture en erreur) : carte, rien d’office (côté sûr)',
      vide.routes.length === 0 && vide.r.carte?.statut === 'en_attente' && panne.routes.length === 0 && panne.r.carte?.statut === 'en_attente', `${JSON.stringify(vide.r.donnees).slice(0, 200)} ${JSON.stringify(panne.r.donnees).slice(0, 200)}`)
  }
  {
    const mutD1 = await mutant('lib/assistant/actions-serveur.ts', 'if (!jamaisSeul && !horsAuto && ctx.autonome?.() === true) {', 'if (!jamaisSeul && ctx.autonome?.() === true) {')
    const { r, routes } = await jouerEnvoiDevis(mutD1, ESTIMEES)
    ok('A3e MUTANT (motif du devis ignoré : la version de l’audit) : le juge VOIT la brèche — le devis au prix estimé y part d’office', routes.length === 1 && r.donnees?.fait_tout_seul === true, JSON.stringify(r.donnees).slice(0, 300))
  }

  console.log('\n── A4. Un prix recopié n’est pas « donné par l’artisan » : pas de blanchiment de la provenance (contre-audit 032-004, D1 bis)')
  const cartesMod = await imp('lib/assistant/cartes.ts')
  /** creer_devis demandé avec une ligne SANS tarif à 450 €, pour l'artisan qui a écrit `textes` ; rend les lignes envoyées à la route. */
  async function creerAvec(mod, textes) {
    mondeA()
    const corps = []
    const srv = mod.actionsDeSession({ uid: A, jeton: 'jeton-essai', origine: 'http://localhost', isFounder: false, crm: false, meilleursClients: false, conversationId: id(903), tour: () => 1, magasin: conf.magasinEnMemoire(),
      dependances: { appeler: async (_g, chemin, o = {}) => { if (chemin === '/api/devis') corps.push(o.corps); return { status: 200, json: { ok: true } } }, piloterCarte: async () => null, maintenant: () => new Date('2026-11-02T09:00:00Z') },
      autonome: () => true, textesArtisan: textes })
    await srv.executeurs.creer_devis(vrai('creer_devis', { client_nom: 'M. Essai', objet: 'Reprise du devis de Martin', lignes: [{ designation: 'Dépose et pose du ballon', quantite: 1, prix_unitaire_ht: 450 }] }))
    return corps[0]?.lignes ?? []
  }
  {
    const repris = await creerAvec(srvMod, ['Refais le devis de Martin pour M. Essai et envoie-le-lui'])
    ok('A4a la chaîne de l’audit : 450 € recopié d’un autre devis (l’artisan ne l’a pas écrit) — la ligne garde son prix, pas l’étiquette « prix donné par l’artisan »',
      repris.length === 1 && repris[0].prix_unitaire_ht === 450 && repris[0].source_prix === cartesMod.SOURCE_REPRISE, JSON.stringify(repris))
    ok('A4b … donc ce devis ne part jamais seul : la règle des prix du pilote et de « fait tout seul » le refuse', R.prixSources(repris) === false)
    const donnes = await creerAvec(srvMod, ['Fais un devis à M. Essai : dépose et pose du ballon, 450 € HT, et envoie-le'])
    ok('A4c témoin : l’artisan a écrit « 450 € » lui-même — « prix donné par l’artisan », le devis pourra partir sur son ordre', donnes.length === 1 && donnes[0].source_prix === 'prix donné par l’artisan' && R.prixSources(donnes) === true, JSON.stringify(donnes))
    const sansTextes = await creerAvec(srvMod, undefined)
    ok('A4d sans les textes de l’artisan (appelant qui les oublie) : aucun prix n’est le sien (côté sûr)', sansTextes.length === 1 && sansTextes[0].source_prix === cartesMod.SOURCE_REPRISE, JSON.stringify(sansTextes))
    const route = lire('app/api/assistant/route.ts')
    ok('A4e la route de l’assistant passe ce que l’artisan a écrit — son message et SES messages de l’historique, jamais une réponse de l’assistant',
      /const textesArtisan = \[message, \.\.\.historique\.filter\(\(e\) => e\.role === 'artisan'\)\.map\(\(e\) => e\.texte\)\]/.test(route) && /textesArtisan \}\) : undefined/.test(route))
    // Le mutant : la garde retirée dans resoudreLignes (la version du contre-audit), rejouée sur la même chaîne.
    const mutB = await mutant('lib/assistant/cartes.ts', 'const parLArtisan = donne && nombresArtisan.has(Math.round((l.prix_unitaire_ht as number) * 100))', 'const parLArtisan = donne')
    const LIGNE = [{ tarif_id: null, designation: 'Dépose et pose du ballon', quantite: 1, unite: 'u', prix_unitaire_ht: 450 }]
    const repMut = mutB.resoudreLignes(LIGNE, new Map(), mutB.prixEcrits(['Refais le devis de Martin pour M. Essai et envoie-le-lui']))
    const repVrai = cartesMod.resoudreLignes(LIGNE, new Map(), cartesMod.prixEcrits(['Refais le devis de Martin pour M. Essai et envoie-le-lui']))
    ok('A4f MUTANT (l’étiquette posée sur tout prix fourni : la version du contre-audit) : le juge VOIT la brèche — 450 € recopié y devient « prix donné par l’artisan » et passe la règle des prix',
      repMut.lignes[0]?.source_prix === 'prix donné par l’artisan' && R.prixSources(repMut.lignes) === true && R.prixSources(repVrai.lignes) === false, JSON.stringify(repMut.lignes))
    // Troisième audit 032-005 (A3) : un nombre de l'artisan qui n'est pas un prix (quantité, numéro, date, adresse) ne fait pas un prix.
    const COINCIDENCES = [['Refais le devis de Martin pour M. Essai, 45 m² cette fois, et envoie-le', 45], ['Reprends les lignes du devis DEV-2026-0120 pour M. Essai et envoie-le', 120],
      ['Refais pour M. Essai le devis de Martin, chantier le 15/11, et envoie-le', 15], ['Duplique le devis de Martin pour M. Essai au 12 rue des Lilas et envoie-le', 12]]
    const blanchis = COINCIDENCES.filter(([t, prix]) => cartesMod.resoudreLignes([{ ...LIGNE[0], prix_unitaire_ht: prix }], new Map(), cartesMod.prixEcrits([t])).lignes[0].source_prix !== cartesMod.SOURCE_REPRISE)
    ok('A4g une quantité (45 m²), un numéro de devis, une date, un numéro de rue écrits par l’artisan ne sont pas des prix : la ligne estimée qui leur ressemble reste « à vérifier »', blanchis.length === 0, blanchis.map(([t]) => t).join(' | '))
    const PRIX_OK = [['pose 450 € HT', 450], ['450 euros', 450], ['450 HT', 450], ['45 le m²', 45], ['1 200,50 €', 1200.5], ['€ 99', 99]]
    const rates = PRIX_OK.filter(([t, p]) => !cartesMod.prixEcrits([t]).has(Math.round(p * 100)))
    ok('A4h … et un prix écrit avec sa marque (« € », « euros », « HT », « le m² ») en est un', rates.length === 0, rates.map(([t]) => t).join(' | '))
    // Quatrième audit 032-006 : un prix TTC n'est pas un prix HT ; ses formes HT aux taux courants le sont.
    // Cinquième audit 032-007 (« TTC ») : seule la forme HT AU TAUX de la pièce (défaut 10 %) ; 375 € HT, la forme à 20 %, ne l'est plus à 10 %.
    const ttc = cartesMod.prixEcrits(['Le ballon, c’est 450 € TTC'])
    ok('A4i « 450 € TTC » à TVA 10 % (défaut) : 409,09 € HT seulement ; ni 450 posé en HT, ni 375 (sa forme à 20 %), ni 426,54 (à 5,5 %)',
      ttc.has(40909) && !ttc.has(45000) && !ttc.has(37500) && !ttc.has(42654) && cartesMod.prixEcrits(['450 € TTC'], 20).has(37500) && cartesMod.prixEcrits(['450 € TTC'], 5.5).has(42654), JSON.stringify([...ttc]))
    const GRAPHIES = ['450 € TTC', '450 TTC', '450€TTC', '450 € T.T.C.', '450 € toutes taxes comprises', '450 euros TTC', '450e TTC', '450 € (TTC)', '450 € taxes comprises',
      '450 € TVA comprise', '450 € TVA incluse', '450 € TVAC', '450 € T.V.A. comprise', 'TTC : 450 €', 'Prix TTC 450 €', 'Le prix TTC de 450 €']
    const malLues = GRAPHIES.filter((g) => { const x = cartesMod.prixEcrits([`Le ballon, ${g}`]); return x.has(45000) || !x.has(40909) })
    ok(`A4j les ${GRAPHIES.length} graphies TTC de 032-007 (« TVA comprise », « taxes comprises », « (TTC) », « TVAC », « TTC » avant le nombre…) : 450 n’est jamais un HT, 409,09 l’est à 10 %`,
      malLues.length === 0, malLues.join(' | '))
    const HT_GARDES = [['450 € HT', 45000], ['450 € TTC, 300 € HT', 30000], ['Le ballon 450 €', 45000], ['450 € HT soit 495 € TTC', 45000], ['TTC : 495 €, HT : 450 €', 45000]]
    const htPerdus = HT_GARDES.filter(([t, c]) => !cartesMod.prixEcrits([t]).has(c))
    ok('A4k … sans prendre pour TTC un prix HT voisin (« 450 € TTC, 300 € HT » : 300 reste HT ; « 450 € HT soit 495 € TTC » : 450 HT)', htPerdus.length === 0, htPerdus.map(([t]) => t).join(' | '))
    ok('A4l tauxTtcPossibles : 375 € HT après « 450 € TTC » n’est la forme HT qu’à 20 % — la question du taux, jamais un taux deviné',
      JSON.stringify(cartesMod.tauxTtcPossibles(['450 € TTC'], 375, 10)) === '[20]' && cartesMod.tauxTtcPossibles(['450 € TTC'], 409.09, 10).length === 0 && cartesMod.tauxTtcPossibles(['450 € HT'], 450, 10).length === 0)
    const mutTaux = await mutant('lib/assistant/cartes.ts', '        s.add(Math.round((ttc ? Math.abs(n) / (1 + taux / 100) : Math.abs(n)) * 100))\n', '        for (const k of ttc ? [1.055, 1.1, 1.2] : [1]) s.add(Math.round((Math.abs(n) / k) * 100))\n')
    ok('A4m MUTANT (les trois formes HT admises à tout taux : la version de 032-006) : le juge VOIT la brèche — 375 € HT à TVA 10 % y passe pour un prix de l’artisan',
      mutTaux.prixEcrits(['450 € TTC'], 10).has(37500) && !cartesMod.prixEcrits(['450 € TTC'], 10).has(37500))
    const mutGraph = await copie('lib/assistant/cartes.ts', { remplacer: [
      ['const TTC_APRES = /^\\s*(?:€\\s*)?\\(?\\s*(?:ttc|t\\.t\\.c|toutes taxes|tvac\\b|t\\.?v\\.?a\\.?\\s*(?:compris|inclus)|taxes?\\s*(?:compris|inclus))/i', 'const TTC_APRES = /^\\s*(?:€\\s*)?(?:ttc|t\\.t\\.c|toutes taxes)/i'],
      ['  return !!avant && !avant[1]\n', '  return false\n']] })
    const brechesGraph = ['450 € TVA comprise', '450 € (TTC)', 'Prix TTC 450 €', '450 € taxes comprises', '450 € TVAC'].filter((g) => mutGraph.prixEcrits([g]).has(45000))
    ok('A4n MUTANT (la lecture TTC de 032-006 : « TTC » juste après le nombre seulement) : le juge VOIT la brèche — « 450 € TVA comprise », « (TTC) », « Prix TTC 450 € »… y donnent 450 en HT',
      brechesGraph.length === 5, brechesGraph.join(' | '))
  }

  console.log('\n── A5. La bibliothèque de tarifs n’enregistre que le prix écrit par l’artisan (troisième audit 032-005, A2)')
  /** ajouter_tarif ou modifier_tarif, pour l'artisan qui a écrit `textes` ; rend le résultat et les écritures faites. */
  async function tarifAvec(mod, outil, entree, textes) {
    mondeA()
    const routes = []
    const srv = mod.actionsDeSession({ uid: A, jeton: 'jeton-essai', origine: 'http://localhost', isFounder: false, crm: false, meilleursClients: false, conversationId: id(904), tour: () => 1, magasin: conf.magasinEnMemoire(),
      dependances: { appeler: async (_g, chemin, o = {}) => { routes.push(chemin); return { status: 200, json: { ok: true } } }, piloterCarte: async () => null, maintenant: () => new Date('2026-11-02T09:00:00Z') },
      autonome: () => true, textesArtisan: textes })
    const n = requetes.length
    const r = await srv.executeurs[outil](vrai(outil, entree))
    return { r, routes, ecritures: ecrituresDepuis(n) }
  }
  {
    const AJOUT = { designation: 'Remplacement ballon', prix_ht: 450, unite: 'u' }
    const lu = await tarifAvec(srvMod, 'ajouter_tarif', AJOUT, ['Mets le remplacement de ballon du devis de Martin dans mes tarifs, fais le devis de M. Essai avec et envoie-le'])
    ok('A5a la chaîne de l’audit : 450 € lu dans le devis de Martin, jamais écrit par l’artisan — ajouter_tarif refuse, rien n’entre dans ses tarifs',
      lu.r.resultat === 'refus' && lu.routes.length === 0 && /ne vient pas de ce que l'artisan/.test(lu.r.donnees?.erreur ?? ''), JSON.stringify(lu.r).slice(0, 300))
    const ecrit = await tarifAvec(srvMod, 'ajouter_tarif', AJOUT, ['Ajoute le remplacement de ballon à 450 € HT dans mes tarifs'])
    ok('A5b témoin : l’artisan écrit « 450 € HT » — le tarif s’enregistre', ecrit.r.resultat !== 'refus' && ecrit.routes.includes('/api/tarifs'), JSON.stringify(ecrit.r).slice(0, 300))
    const modLu = await tarifAvec(srvMod, 'modifier_tarif', { tarif_id: id(31), prix_ht: 52 }, ['Ok, mets mon tarif main d’œuvre à jour'])
    const modEcrit = await tarifAvec(srvMod, 'modifier_tarif', { tarif_id: id(31), prix_ht: 52 }, ['Passe la main d’œuvre à 52 € de l’heure'])
    ok('A5c modifier_tarif : un « ordre de grandeur » que l’artisan n’a pas écrit est refusé (aucune écriture) ; « 52 € de l’heure » écrit par lui passe',
      modLu.r.resultat === 'refus' && modLu.ecritures.length === 0 && modEcrit.r.resultat !== 'refus' && modEcrit.ecritures.some((x) => x === 'PATCH prix_artisan'), `${JSON.stringify(modLu.r).slice(0, 200)} ${JSON.stringify(modEcrit.ecritures)}`)
    const mutT = await mutant('lib/assistant/actions-serveur.ts', "  R.ajouter_tarif = async (e) => {\n    // 02/11 (troisième audit 032-005, A2) : la bibliothèque de tarifs n'enregistre que le prix que l'artisan a écrit lui-même. Sinon une\n    // estimation lue dans un autre devis y devenait « tarif de l'artisan », et le devis fait avec partait seul.\n    if (!prixDeLArtisan(e.prix_ht, tauxDe(e.tva_taux))) return prixNonDonne(e.prix_ht, tauxDe(e.tva_taux))\n", '  R.ajouter_tarif = async (e) => {\n')
    const surMut = await tarifAvec(mutT, 'ajouter_tarif', AJOUT, ['Mets le remplacement de ballon du devis de Martin dans mes tarifs, fais le devis de M. Essai avec et envoie-le'])
    ok('A5d MUTANT (garde retirée : la version du troisième audit) : le juge VOIT la brèche — l’estimation de 450 € y entre dans les tarifs', surMut.routes.includes('/api/tarifs') && surMut.r.resultat !== 'refus', JSON.stringify(surMut.r).slice(0, 200))
    // Cinquième audit 032-007 (« TTC », taux incohérent) : le HT n'est admis qu'au taux envoyé ; sinon la question du taux, rien d'écrit.
    const PH = ['Ajoute le remplacement de ballon à 450 € TTC dans mes tarifs']
    const juste = await tarifAvec(srvMod, 'ajouter_tarif', { ...AJOUT, prix_ht: 409.09, tva_taux: 10 }, PH)
    const faux = await tarifAvec(srvMod, 'ajouter_tarif', { ...AJOUT, prix_ht: 375, tva_taux: 10 }, PH)
    const vingt = await tarifAvec(srvMod, 'ajouter_tarif', { ...AJOUT, prix_ht: 375, tva_taux: 20 }, PH)
    ok('A5e « 450 € TTC » : 409,09 € HT à TVA 10 % s’enregistre ; 375 € HT à 10 % (la forme à 20 %) est refusé par « Prix TTC donné : quel taux de TVA ? », rien d’écrit ; 375 € HT à 20 % s’enregistre',
      juste.routes.includes('/api/tarifs') && faux.r.resultat === 'refus' && faux.routes.length === 0 && /^Prix TTC donné : quel taux de TVA \?/.test(faux.r.donnees?.erreur ?? '') && vingt.routes.includes('/api/tarifs'),
      `${JSON.stringify(juste.r).slice(0, 120)} ${JSON.stringify(faux.r).slice(0, 200)} ${JSON.stringify(vingt.r).slice(0, 120)}`)
    const recopies = []
    for (const g of ['450 € TVA comprise', 'prix TTC 450 €', '450 € taxes comprises', '450 € (TTC)', '450 € TVAC']) recopies.push([g, await tarifAvec(srvMod, 'ajouter_tarif', { ...AJOUT, prix_ht: 450 }, [`Ajoute le ballon à ${g} dans mes tarifs`])])
    const passes = recopies.filter(([, x]) => x.routes.length > 0).map(([g]) => g)
    ok('A5f les graphies TTC de 032-007 : 450 recopié en HT après « 450 € TVA comprise », « prix TTC 450 € », « (TTC) »… est refusé (question du taux), rien d’écrit',
      passes.length === 0 && recopies.every(([, x]) => /^Prix TTC donné : quel taux de TVA \?/.test(x.r.donnees?.erreur ?? '')), `${passes.join(' | ')} ${JSON.stringify(recopies[0][1].r).slice(0, 200)}`)
    const modTaux = await tarifAvec(srvMod, 'modifier_tarif', { tarif_id: id(31), prix_ht: 37.5 }, ['Passe la main d’œuvre à 45 € TTC de l’heure'])
    const modJuste = await tarifAvec(srvMod, 'modifier_tarif', { tarif_id: id(31), prix_ht: 40.91 }, ['Passe la main d’œuvre à 45 € TTC de l’heure'])
    ok('A5g modifier_tarif lit le taux DU TARIF (10 %) : 37,50 € HT (la forme à 20 %) est refusé, 40,91 € HT passe', modTaux.r.resultat === 'refus' && modTaux.ecritures.length === 0 && modJuste.ecritures.some((x) => x === 'PATCH prix_artisan'),
      `${JSON.stringify(modTaux.r).slice(0, 200)} ${JSON.stringify(modJuste.ecritures)}`)
  }

  // ═══════════════════════ A6. Le « fait tout seul » relit l'escalade, comme le pilote (cinquième audit 032-007, voisin moyen) ═══════════════════════
  console.log('\n── A6. « Fait tout seul » : un fil où le client parle d’un sujet d’escalade reste une carte, même demandé (032-007)')
  const LF = id(950)
  /**
   * L'outil `outil`, DEMANDÉ par l'artisan (autonome vrai), sur un devis envoyé, une facture échue de ce devis et leur conversation LF,
   * où le client a écrit `client` (messages entrants). Rend le résultat, les e-mails partis et les routes atteintes.
   */
  async function jouerFilEscalade(mod, outil, entree, client, { panne = null, mots = undefined } = {}) {
    mondeA()
    T.devis.push({ id: id(13), artisan_id: A, numero: 'DEV-2026-0013', statut: 'envoye', objet: 'Salle de bain', client_nom: 'M. Dupont', client_email: 'dupont@essai.test', client_adresse: null, total_ht: 1000, total_tva: 100, total_ttc: 1100, remise_pct: 0, acompte_pct: 0, validite_jours: 90, conditions: null, notes: null, lead_id: LF, envoye_le: '2026-10-10T10:00:00Z' })
    T.factures.push({ id: id(22), artisan_id: A, numero: 'FAC-2026-0022', statut: 'emise', objet: 'Salle de bain', client_nom: 'M. Dupont', client_email: 'dupont@essai.test', total_ttc: 1100, date_echeance: '2026-10-01', avoir_de: null, devis_id: id(13) })
    T.leads = [{ id: LF, artisan_id: A, nom_prospect: 'M. Dupont', contact: 'dupont@essai.test', statut: 'nouveau', message: 'Bonjour, un devis pour ma salle de bain' }]
    T.messages = [
      ...client.map((contenu, i) => ({ id: id(960 + i), lead_id: LF, sens: 'in', contenu, sent_at: `2026-10-2${i}T10:00:00Z`, etat: null, type: null })),
      { id: id(959), lead_id: LF, sens: 'out', etat: 'proposition', contenu: 'Bonjour, je passe jeudi.', sent_at: '2026-10-29T10:00:00Z', type: null },
    ]
    if (mots !== undefined) T.plateforme_config = [{ artisan_id: A, escalade_mots: mots }]
    const mails = [], routes = []
    const srv = mod.actionsDeSession({ uid: A, jeton: 'jeton-essai', origine: 'http://localhost', isFounder: false, crm: false, meilleursClients: false, conversationId: id(905), tour: () => 1, magasin: conf.magasinEnMemoire(),
      dependances: { appeler: async (_g, chemin, o = {}) => { routes.push(chemin); return { status: 200, json: { ok: true } } }, envoyerMail: async (m) => { mails.push(m.to); return { ok: true } },
        envoyerDevis: async () => new Response('{}'), envoyerFacture: async () => new Response('{}'), piloterCarte: async () => null, maintenant: () => new Date('2026-11-02T09:00:00Z') },
      autonome: () => true })
    if (panne) PANNES.add(panne)
    try {
      const r = await srv.executeurs[outil](vrai(outil, entree))
      return { r, mails, routes, parti: r.donnees?.fait_tout_seul === true || mails.length > 0 || routes.length > 0 }
    } finally { if (panne) PANNES.delete(panne) }
  }
  const LITIGE = ['Litige : vous avez inondé ma cuisine, mon avocat vous écrira']
  const NEUTRE = ['Merci, je regarde le devis ce week-end']
  const OUTILS_FIL = [['relancer_devis', { numero: 'DEV-2026-0013' }], ['relancer_facture', { numero: 'FAC-2026-0022' }],
    ['valider_reponse_proposee', { conversation_id: LF }], ['repondre_client', { conversation_id: LF, texte: 'Bonjour, je vous rappelle demain.' }]]
  {
    const sorts = []
    for (const [outil, entree] of OUTILS_FIL) sorts.push([outil, await jouerFilEscalade(srvMod, outil, entree, LITIGE)])
    const partis = sorts.filter(([, x]) => x.parti).map(([o]) => o)
    ok(`A6a la brèche de 032-007 : « Relance tous les devis en attente » sur un fil en litige — les ${OUTILS_FIL.length} outils (relance de devis, d’impayé, réponse préparée, réponse) restent une CARTE, aucun e-mail, aucune route`,
      partis.length === 0 && sorts.every(([, x]) => x.r.carte?.statut === 'en_attente' && x.r.donnees?.en_attente_de_confirmation === true), `partis : ${partis.join(', ')} ; ${sorts.map(([o, x]) => `${o}=${JSON.stringify(x.r.donnees).slice(0, 120)}`).join(' | ')}`)
    ok('A6b … et le modèle sait pourquoi : le motif du pilote (« Le client parle d’un sujet sensible… »), jamais « c’est fait »',
      sorts.every(([, x]) => x.r.donnees?.pas_d_office === true && x.r.donnees?.pourquoi_une_carte === R.LIBELLE_MOTIF.escalade && /RIEN n'a été fait/.test(x.r.donnees?.a_savoir ?? '') && !/C'est FAIT/.test(x.r.donnees?.a_savoir ?? '')),
      JSON.stringify(sorts[0][1].r.donnees).slice(0, 300))
    const temoins = []
    for (const [outil, entree] of OUTILS_FIL) temoins.push([outil, await jouerFilEscalade(srvMod, outil, entree, NEUTRE)])
    ok('A6c témoin : le même fil sans sujet sensible — les quatre outils partent d’office comme avant (choix de Benj du 29/10)',
      temoins.every(([, x]) => x.r.donnees?.fait_tout_seul === true && x.parti), temoins.map(([o, x]) => `${o}=${JSON.stringify(x.r.donnees).slice(0, 120)}`).join(' | '))
  }
  {
    // Les mots de l'artisan (Ma plateforme) comptent : « carrelage » est le sien.
    const sansMot = await jouerFilEscalade(srvMod, 'relancer_devis', { numero: 'DEV-2026-0013' }, ['Merci'], { mots: ['carrelage'] })
    const avecMot = await jouerFilEscalade(srvMod, 'relancer_devis', { numero: 'DEV-2026-0013' }, ['Le carrelage est fissuré'], { mots: ['carrelage'] })
    ok('A6d les mots de l’artisan (Ma plateforme) comptent : « carrelage » est le sien — le client ne l’écrit pas, la relance part ; il l’écrit, carte',
      sansMot.parti === true && avecMot.parti === false, `${JSON.stringify(sansMot.r.donnees).slice(0, 160)} ${JSON.stringify(avecMot.r.donnees).slice(0, 160)}`)
    const fuite = await jouerFilEscalade(srvMod, 'relancer_devis', { numero: 'DEV-2026-0013' }, ['Le ballon a perdu 2 litres d’eau cette nuit', 'Merci'])
    ok('A6e le plancher commun (sujetEscalade) vaut ici, même si l’artisan a vidé ses mots : « perdu 2 litres d’eau » garde la carte',
      fuite.parti === false && (await jouerFilEscalade(srvMod, 'relancer_devis', { numero: 'DEV-2026-0013' }, ['Le ballon a perdu 2 litres d’eau'], { mots: [] })).parti === false)
  }
  {
    // Chaque panne ne touche que la relecture (la panne des messages ferait aussi refuser le registre d'une relance : d'où la réponse).
    const pannes = [
      ['messages', await jouerFilEscalade(srvMod, 'repondre_client', { conversation_id: LF, texte: 'Bonjour, je vous rappelle demain.' }, NEUTRE, { panne: 'messages' })],
      ['leads', await jouerFilEscalade(srvMod, 'relancer_devis', { numero: 'DEV-2026-0013' }, NEUTRE, { panne: 'leads' })],
      ['plateforme_config', await jouerFilEscalade(srvMod, 'relancer_devis', { numero: 'DEV-2026-0013' }, NEUTRE, { panne: 'plateforme_config' })],
      ['leads (par la facture et son devis)', await jouerFilEscalade(srvMod, 'relancer_facture', { numero: 'FAC-2026-0022' }, NEUTRE, { panne: 'leads' })],
    ]
    ok('A6f une lecture en erreur (messages, conversation, réglages) garde la carte, rien ne part (côté sûr) ; le motif le dit',
      pannes.map(([, x]) => x).every((x) => x.parti === false && x.r.carte?.statut === 'en_attente' && /pas pu être relus/.test(x.r.donnees?.pourquoi_une_carte ?? '')),
      pannes.map(([t, x]) => `${t}=${x.parti}/${x.r.carte?.statut}/${x.r.donnees?.pourquoi_une_carte}`).join(' | '))
    const mutEsc = await mutant('lib/assistant/actions-serveur.ts', ' && typePiloteDeOutil(nom)) horsAuto = await escaladeDeLaCarte(p.objet ?? null, p.entrees).catch(() => MOTIF_ESCALADE_ILLISIBLE)', ') horsAuto = horsAuto')
    const surMut = await jouerFilEscalade(mutEsc, 'relancer_devis', { numero: 'DEV-2026-0013' }, LITIGE)
    ok('A6g MUTANT (la relecture retirée : la version du cinquième audit) : le juge VOIT la brèche — la relance du fil en litige y part d’office, e-mail au client',
      surMut.parti === true && surMut.mails.includes('dupont@essai.test'), JSON.stringify(surMut.r.donnees).slice(0, 200))
    const mutPanne = await mutant('lib/assistant/actions-serveur.ts', '.catch(() => MOTIF_ESCALADE_ILLISIBLE)', '.catch(() => null)')
    const surPanne = await jouerFilEscalade(mutPanne, 'relancer_devis', { numero: 'DEV-2026-0013' }, LITIGE, { panne: 'leads' })
    ok('A6h MUTANT (une lecture en erreur lue « rien à escalader ») : le juge VOIT la brèche — conversation illisible, la relance du fil en litige y part d’office',
      surPanne.parti === true && surPanne.mails.includes('dupont@essai.test'), JSON.stringify(surPanne.r.donnees).slice(0, 200))
  }

  // ═══════════════════════ B. La règle « tout auto » : jamais un prix sans source ═══════════════════════
  console.log('\n── B. Règle « tout auto » : un devis à prix estimé ne part pas')
  const L = id(600)
  const LEAD = { id: L, artisan_id: A, nom_prospect: 'Mme Essai', contact: 'cliente@essai.test', message: 'Fuite sous évier, cuisine', type_chantier: 'Plomberie', photos: [], prise_en_main: false }
  const SOURCEES = [{ designation: 'Pose', quantite: 1, prix_unitaire_ht: 40, tva_taux: 10, source_prix: 'tarif de l’artisan' }, { designation: 'Joint', quantite: 2, prix_unitaire_ht: 12.5, tva_taux: 10, source_prix: 'prix donné par l’artisan' }]
  const ESTIMEE = [...SOURCEES, { designation: 'Robinet', quantite: 1, prix_unitaire_ht: 90, tva_taux: 10, source_prix: 'estimation' }]
  const A_CHIFFRER = [...SOURCEES, { designation: 'Dépose', quantite: 1, prix_unitaire_ht: 0, tva_taux: 10, source_prix: 'à chiffrer' }]
  /** Joue la règle de l'artisan sur une conversation, avec un chiffrage FAUX qui produit `lignes` (aucun modèle). */
  async function jouerRegle(mod, { lignes, maillons = PREREGLAGES.tout_auto.maillons, profil = PROFIL_A }) {
    vider()
    Object.assign(T, { artisans: [{ ...profil }], regles_automatisation: [{ artisan_id: A, maillons, actif: true }], devis: [], devis_lignes: [], messages: [] })
    const notes = []
    const creerDevis = async (p) => {
      const devisId = id(700)
      T.devis.push({ id: devisId, artisan_id: p.artisanId, lead_id: p.leadId, source: p.source, numero: 'DEV-2026-0700', statut: 'brouillon', total_ttc: 132 })
      for (const l of lignes) T.devis_lignes.push({ devis_id: devisId, ...l })
      return { ok: true, id: devisId, numero: 'DEV-2026-0700', total_ttc: 132, note: null, tier: 'pro', deja: false }
    }
    const notifier = async (artisanId, type, email, contenu) => { notes.push({ artisanId, type, email, contenu }); return { envoye: true } }
    const n = requetes.length
    const r = await mod.declencherRegles({ lead: { ...LEAD }, nbReponsesIA: 2, artisanEmail: 'atelier@essai.test', artisanNom: 'Atelier Essai' }, { creerDevis, notifier })
    const devis = T.devis.find((d) => d.id === id(700))
    return { r, devis, envoiMessage: T.messages.some((m) => m.type === 'devis_envoye'), notes, lus: requetes.slice(n) }
  }
  ok('B0 le profil de l’essai a toutes les mentions bloquantes (sinon B2 ne prouverait rien)', legal.mentionsManquantesEmission(legal.versArtisanLegal(PROFIL_A)).length === 0)
  const b1 = await jouerRegle(RS, { lignes: ESTIMEE })
  ok('B1 « tout auto », une ligne au prix ESTIMÉ par l’IA : rien ne part — le devis reste brouillon, aucun message « devis envoyé »',
    b1.r.fait === 'devis_cree' && b1.devis?.statut === 'brouillon' && !b1.devis?.envoye_le && !b1.envoiMessage, JSON.stringify(b1.r))
  ok('B1b … et la notification à l’artisan dit pourquoi (une ligne a un prix estimé ou à chiffrer) et que rien n’est parti',
    b1.notes.length === 1 && /brouillon/i.test(b1.notes[0].contenu.subject) && /prix estimé ou à chiffrer/.test(b1.notes[0].contenu.text) && /Rien n'est parti/.test(b1.notes[0].contenu.text) && !/Presti/.test(b1.notes[0].contenu.text), b1.notes[0]?.contenu?.text)
  const b2 = await jouerRegle(RS, { lignes: SOURCEES })
  ok('B2 « tout auto », toutes les lignes SOURCÉES (vos tarifs, prix donné par l’artisan) et mentions complètes : le devis part (comportement de la règle gardé)',
    b2.r.fait === 'devis_envoye' && b2.devis?.statut === 'envoye' && !!b2.devis?.envoye_le && b2.envoiMessage && /envoyé/.test(b2.notes[0]?.contenu?.subject ?? ''), JSON.stringify(b2.r))
  const b3 = await jouerRegle(RS, { lignes: A_CHIFFRER })
  ok('B3 une ligne « à chiffrer » à 0 € : rien ne part non plus', b3.r.fait === 'devis_cree' && b3.devis?.statut === 'brouillon' && !b3.envoiMessage)
  const b4 = await jouerRegle(RS, { lignes: SOURCEES, profil: { ...PROFIL_A, siret: null } })
  ok('B4 prix sourcés mais une mention légale manque : rien ne part (inchangé), et la notification ne parle pas de prix', b4.r.fait === 'devis_cree' && b4.devis?.statut === 'brouillon' && !/prix estimé/.test(b4.notes[0]?.contenu?.text ?? ''))
  const b5 = await jouerRegle(RS, { lignes: ESTIMEE, maillons: PREREGLAGES.reactif.maillons })
  ok('B5 une règle qui fait VALIDER (« Réactif ») : brouillon, notification inchangée (aucune phrase sur les prix) — rien d’autre ne change', b5.r.fait === 'devis_cree' && b5.devis?.statut === 'brouillon' && !/prix estimé/.test(b5.notes[0]?.contenu?.text ?? '') && /Rien n'est parti/.test(b5.notes[0]?.contenu?.text ?? ''))
  const lusDevis = b1.lus.filter((q) => q.methode === 'GET' && q.table === 'devis' && q.params.some(([k, v]) => k === 'id' && v === `eq.${id(700)}`))
  const lusLignes = b1.lus.filter((q) => q.methode === 'GET' && q.table === 'devis_lignes' && q.params.some(([k, v]) => k === 'devis_id' && v === `eq.${id(700)}`))
  ok('B6 les lignes relues sont celles du devis CRÉÉ (son id), filtrées par le compte : lignesDuDevis de lib/pilote/serveur.ts',
    lusDevis.length >= 1 && lusDevis.every((q) => q.params.some(([k, v]) => k === 'artisan_id' && v === `eq.${A}`)) && lusLignes.length >= 1
    && /const lignes = await lignesDuDevis\(p\.lead\.artisan_id, \{ id: r\.id \}\)\n\s*prixNonSource = !lignes \|\| !prixSources\(lignes\)/.test(lire('lib/reglesServeur.ts')))
  const mutB = await mutant('lib/reglesServeur.ts', 'prixNonSource = !lignes || !prixSources(lignes)', 'prixNonSource = false')
  const b7 = await jouerRegle(mutB, { lignes: ESTIMEE })
  ok('B7 MUTANT (prix non relus : la version d’avant le 02/11) : le juge VOIT la brèche — le devis au prix estimé y part', b7.r.fait === 'devis_envoye' && b7.devis?.statut === 'envoye', JSON.stringify(b7.r))

  // ═══════════════════════ B bis. L'acompte de la règle (S5) : verrou d'offre ; émis seul ou préparé, au choix de l'artisan ═══════════════════════
  console.log('\n── B bis. Acompte à l’acceptation : seulement pour une offre qui a les règles ; émis seul ou préparé pour un clic, au choix de l’artisan')
  const RG = await imp('lib/regles.ts')
  /** Joue l'acompte de la règle à l'acceptation d'un devis (lib/reglesServeur.ts) : émission et notification FAUSSES, base factice. */
  async function jouerAcompte(mod, { plan = 'signature', maillons = PREREGLAGES.tout_auto.maillons, actif = true, sansFiche = false, refus = null } = {}) {
    vider()
    Object.assign(T, { artisans: sansFiche ? [] : [{ ...PROFIL_A, plan }], regles_automatisation: [{ artisan_id: A, maillons, actif }], factures: [], messages: [] })
    const notes = [], emissions = []
    const notifier = async (artisanId, type, email, contenu) => { notes.push({ artisanId, type, email, contenu }); return { envoye: true } }
    const creerFacture = async (p) => { emissions.push(p); return refus ? { ok: false, error: refus } : { ok: true, id: id(900), numero: 'FAC-2026-0900' } }
    const a = await mod.acompteApresAcceptation(A)
    const n = requetes.length
    const r = await mod.acompteALAcceptationDuDevis({ artisanId: A, leadId: L, devisId: id(700), devisNumero: 'DEV-2026-0700', artisanEmail: 'atelier@essai.test', qui: 'Mme Essai' }, { notifier, creerFacture })
    return { a, r, notes, emissions, ecritures: ecrituresDepuis(n) }
  }
  const PREPAREE = { ...PREREGLAGES.tout_auto.maillons, acompte_seul: false }
  const e1 = await jouerAcompte(RS, { plan: 'studio' })
  ok('B8 Studio avec une règle « Tout auto » (acompte 30 %) écrite depuis le navigateur : aucun acompte, rien d’émis, aucune notification, rien d’écrit',
    e1.a === null && e1.r.fait === 'rien' && e1.emissions.length === 0 && e1.notes.length === 0 && e1.ecritures.length === 0, JSON.stringify(e1))
  const e2 = await jouerAcompte(RS, { plan: 'signature' })
  ok('B9 Signature, réglage par défaut : la facture d’acompte de 30 % part SEULE — une émission (devis, 30 %), son message dans le fil, aucune notification',
    e2.a?.pct === 30 && e2.a?.seul === true && e2.r.fait === 'facture_emise' && e2.r.numero === 'FAC-2026-0900' && e2.emissions.length === 1 && e2.emissions[0].artisanId === A && e2.emissions[0].devisId === id(700) && e2.emissions[0].acomptePct === 30
    && e2.ecritures.join() === 'POST messages' && T.messages.some((m) => m.type === 'facture_emise' && /FAC-2026-0900 \(30 %\)/.test(m.contenu)) && e2.notes.length === 0, JSON.stringify({ r: e2.r, ecritures: e2.ecritures }))
  const e2b = await jouerAcompte(RS, { plan: 'signature', maillons: PREPAREE })
  const texteE2b = `${e2b.notes[0]?.contenu?.subject ?? ''}\n${e2b.notes[0]?.contenu?.text ?? ''}`
  ok('B9b Signature, l’artisan a choisi « d’un clic » : rien d’émis, rien d’écrit, une notification qui dit le pourcentage, le devis et le clic, jamais « Presti »',
    e2b.a?.seul === false && e2b.r.fait === 'acompte_prepare' && e2b.emissions.length === 0 && e2b.ecritures.length === 0 && e2b.notes.length === 1
    && /30 % à émettre/.test(e2b.notes[0]?.contenu?.subject ?? '') && /DEV-2026-0700/.test(texteE2b) && /d'un clic/.test(texteE2b) && !/Presti/.test(texteE2b), texteE2b)
  const e2c = await jouerAcompte(RS, { plan: 'signature', refus: 'Mentions manquantes : SIRET' })
  ok('B9c émission refusée (mention manquante) : aucun message « émise », l’artisan est prévenu avec la raison', e2c.r.fait === 'refusee' && e2c.ecritures.length === 0 && e2c.notes.length === 1 && /non créée/.test(e2c.notes[0].contenu.subject) && /SIRET/.test(e2c.notes[0].contenu.text))
  const e3 = await jouerAcompte(RS, { actif: false })
  ok('B10 règle désactivée : rien', e3.a === null && e3.r.fait === 'rien' && e3.emissions.length === 0 && e3.notes.length === 0)
  const e4 = await jouerAcompte(RS, { sansFiche: true })
  ok('B11 offre illisible (aucune fiche artisan) : rien, côté sûr', e4.a === null && e4.r.fait === 'rien' && e4.emissions.length === 0 && e4.notes.length === 0)
  const e5 = await jouerAcompte(RS, { maillons: PREREGLAGES.equilibre.maillons })
  ok('B11b une règle sans acompte (« Équilibré ») : rien', e5.a === null && e5.r.fait === 'rien' && e5.emissions.length === 0)
  const e5b = await jouerAcompte(RS, { plan: 'entreprise' })
  ok('B11c l’offre Entreprise a les règles de Signature : la facture d’acompte part', e5b.r.fait === 'facture_emise' && e5b.emissions.length === 1)
  const routeAcc = lire('app/api/conversation/devis/route.ts')
  ok('B12 la route d’acceptation passe par acompteALAcceptationDuDevis (verrou, puis le choix de l’artisan) : plus aucun creerFacture en direct',
    /await acompteALAcceptationDuDevis\(\{ artisanId: lead\.artisan_id, leadId: lead\.id, devisId: devis\.id/.test(routeAcc) && !/creerFacture\(/.test(routeAcc) && /if \(r\.fait === 'facture_emise'\) facture = \{ numero: r\.numero \}/.test(routeAcc))
  ok('B12b le maillon acompte_seul : une règle d’avant le 02/11 (sans lui) garde l’émission seule ; les 4 préréglages l’ont ; la phrase dit le choix',
    RG.normaliserMaillons({ devis_auto: true, acompte_pct: 30 }).acompte_seul === true && RG.normaliserMaillons({ acompte_pct: 30, acompte_seul: false }).acompte_seul === false
    && Object.values(PREREGLAGES).every((p) => p.maillons.acompte_seul === true)
    && /créer la facture d’acompte de 30 %\.$/.test(RG.phraseRegle(PREREGLAGES.tout_auto.maillons)) && /me préparer la facture d’acompte de 30 % \(je l’émets d’un clic\)/.test(RG.phraseRegle(PREPAREE)))
  const mutAc = await mutant('lib/reglesServeur.ts', "  if (!peut(art?.plan, 'plateforme.regles')) return null\n", '')
  const e6 = await jouerAcompte(mutAc, { plan: 'studio' })
  ok('B13 MUTANT (verrou d’offre retiré : la version d’avant le 02/11) : le juge VOIT la brèche — le compte Studio obtient sa facture d’acompte', e6.r.fait === 'facture_emise' && e6.emissions.length === 1, JSON.stringify(e6.r))
  const mutChoix = await mutant('lib/reglesServeur.ts', '  if (!a.seul) {', '  if (false) {')
  const e7 = await jouerAcompte(mutChoix, { plan: 'signature', maillons: PREPAREE })
  ok('B14 MUTANT (le choix de l’artisan ignoré) : le juge VOIT l’écart — « d’un clic » réglé, le mutant émet quand même', e7.r.fait === 'facture_emise' && e7.emissions.length === 1 && e2b.r.fait === 'acompte_prepare', JSON.stringify(e7.r))

  // ═══════════════════════ C. Le pilote : l'escalade relue au départ ═══════════════════════
  console.log('\n── C1. Les sujets d’escalade (règle pure)')
  const DE_BENJ = ['litige', 'sinistre', 'avocat', 'menace', 'mise en demeure', 'plainte', 'tribunal', 'huissier', 'contentieux', 'conteste', 'contestation', 'arnaque', 'escroquerie', 'urgence', 'fuite', 'dégât des eaux', 'inondation', 'gaz', 'assurance']
  // 02/11 (contre-audit 032-004, D5) : « gaz » est lu en mot entier (MOTS_ESCALADE_ENTIERS), pour ne plus bloquer « gazon » ni « gazinière ».
  const toujours = [...R.MOTS_ESCALADE_TOUJOURS, ...R.MOTS_ESCALADE_ENTIERS]
  ok('C1a les listes toujours appliquées contiennent toute la liste du 02/11 (§3.2 et les mots par défaut de l’artisan)', DE_BENJ.every((m) => toujours.includes(m)), DE_BENJ.filter((m) => !toujours.includes(m)).join(','))
  const PHRASES = {
    'J’ai un litige avec le voisin': 'litige', 'Nous avons été sinistrés en mars': 'sinistre', 'Mon avocat vous écrira': 'avocat', 'Je vous menace pas mais…': 'menace',
    'Vous allez recevoir une mise en demeure': 'mise en demeure', 'Je vous ai mis en demeure de finir': 'en demeure', 'Je vais porter plainte': 'plainte', 'On ira au tribunal': 'tribunal',
    'Les tribunaux trancheront': 'tribunaux', 'L’huissier passe demain': 'huissier', 'Contentieux en cours': 'contentieux', 'Je conteste votre facture': 'conteste',
    'Contestation du devis': 'contestation', 'C’est une ARNAQUE': 'arnaque', 'Escroquerie !': 'escroquerie', 'Il y a urgence': 'urgence', 'J’ai une fuite sous l’évier': 'fuite',
    'Dégâts des eaux dans la salle de bain': 'dégâts des eaux', 'La cave est inondée': 'inondé', 'Une inondation hier': 'inondation', 'Ça sent le gaz': 'gaz', 'Mon assurance demande un devis': 'assurance',
  }
  const manques = Object.entries(PHRASES).filter(([p, mot]) => R.sujetEscalade([p], []) !== mot)
  ok(`C1b ${Object.keys(PHRASES).length} façons de le dire (pluriels, accords, majuscules, apostrophes, « mis en demeure », « inondée ») : toutes repérées, même sans aucun mot de l’artisan`, manques.length === 0, manques.map(([p]) => `${p} → ${R.sujetEscalade([p], [])}`).join(' | '))
  ok('C1c un message ordinaire n’est pas une escalade', R.sujetEscalade(['Bonjour, je voudrais un devis pour repeindre ma cuisine', 'Merci, à bientôt', '', null, 42], []) === null)
  ok('C1d les mots de l’artisan s’ajoutent (accents ignorés, comme motEscalade) ; ses mots par défaut sont couverts même s’il les retire',
    R.sujetEscalade(['C’est inadmissible, ce retard'], ['inadmissible']) === 'inadmissible' && R.sujetEscalade(['Problème de sécurité'], ['securite']) === 'securite'
    && R.sujetEscalade(['bonjour'], null) === null && CONFIG_DEFAUT.escalade_mots.every((m) => R.sujetEscalade([`Il y a ${m} chez moi`], []) !== null))
  ok('C1e un motif neuf « escalade », au libellé du 02/11', R.LIBELLE_MOTIF.escalade === 'Le client parle d’un sujet sensible (litige, sinistre, avocat, urgence…) : à valider à la main.' && R.MESSAGES_ESCALADE_RELUS === 10)

  console.log('\n── C2. Au départ de la file (orchestrateur, file en mémoire)')
  const T0 = new Date('2026-11-02T08:00:00Z')
  const DIX = new Date(T0.getTime() + 10 * 60_000)
  const REGLAGES = { actif: true, types: { reponse_prospect: true, relance_devis: true, relance_impaye: true, envoi_devis: true, envoi_facture: true, assistant_client: true } }
  /** Une file en mémoire (le contrat de actions_auto) ; `messages` : les messages ENTRANTS par conversation. */
  function fileMemoire(o = {}) {
    const lignes = new Map(), envois = [], consultes = []
    const e = { conversation: 'ok', carte: null, messages: {}, motsArtisan: [], panne: false, sansEscalade: false, toujours: false, ...o }
    let k = 0
    const deps = {
      drapeau: () => true,
      reprendre: async () => 0,
      mures: async (m, n) => [...lignes.values()].filter((l) => l.statut === 'a_partir' && Date.parse(l.part_le) <= m.getTime()).slice(0, n).map((l) => ({ ...l })),
      reclamer: async (l) => { const x = lignes.get(l.id); if (!x || x.statut !== 'a_partir') return false; x.statut = 'en_cours'; return true },
      terminer: async (l, statut, motif) => { const x = lignes.get(l.id); if (x && x.statut === 'en_cours') { x.statut = statut; x.motif = motif } },
      contexte: async () => ({ plan: 'signature', leads_pause: false, suspendu: false, reglages: REGLAGES, parties: 0 }),
      lignesDevis: async () => [{ prix_unitaire_ht: 40, source_prix: 'tarif de l’artisan' }],
      carteDe: async () => e.carte,
      etatConversation: async () => e.conversation,
      jeton: async () => true,
      executer: async (l) => { envois.push(l.id); return { ok: true, resume: 'parti' } },
    }
    if (!e.sansEscalade) {
      deps.escalade = async (_l, leadId) => {
        consultes.push(leadId)
        if (e.panne) throw new Error('messages du client illisibles : rien ne part')
        return e.toujours || R.sujetEscalade(e.messages[leadId] ?? [], e.motsArtisan) !== null
      }
    }
    const inserer = (p) => { const lid = id(800 + ++k); lignes.set(lid, { id: lid, artisan_id: A, lead_id: null, libelle: 'essai', prete_le: T0.toISOString(), part_le: R.partLe(T0).toISOString(), statut: 'a_partir', motif: null, ...p }); return lid }
    return { deps, e, envois, consultes, lignes, inserer }
  }
  const L1 = id(601), L2 = id(602), L3 = id(603)
  const proposition = (f) => f.inserer({ type: 'reponse_prospect', source: 'proposition', ref_id: id(611), lead_id: L1 })
  const statut = (f, lid) => f.lignes.get(lid)
  /** Le premier scénario de C2, rejoué sur l'orchestrateur `tf`. */
  async function scenarioAvocat(tf) {
    const f = fileMemoire({ messages: { [L1]: ['Bonjour, je voudrais un devis', 'Si ce n’est pas réglé, je prends un avocat'] } })
    const lid = proposition(f)
    await tf(f.deps, DIX)
    return { f, l: statut(f, lid) }
  }
  {
    const { f, l } = await scenarioAvocat(traiterFile)
    ok('C2a réponse préparée à un prospect qui écrit « je prends un avocat » : rien ne part, la ligne passe à la main, motif « escalade »', l.statut === 'manuel' && l.motif === R.LIBELLE_MOTIF.escalade && f.envois.length === 0 && f.consultes.includes(L1), JSON.stringify(l))
  }
  {
    const f = fileMemoire({ messages: { [L1]: ['Bonjour, je voudrais un devis pour ma cuisine', 'Merci !'] } })
    const lid = proposition(f)
    await traiterFile(f.deps, DIX)
    ok('C2b sans mot d’escalade : elle part (une fois)', statut(f, lid).statut === 'partie' && f.envois.length === 1)
  }
  {
    const f = fileMemoire({ toujours: true, carte: { outil: 'relancer_devis', contenuClientLu: false, leadId: null } })
    const lid = f.inserer({ type: 'relance_devis', source: 'carte', ref_id: id(612) })
    await traiterFile(f.deps, DIX)
    ok('C2c une ligne SANS conversation (relance d’un devis qui n’en a pas) : rien n’est relu et elle part — pas annulée pour autant', statut(f, lid).statut === 'partie' && f.envois.length === 1 && f.consultes.length === 0)
  }
  {
    const f = fileMemoire({ carte: { outil: 'repondre_client', contenuClientLu: false, leadId: L2 }, messages: { [L2]: ['On se verra au tribunal'] } })
    const lid = f.inserer({ type: 'assistant_client', source: 'carte', ref_id: id(613) })
    await traiterFile(f.deps, DIX)
    ok('C2d message de l’assistant au client (carte rattachée à une conversation) qui parle de tribunal : à la main, motif « escalade »', statut(f, lid).statut === 'manuel' && statut(f, lid).motif === R.LIBELLE_MOTIF.escalade && f.envois.length === 0 && f.consultes.includes(L2))
  }
  {
    const f = fileMemoire({ carte: { outil: 'relancer_facture', contenuClientLu: false, leadId: L3 }, messages: { [L3]: ['Je conteste cette facture'] } })
    const lid = f.inserer({ type: 'relance_impaye', source: 'carte', ref_id: id(614) })
    await traiterFile(f.deps, DIX)
    ok('C2e relance d’impayé d’un client qui « conteste » : à la main', statut(f, lid).statut === 'manuel' && f.envois.length === 0)
    const g = fileMemoire({ carte: { outil: 'relancer_facture', contenuClientLu: false, leadId: L3 }, messages: { [L3]: ['Merci pour la facture'] } })
    const lg = g.inserer({ type: 'relance_impaye', source: 'carte', ref_id: id(615) })
    await traiterFile(g.deps, DIX)
    ok('C2f la même relance, sans sujet sensible : elle part', statut(g, lg).statut === 'partie' && g.envois.length === 1)
  }
  {
    const f = fileMemoire({ messages: { [L1]: ['C’est inadmissible'] }, motsArtisan: ['inadmissible'] })
    const lid = proposition(f)
    await traiterFile(f.deps, DIX)
    ok('C2g un mot que l’ARTISAN a ajouté (Ma plateforme) compte aussi', statut(f, lid).statut === 'manuel' && statut(f, lid).motif === R.LIBELLE_MOTIF.escalade)
  }
  {
    const f = fileMemoire({ panne: true })
    const lid = proposition(f)
    await traiterFile(f.deps, DIX)
    ok('C2h messages illisibles : rien ne part (échec inscrit, fail-closed)', statut(f, lid).statut === 'echec' && f.envois.length === 0 && /illisibles/.test(statut(f, lid).motif))
  }
  {
    const f = fileMemoire({ sansEscalade: true, messages: { [L1]: ['je prends un avocat'] } })
    const lid = proposition(f)
    await traiterFile(f.deps, DIX)
    ok('C2i dépendance FACULTATIVE : les faux d’avant le 02/11 (sans « escalade ») marchent comme avant (la vraie la fournit : C3)', statut(f, lid).statut === 'partie')
  }
  {
    const f = fileMemoire({ conversation: 'prise_en_main', messages: { [L1]: ['je prends un avocat'] } })
    const lid = proposition(f)
    await traiterFile(f.deps, DIX)
    ok('C2j les garde-fous d’avant passent d’abord (conversation reprise en main : annulée, comme avant)', statut(f, lid).statut === 'annulee')
  }
  const mutF = await mutant('lib/pilote/file.ts', "if (leadId && d.escalade && (await d.escalade(l, leadId, maintenant))) { await manuel('escalade'); continue }", '')
  {
    const { f, l } = await scenarioAvocat(mutF.traiterFile)
    ok('C2k MUTANT (escalade non relue : la version d’avant le 02/11) : le juge VOIT la brèche — la réponse au client qui prend un avocat y part', l.statut === 'partie' && f.envois.length === 1, JSON.stringify(l))
  }

  console.log('\n── C3. La vraie dépendance (lib/pilote/executeur.ts), sur la doublure de PostgREST')
  const D1 = id(621), D2 = id(622), F1 = id(631), LB = id(640)
  const mondeC = (messages = [], mots = []) => {
    vider()
    Object.assign(T, {
      leads: [
        { id: L1, artisan_id: A, nom_prospect: 'Mme Essai', contact: null, message: 'Bonjour, devis pour une salle de bain', statut: 'en_discussion', prise_en_main: false, canal: null },
        { id: LB, artisan_id: B, nom_prospect: 'M. Autre', contact: null, message: 'Litige : mon avocat vous écrira', statut: 'nouveau', prise_en_main: false, canal: null },
      ],
      messages: [
        { id: id(650), lead_id: L1, sens: 'in', type: 'manuel', etat: null, sent_at: '2026-11-01T08:00:00Z', contenu: 'Bonjour, devis pour une salle de bain' },
        { id: id(651), lead_id: L1, sens: 'out', type: 'reponse_auto', etat: null, sent_at: '2026-11-01T08:05:00Z', contenu: 'Aucun litige à craindre, nous sommes assurés' },
        ...messages,
      ],
      plateforme_config: [{ artisan_id: A, escalade_mots: mots }],
      devis: [{ id: D1, artisan_id: A, numero: 'DEV-2026-0621', lead_id: L1 }, { id: D2, artisan_id: A, numero: 'DEV-2026-0622', lead_id: null }, { id: id(623), artisan_id: B, numero: 'DEV-2026-0623', lead_id: LB }],
      factures: [{ id: F1, artisan_id: A, numero: 'FAC-2026-0631', devis_id: D1 }],
      assistant_actions: [],
    })
  }
  const deps = EXE.dependancesSupabase()
  const ligne = (p = {}) => ({ id: id(660), artisan_id: A, type: 'reponse_prospect', source: 'proposition', ref_id: id(661), lead_id: L1, libelle: 'essai', prete_le: T0.toISOString(), part_le: DIX.toISOString(), ...p })
  ok('C3a la vraie file fournit la dépendance « escalade »', typeof deps.escalade === 'function')
  mondeC()
  ok('C3b seuls les messages ENTRANTS comptent : l’artisan qui écrit lui-même « litige », « assurés » ne bloque rien', (await deps.escalade(ligne(), L1, DIX)) === false)
  mondeC([{ id: id(652), lead_id: L1, sens: 'in', type: 'manuel', etat: null, sent_at: '2026-11-01T09:00:00Z', contenu: 'Je conteste, mon avocat vous écrira' }])
  let n = requetes.length
  ok('C3c un message ENTRANT « je conteste, mon avocat… » → escalade, même si l’artisan a vidé ses mots (liste toujours appliquée)', (await deps.escalade(ligne(), L1, DIX)) === true)
  const lusMsg = requetes.slice(n).filter((q) => q.table === 'messages')
  ok('C3d lecture bornée : messages de CETTE conversation, sens « in », les plus récents d’abord, 10 au plus',
    lusMsg.length === 1 && lusMsg[0].params.some(([k, v]) => k === 'lead_id' && v === `eq.${L1}`) && lusMsg[0].params.some(([k, v]) => k === 'sens' && v === 'eq.in')
    && lusMsg[0].url.searchParams.get('order') === 'sent_at.desc' && lusMsg[0].url.searchParams.get('limit') === '10', lusMsg.map((q) => q.url.search).join(' '))
  mondeC([{ id: id(653), lead_id: L1, sens: 'in', type: 'manuel', etat: null, sent_at: '2026-11-01T09:00:00Z', contenu: 'C’est inadmissible' }], ['inadmissible'])
  ok('C3e un mot de l’artisan (plateforme_config.escalade_mots) compte', (await deps.escalade(ligne(), L1, DIX)) === true)
  mondeC()
  ok('C3f la conversation d’un AUTRE compte ne se lit pas (rien relu, rien bloqué par erreur)', (await deps.escalade(ligne(), LB, DIX)) === false)
  // carteDe : la conversation d'une carte, par son objet.
  const carte = (nId, artisan, outil, objet_type, objet_id, entrees = {}) => ({ id: nId, artisan_id: artisan, conversation_id: id(900), tour: 1, outil, mode: 'confirmation', statut: 'en_attente', titre: 'essai', entrees, apercu: {}, annulation: null, resultat_resume: null, objet_type, objet_id, cree_le: T0.toISOString(), maj_le: T0.toISOString(), expire_le: null })
  mondeC()
  T.assistant_actions.push(carte(id(671), A, 'relancer_devis', 'devis', D1, { numero: 'DEV-2026-0621' }), carte(id(672), A, 'relancer_facture', 'facture', F1, { numero: 'FAC-2026-0631' }),
    carte(id(673), A, 'repondre_client', 'conversation', L1, { conversation_id: L1, texte: 'Bonjour' }), carte(id(674), A, 'envoyer_devis', 'devis', D2, { numero: 'DEV-2026-0622' }),
    carte(id(675), B, 'relancer_devis', 'devis', id(623), { numero: 'DEV-2026-0623' }))
  const lc = async (ref) => deps.carteDe(ligne({ source: 'carte', ref_id: ref, lead_id: null, type: 'relance_devis' }))
  const [c1, c2, c3, c4, c5] = [await lc(id(671)), await lc(id(672)), await lc(id(673)), await lc(id(674)), await lc(id(675))]
  ok('C3g carteDe rend la conversation de la carte : celle du devis (relance), du devis de la facture (impayé), la conversation elle-même (réponse)',
    c1?.leadId === L1 && c2?.leadId === L1 && c3?.leadId === L1, JSON.stringify([c1, c2, c3]))
  ok('C3h devis sans conversation : leadId null (la ligne partira sans relecture) ; carte d’un autre compte : introuvable', c4 !== null && c4.leadId === null && c5 === null)
  ok('C3i les lectures de carteDe sont filtrées par le compte (devis, factures)', requetes.filter((q) => ['devis', 'factures'].includes(q.table) && q.methode === 'GET').every((q) => q.params.some(([k, v]) => k === 'artisan_id' && v === `eq.${A}`)))
  {
    // De bout en bout : la vraie orchestration avec les vraies lectures de carte et d'escalade, les autres étapes doublées.
    mondeC([{ id: id(654), lead_id: L1, sens: 'in', type: 'manuel', etat: null, sent_at: '2026-11-01T09:00:00Z', contenu: 'Votre relance ? Mon avocat va vous répondre.' }])
    T.assistant_actions.push(carte(id(676), A, 'relancer_devis', 'devis', D1, { numero: 'DEV-2026-0621' }))
    const file = new Map([[id(680), { id: id(680), artisan_id: A, type: 'relance_devis', source: 'carte', ref_id: id(676), lead_id: null, libelle: 'Relancer', prete_le: T0.toISOString(), part_le: DIX.toISOString(), statut: 'a_partir' }]])
    const envois = []
    const d = {
      ...deps,
      reprendre: async () => 0,
      mures: async () => [...file.values()].filter((l) => l.statut === 'a_partir').map((l) => ({ ...l })),
      reclamer: async (l) => { const x = file.get(l.id); if (x.statut !== 'a_partir') return false; x.statut = 'en_cours'; return true },
      terminer: async (l, s, m) => { const x = file.get(l.id); x.statut = s; x.motif = m },
      contexte: async () => ({ plan: 'signature', leads_pause: false, suspendu: false, reglages: REGLAGES, parties: 0 }),
      drapeau: () => true,
      jeton: async () => true,
      executer: async (l) => { envois.push(l.id); return { ok: true, resume: 'parti' } },
    }
    await traiterFile(d, DIX)
    const x = file.get(id(680))
    ok('C3j bout en bout : la relance de devis d’un client qui « prend un avocat » (carte SANS lead_id en file : conversation retrouvée par le devis) reste à la main', x.statut === 'manuel' && x.motif === R.LIBELLE_MOTIF.escalade && envois.length === 0, JSON.stringify(x))
  }
  {
    // 02/11 (audit 032-001, D3) : l'attaque 3 — la lecture de la conversation (« leads ») en erreur rendait « rien à escalader ».
    const AVOCAT = [{ id: id(655), lead_id: L1, sens: 'in', type: 'manuel', etat: null, sent_at: '2026-11-01T09:00:00Z', contenu: 'Je conteste votre facture, mon avocat vous écrira.' }]
    const essai = async (d) => { PANNES.add('leads'); try { return { rendu: await d.escalade(ligne(), L1, DIX) } } catch (e) { return { leve: e } } finally { PANNES.delete('leads') } }
    mondeC(AVOCAT)
    const issue = await essai(deps)
    ok('C3k conversation illisible (lecture de « leads » en erreur, message « mon avocat » en base) : l’escalade LÈVE, rien ne part (audit 032-001, D3)',
      issue.leve instanceof Error && /illisible/.test(issue.leve.message), JSON.stringify(issue.rendu ?? String(issue.leve)))
    mondeC(AVOCAT)
    ok('C3l … et une conversation réellement absente rend toujours false (C3f inchangé : seule une erreur lève)', (await deps.escalade(ligne(), id(699), DIX)) === false)
    const EXE2 = await copie('lib/pilote/executeur.ts', {
      remplacer: [['const lead = await leadDuCompteStrict(leadId, l.artisan_id)', 'const lead = await leadDuCompte(leadId, l.artisan_id)']],
      doublures: { '@/lib/envoisPdfServeur': "export async function envoyerDevisServeur(): Promise<never> { throw new Error('doublure') }\nexport async function envoyerFactureServeur(): Promise<never> { throw new Error('doublure') }\n" },
    })
    mondeC(AVOCAT)
    const mut = await essai(EXE2.dependancesSupabase())
    ok('C3m MUTANT (lecture de la conversation sans son erreur : la version de l’audit) : le juge VOIT la brèche — l’escalade y rend false, la ligne partirait',
      mut.rendu === false, JSON.stringify(mut.rendu ?? String(mut.leve)))
  }
  {
    // 02/11 (contre-audit 032-004, D3) : les réglages de l'artisan et le compte de ses réponses, lus avec leur erreur.
    const FISSURE = [{ id: id(656), lead_id: L1, sens: 'in', type: 'manuel', etat: null, sent_at: '2026-11-01T09:00:00Z', contenu: 'Le carrelage fissuré est revenu' }]
    const lever = async (f) => { try { return { rendu: await f() } } catch (e) { return { leve: e } } }
    mondeC(FISSURE, ['carrelage fissuré'])
    ok('C3n témoin : un mot PROPRE à l’artisan (« carrelage fissuré »), base saine → escalade', (await deps.escalade(ligne(), L1, DIX)) === true)
    PANNES.add('plateforme_config')
    const cfgPanne = await lever(() => deps.escalade(ligne(), L1, DIX)).finally(() => PANNES.delete('plateforme_config'))
    ok('C3o réglages de la plateforme illisibles : l’escalade LÈVE (le mot de l’artisan n’est pas remplacé par les défauts), rien ne part',
      cfgPanne.leve instanceof Error && /illisibles/.test(cfgPanne.leve.message), JSON.stringify(cfgPanne.rendu ?? String(cfgPanne.leve)))
    mondeC([...FISSURE.map((m) => ({ ...m, contenu: 'Bonjour' })), ...[1, 2, 3].map((k) => ({ id: id(657 + k), lead_id: L1, sens: 'out', type: 'reponse_auto', etat: null, sent_at: `2026-11-01T1${k}:00:00Z`, contenu: 'Réponse' }))])
    T.plateforme_config = [{ artisan_id: A, escalade_mots: [], limite_messages: 2 }]
    ok('C3p témoin : 3 réponses de l’IA pour une limite de 2 → « limite »', (await deps.etatConversation(ligne(), DIX)) === 'limite')
    PANNES.add('messages')
    const comptePanne = await lever(() => deps.etatConversation(ligne(), DIX)).finally(() => PANNES.delete('messages'))
    ok('C3q compte des réponses illisible : etatConversation LÈVE (la limite ne saute pas), rien ne part', comptePanne.leve instanceof Error && /illisibles/.test(comptePanne.leve.message), JSON.stringify(comptePanne.rendu ?? String(comptePanne.leve)))
    const EXE3 = await copie('lib/pilote/executeur.ts', {
      remplacer: [['import { getPlateformeConfigStrict, dansLaPlage }', 'import { getPlateformeConfig as getPlateformeConfigStrict, dansLaPlage }'], ["      if (errCompte) throw new Error('réponses de la conversation illisibles : rien ne part')\n", '']],
      doublures: { '@/lib/envoisPdfServeur': "export async function envoyerDevisServeur(): Promise<never> { throw new Error('doublure') }\nexport async function envoyerFactureServeur(): Promise<never> { throw new Error('doublure') }\n" },
    })
    const dm = EXE3.dependancesSupabase()
    mondeC(FISSURE, ['carrelage fissuré'])
    PANNES.add('plateforme_config')
    const m1 = await lever(() => dm.escalade(ligne(), L1, DIX)).finally(() => PANNES.delete('plateforme_config'))
    mondeC([...FISSURE.map((m) => ({ ...m, contenu: 'Bonjour' })), ...[1, 2, 3].map((k) => ({ id: id(657 + k), lead_id: L1, sens: 'out', type: 'reponse_auto', etat: null, sent_at: `2026-11-01T1${k}:00:00Z`, contenu: 'Réponse' }))])
    T.plateforme_config = [{ artisan_id: A, escalade_mots: [], limite_messages: 2 }]
    PANNES.add('messages')
    const m2 = await lever(() => dm.etatConversation(ligne(), DIX)).finally(() => PANNES.delete('messages'))
    ok('C3r MUTANT (réglages et compte lus sans leur erreur : la version du contre-audit) : le juge VOIT les brèches — le mot de l’artisan perdu, la limite sautée',
      m1.rendu === false && m2.rendu === 'ok', `${JSON.stringify(m1.rendu ?? String(m1.leve))} ${JSON.stringify(m2.rendu ?? String(m2.leve))}`)
  }

  console.log('\n── C4. Le lexique d’escalade couvre les synonymes courants (audit 032-001, D5)')
  const SENSIBLES = ['Je vais vous attaquer en justice', 'On se verra au procès', 'Votre travail est une malfaçon, je saisis les prud’hommes', 'Il y a eu un incendie après votre passage',
    'Mon fils a été blessé par le chauffe-eau', 'Gros dégâts dans la cuisine depuis hier', 'Je fais jouer la garantie décennale', 'Un expert passera constater',
    'Je ne paierai pas cette facture', 'Je vous signale à la DGCCRF',
    // Contre-audit 032-004 (D5) : les vingt tournures qu'il a trouvées encore manquées.
    'Je vais saisir le juge', 'J’ai subi un préjudice, j’attends une indemnisation', 'Je demande un dédommagement', 'Je vous envoie une lettre recommandée', 'C’est un vice caché',
    'J’ai fait opposition sur le paiement', 'Je ne vous paie pas tant que ce n’est pas réparé', 'Je ne réglerai pas cette facture', 'Je vais laisser un avis négatif partout',
    'Je vais vous faire une mauvaise pub sur Google', 'C’est dangereux, les fils sont à nu', 'Le plafond s’est écroulé', 'Il y a de l’eau partout dans la salle de bain',
    'Infiltration au plafond depuis votre passage', 'Je dépose une réclamation', 'J’ai contacté UFC-Que Choisir', 'Ma fille est tombée de l’échafaudage', 'Court-circuit depuis votre intervention',
    'Ça sent le gaz dans la cuisine',
    // Troisième audit 032-005 (D5) : ses vingt-deux tournures.
    'Je contacte mon assureur', 'Mon assureur va vous écrire', 'C’est du vol', 'Vous êtes des voleurs', 'Je vais vous poursuivre', 'Je vais vous attaquer', 'Votre ton est menaçant',
    'Je ne paierai rien', 'Vous n’aurez pas un centime', 'Je bloque le paiement', 'Je retiens le solde', 'Je vous mets une étoile sur Google', 'Le chauffe-eau a explosé',
    'Ça fait des étincelles dans le tableau', 'Ça fume derrière la prise', 'J’ai pris une décharge en touchant le robinet', 'Mon fils s’est coupé sur un clou', 'On a appelé le SAMU',
    'Je vais faire un signalement', 'Je réclame la remise en état', 'Il y a un conflit avec votre équipe', 'Je vous dénonce à l’Urssaf',
    // Quatrième audit 032-006 : E2 (« ça fuit », le §3.2 nomme la fuite), « urgent », et ses synonymes manqués.
    'Mon robinet fuit', 'Le ballon fuit depuis ce matin', 'Ça fuit sous l’évier', 'Le toit fuit quand il pleut', 'Les canalisations fuient', 'Bonjour, mon ballon d’eau chaude fuit, pouvez-vous passer ?',
    'C’est urgent', 'Très urgent svp', 'Urgent : plus d’eau chaude', 'L’eau coule du plafond', 'Ça goutte du plafond de la cuisine', 'Mon disjoncteur saute sans arrêt', 'Vous m’avez escroqué',
    'Je vais me plaindre', 'Je veux des dommages et intérêts', 'Je vais contacter une association de consommateurs', 'Travail bâclé', 'C’est mal fait, je ne suis pas content',
    'Je vais vous signaler à la répression des fraudes']
  const rates = SENSIBLES.filter((m) => R.sujetEscalade([m], []) === null)
  ok(`C4a les ${SENSIBLES.length} messages sensibles des deux audits : tous renvoyés à la main`, rates.length === 0, rates.join(' | '))
  const ANODINS = ['Bonjour, je voudrais un devis pour ma salle de bain', 'Merci pour la facture, je règle demain', 'Pouvez-vous passer jeudi matin ?', 'Le carrelage me plaît beaucoup', 'Samuel vous rappellera',
    // Contre-audit 032-004 (D5) : ses faux positifs, réglés (mot entier, « pas d'urgence », « pas payer » trop large).
    'Pas d’urgence, quand vous pouvez', 'Je ne veux pas payer trop cher', 'Quel est le processus pour le devis ?', 'Mon voisin, M. Gazzola, m’a donné votre nom',
    'Ma gazinière est à changer aussi', 'Le gazon devant la maison est fragile', 'Accidentellement j’ai cassé la poignée', 'Mon mari est pompier, il sera là le matin',
    'Je vous recommande à mes voisins', 'Ça tombe bien, je suis là lundi',
    // Troisième audit 032-005 (D5) : ses faux positifs levés, et le jargon du chantier (« on attaque lundi »).
    'Sans dégât sur le parquet, merci', 'Il y a eu une chute de neige', 'On attaque le chantier lundi ?', 'Samuel passera', 'Cinq étoiles pour votre équipe']
  const fauxPositifs = ANODINS.filter((m) => R.sujetEscalade([m], []) !== null)
  ok(`C4b ${ANODINS.length} messages ordinaires : aucun ne part à la main (le lexique ne bloque pas tout)`, fauxPositifs.length === 0, fauxPositifs.map((m) => `${m} → ${R.sujetEscalade([m], [])}`).join(' | '))
  const mutL = await mutant('lib/pilote/regles.ts', "  'paierai pas', 'payerai pas', 'réglerai pas', 'paie pas', 'paye pas', 'pas payer cette', 'pas payer la', 'pas payer tant', 'refuse de payer',\n", '')
  ok('C4c MUTANT (une ligne des synonymes retirée) : le juge VOIT la brèche — « Je ne paierai pas cette facture » y passe sans escalade',
    mutL.sujetEscalade(['Je ne paierai pas cette facture'], []) === null && R.sujetEscalade(['Je ne paierai pas cette facture'], []) !== null)
  const mutE = await mutant('lib/pilote/regles.ts', 'for (const [m, k] of RACINES_ENTIERES) if (k && mots.includes(` ${k} `)) return m', 'for (const [m, k] of RACINES_ENTIERES) if (k && mots.includes(` ${k}`)) return m')
  ok('C4d MUTANT (les mots entiers lus comme des débuts de mot : la version du contre-audit) : le juge VOIT le faux positif — « Le gazon devant la maison » y part à la main',
    mutE.sujetEscalade(['Le gazon devant la maison est fragile'], []) !== null && R.sujetEscalade(['Le gazon devant la maison est fragile'], []) === null)

  console.log('\n── C6. La réponse qui part SEULE au prospect lit aussi les sujets d’escalade toujours appliqués (contre-audit 032-004, I3)')
  {
    const PC = await imp('lib/plateformeConfig.ts')
    const auto = { ...CONFIG_DEFAUT, mode_reponse: 'auto', auto_24_7: true }
    const assistee = { ...CONFIG_DEFAUT, mode_reponse: 'assistee' }
    const r1 = PC.iaDoitRepondre(auto, { nbReponsesIA: 0, message: 'Litige en cours : mon avocat vous écrira' })
    const r2 = PC.iaDoitRepondre(auto, { nbReponsesIA: 0, message: 'Je vais porter plainte contre vous' })
    const r3 = PC.iaDoitRepondre(auto, { nbReponsesIA: 0, message: 'Sinistre chez moi après vos travaux' })
    ok('C6a mode « auto » : litige, plainte, sinistre ne reçoivent jamais de réponse seule de l’IA (escalade : l’artisan est alerté)',
      [r1, r2, r3].every((r) => r.ok === false && r.raison === 'escalade'), JSON.stringify([r1, r2, r3]))
    ok('C6b témoins : un message ordinaire part seul en « auto » ; en « assistée », le même litige reste un brouillon à relire (pas d’envoi seul)',
      PC.iaDoitRepondre(auto, { nbReponsesIA: 0, message: 'Bonjour, devis pour une salle de bain' }).ok === true && PC.iaDoitRepondre(assistee, { nbReponsesIA: 0, message: 'Litige en cours : mon avocat vous écrira' }).raison === 'assistee')
    const mutI = await mutant('lib/plateformeConfig.ts', '  if (sujet) return { ok: false, raison: \'escalade\', mot: sujet }\n', '')
    ok('C6c MUTANT (la liste toujours appliquée non lue par la réponse seule : la version du contre-audit) : le juge VOIT la brèche — « Litige en cours : mon avocat… » y reçoit une réponse seule',
      mutI.iaDoitRepondre(auto, { nbReponsesIA: 0, message: 'Litige en cours : mon avocat vous écrira' }).ok === true)
    // Troisième audit 032-005 (I3) : le message suivant du même client, sans le mot, ne reçoit pas de réponse seule — le fil est relu.
    const FIL = ['Litige : mon avocat vous écrira']
    const suite = PC.iaDoitRepondre(auto, { nbReponsesIA: 0, message: 'Alors, vous me répondez ?', messagesClient: FIL })
    const sansFil = PC.iaDoitRepondre(auto, { nbReponsesIA: 0, message: 'Alors, vous me répondez ?' })
    ok('C6d « Alors, vous me répondez ? » juste après « Litige : mon avocat vous écrira » : escalade (le fil récent du client est relu) ; seul, ce message part',
      suite.ok === false && suite.raison === 'escalade' && sansFil.ok === true, JSON.stringify([suite, sansFil]))
    const decision = PC.decisionReponse({ plan: 'signature', leads_pause: false }, { prise_en_main: false }, auto, { nbReponsesIA: 0, message: 'Alors, vous me répondez ?', messagesClient: FIL })
    ok('C6e … et decisionReponse le transmet (le chemin des routes de conversation)', decision.ok === false && decision.raison === 'escalade', JSON.stringify(decision))
    const mutFil = await mutant('lib/plateformeConfig.ts', 'sujetEscalade([ctx.message, ...(ctx.messagesClient ?? [])], cfg.escalade_mots)', 'sujetEscalade([ctx.message], cfg.escalade_mots)')
    ok('C6f MUTANT (le fil non relu : la version du troisième audit) : le juge VOIT la brèche — la suite du litige y reçoit une réponse seule',
      mutFil.iaDoitRepondre(auto, { nbReponsesIA: 0, message: 'Alors, vous me répondez ?', messagesClient: FIL }).ok === true)
    // Quatrième audit 032-006 (E2) : « mon ballon fuit » ne reçoit pas de réponse seule en mode « auto » (le chemin des routes).
    const fuit = PC.decisionReponse({ plan: 'signature', leads_pause: false }, { prise_en_main: false }, auto, { nbReponsesIA: 0, message: 'Bonjour, mon ballon d’eau chaude fuit, pouvez-vous passer ?' })
    ok('C6h « Bonjour, mon ballon d’eau chaude fuit, pouvez-vous passer ? » (Signature, auto) : escalade, aucune réponse seule', fuit.ok === false && fuit.raison === 'escalade', JSON.stringify(fuit))
    const mutFuit = await mutant('lib/pilote/regles.ts', "  'fui', 'fuy', 'perd de l’eau', 'perdent de l’eau', 'perte d’eau', 'urgen', 'urgemment',\n", '')
    ok('C6i MUTANT (les racines « fui », « fuy » et « urgen » retirées : la version du quatrième audit) : le juge VOIT la brèche — « Mon robinet fuit » y passe sans escalade',
      mutFuit.sujetEscalade(['Mon robinet fuit'], []) === null && R.sujetEscalade(['Mon robinet fuit'], []) !== null)
    // Cinquième audit 032-007 (E3) : toutes les formes de « fuir » et « perd de l'eau ».
    const E3 = ['Bonjour, mon chauffe-eau a fui cette nuit, pouvez-vous passer ?', 'Le robinet a fui toute la nuit', 'Ça a fui sous l’évier', 'Le ballon commence à fuir', 'Le robinet s’est mis à fuir',
      'Le toit continue de fuir', 'Le joint va fuir', 'Le ballon fuira bientôt', 'Bonjour, mon chauffe-eau perd de l’eau, pouvez-vous passer ?', 'Le ballon perd de l’eau par le bas', 'Ma chaudière perd de l’eau',
      'Mon robinet fuie', 'Ça fui', 'Les tuyaux fuyaient']
    const ratesE3 = E3.filter((m) => R.sujetEscalade([m], []) === null)
    const auto3 = E3.map((m) => PC.decisionReponse({ plan: 'signature', leads_pause: false }, { prise_en_main: false }, auto, { nbReponsesIA: 0, message: m })).filter((d) => d.ok === true)
    ok(`C6j les ${E3.length} formes de 032-007 (« a fui », « s’est mis à fuir », « fuira », « perd de l’eau »…) : escalade, aucune réponse seule en Signature « auto »`,
      ratesE3.length === 0 && auto3.length === 0, ratesE3.join(' | '))
    ok('C6k … sans prendre « un fusible à changer » pour une fuite (faux positif écarté)', R.sujetEscalade(['Un fusible à changer'], []) === null)
    // Sixième audit 032-008 (E4, M1, M2) : « perdre de l'eau » conjugué ou entrecoupé, ses fautes courantes, et « refuit ».
    const E4 = ['Le ballon perdait de l’eau', 'Le ballon a perdu de l’eau cette nuit', 'Mon ballon perd beaucoup d’eau', 'Le ballon perd un peu d’eau',
      'Le cumulus perd énormément d’eau', 'Il y a des pertes d’eau', 'Mon chauffe-eau perd d’eau', 'mon chauffe-eau perd de leau',
      'Les radiateurs perdaient de l’eau', 'Le ballon perd pas mal d’eau', 'Le robinet refuit depuis votre passage', 'Ça refuit']
    const ratesE4 = E4.filter((m) => R.sujetEscalade([m], []) === null)
    const auto4 = E4.map((m) => PC.decisionReponse({ plan: 'signature', leads_pause: false }, { prise_en_main: false }, auto, { nbReponsesIA: 0, message: m })).filter((d) => d.ok === true)
    ok(`C6l les ${E4.length} formes de 032-008 (« a perdu de l’eau », « perd beaucoup d’eau », « des pertes d’eau », « refuit »…) : escalade, aucune réponse seule en Signature « auto »`,
      ratesE4.length === 0 && auto4.length === 0, ratesE4.join(' | '))
    const ORDINAIRES = ['La chaudière perd de la pression', 'Je perds patience, rappelez-moi', 'J’ai perdu votre devis, pouvez-vous le renvoyer ?', 'La chaudière perd en pression',
      'Je ne veux pas perdre du temps', 'Mon ballon perd sa chaleur la nuit', 'Je voudrais réduire mes pertes de chaleur', 'Refuge pour chats : devis de clôture',
      // 032-011 : la fenêtre élargie ne prend ni « pertinent », ni « perturbation », ni la notice d'un chauffe-eau.
      'Est-ce pertinent de changer le ballon ?', 'Perturbation de l’eau chaude le matin', 'J’ai perdu la notice du chauffe-eau']
    const prisE4 = ORDINAIRES.filter((m) => R.sujetEscalade([m], []) !== null)
    ok('C6m … sans prendre « perd de la pression », « j’ai perdu votre devis », « pertes de chaleur » ni « refuge » pour une fuite', prisE4.length === 0, prisE4.join(' | '))
    const mutPerte = await mutant('lib/pilote/regles.ts', "    if (PERTE_D_EAU.test(mots)) return 'perte d’eau'\n", '')
    ok('C6l MUTANT (la classe « perdre … eau » retirée : la version du cinquième audit) : le juge VOIT la brèche — « Le ballon a perdu de l’eau cette nuit » y passe sans escalade',
      mutPerte.sujetEscalade(['Le ballon a perdu de l’eau cette nuit'], []) === null && R.sujetEscalade(['Le ballon a perdu de l’eau cette nuit'], []) !== null)
    // Septième audit 032-011 (E5, M3, M5) : un chiffre, plus de trois mots glissés, « deau » collé, une incise ôtée par FAUSSE_URGENCE.
    const E5 = ['Le ballon perd 2 litres d’eau par jour', 'Mon chauffe-eau perd 1 litre d’eau par nuit', 'Le ballon perd de plus en plus d’eau',
      'Le ballon perd un tout petit peu d’eau', 'Le ballon perd quand même pas mal d’eau', 'Le ballon perd deau', 'Le ballon perd, sans dégât, de l’eau']
    const ratesE5 = E5.filter((m) => R.sujetEscalade([m], []) === null)
    const auto5 = E5.map((m) => PC.decisionReponse({ plan: 'signature', leads_pause: false }, { prise_en_main: false }, auto, { nbReponsesIA: 0, message: m })).filter((d) => d.ok === true)
    ok(`C6n les ${E5.length} formes de 032-011 (« perd 2 litres d’eau », « perd de plus en plus d’eau », « perd deau », « perd, sans dégât, de l’eau »…) : escalade, aucune réponse seule en Signature « auto »`,
      ratesE5.length === 0 && auto5.length === 0, ratesE5.join(' | '))
    const mutE5 = await mutant('lib/pilote/regles.ts', 'const PERTE_D_EAU = / (?:perd[a-z]*|pert|pertes?)(?: (?!chauffe )[a-z0-9]+){0,5}? (?:d |de l |de |l |d l )?d?l?eaux? /',
      'const PERTE_D_EAU = / (?:perd|pert)[a-z]*(?: [a-z]+){0,3}? (?:d |de l |de |l |d l )?l?eaux? /')
    ok('C6n MUTANT (la classe du sixième audit : trois mots, sans chiffre) : le juge VOIT la brèche — « Le ballon perd 2 litres d’eau par jour » y passe sans escalade',
      mutE5.sujetEscalade(['Le ballon perd 2 litres d’eau par jour'], []) === null && R.sujetEscalade(['Le ballon perd 2 litres d’eau par jour'], []) !== null)
    // 032-008, F3 : C6j a désormais son propre mutant — la ligne du quatrième audit (fuit, fuient, fuyait, fuyaient), qui laisse passer « a fui ».
    const mutE3 = await mutant('lib/pilote/regles.ts', "  'fui', 'fuy', 'perd de l’eau', 'perdent de l’eau', 'perte d’eau', 'urgen', 'urgemment',\n", "  'fuit', 'fuient', 'fuyait', 'fuyaient', 'urgen', 'urgemment',\n")
    ok('C6j MUTANT (la ligne du quatrième audit : fuit, fuient, fuyait, fuyaient) : le juge VOIT la brèche — « Le robinet a fui toute la nuit » y passe sans escalade',
      mutE3.sujetEscalade(['Le robinet a fui toute la nuit'], []) === null && R.sujetEscalade(['Le robinet a fui toute la nuit'], []) !== null)
    // Lot 032-009 : les synonymes que 032-007 (E2, liste des 22) et 032-011 (M4) voyaient encore passer.
    const S22 = ['le robinet goutte', 'ça goutte sous l’évier', 'ça suinte au plafond', 'une tache d’humidité', 'l’eau coule le long du mur', 'le wc déborde', 'la cuisine est sous l’eau',
      'de l’eau par terre', 'c’est pressé', 'au plus vite', 'très pressant', 'plus de chauffage avec un bébé', 'plus d’eau chaude depuis 3 jours', 'vous allez entendre parler de moi',
      'je retiens le paiement', 'rendez-moi mon argent', 'c’est une honte', 'je mets un avis sur Google', 'les plombs ont sauté', 'ça a pris feu', 'court-jus', 'Il y a une tache d’humidité au plafond']
    const M4 = ['De l’eau se perd sous le ballon', 'Le chauffe-eau perd', 'Mon chauffe-eau perd, pouvez-vous passer ?', 'L’eau s’échappe du ballon', 'L’eau s’écoule sous l’évier',
      'De l’eau ruisselle le long du mur', 'Ça ruisselle sous l’évier', 'Il y a de l’eau qui sort du ballon', 'De l’eau sort du groupe de sécurité', 'J’ai de l’eau sous l’évier',
      'Le ballon lâche de l’eau', 'Le ballon crache de l’eau', 'Le ballon pisse de l’eau', 'Le ballon se vide tout seul', 'Le radiateur perd du liquide', 'Le plafond est humide',
      'Le ballon perd depuis hier soir', 'Je suis pressé, c’est pour demain']
    const ratesSyn = [...S22, ...M4].filter((m) => R.sujetEscalade([m], []) === null)
    const autoSyn = [...S22, ...M4].filter((m) => PC.decisionReponse({ plan: 'signature', leads_pause: false }, { prise_en_main: false }, auto, { nbReponsesIA: 0, message: m }).ok === true)
    ok(`C6o les ${S22.length} synonymes de 032-007 et les ${M4.length} de 032-011 (M4 : « l’eau s’échappe », « de l’eau qui sort », « mon chauffe-eau perd »…) : escalade, aucune réponse seule en Signature « auto »`,
      ratesSyn.length === 0 && autoSyn.length === 0, `${ratesSyn.join(' | ')} ${autoSyn.join(' | ')}`)
    // Le petit corpus FICTIF de demandes ordinaires (plombier, chauffagiste, électricien, carreleur), lu avec les mots par défaut de l'artisan :
    // aucune ne doit passer à la main — dont « le brûleur de ma chaudière », « chaudière gaz », « l’attestation d’assurance décennale » (032-008, section 5).
    const ORDINAIRES_009 = ['Bonjour, je voudrais un devis pour refaire ma salle de bain', 'Pouvez-vous installer une VMC dans la salle de bain ?', 'Devis pour poser un carrelage 60x60 dans la cuisine',
      'Le brûleur de ma chaudière fait du bruit, entretien annuel à prévoir', 'Remplacement de ma chaudière gaz par une pompe à chaleur', 'Pouvez-vous m’envoyer votre attestation d’assurance décennale ?',
      'Entretien de la chaudière à gaz, quand êtes-vous disponible ?', 'Changer le ballon d’eau chaude de 200 L', 'Installer un mitigeur thermostatique', 'Je souhaite un devis pour une douche à l’italienne',
      'Mise aux normes du tableau électrique', 'Ajouter trois prises dans le salon', 'Peinture du séjour, 30 m²', 'Pose d’un parquet flottant', 'Refaire les joints de la baignoire',
      'La chaudière perd en pression depuis l’été', 'Mon ballon perd sa chaleur la nuit', 'Quel prix pour un adoucisseur d’eau ?', 'Raccorder le lave-vaisselle', 'Je suis disponible le matin',
      'Merci pour votre réponse rapide', 'Le chauffe-eau est à changer, il a 15 ans', 'Est-ce que vous faites les WC suspendus ?', 'Devis pour un chauffe-eau thermodynamique',
      'Le robinet de la cuisine est à remplacer', 'Pouvez-vous passer jeudi ?', 'Combien pour remplacer ma cuisinière à gaz par une plaque à induction ?', 'Installer un radiateur dans la chambre',
      'Remplacement du compteur d’eau', 'Une attestation d’assurance pour mon syndic, svp']
    const prisOrd = ORDINAIRES_009.filter((m) => R.sujetEscalade([m], CONFIG_DEFAUT.escalade_mots) !== null)
    ok(`C6p … sans faux positif nouveau : ${ORDINAIRES_009.length} demandes ordinaires fictives, lues avec les mots par défaut de l’artisan — aucune ne passe à la main (dont « brûleur », « chaudière gaz », « attestation d’assurance décennale »)`,
      prisOrd.length === 0, prisOrd.map((m) => `${m} => ${R.sujetEscalade([m], CONFIG_DEFAUT.escalade_mots)}`).join(' | '))
    const DANGERS = ['Ça sent le gaz près de la chaudière gaz', 'La chaudière gaz fuit', 'Le brûleur a brûlé', 'Chaudière gaz : odeur bizarre', 'Le brûleur fait des étincelles',
      'Attestation d’assurance : j’ai un litige avec vous', 'Mon assurance décennale va payer la malfaçon', 'Odeur de gaz dans la cuisine']
    const masques = DANGERS.filter((m) => R.sujetEscalade([m], CONFIG_DEFAUT.escalade_mots) === null)
    ok('C6q … et ces noms ôtés ne masquent jamais un vrai sujet (« ça sent le gaz près de la chaudière gaz », « le brûleur a brûlé », « attestation d’assurance : j’ai un litige »)', masques.length === 0, masques.join(' | '))
    const mutSyn = await mutant('lib/pilote/regles.ts', "  'humidit', 'humide', 'eau coule',", "  'eau-coule-mutant',")
    const mutApp = await mutant('lib/pilote/regles.ts', "    if (APPAREIL_PERD.test(mots)) return 'perte d’eau'\n", '')
    const mutNeutre = await mutant('lib/pilote/regles.ts', "    const mots = enMots(brut).replace(NOMS_NEUTRES, ' ').replace(FAUSSE_URGENCE, ' ')", "    const mots = enMots(brut).replace(FAUSSE_URGENCE, ' ')")
    ok('C6r MUTANTS (les synonymes retirés ; le motif « l’appareil perd » retiré ; les noms neutres non ôtés) : le juge VOIT chaque écart — « une tache d’humidité » et « Mon chauffe-eau perd, pouvez-vous passer ? » y passent, « le brûleur de ma chaudière » y est pris',
      mutSyn.sujetEscalade(['une tache d’humidité'], []) === null && mutApp.sujetEscalade(['Mon chauffe-eau perd, pouvez-vous passer ?'], []) === null
      && mutNeutre.sujetEscalade(['Le brûleur de ma chaudière fait du bruit, entretien annuel à prévoir'], []) !== null
      && R.sujetEscalade(['une tache d’humidité'], []) !== null && R.sujetEscalade(['Mon chauffe-eau perd, pouvez-vous passer ?'], []) !== null)
    // 032-011 (F6) : un mutant pour M2 (« refui », « refuy » retirés) et un pour C6m (une racine trop courte, « refu »).
    const mutRefui = await mutant('lib/pilote/regles.ts', "  'refui', 'refuy',\n", '')
    const mutRefu = await mutant('lib/pilote/regles.ts', "  'refui', 'refuy',\n", "  'refu',\n")
    ok('C6s MUTANTS de 032-011 (F6) : sans « refui », « Ça refuit » passe (C6l le voit) ; avec « refu », « Refuge pour chats » est pris (C6m le voit)',
      mutRefui.sujetEscalade(['Ça refuit'], []) === null && mutRefu.sujetEscalade(['Refuge pour chats : devis de clôture'], []) !== null
      && R.sujetEscalade(['Ça refuit'], []) !== null && R.sujetEscalade(['Refuge pour chats : devis de clôture'], []) === null)
    // 032-008 (F3) : les formes des trois audits jouées aussi sur la VRAIE dépendance du pilote (lib/pilote/executeur.ts), pas seulement sur sujetEscalade.
    const FORMES_AUDITS = ['Le robinet a fui toute la nuit', 'Le ballon a perdu de l’eau cette nuit', 'Le ballon perd 2 litres d’eau par jour', 'Ça refuit', 'Il y a de l’eau qui sort du ballon', 'Mon chauffe-eau perd, pouvez-vous passer ?']
    const partiesPilote = []
    for (const f of FORMES_AUDITS) {
      mondeC([{ id: id(653), lead_id: L1, sens: 'in', type: 'manuel', etat: null, sent_at: '2026-11-01T09:00:00Z', contenu: f }], [])
      if ((await deps.escalade(ligne(), L1, DIX)) !== true) partiesPilote.push(f)
    }
    mondeC([{ id: id(653), lead_id: L1, sens: 'in', type: 'manuel', etat: null, sent_at: '2026-11-01T09:00:00Z', contenu: 'Merci, je regarde le devis' }], [])
    ok(`C6t les ${FORMES_AUDITS.length} formes de 032-007, 032-008, 032-011 et de ce lot sur la vraie dépendance du pilote : renvoyées à la main ; un fil ordinaire part`,
      partiesPilote.length === 0 && (await deps.escalade(ligne(), L1, DIX)) === false, partiesPilote.join(' | '))
    const conv = lire('app/api/conversation/route.ts'), flux = lire('app/api/conversation/stream/route.ts'), canaux = lire('lib/canaux/serveur.ts')
    ok('C6g les trois routes qui répondent seules passent le fil récent du client (les derniers messages entrants, MESSAGES_ESCALADE_RELUS)',
      [conv, flux].every((s) => /messagesClient: history\.filter\(\(m\) => m\.sens === 'in'\)\.slice\(-MESSAGES_ESCALADE_RELUS\)\.map\(\(m\) => m\.contenu\)/.test(s))
      && /messagesClient: tours\.filter\(\(t\) => t\.sens === 'in'\)\.slice\(-MESSAGES_ESCALADE_RELUS\)\.map\(\(t\) => t\.contenu\)/.test(canaux))
  }

  console.log('\n── C5. Une relance de conversation proposée relit le registre commun au départ (audit 032-001, D6)')
  const ENV = await imp('lib/envoisServeur.ts')
  const mondeRelance = (relancesAilleurs) => {
    vider()
    Object.assign(T, {
      leads: [{ id: L1, artisan_id: A, nom_prospect: 'Mme Essai', contact: 'cliente@essai.test', message: 'Bonjour, devis pour une salle de bain', statut: 'repondu', prise_en_main: false, canal: null }],
      messages: [{ id: id(690), lead_id: L1, sens: 'out', type: 'relance', etat: 'proposition', sent_at: new Date(Date.now() - 3600_000).toISOString(), contenu: 'Bonjour, avez-vous pu regarder notre devis ?' }],
      devis: [{ id: D1, artisan_id: A, numero: 'DEV-2026-0621', lead_id: L1 }],
      factures: [], crm_rappels: [], relances_impayes: [],
      // Le devis du client relancé HIER par l'assistant : un autre chemin que la conversation.
      assistant_actions: relancesAilleurs ? [{ id: id(691), artisan_id: A, outil: 'relancer_devis', statut: 'executee', objet_type: 'devis', objet_id: D1, maj_le: new Date(Date.now() - 86_400_000).toISOString() }] : [],
    })
  }
  {
    mondeRelance(true)
    const lead = await ENV.leadDuCompte(L1, A)
    const n0 = requetes.length
    const r = await ENV.validerPropositionServeur(A, lead, id(690))
    ok('C5a relance proposée par le cron, mais le devis du client relancé hier par l’assistant : 409 « déjà relancé », rien n’est écrit ni envoyé',
      r.status === 409 && r.json.code === 'deja_relance' && ecrituresDepuis(n0).length === 0 && T.messages[0].etat === 'proposition', JSON.stringify(r))
    PANNES.add('assistant_actions')
    const r2 = await ENV.validerPropositionServeur(A, lead, id(690)).finally(() => PANNES.delete('assistant_actions'))
    ok('C5b registre illisible (une de ses lectures en erreur) : 503, rien ne part', r2.status === 503 && T.messages[0].etat === 'proposition', JSON.stringify(r2))
    const mutR = await mutant('lib/envoisServeur.ts', "if (prop.type === 'relance') {\n    const reg = relanceRecente(", "if (false) {\n    const reg = relanceRecente(")
    mondeRelance(true)
    const r3 = await mutR.validerPropositionServeur(A, await mutR.leadDuCompte(L1, A), id(690)).catch((e) => ({ status: 'leve', json: { error: String(e) } }))
    ok('C5c MUTANT (registre non relu au départ : la version de l’audit) : le juge VOIT la brèche — la relance y passe le contrôle', r3.status !== 409, JSON.stringify(r3))
  }

  console.log('\n── C9. Le cron des relances de conversation ne parle pas seul sur un fil en escalade ou pris en main (quatrième audit 032-006, E1)')
  {
    const REL = await imp('lib/relances.ts')
    const fil = (contenus, mots = []) => {
      vider()
      Object.assign(T, {
        leads: [{ id: L1, artisan_id: A, nom_prospect: 'M. Essai', contact: 'client@essai.test', message: 'Devis pour refaire la salle de bain', statut: 'repondu', prise_en_main: false, canal: null }],
        messages: contenus.map((contenu, i) => ({ id: id(670 + i), lead_id: L1, sens: 'in', type: 'manuel', etat: null, sent_at: `2026-11-0${1 + (i % 2)}T0${i}:00:00Z`, contenu })),
        plateforme_config: [{ artisan_id: A, escalade_mots: mots }],
      })
    }
    const lever = async (f) => { try { return { rendu: await f() } } catch (e) { return { leve: e } } }
    fil(['Bonjour', 'Litige : vous avez inondé ma cuisine, mon avocat vous écrira'])
    ok('C9a un litige dans un message du client : sujetDuFil le repère (la relance du cron sera annulée)', (await REL.sujetDuFil(A, { id: L1, message: 'Devis pour refaire la salle de bain' })) !== null)
    fil(['Bonjour', 'Merci, je regarde le devis'])
    ok('C9b témoin : un fil ordinaire — aucun sujet, la relance suit son cours', (await REL.sujetDuFil(A, { id: L1, message: 'Devis pour refaire la salle de bain' })) === null)
    fil(['Bonjour'])
    ok('C9c le litige dans la DEMANDE d’origine (leads.message) compte aussi', (await REL.sujetDuFil(A, { id: L1, message: 'Litige en cours avec votre entreprise' })) !== null)
    fil(['Bonjour'])
    PANNES.add('messages')
    const p1 = await lever(() => REL.sujetDuFil(A, { id: L1, message: null })).finally(() => PANNES.delete('messages'))
    PANNES.add('plateforme_config')
    const p2 = await lever(() => REL.sujetDuFil(A, { id: L1, message: null })).finally(() => PANNES.delete('plateforme_config'))
    ok('C9d messages ou réglages illisibles : sujetDuFil LÈVE (le cron laisse la relance due, rien ne part)', p1.leve instanceof Error && p2.leve instanceof Error, `${String(p1.leve ?? p1.rendu)} ${String(p2.leve ?? p2.rendu)}`)
    const mutF = await mutant('lib/relances.ts', "  if (error) throw new Error('messages du client illisibles : rien ne part')\n", '')
    fil(['Litige : mon avocat vous écrira'])
    PANNES.add('messages')
    const m = await lever(() => mutF.sujetDuFil(A, { id: L1, message: null })).finally(() => PANNES.delete('messages'))
    ok('C9e MUTANT (erreur de lecture avalée) : le juge VOIT la brèche — le fil illisible y passe pour « rien à escalader »', m.rendu === null, String(m.leve ?? m.rendu))
    // Cinquième audit 032-007 (« Faibles », dernier point) : le cron n'était vérifié que par lecture du source. Désormais le VRAI GET de
    // app/api/cron/relances/route.ts, sur la doublure de PostgREST ; seules ses dépendances lourdes sont doublées (modèle, e-mail
    // espionné, purges, autres passages) — la décision (prise en main, sujetDuFil, prise de la relance) est celle du fichier, à l'octet.
    globalThis.__ENVOIS_CRON = []
    const DOUBLURES_CRON = {
      'next/server': "export const NextResponse = { json: (b: unknown, i?: { status?: number }) => new Response(JSON.stringify(b), { status: i?.status ?? 200, headers: { 'content-type': 'application/json' } }) }",
      '@/lib/alerteService': 'export async function signalerPanneIA() {}',
      '@/lib/alertes': 'export async function enregistrerPassage() {}\nexport async function ronde() { return { envoyees: [], ignorees: [] } }',
      '@/lib/suspension': 'export async function suspensionEnCours() { return null }',
      '@/lib/purgeComptes': 'export async function purgerComptes() { return { purges: 0, en_attente: 0 } }',
      '@/lib/purgesRgpd': 'export async function purgerRgpd() { return { erreurs: [] } }',
      '@/lib/packPubPurge': 'export async function purgerPacksExpires() { return { erreurs: [] } }',
      '@/lib/devisExpiration': 'export async function expirerDevisDepasses() { return { erreurs: [] } }',
      '@/lib/ai': 'export async function generateRelanceReply(_a: unknown, l: { nom_prospect?: string }, rang: number) { return `Bonjour ${l.nom_prospect}, je reviens vers vous (relance ${rang})` }\nexport function relanceTemplate() { return "modèle" }',
      '@/lib/email': 'export async function sendEmail(m: unknown) { (globalThis as any).__ENVOIS_CRON.push(m); return { ok: true } }',
      '@/lib/agents/sortie': 'export async function sortiePermise() { return { permise: true } }',
      '@/lib/direction/courriers': 'export async function relever() { return { ok: true } }',
      '@/lib/flags': 'export function actif() { return false }',
      '@/lib/siteLivraison': 'export async function tourLivraison() { return {} }',
      '@/lib/comptaAutomatisationsTour': 'export async function tourCompta() { return { erreurs: [] } }',
      '@/lib/relancesImpayesTour': 'export async function tourRelancesImpayes() { return { erreurs: [] } }',
      '@/lib/relancesImpayesMagasin': 'export const magasinSupabase = {}',
      '@/lib/crm/rappelsTour': 'export async function tourRappels() { return { installe: false } }',
      '@/lib/apresChantierTour': 'export async function tourApresChantier() { return { installe: false } }',
      '@/lib/push': 'export async function envoyerPushArtisan() {}',
      '@/lib/notifications': 'export async function notifierArtisan() {}',
    }
    process.env.CRON_SECRET = 'secret-essai'
    const CRON = await copie('app/api/cron/relances/route.ts', { doublures: DOUBLURES_CRON })
    /** Un passage du vrai GET sur une relance due du fil L1 où le client a écrit `contenus` ; rend la sortie, les e-mails et l'état de la relance. */
    async function passageCron(mod, contenus, { priseEnMain = false, panne = null, demande = 'Devis pour refaire la salle de bain' } = {}) {
      fil(contenus)
      T.artisans = [{ ...PROFIL_A }]
      Object.assign(T.leads[0], { prise_en_main: priseEnMain, message: demande })
      T.relances = [{ id: id(680), lead_id: L1, rang: 1, planifiee_le: '2026-11-01T07:00:00Z', envoyee: false }]
      globalThis.__ENVOIS_CRON = []
      if (panne) PANNES.add(panne)
      try {
        const rep = await mod.GET(new Request('http://localhost/api/cron/relances', { headers: { authorization: 'Bearer secret-essai' } }))
        const corps = await rep.json().catch(() => ({}))
        return { statut: rep.status, corps, mails: globalThis.__ENVOIS_CRON.map((m) => m.to), envoyee: T.relances[0].envoyee, fil: (T.messages ?? []).filter((m) => m.sens === 'out' && m.type === 'relance').length }
      } finally { if (panne) PANNES.delete(panne) }
    }
    const temoin = await passageCron(CRON, ['Bonjour', 'Merci, je regarde le devis'])
    ok('C9f le vrai GET du cron : témoin — un fil ordinaire en Signature, la relance part (un e-mail au client, tracée dans le fil)',
      temoin.statut === 200 && temoin.corps.sent === 1 && temoin.mails.includes('client@essai.test') && temoin.envoyee === true && temoin.fil === 1, JSON.stringify(temoin))
    const litige = await passageCron(CRON, ['Bonjour', 'Litige : vous avez inondé ma cuisine, mon avocat vous écrira'])
    const demande = await passageCron(CRON, ['Bonjour'], { demande: 'Le ballon a perdu 2 litres d’eau cette nuit' })
    ok('C9g … un fil en litige (ou une fuite dans la demande d’origine) : rien ne part, la relance est annulée sans un mot au client',
      [litige, demande].every((x) => x.statut === 200 && x.corps.sent === 0 && x.corps.skipped === 1 && x.mails.length === 0 && x.envoyee === true && x.fil === 0), `${JSON.stringify(litige)} ${JSON.stringify(demande)}`)
    const prise = await passageCron(CRON, ['Merci, je regarde le devis'], { priseEnMain: true })
    ok('C9h … un fil pris en main par l’artisan : rien ne part, la relance est annulée', prise.corps.sent === 0 && prise.mails.length === 0 && prise.envoyee === true, JSON.stringify(prise))
    const illisible = await passageCron(CRON, ['Merci, je regarde le devis'], { panne: 'plateforme_config' })
    ok('C9i … réglages de la plateforme illisibles : rien ne part, la relance reste DUE (elle repartira)', illisible.corps.sent === 0 && illisible.mails.length === 0 && illisible.envoyee === false, JSON.stringify(illisible))
    const mutCron = await copie('app/api/cron/relances/route.ts', { doublures: DOUBLURES_CRON, remplacer: [["    if (sujet) {\n      await supabaseAdmin.from('relances').update({ envoyee: true }).eq('id', r.id)\n      skipped++\n      continue\n    }\n", '']] })
    const surMutCron = await passageCron(mutCron, ['Bonjour', 'Litige : vous avez inondé ma cuisine, mon avocat vous écrira'])
    ok('C9j MUTANT (le sujet du fil ignoré : la version d’avant 032-006) : le juge VOIT la brèche — la relance du fil en litige y part, e-mail au client',
      surMutCron.corps.sent === 1 && surMutCron.mails.includes('client@essai.test'), JSON.stringify(surMutCron))
    const mutPrise = await copie('app/api/cron/relances/route.ts', { doublures: DOUBLURES_CRON, remplacer: [["    if (lead.prise_en_main === true) {\n      await supabaseAdmin.from('relances').update({ envoyee: true }).eq('id', r.id)\n      skipped++\n      continue\n    }\n", '']] })
    const surMutPrise = await passageCron(mutPrise, ['Merci, je regarde le devis'], { priseEnMain: true })
    ok('C9k MUTANT (prise en main ignorée) : le juge VOIT la brèche — la relance d’un fil pris en main y part', surMutPrise.corps.sent === 1 && surMutPrise.mails.length === 1, JSON.stringify(surMutPrise))
  }

  // ═══════════════════════ C10. Impayés : la contestation du client (032-007), lue dans ses seuls messages depuis l'émission (R1, 032-015) ═══════════════════════
  console.log('\n── C10. Relances d’impayés : une contestation écrite depuis l’émission rend une CARTE (032-007) ; la demande d’origine n’est jamais relue (R1, 032-015)')
  {
    const TOUR = await imp('lib/relancesImpayesTour.ts')
    const MAG = await imp('lib/relancesImpayesMagasin.ts')
    const RI = await imp('lib/relancesImpayes.ts')
    const LI = id(990), DI = id(991), FI = id(992), LI2 = id(980)
    /**
     * Le vrai passage des impayés (lib/relancesImpayesTour.ts) sur le vrai magasin (lib/relancesImpayesMagasin.ts), à J+3 de l'échéance.
     * Facture émise le 01/10, échue le 15/10, passage le 18/10. `contenus` : les messages ENTRANTS du client, du 05/10 au 09/10 (avant
     * l'échéance : la « réponse » ne les voit pas), ou des couples [contenu, sent_at]. `demande` : la demande d'origine du chantier
     * (leads.message). `autreDemande` : un autre dossier du même e-mail. Les notifications à l'artisan sont espionnées (puis réellement
     * faites : sans clé Resend, rien ne sort).
     */
    async function passageImpayes(magasin, contenus, { plan = 'signature', panne = null, demande = 'Devis pour une salle de bain', autreDemande = null, tour = TOUR, maintenant = '2026-10-18T08:00:00Z' } = {}) {
      vider()
      const leads = [{ id: LI, artisan_id: A, nom_prospect: 'M. Dupont', contact: 'dupont@essai.test', message: demande, statut: 'gagne' }]
      if (autreDemande) leads.push({ id: LI2, artisan_id: A, nom_prospect: 'M. Dupont', contact: 'dupont@essai.test', message: autreDemande, statut: 'gagne' })
      Object.assign(T, {
        relances_impayes_reglages: [{ artisan_id: A, actif: true, jours: [3, 10, 21], textes: {}, actif_depuis: '2026-09-01' }],
        artisans: [{ ...PROFIL_A, plan }],
        factures: [{ id: FI, artisan_id: A, numero: 'FAC-2026-0992', statut: 'emise', avoir_de: null, date_emission: '2026-10-01', emise_le: '2026-10-01T09:00:00Z', date_echeance: '2026-10-15', total_ttc: 1100, client_nom: 'M. Dupont', client_email: 'dupont@essai.test', devis_id: DI }],
        devis: [{ id: DI, artisan_id: A, numero: 'DEV-2026-0991', lead_id: LI }],
        leads,
        messages: contenus.map((c, i) => {
          const [contenu, sent_at] = Array.isArray(c) ? c : [c, `2026-10-0${5 + i}T10:00:00Z`]
          return { id: id(993 + i), lead_id: LI, sens: 'in', type: 'manuel', etat: null, contenu, sent_at }
        }),
        relances_impayes: [], relances_impayes_arrets: [], suspensions: [], plateforme_config: [],
      })
      const envois = [], notifs = []
      const espionne = { ...magasin, notifierPreparee: async (art, n) => { notifs.push(n.texte); return magasin.notifierPreparee(art, n) } }
      if (panne) PANNES.add(panne)
      try {
        const bilan = await tour.tourRelancesImpayes({ actif: true, magasin: espionne, envoyer: async (m) => { envois.push(m.to); return { ok: true } }, sortiePermise: async () => true, maintenant: new Date(maintenant) })
        return { bilan, envois, notifs, arrets: (T.relances_impayes_arrets ?? []).map((a) => a.raison), journal: (T.relances_impayes ?? []).map((r) => r.statut) }
      } finally { if (panne) PANNES.delete(panne) }
    }
    const carte = (x) => x.bilan.envoyees === 0 && x.envois.length === 0 && x.bilan.preparees === 1 && x.journal.includes('a_valider') && x.arrets.length === 0 && x.notifs.some((t) => t.includes(RI.MOTIF_SENSIBLE))
    const part = (x) => x.bilan.envoyees === 1 && x.envois.includes('dupont@essai.test') && x.arrets.length === 0 && x.journal.includes('envoyee')
    const prepare = (x) => x.bilan.preparees === 1 && x.envois.length === 0 && x.arrets.length === 0 && x.journal.includes('a_valider')

    const temoin = await passageImpayes(MAG.magasinSupabase, ['Merci pour le devis, je valide'])
    ok('C10a témoin : le vrai passage des impayés, client sans contestation (message avant l’échéance) — la relance J+3 part en Signature', part(temoin), JSON.stringify(temoin))
    const CONTESTE = ['Je conteste cette facture : les travaux ne sont pas terminés', 'Litige : mon avocat vous écrira', 'Je refuse de payer tant que la fuite n’est pas réparée']
    const sorts = []
    for (const t of CONTESTE) sorts.push(await passageImpayes(MAG.magasinSupabase, [t]))
    ok(`C10b la brèche de 032-007 : une contestation écrite le 05/10, après l’émission, avant l’échéance (${CONTESTE.length} formes) — rien ne part, la relance devient une CARTE à valider avec le motif, aucun arrêt « le client a répondu » (R1)`,
      sorts.every(carte), sorts.map((x) => JSON.stringify(x)).join(' | '))
    const studio = await passageImpayes(MAG.magasinSupabase, ['Je conteste cette facture'], { plan: 'studio' })
    ok('C10c … en Studio aussi : rien ne part ; la relance reste préparée (une carte), avec le motif « à relire »', carte(studio), JSON.stringify(studio))
    const illisible = await passageImpayes(MAG.magasinSupabase, ['Merci pour le devis'], { panne: 'plateforme_config' })
    ok('C10d réglages de la plateforme illisibles : rien ne part (le passage saute le compte, l’erreur est dite)', illisible.bilan.envoyees === 0 && illisible.envois.length === 0 && illisible.bilan.preparees === 0 && illisible.bilan.erreurs.length > 0, JSON.stringify(illisible))
    const illisibleM = await passageImpayes(MAG.magasinSupabase, ['Merci pour le devis'], { panne: 'messages' })
    ok('C10d2 messages du client illisibles : rien ne part, rien n’est préparé (côté sûr)', illisibleM.bilan.envoyees === 0 && illisibleM.envois.length === 0 && illisibleM.bilan.preparees === 0 && illisibleM.bilan.erreurs.length > 0, JSON.stringify(illisibleM))
    const mutMag = await mutant('lib/relancesImpayesMagasin.ts', '    return contestationDuClient(textes, cfg.escalade_mots)\n', '    return null\n')
    const surMut = await passageImpayes(mutMag.magasinSupabase, ['Je conteste cette facture : les travaux ne sont pas terminés'])
    ok('C10e MUTANT (la contestation ignorée : la version de 032-007) : le juge VOIT la brèche — la relance de la facture contestée y part, e-mail au client',
      surMut.bilan.envoyees === 1 && surMut.envois.includes('dupont@essai.test'), JSON.stringify(surMut))

    // R1 (audit 032-015) : les 13 demandes d'origine ORDINAIRES de l'annexe E — le chantier lui-même, aucune ne conteste la facture. Toutes inventées.
    const DEMANDES = [
      ['plombier', 'Bonjour, j’ai une fuite sous l’évier, pouvez-vous passer cette semaine ?'],
      ['plombier', 'Mon robinet de cuisine goutte, je voudrais le faire changer.'],
      ['plombier', 'Le chauffe-eau fuit, il faudrait le remplacer. Devis svp.'],
      ['plombier', 'Remplacement du ballon d’eau chaude, c’est urgent, nous n’avons plus d’eau chaude.'],
      ['plombier', 'Odeur d’égout dans la salle de bain, pouvez-vous regarder ?'],
      ['plombier', 'Dégât des eaux chez nous, l’assurance prend en charge, il faut refaire la tuyauterie.'],
      ['électricien', 'Mon disjoncteur saute dès que j’allume le four, pouvez-vous venir au plus vite ?'],
      ['électricien', 'Mise aux normes du tableau électrique, l’expert de l’assurance l’a demandé.'],
      ['électricien', 'Installation d’une VMC, la salle de bain est très humide.'],
      ['menuisier', 'Remise en état de mes volets bois et pose d’une porte. Êtes-vous couvert en décennale ?'],
      ['menuisier', 'Fenêtres à changer, il y a des infiltrations quand il pleut.'],
      ['menuisier', 'Pose d’un parquet dans le salon, pas urgent.'],
      ['témoin', 'Devis pour une salle de bain'],
    ]
    const perdues = [], perduesStudio = []
    for (const [metier, d] of DEMANDES) {
      const sig = await passageImpayes(MAG.magasinSupabase, ['Merci pour le devis, je valide'], { demande: d })
      const stu = await passageImpayes(MAG.magasinSupabase, ['Merci pour le devis, je valide'], { demande: d, plan: 'studio' })
      if (!part(sig)) perdues.push(`[${metier}] ${d} → ${JSON.stringify(sig)}`)
      if (!prepare(stu) || stu.notifs.some((t) => t.includes(RI.MOTIF_SENSIBLE))) perduesStudio.push(`[${metier}] ${d} → ${JSON.stringify(stu)}`)
    }
    ok(`C10f R1 (annexe E de 032-015) : les ${DEMANDES.length} demandes d’origine ordinaires (fuite, goutte, urgent, disjoncteur, décennale…) — la relance Signature PART, aucun arrêt`, perdues.length === 0, perdues.join(' | '))
    ok(`C10g R1 … en Studio : les ${DEMANDES.length} relances sont PRÉPARÉES, sans motif « sujet sensible », aucun arrêt`, perduesStudio.length === 0, perduesStudio.join(' | '))
    const autre = await passageImpayes(MAG.magasinSupabase, ['Merci pour le devis, je valide'], { autreDemande: 'Fuite sur le WC, en 2025' })
    ok('C10h R1 : la demande d’un AUTRE dossier du même e-mail (« Fuite sur le WC ») n’est jamais relue — la relance part', part(autre), JSON.stringify(autre))
    const ancien = await passageImpayes(MAG.magasinSupabase, [['Litige sur l’ancien chantier, mon avocat vous écrira', '2025-03-10T10:00:00Z'], ['Merci pour le devis, je valide', '2026-10-05T10:00:00Z']])
    ok('C10i R1 : une contestation écrite AVANT l’émission (mars 2025, autre chantier) ne compte pas — la relance part (la lecture est bornée à l’émission)', part(ancien), JSON.stringify(ancien))
    const repondu = await passageImpayes(MAG.magasinSupabase, [['Bien reçu, je vous règle vendredi', '2026-10-16T10:00:00Z']])
    ok('C10j le client a VRAIMENT écrit depuis l’échéance : l’arrêt « le client a répondu » reste (vrai), rien ne part, aucune carte',
      repondu.bilan.envoyees === 0 && repondu.envois.length === 0 && repondu.bilan.arretees === 1 && repondu.arrets.includes('reponse_client') && repondu.bilan.preparees === 0, JSON.stringify(repondu))
    ok('C10j2 … et l’écran dit « le client a répondu » pour cet arrêt seulement (etatPourEcran)',
      /le client a répondu/.test(RI.etatPourEcran({ facture: T.factures[0], reglages: { actif: true, jours: [3, 10, 21], textes: {}, actif_depuis: null }, journal: [], arret: { raison: 'reponse_client', le: '2026-10-18T08:00:00Z' }, maintenant: new Date('2026-10-18T08:00:00Z') }) ?? '')
      && /prête à valider/.test(RI.etatPourEcran({ facture: T.factures[0], reglages: { actif: true, jours: [3, 10, 21], textes: {}, actif_depuis: null }, journal: [{ facture_id: FI, rang: 1, jour: '2026-10-18', statut: 'a_valider' }], arret: null, maintenant: new Date('2026-10-18T08:00:00Z') }) ?? ''))
    // MUTANT R1 : la demande d'origine relue de nouveau (la version de 032-009) — le juge doit voir les relances perdues.
    const mutDemande = await mutant('lib/relancesImpayesMagasin.ts', '    const textes = (entrants ?? []).map((x) => (x as { contenu?: unknown }).contenu)\n',
      "    const demandes = lire(await supabaseAdmin.from('leads').select('message').eq('artisan_id', artisanId).in('id', ids).limit(50), 'demandes')\n    const textes = [...(entrants ?? []).map((x) => (x as { contenu?: unknown }).contenu), ...(demandes ?? []).map((x) => (x as { message?: unknown }).message)]\n")
    const surMutD = []
    for (const [, d] of DEMANDES) { const x = await passageImpayes(mutDemande.magasinSupabase, ['Merci pour le devis, je valide'], { demande: d }); if (!part(x)) surMutD.push(d) }
    ok(`C10k MUTANT (la demande d’origine relue : la version de 032-009) : le juge VOIT la régression — ${surMutD.length}/${DEMANDES.length} relances Signature n’y partent plus`, surMutD.length >= 10, surMutD.join(' | '))
    // MUTANT : la contestation rendue en envoi seul en Signature (la carte retirée) — le juge doit voir l'e-mail parti sur une facture contestée.
    const mutTour = await mutant('lib/relancesImpayesTour.ts', '        if (!auto || sensible) {', '        if (!auto) {')
    const surMutT = await passageImpayes(MAG.magasinSupabase, ['Je conteste cette facture : les travaux ne sont pas terminés'], { tour: mutTour })
    ok('C10l MUTANT (la carte retirée en Signature) : le juge VOIT la brèche — la relance de la facture contestée y part seule', surMutT.bilan.envoyees === 1 && surMutT.envois.includes('dupont@essai.test'), JSON.stringify(surMutT))
    // MUTANT : la borne d'émission retirée (toutes dates, la version de 032-009) — la vieille contestation d'un autre chantier y refait une carte.
    const mutBorne = await mutant('lib/relancesImpayesMagasin.ts', "    if (debut) q = q.gte('sent_at', debut)\n", '    void debut\n')
    const surMutB = await passageImpayes(mutBorne.magasinSupabase, [['Litige sur l’ancien chantier, mon avocat vous écrira', '2025-03-10T10:00:00Z'], ['Merci pour le devis, je valide', '2026-10-05T10:00:00Z']])
    ok('C10m MUTANT (la borne d’émission retirée) : le juge VOIT la brèche — la contestation de mars 2025 y retient la relance', !part(surMutB) && surMutB.envois.length === 0, JSON.stringify(surMutB))
  }

  // ═══════════════════════ D. Les sources et le lanceur ═══════════════════════
  console.log('\n── D. Sources et lanceur')
  const act = lire('lib/assistant/actions-serveur.ts')
  ok('D1 « fait tout seul » : la garde lit la liste du pilote (jamaisAutomatique, lib/pilote/regles.ts), aucune liste recopiée ici',
    /import \{[^}]*jamaisAutomatique[^}]*\} from '@\/lib\/pilote\/regles'/.test(act) && /const jamaisSeul = jamaisAutomatique\(nom\)\n[\s\S]{0,200}let horsAuto = p\.horsAuto \?\? null\n[\s\S]{0,600}?\n\s*if \(!jamaisSeul && !horsAuto && ctx\.autonome\?\.\(\) === true\) \{/.test(act) && !/'marquer_facture_payee', 'creer_facture'/.test(act))
  ok('D1c l’escalade du « fait tout seul » lit LE lexique du pilote (sujetEscalade, MESSAGES_ESCALADE_RELUS, LIBELLE_MOTIF.escalade), aucune liste recopiée',
    /import \{[^}]*sujetEscalade[^}]*\} from '@\/lib\/pilote\/regles'/.test(act) && /\.limit\(MESSAGES_ESCALADE_RELUS\)/.test(act) && /if \(sujetEscalade\(textes, mots\) !== null\) return LIBELLE_MOTIF\.escalade/.test(act) && !/'avocat'|'litige'/.test(act))
  ok('D1b l’envoi d’un devis lit LA règle des prix du pilote (prixSources, LIBELLE_MOTIF.prix_non_source), aucune règle recopiée',
    /import \{[^}]*prixSources[^}]*\} from '@\/lib\/pilote\/regles'/.test(act) && /const sources = await lignesDe\(d\.id\)\.then\(\(l\) => prixSources\(l\), \(\) => false\)/.test(act) && /horsAuto: LIBELLE_MOTIF\.prix_non_source/.test(act))
  const reg = lire('lib/pilote/regles.ts')
  ok('D2 le pilote lit la même liste (typePiloteDeOutil, decisionPilote)', /if \(OUTILS_JAMAIS_AUTO\.includes\(outil\) \|\| !OUTILS_EXECUTABLES_PILOTE\.includes\(outil\)\) return null/.test(reg) && /if \(p\.outil && OUTILS_JAMAIS_AUTO\.includes\(p\.outil\)\) return \{ auto: false, motif: 'jamais_auto' \}/.test(reg))
  const exe = lire('lib/pilote/executeur.ts')
  ok('D3 la vraie escalade relit les messages ENTRANTS (sens in, 10 au plus) avec sujetEscalade et les mots de Ma plateforme', /async escalade\(l, leadId\) \{[\s\S]{0,900}\.eq\('sens', 'in'\)[\s\S]{0,120}\.limit\(MESSAGES_ESCALADE_RELUS\)[\s\S]{0,300}sujetEscalade\(textes, cfg\.escalade_mots\)/.test(exe))
  ok('D3c le pilote lit les réglages de la plateforme par getPlateformeConfigStrict, jamais par getPlateformeConfig (une erreur y vaut « défauts »)',
    /import \{ getPlateformeConfigStrict, dansLaPlage \} from '@\/lib\/plateformeConfig'/.test(exe) && !/getPlateformeConfig\(/.test(exe))
  ok('D3b … et lit la conversation par leadDuCompteStrict (une erreur lève), jamais par leadDuCompte (une erreur y vaut « introuvable »)',
    /async escalade\(l, leadId\) \{[\s\S]{0,800}const lead = await leadDuCompteStrict\(leadId, l\.artisan_id\)/.test(exe) && !/async escalade\(l, leadId\) \{[\s\S]{0,800}await leadDuCompte\(leadId/.test(exe))
  const portail = lire('app/api/stripe/portail/route.ts')
  ok('D3d un contrat Entreprise s’ouvre sur SON portail Stripe (sans changement d’offre ni résiliation), jamais sur le portail par défaut ; portail non configuré : rien ne s’ouvre',
    /const entreprise = r\.a\.plan === 'entreprise'/.test(portail) && /if \(entreprise && !portailEntreprise\) return NextResponse\.json\([^)]*\{ status: 503 \}\)/.test(portail)
    && /\.\.\.\(entreprise && portailEntreprise \? \{ configuration: portailEntreprise \} : \{\}\)/.test(portail) && /select\('stripe_customer_id, stripe_subscription_id, plan'\)/.test(portail))
  const lanceur = lire('scripts/tout-verifier.mjs')
  ok('D4 la suite est au tableau SUITES de scripts/tout-verifier.mjs (cout: gratuit), avant les suites qui appellent le modèle',
    /args: \['--experimental-strip-types', '--import', '\.\/scripts\/ts-loader\.mjs', 'scripts\/securite-assistant-0211-qa\.mjs'\], cout: 'gratuit'/.test(lanceur)
    && lanceur.indexOf('scripts/securite-assistant-0211-qa.mjs') < lanceur.indexOf('// Ces trois-là appellent vraiment le modèle'))
  ok('D4b le garde-fou des envois (escalade avant le mode assisté) est au tableau SUITES : quelqu’un le joue (troisième audit 032-005)',
    /args: \['--experimental-strip-types', '--import', '\.\/scripts\/ts-loader\.mjs', 'scripts\/garde-fou-envoi-qa\.mjs'\], cout: 'gratuit'/.test(lanceur))
  ok('D5 aucun appel réseau hors de la doublure : la base factice a servi les lectures, aucune autre adresse n’a été tentée', reseau.interceptes > 0 && reseau.refuses.length === 0, reseau.refuses.join(','))
} catch (e) {
  rouges.push('exception'); console.log(`FAIL exception — ${e instanceof Error ? e.stack : e}`)
} finally {
  try { fs.rmSync(TMP, { recursive: true, force: true }) } catch { /* dossier temporaire du juge : le système le videra */ }
}

console.log(`\n${verts} PASS, ${rouges.length} FAIL`)
if (rouges.length) { console.log('Rouges :\n- ' + rouges.join('\n- ')); process.exitCode = 1 }
