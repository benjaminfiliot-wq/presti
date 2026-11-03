// Juge hors ligne de 036-038 — le palier « réel » de Studio et Signature, sans jamais un double envoi ni un envoi sans accord.
// Aucune requête, aucun envoi, aucune écriture : il lit le code de l'app, EXÉCUTE les codes des nœuds n8n (source unique
// lib/agents/n8n/envoi-reel.mjs, avec un faux `$`) sur des données fictives, compare les exports n8n rapatriés à la source, et relit
// la preuve de l'essai vers delivered@resend.dev. Chaque mutant (les neuf de la tâche, et quelques autres) DOIT être vu.
//   node scripts/reel-qa.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { stripTypeScriptTypes } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const lire = (f) => { try { return fs.readFileSync(path.join(racine, f), 'utf8').replace(/\r\n/g, '\n') } catch { return '' } }
const R = await import(pathToFileURL(path.join(racine, 'lib/agents/n8n/envoi-reel.mjs')).href)
const PREUVES = '.orchestre/preuves/036-038/'
const json = (f) => { try { const x = JSON.parse(lire(f)); return x.workflow ?? x } catch { return null } }

const resultats = []
const verifier = (nom, fn) => { let ok = false, detail = ''; try { const r = fn(); ok = r === true; if (!ok) detail = typeof r === 'string' ? r : 'faux' } catch (e) { detail = e.message } resultats.push({ nom, ok, detail }); return ok }

// ── Le faux `$` de n8n : nœud → sorties (tableau d'objets json, ou { s0, s1 } pour deux sorties).
function executer(code, noeuds, entree = []) {
  const $ = (nom) => { const n = noeuds[nom]; const s0 = n === undefined ? [] : Array.isArray(n) ? n : n.s0 || []; const s1 = n && !Array.isArray(n) ? n.s1 || [] : []
    return { isExecuted: n !== undefined, all: (b = 0) => (b === 0 ? s0 : s1).map((j) => ({ json: j })), first: () => ({ json: s0[0] }) } }
  const $input = { all: () => entree.map((j) => ({ json: j })), first: () => ({ json: entree[0] }) }
  return new Function('$', '$input', code)($, $input).map((x) => x.json)
}

// ═════════════ A. L'app : la garde anti-doublon ═════════════
const SRC = { garde: lire('lib/agents/n8n/garde-reel.ts'), leads: lire('app/api/leads/route.ts'), cron: lire('app/api/cron/relances/route.ts'), boite: lire('app/api/assistant/agents/route.ts') }

