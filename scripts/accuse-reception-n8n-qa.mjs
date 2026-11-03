// Juge HORS LIGNE du workflow n8n `presti-accuse-reception` (chantier 4, lot L18 ; tâche 032-040) — pas 1 à 3 de la règle de remplacement
// (.claude/rules/migration-production.md) : le workflow refait-il l'avis à l'artisan (app/api/leads/route.ts:386) et l'accusé de réception
// au prospect, au nom de l'artisan (:393-399, texte fixe sans la mention d'IA : :402) ?
//
// Il relit l'export (.orchestre/preuves/032-040/presti-accuse-reception.workflow.json, tiré du n8n d'Oracle), le brief
// (plans/011-cadrage-01-11/briefs/c4-n8n-accuse-reception.md), l'essai n8n (essai-n8n.json, essai-pin.json) et :
//   1. STRUCTURE : inactif, sans version publiée ; fuseau Europe/Paris ; une exécution par minute ; chaîne exacte ; chaque lecture HTTP en GET,
//      sans corps, au gabarit exact (adresse, select=, filtres) ; ce qui est lu au moment d'envoyer le DÉCLARE (`lecture-pour-envoi`) ;
//      les deux nœuds d'envoi DÉSACTIVÉS, sans identifiant, sans la ligne « envoyé avec n8n », pied déclaré « aucun » ; branche d'erreur
//      désignée ; garde commune scripts/n8n-specs-qa.mjs verte sur l'export ;
//   2. COPIE FIGÉE : les constantes du nœud Code égales à celles du code (plafonds de lib/email.ts, expéditeur, motifs du silence) ;
//   3. COMPARAISON, cas par cas : la VRAIE route app/api/leads/route.ts est jouée sur des demandes fictives (doublures : base, modèle, limites,
//      push ; la vraie lib/email.ts, avec un fetch qui note ce que Resend recevrait ; les vraies décisions de lib/plateformeConfig.ts) ; le
//      motif que la route déposerait (colonne `leads.motif_reponse`, PROPOSÉE : le brief la décrit) est déduit de la décision observée ; les
//      nœuds Code de l'export rejouent les lectures qu'auraient rendues les requêtes du workflow ; les courriers doivent être IDENTIQUES à
//      ceux de la route, aux ÉCARTS ÉCRITS près (brief, « Comparaison ») — chaque écart a son cas et doit être observé, sinon rouge ;
//   4. ESSAI : la pin data de l'essai n8n (exécution 380), rejouée hors ligne, rend exactement la sortie de n8n ;
//   5. DÉLAI : sur chaque seconde de dix minutes, le nœud « Fenetre du passage » donne UNE fenêtre à chaque demande (jamais zéro, jamais deux),
//      et l'accusé attend entre 30 et 90 secondes ;
//   6. MUTANTS : chacun doit faire rougir le juge pour sa raison.
//
// Aucun réseau, aucune base, aucun modèle, aucun envoi, aucune écriture (hors /tmp pour la garde commune). Lancement :
//   node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/accuse-reception-n8n-qa.mjs
//   … scripts/accuse-reception-n8n-qa.mjs --pin   (imprime la pin data de l'essai, sans rien juger)
import { readFileSync, existsSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { register } from 'node:module'
import { tmpdir } from 'node:os'
import { pathToFileURL, fileURLToPath } from 'node:url'
import vm from 'node:vm'
import path from 'node:path'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CHEMINS = {
  export: '.orchestre/preuves/032-040/presti-accuse-reception.workflow.json',
  essai: '.orchestre/preuves/032-040/essai-n8n.json',
  pin: '.orchestre/preuves/032-040/essai-pin.json',
  brief: 'plans/011-cadrage-01-11/briefs/c4-n8n-accuse-reception.md',
  email: 'lib/email.ts',
  config: 'lib/plateformeConfig.ts',
  route: 'app/api/leads/route.ts',
}
const lireTexte = (c) => readFileSync(path.join(RACINE, c), 'utf8')
const copie = (o) => JSON.parse(JSON.stringify(o))
const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// ─── Ce que le workflow doit être (le brief le recopie) ───────────────────────────────────────────────────────────────────────
const HOTE = 'https://gorcdvmueakcncsmrouo.supabase.co/rest/v1/'
const SILENCE_FILTRE = 'in.(manuelle,escalade,horaire,humain,limite)'
const F = (champ) => `$('Fenetre du passage').first().json.${champ}`
const FENETRE = (a, b) => `={{ '(created_at.gte.' + ${F(a)} + ',created_at.lt.' + ${F(b)} + ')' }}`
const ORDRE = ['order', 'created_at.asc,id.asc']
const LIMITE = ['limit', '1000']
const NUL = '00000000-0000-0000-0000-000000000000'
const LECTURES = [
  { nom: 'Lire demandes du jour', table: 'leads', params: [['select', 'id,artisan_id,created_at,motif_reponse'], ['and', FENETRE('depuis_jour', 'fin')], ['motif_reponse', SILENCE_FILTRE], ORDRE, LIMITE], envoi: null },
  { nom: 'Lire destinataires', table: 'leads', params: [['select', 'id,artisan_id,created_at,motif_reponse,nom_prospect,contact'], ['and', FENETRE('debut', 'fin')], ['motif_reponse', SILENCE_FILTRE], ORDRE, LIMITE], envoi: 'Envoyer l accuse' },
  { nom: 'Lire comptes', table: 'artisans', params: [['select', 'id,nom,email,notifications'], ['id', `={{ 'in.(' + ([...new Set($('Lire destinataires').all().map(i => i.json.artisan_id).filter(Boolean))].join(',') || '${NUL}') + ')' }}`], ['order', 'id'], LIMITE], envoi: 'Envoyer l avis' },
  { nom: 'Lire doublons', table: 'leads', params: [['select', 'id,contact,created_at'], ['and', FENETRE('depuis_doublons', 'fin')], ['or', null], ORDRE, LIMITE], envoi: 'Envoyer l accuse' },
]
const CHAINE = ['Toutes les minutes', 'Fenetre du passage', ...LECTURES.map((l) => l.nom), 'Courriers a envoyer']
const TYPES = {
  'Toutes les minutes': 'n8n-nodes-base.scheduleTrigger', 'Fenetre du passage': 'n8n-nodes-base.code', 'Courriers a envoyer': 'n8n-nodes-base.code',
  'Garder les accuses': 'n8n-nodes-base.filter', 'Garder les avis': 'n8n-nodes-base.filter', 'Envoyer l accuse': 'n8n-nodes-base.emailSend', 'Envoyer l avis': 'n8n-nodes-base.emailSend',
  ...Object.fromEntries(LECTURES.map((l) => [l.nom, 'n8n-nodes-base.httpRequest'])),
}
const CRED = { id: 'dTewDK98MLrNckNG', name: 'Supabase account' }
const ERREUR_COMMUNE = 'AQeHiC58UgbMR4Kr' // presti-erreurs (032-033) : alerte courte, aucune donnée
const SILENCE_JUGE = ['manuelle', 'escalade', 'horaire', 'humain', 'limite']

// ─── Rejouer un nœud Code (contexte vm neuf : aucun objet de l'hôte hormis $, $input ; Date figée à l'instant donné) ───────────────
function executer(jsCode, { instant, sorties = {}, entree = [{}] }) {
  const enItems = (l) => l.map((j) => ({ json: copie(j) }))
  const $ = (nom) => { if (!(nom in sorties)) throw new Error(`nœud inconnu ou pas encore exécuté : ${nom}`); const it = enItems(sorties[nom]); return { all: () => it, first: () => it[0] } }
  const ent = enItems(entree)
  const $input = { all: () => ent, first: () => ent[0] }
  const ctx = vm.createContext({ $, $input }, { codeGeneration: { strings: false, wasm: false } })
  vm.runInContext(`globalThis.Date = (function (R) { class D extends R { constructor(...a) { if (a.length === 0) super(${Number(instant)}); else super(...a) } static now() { return ${Number(instant)} } } return D })(Date)`, ctx)
  const r = vm.runInContext('(function () {\n' + jsCode + '\n})()', ctx, { timeout: 5000, filename: 'noeud-code.js' })
  if (!Array.isArray(r)) throw new Error("le code doit rendre une liste d'éléments")
  return JSON.parse(JSON.stringify(r)).map((i) => i.json)
}
const noeud = (wf, nom) => wf.nodes.find((n) => n.name === nom)
const codeDe = (wf, nom) => { const n = noeud(wf, nom); if (!n || typeof n.parameters?.jsCode !== 'string') throw new Error(`nœud Code absent : ${nom}`); return n.parameters.jsCode }
const chargerExport = () => { const brut = JSON.parse(lireTexte(CHEMINS.export)); return brut.workflow ?? brut }

// ─── Les données fictives ──────────────────────────────────────────────────────────────────────────────────────────────────────
const INSTANT = Date.parse('2026-11-02T22:25:20.300Z') // un passage de n8n (le nœud tourne à la minute pile, un peu après)
const T0 = Date.parse('2026-11-02T22:23:40.000Z') // la fenêtre de ce passage : [22:23:30, 22:24:30)
const FENETRE_PINNEE = { jour: '2026-11-02', debut: '2026-11-02T22:23:30.000Z', fin: '2026-11-02T22:24:30.000Z', depuis_jour: '2026-11-01T23:00:00.000Z', depuis_doublons: '2026-11-01T22:24:30.000Z', passage: '2026-11-02T22:25:00.000Z', simulation: true }
const idArtisan = (n) => `aaaaaaaa-0000-4000-8000-${String(n).padStart(12, '0')}`
const artisan = (n, extra = {}) => ({ id: idArtisan(n), slug: `artisan-${n}`, suppression_demandee_le: null, nom: 'Atelier Exemple.', metier: 'plombier', ton_style: null, email: `atelier${n}@exemple.test`,
  is_founder: false, leads_pause: false, services: null, zone_intervention: null, bio: null, tva_regime: null, assurance_nom: null, plan: 'studio', notifications: null, ...extra })
const heureParis = () => parseInt(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }).format(new Date()), 10)
const FERME = () => ({ mode_reponse: 'auto', auto_24_7: false, auto_debut: (heureParis() + 2) % 24, auto_fin: (heureParis() + 3) % 24 }) // plage fermée « maintenant » : la nuit
const post = (slug, contact, nom, message, extra = {}) => { const { corps, ...reste } = extra; return { corps: { slug, contact, nom_prospect: nom, message, ...(corps ?? {}) }, ...reste } }
const MSG = 'Bonjour, je voudrais un devis pour refaire ma salle de bain.'

