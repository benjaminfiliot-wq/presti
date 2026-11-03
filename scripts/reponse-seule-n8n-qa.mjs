// Juge HORS LIGNE du workflow n8n `presti-reponse-seule` (chantier 4, lot L18 ; tâche 032-042) — pas 1 à 3 de la règle de remplacement
// (.claude/rules/migration-production.md) : le workflow refait-il la DÉCISION et la PRÉPARATION de la réponse qui part seule
// (app/api/leads/route.ts:283-320 pour la décision, :383-392 pour l'alerte d'escalade, :473-509 pour la réponse, la mention d'IA et l'avis) ?
//
// Il relit l'export (.orchestre/preuves/032-042/presti-reponse-seule.workflow.json, tiré du n8n d'Oracle), le brief
// (plans/011-cadrage-01-11/briefs/c4-n8n-reponse-seule.md), l'essai n8n (essai-n8n.json, essai-pin.json) et :
//   1. STRUCTURE : inactif, sans version publiée ; fuseau Europe/Paris ; une exécution par minute ; chaîne exacte ; chaque lecture HTTP en GET,
//      sans corps, au gabarit exact (adresse, select=, filtres) ; ce qui est lu au moment d'envoyer le DÉCLARE (`lecture-pour-envoi`) ;
//      le nœud du modèle est ÉPINGLÉ (un nœud Code sans réseau, sans module : aucun appel) ; les deux nœuds d'envoi DÉSACTIVÉS, sans identifiant,
//      sans la ligne « envoyé avec n8n » ; la réponse au prospect déclare le pied « mention » et le porte, l'avis déclare « aucun » ;
//      branche d'erreur désignée ; garde commune scripts/n8n-specs-qa.mjs verte sur l'export ;
//   2. COPIE FIGÉE : les listes de mots d'escalade et les expressions égales à celles de lib/pilote/regles.ts, les offres qui ont la réponse
//      seule égales à celles de lib/plans.ts (`peut`), les réglages par défaut égaux à CONFIG_DEFAUT, les plafonds de lib/email.ts ;
//   3. CORPUS : le nœud « Decider » rejoue la VRAIE `decisionReponse` (lib/plateformeConfig.ts) sur des centaines de couples
//      (message, réglages, offre) : même décision, même mot ;
//   4. COMPARAISON, cas par cas : la VRAIE route app/api/leads/route.ts est jouée sur des demandes fictives (doublures : base, modèle, limites,
//      push ; la vraie lib/email.ts, avec un fetch qui note ce que Resend recevrait ; l'horloge figée) ; la décision observée (part seul, attend
//      l'artisan, escalade, refus) et les courriers de ce lot (réponse au prospect, avis « Nouveau lead », alerte « Demande sensible ») sont
//      comparés à ceux des nœuds Code de l'export, au caractère près, aux ÉCARTS ÉCRITS près (brief, « Comparaison ») ;
//   5. ESSAI : la pin data de l'essai n8n, rejouée hors ligne, rend exactement la sortie de n8n ;
//   6. DÉLAI : chaque demande tombe dans UNE fenêtre ; l'attente est de 30 à 90 secondes ;
//   7. MUTANTS : chacun doit faire rougir le juge pour sa raison (Studio qui part seul, escalade ignorée, mention ôtée, « Presti » dans le
//      message, envoi hors simulation, etc.).
//
// Aucun réseau, aucune base, aucun modèle, aucun envoi, aucune écriture (hors /tmp pour la garde commune). Lancement :
//   node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/reponse-seule-n8n-qa.mjs
//   … scripts/reponse-seule-n8n-qa.mjs --pin   (imprime la pin data de l'essai, sans rien juger)
import { readFileSync, existsSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { register } from 'node:module'
import { tmpdir } from 'node:os'
import { pathToFileURL, fileURLToPath } from 'node:url'
import vm from 'node:vm'
import path from 'node:path'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CHEMINS = {
  export: '.orchestre/preuves/032-042/presti-reponse-seule.workflow.json',
  essai: '.orchestre/preuves/032-042/essai-n8n.json',
  pin: '.orchestre/preuves/032-042/essai-pin.json',
  brief: 'plans/011-cadrage-01-11/briefs/c4-n8n-reponse-seule.md',
  email: 'lib/email.ts',
  config: 'lib/plateformeConfig.ts',
  regles: 'lib/pilote/regles.ts',
  route: 'app/api/leads/route.ts',
}
const lireTexte = (c) => readFileSync(path.join(RACINE, c), 'utf8')
const copie = (o) => JSON.parse(JSON.stringify(o))
const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// ─── Ce que le workflow doit être (le brief le recopie) ───────────────────────────────────────────────────────────────────────
const HOTE = 'https://gorcdvmueakcncsmrouo.supabase.co/rest/v1/'
const F = (champ) => `$('Fenetre du passage').first().json.${champ}`
const FENETRE = (a, b) => `={{ '(created_at.gte.' + ${F(a)} + ',created_at.lt.' + ${F(b)} + ')' }}`
const ORDRE = ['order', 'created_at.asc,id.asc']
const LIMITE = ['limit', '1000']
const NUL = '00000000-0000-0000-0000-000000000000'
const DANS_ARTISANS = `={{ 'in.(' + ([...new Set($('Lire demandes').all().map(i => i.json.artisan_id).filter(Boolean))].join(',') || '${NUL}') + ')' }}`
const LECTURES = [
  { nom: 'Lire demandes du jour', table: 'leads', params: [['select', 'id,artisan_id,created_at'], ['and', FENETRE('depuis_jour', 'fin')], ORDRE, LIMITE], envoi: null },
  { nom: 'Lire demandes', table: 'leads', params: [['select', 'id,artisan_id,created_at,nom_prospect,contact,message'], ['and', FENETRE('debut', 'fin')], ORDRE, LIMITE], envoi: 'Envoyer la reponse' },
  { nom: 'Lire comptes', table: 'artisans', params: [['select', 'id,nom,email,plan,leads_pause,notifications'], ['id', DANS_ARTISANS], ['order', 'id'], LIMITE], envoi: 'Envoyer l avis' },
  { nom: 'Lire reglages', table: 'plateforme_config', params: [['select', 'artisan_id,mode_reponse,auto_24_7,auto_debut,auto_fin,escalade_mots,limite_messages'], ['artisan_id', DANS_ARTISANS], ['order', 'artisan_id'], LIMITE], envoi: 'Envoyer la reponse' },
  { nom: 'Lire rafale', table: 'leads', params: [['select', 'id,artisan_id,created_at'], ['and', FENETRE('depuis_rafale', 'fin')], ['artisan_id', DANS_ARTISANS], ORDRE, LIMITE], envoi: null },
  { nom: 'Lire doublons', table: 'leads', params: [['select', 'id,contact,created_at'], ['and', FENETRE('depuis_doublons', 'fin')], ['or', null], ORDRE, LIMITE], envoi: 'Envoyer la reponse' },
]
const CHAINE = ['Toutes les minutes', 'Fenetre du passage', ...LECTURES.map((l) => l.nom), 'Decider', 'Modele epingle', 'Courriers a envoyer']
const BRANCHES = [['Garder les reponses', 'Envoyer la reponse'], ['Garder les avis', 'Envoyer l avis']]
const TYPES = {
  'Toutes les minutes': 'n8n-nodes-base.scheduleTrigger', 'Fenetre du passage': 'n8n-nodes-base.code', Decider: 'n8n-nodes-base.code', 'Modele epingle': 'n8n-nodes-base.code',
  'Courriers a envoyer': 'n8n-nodes-base.code', 'Garder les reponses': 'n8n-nodes-base.filter', 'Garder les avis': 'n8n-nodes-base.filter',
  'Envoyer la reponse': 'n8n-nodes-base.emailSend', 'Envoyer l avis': 'n8n-nodes-base.emailSend',
  ...Object.fromEntries(LECTURES.map((l) => [l.nom, 'n8n-nodes-base.httpRequest'])),
}
const CRED = { id: 'dTewDK98MLrNckNG', name: 'Supabase account' }
const ERREUR_COMMUNE = 'AQeHiC58UgbMR4Kr' // presti-erreurs (032-033) : alerte courte, aucune donnée
const SURE_JUGE = /^[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/
const MODULE_OU_RESEAU = /\brequire\s*\(|\bimport\s*\(|^\s*import\s|\bhelpers\s*\.\s*(?:httpRequest|request)|\bfetch\s*\(|\bprocess\s*\.|\$env\b|\bXMLHttpRequest\b|\bWebSocket\b|\$http\b|\bfetch\b/m
const MENTION = 'Message rédigé et envoyé automatiquement par l’assistant'

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
// Un champ de nœud d'envoi (« ={{ $json.sujet }} », ou un texte avec des morceaux {{ $json.x }}) appliqué à un courrier préparé.
const gabarit = (modele, item) => String(modele ?? '').replace(/^=/, '').replace(/\{\{\s*\$json\.(\w+)\s*\}\}/g, (_, k) => String(item[k] ?? ''))
const courrierEnvoye = (wf, nomEnvoi, item) => {
  const p = noeud(wf, nomEnvoi).parameters
  return { from: gabarit(p.fromEmail, item), to: gabarit(p.toEmail, item), subject: gabarit(p.subject, item), text: gabarit(p.text, item), reply_to: gabarit(p.options?.replyTo, item) }
}

// ─── Les données fictives ──────────────────────────────────────────────────────────────────────────────────────────────────────
const INSTANT = Date.parse('2026-11-02T22:25:20.300Z') // un passage de n8n (le nœud tourne à la minute pile, un peu après)
const T0 = Date.parse('2026-11-02T22:23:40.000Z') // la fenêtre de ce passage : [22:23:30, 22:24:30)
const FENETRE_PINNEE = { jour: '2026-11-02', debut: '2026-11-02T22:23:30.000Z', fin: '2026-11-02T22:24:30.000Z', depuis_jour: '2026-11-01T23:00:00.000Z', depuis_doublons: '2026-11-01T22:24:30.000Z', depuis_rafale: '2026-11-02T22:13:30.000Z', passage: '2026-11-02T22:25:00.000Z', simulation: true }
const idArtisan = (n) => `aaaaaaaa-0000-4000-8000-${String(n).padStart(12, '0')}`
const artisan = (n, extra = {}) => ({ id: idArtisan(n), slug: `artisan-${n}`, suppression_demandee_le: null, nom: 'Atelier Exemple.', metier: 'plombier', ton_style: null, email: `atelier${n}@exemple.test`,
  is_founder: false, leads_pause: false, services: null, zone_intervention: null, bio: null, tva_regime: null, assurance_nom: null, plan: 'signature', notifications: null, ...extra })
const heureT0 = () => parseInt(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }).format(new Date(T0)), 10)
const AUTO = { mode_reponse: 'auto', auto_24_7: true }
const FERME = () => ({ mode_reponse: 'auto', auto_24_7: false, auto_debut: (heureT0() + 2) % 24, auto_fin: (heureT0() + 3) % 24 }) // plage fermée à l'heure de la demande : la nuit
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
const post = (slug, contact, nom, message, extra = {}) => { const { corps, ...reste } = extra; return { corps: { slug, contact, nom_prospect: nom, message, ...(corps ?? {}) }, ...reste } }
const MSG = 'Bonjour, je voudrais un devis pour refaire ma salle de bain.'
const SIG = (n = 1, extra = {}) => artisan(n, { plan: 'signature', ...extra })
const cfgDe = (comptes, c) => Object.fromEntries(comptes.map((a, i) => [i + 1, c]))

// Chaque cas : les comptes, les réglages, les demandes. Pour chaque demande : la décision attendue de la ROUTE (`decision`, `motif`, `mot`), puis les
// courriers de CE lot que la route envoie (`ancien` : 'reponse', 'avis', 'alerte') et, s'ils diffèrent, ceux de n8n (`n8n`, écart écrit).
const CAS = [
  { nom: 'Signature, mode auto, prospect avec e-mail, artisan avec adresse : la réponse part seule', artisans: [SIG()], config: { 1: AUTO },
    posts: [{ ...post('artisan-1', 'camille@exemple.test', 'Camille Exemple.', MSG), decision: 'part_seul', motif: 'auto', ancien: ['reponse', 'avis'] }] },
  { nom: 'Signature, auto, prospect avec un téléphone : pas d’e-mail au prospect, l’artisan est prévenu de le rappeler', artisans: [SIG()], config: { 1: AUTO },
    posts: [{ ...post('artisan-1', '0612345678', 'Exemple. Sans courriel', MSG), decision: 'part_seul', motif: 'auto', ancien: ['avis'] }] },
  { nom: 'Signature, auto, artisan sans adresse e-mail : la réponse part sans Reply-To, pas d’avis', artisans: [SIG(1, { email: null })], config: { 1: AUTO },
    posts: [{ ...post('artisan-1', 'camille@exemple.test', 'Camille Exemple.', MSG), decision: 'part_seul', motif: 'auto', ancien: ['reponse'] }] },
  { nom: 'Studio en mode auto : verrou d’offre, la réponse est proposée, rien ne part seul', artisans: [artisan(1, { plan: 'studio' })], config: { 1: AUTO },
    posts: [{ ...post('artisan-1', 'studio@exemple.test', 'Studio Exemple.', MSG), decision: 'attend_artisan', motif: 'verrou_offre', ancien: [] }] },
  { nom: 'Studio, mode assisté par défaut (aucun réglage) : la réponse est proposée', artisans: [artisan(1, { plan: 'studio' })], config: {},
    posts: [{ ...post('artisan-1', 'assistee@exemple.test', 'Assistee Exemple.', MSG), decision: 'attend_artisan', motif: 'assistee', ancien: [] }] },
  { nom: 'Signature en mode assisté : la réponse est proposée, rien ne part seul', artisans: [SIG()], config: { 1: { mode_reponse: 'assistee' } },
    posts: [{ ...post('artisan-1', 'sigass@exemple.test', 'Sig Exemple.', MSG), decision: 'attend_artisan', motif: 'assistee', ancien: [] }] },
  { nom: 'Signature en mode manuel : refus, aucune réponse', artisans: [SIG()], config: { 1: { mode_reponse: 'manuelle' } },
    posts: [{ ...post('artisan-1', 'man@exemple.test', 'Man Exemple.', MSG), decision: 'refus', motif: 'manuelle', ancien: [] }] },
  { nom: 'STOP : mot d’escalade de l’artisan (« stop ») → tout s’arrête, l’artisan est alerté avec le mot', artisans: [SIG()], config: { 1: { ...AUTO, escalade_mots: ['stop'] } },
    posts: [{ ...post('artisan-1', 'stop@exemple.test', 'Stop Exemple.', 'STOP'), decision: 'escalade', motif: 'escalade', mot: 'stop', ancien: ['alerte'] }] },
  { nom: 'mot d’escalade par défaut (« fuite »), Signature en auto', artisans: [SIG()], config: { 1: AUTO },
    posts: [{ ...post('artisan-1', 'fuite@exemple.test', 'Fuite Exemple.', 'Une fuite sous mon évier, vite !'), decision: 'escalade', motif: 'escalade', mot: 'fuite', ancien: ['alerte'] }] },
  { nom: 'sujet d’escalade du plancher (« avocat »), absent des mots de l’artisan : une réponse seule ne l’aborde jamais', artisans: [SIG()], config: { 1: AUTO },
    posts: [{ ...post('artisan-1', 'avocat@exemple.test', 'Avocat Exemple.', 'Mon avocat vous écrira demain.'), decision: 'escalade', motif: 'escalade', mot: 'avocat', ancien: ['alerte'] }] },
  { nom: 'le même sujet en mode assisté : le brouillon que l’artisan relit reste possible', artisans: [SIG()], config: { 1: { mode_reponse: 'assistee' } },
    posts: [{ ...post('artisan-1', 'avocat2@exemple.test', 'Avocat Exemple.', 'Mon avocat vous écrira demain.'), decision: 'attend_artisan', motif: 'assistee', ancien: [] }] },
  { nom: 'mot d’escalade en mode manuel : le mode manuel passe avant', artisans: [SIG()], config: { 1: { mode_reponse: 'manuelle' } },
    posts: [{ ...post('artisan-1', 'manfuite@exemple.test', 'Fuite Exemple.', 'Une fuite sous mon évier'), decision: 'refus', motif: 'manuelle', ancien: [] }] },
  { nom: 'nuit : Signature en mode auto, plage horaire fermée', artisans: [SIG()], config: { 1: FERME() },
    posts: [{ ...post('artisan-1', 'nuit@exemple.test', 'Nuit Exemple.', MSG), decision: 'refus', motif: 'horaire', ancien: [] }] },
  { nom: 'limite de messages à zéro', artisans: [SIG()], config: { 1: { ...AUTO, limite_messages: 0 } },
    posts: [{ ...post('artisan-1', 'lim@exemple.test', 'Lim Exemple.', MSG), decision: 'refus', motif: 'limite', ancien: [] }] },
  { nom: 'compte en pause de ses demandes', artisans: [SIG(1, { leads_pause: true })], config: { 1: AUTO },
    posts: [{ ...post('artisan-1', 'pause@exemple.test', 'Pause Exemple.', MSG), decision: 'refus', motif: 'pause', ancien: [] }] },
  { nom: 'rafale : dix demandes de suite → les huit premières partent seules, les deux dernières sont étranglées', artisans: [SIG()], config: { 1: AUTO },
    posts: Array.from({ length: 10 }, (_, i) => ({ ...post('artisan-1', `rafale${i}@exemple.test`, `Rafale ${i} Exemple.`, MSG), ...(i < 8 ? { decision: 'part_seul', motif: 'auto', ancien: ['reponse', 'avis'] } : { decision: 'refus', motif: 'throttle', ancien: [] }) })) },
  { nom: 'doublon : la même adresse quatre fois (casse variée) → le quatrième e-mail est refusé par le plafond, l’avis le dit', artisans: [SIG()], config: { 1: AUTO },
    posts: ['Dup@Exemple.test', 'dup@exemple.test', 'dup@exemple.test', 'DUP@exemple.test'].map((c, i) => ({ ...post('artisan-1', c, 'Doublon Exemple.', MSG), decision: 'part_seul', motif: 'auto', ancien: i < 3 ? ['reponse', 'avis'] : ['avis'] })) },
  { nom: 'plafonds du jour : 60 demandes sur 10 comptes, adresses toutes différentes (30 réponses, 50 avis, puis rien)', artisans: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => SIG(n)), config: Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => [n, AUTO])),
    posts: Array.from({ length: 60 }, (_, i) => ({ ...post(`artisan-${(i % 10) + 1}`, `jour${i}@exemple.test`, `Jour ${i} Exemple.`, MSG), decision: 'part_seul', motif: 'auto', ancien: i < 30 ? ['reponse', 'avis'] : i < 50 ? ['avis'] : [] })) },
  { nom: 'adresses de test en .invalid : la route ne les vise pas, l’avis dit « envoyée »', artisans: [SIG(), SIG(2, { email: 'atelier2@exemple.invalid' })], config: { 1: AUTO, 2: AUTO },
    posts: [{ ...post('artisan-1', 'client@exemple.invalid', 'Invalide Exemple.', MSG), decision: 'part_seul', motif: 'auto', ancien: ['avis'] },
      { ...post('artisan-2', 'client2@exemple.test', 'Invalide Exemple.', MSG), decision: 'part_seul', motif: 'auto', ancien: ['reponse'] }] },
  { nom: 'notification « nouvelle demande » coupée par l’artisan : la réponse part, pas d’avis', artisans: [SIG(1, { notifications: { nouvelle_demande: false } })], config: { 1: AUTO },
    posts: [{ ...post('artisan-1', 'camille@exemple.test', 'Camille Exemple.', MSG), decision: 'part_seul', motif: 'auto', ancien: ['reponse'] }] },
  { nom: 'premier message sans coordonnées (variante B) : la réponse est préparée pour la page, pas d’e-mail', artisans: [SIG()], config: { 1: AUTO },
    posts: [{ ...post('artisan-1', null, null, 'Bonjour, une question.', { corps: { deferContact: true } }), decision: 'part_seul', motif: 'auto', ancien: [] }] },
  { nom: 'adresse atypique (guillemet) : la route envoie, n8n refuse et l’avis le dit', artisans: [SIG()], config: { 1: AUTO },
    posts: [{ ...post('artisan-1', 'a"b@exemple.test', 'Atypique Exemple.', MSG), decision: 'part_seul', motif: 'auto', ancien: ['reponse', 'avis'], n8n: ['avis'], ecart: 'E3' }] },
  { nom: 'photos jointes : l’avis de la route les compte, n8n ne lit pas les photos', artisans: [SIG()], config: { 1: AUTO },
    posts: [{ ...post('artisan-1', 'photo@exemple.test', 'Photo Exemple.', MSG, { corps: { photos: [PNG] } }), decision: 'part_seul', motif: 'auto', ancien: ['reponse', 'avis'], ecart: 'E1' }] },
  { nom: 'crédits épuisés (auto) : la route ne prépare rien, n8n ne sait pas', artisans: [SIG()], config: { 1: AUTO }, sansCredit: true,
    posts: [{ ...post('artisan-1', 'credit@exemple.test', 'Credit Exemple.', MSG), decision: 'credits', motif: 'credits', ancien: [], n8nDecision: ['part_seul', 'auto'], n8n: ['reponse', 'avis'], ecart: 'E2' }] },
  { nom: 'noms : artisan sans nom, artisan à nom chargé, prospect sans nom, prénom composé, message sur deux lignes', artisans: [SIG(1, { nom: '' }), SIG(2, { nom: 'Dupont & Fils "Pro" <bat>' }), SIG(3)],
    config: { 1: AUTO, 2: AUTO, 3: AUTO },
    posts: [{ ...post('artisan-1', 'n1@exemple.test', 'Jean-Pierre Martin', MSG), decision: 'part_seul', motif: 'auto', ancien: ['reponse', 'avis'] },
      { ...post('artisan-2', 'n2@exemple.test', null, MSG), decision: 'part_seul', motif: 'auto', ancien: ['reponse', 'avis'] },
      { ...post('artisan-3', 'n3@exemple.test', '  Zoé   Exemple.  ', 'Première ligne\nDeuxième ligne : je veux un devis.'), decision: 'part_seul', motif: 'auto', ancien: ['reponse', 'avis'] }] },
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
      const ligne = { ...s.values, id: `1ead0000-0000-4000-8000-${String(n).padStart(12, '0')}`, token: `jeton-${n}`, created_at: new Date(E.horloge).toISOString(), k: E.k }
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
  const stockage = { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: 'https://exemple.test/photo.png' } }) }) }
  return { from: q, rpc: async () => ({ data: true, error: null }), storage: stockage }
}
let VRAIE_DATE = Date
function figerHorloge() {
  const R = VRAIE_DATE
  globalThis.Date = class extends R {
    constructor(...a) { if (a.length === 0) super(globalThis.__QA?.etat?.horloge ?? R.now()); else super(...a) }
    static now() { return globalThis.__QA?.etat?.horloge ?? R.now() }
  }
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
  figerHorloge()
  try {
    for (const cas of CAS) {
      globalThis.__QA.etat = { artisans: cas.artisans, config: Object.fromEntries(Object.entries(cas.config).map(([n, c]) => [idArtisan(Number(n)), c])), leads: [], resend: [], push: [], decisions: {}, etrangle: {},
        compteurs: {}, ip: 'ip', k: -1, sansCredit: !!cas.sansCredit, horloge: T0 }
      const E = globalThis.__QA.etat
      const posts = []
      for (const [k, p] of cas.posts.entries()) {
        E.k = k; E.ip = `ip-${k}`; E.horloge = T0 + k * 500
        const nAvant = E.leads.length
        const rep = await POST(new Request('http://localhost/api/leads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(p.corps) }))
        const json = await rep.json()
        const lead = E.leads.length > nAvant ? E.leads[E.leads.length - 1] : null
        const d = E.decisions[k] ?? null
        // La décision que la route a prise, ramenée au vocabulaire du workflow — déduite de ce qu'elle a fait, jamais écrite à la main.
        let obs = null
        if (lead) {
          if (json.paused) obs = { decision: 'refus', motif: 'pause' }
          else if (E.etrangle[k]) obs = { decision: 'refus', motif: 'throttle' }
          else if (d?.ok) obs = json.raison === 'credits' ? { decision: 'credits', motif: 'credits' } : { decision: 'part_seul', motif: 'auto' }
          else if (d && (d.raison === 'assistee' || d.raison === 'verrou_offre')) obs = { decision: 'attend_artisan', motif: d.raison }
          else if (d && d.raison === 'escalade') obs = { decision: 'escalade', motif: 'escalade', mot: d.mot }
          else if (d) obs = { decision: 'refus', motif: d.raison }
        }
        posts.push({ p, k, lead, obs, rep: json, statut: rep.status, resend: E.resend.filter((r) => r.k === k), push: E.push.filter((x) => x.k === k) })
      }
      sorties.push({ cas, posts, leads: E.leads, artisans: cas.artisans, config: E.config })
    }
  } finally { globalThis.Date = VRAIE_DATE; globalThis.fetch = vraiFetch }
  return sorties
}

// ─── Ce que les requêtes du workflow rendraient sur ces demandes ─────────────────────────────────────────────────────────────────────
const COLONNES_REGLAGES = ['mode_reponse', 'auto_24_7', 'auto_debut', 'auto_fin', 'escalade_mots', 'limite_messages']
function lecturesN8n(leads, artisans, config, fen) {
  const dans = (c, a, b) => c >= a && c < b
  const tri = (a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : a.id < b.id ? -1 : 1)
  const demandes = leads.filter((l) => dans(l.created_at, fen.debut, fen.fin)).sort(tri)
  const ids = [...new Set(demandes.map((l) => l.artisan_id))]
  const adresses = new Set(demandes.map((l) => String(l.contact || '').trim().toLowerCase()).filter((c) => SURE_JUGE.test(c)))
  return {
    'Lire demandes du jour': leads.filter((l) => dans(l.created_at, fen.depuis_jour, fen.fin)).sort(tri).map(({ id, artisan_id, created_at }) => ({ id, artisan_id, created_at })),
    'Lire demandes': demandes.map(({ id, artisan_id, created_at, nom_prospect, contact, message }) => ({ id, artisan_id, created_at, nom_prospect, contact, message })),
    'Lire comptes': artisans.filter((a) => ids.includes(a.id)).map(({ id, nom, email, plan, leads_pause, notifications }) => ({ id, nom, email, plan, leads_pause, notifications })),
    'Lire reglages': ids.filter((id) => config[id]).map((id) => ({ artisan_id: id, ...Object.fromEntries(COLONNES_REGLAGES.filter((k) => k in config[id]).map((k) => [k, config[id][k]])) })),
    'Lire rafale': leads.filter((l) => dans(l.created_at, fen.depuis_rafale, fen.fin) && ids.includes(l.artisan_id)).sort(tri).map(({ id, artisan_id, created_at }) => ({ id, artisan_id, created_at })),
    'Lire doublons': leads.filter((l) => dans(l.created_at, fen.depuis_doublons, fen.fin) && adresses.has(String(l.contact || '').trim().toLowerCase())).sort(tri).map(({ id, contact, created_at }) => ({ id, contact, created_at })),
  }
}
function passageN8n(wf, leads, artisans, config, instant = INSTANT) {
  const [fen] = executer(codeDe(wf, 'Fenetre du passage'), { instant })
  const lectures = lecturesN8n(leads, artisans, config, fen)
  const base = { 'Fenetre du passage': [fen], ...lectures }
  const decisions = executer(codeDe(wf, 'Decider'), { instant, sorties: base })
  const modele = executer(codeDe(wf, 'Modele epingle'), { instant, sorties: { ...base, Decider: decisions }, entree: decisions })
  const sortie = executer(codeDe(wf, 'Courriers a envoyer'), { instant, sorties: { ...base, Decider: decisions, 'Modele epingle': modele } })
  return { fen, lectures, decisions, modele, sortie }
}

// ─── La comparaison ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const ECARTS = ['E1', 'E2', 'E3', 'E4'] // E1 photos non lues ; E2 crédits épuisés ignorés ; E3 adresse atypique ; E4 notification poussée non refaite
const genreRoute = (r) => {
  if (r.from.startsWith('Presti <')) return r.subject.startsWith('⚠️ Demande sensible') ? 'alerte' : r.subject.startsWith('Nouveau lead —') ? 'avis' : null
  return r.subject.startsWith('Votre demande —') ? 'reponse' : null
}
const versPayloadRoute = (r) => ({ from: r.from, to: r.to[0], subject: r.subject, text: r.text, reply_to: r.reply_to ?? '' })
function comparer(wf, mondes) {
  const erreurs = []
  const ko = (m) => erreurs.push(`COMPARE ${m}`)
  const vus = new Set()
  let nReponses = 0, nAvis = 0, nDecisions = 0
  for (const monde of mondes) {
    const { cas, posts, leads, artisans, config } = monde
    let sortie
    try { ({ sortie } = passageN8n(wf, leads, artisans, config)) } catch (e) { ko(`${cas.nom} : le code du workflow plante (${e.message})`); continue }
    for (const x of posts) {
      const quoi = `${cas.nom} [demande ${x.k + 1}]`
      if (!x.lead) { ko(`${quoi} : la route n'a pas enregistré la demande (statut ${x.statut})`); continue }
      const attenduRoute = { decision: x.p.decision, motif: x.p.motif, ...(x.p.mot ? { mot: x.p.mot } : {}) }
      if (!egal(x.obs, attenduRoute)) { ko(`${quoi} : décision observée de la route ${JSON.stringify(x.obs)}, attendue ${JSON.stringify(attenduRoute)} (la décision de la route a changé ?)`); continue }
      // La décision de n8n.
      const dn = sortie.find((i) => i.courrier === 'decision' && i.lead_id === x.lead.id)
      if (!dn) { ko(`${quoi} : n8n ne rend aucune décision`); continue }
      nDecisions++
      const [decN, motN] = x.p.n8nDecision ?? [x.p.decision, x.p.motif]
      const vraiN = { decision: dn.decision, motif: dn.motif, ...(x.p.mot ? { mot: dn.mot } : {}) }
      const attenduN = { decision: decN, motif: motN, ...(x.p.mot ? { mot: x.p.mot } : {}) }
      if (!egal(vraiN, attenduN)) { ko(`${quoi} : décision de n8n ${JSON.stringify(vraiN)}, attendue ${JSON.stringify(attenduN)} (route : ${JSON.stringify(attenduRoute)})`); continue }
      // Les courriers de ce lot : ceux de la route, puis ceux de n8n.
      const vieux = x.resend.map((r) => ({ genre: genreRoute(r), ...versPayloadRoute(r) })).filter((v) => v.genre)
      const genresVieux = vieux.map((v) => v.genre)
      if (!egal(genresVieux, x.p.ancien)) { ko(`${quoi} : la route a envoyé ${JSON.stringify(genresVieux)} dans ce lot, attendu ${JSON.stringify(x.p.ancien)}`); continue }
      const mails = sortie.filter((i) => i.lead_id === x.lead.id && (i.courrier === 'reponse' || i.courrier === 'avis'))
      const neufs = mails.map((m) => ({ genre: m.courrier === 'avis' ? (m.sujet.startsWith('⚠️') ? 'alerte' : 'avis') : 'reponse', ...courrierEnvoye(wf, m.courrier === 'reponse' ? 'Envoyer la reponse' : 'Envoyer l avis', m) }))
      const attendu = x.p.n8n ?? x.p.ancien
      if (!egal(neufs.map((m) => m.genre), attendu)) { ko(`${quoi} : n8n prépare ${JSON.stringify(neufs.map((m) => m.genre))}, attendu ${JSON.stringify(attendu)}`); continue }
      if (x.p.ecart) vus.add(x.p.ecart)
      for (const n of neufs) {
        n.genre === 'reponse' ? nReponses++ : nAvis++
        const v = vieux.find((y) => y.genre === n.genre)
        if (!v) continue
        const { genre: _a, ...vv } = v
        const { genre: _b, ...nn } = n
        if (x.p.ecart === 'E1' && n.genre === 'avis') { // E1 : « Photos jointes : N » n'est pas dans l'avis de n8n
          const sans = vv.text.replace(/\nPhotos jointes : \d+/, '')
          if (sans !== vv.text) vv.text = sans
          else ko(`${quoi} : la route ne compte pas les photos dans l'avis : l'écart E1 n'est pas observé`)
        }
        if (x.p.ecart === 'E3' && n.genre === 'avis') { // E3 : l'adresse atypique n'est pas jointe à l'avis (Reply-To de Presti) et la réponse n'est pas partie
          vv.reply_to = 'contact@prestiapp.fr'
          vv.text = vv.text.replace('Réponse automatique envoyée au prospect par email', 'Réponse automatique préparée, mais l’email au prospect N’EST PAS PARTI — recontactez-le vous-même')
        }
        if (!egal(vv, nn)) ko(`${quoi} : le courrier « ${n.genre} » diffère de celui de la route\n      route : ${JSON.stringify(vv)}\n      n8n   : ${JSON.stringify(nn)}`)
      }
      if (x.push.length && x.p.decision === 'part_seul') vus.add('E4') // la route prévenait aussi par notification poussée ; n8n n'en fait pas
    }
    const cles = sortie.filter((i) => i.cle).map((i) => i.cle)
    if (new Set(cles).size !== cles.length) ko(`${cas.nom} : une clé de courrier en double (${cles.length} clés)`)
    for (const i of sortie) if (i.courrier === 'decision' && !posts.some((x) => x.lead && x.lead.id === i.lead_id)) ko(`${cas.nom} : une décision pour une demande inconnue`)
  }
  for (const e of ECARTS) if (!vus.has(e)) ko(`l'écart ${e} n'a été observé par aucun cas : il est écrit au brief mais le juge ne le prouve pas`)
  if (nReponses < 40 || nAvis < 40 || nDecisions < 80) ko(`comparaison trop maigre : ${nDecisions} décisions, ${nReponses} réponses et ${nAvis} avis comparés (attendu au moins 80, 40 et 40)`)
  return { erreurs, nReponses, nAvis, nDecisions }
}

// ─── Le corpus : le nœud « Decider » contre la VRAIE decisionReponse ─────────────────────────────────────────────────────────────
const MESSAGES = [
  MSG, 'Bonjour', 'Une fuite sous mon évier, vite !', 'Il y a une urgence chez moi', 'Pas d’urgence, quand vous pouvez passer.', 'J’ai une inondation dans la cave',
  'Ça sent le gaz près de la chaudière', 'Ma chaudière gaz ne chauffe plus, pas urgent', 'Mon avocat vous écrira demain.', 'Je vais porter plainte contre votre entreprise',
  'Alors, vous me répondez ?', 'Mon chauffe-eau perd de l’eau depuis hier', 'Le robinet perd beaucoup d’eau', 'Je cherche un devis pour une douche italienne',
  'STOP', 'Stop, ne me contactez plus', 'Une attestation d’assurance décennale est-elle fournie ?', 'Le brûleur de ma chaudière est bruyant',
  'Le gazon est trop haut', 'Ça sent une odeur étrange', 'Mon voisin a eu un accident de chantier', 'Je vous trouve malhonnête, c’est une arnaque',
  'Pouvez-vous passer au plus vite ?', 'Un devis pour 3 fenêtres', 'Je souhaite un rendez-vous mardi', 'Il y a de l’humidité dans le mur',
  'Mon plafond goutte', 'sinistre dégât des eaux chez moi', 'Merci de me rappeler pour la plomberie', 'Besoin d’une fuite réparée rapidement',
  'Je veux annuler et être remboursé', 'Un électricien pour un court-circuit', 'La police est venue hier', 'Un juge a statué', 'Un vol a eu lieu',
  'Salut, c’est urgent !!', 'Le disjoncteur saute tout le temps', 'Ma salle de bain est sous l’eau', '', '   ', 'Bonjour,\nJe voudrais une pose de carrelage\nMerci',
  'Une chute de neige a abîmé le toit, sans dégât', 'une chute dans l’escalier', 'Je ne paierai pas cette facture', 'Je refuse de payer',
]
const CONFIGS = [
  { nom: 'auto', plan: 'signature', cfg: { mode_reponse: 'auto' } },
  { nom: 'auto, mots de l’artisan', plan: 'signature', cfg: { mode_reponse: 'auto', escalade_mots: ['stop', 'plomberie', 'Fuite d’eau'] } },
  { nom: 'auto sans mots', plan: 'signature', cfg: { mode_reponse: 'auto', escalade_mots: [] } },
  { nom: 'auto, Entreprise', plan: 'entreprise', cfg: { mode_reponse: 'auto' } },
  { nom: 'auto, Business', plan: 'business', cfg: { mode_reponse: 'auto' } },
  { nom: 'assistée, Signature', plan: 'signature', cfg: { mode_reponse: 'assistee' } },
  { nom: 'manuelle', plan: 'signature', cfg: { mode_reponse: 'manuelle' } },
  { nom: 'auto, Studio (verrou)', plan: 'studio', cfg: { mode_reponse: 'auto' } },
  { nom: 'auto, Essai (verrou)', plan: 'gratuit', cfg: { mode_reponse: 'auto' } },
  { nom: 'auto, Essentiel hérité (verrou)', plan: 'essentiel', cfg: { mode_reponse: 'auto' } },
  { nom: 'limite à zéro', plan: 'signature', cfg: { mode_reponse: 'auto', limite_messages: 0 } },
  { nom: 'plage fermée', plan: 'signature', cfg: FERME() },
  { nom: 'aucun réglage (défauts)', plan: 'signature', cfg: null },
]
async function corpus(wf) {
  const erreurs = []
  const ko = (m) => erreurs.push(`CORPUS ${m}`)
  const R = await import(FICHIER(CHEMINS.config))
  const code = codeDe(wf, 'Decider')
  const A = idArtisan(1)
  const horloge = T0
  let n = 0
  figerHorloge()
  globalThis.__QA = { ...(globalThis.__QA ?? {}), etat: { horloge } }
  try {
    for (const c of CONFIGS) for (const m of MESSAGES) {
      const cfgVraie = c.cfg ? { ...R.CONFIG_DEFAUT, ...c.cfg } : { ...R.CONFIG_DEFAUT }
      const d = R.decisionReponse({ plan: c.plan, leads_pause: false }, { prise_en_main: false }, cfgVraie, { nbReponsesIA: 0, message: m })
      const attendu = d.ok ? { decision: 'part_seul', motif: 'auto', mot: null }
        : d.raison === 'assistee' || d.raison === 'verrou_offre' ? { decision: 'attend_artisan', motif: d.raison, mot: null }
        : d.raison === 'escalade' ? { decision: 'escalade', motif: 'escalade', mot: d.mot }
        : { decision: 'refus', motif: d.raison, mot: null }
      const lead = { id: '1ead0000-0000-4000-8000-000000000001', artisan_id: A, created_at: new Date(T0).toISOString(), nom_prospect: 'Exemple.', contact: 'exemple@exemple.test', message: m }
      const fen = { debut: '2026-11-02T22:23:30.000Z', fin: '2026-11-02T22:24:30.000Z' }
      const reglages = c.cfg ? [{ artisan_id: A, ...Object.fromEntries(COLONNES_REGLAGES.filter((k) => k in c.cfg).map((k) => [k, c.cfg[k]])) }] : []
      const sorties = { 'Fenetre du passage': [fen], 'Lire comptes': [{ id: A, plan: c.plan, leads_pause: false }], 'Lire reglages': reglages, 'Lire rafale': [{ id: lead.id, artisan_id: A, created_at: lead.created_at }], 'Lire demandes': [lead] }
      let r
      try { [r] = executer(code, { instant: INSTANT, sorties }) } catch (e) { ko(`${c.nom} / « ${m.slice(0, 30)} » : le nœud plante (${e.message})`); continue }
      n++
      const vrai = { decision: r.decision, motif: r.motif, mot: r.mot ?? null }
      if (!egal(vrai, attendu)) ko(`${c.nom} / « ${m.slice(0, 40)} » : n8n ${JSON.stringify(vrai)}, la vraie décision ${JSON.stringify(attendu)}`)
      if (erreurs.length > 12) break
    }
  } finally { globalThis.Date = VRAIE_DATE }
  return { erreurs, n }
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
  if (s.saveDataSuccessExecution !== 'none') ko('les exécutions réussies ne doivent pas être gardées (elles porteraient les adresses et les messages des prospects)')
  if (!Number.isInteger(s.executionTimeout) || s.executionTimeout < 1 || s.executionTimeout > 600) ko(`délai maximal ${s.executionTimeout} : un entier de 1 à 600 s attendu`)
  for (const [nom, type] of Object.entries(TYPES)) { const n = noeud(wf, nom); if (!n) ko(`nœud absent : ${nom}`); else if (n.type !== type) ko(`${nom} : type ${n.type}, attendu ${type}`) }
  for (const n of wf.nodes) if (!(n.name in TYPES) && n.type !== 'n8n-nodes-base.stickyNote') ko(`nœud inattendu : ${n.name} (${n.type})`)
  const declencheur = noeud(wf, 'Toutes les minutes')
  if (declencheur && declencheur.parameters?.rule?.interval?.[0]?.expression !== '0 * * * * *') ko('le déclencheur doit tourner à la seconde 0 de chaque minute (cron « 0 * * * * * »)')
  // Chaîne exacte, avec le départ en parallèle des deux branches d'envoi.
  const lien = (de, vers, sortie = 0) => (wf.connections?.[de]?.main?.[sortie] ?? []).some((l) => l.node === vers)
  for (let i = 0; i < CHAINE.length - 1; i++) if (!lien(CHAINE[i], CHAINE[i + 1])) ko(`connexion absente : ${CHAINE[i]} → ${CHAINE[i + 1]}`)
  for (const [filtre, envoi] of BRANCHES) { if (!lien('Courriers a envoyer', filtre)) ko(`« Courriers a envoyer » doit alimenter « ${filtre} » EN PARALLÈLE`); if (!lien(filtre, envoi)) ko(`${filtre} doit alimenter ${envoi}`) }
  const attendus = new Set([...CHAINE.slice(0, -1).map((n, i) => `${n}>${CHAINE[i + 1]}`), ...BRANCHES.flatMap(([f, e]) => [`Courriers a envoyer>${f}`, `${f}>${e}`])])
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
      if (!ou.includes('contact.ilike.') || !ou.includes(SURE_JUGE.source.replace(/\//g, '/'))) ko("Lire doublons : le filtre « or » doit ne reprendre que des adresses « sûres » (gabarit de l'expression)")
    }
    const decl = /^\s*lecture-pour-envoi\s*:\s*(.+?)\s*$/m.exec(String(n.notes ?? ''))
    if ((decl ? decl[1] : null) !== l.envoi) ko(`${l.nom} : « lecture-pour-envoi » ${decl ? decl[1] : 'absent'}, attendu ${l.envoi ?? 'rien (lecture sans donnée personnelle)'}`)
    const select = reel.find(([k]) => k === 'select')?.[1] ?? ''
    if (l.envoi === null && /nom|e-?mail|contact|adresse|message|contenu|texte/i.test(select)) ko(`${l.nom} : une lecture qui n'est pas « pour envoi » ne lit ni nom, ni adresse, ni message (${select})`)
    if (/contenu|texte|\*|photos|\bip\b|prise_en_main|apparence|persona|formule/i.test(select)) ko(`${l.nom} : colonne que n8n ne lit pas (${select})`)
  }
  // Le modèle : ÉPINGLÉ, c'est-à-dire un nœud Code qui n'appelle rien (le garde commune n'admet aucun nœud de modèle pour la famille c4).
  const modele = noeud(wf, 'Modele epingle')
  if (modele) {
    if (modele.type !== 'n8n-nodes-base.code') ko(`Modele epingle : un nœud Code épinglé attendu, pas ${modele.type} (aucun appel)`)
    if (MODULE_OU_RESEAU.test(String(modele.parameters?.jsCode ?? ''))) ko('Modele epingle : aucun réseau, aucun module, aucun appel de modèle')
    if (modele.credentials && Object.keys(modele.credentials).length) ko('Modele epingle : aucun identifiant')
    if (!/\bEPINGLE\b/.test(String(modele.notes ?? ''))) ko('Modele epingle : doit se déclarer « EPINGLE » dans ses notes')
  }
  for (const n of wf.nodes) if (n.type === 'n8n-nodes-base.code' && MODULE_OU_RESEAU.test(String(n.parameters?.jsCode ?? '').replace(/\/\/[^\n]*/g, ''))) ko(`${n.name} : un nœud Code n'appelle ni réseau ni module`)
  // Les deux envois : désactivés, sans identifiant, sans la ligne « envoyé avec n8n ».
  const PIEDS = { 'Envoyer la reponse': 'mention', 'Envoyer l avis': 'aucun' }
  for (const nom of Object.keys(PIEDS)) {
    const n = noeud(wf, nom)
    if (!n) continue
    if (n.disabled !== true) ko(`${nom} : doit être DÉSACTIVÉ (simulation : rien ne part avant le « go » de Benj)`)
    if (n.credentials && Object.keys(n.credentials).length) ko(`${nom} : aucun identifiant ne doit être posé par cette tâche`)
    if (n.parameters?.options?.appendAttribution !== false) ko(`${nom} : la ligne « envoyé automatiquement avec n8n » doit être coupée (marque blanche)`)
    if (n.parameters?.emailFormat !== 'text') ko(`${nom} : texte brut attendu (comme la route)`)
    const pied = (/^\s*pied\s*:\s*(\S+)\s*$/m.exec(String(n.notes ?? '')) ?? [])[1]
    if (pied !== PIEDS[nom]) ko(`${nom} : pied « ${pied} » déclaré, « ${PIEDS[nom]} » attendu`)
    const attendu = { fromEmail: '={{ $json.de }}', toEmail: '={{ $json.a }}', subject: '={{ $json.sujet }}' }
    for (const [k, v] of Object.entries(attendu)) if (n.parameters?.[k] !== v) ko(`${nom} : ${k} = ${n.parameters?.[k]}, attendu ${v}`)
    if (n.parameters?.options?.replyTo !== '={{ $json.repondre_a }}') ko(`${nom} : Reply-To attendu depuis le courrier préparé`)
    const texte = String(n.parameters?.text ?? '')
    if (nom === 'Envoyer la reponse') {
      if (!texte.includes(MENTION)) ko(`${nom} : la mention d'IA « ${MENTION} » doit figurer dans le texte (le message part sans relecture)`)
      if (!texte.startsWith('={{ $json.corps }}')) ko(`${nom} : le texte doit commencer par la réponse du modèle (corps)`)
      if (/presti/i.test(JSON.stringify(n.parameters))) ko(`${nom} : « Presti » écrit dans un message au nom de l'artisan (marque blanche)`)
    } else if (texte !== '={{ $json.texte }}') ko(`${nom} : texte attendu « ={{ $json.texte }} »`)
  }
  for (const [nom, voulu] of [['Garder les reponses', 'reponse'], ['Garder les avis', 'avis']]) {
    const c = noeud(wf, nom)?.parameters?.conditions?.conditions?.[0]
    if (!c || c.leftValue !== '={{ $json.courrier }}' || c.rightValue !== voulu || c.operator?.operation !== 'equals') ko(`${nom} : le filtre doit garder les courriers « ${voulu} »`)
  }
  return erreurs
}

// ─── La copie figée ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function figee(wf) {
  const erreurs = []
  const ko = (m) => erreurs.push(`FIGEE ${m}`)
  const courriers = codeDe(wf, 'Courriers a envoyer'), decider = codeDe(wf, 'Decider')
  const email = lireTexte(CHEMINS.email), config = lireTexte(CHEMINS.config), regles = lireTexte(CHEMINS.regles), route = lireTexte(CHEMINS.route)
  const nombre = (re, t) => { const m = re.exec(t); return m ? Number(m[1].replace(/_/g, '')) : null }
  const c = (nom) => nombre(new RegExp(`const ${nom} = (\\d+);`), courriers)
  const dest = nombre(/cleEmail\('emails:dest', opts\.to\), (\d+), 86_400/, email)
  if (dest === null || c('MAX_PAR_DESTINATAIRE') !== dest) ko(`plafond par destinataire ${c('MAX_PAR_DESTINATAIRE')} ≠ lib/email.ts (${dest})`)
  const jour = nombre(/EMAILS_ANONYMES_PAR_JOUR\) \|\| (\d+)/, email)
  if (jour === null || c('MAX_PAR_JOUR') !== jour) ko(`plafond du jour ${c('MAX_PAR_JOUR')} ≠ lib/email.ts (${jour})`)
  const produit = nombre(/EMAILS_PRODUIT_PAR_JOUR\) \|\| (\d+)/, email)
  if (produit === null || jour === null || c('MAX_AVIS_PAR_JOUR') !== produit - jour) ko(`plafond des avis ${c('MAX_AVIS_PAR_JOUR')} ≠ part du produit (${produit}) moins part anonyme (${jour}) de lib/email.ts`)
  const exp = /EMAIL_EXPEDITEUR_ARTISAN\?\.trim\(\) \|\| '([^']+)'/.exec(email)
  const exp2 = /const EXPEDITEUR = '([^']+)';/.exec(courriers)
  if (!exp || !exp2 || exp[1] !== exp2[1]) ko(`expéditeur ${exp2 ? exp2[1] : '?'} ≠ lib/email.ts (${exp ? exp[1] : '?'})`)
  const ent = /EMAIL_ENTREPRISE = [^\n]*\|\| '([^']+)'/.exec(email)
  const ent2 = /const ENTREPRISE = '([^']+)';/.exec(courriers)
  if (!ent || !ent2 || ent[1] !== ent2[1]) ko(`adresse de l'entreprise (Reply-To des avis) ${ent2 ? ent2[1] : '?'} ≠ lib/email.ts (${ent ? ent[1] : '?'})`)
  // Le plafond par artisan et sa fenêtre : ceux de la route.
  const maxArtisan = nombre(/const MAX_LEADS_PAR_ARTISAN = (\d+)/, route)
  if (maxArtisan === null || nombre(/const MAX_PAR_ARTISAN = (\d+);/, decider) !== maxArtisan) ko(`plafond par artisan ${nombre(/const MAX_PAR_ARTISAN = (\d+);/, decider)} ≠ app/api/leads/route.ts (${maxArtisan})`)
  if (!/consommerLimite\(`leads:artisan:\$\{artisan\.id\}`, MAX_LEADS_PAR_ARTISAN, 10 \* 60\)/.test(route) || nombre(/const RAFALE_MS = (\d+);/, decider) !== 600000) ko('fenêtre du plafond par artisan ≠ dix minutes de la route')
  // Les listes de mots et les expressions : celles de lib/pilote/regles.ts, au caractère près.
  const R = await import(FICHIER(CHEMINS.regles))
  const liste = (nom) => { const m = new RegExp(`const ${nom} = (\\[.*\\]);`).exec(decider); return m ? JSON.parse(m[1]) : null }
  if (!egal(liste('MOTS_TOUJOURS'), R.MOTS_ESCALADE_TOUJOURS)) ko('MOTS_TOUJOURS ≠ MOTS_ESCALADE_TOUJOURS de lib/pilote/regles.ts')
  if (!egal(liste('MOTS_ENTIERS'), R.MOTS_ESCALADE_ENTIERS)) ko('MOTS_ENTIERS ≠ MOTS_ESCALADE_ENTIERS de lib/pilote/regles.ts')
  for (const nom of ['FAUSSE_URGENCE', 'PERTE_D_EAU', 'APPAREIL_PERD', 'NOMS_NEUTRES']) {
    const a = new RegExp(`^const ${nom} = (/.*/[a-z]*);$`, 'm').exec(decider), b = new RegExp(`^const ${nom} = (/.*/[a-z]*)$`, 'm').exec(regles)
    if (!a || !b || a[1] !== b[1]) ko(`expression ${nom} ≠ lib/pilote/regles.ts`)
  }
  // Les offres qui ont la réponse seule : `peut(plan, 'plateforme.ia.auto')`.
  const P = await import(FICHIER('lib/plans.ts'))
  const auto = Object.keys(P.PLANS).filter((p) => P.peut(p, 'plateforme.ia.auto'))
  const planAuto = (() => { const m = /const PLANS_AUTO = (\[.*\]);/.exec(decider); return m ? JSON.parse(m[1]) : null })()
  if (!egal([...(planAuto ?? [])].sort(), [...auto].sort())) ko(`offres de la réponse seule ${JSON.stringify(planAuto)} ≠ lib/plans.ts (${JSON.stringify(auto)})`)
  if (planAuto?.includes('studio')) ko('Studio prépare, l’artisan valide : « studio » ne peut pas figurer parmi les offres de la réponse seule')
  // Les réglages par défaut : CONFIG_DEFAUT.
  const defaut = /const DEFAUT = (\{[^\n]*\});/.exec(decider)
  let d = null
  try { d = defaut ? new Function(`return ${defaut[1]}`)() : null } catch { d = null }
  const R2 = await import(FICHIER(CHEMINS.config))
  if (!d) ko('réglages par défaut illisibles')
  else for (const k of ['mode_reponse', 'auto_24_7', 'auto_debut', 'auto_fin', 'escalade_mots', 'limite_messages']) if (!egal(d[k], R2.CONFIG_DEFAUT[k])) ko(`réglage par défaut « ${k} » ${JSON.stringify(d[k])} ≠ CONFIG_DEFAUT (${JSON.stringify(R2.CONFIG_DEFAUT[k])})`)
  // La mention d'IA et le texte de la route.
  const M = await import(FICHIER('lib/mentionAssistant.ts'))
  if (M.mentionAssistant('') !== MENTION + '.') ko(`la mention d'IA de lib/mentionAssistant.ts n’est plus « ${MENTION}. »`)
  for (const nom of ['', 'Atelier Exemple.', 'X'.repeat(90), 'Deux\nlignes']) {
    const vrai = M.avecMentionAssistant('Réponse.', nom)
    const [rep] = executer(courriers, { instant: INSTANT, sorties: copieMonde(nom) }).filter((i) => i.courrier === 'reponse')
    if (!rep) { ko(`pas de réponse préparée pour le nom « ${nom.slice(0, 20)} »`); continue }
    if (gabarit(noeud(wf, 'Envoyer la reponse').parameters.text, rep) !== vrai) ko(`la mention d'IA du nœud d'envoi ≠ avecMentionAssistant pour le nom « ${nom.slice(0, 20)} »`)
    if (rep.texte !== vrai) ko(`le texte préparé ≠ avecMentionAssistant pour le nom « ${nom.slice(0, 20)} »`)
  }
  for (const morceau of ['subject: `Votre demande — ${artisan.nom?.trim() || \'Votre artisan\'}`', 'text: avecMentionAssistant(reply, artisan.nom)', 'Nouveau contact via votre lien Presti.', 'subject: `Nouveau lead — ${nom_prospect || contact}`', 'Demande sensible (« ${decision.mot} ») — ${nom_prospect || contact}', 'Réponse automatique envoyée au prospect par email']) {
    if (!route.includes(morceau)) ko(`la route ne contient plus « ${morceau.slice(0, 60)}… » : le texte de n8n est à revoir`)
  }
  return erreurs
}
// Un monde minimal (un artisan Signature, une demande) pour rejouer « Courriers a envoyer » avec un nom d'artisan donné.
function copieMonde(nomArtisan) {
  const A = idArtisan(1)
  const lead = { id: '1ead0000-0000-4000-8000-000000000001', artisan_id: A, created_at: '2026-11-02T22:24:00.000Z', nom_prospect: 'Exemple.', contact: 'exemple@exemple.test', message: MSG }
  return {
    'Lire demandes du jour': [{ id: lead.id, artisan_id: A, created_at: lead.created_at }], 'Lire demandes': [lead], 'Lire doublons': [{ id: lead.id, contact: lead.contact, created_at: lead.created_at }],
    'Lire comptes': [{ id: A, nom: nomArtisan, email: 'atelier@exemple.test', plan: 'signature', leads_pause: false, notifications: null }],
    'Modele epingle': [{ courrier: 'decision', lead_id: lead.id, decision: 'part_seul', motif: 'auto', mot: null, texte_modele: 'Réponse.' }],
  }
}