/** decisionGardeReel et gardeReel, extraites du TypeScript (types retirés), le client Supabase remplacé par un faux. */
async function chargerGarde(src, client) {
  const js = stripTypeScriptTypes(src.replace(/^import .*$/m, '')).replace(/export /g, '')
  return new Function('supabaseAdmin', js + '\nreturn { decisionGardeReel, gardeReel, DELAI_GARDE_MS }')(client)
}
const lignesReel = (a, b) => [{ departement: 'tous', palier: a, en_marche: true }, { departement: 'accueil', palier: b, en_marche: true }]
const fauxClient = (rep) => ({ from: () => { const q = { select: () => q, eq: () => q, in: () => q, limit: () => q, then: (ok, ko) => (typeof rep === 'function' ? rep() : Promise.resolve(rep)).then(ok, ko) }; return q } })
async function testGarde(src) {
  const G = await chargerGarde(src, null)
  const d = G.decisionGardeReel
  if (d(lignesReel('reel', 'reel'), 'accueil') !== true) return 'tous et accueil au réel : la garde doit céder'
  if (d(lignesReel('ombre', 'reel'), 'accueil') !== false) return '« tous » en ombre : le plus prudent s’applique'
  if (d(lignesReel('reel', 'ombre'), 'accueil') !== false) return 'département en ombre : l’app garde la main'
  if (d([{ departement: 'tous', palier: 'reel', en_marche: true }], 'accueil') !== false) return 'ligne du département absente'
  if (d([{ departement: 'tous', palier: 'reel', en_marche: true }, { departement: 'accueil', palier: 'reel', en_marche: false }], 'accueil') !== false) return 'département arrêté'
  if (d(lignesReel('reel', 'reel'), 'accueil', true) !== false) return 'lecture en erreur : l’app doit garder la main'
  if (d(null, 'accueil') !== false) return 'lecture vide'
  const g = async (rep) => (await chargerGarde(src, fauxClient(rep))).gardeReel('00000000-0000-4000-8000-0000000000d1', 'accueil')
  if (await g({ data: lignesReel('reel', 'reel'), error: null }) !== true) return 'gardeReel : lecture réelle au réel'
  if (await g({ data: lignesReel('reel', 'reel'), error: { message: 'panne' } }) !== false) return 'gardeReel : erreur de base'
  if (await g(() => Promise.reject(new Error('réseau'))) !== false) return 'gardeReel : exception'
  const t0 = Date.now(); if (await g(() => new Promise(() => {})) !== false || Date.now() - t0 > 4000) return 'gardeReel : base lente (doit rendre faux, vite)'
  return true
}
/** Le bloc de la route entre la garde et son `return` : il ne doit rien préparer ni envoyer au prospect. */
function brancheLeads(s) {
  const i = s.indexOf("if (evenementRange && await gardeReel(artisan.id, 'accueil'))"); if (i < 0) return 'garde de l’Accueil absente de /api/leads'
  const fin = s.indexOf('return NextResponse.json', i); const bloc = s.slice(i, fin)
  if (/sendEmail\(|generateConversationReply|piloterProposition|consumeCredit|etat: 'proposition'/.test(bloc)) return 'au réel, /api/leads envoie ou prépare encore la réponse'
  if (!/raison: 'agent_reel'/.test(s.slice(fin, fin + 200))) return 'au réel, la route doit rendre la main (agent_reel)'
  if (!/sens: 'in'/.test(bloc)) return 'au réel, le message du prospect doit rester tracé'
  // La garde vient après la pause et le débit, et après le fait rangé ; avant toute réponse de l'app.
  const pause = s.indexOf('artisan.leads_pause === true'), debit = s.indexOf('const throttled'), fait = s.indexOf('evenementRange = ev.ok'), reponse = s.indexOf('const decision = decisionReponse(')
  if (!(pause < i && debit < i && fait < i && i < reponse)) return 'garde mal placée dans /api/leads'
  return true
}
function brancheCron(s) {
  const i = s.indexOf("await gardeReel(lead.artisan_id, 'suivi')"); if (i < 0) return 'garde du Suivi absente du cron'
  const prise = s.indexOf("const prise = await supabaseAdmin.from('relances')"), envoi = s.indexOf('const envoi = await sendEmail(')
  if (!(i < prise && prise < envoi)) return 'la garde du Suivi doit précéder la prise et l’envoi'
  const bloc = s.slice(i, prise)
  if (!/if \(ev\.ok\) \{[^}]*\.update\(\{ envoyee: true \}\)\.eq\('id', r\.id\)\.eq\('envoyee', false\)[^}]*continue/s.test(bloc)) return 'relance cédée sans être prise (elle reviendrait chaque jour) ou sans continue'
  if (!/magasin: magasinHorsReel/.test(s) || !/gardeReel\(c\.artisan_id, 'facturation'\)/.test(s) || !/filter\(\(_, i\) => !gardes\[i\]\)/.test(s)) return 'tour des impayés sans garde de la Facturation'
  return true
}
function brancheBoite(s) {
  if (!/const statut = decision === 'valider' \? 'en_cours' : 'refusee'/.test(s)) return 'le statut exécutable doit venir du seul clic « Valider »'
  if (!/\.eq\('statut', 'en_attente'\)/.test(s) || !/\.eq\('origine', 'agent'\)/.test(s) || !/\.eq\('artisan_id', g\.uid\)/.test(s)) return 'réclamation de la boîte non atomique ou hors compte'
  if (/sendEmail|fetch\(|resend/i.test(s.replace(/\/\/.*$/gm, ''))) return 'la boîte ne doit rien envoyer elle-même'
  return true
}

// ═════════════ B. n8n : les codes exécutés ═════════════
const F = JSON.parse(lire(PREUVES + 'banc-fictif.json') || '{}')
const COMPTES_NOEUD = (lignes = F['Lire les départements au réel']) => executer(R.CODE_COMPTES_REEL, { 'Lire les départements au réel': lignes })
function noeudsDecider(m = {}) {
  const n = { 'Comptes au réel': COMPTES_NOEUD(), 'Lire la pause générale': [{ data: 'false' }] }
  for (const k of ['Lire les cartes à envoyer', 'Lire les comptes', 'Lire les destinataires', 'Lire les factures', 'Lire les réponses des clients', 'Lire les oppositions', 'Lire les réglages d’impayés', 'Lire les envois du jour']) n[k] = JSON.parse(JSON.stringify(F[k] || []))
  return Object.assign(n, m)
}
const decider = (code, m) => executer(code, noeudsDecider(m))
const envois = (s) => s.filter((x) => x.genre === 'envoi').map((x) => x.carte_id).sort()
const notes = (s) => Object.fromEntries(s.filter((x) => x.genre === 'noter').map((x) => [x.carte_id, x.motif]))
const C = (n) => '00000000-0000-4000-8000-00000000c00' + n
function testDecider(code) {
  const s = decider(code)
  if (JSON.stringify(envois(s)) !== JSON.stringify([C(1), C(2)])) return 'envois ' + JSON.stringify(envois(s)) + ' ≠ Studio cliqué + Signature pilote échu'
  const no = notes(s)
  if (no[C(5)] !== 'opposition') return 'STOP du client ignoré (c005 : ' + no[C(5)] + ')'
  if (no[C(6)] !== 'opt_in') return 'impayé sans opt-in non écarté (c006 : ' + no[C(6)] + ')'
  if (no[C(7)] !== 'marque') return '« Presti » dans le texte non écarté (c007 : ' + no[C(7)] + ')'
  for (const id of [C(3), C(4), C(8)]) if (s.some((x) => x.carte_id === id)) return 'carte ' + id + ' touchée (pas échue, sans clic, ou de l’ombre)'
  for (const x of s.filter((y) => y.genre === 'envoi')) { const e = x.enveloppe
    if (!/^reel:[0-9a-f]{12}:h:decision:/.test(e.cle_idempotence)) return 'clé d’idempotence absente ou hors forme'
    if (e.de_adresse !== 'contact@prestiapp.fr' || /presti/i.test(e.de_nom + e.sujet + e.texte)) return 'marque blanche rompue'
    if (!/@example\.com$/.test(e.reply_to)) return 'Reply-To ≠ adresse de l’artisan'
    if (!/l’assistant de /.test(e.texte)) return 'mention d’IA absente'
    if (!/« STOP »/.test(e.texte) || !/désinscription/.test(e.texte)) return 'opposition absente du pied'
    if (x.carte_id === C(2) && !/envoyé automatiquement/.test(e.texte)) return 'la mention d’un envoi seul doit dire « automatiquement »'
    if (e.a !== 'delivered@resend.dev') return 'destinataire du banc hors delivered@resend.dev' }
  // Pause générale posée, ou illisible ; une lecture commune en erreur : rien ne part.
  if (envois(decider(code, { 'Lire la pause générale': [{ data: 'true' }] })).length) return 'pause générale ignorée'
  if (envois(decider(code, { 'Lire la pause générale': [{ error: 'panne' }] })).length) return 'pause illisible : rien ne doit partir'
  if (envois(decider(code, { 'Lire les oppositions': [{ error: 'panne' }] })).length) return 'oppositions illisibles : rien ne doit partir'
  // L'opposition par empreinte (crm_apres_opposition, sha256 de l'adresse, 32 hex).
  const emp = createHash('sha256').update('delivered@resend.dev').digest('hex').slice(0, 32)
  const o = decider(code, { 'Lire les oppositions': [{ artisan_id: '00000000-0000-4000-8000-0000000000d1', empreinte: emp }] })
  if (envois(o).includes(C(1)) || notes(o)[C(1)] !== 'opposition') return 'opposition par empreinte ignorée'
  // Plafond du jour du pilote : 20 envois seuls déjà partis → la carte Signature attend.
  if (envois(decider(code, { 'Lire les envois du jour': Array.from({ length: 20 }, () => ({ artisan_id: '00000000-0000-4000-8000-0000000000d2' })) })).includes(C(2))) return 'plafond de 20 envois seuls par jour ignoré'
  // Une carte pilote d'un compte Studio (offre relue au moment d'envoyer) : jamais seule.
  const studio = decider(code, { 'Lire les comptes': F['Lire les comptes'].map((a) => Object.assign({}, a, { plan: 'studio' })) })
  if (envois(studio).includes(C(2)) || notes(studio)[C(2)] !== 'offre') return 'Signature : un type que l’offre ne permet pas est parti seul'
  // Le retour arrière : le département repassé en ombre → rien ne part pour lui.
  const retour = F['Lire les départements au réel'].filter((l) => !(l.artisan_id.endsWith('d2') && l.departement === 'accueil'))
  if (envois(decider(code, { 'Comptes au réel': COMPTES_NOEUD(retour) })).includes(C(2))) return 'retour arrière : un département repassé hors réel envoie encore'
  // Opt-in posé : la relance d'impayé part, vers l'adresse de la facture.
  const opt = decider(code, { 'Lire les réglages d’impayés': [{ artisan_id: '00000000-0000-4000-8000-0000000000d2', actif: true }] })
  if (!envois(opt).includes(C(6))) return 'impayé avec opt-in : doit partir par le pilote'
  return true
}
function testComptes(code) {
  const c = executer(code, { 'Lire les départements au réel': F['Lire les départements au réel'] })[0]
  if (JSON.stringify(c.comptes) !== JSON.stringify({ '00000000-0000-4000-8000-0000000000d1': ['accueil'], '00000000-0000-4000-8000-0000000000d2': ['accueil', 'facturation'] })) return 'comptes au réel faux'
  if (executer(code, { 'Lire les départements au réel': [{ error: 'panne' }] })[0].ids.length) return 'lecture en erreur : aucun compte'
  if (executer(code, { 'Lire les départements au réel': [{ artisan_id: '00000000-0000-4000-8000-0000000000d1', departement: 'accueil', palier: 'reel', en_marche: true }] })[0].ids.length) return '« tous » absent : le département ne passe pas au réel'
  return true
}
const ENV_OK = { cle_idempotence: 'reel:0000000000d1:h:decision:x', de_nom: 'Exemple Menuiserie', de_adresse: 'contact@prestiapp.fr', reply_to: 'atelier@example.com', a: 'delivered@resend.dev', sujet: 'Votre demande',
  texte: 'Bonjour, voici notre réponse à votre demande.\n\n—\nMessage préparé par l’assistant de Exemple Menuiserie, relu et validé par Exemple Menuiserie.\nVous ne souhaitez plus recevoir de message de Exemple Menuiserie ? Répondez simplement « STOP » à cet e-mail (désinscription immédiate).', essai: true, carte_id: C(1) }
function testControler(code) {
  const c = (m) => executer(code, {}, [Object.assign({}, ENV_OK, m)])[0]
  const ok = c({}); if (!ok.ok || ok.corps.from !== 'Exemple Menuiserie <contact@prestiapp.fr>' || ok.corps.reply_to !== 'atelier@example.com' || !/STOP/.test(ok.corps.headers['List-Unsubscribe'])) return 'enveloppe conforme refusée ou mal formée'
  const refus = { cle_idempotence: { cle_idempotence: '' }, marque_blanche: { de_nom: 'Presti' }, expediteur: { de_adresse: 'contact@autre.fr' }, reply_to: { reply_to: 'contact@prestiapp.fr' },
    mention_ia: { texte: ENV_OK.texte.replace(/l’assistant de /g, 'quelqu’un de ') }, opposition: { texte: ENV_OK.texte.replace('« STOP »', 'non') }, essai_hors_resend: { a: 'client@example.com' } }
  for (const [raison, m] of Object.entries(refus)) { const r = c(m); if (r.ok || !r.raisons.includes(raison)) return 'enveloppe acceptée malgré ' + raison }
  if (c({ texte: ENV_OK.texte + ' Presti' }).ok) return '« Presti » dans le texte accepté'
  const rendu = executer(R.CODE_RENDRE, { 'Contrôler l’enveloppe': [ok] }, [{ id: 'resend-1' }])[0]
  if (!rendu.ok || rendu.envoi_id !== 'resend-1' || 'a' in rendu || 'texte' in rendu) return 'résultat rendu faux, ou il porte l’adresse ou le texte'
  return true
}
function testReclamees(code) {
  const dec = decider(R.CODE_DECIDER)
  const pris = executer(code, { 'Décider les envois': dec, 'Réclamer la carte': [{ id: C(1), artisan_id: '00000000-0000-4000-8000-0000000000d1', statut: 'executee' }, {}] })
  if (pris.length !== 1 || pris[0].carte_id !== C(1) || !pris[0].cle_idempotence) return 'seule la carte réclamée doit partir'
  if (!executer(code, { 'Décider les envois': dec, 'Réclamer la carte': [{}] })[0].vide) return 'aucune réclamation : aucun envoi'
  if (!executer(code, { 'Décider les envois': dec, 'Réclamer la carte': [{ id: C(1), artisan_id: '00000000-0000-4000-8000-0000000000d2', statut: 'executee' }] })[0].vide) return 'réclamation d’un autre compte acceptée'
  return true
}
// Les cartes du Cerveau au palier réel : le code d'« Préparer les cartes de l'ombre » (export n8n), retouché par appliquerReelAuxCartes.
const D1 = '00000000-0000-4000-8000-0000000000d1', D2 = '00000000-0000-4000-8000-0000000000d2', D3 = '00000000-0000-4000-8000-0000000000d3'
const CAP_S = ['canaux.email', 'relances', 'factures.relances', 'assistant'], CAP_G = CAP_S.concat(['plateforme.ia.auto', 'relances.auto', 'factures.relances.auto', 'crm', 'assistant.pilote'])
const TEXTE = 'Bonjour, merci pour votre demande. Je peux passer voir le chantier cette semaine pour prendre les mesures.'
function noeudsCartes(optIn, paliers = { d1: 'reel', d2: 'reel', d3: 'ombre' }) {
  const env = (dep, a, cfg) => ({ contrat: 'presti-dep-' + dep + '@1', organisation_id: a, cle_idempotence: 'dep:' + dep + ':' + a.slice(24) + ':P', config: cfg || {} })
  const lot = (a, dep, palier, type, objet) => ({ artisan_id: a, departement: dep, palier, ids: ['ev-' + a.slice(-2) + dep], objets: [{ id: 'ev-' + a.slice(-2) + dep, type, objet_id: objet }] })
  const sortie = (dep, a, outil, objet) => ({ contrat: 'presti-dep-' + dep + '@1', statut: 'ok', cle_idempotence: 'dep:' + dep + ':' + a.slice(24) + ':P',
    effets_prevus: [{ effet: 'ecrire_carte', corps: { organisation_id: a, cle: 'h:decision:' + a.slice(-2) + outil, type_action: outil, objet_id: objet, canal: 'email', brouillon: { objet: 'Votre demande', texte: TEXTE } } }] })
  const L1 = '00000000-0000-4000-8000-00000000e001', L2 = '00000000-0000-4000-8000-00000000e002', L3 = '00000000-0000-4000-8000-00000000e003', F1 = '00000000-0000-4000-8000-00000000f001'
  return {
    'Composer les comptes': [{ artisan_id: D1, offre: 'studio', accueil: { capacites: CAP_S } }, { artisan_id: D2, offre: 'signature', accueil: { capacites: CAP_G } }, { artisan_id: D3, offre: 'signature', accueil: { capacites: CAP_G } }],
    'Aiguiller': [env('accueil', D1), env('accueil', D2), env('facturation', D2, { lectures_simulees: { configuration: [{ relances_impayes: { actif: optIn, jours: [3] } }] } }), env('accueil', D3),
      { contrat: 'aucun', jour_ferie: false, routes_ids: { [D1 + '|accueil']: lot(D1, 'accueil', paliers.d1, 'demande_recue', L1), [D2 + '|accueil']: lot(D2, 'accueil', paliers.d2, 'demande_recue', L2),
        [D2 + '|facturation']: lot(D2, 'facturation', paliers.d2, 'impaye_echu', F1), [D3 + '|accueil']: lot(D3, 'accueil', paliers.d3, 'demande_recue', L3) } }],
    'Appeler presti-dep-accueil': [sortie('accueil', D1, 'reponse_prospect', L1), sortie('accueil', D2, 'reponse_prospect', L2), sortie('accueil', D3, 'reponse_prospect', L3)],
    'Appeler presti-dep-facturation': [sortie('facturation', D2, 'relance_impaye', F1)],
  }
}
function testCartes(code) {
  const l = executer(code, noeudsCartes(false))[0].lignes, de = (a, dep) => l.find((x) => x.artisan_id === a && x.departement === dep)
  const s = de(D1, 'accueil'), g = de(D2, 'accueil'), f = de(D2, 'facturation'), o = de(D3, 'accueil')
  if (!s || !g || !f || !o) return 'une carte du réel ou de l’ombre manque (' + l.length + ' lignes)'
  if (l.some((x) => x.statut !== 'en_attente')) return 'une carte d’agent naît toujours « à valider »'
  if (s.entrees.palier !== 'reel' || s.entrees.envoi !== 'au_clic' || s.entrees.pilote) return 'Studio au réel : la carte doit attendre le clic'
  if (!/rien ne part sans votre clic/.test(s.motif)) return 'Studio : le motif doit dire que rien ne part sans le clic'
  const dt = Date.parse(g.entrees.pilote && g.entrees.pilote.envoyer_apres) - Date.now()
  if (g.entrees.envoi !== 'pilote' || !(dt > 9 * 60000 && dt <= 10 * 60000 + 2000)) return 'Signature, type permis : départ par le pilote après 10 minutes'
  if (f.entrees.envoi !== 'au_clic' || f.entrees.motif_clic !== 'non_permis') return 'impayé sans opt-in : la carte doit attendre le clic'
  if (o.entrees.palier || !/mode ombre, rien n’est parti/.test(o.motif) || !o.sources.some((x) => /:ombre$/.test(x.source))) return 'l’ombre a changé'
  if (!s.sources.some((x) => /:accueil:reel$/.test(x.source))) return 'la source du palier doit dire « reel »'
  if (executer(code, noeudsCartes(true))[0].lignes.find((x) => x.departement === 'facturation').entrees.envoi !== 'pilote') return 'impayé avec opt-in : pilote'
  if (executer(code, noeudsCartes(false, { d1: 'simulation', d2: 'simulation', d3: 'simulation' }))[0].lignes.length) return 'en simulation, rien ne doit être écrit'
  const nf = noeudsCartes(true); nf['Aiguiller'].find((x) => x.contrat === 'aucun').jour_ferie = { jour: '2026-11-11', nom: 'Armistice' }
  const fer = executer(code, nf)[0].lignes
  if (fer.find((x) => x.departement === 'facturation').entrees.envoi !== 'au_clic' || fer.find((x) => x.artisan_id === D2 && x.departement === 'accueil').entrees.envoi !== 'pilote') return 'jour férié : l’impayé attend le clic, la réponse à une demande part'
  return true
}

// ═════════════ C. Les exports n8n rapatriés, comparés à la source ═════════════
const EXP = { cerveau: json(PREUVES + 'presti-cerveau.workflow.json'), envoi: json(PREUVES + 'presti-dep-envoi.workflow.json'), courriel: json(PREUVES + 'lib-envoyer-courriel.workflow.json') }
const noeud = (w, nom) => (w && Array.isArray(w.nodes) ? w.nodes.find((n) => n.name === nom) : null)
const codeDe = (w, nom) => (noeud(w, nom) || {}).parameters?.jsCode ?? ''
function testCerveau(w) {
  if (!w) return 'export de presti-cerveau absent'
  const ag = codeDe(w, 'Aiguiller'), ca = codeDe(w, 'Préparer les cartes de l’ombre'), it = codeDe(w, 'Interrupteur général')
  if (!/const SERVIS = \['simulation', 'ombre', 'reel'\];/.test(ag)) return 'Aiguiller ne sert pas le réel'
  if (!/simulation: true, cle_idempotence: 'dep:'/.test(ag) || /simulation: palier/.test(ag)) return 'un chef doit rester en simulation, même au réel'
  if (!ca.includes(R.BLOC_CARTES_REEL) || R.appliquerReelAuxCartes(ca) !== ca) return 'les cartes du réel ne sont pas celles de la source'
  if (!/l\.palier === 'reel'/.test(it)) return 'l’interrupteur général ignore les comptes au réel'
  if (R.appliquerReelAuxMarques(codeDe(w, 'Préparer les marques')) !== codeDe(w, 'Préparer les marques') || !/l\.palier === 'reel'\) && aRejouer/.test(codeDe(w, 'Préparer les marques'))) return 'une carte du réel non écrite serait marquée traitée (perdue)'
  const lect = (noeud(w, 'Lire les interrupteurs généraux') || {}).parameters?.queryParameters?.parameters || []
  if (!lect.some((p) => p.name === 'palier' && p.value === R.LECTURE_INTERRUPTEURS_REEL)) return 'la lecture des interrupteurs ignore le réel'
  return testCartes(ca)
}
function testEnvoi(w) {
  if (!w) return 'export de presti-dep-envoi absent'
  for (const [nom, src] of [['Comptes au réel', R.CODE_COMPTES_REEL], ['Décider les envois', R.CODE_DECIDER], ['Garder les réclamées', R.CODE_RECLAMEES], ['Préparer les résultats', R.CODE_RESULTATS]]) if (codeDe(w, nom) !== src) return 'nœud « ' + nom + ' » différent de la source'
  for (const [nom, e] of Object.entries(R.ECRITURES_ENVOI)) { const p = (noeud(w, nom) || {}).parameters || {}; if (p.method !== e.methode || p.url !== e.url) return 'écriture « ' + nom + ' » différente de la source' }
  if (!/statut=eq\.' \+ \$json\.statut_attendu/.test(R.ECRITURES_ENVOI['Réclamer la carte'].url) || !/envoyer_apres=lte/.test(R.ECRITURES_ENVOI['Réclamer la carte'].url)) return 'réclamation non conditionnelle'
  const appel = noeud(w, 'Envoyer (lib-envoyer-courriel)'); if (!appel || appel.parameters.workflowId?.value !== EXP.courriel?.id) return 'l’envoi ne passe pas par lib-envoyer-courriel'
  for (const n of w.nodes.filter((x) => x.type === 'n8n-nodes-base.httpRequest')) { const u = String(n.parameters.url || '')
    if (!u.startsWith('https://gorcdvmueakcncsmrouo.supabase.co/rest/v1/') && !u.startsWith("={{ 'https://gorcdvmueakcncsmrouo.supabase.co/rest/v1/")) return 'nœud HTTP hors Supabase : ' + n.name
    const q = n.parameters.queryParameters?.parameters || []; if (n.parameters.method === 'GET' && !['Lire les départements au réel', 'Lire les réponses des clients'].includes(n.name) && !q.some((p) => p.name === 'artisan_id' || p.name === 'id')) return 'lecture sans filtre de compte : ' + n.name }
  if (w.nodes.some((n) => /emailSend|gmail|smtp|resend/i.test(n.type))) return 'un nœud d’envoi direct contourne le canal'
  return true
}
function testCourriel(w) {
  if (!w) return 'export de lib-envoyer-courriel absent'
  if (codeDe(w, 'Contrôler l’enveloppe') !== R.CODE_CONTROLER || codeDe(w, 'Rendre le résultat') !== R.CODE_RENDRE) return 'codes du canal différents de la source'
  const r = noeud(w, 'Envoyer par Resend'); if (!r) return 'nœud Resend absent'
  if (r.parameters.url !== 'https://api.resend.com/emails' || r.credentials?.httpHeaderAuth?.id !== R.IDENTIFIANT_RESEND.id || r.credentials?.httpHeaderAuth?.name !== 'Resend (Presti)') return 'le canal n’est pas l’identifiant « Resend (Presti) »'
  if (!(r.parameters.headerParameters?.parameters || []).some((p) => p.name === 'Idempotency-Key' && /cle_idempotence/.test(p.value))) return 'Resend sans Idempotency-Key'
  const c = w.connections || {}; const versResend = Object.entries(c).filter(([, v]) => JSON.stringify(v).includes('"Envoyer par Resend"')).map(([k]) => k)
  if (JSON.stringify(versResend) !== JSON.stringify(['Envoyable ?']) || JSON.stringify(c['Envoyable ?'].main[0]) !== JSON.stringify([{ node: 'Envoyer par Resend', type: 'main', index: 0 }])) return 'Resend joignable sans passer le contrôle'
  if (w.settings?.callerPolicy !== 'workflowsFromAList' || !String(w.settings?.callerIds || '').split(',').includes(EXP.envoi?.id)) return 'appelants du canal non restreints'
  return true
}
function testNonPublies() {
  // 036-038 ne publie rien : le Cerveau garde sa version active d'avant (78c413bb, 036-034) ; l'expéditeur et le canal restent non publiés.
  if (!EXP.cerveau || EXP.cerveau.activeVersionId !== '78c413bb-2768-492c-8381-41b6800f03fb') return 'la version active du Cerveau a changé'
  if (!EXP.envoi || EXP.envoi.active !== false || EXP.envoi.activeVersionId !== null) return 'presti-dep-envoi ne doit pas être publié par 036-038'
  if (!EXP.courriel || EXP.courriel.active !== false || EXP.courriel.activeVersionId !== null) return 'lib-envoyer-courriel ne doit pas être publié par 036-038'
  return true
}
function testEssais() {
  const e = json(PREUVES + 'essais-n8n.json'); if (!e || !Array.isArray(e.executions)) return 'essais n8n absents'
  const essai = e.executions.find((x) => x.workflow === 'presti-dep-envoi' && x.role === 'essai' && x.statut === 'success'), rejeu = e.executions.find((x) => x.workflow === 'presti-dep-envoi' && /^rejeu/.test(x.role) && x.statut === 'success')
  if (!essai || !rejeu) return 'essai et rejeu de presti-dep-envoi non relevés'
  if (!e.executions.every((x) => Array.isArray(x.destinataires) && x.destinataires.length && x.destinataires.every((d) => d === 'delivered@resend.dev'))) return 'un essai vise une autre adresse que delivered@resend.dev'
  const s = essai.envois.find((x) => x.carte_id === C(1)), g = essai.envois.find((x) => x.carte_id === C(2))
  if (!s || !g || s.offre !== 'studio' || g.offre !== 'signature' || !/clic/.test(s.moyen) || !/pilote/.test(g.moyen)) return 'Studio validé d’un clic et Signature par le pilote non prouvés'
  if (essai.envois.length !== 2 || ![s, g].every((x) => x.ok && /^[0-9a-f-]{36}$/.test(x.envoi_id)) || s.envoi_id === g.envoi_id) return 'les deux envois ne sont pas prouvés par Resend'
  if (rejeu.envois.length !== 2 || rejeu.envois.some((r) => r.envoi_id !== (essai.envois.find((x) => x.carte_id === r.carte_id) || {}).envoi_id)) return 'le rejeu a créé un autre envoi'
  // Le relevé de l'essai doit être celui que rend le code de production sur les mêmes données (banc-fictif.json).
  const d = decider(R.CODE_DECIDER)
  if (JSON.stringify(envois(d)) !== JSON.stringify(essai.envois.map((x) => x.carte_id).sort()) || JSON.stringify(notes(d)) !== JSON.stringify(Object.fromEntries(essai.ecartees.map((x) => [x.carte_id, x.motif])))) return 'le relevé de l’essai ne correspond pas au code'
  for (const v of essai.enveloppes_relues || []) if (!/<contact@prestiapp\.fr>$/.test(v.de) || /presti/i.test(v.de.replace('contact@prestiapp.fr', '') + v.sujet + v.pied) || !/l’assistant de /.test(v.pied) || !/« STOP »/.test(v.pied)) return 'enveloppe relue hors règle'
  return true
}

// ═════════════ D. Exécution, puis les mutants ═════════════
const garde = SRC.garde
const controles = {
  'A1 garde : « tous » ET le département au réel, échec = l’app garde la main': () => testGarde(garde),
  'A2 /api/leads : au réel, l’Accueil de l’app se tait (ni réponse, ni proposition, ni accusé)': () => brancheLeads(SRC.leads),
  'A3 cron : Suivi cédé ET pris, impayés de la Facturation au réel sautés': () => brancheCron(SRC.cron),
  'A4 boîte : seul le clic « Valider » rend une carte exécutable': () => brancheBoite(SRC.boite),
  'B1 n8n Comptes au réel : le plus prudent des deux': () => testComptes(R.CODE_COMPTES_REEL),
  'B2 n8n Décider : Studio au clic, Signature pilote permis, opt-in, STOP, marque, mention, plafond, pause, retour arrière': () => testDecider(R.CODE_DECIDER),
  'B3 n8n Contrôler : la dernière porte avant Resend': () => testControler(R.CODE_CONTROLER),
  'B4 n8n Réclamer : une carte part une fois, et seulement si réclamée': () => testReclamees(R.CODE_RECLAMEES),
  'C1 export presti-cerveau : réel servi, chefs en simulation, cartes du réel exécutées': () => testCerveau(EXP.cerveau),
  'C2 export presti-dep-envoi = source ; écritures conditionnelles ; lectures filtrées par compte': () => testEnvoi(EXP.envoi),
  'C3 export lib-envoyer-courriel : « Resend (Presti) », Idempotency-Key, contrôle obligatoire, appelants restreints': () => testCourriel(EXP.courriel),
  'C4 rien n’est publié par 036-038 (Cerveau sur sa version active d’avant, expéditeur et canal non publiés)': () => testNonPublies(),
  'C5 essai réel (presti-dep-envoi, exécutions 2749 et 2753) vers delivered@resend.dev : Studio validé + Signature par le pilote, rejeu sans second envoi': () => testEssais(),
  'C6 juge déclaré dans SUITES': () => /args: \['scripts\/reel-qa\.mjs'\]/.test(lire('scripts/tout-verifier.mjs')) || 'reel-qa absent de SUITES',
  'C7 preuves écrites (reel.md, resume.md avec « Ressources utilisées »)': () => (/## Ressources utilisées/.test(lire(PREUVES + 'resume.md')) && /retour arrière/i.test(lire('plans/011-cadrage-01-11/p6-signature/reel.md')) && /delivered@resend\.dev/.test(lire('plans/011-cadrage-01-11/p6-signature/reel.md'))) || 'preuves incomplètes',
}
for (const [nom, fn] of Object.entries(controles)) { let r; try { r = await fn() } catch (e) { r = e.message } resultats.push({ nom, ok: r === true, detail: r === true ? '' : String(r) }) }

const remplacer = (s, a, b) => { if (!s.includes(a)) throw new Error('ancre de mutant absente : ' + a.slice(0, 50)); return s.split(a).join(b) }
const MUTANTS = [
  ['double envoi (l’app répond encore au réel)', () => brancheLeads(remplacer(SRC.leads, "if (evenementRange && await gardeReel(artisan.id, 'accueil'))", 'if (evenementRange && false)'))],
  ['double envoi (l’app envoie la réponse dans la branche du réel)', () => brancheLeads(remplacer(SRC.leads, "      return NextResponse.json({ ok: true, leadId: lead.id, token: lead.token, reply: null, raison: 'agent_reel' })", "      await sendEmail({ to: contact }); return NextResponse.json({ ok: true, leadId: lead.id, token: lead.token, reply: null, raison: 'agent_reel' })"))],
  ['double envoi (relance cédée mais laissée due)', () => brancheCron(remplacer(SRC.cron, "await supabaseAdmin.from('relances').update({ envoyee: true }).eq('id', r.id).eq('envoyee', false)\n        cedees++", "cedees++"))],
  ['double envoi (impayés de l’app sans garde)', () => brancheCron(remplacer(SRC.cron, 'magasin: magasinHorsReel', 'magasin: magasinSupabase'))],
  ['double envoi (n8n envoie sans réclamer la carte)', () => testReclamees(remplacer(R.CODE_RECLAMEES, "prises.has(d.artisan_id + ':' + d.carte_id)", 'true'))],
  ['Studio envoie sans clic (n8n)', () => testDecider(remplacer(R.CODE_DECIDER, "const clic = c.statut === 'en_cours';", "const clic = c.statut === 'en_cours' || c.statut === 'en_attente';"))],
  ['Studio envoie sans clic (boîte)', () => brancheBoite(remplacer(SRC.boite, "const statut = decision === 'valider' ? 'en_cours' : 'refusee'", "const statut = 'en_cours'"))],
  ['Studio envoie sans clic (carte du Cerveau en pilote)', () => testCartes(R.appliquerReelAuxCartes(codeDe(EXP.cerveau, 'Préparer les cartes de l’ombre')).replace("const pilote = permis && texte", 'const pilote = texte'))],
  ['Signature envoie un type non permis', () => testDecider(remplacer(R.CODE_DECIDER, "if (offre !== 'signature' || CAPACITES.signature.indexOf(type.capacite) < 0)", 'if (false)'))],
  ['impayé sans opt-in (n8n)', () => testDecider(remplacer(R.CODE_DECIDER, "if (type.opt_in && !(OPT[c.artisan_id] && OPT[c.artisan_id].actif === true))", 'if (false)'))],
  ['impayé sans opt-in (carte du Cerveau)', () => testCartes(remplacer(codeDe(EXP.cerveau, 'Préparer les cartes de l’ombre'), "(outil !== 'relance_impaye' || optInImpaye(lot.artisan_id))", 'true'))],
  ['« Presti » dans l’e-mail (décision)', () => testDecider(remplacer(R.CODE_DECIDER, "if (/presti/i.test(corps) || /presti/i.test(String(b.objet || ''))) { ecarter('marque'", "if (false) { ecarter('marque'"))],
  ['« Presti » dans l’e-mail (canal)', () => testControler(remplacer(R.CODE_CONTROLER, "if (!nom || /presti/i.test(nom)) raisons.push('marque_blanche');", ''))],
  ['mention d’IA absente (décision)', () => testDecider(remplacer(R.CODE_DECIDER, "mention(nom, pilote ? 'pilote' : 'clic') + '\\n' + ", ''))],
  ['mention d’IA absente (canal)', () => testControler(remplacer(R.CODE_CONTROLER, "if (!/l’assistant de /.test(texte)) raisons.push('mention_ia');", ''))],
  ['opposition ignorée (STOP)', () => testDecider(remplacer(R.CODE_DECIDER, '(leadId && stopDe[leadId]) || ', ''))],
  ['opposition ignorée (pied sans STOP)', () => testControler(remplacer(R.CODE_CONTROLER, "if (!/« STOP »/.test(texte) || !/désinscription/.test(texte)) raisons.push('opposition');", ''))],
  ['clé d’idempotence absente (canal)', () => testControler(remplacer(R.CODE_CONTROLER, "if (typeof e.cle_idempotence !== 'string' || !/^[A-Za-z0-9_:.-]{8,200}$/.test(e.cle_idempotence)) raisons.push('cle_idempotence');", ''))],
  ['clé d’idempotence absente (en-tête Resend)', () => { const w = JSON.parse(JSON.stringify(EXP.courriel)); noeud(w, 'Envoyer par Resend').parameters.headerParameters.parameters = []; return testCourriel(w) }],
  ['clé d’idempotence absente (décision)', () => testDecider(remplacer(R.CODE_DECIDER, "cle_idempotence: 'reel:' + c.artisan_id.slice(24) + ':' + String(c.cle).slice(0, 120),", ''))],
  ['garde en échec qui laisse tout le monde muet (erreur lue comme réel)', () => testGarde(remplacer(garde, 'if (erreur || !Array.isArray(lignes)) return false', 'if (!Array.isArray(lignes)) return true'))],
  ['garde en échec qui laisse tout le monde muet (exception lue comme réel)', () => testGarde(remplacer(garde, '  } catch {\n    return false', '  } catch {\n    return true'))],
  ['garde en échec qui laisse tout le monde muet (délai lu comme réel)', () => testGarde(remplacer(garde, 'setTimeout(() => resoudre(false), DELAI_GARDE_MS)', 'setTimeout(() => resoudre(true), DELAI_GARDE_MS)'))],
  ['le plus prudent des deux ignoré (« tous » seul suffit)', () => testGarde(remplacer(garde, "return auReel('tous') && auReel(departement)", "return auReel('tous')"))],
  ['un chef sort de la simulation au réel', () => testCerveau(Object.assign({}, EXP.cerveau, { nodes: EXP.cerveau.nodes.map((n) => n.name === 'Aiguiller' ? Object.assign({}, n, { parameters: { jsCode: n.parameters.jsCode.replace("simulation: true, cle_idempotence: 'dep:'", "simulation: palier !== 'reel', cle_idempotence: 'dep:'") } }) : n) }))],
  ['essai vers une vraie adresse', () => { const f = PREUVES + 'essais-n8n.json', avant = lire(f); try { fs.writeFileSync(path.join(racine, f), avant.replace('"destinataires": ["delivered@resend.dev"]', '"destinataires": ["client@example.com"]')); return testEssais() } finally { fs.writeFileSync(path.join(racine, f), avant) } }],
  ['rejeu qui crée un second envoi', () => { const f = PREUVES + 'essais-n8n.json', avant = lire(f); try { fs.writeFileSync(path.join(racine, f), avant.replace(/("execution": "2753"[\s\S]*?"envoi_id": ")01a1a3a9-e1dd/, '$1ffffffff-e1dd')); return testEssais() } finally { fs.writeFileSync(path.join(racine, f), avant) } }],
  ['Resend joignable sans contrôle', () => { const w = JSON.parse(JSON.stringify(EXP.courriel)); w.connections['Reçu de l’appelant'].main[0].push({ node: 'Envoyer par Resend', type: 'main', index: 0 }); return testCourriel(w) }],
]
for (const [nom, fn] of MUTANTS) { let r; try { r = await fn() } catch (e) { r = 'erreur : ' + e.message } resultats.push({ nom: 'mutant vu — ' + nom, ok: r !== true && !String(r).startsWith('erreur : '), detail: r === true ? 'MUTANT NON VU' : String(r).startsWith('erreur : ') ? String(r) : '' }) }

// SHA-256 en JS pur du nœud Décider = node:crypto (l'empreinte d'opposition doit être la même que celle de l'app).
verifier('B5 empreinte d’adresse du nœud Décider = lib/crm/apresOpposition.ts', () => {
  const sha = new Function(R.CODE_DECIDER.match(/const sha256 = [\s\S]*?\n  return h\.map[^\n]*\n/)[0] + 'return sha256;')()
  for (const s of ['', 'a', 'delivered@resend.dev', 'é'.repeat(70), 'x'.repeat(200)]) if (sha(s) !== createHash('sha256').update(s).digest('hex')) return 'SHA-256 faux pour ' + JSON.stringify(s.slice(0, 10))
  return true
})

let rouges = 0
for (const r of resultats) { if (!r.ok) rouges++; console.log((r.ok ? 'OK   ' : 'FAIL ') + r.nom + (r.detail ? ' — ' + r.detail : '')) }
const mutants = resultats.filter((r) => r.nom.startsWith('mutant vu')).length
if (rouges) { console.error(`036-038 : FAIL — ${rouges} contrôle(s) en échec sur ${resultats.length}`); process.exitCode = 1 }
else console.log(`036-038 : PASS — ${resultats.length - mutants} contrôles verts, ${mutants}/${mutants} mutants vus`)