// Chaque cas : les comptes, les réglages, les demandes ; pour chaque demande, le motif attendu (la colonne proposée) et les courriers attendus
// de la ROUTE (`ancien`), puis ceux de n8n s'ils diffèrent (`n8n`, écart écrit).
const CAS = [
  { nom: 'manuelle, prospect avec e-mail, artisan avec adresse', artisans: [artisan(1)], config: { 1: { mode_reponse: 'manuelle' } },
    posts: [{ ...post('artisan-1', 'camille@exemple.test', 'Camille Exemple.', MSG), motif: 'manuelle', ancien: ['avis', 'accuse'] }] },
  { nom: 'prospect sans e-mail (téléphone)', artisans: [artisan(1)], config: { 1: { mode_reponse: 'manuelle' } },
    posts: [{ ...post('artisan-1', '0612345678', 'Exemple. Sans courriel', MSG), motif: 'manuelle', ancien: ['avis'] }] },
  { nom: 'artisan sans adresse e-mail', artisans: [artisan(1, { email: null })], config: { 1: { mode_reponse: 'manuelle' } },
    posts: [{ ...post('artisan-1', 'camille@exemple.test', 'Camille Exemple.', MSG), motif: 'manuelle', ancien: ['accuse'] }] },
  { nom: 'doublon : la même adresse quatre fois (casse variée) → le quatrième accusé est refusé par le plafond', artisans: [artisan(1)], config: { 1: { mode_reponse: 'manuelle' } },
    posts: [post('artisan-1', 'Dup@Exemple.test', 'Doublon Exemple.', MSG), post('artisan-1', 'dup@exemple.test', 'Doublon Exemple.', MSG), post('artisan-1', 'dup@exemple.test', 'Doublon Exemple.', MSG), post('artisan-1', 'DUP@exemple.test', 'Doublon Exemple.', MSG)]
      .map((p, i) => ({ ...p, motif: 'manuelle', ancien: i < 3 ? ['avis', 'accuse'] : ['avis'] })) },
  { nom: 'STOP : mot d’escalade de l’artisan (« stop »)', artisans: [artisan(1)], config: { 1: { escalade_mots: ['stop'] } },
    posts: [{ ...post('artisan-1', 'stop@exemple.test', 'Stop Exemple.', 'STOP'), motif: 'escalade', ancien: ['avis', 'accuse'] }] },
  { nom: 'mot d’escalade par défaut (« fuite »), offre Studio assistée', artisans: [artisan(1)], config: {},
    posts: [{ ...post('artisan-1', 'fuite@exemple.test', 'Fuite Exemple.', 'Une fuite sous mon évier, vite !'), motif: 'escalade', ancien: ['avis', 'accuse'] }] },
  { nom: 'nuit : Signature en mode auto, plage horaire fermée', artisans: [artisan(1, { plan: 'signature' })], config: { 1: FERME() },
    posts: [{ ...post('artisan-1', 'nuit@exemple.test', 'Nuit Exemple.', MSG), motif: 'horaire', ancien: ['avis', 'accuse'] }] },
  { nom: 'jour : Signature en mode auto, plage ouverte → la réponse part seule (hors de ce lot)', artisans: [artisan(1, { plan: 'signature' })], config: { 1: { mode_reponse: 'auto', auto_24_7: true } },
    posts: [{ ...post('artisan-1', 'jour@exemple.test', 'Jour Exemple.', MSG), motif: 'auto', hors: true }] },
  { nom: 'Studio en mode auto → verrou d’offre, réponse proposée (hors de ce lot)', artisans: [artisan(1, { plan: 'studio' })], config: { 1: { mode_reponse: 'auto', auto_24_7: true } },
    posts: [{ ...post('artisan-1', 'studio@exemple.test', 'Studio Exemple.', MSG), motif: 'verrou_offre', hors: true }] },
  { nom: 'Studio assistée par défaut → réponse proposée (hors de ce lot)', artisans: [artisan(1, { plan: 'studio' })], config: {},
    posts: [{ ...post('artisan-1', 'assistee@exemple.test', 'Assistee Exemple.', MSG), motif: 'assistee', hors: true }] },
  { nom: 'Signature en mode manuel', artisans: [artisan(1, { plan: 'signature' })], config: { 1: { mode_reponse: 'manuelle' } },
    posts: [{ ...post('artisan-1', 'sig@exemple.test', 'Sig Exemple.', MSG), motif: 'manuelle', ancien: ['avis', 'accuse'] }] },
  { nom: 'notification « nouvelle demande » coupée par l’artisan', artisans: [artisan(1, { notifications: { nouvelle_demande: false } })], config: { 1: { mode_reponse: 'manuelle' } },
    posts: [{ ...post('artisan-1', 'camille@exemple.test', 'Camille Exemple.', MSG), motif: 'manuelle', ancien: ['accuse'] }] },
  { nom: 'adresses de test en .invalid : rien ne part vers elles', artisans: [artisan(1), artisan(2, { email: 'atelier2@exemple.invalid' })], config: { 1: { mode_reponse: 'manuelle' }, 2: { mode_reponse: 'manuelle' } },
    posts: [{ ...post('artisan-1', 'client@exemple.invalid', 'Invalide Exemple.', MSG), motif: 'manuelle', ancien: ['avis'] },
      { ...post('artisan-2', 'client2@exemple.test', 'Invalide Exemple.', MSG), motif: 'manuelle', ancien: ['accuse'] }] },
  { nom: 'plafond par artisan : dix demandes de suite → les deux dernières sont étranglées', artisans: [artisan(1)], config: { 1: { mode_reponse: 'manuelle' } },
    posts: Array.from({ length: 10 }, (_, i) => ({ ...post('artisan-1', `rafale${i}@exemple.test`, `Rafale ${i} Exemple.`, MSG), motif: i < 8 ? 'manuelle' : 'throttle', ...(i < 8 ? { ancien: ['avis', 'accuse'] } : { hors: true }) })) },
  { nom: 'compte en pause de ses demandes', artisans: [artisan(1, { leads_pause: true })], config: { 1: { mode_reponse: 'manuelle' } },
    posts: [{ ...post('artisan-1', 'pause@exemple.test', 'Pause Exemple.', MSG), motif: 'pause', hors: true }] },
  { nom: 'premier message sans coordonnées (variante B) : l’avis neutre reste dans la route', artisans: [artisan(1)], config: { 1: { mode_reponse: 'manuelle' } },
    posts: [{ ...post('artisan-1', null, null, 'Bonjour, une question.', { corps: { deferContact: true } }), motif: 'manuelle', ancien: ['avis'], n8n: [], ecart: 'E5' }] },
  { nom: 'plafonds du jour : 60 demandes sur 10 comptes, adresses toutes différentes (30 accusés, 50 avis, puis rien)', artisans: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => artisan(n)), config: Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => [n, { mode_reponse: 'manuelle' }])),
    posts: Array.from({ length: 60 }, (_, i) => ({ ...post(`artisan-${(i % 10) + 1}`, `jour${i}@exemple.test`, `Jour ${i} Exemple.`, MSG), motif: 'manuelle', ancien: i < 30 ? ['avis', 'accuse'] : i < 50 ? ['avis'] : [] })) },
  { nom: 'adresse atypique (guillemet) : la route envoie, n8n refuse', artisans: [artisan(1)], config: { 1: { mode_reponse: 'manuelle' } },
    posts: [{ ...post('artisan-1', 'a"b@exemple.test', 'Atypique Exemple.', MSG), motif: 'manuelle', ancien: ['avis', 'accuse'], n8n: ['avis'], ecart: 'E3' }] },
  { nom: 'noms : artisan sans nom, artisan à nom chargé, prospect sans nom, prénom composé', artisans: [artisan(1, { nom: '' }), artisan(2, { nom: 'Dupont & Fils "Pro" <bat>' }), artisan(3)],
    config: { 1: { mode_reponse: 'manuelle' }, 2: { mode_reponse: 'manuelle' }, 3: { mode_reponse: 'manuelle' } },
    posts: [{ ...post('artisan-1', 'n1@exemple.test', 'Jean-Pierre Martin', MSG), motif: 'manuelle', ancien: ['avis', 'accuse'] },
      { ...post('artisan-2', 'n2@exemple.test', null, MSG), motif: 'manuelle', ancien: ['avis', 'accuse'] },
      { ...post('artisan-3', 'n3@exemple.test', '  Zoé   Exemple.  ', 'Première ligne\nDeuxième ligne : je veux un devis.'), motif: 'manuelle', ancien: ['avis', 'accuse'] }] },
  { nom: 'crédits épuisés (auto) : la route ne prépare rien (hors de ce lot)', artisans: [artisan(1, { plan: 'signature' })], config: { 1: { mode_reponse: 'auto', auto_24_7: true } }, sansCredit: true,
    posts: [{ ...post('artisan-1', 'credit@exemple.test', 'Credit Exemple.', MSG), motif: 'credits', hors: true }] },
]