// ─── Le délai : chaque demande dans UNE fenêtre ; l'attente de la réponse ───────────────────────────────────────────────────────────
function delai(wf) {
  const erreurs = []
  const ko = (m) => erreurs.push(`DELAI ${m}`)
  const code = codeDe(wf, 'Fenetre du passage')
  const base = Date.parse('2026-11-02T22:00:00.000Z')
  const fenetres = []
  const GIGUE = [400, 2300, 120, 7900, 0, 5100, 950, 3300, 6400, 80, 4200, 1700, 7000, 2900]
  for (let m = 0; m < 14; m++) { const [f] = executer(code, { instant: base + m * 60000 + GIGUE[m] }); fenetres.push({ ...f, T: base + m * 60000 }) }
  let min = Infinity, max = -Infinity, somme = 0, n = 0
  for (let s = 5 * 60; s < 12 * 60; s++) {
    const cc = base + s * 1000
    const iso = new Date(cc).toISOString()
    const prises = fenetres.filter((f) => iso >= f.debut && iso < f.fin)
    if (prises.length !== 1) { ko(`la demande de ${iso} tombe dans ${prises.length} fenêtre(s) (exactement une attendue : jamais zéro, jamais deux)`); break }
    const attente = (prises[0].T - cc) / 1000
    min = Math.min(min, attente); max = Math.max(max, attente); somme += attente; n++
  }
  if (!erreurs.length && !(min >= 30 && max <= 90)) ko(`attente de la réponse entre ${min} et ${max} s (attendu : 30 à 90 s)`)
  // Les fenêtres de lecture couvrent la rafale (dix minutes avant la fenêtre), la journée et les vingt-quatre heures des doublons.
  const [f0] = executer(code, { instant: base + 5 * 60000 + 400 })
  if (Date.parse(f0.debut) - Date.parse(f0.depuis_rafale) !== 600000) ko('depuis_rafale doit remonter de dix minutes avant le début de la fenêtre')
  if (Date.parse(f0.fin) - Date.parse(f0.depuis_doublons) !== 86400000) ko('depuis_doublons doit remonter de vingt-quatre heures avant la fin de la fenêtre')
  return { erreurs, min, max, moyenne: n ? somme / n : null }
}