// ─── Jouer la VRAIE route sur ces cas (doublures : base, modèle, limites, push, sortie ; la vraie lib/email.ts et la vraie décision) ──
const FICHIER = (c) => pathToFileURL(path.join(RACINE, c)).href
const Q = 'globalThis.__QA'
const MOCKS = {
  '@/lib/supabaseAdmin': `export const supabaseAdmin = ${Q}.db`,
  '@/lib/suspension': `export const suspensionEnCours = async () => false; export const MESSAGE_PUBLIC_INDISPONIBLE = 'indisponible'`,
  '@/lib/ai': `export const generateLeadReply = async () => 'Réponse exemple.'; export const generateConversationReply = async () => 'Proposition exemple.'; export const qualifyLead = () => ({ urgence: 'normal', type_chantier: null })`,
  '@/lib/credits': `export const consumeCredit = async () => ({ ok: !${Q}.etat.sansCredit }); export const rendreCredit = async () => {}`,
  '@/lib/alerteService': `export const signalerPanneIA = async () => {}`,
  '@/lib/security': `export const getIp = () => ${Q}.etat.ip; export const isBanned = async () => false; export const recordAbuse = async () => {}; export const ipPseudonyme = (x) => 'pseudo-' + x`,
  '@/lib/limites': `export const cleEmail = (p, e) => p + ':' + String(e).trim().toLowerCase()
    export const consommerLimite = async (cle, max) => { const c = ${Q}.etat.compteurs; c[cle] = (c[cle] || 0) + 1; const ok = c[cle] <= max; if (!ok && cle.startsWith('leads:artisan:')) ${Q}.etat.etrangle[${Q}.etat.k] = true; return ok }
    export const consommerLimiteStricte = consommerLimite`,
  '@/lib/quotaMedia': `export const porteMonnaieConversation = async () => ({ accepte: () => true, octets: () => 0 })`,
  '@/lib/slugRedirect': `export const artisanParAncienSlug = async () => null`,
  '@/lib/purgeComptes': `export const PREFIXE_ADRESSE_PURGEE = 'supprime-'`,
  '@/lib/agents/sortie': `export const sortiePermise = async () => ({ permise: true })`,
  '@/lib/push': `export const envoyerPushArtisan = async (artisanId, charge) => { ${Q}.etat.push.push({ k: ${Q}.etat.k, artisanId, titre: charge && charge.titre }) }`,
  '@/lib/pilote/serveur': `export const piloterProposition = async () => {}`,
  // La vraie lib/plateformeConfig.ts, avec un espion sur la décision : on lit ce que la route a VRAIMENT décidé.
  '@/lib/plateformeConfig': `import * as R from ${JSON.stringify(FICHIER(CHEMINS.config))}
    export * from ${JSON.stringify(FICHIER(CHEMINS.config))}
    export const decisionReponse = (...a) => { const d = R.decisionReponse(...a); ${Q}.etat.decisions[${Q}.etat.k] = d; return d }`,
}
function fabriquerBase() {
  const exec = (s) => {
    const E = globalThis.__QA.etat
    if (s.table === 'artisans' && s.op === 'select') {
      const a = E.artisans.find((x) => (s.filt.slug !== undefined && x.slug === s.filt.slug) || (s.filt.id !== undefined && x.id === s.filt.id))
      return { data: a ? (s.cols === 'notifications' ? { notifications: a.notifications ?? null } : a) : null, error: null }
    }
    if (s.table === 'plateforme_config' && s.op === 'select') return { data: E.config[s.filt.artisan_id] ?? null, error: null }
    if (s.table === 'leads' && s.op === 'insert') {
      const n = E.leads.length + 1
      const ligne = { ...s.values, id: `1ead0000-0000-4000-8000-${String(n).padStart(12, '0')}`, token: `jeton-${n}`, created_at: new Date(T0 + E.leads.length * 500).toISOString(), k: E.k }
      E.leads.push(ligne)
      return { data: { id: ligne.id, token: ligne.token }, error: null }
    }
    if (s.table === 'messages' && s.op === 'insert') return { data: { id: 'm' + Math.random().toString(36).slice(2, 8) }, error: null }
    return { data: null, error: null }
  }
  const q = (table) => {
    const s = { table, op: 'select', filt: {}, values: null, cols: null }
    const b = {
      select(c) { s.cols = c; return b }, insert(v) { s.op = 'insert'; s.values = v; return b }, update(v) { s.op = 'update'; s.values = v; return b },
      eq(k, v) { s.filt[k] = v; return b }, maybeSingle() { return b }, single() { return b },
      then(res, rej) { try { return Promise.resolve(exec(s)).then(res, rej) } catch (e) { return Promise.reject(e).then(res, rej) } },
    }
    return b
  }
  return { from: q, rpc: async () => ({ data: true, error: null }) }
}
async function jouerLaRoute() {
  globalThis.__QA = { db: fabriquerBase(), etat: null }
  process.env.RESEND_API_KEY = 'cle-fictive-du-juge'
  delete process.env.EMAIL_EXPEDITEUR_ARTISAN
  register('data:text/javascript,' + encodeURIComponent(`
    const mocks = ${JSON.stringify(MOCKS)};
    export async function resolve(s, c, next) { if (s === 'next/server') return next('next/server.js', c); if (mocks[s]) return { url: 'data:text/javascript,' + encodeURIComponent(mocks[s]), shortCircuit: true }; return next(s, c) }`))
  const vraiFetch = globalThis.fetch
  globalThis.fetch = async (url, init) => {
    if (String(url) !== 'https://api.resend.com/emails') throw new Error(`appel réseau inattendu : ${url}`)
    globalThis.__QA.etat.resend.push({ k: globalThis.__QA.etat.k, ...JSON.parse(init.body) })
    return { ok: true, json: async () => ({ id: 'resend-fictif' }) }
  }
  const { POST } = await import('../app/api/leads/route.ts')
  const sorties = []
  try {
    for (const cas of CAS) {
      globalThis.__QA.etat = { artisans: cas.artisans, config: Object.fromEntries(Object.entries(cas.config).map(([n, c]) => [idArtisan(Number(n)), c])), leads: [], resend: [], push: [], decisions: {}, etrangle: {},
        compteurs: {}, ip: 'ip', k: -1, sansCredit: !!cas.sansCredit }
      const E = globalThis.__QA.etat
      const posts = []
      for (const [k, p] of cas.posts.entries()) {
        E.k = k; E.ip = `ip-${k}`
        const nAvant = E.leads.length
        const rep = await POST(new Request('http://localhost/api/leads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(p.corps) }))
        const json = await rep.json()
        const lead = E.leads.length > nAvant ? E.leads[E.leads.length - 1] : null
        const d = E.decisions[k] ?? null
        const art = cas.artisans.find((a) => a.slug === p.corps.slug)
        // Le motif que la route déposerait dans leads.motif_reponse (colonne proposée) — déduit de ce qu'elle a fait, jamais écrit à la main.
        let motif = null
        if (lead) {
          if (json.sansPlateforme) motif = null
          else if (json.paused) motif = 'pause'
          else if (E.etrangle[k]) motif = 'throttle'
          else if (d) motif = d.ok ? (json.raison === 'credits' ? 'credits' : 'auto') : d.raison
        }
        posts.push({ p, k, lead, motif, decision: d, rep: json, statut: rep.status, resend: E.resend.filter((r) => r.k === k), push: E.push.filter((x) => x.k === k), art })
      }
      sorties.push({ cas, posts, leads: E.leads, artisans: cas.artisans })
    }
  } finally { globalThis.fetch = vraiFetch }
  return sorties
}

// ─── Ce que les requêtes du workflow rendraient sur ces demandes ─────────────────────────────────────────────────────────────────────
const SURE_JUGE = /^[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/ // le gabarit de l'expression de « Lire doublons », contrôlé plus bas
function lecturesN8n(leadsAvecMotif, artisans, fen) {
  const dans = (c, a, b) => c >= a && c < b
  const dansSilence = (l) => SILENCE_JUGE.includes(l.motif_reponse)
  const tri = (a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : a.id < b.id ? -1 : 1)
  const dest = leadsAvecMotif.filter((l) => dansSilence(l) && dans(l.created_at, fen.debut, fen.fin)).sort(tri)
  const ids = [...new Set(dest.map((l) => l.artisan_id))]
  const adresses = new Set(dest.map((l) => String(l.contact || '').trim().toLowerCase()).filter((c) => SURE_JUGE.test(c)))
  return {
    'Lire demandes du jour': leadsAvecMotif.filter((l) => dansSilence(l) && dans(l.created_at, fen.depuis_jour, fen.fin)).sort(tri).map(({ id, artisan_id, created_at, motif_reponse }) => ({ id, artisan_id, created_at, motif_reponse })),
    'Lire destinataires': dest.map(({ id, artisan_id, created_at, motif_reponse, nom_prospect, contact }) => ({ id, artisan_id, created_at, motif_reponse, nom_prospect, contact })),
    'Lire comptes': artisans.filter((a) => ids.includes(a.id)).map(({ id, nom, email, notifications }) => ({ id, nom, email, notifications })),
    'Lire doublons': leadsAvecMotif.filter((l) => dans(l.created_at, fen.depuis_doublons, fen.fin) && adresses.has(String(l.contact || '').trim().toLowerCase())).sort(tri).map(({ id, contact, created_at }) => ({ id, contact, created_at })),
  }
}
function passageN8n(wf, leads, artisans, instant = INSTANT) {
  const [fen] = executer(codeDe(wf, 'Fenetre du passage'), { instant })
  const lectures = lecturesN8n(leads, artisans, fen)
  const sortie = executer(codeDe(wf, 'Courriers a envoyer'), { instant, sorties: { 'Fenetre du passage': [fen], ...lectures } })
  return { fen, lectures, sortie }
}

// ─── La comparaison ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const ECARTS = ['E1', 'E2', 'E3', 'E4', 'E5'] // E1 « Besoin » non lu ; E2 mot d'escalade ; E3 adresse atypique ; E4 push ; E5 premier message différé
function normaliserAncien(r, vus) {
  // L'ancien courrier (ce que Resend aurait reçu), ramené à la forme de n8n par les écarts écrits — et seulement eux.
  const o = { from: r.from, to: r.to[0], subject: r.subject, text: r.text, reply_to: r.reply_to ?? '' }
  if (o.from.startsWith('Presti <')) {
    const sansMot = o.subject.replace(/ \(« .* »\) —/, ' —')
    if (sansMot !== o.subject) { vus.add('E2'); o.subject = sansMot }
    const sansBesoin = o.text.replace(/\nBesoin : [\s\S]*?\n\nRépondez-lui depuis votre espace \(Messages\)\./, '\n\nSa demande est dans votre espace (Messages) : répondez-lui depuis là.')
    if (sansBesoin !== o.text) { vus.add('E1'); o.text = sansBesoin }
  }
  return o
}
const versPayload = (i) => ({ from: i.de, to: i.a, subject: i.sujet, text: i.texte, reply_to: i.repondre_a ?? '' })
const genre = (r) => (r.from.startsWith('Presti <') ? 'avis' : 'accuse')

function comparer(wf, mondes) {
  const erreurs = []
  const ko = (m) => erreurs.push(`COMPARE ${m}`)
  const vus = new Set()
  let nAvis = 0, nAccuses = 0
  for (const monde of mondes) {
    const { cas, posts, leads, artisans } = monde
    const avecMotif = posts.filter((x) => x.lead).map((x) => ({ ...x.lead, motif_reponse: x.motif }))
    let sortie
    try { ({ sortie } = passageN8n(wf, avecMotif, artisans)) } catch (e) { ko(`${cas.nom} : le code du workflow plante (${e.message})`); continue }
    for (const x of posts) {
      const quoi = `${cas.nom} [demande ${x.k + 1}]`
      if (!x.lead) { ko(`${quoi} : la route n'a pas enregistré la demande (statut ${x.statut})`); continue }
      if (x.motif !== x.p.motif) { ko(`${quoi} : motif observé « ${x.motif} », attendu « ${x.p.motif} » (la décision de la route a changé ?)`); continue }
      const mails = sortie.filter((i) => i.lead_id === x.lead.id && (i.courrier === 'avis' || i.courrier === 'accuse'))
      if (x.p.hors) {
        if (mails.length) ko(`${quoi} : n8n prépare ${mails.length} courrier(s) pour une demande qui n'est pas dans le silence (${x.motif})`)
        continue
      }
      const vieux = x.resend.map((r) => ({ genre: genre(r), ...normaliserAncien(r, vus) }))
      const genresVieux = vieux.map((v) => v.genre)
      if (!egal(genresVieux, x.p.ancien)) { ko(`${quoi} : la route a envoyé ${JSON.stringify(genresVieux)}, attendu ${JSON.stringify(x.p.ancien)}`); continue }
      const attendu = x.p.n8n ?? x.p.ancien
      const neufs = mails.map((m) => ({ genre: m.courrier, ...versPayload(m) }))
      if (!egal(neufs.map((m) => m.genre), attendu)) { ko(`${quoi} : n8n prépare ${JSON.stringify(neufs.map((m) => m.genre))}, attendu ${JSON.stringify(attendu)}`); continue }
      if (x.p.ecart) vus.add(x.p.ecart)
      for (const n of neufs) {
        n.genre === 'avis' ? nAvis++ : nAccuses++
        const v = vieux.find((y) => y.genre === n.genre)
        if (!v) continue
        const { genre: _a, ...vv } = v
        const { genre: _b, ...nn } = n
        if (x.p.ecart === 'E3' && n.genre === 'avis') { vv.reply_to = 'contact@prestiapp.fr'; vus.add('E3') } // E3 : le Reply-To de l'avis ne vise pas une adresse atypique (il retombe sur celui de Presti)
        if (!egal(vv, nn)) ko(`${quoi} : le courrier « ${n.genre} » diffère de celui de la route\n      route : ${JSON.stringify(vv)}\n      n8n   : ${JSON.stringify(nn)}`)
      }
      if (x.push.length) vus.add('E4') // la route prévenait aussi par notification poussée ; n8n n'en fait pas
    }
    // Chaque demande n'a droit qu'à une clé par courrier (idempotence de la sortie).
    const cles = sortie.filter((i) => i.cle).map((i) => i.cle)
    if (new Set(cles).size !== cles.length) ko(`${cas.nom} : une clé de courrier en double (${cles.length} clés)`)
  }
  for (const e of ECARTS) if (!vus.has(e)) ko(`l'écart ${e} n'a été observé par aucun cas : il est écrit au brief mais le juge ne le prouve pas`)
  if (nAvis < 25 || nAccuses < 40) ko(`comparaison trop maigre : ${nAvis} avis et ${nAccuses} accusés comparés (attendu au moins 25 et 40)`)
  return { erreurs, nAvis, nAccuses }
}

// ─── La structure ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
function structure(wf) {
  const erreurs = []
  const ko = (m) => erreurs.push(`STRUCT ${m}`)
  if (wf.active !== false) ko('le workflow doit être inactif (active: false)')
  if (wf.activeVersionId) ko('aucune version publiée attendue (activeVersionId)')
  const s = wf.settings ?? {}
  if (s.timezone !== 'Europe/Paris') ko(`fuseau ${s.timezone} : Europe/Paris attendu`)
  if (s.errorWorkflow !== ERREUR_COMMUNE) ko(`workflow d'erreur ${s.errorWorkflow} : l'identifiant nu de presti-erreurs (${ERREUR_COMMUNE}) est attendu`)
  if (s.saveDataSuccessExecution !== 'none') ko("les exécutions réussies ne doivent pas être gardées (elles porteraient les adresses des prospects)")
  if (!Number.isInteger(s.executionTimeout) || s.executionTimeout < 1 || s.executionTimeout > 600) ko(`délai maximal ${s.executionTimeout} : un entier de 1 à 600 s attendu`)
  const noms = wf.nodes.map((n) => n.name)
  for (const [nom, type] of Object.entries(TYPES)) { const n = noeud(wf, nom); if (!n) ko(`nœud absent : ${nom}`); else if (n.type !== type) ko(`${nom} : type ${n.type}, attendu ${type}`) }
  for (const n of wf.nodes) if (!(n.name in TYPES) && n.type !== 'n8n-nodes-base.stickyNote') ko(`nœud inattendu : ${n.name} (${n.type})`)
  const declencheur = noeud(wf, 'Toutes les minutes')
  if (declencheur && declencheur.parameters?.rule?.interval?.[0]?.expression !== '0 * * * * *') ko('le déclencheur doit tourner à la seconde 0 de chaque minute (cron « 0 * * * * * »)')
  // Chaîne exacte, avec le départ en parallèle des deux envois.
  const lien = (de, vers, sortie = 0) => (wf.connections?.[de]?.main?.[sortie] ?? []).some((l) => l.node === vers)
  for (let i = 0; i < CHAINE.length - 1; i++) if (!lien(CHAINE[i], CHAINE[i + 1])) ko(`connexion absente : ${CHAINE[i]} → ${CHAINE[i + 1]}`)
  if (!lien('Courriers a envoyer', 'Garder les accuses') || !lien('Courriers a envoyer', 'Garder les avis')) ko("« Courriers a envoyer » doit alimenter les deux filtres EN PARALLÈLE (l'avis ne doit pas dépendre de la sortie de l'accusé)")
  if (!lien('Garder les accuses', 'Envoyer l accuse') || !lien('Garder les avis', 'Envoyer l avis')) ko('chaque filtre doit alimenter son envoi')
  const attendus = new Set([...CHAINE.slice(0, -1).map((n, i) => `${n}>${CHAINE[i + 1]}`), 'Courriers a envoyer>Garder les accuses', 'Courriers a envoyer>Garder les avis', 'Garder les accuses>Envoyer l accuse', 'Garder les avis>Envoyer l avis'])
  for (const [de, sorties] of Object.entries(wf.connections ?? {})) for (const liste of sorties.main ?? []) for (const l of liste ?? []) if (!attendus.has(`${de}>${l.node}`)) ko(`connexion inattendue : ${de} → ${l.node}`)
  // Les lectures : gabarit exact.
  for (const l of LECTURES) {
    const n = noeud(wf, l.nom)
    if (!n) continue
    const p = n.parameters ?? {}
    if (p.method !== 'GET') ko(`${l.nom} : méthode ${p.method} (GET seulement)`)
    if (p.sendBody) ko(`${l.nom} : corps de requête interdit`)
    if (p.url !== HOTE + l.table) ko(`${l.nom} : adresse ${p.url}, attendue ${HOTE + l.table}`)
    if (!egal(n.credentials, { supabaseApi: CRED })) ko(`${l.nom} : identifiant attendu « Supabase account » (${CRED.id}), exactement { id, name }`)
    if (n.executeOnce !== true) ko(`${l.nom} : executeOnce attendu (sinon la lecture se multiplie par le nombre d'éléments reçus)`)
    if (p.options?.timeout !== 30000) ko(`${l.nom} : délai de la requête 30 s attendu`)
    const reel = (p.queryParameters?.parameters ?? []).map((q) => [q.name, q.value])
    const voulu = l.params.map(([k, v]) => [k, v])
    if (reel.length !== voulu.length) ko(`${l.nom} : ${reel.length} paramètres, attendu ${voulu.length}`)
    voulu.forEach(([k, v], i) => {
      if (reel[i]?.[0] !== k) ko(`${l.nom} : paramètre ${i + 1} « ${reel[i]?.[0]} », attendu « ${k} »`)
      else if (v !== null && reel[i][1] !== v) ko(`${l.nom} : paramètre « ${k} » = ${String(reel[i][1]).slice(0, 120)}, attendu ${String(v).slice(0, 120)}`)
    })
    if (l.nom === 'Lire doublons') {
      const ou = reel.find(([k]) => k === 'or')?.[1] ?? ''
      if (!ou.includes('contact.ilike.') || !ou.includes(SURE_JUGE.source)) ko("Lire doublons : le filtre « or » doit ne reprendre que des adresses « sûres » (gabarit de l'expression)")
    }
    const decl = /^\s*lecture-pour-envoi\s*:\s*(.+?)\s*$/m.exec(String(n.notes ?? ''))
    if ((decl ? decl[1] : null) !== l.envoi) ko(`${l.nom} : « lecture-pour-envoi » ${decl ? decl[1] : 'absent'}, attendu ${l.envoi ?? 'rien (lecture sans donnée personnelle)'}`)
    const select = reel.find(([k]) => k === 'select')?.[1] ?? ''
    if (l.envoi === null && /nom|e-?mail|contact|adresse|message|contenu|texte/i.test(select)) ko(`${l.nom} : une lecture qui n'est pas « pour envoi » ne lit ni nom, ni adresse, ni message (${select})`)
    if (/message|contenu|texte|\*|photos|ip\b/i.test(select)) ko(`${l.nom} : colonne que n8n ne lit jamais (${select})`)
  }
  // Les deux envois : désactivés, sans identifiant, sans la ligne « envoyé avec n8n », pied « aucun ».
  for (const nom of ['Envoyer l accuse', 'Envoyer l avis']) {
    const n = noeud(wf, nom)
    if (!n) continue
    if (n.disabled !== true) ko(`${nom} : doit être DÉSACTIVÉ (simulation : rien ne part avant le « go » de Benj)`)
    if (n.credentials && Object.keys(n.credentials).length) ko(`${nom} : aucun identifiant ne doit être posé par cette tâche`)
    if (n.parameters?.options?.appendAttribution !== false) ko(`${nom} : la ligne « envoyé automatiquement avec n8n » doit être coupée (marque blanche)`)
    if (n.parameters?.emailFormat !== 'text') ko(`${nom} : texte brut attendu (comme la route)`)
    if (!/^\s*pied\s*:\s*aucun\s*$/m.test(String(n.notes ?? ''))) ko(`${nom} : « pied: aucun » doit être déclaré (texte fixe, ni mention d'IA ni pied)`)
    const attendu = { fromEmail: '={{ $json.de }}', toEmail: '={{ $json.a }}', subject: '={{ $json.sujet }}', text: '={{ $json.texte }}' }
    for (const [k, v] of Object.entries(attendu)) if (n.parameters?.[k] !== v) ko(`${nom} : ${k} = ${n.parameters?.[k]}, attendu ${v}`)
    if (n.parameters?.options?.replyTo !== '={{ $json.repondre_a }}') ko(`${nom} : Reply-To attendu depuis le courrier préparé`)
    if (/presti/i.test(JSON.stringify(n.parameters))) ko(`${nom} : « Presti » écrit dans le nœud d'envoi`)
  }
  for (const nom of ['Garder les accuses', 'Garder les avis']) {
    const c = noeud(wf, nom)?.parameters?.conditions?.conditions?.[0]
    const voulu = nom === 'Garder les accuses' ? 'accuse' : 'avis'
    if (!c || c.leftValue !== '={{ $json.courrier }}' || c.rightValue !== voulu || c.operator?.operation !== 'equals') ko(`${nom} : le filtre doit garder les courriers « ${voulu} »`)
  }
  return erreurs
}

// ─── La copie figée ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
function figee(wf) {
  const erreurs = []
  const ko = (m) => erreurs.push(`FIGEE ${m}`)
  const code = codeDe(wf, 'Courriers a envoyer')
  const email = lireTexte(CHEMINS.email), config = lireTexte(CHEMINS.config)
  const nombre = (re, t) => { const m = re.exec(t); return m ? Number(m[1].replace(/_/g, '')) : null }
  const c = (nom) => nombre(new RegExp(`const ${nom} = (\\d+);`), code)
  const dest = nombre(/cleEmail\('emails:dest', opts\.to\), (\d+), 86_400/, email)
  if (dest === null || c('MAX_PAR_DESTINATAIRE') !== dest) ko(`plafond par destinataire ${c('MAX_PAR_DESTINATAIRE')} ≠ lib/email.ts (${dest})`)
  const jour = nombre(/EMAILS_ANONYMES_PAR_JOUR\) \|\| (\d+)/, email)
  if (jour === null || c('MAX_PAR_JOUR') !== jour) ko(`plafond du jour ${c('MAX_PAR_JOUR')} ≠ lib/email.ts (${jour})`)
  const produit = nombre(/EMAILS_PRODUIT_PAR_JOUR\) \|\| (\d+)/, email)
  if (produit === null || jour === null || c('MAX_AVIS_PAR_JOUR') !== produit - jour) ko(`plafond des avis ${c('MAX_AVIS_PAR_JOUR')} ≠ part du produit (${produit}) moins part anonyme (${jour}) de lib/email.ts`)
  const exp = /EMAIL_EXPEDITEUR_ARTISAN\?\.trim\(\) \|\| '([^']+)'/.exec(email)
  const exp2 = /const EXPEDITEUR = '([^']+)';/.exec(code)
  if (!exp || !exp2 || exp[1] !== exp2[1]) ko(`expéditeur ${exp2 ? exp2[1] : '?'} ≠ lib/email.ts (${exp ? exp[1] : '?'})`)
  const ent = /EMAIL_ENTREPRISE = [^\n]*\|\| '([^']+)'/.exec(email)
  const ent2 = /const ENTREPRISE = '([^']+)';/.exec(code)
  if (!ent || !ent2 || ent[1] !== ent2[1]) ko(`adresse de l'entreprise (Reply-To de l'avis) ${ent2 ? ent2[1] : '?'} ≠ lib/email.ts (${ent ? ent[1] : '?'})`)
  // Les motifs du silence : tous ceux de `Blocage` et `humain`, sauf `assistee` (réponse proposée) et `pause` (le compte en pause répond avant).
  const bloc = /export type Blocage = ([^\n]+)/.exec(config)
  const motifs = bloc ? [...bloc[1].matchAll(/'(\w+)'/g)].map((m) => m[1]) : []
  const attendu = [...motifs.filter((m) => m !== 'assistee' && m !== 'pause'), 'humain']
  const silence = /const SILENCE = \[([^\]]*)\]/.exec(code)
  const reel = silence ? [...silence[1].matchAll(/'(\w+)'/g)].map((m) => m[1]) : []
  if (!egal([...reel].sort(), [...attendu].sort())) ko(`motifs du silence ${JSON.stringify(reel)} ≠ ceux de lib/plateformeConfig.ts (${JSON.stringify(attendu)})`)
  if (!egal([...SILENCE_JUGE].sort(), [...attendu].sort())) ko(`le juge et lib/plateformeConfig.ts ne s'accordent plus sur les motifs du silence`)
  const filtre = /motif_reponse.*?in\.\(([^)]*)\)/.exec(JSON.stringify(wf.nodes.find((n) => n.name === 'Lire destinataires')?.parameters?.queryParameters))
  if (!filtre || !egal(filtre[1].split(',').sort(), [...attendu].sort())) ko(`le filtre « motif_reponse=in.(…) » des lectures ne reprend pas les motifs du silence`)
  // L'ancien code envoie ce texte-là, mot pour mot (la comparaison le prouve à l'exécution ; ici, la source).
  const route = lireTexte(CHEMINS.route)
  for (const morceau of ['Merci pour votre demande. ${artisan.nom || \'Nous\'} l\'a bien reçue et revient vers vous très vite.', 'Bien reçu — ${artisan.nom || \'votre demande\'}', 'à vous de répondre.']) {
    if (!route.includes(morceau)) ko(`la route ne contient plus « ${morceau.slice(0, 50)}… » : le texte de n8n est à revoir`)
  }
  if (/assistant|IA\b|intelligence/i.test((/texte: 'Bonjour'[^\n]*\n[^\n]*/.exec(code) ?? [''])[0])) ko("l'accusé ne doit pas porter la mention d'IA (texte fixe : lib/mentionAssistant.ts ne le vise pas)")
  return erreurs
}

// ─── Le délai : chaque demande dans UNE fenêtre ; l'attente de l'accusé ──────────────────────────────────────────────────────────────
function delai(wf) {
  const erreurs = []
  const ko = (m) => erreurs.push(`DELAI ${m}`)
  const code = codeDe(wf, 'Fenetre du passage')
  const base = Date.parse('2026-11-02T22:00:00.000Z')
  const fenetres = []
  const GIGUE = [400, 2300, 120, 7900, 0, 5100, 950, 3300, 6400, 80, 4200, 1700, 7000, 2900] // n8n part à la seconde 0, avec un retard variable
  for (let m = 0; m < 14; m++) { // quatorze passages consécutifs
    const [f] = executer(code, { instant: base + m * 60000 + GIGUE[m] })
    fenetres.push({ ...f, T: base + m * 60000 })
  }
  let min = Infinity, max = -Infinity, somme = 0, n = 0
  for (let s = 5 * 60; s < 12 * 60; s++) { // chaque seconde de sept minutes
    const c = base + s * 1000
    const iso = new Date(c).toISOString()
    const prises = fenetres.filter((f) => iso >= f.debut && iso < f.fin)
    if (prises.length !== 1) { ko(`la demande de ${iso} tombe dans ${prises.length} fenêtre(s) (exactement une attendue : jamais zéro, jamais deux)`); break }
    const attente = (prises[0].T - c) / 1000
    min = Math.min(min, attente); max = Math.max(max, attente); somme += attente; n++
  }
  if (!erreurs.length && !(min >= 30 && max <= 90)) ko(`attente de l'accusé entre ${min} et ${max} s (attendu : 30 à 90 s)`)
  return { erreurs, min, max, moyenne: n ? somme / n : null }
}