// ─── L'essai n8n ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function donneesEssai() {
  const A = idArtisan(1), B = idArtisan(2), C = idArtisan(3)
  const l = (n) => `1ead0000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`
  const iso = (s) => new Date(Date.parse('2026-11-02T22:24:00.000Z') + s * 1000).toISOString()
  const demandes = [
    { id: l(1), artisan_id: A, created_at: iso(0), nom_prospect: 'Camille Exemple.', contact: 'camille@exemple.test', message: MSG }, // part seul
    { id: l(2), artisan_id: A, created_at: iso(1), nom_prospect: 'Exemple. Sans courriel', contact: '0600000000', message: MSG }, // part seul, téléphone
    { id: l(3), artisan_id: B, created_at: iso(2), nom_prospect: 'Dominique Exemple.', contact: 'dominique@exemple.test', message: MSG }, // Studio en auto : verrou d'offre
    { id: l(4), artisan_id: A, created_at: iso(3), nom_prospect: 'Fuite Exemple.', contact: 'fuite@exemple.test', message: 'Une fuite sous mon évier, vite !' }, // escalade
    { id: l(5), artisan_id: A, created_at: iso(4), nom_prospect: 'Avocat Exemple.', contact: 'avocat@exemple.test', message: 'Mon avocat vous écrira demain.' }, // escalade du plancher
    { id: l(6), artisan_id: C, created_at: iso(5), nom_prospect: 'Man Exemple.', contact: 'man@exemple.test', message: MSG }, // manuelle
    { id: l(7), artisan_id: A, created_at: iso(6), nom_prospect: 'Doublon Exemple.', contact: 'doublon@exemple.test', message: MSG },
    { id: l(8), artisan_id: A, created_at: iso(7), nom_prospect: 'Doublon Exemple.', contact: 'Doublon@Exemple.test', message: MSG },
    { id: l(9), artisan_id: A, created_at: iso(8), nom_prospect: 'Doublon Exemple.', contact: 'doublon@exemple.test', message: MSG },
    { id: l(10), artisan_id: A, created_at: iso(9), nom_prospect: 'Doublon Exemple.', contact: 'DOUBLON@exemple.test', message: MSG }, // le quatrième e-mail est refusé
  ]
  const j = (a) => a.map((json) => ({ json }))
  const reglages = [{ artisan_id: A, mode_reponse: 'auto', auto_24_7: true, auto_debut: null, auto_fin: null, escalade_mots: ['urgence', 'fuite', 'degat des eaux', 'inondation', 'gaz', 'assurance'], limite_messages: 8 },
    { artisan_id: B, mode_reponse: 'auto', auto_24_7: true, auto_debut: null, auto_fin: null, escalade_mots: ['urgence', 'fuite'], limite_messages: 8 },
    { artisan_id: C, mode_reponse: 'manuelle', auto_24_7: true, auto_debut: null, auto_fin: null, escalade_mots: ['urgence', 'fuite'], limite_messages: 8 }]
  return { 'Toutes les minutes': [{ json: {} }], 'Fenetre du passage': [{ json: FENETRE_PINNEE }],
    'Lire demandes du jour': j(demandes.map(({ id, artisan_id, created_at }) => ({ id, artisan_id, created_at }))),
    'Lire demandes': j(demandes),
    'Lire comptes': j([{ id: A, nom: 'Atelier Exemple.', email: 'atelier@exemple.test', plan: 'signature', leads_pause: false, notifications: null },
      { id: B, nom: 'Maçonnerie Exemple.', email: null, plan: 'studio', leads_pause: false, notifications: { nouvelle_demande: true } },
      { id: C, nom: 'Peinture Exemple.', email: 'peinture@exemple.test', plan: 'signature', leads_pause: false, notifications: null }]),
    'Lire reglages': j(reglages),
    'Lire rafale': j(demandes.map(({ id, artisan_id, created_at }) => ({ id, artisan_id, created_at }))),
    'Lire doublons': j(demandes.filter((d) => d.contact.includes('@')).map(({ id, contact, created_at }) => ({ id, contact, created_at }))) }
}
function essai(wf) {
  const erreurs = []
  const ko = (m) => erreurs.push(`ESSAI ${m}`)
  if (!existsSync(path.join(RACINE, CHEMINS.essai)) || !existsSync(path.join(RACINE, CHEMINS.pin))) return ['ESSAI essai-n8n.json ou essai-pin.json absent']
  const pin = JSON.parse(lireTexte(CHEMINS.pin)), n8n = JSON.parse(lireTexte(CHEMINS.essai))
  if (!egal(pin, donneesEssai())) ko("essai-pin.json n'est pas la pin data que le juge régénère (--pin)")
  if (n8n.statut !== 'success') ko(`l'essai n8n n'est pas en succès (${n8n.statut})`)
  const sorties = Object.fromEntries(Object.entries(pin).map(([k, v]) => [k, v.map((i) => i.json)]))
  const decisions = executer(codeDe(wf, 'Decider'), { instant: INSTANT, sorties })
  if (!egal(decisions, n8n.decisions)) ko(`le rejeu hors ligne du nœud « Decider » ne rend pas la sortie de n8n (exécution ${n8n.execution}) : le code de l'export n'est pas celui qu'a essayé n8n`)
  const modele = executer(codeDe(wf, 'Modele epingle'), { instant: INSTANT, sorties: { ...sorties, Decider: decisions }, entree: decisions })
  if (!egal(modele, n8n.modele)) ko("le rejeu hors ligne du nœud « Modele epingle » ne rend pas la sortie de n8n : le modèle épinglé n'est pas celui qu'a essayé n8n")
  const rejeu = executer(codeDe(wf, 'Courriers a envoyer'), { instant: INSTANT, sorties: { ...sorties, Decider: decisions, 'Modele epingle': modele } })
  if (!egal(rejeu, n8n.courriers)) ko(`le rejeu hors ligne du nœud « Courriers a envoyer » ne rend pas la sortie de n8n (exécution ${n8n.execution}) : le code de l'export n'est pas celui qu'a essayé n8n`)
  const genres = rejeu.map((i) => (i.courrier === 'decision' ? i.decision : i.courrier))
  const compte = (g) => genres.filter((x) => x === g).length
  if (compte('part_seul') < 5 || compte('attend_artisan') !== 1 || compte('escalade') !== 2 || compte('refus') !== 1) ko(`l'essai doit couvrir la réponse seule, le mode assisté, l'escalade et le refus (reçu ${JSON.stringify(Object.fromEntries(['part_seul', 'attend_artisan', 'escalade', 'refus'].map((g) => [g, compte(g)])))})`)
  if (compte('reponse') !== 4 || compte('avis') !== 8) ko(`l'essai doit couvrir quatre réponses (une, puis quatre demandes à la même adresse dont trois seulement partent) et huit avis (six « Nouveau lead », deux alertes) (reçu ${compte('reponse')} réponses, ${compte('avis')} avis)`)
  const [fen] = executer(codeDe(wf, 'Fenetre du passage'), { instant: Date.parse(n8n.fenetre_reelle_instant ?? '2026-11-02T22:25:38.984Z') })
  if (!egal(fen, n8n.fenetre_reelle)) ko("la fenêtre calculée par n8n sur l'horloge réelle n'est pas celle que le code rejoué donne")
  return erreurs
}