// ─── L'essai n8n ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function donneesEssai() {
  const A = idArtisan(1), B = idArtisan(2)
  const l = (n) => `1ead0000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`
  const iso = (s) => new Date(Date.parse('2026-11-02T22:24:00.000Z') + s * 1000).toISOString()
  const dest = [
    { id: l(1), artisan_id: A, created_at: iso(0), motif_reponse: 'manuelle', nom_prospect: 'Camille Exemple.', contact: 'camille@exemple.test' },
    { id: l(2), artisan_id: A, created_at: iso(1), motif_reponse: 'manuelle', nom_prospect: 'Exemple. Sans courriel', contact: '0600000000' },
    { id: l(3), artisan_id: B, created_at: iso(2), motif_reponse: 'manuelle', nom_prospect: 'Dominique Exemple.', contact: 'dominique@exemple.test' },
    { id: l(4), artisan_id: A, created_at: iso(3), motif_reponse: 'manuelle', nom_prospect: 'Doublon Exemple.', contact: 'doublon@exemple.test' },
    { id: l(5), artisan_id: A, created_at: iso(4), motif_reponse: 'manuelle', nom_prospect: 'Doublon Exemple.', contact: 'Doublon@Exemple.test' },
    { id: l(6), artisan_id: A, created_at: iso(5), motif_reponse: 'escalade', nom_prospect: 'Stop Exemple.', contact: 'stop@exemple.test' },
    { id: l(7), artisan_id: A, created_at: iso(6), motif_reponse: 'horaire', nom_prospect: 'Nuit Exemple.', contact: 'nuit@exemple.test' },
  ]
  const j = (a) => a.map((json) => ({ json }))
  return { 'Toutes les minutes': [{ json: {} }], 'Fenetre du passage': [{ json: FENETRE_PINNEE }],
    'Lire demandes du jour': j(dest.map(({ id, artisan_id, created_at, motif_reponse }) => ({ id, artisan_id, created_at, motif_reponse }))),
    'Lire destinataires': j(dest),
    'Lire comptes': j([{ id: A, nom: 'Atelier Exemple.', email: 'atelier@exemple.test', notifications: null }, { id: B, nom: 'Maçonnerie Exemple.', email: null, notifications: { nouvelle_demande: true } }]),
    'Lire doublons': j(dest.filter((d) => d.contact.includes('@')).map(({ id, contact, created_at }) => ({ id, contact, created_at }))) }
}
function essai(wf) {
  const erreurs = []
  const ko = (m) => erreurs.push(`ESSAI ${m}`)
  if (!existsSync(path.join(RACINE, CHEMINS.essai)) || !existsSync(path.join(RACINE, CHEMINS.pin))) return ['ESSAI essai-n8n.json ou essai-pin.json absent']
  const pin = JSON.parse(lireTexte(CHEMINS.pin)), n8n = JSON.parse(lireTexte(CHEMINS.essai))
  if (!egal(pin, donneesEssai())) ko("essai-pin.json n'est pas la pin data que le juge régénère (--pin)")
  if (n8n.statut !== 'success') ko(`l'essai n8n n'est pas en succès (${n8n.statut})`)
  const sorties = Object.fromEntries(Object.entries(pin).map(([k, v]) => [k, v.map((i) => i.json)]))
  const rejeu = executer(codeDe(wf, 'Courriers a envoyer'), { instant: INSTANT, sorties })
  if (!egal(rejeu, n8n.courriers)) ko(`le rejeu hors ligne du nœud « Courriers a envoyer » ne rend pas la sortie de n8n (exécution ${n8n.execution}) : le code de l'export n'est pas celui qu'a essayé n8n`)
  const genres = rejeu.map((i) => i.courrier)
  const compte = (g) => genres.filter((x) => x === g).length
  if (compte('accuse') !== 6 || compte('avis') !== 6) ko(`l'essai doit couvrir six accusés et six avis (reçu ${compte('accuse')} et ${compte('avis')})`)
  const [fen] = executer(codeDe(wf, 'Fenetre du passage'), { instant: Date.parse('2026-11-02T22:25:38.984Z') })
  if (!egal(fen, n8n.fenetre_reelle)) ko("la fenêtre calculée par n8n à 22:25:38 (exécution 381) n'est pas celle que le code rejoué donne")
  return erreurs
}