// ─── La garde commune, sur un export ─────────────────────────────────────────────────────────────────────────────────────────────
function garde(wf) {
  const dossier = mkdtempSync(path.join(tmpdir(), 'reponse-seule-garde-'))
  try {
    const f = path.join(dossier, 'presti-reponse-seule.workflow.json')
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
  // La décision.
  ['Studio qui part seul (verrou d’offre retiré)', surCode('Decider', "const verrou = cfg.mode_reponse === 'auto' && !PLANS_AUTO.includes(artisan.plan);", 'const verrou = false;'), /^(COMPARE|CORPUS)/, false],
  ['Studio parmi les offres de la réponse seule', surCode('Decider', 'const PLANS_AUTO = ["signature",', 'const PLANS_AUTO = ["studio","signature",'), /^(FIGEE|COMPARE|CORPUS)/, false],
  ['mot d’escalade de l’artisan ignoré', surCode('Decider', "  if (mot) { rendre(lead, 'escalade', 'escalade', { mot }); continue; }\n", ''), /^(COMPARE|CORPUS)/, false],
  ['sujets d’escalade du plancher ignorés', surCode('Decider', "  if (sujet) { rendre(lead, 'escalade', 'escalade', { mot: sujet }); continue; }\n", ''), /^(COMPARE|CORPUS)/, false],
  ['escalade contrôlée avant le mode manuel', surCode('Decider', "  if (mode === 'manuelle') { rendre(lead, 'refus', 'manuelle'); continue; }\n  const mot = motEscalade(cfg, message);\n  if (mot) { rendre(lead, 'escalade', 'escalade', { mot }); continue; }", "  const mot = motEscalade(cfg, message);\n  if (mot) { rendre(lead, 'escalade', 'escalade', { mot }); continue; }\n  if (mode === 'manuelle') { rendre(lead, 'refus', 'manuelle'); continue; }"), /^(COMPARE|CORPUS)/, false],
  ['mode assisté qui part seul', surCode('Decider', "  if (mode === 'assistee') { rendre(lead, 'attend_artisan', verrou ? 'verrou_offre' : 'assistee'); continue; }\n", ''), /^(COMPARE|CORPUS)/, false],
  ['mode manuel qui part seul', surCode('Decider', "  if (mode === 'manuelle') { rendre(lead, 'refus', 'manuelle'); continue; }\n", ''), /^(COMPARE|CORPUS)/, false],
  ['plage horaire ignorée', surCode('Decider', "  if (!dansLaPlage(cfg, new Date(lead.created_at))) { rendre(lead, 'refus', 'horaire'); continue; }\n", ''), /^(COMPARE|CORPUS)/, false],
  ['limite de messages ignorée', surCode('Decider', "  if (0 >= (cfg.limite_messages == null ? 8 : cfg.limite_messages)) { rendre(lead, 'refus', 'limite'); continue; }\n", ''), /^(COMPARE|CORPUS)/, false],
  ['pause de l’artisan ignorée', surCode('Decider', "  if (artisan.leads_pause === true) { rendre(lead, 'refus', 'pause'); continue; }\n", ''), /^COMPARE/, false],
  ['plafond par artisan à 9', surCode('Decider', 'const MAX_PAR_ARTISAN = 8;', 'const MAX_PAR_ARTISAN = 9;'), /^(FIGEE|COMPARE)/, false],
  ['plafond par artisan retiré', surCode('Decider', "  if (rang > MAX_PAR_ARTISAN) { rendre(lead, 'refus', 'throttle'); continue; }\n", ''), /^COMPARE/, false],
  ['liste de mots d’escalade amputée', surCode('Decider', '"avocat",', ''), /^(FIGEE|COMPARE|CORPUS)/, false],
  ['expression « fausse urgence » retirée', surCode('Decider', ".replace(FAUSSE_URGENCE, ' ')", ''), /^(CORPUS|COMPARE)/, false],
  ['réglages par défaut en mode auto', surCode('Decider', "const DEFAUT = { mode_reponse: 'assistee',", "const DEFAUT = { mode_reponse: 'auto',"), /^(FIGEE|CORPUS)/, false],
  // La préparation.
  ['mention d’IA ôtée du texte préparé', surCode('Courriers a envoyer', "'\\n\\n—\\nMessage rédigé et envoyé automatiquement par l’assistant' + (nom ? ' de ' + nom : '') + '.'", "''"), /^(COMPARE|FIGEE)/, false],
  ['mention d’IA ôtée du nœud d’envoi', muter((m) => { noeud(m, 'Envoyer la reponse').parameters.text = '={{ $json.corps }}' }), /^(STRUCT|COMPARE|FIGEE)/, true],
  ['« Presti » dans le message au prospect', muter((m) => { noeud(m, 'Envoyer la reponse').parameters.text += '\nPresti' }), /^(STRUCT|COMPARE)/, true],
  ['expéditeur « Presti » pour la réponse', surCode('Courriers a envoyer', "de: nettoyer(nomArtisan.trim() || 'Votre artisan') + ' <'", "de: 'Presti' + ' <'"), /^COMPARE/, false],
  ['Reply-To de la réponse retiré', surCode('Courriers a envoyer', 'repondre_a: texte(artisan.email).trim(),', "repondre_a: '',"), /^COMPARE/, false],
  ['sujet de la réponse changé', surCode('Courriers a envoyer', "'Votre demande — '", "'Réponse — '"), /^COMPARE/, false],
  ['envoi hors simulation : « Envoyer la reponse » activé', muter((m) => { delete noeud(m, 'Envoyer la reponse').disabled }), /^STRUCT .*DÉSACTIVÉ/, false],
  ['envoi hors simulation : « Envoyer l avis » activé', muter((m) => { delete noeud(m, 'Envoyer l avis').disabled }), /^STRUCT .*DÉSACTIVÉ/, false],
  ['identifiant SMTP posé sur la réponse', muter((m) => { noeud(m, 'Envoyer la reponse').credentials = { smtp: { id: 'IdentifiantFictif01', name: 'SMTP essai' } } }), /^STRUCT .*identifiant/, false],
  ['ligne « envoyé avec n8n » rétablie', muter((m) => { noeud(m, 'Envoyer la reponse').parameters.options.appendAttribution = true }), /^STRUCT .*envoyé automatiquement/, false],
  ['pied de la réponse déclaré « aucun »', muter((m) => { noeud(m, 'Envoyer la reponse').notes = noeud(m, 'Envoyer la reponse').notes.replace('pied: mention', 'pied: aucun') }), /^STRUCT .*pied/, true],
  ['plafond par destinataire à 4', surCode('Courriers a envoyer', 'MAX_PAR_DESTINATAIRE = 3', 'MAX_PAR_DESTINATAIRE = 4'), /^(FIGEE|COMPARE)/, false],
  ['plafond du jour à 40', surCode('Courriers a envoyer', 'MAX_PAR_JOUR = 30', 'MAX_PAR_JOUR = 40'), /^(FIGEE|COMPARE)/, false],
  ['plafond des avis retiré', surCode('Courriers a envoyer', ' && rangJour[lead.id] <= MAX_AVIS_PAR_JOUR', ''), /^COMPARE/, false],
  ['adresses comparées sans tenir compte de la casse : retiré', surCode('Courriers a envoyer', 'const k = d.contact.trim().toLowerCase();', 'const k = d.contact.trim();'), /^COMPARE/, false],
  ['adresse atypique acceptée (contrôle de l’adresse et rang du destinataire levés)', (wf) => surCode('Courriers a envoyer', '!(rang >= 1 && rang <= MAX_PAR_DESTINATAIRE)', '!(rang <= MAX_PAR_DESTINATAIRE)')(surCode('Courriers a envoyer', "else if (!ADRESSE_SURE.test(contact)) decision.envoi = 'adresse_atypique';", '')(wf)), /^COMPARE/, false],
  ['adresses .invalid acceptées', surCode('Courriers a envoyer', " && !/\\.invalid$/i.test(texte(v).trim())", ''), /^COMPARE/, false],
  ['préférence de notification ignorée', surCode('Courriers a envoyer', 'contact && actif(artisan.notifications) && sur(artisan.email)', 'contact && sur(artisan.email)'), /^COMPARE/, false],
  ['alerte d’escalade sans le mot', surCode('Courriers a envoyer', "'⚠️ Demande sensible (« ' + d.mot + ' ») — '", "'⚠️ Demande sensible — '"), /^COMPARE/, false],
  ['escalade sans alerte à l’artisan', surCode('Courriers a envoyer', "if (d.decision === 'escalade') {", "if (d.decision === 'escalade' && false) {"), /^COMPARE/, false],
  ['avis qui dit « envoyée » quand l’e-mail n’est pas parti', surCode('Courriers a envoyer', ": partie ? 'Réponse automatique envoyée au prospect par email' :", ": true ? 'Réponse automatique envoyée au prospect par email' :"), /^COMPARE/, false],
  ['avis sans la réponse', surCode('Courriers a envoyer', " + ' :\\n---\\n' + reponse", " + ' :\\n---\\n'"), /^COMPARE/, false],
  ['modèle épinglé qui répond autre chose', surCode('Modele epingle', "'Réponse exemple.'", "'Autre réponse.'"), /^COMPARE/, false],
  ['modèle épinglé qui appelle le réseau', muter((m) => { noeud(m, 'Modele epingle').parameters.jsCode = "const r = await fetch('https://api.anthropic.com/v1/messages');\n" + noeud(m, 'Modele epingle').parameters.jsCode }), /^STRUCT/, false],
  ['modèle remplacé par un nœud de requête POST', muter((m) => { const n = noeud(m, 'Modele epingle'); n.type = 'n8n-nodes-base.httpRequest'; n.parameters = { method: 'POST', url: 'https://api.anthropic.com/v1/messages' } }), /^STRUCT/, false],
  ['modèle non déclaré « EPINGLE »', muter((m) => { delete noeud(m, 'Modele epingle').notes }), /^STRUCT .*EPINGLE/, false],
  // La structure et le calendrier.
  ['colonne « photos » lue', muter((m) => { noeud(m, 'Lire demandes').parameters.queryParameters.parameters[0].value += ',photos' }), /^(STRUCT|GARDE)/, true],
  ['lecture devenue POST', muter((m) => { noeud(m, 'Lire comptes').parameters.method = 'POST' }), /^(STRUCT|GARDE)/, true],
  ['lecture sans déclaration « lecture-pour-envoi »', muter((m) => { delete noeud(m, 'Lire demandes').notes }), /^(STRUCT|GARDE)/, true],
  ['workflow actif', muter((m) => { m.active = true }), /^(STRUCT|GARDE)/, true],
  ['workflow d’erreur retiré', muter((m) => { delete m.settings.errorWorkflow }), /^(STRUCT|GARDE)/, true],
  ['exécutions réussies gardées', muter((m) => { m.settings.saveDataSuccessExecution = 'all' }), /^STRUCT .*exécutions réussies/, false],
  ['déclencheur à 8 h seulement', muter((m) => { noeud(m, 'Toutes les minutes').parameters.rule.interval[0].expression = '0 0 8 * * *' }), /^STRUCT .*déclencheur/, false],
  ['fenêtre sans décalage', surCode('Fenetre du passage', 'DECALAGE_MS = 30000', 'DECALAGE_MS = 0'), /^DELAI/, false],
  ['fenêtre non alignée sur la minute', surCode('Fenetre du passage', 'const passage = Math.floor(maintenant / PASSAGE_MS) * PASSAGE_MS;', 'const passage = maintenant;'), /^DELAI/, false],
  ['fenêtre de deux minutes (recouvrement)', surCode('Fenetre du passage', 'const debut = fin - PASSAGE_MS;', 'const debut = fin - 2 * PASSAGE_MS;'), /^DELAI/, false],
  ['fenêtre de la rafale raccourcie', surCode('Fenetre du passage', 'const RAFALE_MS = 600000;', 'const RAFALE_MS = 60000;'), /^DELAI/, false],
]

// ─── Lancement ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
if (process.argv.includes('--pin')) { console.log(JSON.stringify(donneesEssai())); process.exit(0) }

const mondes = await jouerLaRoute()
const wf = chargerExport()
const bilan = []
const cherche = (titre, erreurs) => { bilan.push([titre, erreurs]) }
const cmp = comparer(wf, mondes)
const cor = await corpus(wf)
const del = delai(wf)
cherche('structure', structure(wf))
cherche('copie figée', await figee(wf))
cherche('corpus (Decider contre la vraie décision)', cor.erreurs)
cherche('comparaison à la route', cmp.erreurs)
cherche('essai n8n', essai(wf))
cherche('délai', del.erreurs)
cherche('garde commune (n8n-specs-qa)', garde(wf))
let rouge = 0
for (const [titre, erreurs] of bilan) {
  if (erreurs.length) { rouge += erreurs.length; console.log(`✗ ${titre} : ${erreurs.length} écart(s)`); for (const e of erreurs.slice(0, 12)) console.log('   ' + e) } else console.log(`✓ ${titre}`)
}
console.log(`  corpus : ${cor.n} couples (message × réglages × offre) : même décision et même mot d'escalade que la vraie decisionReponse`)
console.log(`  comparé : ${cmp.nDecisions} décisions en ${mondes.length} cas ; ${cmp.nReponses} réponses et ${cmp.nAvis} avis identiques à ceux de la route (aux écarts écrits près : ${ECARTS.join(', ')})`)
console.log(`  délai : la réponse attend de ${del.min} à ${del.max} s (moyenne ${del.moyenne === null ? '?' : del.moyenne.toFixed(1)} s) avant l'envoi ; chaque seconde de sept minutes tombe dans une seule fenêtre`)

// Les mutants : chacun doit rougir pour sa raison.
let survivants = 0
for (const [nom, mutation, attendu, avecGarde] of MUTANTS) {
  let m
  try { m = mutation(wf) } catch (e) { console.log(`✗ mutant « ${nom} » : ${e.message}`); survivants++; continue }
  // Chaque contrôle a son propre filet : un mutant qui fait planter l'un ne doit pas cacher le rouge des autres.
  const sur = async (f) => { try { return await f() } catch (e) { return [`COMPARE plantage : ${e.message}`] } }
  const erreurs = [...await sur(() => structure(m)), ...await sur(() => figee(m)), ...await sur(async () => (await corpus(m)).erreurs), ...await sur(() => comparer(m, mondes).erreurs),
    ...await sur(() => essai(m)), ...await sur(() => delai(m).erreurs), ...(avecGarde ? await sur(() => garde(m)) : [])]
  const ok = erreurs.some((e) => attendu.test(e))
  if (!ok) { survivants++; console.log(`✗ mutant « ${nom} » SURVIT${erreurs.length ? ` (rouge pour une autre raison : ${erreurs[0].slice(0, 100)})` : ' (le juge reste vert)'}`) }
}
console.log(`  mutants : ${MUTANTS.length - survivants}/${MUTANTS.length} font rougir le juge`)
if (rouge || survivants) { console.log('✗ reponse-seule-n8n-qa : ROUGE'); process.exit(1) }
console.log('✓ reponse-seule-n8n-qa : OK')