// ─── La garde commune, sur un export ─────────────────────────────────────────────────────────────────────────────────────────────
function garde(wf) {
  const dossier = mkdtempSync(path.join(tmpdir(), 'accuse-garde-'))
  try {
    const f = path.join(dossier, 'presti-accuse-reception.workflow.json')
    writeFileSync(f, JSON.stringify({ workflow: wf }))
    const r = spawnSync(process.execPath, ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/n8n-specs-qa.mjs', f], { cwd: RACINE, encoding: 'utf8', timeout: 120000 })
    const ligne = (r.stdout + r.stderr).split('\n').filter((x) => /^\s*(✗|R\d+ |R\d+:)/.test(x) || x.includes('manquement')).slice(0, 4).join(' | ')
    return r.status === 0 ? [] : [`GARDE n8n-specs-qa rouge sur l'export : ${ligne || (r.stdout + r.stderr).slice(-300)}`]
  } finally { rmSync(dossier, { recursive: true, force: true }) }
}

// ─── Les mutants ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const muter = (f) => (wf) => { const m = copie(wf); f(m); return m }
const surCode = (nom, de, vers) => muter((m) => { const n = noeud(m, nom); if (!n.parameters.jsCode.includes(de)) throw new Error(`mutant mal écrit : « ${de.slice(0, 40)} » absent de ${nom}`); n.parameters.jsCode = n.parameters.jsCode.replace(de, vers) })
const MUTANTS = [
  ['texte de l’accusé changé', surCode('Courriers a envoyer', "l'a bien reçue", 'a bien reçu'), /^COMPARE .*accuse/, false],
  ['expéditeur « Presti » pour l’accusé', surCode('Courriers a envoyer', "de: nettoyer(nomArtisan.trim() || 'Votre artisan') + ' <'", "de: 'Presti' + ' <'"), /^COMPARE .*accuse/, false],
  ['Reply-To de l’accusé retiré', surCode('Courriers a envoyer', 'repondre_a: texte(artisan.email).trim(),', "repondre_a: '',"), /^COMPARE .*accuse/, false],
  ['prénom ignoré', surCode('Courriers a envoyer', "(prenom ? ' ' + prenom : '')", "''"), /^COMPARE .*accuse/, false],
  ['plafond par destinataire à 4', surCode('Courriers a envoyer', 'MAX_PAR_DESTINATAIRE = 3', 'MAX_PAR_DESTINATAIRE = 4'), /^(FIGEE|COMPARE)/, false],
  ['plafond du jour à 40', surCode('Courriers a envoyer', 'MAX_PAR_JOUR = 30', 'MAX_PAR_JOUR = 40'), /^(FIGEE|COMPARE)/, false],
  ['plafond des avis retiré', surCode('Courriers a envoyer', ' && rangJour[lead.id] <= MAX_AVIS_PAR_JOUR', ''), /^COMPARE/, false],
  ['plafond des avis à 80', surCode('Courriers a envoyer', 'MAX_AVIS_PAR_JOUR = 50', 'MAX_AVIS_PAR_JOUR = 80'), /^(FIGEE|COMPARE)/, false],
  ['plafond du jour qui coupe aussi l’avis', surCode('Courriers a envoyer', "  const nomProspect = texte(lead.nom_prospect);", "  if (!(rangJour[lead.id] <= MAX_PAR_JOUR)) { ignore(lead, 'plafond'); continue; }\n  const nomProspect = texte(lead.nom_prospect);"), /^COMPARE .*avis/, false],
  ['adresses comparées sans tenir compte de la casse : retiré', surCode('Courriers a envoyer', 'const k = d.contact.trim().toLowerCase();', 'const k = d.contact.trim();'), /^COMPARE/, false],
  ['motifs du silence élargis à « assistee »', surCode('Courriers a envoyer', "const SILENCE = ['manuelle',", "const SILENCE = ['assistee', 'manuelle',"), /^(FIGEE|COMPARE)/, false],
  ['préférence de notification ignorée', surCode('Courriers a envoyer', 'texte(artisan.email) && actif(artisan.notifications) && sur(artisan.email)', 'texte(artisan.email) && sur(artisan.email)'), /^COMPARE/, false],
  ['adresse atypique acceptée', surCode('Courriers a envoyer', "if (!sur(contact)) ignore(lead, 'adresse du prospect non sûre');\n    else if", 'if (false) {} else if'), /^COMPARE/, false],
  ['adresses .invalid acceptées', surCode('Courriers a envoyer', " && !/\\.invalid$/i.test(texte(v).trim())", ''), /^COMPARE/, false],
  ['sujet de l’avis sensible perdu', surCode('Courriers a envoyer', "'⚠️ Demande sensible — '", "'Nouveau contact — '"), /^COMPARE/, false],
  ['mention d’IA ajoutée à l’accusé', surCode('Courriers a envoyer', 'très vite.\\n\\nÀ très bientôt.', 'très vite.\\n\\nMessage rédigé et envoyé automatiquement par l’assistant.\\n\\nÀ très bientôt.'), /^(COMPARE|FIGEE)/, false],
  ['avis d’un message sans coordonnées envoyé', surCode('Courriers a envoyer', "if (!contact) { ignore(lead, 'sans coordonnées (différé)'); continue; }", ''), /^COMPARE/, false],
  ['fenêtre sans décalage', surCode('Fenetre du passage', 'DECALAGE_MS = 30000', 'DECALAGE_MS = 0'), /^DELAI/, false],
  ['fenêtre non alignée sur la minute', surCode('Fenetre du passage', 'const passage = Math.floor(maintenant / PASSAGE_MS) * PASSAGE_MS;', 'const passage = maintenant;'), /^DELAI/, false],
  ['fenêtre de deux minutes (recouvrement)', surCode('Fenetre du passage', 'const debut = fin - PASSAGE_MS;', 'const debut = fin - 2 * PASSAGE_MS;'), /^DELAI/, false],
  ['envoi de l’accuse activé', muter((m) => { delete noeud(m, 'Envoyer l accuse').disabled }), /^STRUCT .*DÉSACTIVÉ/, false],
  ['identifiant SMTP posé sur l’avis', muter((m) => { noeud(m, 'Envoyer l avis').credentials = { smtp: { id: 'IdentifiantFictif01', name: 'SMTP essai' } } }), /^STRUCT .*identifiant/, false],
  ['ligne « envoyé avec n8n » rétablie', muter((m) => { noeud(m, 'Envoyer l accuse').parameters.options.appendAttribution = true }), /^STRUCT .*envoyé automatiquement/, false],
  ['colonne « message » lue', muter((m) => { noeud(m, 'Lire destinataires').parameters.queryParameters.parameters[0].value += ',message' }), /^(STRUCT|GARDE)/, true],
  ['lecture devenue POST', muter((m) => { noeud(m, 'Lire comptes').parameters.method = 'POST' }), /^(STRUCT|GARDE)/, true],
  ['lecture sans déclaration « lecture-pour-envoi »', muter((m) => { delete noeud(m, 'Lire destinataires').notes }), /^(STRUCT|GARDE)/, true],
  ['pied non déclaré sur l’avis', muter((m) => { delete noeud(m, 'Envoyer l avis').notes }), /^(STRUCT|GARDE)/, true],
  ['workflow actif', muter((m) => { m.active = true }), /^(STRUCT|GARDE)/, true],
  ['workflow d’erreur retiré', muter((m) => { delete m.settings.errorWorkflow }), /^(STRUCT|GARDE)/, true],
  ['avis en série derrière l’accusé', muter((m) => { m.connections['Courriers a envoyer'].main[0] = m.connections['Courriers a envoyer'].main[0].filter((l) => l.node !== 'Garder les avis'); m.connections['Envoyer l accuse'] = { main: [[{ node: 'Garder les avis', type: 'main', index: 0 }]] } }), /^STRUCT .*parall/i, false],
  ['exécutions réussies gardées', muter((m) => { m.settings.saveDataSuccessExecution = 'all' }), /^STRUCT .*exécutions réussies/, false],
  ['déclencheur à 8 h seulement', muter((m) => { noeud(m, 'Toutes les minutes').parameters.rule.interval[0].expression = '0 0 8 * * *' }), /^STRUCT .*déclencheur/, false],
]

// ─── Lancement ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
if (process.argv.includes('--pin')) { console.log(JSON.stringify(donneesEssai())); process.exit(0) }

const mondes = await jouerLaRoute()
const wf = chargerExport()
const bilan = []
const cherche = (titre, erreurs) => { bilan.push([titre, erreurs]) }
const cmp = comparer(wf, mondes)
const del = delai(wf)
cherche('structure', structure(wf))
cherche('copie figée', figee(wf))
cherche('comparaison à la route', cmp.erreurs)
cherche('essai n8n', essai(wf))
cherche('délai', del.erreurs)
cherche('garde commune (n8n-specs-qa)', garde(wf))
let rouge = 0
for (const [titre, erreurs] of bilan) {
  if (erreurs.length) { rouge += erreurs.length; console.log(`✗ ${titre} : ${erreurs.length} écart(s)`); for (const e of erreurs.slice(0, 12)) console.log('   ' + e) } else console.log(`✓ ${titre}`)
}
console.log(`  comparé : ${mondes.reduce((n, m) => n + m.posts.length, 0)} demandes en ${mondes.length} cas ; ${cmp.nAvis} avis et ${cmp.nAccuses} accusés identiques à ceux de la route (aux écarts écrits près : ${ECARTS.join(', ')})`)
console.log(`  délai : l'accusé attend de ${del.min} à ${del.max} s (moyenne ${del.moyenne === null ? '?' : del.moyenne.toFixed(1)} s) avant l'envoi ; chaque seconde de sept minutes tombe dans une seule fenêtre`)

// Les mutants : chacun doit rougir pour sa raison.
let survivants = 0
for (const [nom, mutation, attendu, avecGarde] of MUTANTS) {
  let m
  try { m = mutation(wf) } catch (e) { console.log(`✗ mutant « ${nom} » : ${e.message}`); survivants++; continue }
  let erreurs = []
  try {
    erreurs = [...structure(m), ...figee(m), ...comparer(m, mondes).erreurs, ...essai(m), ...delai(m).erreurs, ...(avecGarde ? garde(m) : [])]
  } catch (e) { erreurs = [`COMPARE plantage : ${e.message}`] }
  const ok = erreurs.some((e) => attendu.test(e))
  if (!ok) { survivants++; console.log(`✗ mutant « ${nom} » SURVIT${erreurs.length ? ` (rouge pour une autre raison : ${erreurs[0].slice(0, 100)})` : ' (le juge reste vert)'}`) }
}
console.log(`  mutants : ${MUTANTS.length - survivants}/${MUTANTS.length} font rougir le juge`)
if (rouge || survivants) { console.log('✗ accuse-reception-n8n-qa : ROUGE'); process.exit(1) }
console.log('✓ accuse-reception-n8n-qa : OK')
