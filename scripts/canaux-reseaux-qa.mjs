#!/usr/bin/env node
// scripts/canaux-reseaux-qa.mjs — juge du chantier « tous nos réseaux dans la messagerie » (21/10/2026 ; drapeaux canauxTelegram,
// canauxNotifications, canauxLiens, importProspects ; migration 0177). Gratuit : AUCUN réseau, aucune base, aucun vrai compte, aucun
// appel IA. Les charges utiles (Telegram), les e-mails de notification et les exports CSV sont des fixtures INVENTÉES
// (scripts/fixtures/canaux-reseaux/) ; le magasin de rangement est en mémoire ; le reste se lit dans les sources.
//
//  A. DRAPEAUX baissés = rien (routes 404, écrans absents, rien lu ni écrit) ; marque blanche.
//  B. TELEGRAM pur : jeton, secret du webhook DÉRIVÉ par liaison (le secret de A n'ouvre pas B), lecture des mises à jour, requêtes.
//  C. TELEGRAM rangement : routage vers le bon artisan, idempotence (rejeu), deux clients = deux fils, liaison coupée = rien.
//  D. TELEGRAM routes : ordre des gardes du webhook, liaison (session, chiffrement, unicité, IDOR), envoi.
//  E. NOTIFICATIONS e-mail : réseaux reconnus, anti-hameçonnage (domaine, authentification, liens), idempotence, relève.
//  F. VOS RÉSEAUX : origine en liste fermée, liens marqués, textes sans « Presti », page /p et /api/leads, pastille.
//  G. QR code : structure, et décodage réel par OpenCV quand Python + cv2 sont présents.
//  H. IMPORT CSV : colonnes, séparateurs, doublons, AUCUN envoi (ni IA, ni relance, ni pilote).
//  I. PILOTE : Telegram seulement ; refus au point d'envoi commun ; mention de l'assistant sur un envoi automatique.
//  J. MIGRATION 0177 : idempotente, additive, aucun droit anon ; contrôle ; jumeau équivalent.
//  L. DKIM vérifié par nous : canonisation (exemple de la RFC 6376), signatures valides, falsifications refusées.
//  M. Plafonds (audit offensif du 21/10 : E2, M1, M2), notification de l'artisan, purge des importés jamais contactés (M3).
//  K. Fichiers sans octet de contrôle ; /messages sans session → /login.
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/canaux-reseaux-qa.mjs
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.removeAllListeners('warning')
process.on('warning', (w) => { if (w.code !== 'MODULE_TYPELESS_PACKAGE_JSON' && w.name !== 'ExperimentalWarning') console.error(w) })
const rouges = []
let verts = 0
const T = (nom, cond, detail = '') => { if (cond) { verts++; console.log(`PASS ${nom}`) } else { rouges.push(nom); console.log(`FAIL ${nom}${detail ? ' — ' + String(detail).slice(0, 400) : ''}`) } }
const lire = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8').replace(/\r\n/g, '\n')
const imp = (rel) => import(pathToFileURL(path.join(RACINE, rel)).href)
const sansCommentaires = (s) => s.replace(/^\s*\/\/.*$/gm, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '')
const FIX = 'scripts/fixtures/canaux-reseaux'
const fixture = (nom) => fs.readFileSync(path.join(RACINE, FIX, nom))
const json = (nom) => JSON.parse(fixture(nom).toString('utf8'))

const { FLAGS } = await imp('lib/flags.ts')
const TG = await imp('lib/canaux/telegram.ts')
const NOTIF = await imp('lib/canaux/notifications.ts')
const RES = await imp('lib/canaux/reseaux.ts')
const IMPORT = await imp('lib/canaux/importProspects.ts')
const REG = await imp('lib/canaux/regles.ts')
const LIB = await imp('lib/canaux/libelles.ts')
const RANG = await imp('lib/canaux/rangement.ts')
const QR = await imp('lib/qr.ts')
const DKIM = await imp('lib/canaux/dkim.ts')
const { lireMail } = await imp('lib/mailLite.ts')

const NEUFS = ['canauxTelegram', 'canauxNotifications', 'canauxLiens', 'importProspects']
const src = {
  webhook: sansCommentaires(lire('app/api/canaux/telegram/webhook/[canal]/route.ts')),
  liaison: sansCommentaires(lire('app/api/canaux/telegram/route.ts')),
  importRoute: sansCommentaires(lire('app/api/demandes/import/route.ts')),
  leads: sansCommentaires(lire('app/api/leads/route.ts')),
  plat: sansCommentaires(lire('app/p/[slug]/PlatChat.tsx')),
  conv: sansCommentaires(lire('app/plateforme/Conversations.tsx')),
  page: sansCommentaires(lire('app/messages/canaux/page.tsx')),
  serveur: sansCommentaires(lire('lib/canaux/serveur.ts')),
  releve: sansCommentaires(lire('lib/releveCanal.ts')),
  envois: sansCommentaires(lire('lib/envoisServeur.ts')),
  relances: sansCommentaires(lire('lib/relances.ts')),
  pSrv: sansCommentaires(lire('lib/pilote/serveur.ts')),
  pExe: sansCommentaires(lire('lib/pilote/executeur.ts')),
}

// ═══════════════════════ A. Drapeaux et marque blanche ═══════════════════════
{
  const flags = lire('lib/flags.ts')
  // 21/10/2026 : canauxTelegram, canauxLiens, importProspects LEVÉS après 0177 et l'audit offensif ; canauxNotifications reste baissé
  // tant que la vérification DKIM n'a pas lu un vrai e-mail de chaque réseau.
  const LEVES = ['canauxTelegram', 'canauxLiens', 'importProspects']
  T('A1 les 4 drapeaux neufs existent en FIN de lib/flags.ts, commentés et datés 21/10/2026 ; Telegram, liens et import LEVÉS, notifications BAISSÉ',
    NEUFS.every((f) => new RegExp(`21/10/2026 — [\\s\\S]{0,1400}${f}: (true|false),`).test(flags))
    && LEVES.every((f) => FLAGS[f] === true && new RegExp(`21/10/2026 — LEVÉ[\\s\\S]{0,600}${f}: true,`).test(flags))
    && FLAGS.canauxNotifications === false && /canauxNotifications: false,/.test(flags)
    && flags.indexOf('canauxTelegram: true') > flags.indexOf('facturesSituation: true') && /importProspects: true,\n\} as const/.test(flags))
  T('A2 les drapeaux d’avant restent baissés (canauxWhatsapp, canauxReseaux, canauxLeboncoin) : aucun n’est levé par ce chantier',
    FLAGS.canauxWhatsapp === false && FLAGS.canauxReseaux === false && FLAGS.canauxLeboncoin === false)
  T('A3 drapeau baissé → routes 404 AVANT toute lecture (webhook Telegram, liaison GET/POST/DELETE, import)',
    /export async function POST\(req: Request, ctx[^)]*\)[^{]*\{\s*if \(!actif\('canauxTelegram'\)\) return new Response\(null, \{ status: 404 \}\)/.test(src.webhook)
    && (src.liaison.match(/if \(!actif\('canauxTelegram'\)\) return introuvable\(\)/g) ?? []).length === 3
    && /try \{\s*if \(!actif\('importProspects'\)\) return NextResponse\.json\(\{ error: 'Introuvable' \}, \{ status: 404 \}\)/.test(src.importRoute))
  T('A4 drapeau baissé → rien dans le DOM : chaque bloc de Messages → Canaux est monté sous son drapeau',
    /actif\('canauxTelegram'\) && <CanauxTelegram \/>/.test(src.page) && /actif\('canauxNotifications'\) && <div/.test(src.page)
    && /actif\('canauxLiens'\) && <VosReseaux \/>/.test(src.page) && /actif\('importProspects'\) && <ImportProspects \/>/.test(src.page))
  T('A5 drapeau baissé → la relève ignore les notifications, /p n’envoie pas l’origine, /api/leads ne l’écrit pas, la liste ne la demande pas',
    /if \(actif\('canauxNotifications'\)\) \{\s*const n = lireNotificationReseau\(mail\)/.test(src.releve)
    && /if \(!actif\('canauxLiens'\)\) return/.test(src.plat)
    && /const origine = actif\('canauxLiens'\) \? lireOrigine\(body\?\.origine\) : null/.test(src.leads)
    && /const ORIGINE_LUE = actif\('canauxLiens'\) \|\| actif\('importProspects'\)/.test(src.conv) && /\+ \(ORIGINE_LUE \? ', origine' : ''\)/.test(src.conv))
  T('A6 la règle des canaux : Telegram sous canauxTelegram (Studio, canaux.whatsapp), les 10 réseaux lus par notification sous canauxNotifications (canaux.email)',
    REG.canalOuvert('telegram') === FLAGS.canauxTelegram && REG.capaciteCanal('telegram') === 'canaux.whatsapp' && LIB.CANAUX_NOTIFICATION.length === 10
    && LIB.CANAUX_NOTIFICATION.every((c) => !REG.canalOuvert(c) && REG.capaciteCanal(c) === 'canaux.email' && REG.estCanalConversation(c)))
  const textes = RES.ORIGINES.map((o) => RES.ficheReseau(o, 'Plomberie Fictive', RES.lienAvecSource('https://exemple-artisan.fr/demande', o)))
  const tout = JSON.stringify(textes)
  T('A7 MARQUE BLANCHE : aucun texte à coller (bio, accueil, note) ne dit « Presti », tous portent le nom de l’artisan ou son lien',
    !/presti/i.test(tout) && textes.filter((f) => f.accueil).every((f) => f.accueil.includes('Plomberie Fictive') && f.accueil.includes('https://exemple-artisan.fr/demande?src=')))
  const envoi = TG.requeteEnvoiTelegram('123456789:AAFixtureFixtureFixtureFixtureFixture1', '700000001', '**Bonjour**, je passe demain.')
  T('A8 MARQUE BLANCHE : le message Telegram part tel quel (texte brut, gras retiré), sans signature ni lien ajoutés',
    !('erreur' in envoi) && JSON.parse(envoi.init.body).text === 'Bonjour, je passe demain.' && !/presti/i.test(envoi.init.body) && JSON.parse(envoi.init.body).parse_mode === undefined)
  T('A9 MARQUE BLANCHE : l’écran « Vos réseaux » bâtit le lien avec urlPlateforme (domaine de l’artisan quand il en a un), jamais une adresse écrite en dur',
    /const base = urlPlateforme\(artisan\)/.test(sansCommentaires(lire('app/messages/canaux/VosReseaux.tsx'))) && !/prestiapp\.fr/.test(sansCommentaires(lire('app/messages/canaux/VosReseaux.tsx'))))
}

// ═══════════════════════ B. Telegram, module pur ═══════════════════════
const CLE = crypto.randomBytes(32).toString('base64')
const ID_A = '11111111-1111-4111-8111-111111111111'
const ID_B = '22222222-2222-4222-8222-222222222222'
{
  const JETON = '123456789:AAFixtureFixtureFixtureFixtureFixture1'
  T('B1 jeton BotFather reconnu (« <id>:<35 car.> ») ; espaces, faux format, chemin piégé refusés',
    TG.jetonTelegramValide(JETON) && TG.botIdDuJeton(JETON) === '123456789'
    && !TG.jetonTelegramValide(' ' + JETON) && !TG.jetonTelegramValide('123:abc') && !TG.jetonTelegramValide('123456789:AA/../../getUpdates?x=1234567890123456789'))
  const sA = TG.secretWebhookTelegram(CLE, ID_A), sB = TG.secretWebhookTelegram(CLE, ID_B)
  T('B2 secret du webhook DÉRIVÉ : stable, propre à chaque liaison, dans l’alphabet de Telegram (A-Z a-z 0-9 _ -), absent sans clé',
    sA && sA === TG.secretWebhookTelegram(CLE, ID_A) && sA !== sB && /^[A-Za-z0-9_-]{43}$/.test(sA)
    && TG.secretWebhookTelegram(null, ID_A) === null && TG.secretWebhookTelegram('court', ID_A) === null && TG.secretWebhookTelegram(CLE, 'pas-un-uuid') === null)
  T('B3 IDOR : le secret de la liaison A n’ouvre PAS le chemin de la liaison B ; en-tête absent, vide ou trop long refusé',
    TG.verifierSecretTelegram(sA, sA) && !TG.verifierSecretTelegram(sA, sB) && !TG.verifierSecretTelegram(null, sA) && !TG.verifierSecretTelegram('', sA)
    && !TG.verifierSecretTelegram('x'.repeat(300), sA) && !TG.verifierSecretTelegram(sA, null))
  const autreCle = crypto.randomBytes(32).toString('base64')
  T('B4 le secret dépend de CANAUX_KEY : une autre clé donne un autre secret (une clé changée coupe les webhooks, rien ne s’ouvre)', TG.secretWebhookTelegram(autreCle, ID_A) !== sA)
  T('B5 adresse du webhook : https seulement, chemin /api/canaux/telegram/webhook/<id>, rien d’autre accepté',
    TG.urlWebhookTelegram('https://prestiapp.fr', ID_A) === `https://prestiapp.fr/api/canaux/telegram/webhook/${ID_A}`
    && TG.urlWebhookTelegram('http://prestiapp.fr', ID_A) === null && TG.urlWebhookTelegram('https://u:p@prestiapp.fr', ID_A) === null && TG.urlWebhookTelegram('https://prestiapp.fr', '../x') === null)
  const pose = TG.requeteSetWebhook(JETON, 'https://prestiapp.fr/api/canaux/telegram/webhook/' + ID_A, sA)
  const corpsPose = 'erreur' in pose ? {} : JSON.parse(pose.init.body)
  T('B6 setWebhook : secret_token, messages seulement, anciens messages non déversés',
    corpsPose.secret_token === sA && JSON.stringify(corpsPose.allowed_updates) === '["message"]' && corpsPose.drop_pending_updates === true
    && 'erreur' in TG.requeteSetWebhook(JETON, 'http://x', sA) && 'erreur' in TG.requeteSetWebhook(JETON, 'https://x', 'a b'))
  const p = TG.lireUpdateTelegram(json('telegram-prive.json'))
  T('B7 message privé lu : chat, clé <chat>:<message>, nom, texte, date', p?.chat_id === '700000001' && p.id_message === '700000001:11' && p.nom === 'Nina Fictive' && /chaudière/.test(p.texte) && p.recu_le === new Date(1792564200 * 1000).toISOString() && p.telephone === null)
  const ph = TG.lireUpdateTelegram(json('telegram-photo.json'))
  T('B8 photo avec légende → « [photo] légende », pièce jointe', ph?.texte === '[photo] Voilà la fuite' && ph.piece_jointe === true)
  T('B9 fiche contact : le numéro n’est gardé QUE si c’est celle du client lui-même', TG.lireUpdateTelegram(json('telegram-contact.json'))?.telephone === '+33639980001' && TG.lireUpdateTelegram(json('telegram-contact-tiers.json'))?.telephone === null)
  T('B10 « /start » devient un premier contact lisible', TG.lireUpdateTelegram(json('telegram-start.json'))?.texte === 'Bonjour (premier contact par Telegram)')
  T('B11 ignorés : groupe, message d’un bot, message modifié, corps illisible',
    TG.lireUpdateTelegram(json('telegram-groupe.json')) === null && TG.lireUpdateTelegram(json('telegram-bot.json')) === null && TG.lireUpdateTelegram(json('telegram-edite.json')) === null
    && TG.lireUpdateTelegram(null) === null && TG.lireUpdateTelegram('{') === null && TG.lireUpdateTelegram({ message: { chat: { type: 'private', id: '1' } } }) === null)
  T('B12 getMe : un bot, le bon (id du jeton), avec un nom d’utilisateur ; sinon refus',
    !('erreur' in TG.lireGetMe({ ok: true, result: { id: 123456789, is_bot: true, first_name: 'Plomberie Fictive', username: 'plomberie_fictive_bot' } }, JETON))
    && 'erreur' in TG.lireGetMe({ ok: true, result: { id: 999, is_bot: true, username: 'x_bot' } }, JETON)
    && 'erreur' in TG.lireGetMe({ ok: true, result: { id: 123456789, is_bot: false, username: 'humain' } }, JETON) && 'erreur' in TG.lireGetMe({ ok: false }, JETON))
  T('B13 erreurs classées : 401 jeton, 403 client qui a bloqué le bot, 429 débit, 400 conversation introuvable ; message sans la description brute',
    TG.lireErreurTelegram(401, null).genre === 'jeton' && TG.lireErreurTelegram(403, { error_code: 403, description: 'Forbidden: bot was blocked by the user' }).genre === 'bloque'
    && TG.lireErreurTelegram(429, null).genre === 'debit' && TG.lireErreurTelegram(400, { error_code: 400, description: 'Bad Request: chat not found' }).genre === 'destinataire'
    && !/Forbidden|Bad Request/.test(TG.messageErreurTelegram(TG.lireErreurTelegram(403, { description: 'Forbidden: x' }))))
  T('B14 envoi refusé AVANT le réseau : texte vide, trop long (> 4096), destinataire illisible, jeton illisible',
    'erreur' in TG.requeteEnvoiTelegram(JETON, '700000001', '  ') && 'erreur' in TG.requeteEnvoiTelegram(JETON, '700000001', 'x'.repeat(4097))
    && 'erreur' in TG.requeteEnvoiTelegram(JETON, '7000;drop', 'ok') && 'erreur' in TG.requeteEnvoiTelegram('', '700000001', 'ok'))
}

// ═══════════════════════ C. Telegram, rangement (magasin en mémoire) ═══════════════════════
function magasinMemoire() {
  const marques = new Set(), leads = new Map(), messages = []
  let n = 0
  return {
    marques, leads, messages,
    async liaison() { return null },
    async marquer(c, id) { const k = `${c}|${id}`; if (marques.has(k)) return false; marques.add(k); return true },
    async oublier(c, id) { marques.delete(`${c}|${id}`) },
    async ouvrirConversation(l) {
      for (const [id, x] of leads) if (x.artisan_id === l.artisan_id && x.canal === l.canal && x.canal_externe_id === l.canal_externe_id) return { id, statut: x.statut, nouveau: false }
      const id = `lead-${++n}`
      leads.set(id, { ...l, statut: 'nouveau' })
      return { id, statut: 'nouveau', nouveau: true }
    },
    async rafraichir(id, champs) { Object.assign(leads.get(id), champs) },
    async ajouterMessage(m) { messages.push(m); return `msg-${messages.length}` },
  }
}
{
  const m = magasinMemoire()
  const liaisonA = { id: ID_A, artisan_id: 'artisan-A', type: 'telegram', actif: true, externe_id: '111111111' }
  const liaisonB = { id: ID_B, artisan_id: 'artisan-B', type: 'telegram', actif: true, externe_id: '222222222' }
  const e = TG.lireUpdateTelegram(json('telegram-prive.json'))
  const r1 = await RANG.rangerEntrantTelegram(e, liaisonA, m)
  const r2 = await RANG.rangerEntrantTelegram(e, liaisonA, m)
  T('C1 routage : le message du bot de A est rangé chez A, canal telegram, personne = <id du bot>:<chat>', r1.etat === 'range' && r1.r.artisan_id === 'artisan-A' && r1.r.canal === 'telegram' && [...m.leads.values()][0].canal_externe_id === '111111111:700000001')
  T('C2 idempotence : le rejeu de Telegram (même <chat>:<message>) ne range rien de plus', r2.etat === 'doublon' && m.messages.length === 1)
  const r3 = await RANG.rangerEntrantTelegram(TG.lireUpdateTelegram(json('telegram-photo.json')), liaisonA, m)
  T('C3 deuxième message du même client → même fil', r3.etat === 'range' && r3.r.lead_id === r1.r.lead_id && !r3.r.nouveau && m.leads.size === 1)
  const r4 = await RANG.rangerEntrantTelegram(TG.lireUpdateTelegram(json('telegram-autre-client.json')), liaisonA, m)
  T('C4 un autre client → un autre fil', r4.etat === 'range' && r4.r.nouveau && m.leads.size === 2)
  const r5 = await RANG.rangerEntrantTelegram(e, liaisonB, m)
  T('C5 le même identifiant de message reçu par le bot de B est rangé chez B (la marque est par liaison), jamais chez A', r5.etat === 'range' && r5.r.artisan_id === 'artisan-B' && [...m.leads.values()].filter((l) => l.artisan_id === 'artisan-B').length === 1)
  T('C6 liaison coupée, d’un autre type, ou sans identifiant de bot → rien rangé',
    (await RANG.rangerEntrantTelegram(e, { ...liaisonA, actif: false }, magasinMemoire())).etat === 'inconnu' && (await RANG.rangerEntrantTelegram(e, { ...liaisonA, type: 'whatsapp' }, magasinMemoire())).etat === 'inconnu'
    && (await RANG.rangerEntrantTelegram(e, { ...liaisonA, externe_id: null }, magasinMemoire())).etat === 'inconnu')
  // Le même bot RECONNECTÉ (nouvelle ligne `canaux`, même identifiant de bot) : le fil d'avant est retrouvé et suit la nouvelle liaison.
  const reco = { ...liaisonA, id: '33333333-3333-4333-8333-333333333333' }
  const r6 = await RANG.rangerEntrantTelegram({ ...e, id_message: '700000001:99' }, reco, m)
  T('C7 bot reconnecté : même fil, et canal_id suit la NOUVELLE liaison (la réponse repart au lieu de « déconnecté »)', r6.etat === 'range' && r6.r.lead_id === r1.r.lead_id && m.leads.get(r1.r.lead_id).canal_id === reco.id)
  const autreBot = { ...liaisonA, id: '44444444-4444-4444-8444-444444444444', externe_id: '555555555' }
  const r7 = await RANG.rangerEntrantTelegram({ ...e, id_message: '700000001:100' }, autreBot, m)
  T('C8 le même client écrit à un AUTRE bot du même artisan → un autre fil (jamais de réponse par le mauvais bot)', r7.etat === 'range' && r7.r.lead_id !== r1.r.lead_id)
}

// ═══════════════════════ D. Telegram, routes et envoi (sources) ═══════════════════════
{
  const w = src.webhook
  const ordre = ['actif(\'canauxTelegram\')', 'estIdLiaison(canal)', 'secretWebhookTelegram(process.env.CANAUX_KEY, canal)', 'return new Response(null, { status: 503 })', 'verifierSecretTelegram(req.headers.get(\'x-telegram-bot-api-secret-token\'), attendu)', 'lireCorps(req, MAX_OCTETS)', 'liaisonTelegram(canal)', 'lireUpdateTelegram(corps)', 'rangerEntrantTelegram(e, liaison, magasinCanaux)']
  const pos = ordre.map((x) => w.indexOf(x))
  T('D1 webhook : drapeau → id → clé (503 sans CANAUX_KEY) → SECRET (401) → corps borné → liaison relue → lecture → rangement, dans cet ordre',
    pos.every((p, i) => p !== -1 && (i === 0 || p > pos[i - 1])) && /status: 401/.test(w), JSON.stringify(pos))
  T('D2 webhook : liaison coupée ou absente → 200 sans rien ranger ; la préparation de la réponse (IA, pilote) se fait APRÈS la réponse (after)',
    /if \(!liaison \|\| !liaison\.actif\) return Response\.json\(\{ ok: true \}\)/.test(w) && /after\(async \(\) => \{ await preparerReponseCanal/.test(w) && !/console\.(log|error|warn)\([^)]*(corps|brut|texte|jeton)/.test(w))
  T('D3 la liaison est lue par son id ET son type (une ligne e-mail ou WhatsApp ne sert jamais de bot)', /from\('canaux'\)\.select\('id, artisan_id, type, actif, externe_id'\)\.eq\('id', id\)\.eq\('type', 'telegram'\)/.test(src.serveur))
  const l = src.liaison
  T('D4 liaison : session + offre (exigerCapacite canaux.whatsapp), refus 503 sans chiffrement, plafond d’essais, jeton vérifié (getMe) AVANT écriture',
    (l.match(/exigerCapacite\(req, 'canaux\.whatsapp', SUJET\)/g) ?? []).length === 2 && /if \(!chiffrementDisponible\(\) \|\| !cle\) return NextResponse\.json\([^)]*\{ status: 503 \}\)/.test(l)
    && /consommerLimite\(`telegram:liaison:\$\{g\.uid\}`/.test(l) && l.indexOf('lireGetMe(') < l.indexOf("from('canaux').insert(ligne)"))
  T('D5 jeton CHIFFRÉ au repos (chiffrer) et jamais renvoyé (le GET ne sélectionne pas `secret`)', /secret: chiffrer\(jeton\)/.test(l) && /select\('id, libelle, adresse, actif, derniere_erreur, cree_le'\)/.test(l) && !/\.json\(\{[^)]*?[{,]\s*jeton\s*[,}:]/.test(l))
  T('D6 un bot relié à un AUTRE espace → 409 sans dire lequel ; course perdue sur l’index unique → 409',
    /deja && deja\.artisan_id !== g\.uid\) return NextResponse\.json\(\{ error: 'Ce bot est déjà relié à un autre espace[^}]*\}, \{ status: 409 \}\)/.test(l) && /duplicate\|unique/.test(l))
  T('D7 IDOR : la mise à jour, la suppression et la lecture portent artisan_id = uid de la SESSION (jamais du corps)',
    /\.update\(ligne\)\.eq\('id', deja\.id\)\.eq\('artisan_id', g\.uid\)/.test(l) && /\.select\('id, secret'\)\.eq\('id', id\)\.eq\('artisan_id', s\.uid\)\.eq\('type', 'telegram'\)/.test(l)
    && /\.delete\(\)\.eq\('id', id\)\.eq\('artisan_id', s\.uid\)\.eq\('type', 'telegram'\)/.test(l) && !/b\?\.(artisan_id|uid)/.test(l))
  T('D8 webhook posé avec le secret de CETTE liaison ; refusé par Telegram → la liaison neuve est retirée (pas de bot fantôme)',
    /secretWebhookTelegram\(cle, id\)/.test(l) && /if \(!deja\) await supabaseAdmin\.from\('canaux'\)\.delete\(\)\.eq\('id', id\)\.eq\('artisan_id', g\.uid\)/.test(l))
  T('D9 déconnexion : deleteWebhook chez Telegram, puis la liaison ; les conversations restent', /requeteDeleteWebhook\(jeton\)/.test(l) && l.indexOf('requeteDeleteWebhook(jeton)') < l.lastIndexOf(".delete().eq('id', id)"))
  const s = src.serveur
  T('D10 envoi : offre vérifiée, liaison de CE compte (ligneCanal(…, artisan_id)), active et de type telegram, jeton déchiffré ; adresse jamais journalisée',
    /async function envoyerTelegram[\s\S]{0,300}formuleCanal\(canal,/.test(s) && /const c = await ligneCanal\(lead\.canal_id, lead\.artisan_id\)\s*if \(!c \|\| !c\.actif \|\| c\.type !== canal\)/.test(s)
    && /requeteEnvoiTelegram\(jeton \?\? '', chatId, texte\)/.test(s) && !/console\.[a-z]+\([^)]*req\.url/.test(s))
  T('D11 Telegram n’a pas de fenêtre de 24 h (le client a écrit le premier) : l’envoi Telegram part AVANT le contrôle de fenêtre de Meta',
    s.indexOf("if (canal === 'telegram') return envoyerTelegram(lead, texte, f)") !== -1 && s.indexOf("if (canal === 'telegram') return envoyerTelegram(lead, texte, f)") < s.indexOf('if (!fenetreOuverte(lead.canal_dernier_entrant_le))'))
}

// ═══════════════════════ E. Notifications e-mail des réseaux sans API ═══════════════════════
// Les e-mails sont SIGNÉS ici (DKIM, clés de test générées à chaque passage, jamais écrites) par un signataire propre à la suite ; la
// vérification est celle de la production (lib/canaux/dkim.ts), avec une table DNS en mémoire.
const CLES = {}
const DNS = new Map()
function cleDeTest(domaine, selecteur = 'fixture', algo = 'rsa') {
  const k = `${selecteur}._domainkey.${domaine}`
  if (!CLES[k]) {
    const paire = algo === 'rsa' ? crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }) : crypto.generateKeyPairSync('ed25519')
    const spki = paire.publicKey.export({ format: 'der', type: 'spki' })
    DNS.set(k, [[`v=DKIM1; k=${algo}; p=${(algo === 'rsa' ? spki : spki.subarray(spki.length - 32)).toString('base64')}`]])
    CLES[k] = paire.privateKey
  }
  return CLES[k]
}
const resoudreDeTest = async (nom) => DNS.get(nom) ?? []
// Le signataire de la suite (RFC 6376, relaxed/relaxed par défaut) — écrit séparément du vérificateur de production.
function signer(brut, { d, s = 'fixture', algo = 'rsa-sha256', c = 'relaxed/relaxed', h = ['from', 'to', 'subject', 'date', 'message-id'], cle, extra = '' }) {
  const i = brut.indexOf('\r\n\r\n')
  const tete = brut.slice(0, i), corps = brut.slice(i + 4)
  const [ce, cc] = c.split('/')
  const lignesCorps = corps.split('\r\n').map((l) => (cc === 'relaxed' ? l.replace(/[ \t]+/g, ' ').replace(/ $/, '') : l))
  while (lignesCorps.length && lignesCorps[lignesCorps.length - 1] === '') lignesCorps.pop()
  const corpsCanon = lignesCorps.length ? lignesCorps.join('\r\n') + '\r\n' : (cc === 'relaxed' ? '' : '\r\n')
  const bh = crypto.createHash('sha256').update(Buffer.from(corpsCanon, 'binary')).digest('base64')
  const champs = []
  for (const l of tete.split('\r\n')) { if (/^[ \t]/.test(l)) champs[champs.length - 1] += '\r\n' + l; else champs.push(l) }
  const canon = (champ) => {
    if (ce !== 'relaxed') return champ
    const k = champ.indexOf(':')
    return champ.slice(0, k).trim().toLowerCase() + ':' + champ.slice(k + 1).replace(/\r\n(?=[ \t])/g, '').replace(/[ \t]+/g, ' ').trim()
  }
  const pris = new Set()
  let donnees = ''
  for (const nom of h) {
    for (let j = champs.length - 1; j >= 0; j--) {
      if (pris.has(j) || champs[j].slice(0, champs[j].indexOf(':')).trim().toLowerCase() !== nom) continue
      pris.add(j); donnees += canon(champs[j]) + '\r\n'; break
    }
  }
  const valeur = `v=1; a=${algo}; c=${c}; d=${d}; s=${s}; h=${h.join(':')};${extra} bh=${bh}; b=`
  donnees += canon(`DKIM-Signature: ${valeur}`)
  const octetsDonnees = Buffer.from(donnees, 'binary')
  const sig = algo === 'rsa-sha256' ? crypto.sign('sha256', octetsDonnees, cle) : crypto.sign(null, crypto.createHash('sha256').update(octetsDonnees).digest(), cle)
  return `DKIM-Signature: ${valeur}${sig.toString('base64')}\r\n${brut}`
}
const brutDe = (f) => fixture(f).toString('binary')
/** Comme la relève : lireMail, puis NOTRE vérification DKIM. */
async function relu(brut) { return { ...lireMail(brut), dkim_valides: await DKIM.signaturesDkimValides(brut, resoudreDeTest) } }
const signeRsa = (f, d) => signer(brutDe(f), { d, cle: cleDeTest(d) })
{
  const attendus = {
    'linkedin-message.eml': ['linkedin.com', 'linkedin', 'Camille Fictive', /cuisine de 12 m2/, 'https://www.linkedin.com/comm/messaging/thread/'],
    'facebook-page-message.eml': ['facebookmail.com', 'facebook', 'Julien Exemple', /fuite sous l'évier/, 'https://business.facebook.com/latest/inbox/'],
    'instagram-message.eml': ['mail.instagram.com', 'instagram_notif', 'Léa Fictive', /terrasse en bois/, 'https://www.instagram.com/direct/t/'],
    'tiktok-message.eml': ['tiktok.com', 'tiktok', 'Hugo Exemple', null, 'https://www.tiktok.com/messages'],
    '123devis-demande.eml': ['123devis.com', '123devis', 'Martin Fictif', /trois chambres/, 'https://www.123devis.com/pro/demandes/'],
    'houzz-message.eml': ['houzz.fr', 'houzz', 'Sophie Exemple', /salle de bain/, 'https://www.houzz.fr/messages/thread/'],
  }
  const lus = {}
  for (const [f, [d]] of Object.entries(attendus)) lus[f] = NOTIF.lireNotificationReseau(await relu(signeRsa(f, d)))
  const ko = Object.entries(attendus).filter(([f, [, canal, nom, texte, lien]]) => { const n = lus[f]; return !n || n.canal !== canal || n.nom !== nom || (texte ? !texte.test(n.texte ?? '') : n.texte !== null) || !n.lien.startsWith(lien) })
  T('E1 notifications SIGNÉES par le réseau (DKIM vérifié par nous) et validées par le serveur de la boîte : réseau, nom, extrait, lien profond (LinkedIn, Facebook, Instagram, TikTok, 123devis, Houzz)', ko.length === 0, ko.map(([f]) => `${f}: ${JSON.stringify(lus[f])}`).join(' | '))
  T('E2 clé de conversation stable tirée du lien (chemin ou ?selected_item_id=)', lus['linkedin-message.eml']?.cle_conversation === 'linkedin:c:2-FIXTUREthreadAAA111=' && lus['facebook-page-message.eml']?.cle_conversation === 'facebook:c:FIXTURE00123')
  T('E3 ANTI-HAMEÇONNAGE : « LinkedIn » d’un autre domaine (linkedln.com), d’une boîte Gmail au nom affiché « LinkedIn », d’un faux sous-domaine → ignoré, même signés par leur propre domaine',
    (await Promise.all([['faux-linkedln-domaine.eml', 'linkedln.com'], ['faux-linkedin-gmail.eml', 'gmail.com'], ['faux-linkedin-sous-domaine.eml', 'linkedin.com.verif-compte.example']]
      .map(async ([f, d]) => NOTIF.lireNotificationReseau(await relu(signeRsa(f, d)))))).every((x) => x === null))
  T('E4 ANTI-HAMEÇONNAGE : bon domaine mais dmarc=fail, ou signature d’un AUTRE domaine → ignoré',
    NOTIF.lireNotificationReseau(await relu(signeRsa('faux-linkedin-dmarc-fail.eml', 'linkedin.com'))) === null && NOTIF.lireNotificationReseau(await relu(signer(brutDe('faux-linkedin-dkim-autre.eml'), { d: 'forge.example', cle: cleDeTest('forge.example') }))) === null)
  const deux = await relu(brutDe('faux-linkedin-deux-entetes.eml'))
  T('E5 E1 de l’audit — DEUX en-têtes Authentication-Results : le PREMIER (serveur de la boîte, « dkim=none ») est lu, pas celui que l’expéditeur a écrit plus bas ; rien n’est rangé',
    /dkim=none/.test(deux.authentification ?? '') && NOTIF.lireNotificationReseau(deux) === null)
  T('E6 E1 de l’audit — en-tête « dkim=pass header.d=linkedin.com » parfait mais AUCUNE signature vérifiable (ou signée par une autre clé) → ignoré',
    NOTIF.lireNotificationReseau(await relu(brutDe('linkedin-message.eml'))) === null
    && NOTIF.lireNotificationReseau(await relu(signer(brutDe('linkedin-message.eml'), { d: 'linkedin.com', s: 'autre', cle: crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey }))) === null)
  T('E7 (inversé par l’audit, M4) — SANS en-tête d’authentification du serveur : NON vérifié → pas une notification (même signé)', NOTIF.lireNotificationReseau(await relu(signeRsa('pagesjaunes-sans-auth.eml', 'pagesjaunes.fr'))) === null)
  T('E8 verdict d’authentification : dkim=pass ALIGNÉ seulement ; dmarc=pass seul ne suffit plus ; absent = « absent »',
    NOTIF.verdictAuthentification('dkim=pass header.i=@linkedin.com; dmarc=pass header.from=linkedin.com', ['linkedin.com']) === 'ok'
    && NOTIF.verdictAuthentification('spf=pass; dkim=none; dmarc=pass header.from=linkedin.com', ['linkedin.com']) === 'echec'
    && NOTIF.verdictAuthentification('dkim=pass header.d=linkedin.com.evil.example', ['linkedin.com']) === 'echec'
    && NOTIF.verdictAuthentification('spf=softfail; dkim=none', ['linkedin.com']) === 'echec' && NOTIF.verdictAuthentification(null, ['linkedin.com']) === 'absent')
  const ext = NOTIF.lireNotificationReseau(await relu(signeRsa('linkedin-lien-externe.eml', 'linkedin.com')))
  const redir = NOTIF.lireNotificationReseau(await relu(signeRsa('linkedin-redirecteur.eml', 'linkedin.com')))
  T('E9 lien : https, hôte du réseau, CHEMIN d’une conversation — jamais un redirecteur (linkedin.com/redir, ?url=, l.facebook.com/l.php, fb.me, lnkd.in) ni un autre domaine (repli : la messagerie du réseau)',
    ext?.lien === 'https://www.linkedin.com/messaging/' && redir?.lien === 'https://www.linkedin.com/messaging/'
    && NOTIF.lienSur('https://linkedin.com.evil.example/x', ['linkedin.com']) === null && NOTIF.lienSur('http://www.linkedin.com/x', ['linkedin.com']) === null
    && NOTIF.lienSur('https://l.facebook.com/l.php?u=https%3A%2F%2Fevil.example', ['facebook.com']) === null && NOTIF.lienSur('https://www.facebook.com/l.php?u=x', ['facebook.com']) === null
    && NOTIF.lienSur('https://www.linkedin.com/redir/redirect?url=x', ['linkedin.com']) === null && NOTIF.lienSur('https://fb.me/x', ['fb.me']) === null
    && NOTIF.lienSur('https://www.linkedin.com/messaging/thread/x/', ['linkedin.com']) !== null)
  T('E10 pas un message de client (alerte emploi LinkedIn) → ignoré', NOTIF.lireNotificationReseau(await relu(signeRsa('linkedin-offre-emploi.eml', 'linkedin.com'))) === null)
  T('E11 Google n’est PAS lu (sa messagerie est arrêtée depuis le 31/07/2024) : aucun domaine google dans la liste',
    !NOTIF.RESEAUX_NOTIFICATION.some((r) => r.domaines.some((d) => /google/.test(d))) && /31\/07\/2024/.test(lire('lib/canaux/notifications.ts')))
  // Sans lien de conversation ni nom : deux notifications différentes ne fusionnent JAMAIS en un fil.
  const anonyme = (texte) => ({ de: { nom: null, email: 'messages-noreply@linkedin.com' }, sujet: 'Vous avez un nouveau message', texte, html: '', authentification: 'mx; dkim=pass header.d=linkedin.com', dkim_valides: ['linkedin.com'] })
  const a1 = NOTIF.lireNotificationReseau(anonyme('Vous avez un nouveau message. Ouvrez LinkedIn.')), a2 = NOTIF.lireNotificationReseau(anonyme('Vous avez un nouveau message (2). Ouvrez LinkedIn.'))
  T('E12 sans lien ni nom : une clé par notification (empreinte du contenu) — deux clients au même objet ne fusionnent pas', !!a1 && !!a2 && a1.cle_conversation !== a2.cle_conversation && a1.cle_conversation === NOTIF.lireNotificationReseau(anonyme('Vous avez un nouveau message. Ouvrez LinkedIn.'))?.cle_conversation)
  const m = magasinMemoire()
  const boite = { id: 'boite-A', artisan_id: 'artisan-A', type: 'email', actif: true }
  const n = lus['linkedin-message.eml']
  const a = await RANG.rangerNotificationReseau({ ...n, texte: NOTIF.contenuEntrantReseau(n) }, boite, '<fixture-li-0001@linkedin.com>', '2026-10-21T06:30:00.000Z', m)
  const b = await RANG.rangerNotificationReseau({ ...n, texte: NOTIF.contenuEntrantReseau(n) }, boite, '<fixture-li-0001@linkedin.com>', '2026-10-21T06:30:00.000Z', m)
  const lead = [...m.leads.values()][0]
  T('E13 rangement : canal du réseau, contact VIDE (l’adresse est celle du réseau), lien où coller la réponse ; relève répétée (même Message-ID) = doublon',
    a.etat === 'range' && b.etat === 'doublon' && lead.canal === 'linkedin' && lead.contact === null && lead.canal_lien_reponse.startsWith('https://www.linkedin.com/') && m.messages.length === 1)
  T('E14 sans extrait, le message rangé dit où lire (pas de texte inventé) ; l’IA ne prépare pas de réponse à un message qu’elle n’a pas lu',
    /ouvrez la conversation sur TikTok/.test(NOTIF.contenuEntrantReseau(lus['tiktok-message.eml'])) && /const avecIA = !!n\.texte &&/.test(src.releve))
  const r = src.releve
  T('E15 relève : signature DKIM vérifiée par NOUS (DNS, 4 s au plus, mémorisé) pour tout expéditeur qui se dit d’un réseau, AVANT la reconnaissance ; notifications reconnues AVANT le filtre des expéditeurs automatiques, idempotentes par Message-ID, plafonnées',
    /expediteurDeReseau\(lu\.de\.email\)/.test(r) && /dkim_valides: await signaturesDkimValides\(msg\.source, resolveur \?\?= resolveurDkim\(\)\)/.test(r)
    && r.indexOf('signaturesDkimValides(msg.source') < r.indexOf('lireNotificationLeboncoin(mail)') && r.indexOf('lireNotificationReseau(mail)') < r.indexOf('if (!estUneVraieDemande(')
    && /rangerNotificationReseau\([\s\S]{0,300}mail\.messageId/.test(r) && /MAX_PREPARATIONS_LBC/.test(r) && /setTimeout\(\(\) => non\(new Error\('dns lent'\)\), 4_000\)/.test(r))
  T('E16 Le Bon Coin suit la même règle : dkim=pass aligné dans le PREMIER en-tête ET signature vérifiée par nous',
    /verdictAuthentification\(mail\.authentification, \['leboncoin\.fr'\]\) !== 'ok'\) return null\s*if \(!signeePar\(mail\.dkim_valides, \['leboncoin\.fr'\]\)\) return null/.test(sansCommentaires(lire('lib/canaux/leboncoin.ts'))))
  T('E17 lib/mailLite.ts garde le PREMIER Authentication-Results (celui du serveur de la boîte)', /if \(nom === 'authentication-results' && nom in entetes\) continue/.test(sansCommentaires(lire('lib/mailLite.ts'))))
  T('E18 réponse : canal manuel → « copier et ouvrir » le lien de la conversation, RE-vérifié avant d’être ouvert (https, domaine du réseau) ; jamais d’envoi par une voie non officielle',
    /if \(estCanalManuel\(canal\)\) \{[\s\S]{0,400}manuel: \{ lien: lienReponseManuelle\(canal, lead\.canal_lien_reponse\)/.test(src.serveur)
    && /`Copier et ouvrir \$\{canalSel\}`/.test(src.conv) && /const lienManuel = lienReponseManuelle\(/.test(src.conv)
    && LIB.lienReponseManuelle('linkedin', 'https://www.linkedin.com/messaging/thread/x/') === 'https://www.linkedin.com/messaging/thread/x/'
    && LIB.lienReponseManuelle('linkedin', 'http://www.linkedin.com/messaging/') === 'https://www.linkedin.com/messaging/'
    && LIB.lienReponseManuelle('linkedin', 'https://evil.example/') === 'https://www.linkedin.com/messaging/' && LIB.lienReponseManuelle('linkedin', 'javascript:alert(1)') === 'https://www.linkedin.com/messaging/'
    && LIB.lienReponseManuelle('houzz', null) === 'https://www.houzz.fr/' && LIB.lienReponseManuelle('telegram', 'https://x.fr') === null)
  T('E19 la promesse de l’écran est celle du code : signature vérifiée par la messagerie ET par nous, aucun lien repris',
    /signature électronique du réseau \(DKIM\), vérifiée par votre messagerie ET par nous/.test(src.page) && !/un faux « LinkedIn » est ignoré\./.test(src.page))
}

// ═══════════════════════ F. Vos réseaux : origine, liens, page, pastille ═══════════════════════
{
  T('F1 origine en LISTE FERMÉE : instagram, LinkedIn (casse), whatsapp acceptés ; inconnu, injection, trop long, non-texte refusés',
    RES.lireOrigine('instagram') === 'instagram' && RES.lireOrigine(' LinkedIn ') === 'linkedin' && RES.lireOrigine('whatsapp') === 'whatsapp'
    && RES.lireOrigine('evil') === null && RES.lireOrigine('<script>') === null && RES.lireOrigine("instagram' or 1=1") === null && RES.lireOrigine('x'.repeat(50)) === null && RES.lireOrigine(42) === null && RES.lireOrigine(null) === null)
  T('F2 lien marqué : ?src= ajouté (ou remplacé) proprement, même sur un domaine perso', RES.lienAvecSource('https://exemple-artisan.fr/demande', 'tiktok') === 'https://exemple-artisan.fr/demande?src=tiktok' && RES.lienAvecSource('https://prestiapp.fr/p/a?src=x', 'carte') === 'https://prestiapp.fr/p/a?src=carte')
  const mig = lire('supabase/migrations/0177_canaux_reseaux.sql')
  const listeSql = (mig.match(/leads_origine_connue check \(origine is null or origine in \(([\s\S]*?)\)\)/)?.[1] ?? '').match(/'([a-z_]+)'/g)?.map((x) => x.slice(1, -1)) ?? []
  T('F3 la liste fermée du code (lib/canaux/reseaux.ts) et la contrainte de 0177 sont la MÊME', listeSql.length === RES.ORIGINES.length && RES.ORIGINES.every((o) => listeSql.includes(o)), listeSql.join(','))
  T('F4 /api/leads écrit l’origine SEULEMENT drapeau levé et validée ; colonne absente (0177 pas collée) → la demande est gardée sans origine (jamais perdue)',
    /\.insert\(origine \? \{ \.\.\.ligneLead, origine \} : ligneLead\)/.test(src.leads) && /if \(lErr && origine && \/origine\/i\.test\(lErr\.message\)\)/.test(src.leads))
  T('F5 la page /p lit ?src= une fois (drapeau levé), le valide (lireOrigine) et ne le joint qu’à la PREMIÈRE demande',
    /setOrigine\(lireOrigine\(new URLSearchParams\(window\.location\.search\)\.get\('src'\)\)\)/.test(src.plat) && /deferContact: true, \.\.\.\(origine \? \{ origine \} : \{\}\)/.test(src.plat) && (src.plat.match(/origine \? \{ origine \}/g) ?? []).length === 1)
  T('F6 pastille dans la messagerie : « via Instagram » (page), « À contacter · TikTok » (import) ; valeur relue par la liste fermée',
    /const o = lireOrigine\(l\.origine\)/.test(src.conv) && /`À contacter\$\{o \?/.test(src.conv) && /`via \$\{LIBELLE_ORIGINE\[o\]\}`/.test(src.conv))
  T('F7 Le Bon Coin : aucun lien suggéré dans l’annonce (ses règles l’interdisent) ; Google : la note dit l’arrêt de la messagerie',
    RES.ficheReseau('leboncoin', 'X', 'https://e.fr').bio === '' && /31\/07\/2024/.test(RES.ficheReseau('google', 'X', 'https://e.fr').note ?? ''))
}

// ═══════════════════════ G. QR code ═══════════════════════
{
  const q = QR.qrCode('https://exemple-artisan.fr/demande?src=carte')
  const finder = (x0, y0) => { for (let dy = 0; dy < 7; dy++) for (let dx = 0; dx < 7; dx++) { const d = Math.max(Math.abs(dx - 3), Math.abs(dy - 3)); if (q.modules[y0 + dy][x0 + dx] !== (d !== 2)) return false } return true }
  const t = q.taille
  T('G1 structure : taille 4v+17, trois motifs de repérage, motif de synchronisation alterné, module sombre fixe',
    t === q.version * 4 + 17 && finder(0, 0) && finder(t - 7, 0) && finder(0, t - 7) && Array.from({ length: t - 16 }, (_, i) => i + 8).every((i) => q.modules[6][i] === (i % 2 === 0)) && q.modules[t - 8][8] === true)
  T('G2 Reed-Solomon : le reste d’un mot de code complet est nul (corps de Galois, polynôme 0x11D)',
    (() => { const d = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17], div = QR.diviseurRS(10), e = QR.resteRS(d, div); return QR.resteRS([...d, ...e], div).every((x) => x === 0) && e.join(',') === '196,35,39,119,235,215,231,226,93,23' })())
  // Bits de format relus dans la matrice (coin haut-gauche) et recalculés ICI (BCH(15,5), polynôme 0x537, masque 0x5412) :
  // niveau M (00) et le masque annoncé.
  const lus = [0, 1, 2, 3, 4, 5].map((i) => q.modules[i][8]).concat([q.modules[7][8], q.modules[8][8], q.modules[8][7]], [9, 10, 11, 12, 13, 14].map((i) => q.modules[8][14 - i]))
  const valeurLue = lus.reduce((a, b, i) => a | ((b ? 1 : 0) << i), 0)
  const bch = (d) => { let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537); return ((d << 10) | r) ^ 0x5412 }
  T('G5 bits de format relus = BCH(niveau M, masque choisi), recalculés indépendamment', valeurLue === bch((0 << 3) | q.masque), `${valeurLue} ≠ ${bch(q.masque)}`)
  T('G3 trop long → null (pas de QR faux) ; sans service externe (aucune adresse http dans lib/qr.ts hors commentaires)', QR.qrCode('x'.repeat(2000)) === null && !/https?:\/\//.test(sansCommentaires(lire('lib/qr.ts'))))
  // Décodage réel : Python + OpenCV, s'ils sont sur la machine (sinon : signalé, ni vert ni rouge).
  const cas = [['https://exemple-artisan.fr/demande?src=instagram'], ['https://prestiapp.fr/p/plomberie-fictive?src=whatsapp'], ['Électricité — devis https://exemple.fr/é'], ['x'.repeat(300)], ...Array.from({ length: 8 }, (_, k) => ['https://exemple-artisan.fr/demande?src=carte', k])]
  const donnees = cas.map(([texte, k]) => { const m = QR.qrCode(texte, k); return { texte, mod: m.modules.map((r) => r.map((c) => (c ? 1 : 0)).join('')) } })
  const py = `import sys, json\ntry:\n    import numpy as np, cv2\nexcept Exception:\n    print('ABSENT'); sys.exit(0)\nd = json.loads(sys.stdin.buffer.read().decode('utf-8'))\nok = 0\nfor x in d:\n    m = np.array([[int(c) for c in r] for r in x['mod']], dtype=np.uint8)\n    n = m.shape[0]; s = 8; b = 4\n    img = np.full(((n+2*b)*s, (n+2*b)*s), 255, np.uint8)\n    for y in range(n):\n        for z in range(n):\n            if m[y, z]: img[(y+b)*s:(y+b+1)*s, (z+b)*s:(z+b+1)*s] = 0\n    v, _, _ = cv2.QRCodeDetector().detectAndDecode(img)\n    ok += (v == x['texte'])\nprint('OK', ok, len(d))\n`
  const p = spawnSync(process.platform === 'win32' ? 'python' : 'python3', ['-c', py], { input: JSON.stringify(donnees), encoding: 'utf8', timeout: 60_000 })
  const sortie = (p.stdout || '').trim()
  if (p.error || !sortie || sortie === 'ABSENT') console.log('SAUT G4 décodage réel : Python + OpenCV absents sur cette machine (G1-G3 restent les preuves)')
  else T(`G4 décodage RÉEL par OpenCV : ${donnees.length} QR (accents, 300 octets, les 8 masques) relus à l’identique`, sortie === `OK ${donnees.length} ${donnees.length}`, sortie)
}

// ═══════════════════════ H. Import des prospects ═══════════════════════
{
  const existants = new Set(['deja.client@exemple.test'])
  const tk = IMPORT.analyserImport(fixture('import-tiktok.csv').toString('utf8'), 'tiktok', existants, new Date('2026-10-21T10:00:00Z'))
  const etats = tk.prospects.map((p) => p.etat).join(',')
  const role = (a, e) => a.colonnes.find((c) => c.entete === e)?.role
  T('H1 export TikTok (virgules, guillemets doublés) : colonnes reconnues, identifiants publicitaires écartés',
    !tk.erreur && role(tk, 'name') === 'nom_complet' && role(tk, 'ad_id') === 'ignore' && role(tk, 'Quel est votre projet ?') === 'question'
    && /Salle de bain "clé en main"/.test(tk.prospects[1].message) && !/1800000000001/.test(tk.prospects.map((p) => p.message).join()), JSON.stringify(tk.colonnes))
  T('H2 doublons ÉCARTÉS : même numéro sous deux écritures (06… / 0033…) dans le fichier, personne déjà dans les demandes ; sans contact écarté',
    etats === 'a_importer,a_importer,doublon_fichier,sans_contact,doublon_existant,a_importer' && tk.a_importer === 3, etats)
  T('H3 téléphone normalisé (+33…), e-mail en minuscules', tk.prospects[1].telephone === '+33639980002' && IMPORT.telephoneNormalise('06 39 98 00 02') === '+33639980002' && IMPORT.telephoneNormalise('0033639980002') === '+33639980002' && IMPORT.emailValide('SOPHIE.FICTIVE@EXEMPLE.TEST') === 'sophie.fictive@exemple.test' && IMPORT.telephoneNormalise('abc') === null)
  const fb = IMPORT.analyserImport(fixture('import-facebook.tsv').toString('utf8'), 'facebook', new Set(), new Date('2026-10-21T10:00:00Z'))
  T('H4 export Meta Lead Ads (tabulations, BOM, préfixes « p: » « e: ») : e-mail et téléphone nettoyés, question gardée',
    !fb.erreur && fb.separateur === '\t' && fb.prospects[0].email === 'julien.exemple@exemple.test' && fb.prospects[0].telephone === '+33639980003' && /Toiture/.test(fb.prospects[0].message) && fb.a_importer === 2, JSON.stringify(fb.prospects[0]))
  const li = IMPORT.analyserImport(fixture('import-linkedin.csv').toString('utf8'), 'linkedin')
  T('H5 export LinkedIn Lead Gen (points-virgules, « First Name » / « Last Name ») : nom recomposé', !li.erreur && li.separateur === ';' && li.prospects[0].nom === 'Paul Exemple' && li.prospects[1].email === 'sophie.fictive@exemple.test' && li.a_importer === 2)
  T('H6 refus nets : sans colonne de contact, vide, trop de lignes ; le résumé dit « à contacter » et « ne vous a pas encore écrit »',
    !!IMPORT.analyserImport(fixture('import-sans-colonne-contact.csv').toString('utf8'), 'tiktok').erreur && !!IMPORT.analyserImport('', 'tiktok').erreur
    && !!IMPORT.analyserImport('email\n' + 'a@b.fr\n'.repeat(1001), 'tiktok').erreur && /à contacter : cette personne a demandé à être recontactée, elle ne vous a pas encore écrit/.test(tk.prospects[0].message))
  T('H7 M3 — LISTE BLANCHE : seules les réponses qui décrivent le besoin sont gardées ; « Entreprise », « Date de naissance », « Company Name », « Job Title » écartées',
    role(tk, 'Entreprise') === 'ignore' && role(tk, 'Date de naissance') === 'ignore' && role(li, 'Company Name') === 'ignore' && role(li, 'Job Title') === 'ignore'
    && !/Société Fictive|1980-01-01/.test(tk.prospects[0].message) && role(fb, 'quel_type_de_travaux_?') === 'question')
  T('H8 M3 — TRACE DU CONSENTEMENT : formulaire, date de remplissage et date d’import gardés dans la demande',
    /Consentement : formulaire « Devis toiture 2026 » rempli le 2026-10-19T08:00:00\+0200 \(export Facebook importé le 2026-10-21\)\./.test(fb.prospects[0].message)
    && /Consentement : formulaire rempli le 2026-10-20 10:12:00 \(export TikTok importé le 2026-10-21\)\./.test(tk.prospects[0].message), fb.prospects[0].message)
  const formule = tk.prospects[5]
  T('H9 injection de formule neutralisée : « = + - @ » en tête d’un texte libre (nom, ville, réponse) précédé d’une apostrophe',
    formule.nom?.startsWith("'=HYPERLINK") && formule.ville === "'@Lyon" && /Quel est votre projet \? : '\+cmd/.test(formule.message) && IMPORT.texteLibre('-5 m2', 20) === "'-5 m2" && IMPORT.texteLibre('Toiture', 20) === 'Toiture', JSON.stringify(formule))
  const r = src.importRoute
  T('H10 route : session + offre, l’aperçu n’écrit RIEN, la confirmation RELIT le fichier côté serveur (jamais la liste du navigateur)',
    /exigerCapacite\(req, 'plateforme\.conversation'/.test(r) && /if \(!confirmer\) return NextResponse\.json\(\{ ok: true, apercu: true/.test(r)
    && r.indexOf('if (!confirmer) return') < r.indexOf(".from('leads').insert(") && /analyserImport\(b\.csv, reseau, existants\)/.test(r) && !/b\?\.prospects|b\.prospects/.test(r))
  T('H11 AUCUN envoi au prospect importé : ni IA, ni e-mail, ni notification, ni relance planifiée, ni pilote ; canal « import », statut « nouveau », compte = session',
    !/sendEmail|notifierArtisan|generate[A-Z]|planifierRelances|piloter|consumeCredit/.test(r) && /artisan_id: g\.uid, canal: CANAL_IMPORT, origine, statut: 'nouveau'/.test(r)
    && /if \(lead\?\.canal === 'import'\) return 0/.test(src.relances) && REG.piloteInterdit('import') === true)
  T('H12 doublons au-delà de 5 000 : TOUTES les demandes relues par pages de 1 000 ; lecture en échec → 503 (on ne promet pas « doublons écartés » sans les voir)',
    /for \(let debut = 0; debut < 100_000; debut \+= 1000\)/.test(r) && /\.range\(debut, debut \+ 999\)/.test(r) && /if \(error\) return null/.test(r) && /if \(!existants\) return NextResponse\.json\([^)]*\{ status: 503 \}\)/.test(r) && !/limit\(5000\)/.test(r))
  T('H13 premier message en échec → les demandes du lot sont RETIRÉES (jamais une demande sans son fil) et l’import s’arrête ; plafonds horaires 3 imports / 20 aperçus',
    /if \(eMsg\) \{\s*await supabaseAdmin\.from\('leads'\)\.delete\(\)\.in\('id', lignes\.map\(\(l\) => l\.id\)\)\.eq\('artisan_id', g\.uid\)\.eq\('canal', CANAL_IMPORT\)/.test(r)
    && /confirmer \? 3 : 20, 3600/.test(r) && /status: 503/.test(r))
}

// ═══════════════════════ I. Pilote automatique ═══════════════════════
{
  T('I1 Telegram pilotable ; jamais : Le Bon Coin, réseaux lus par notification, WhatsApp/Messenger/Instagram, import ; formulaire et e-mail inchangés',
    REG.piloteInterdit('telegram') === false && ['leboncoin', 'linkedin', 'facebook', 'instagram_notif', 'tiktok', 'houzz', 'whatsapp', 'messenger', 'instagram', 'import'].every((c) => REG.piloteInterdit(c))
    && !REG.piloteInterdit('formulaire') && !REG.piloteInterdit('email') && !REG.piloteInterdit(null))
  T('I2 la règle est lue à la mise en file ET au départ (lib/pilote) ET au point d’envoi commun (refusAutomatique, deux chemins)',
    /if \(piloteInterdit\(lead\.canal\)\) return null/.test(src.pSrv) && /piloteInterdit\(lead\.canal\)\) return ko\(/.test(src.pExe) && (src.envois.match(/const refus = refusAutomatique\(lead, o\)/g) ?? []).length === 2)
  T('I3 une proposition Telegram entre dans la file du pilote (drapeau, canal permis) ; piloterProposition revérifie tout',
    /if \(proposee && prop\?\.id && actif\('piloteAutomatique'\) && !piloteInterdit\(p\.canal\)\) \{\s*await \(await import\('@\/lib\/pilote\/serveur'\)\)\.piloterProposition\(/.test(src.serveur))
  T('I4 envoi AUTOMATIQUE sur un canal de messagerie : la mention de l’assistant IA est jointe (règlement IA, art. 50), comme pour l’e-mail',
    /async function avecMentionSiAuto[\s\S]{0,200}if \(!o\.automatique \|\| !estCanalConversation\(lead\.canal\)\) return texte[\s\S]{0,200}avecMentionAssistant\(/.test(src.envois)
    && /const texte = await avecMentionSiAuto\(uid, lead,/.test(src.envois) && /const contenu = await avecMentionSiAuto\(uid, lead,/.test(src.envois))
}

// ═══════════════════════ J. Migration 0177 ═══════════════════════
{
  const m = lire('supabase/migrations/0177_canaux_reseaux.sql')
  const code = m.replace(/--.*$/gm, '')
  T('J1 en-tête daté, APPLIQUÉE le 21/10/2026 (contrôle 10/10), ordre « coller → contrôler → lever »', /^-- 0177 · /.test(m) && /Écrite le 21\/10\/2026\. ✅ APPLIQUÉE le 21\/10\/2026 \(contrôle 10\/10 vert/.test(m) && /PUIS lever les drapeaux/.test(m))
  T('J2 idempotente et additive : if not exists, create or replace, contrainte remplacée seulement si elle ignore telegram ; aucun drop table, aucune suppression de données',
    /add column if not exists origine/.test(code) && /create index if not exists leads_artisan_contact_idx/.test(code) && /create or replace function public\.canaux_conversation_ouvrir/.test(code)
    && /pg_get_constraintdef\(oid\) not like '%telegram%'/.test(code) && !/drop table|truncate|delete from|drop column/i.test(code))
  T('J3 aucun droit pour anon ni authenticated ; la fonction reste au service_role ; s’arrête si 0139 manque',
    !/grant[^;]*(anon|authenticated)/i.test(code) && /revoke all on function public\.canaux_conversation_ouvrir\(jsonb, timestamptz\) from public, anon, authenticated/.test(code)
    && /grant execute on function public\.canaux_conversation_ouvrir\(jsonb, timestamptz\) to service_role/.test(code) && /raise exception '0177 : appliquez d''abord 0139/.test(code))
  const canauxSql = (code.match(/v_canal not in \(([\s\S]*?)\)\s*or coalesce/)?.[1] ?? '').match(/'([a-z0-9_]+)'/g)?.map((x) => x.slice(1, -1)) ?? []
  T('J4 la fonction connaît EXACTEMENT les canaux de conversation du code (lib/canaux/regles.ts)', canauxSql.length === REG.CANAUX_CONVERSATION.length && REG.CANAUX_CONVERSATION.every((c) => canauxSql.includes(c)), canauxSql.join(','))
  const ctl = lire('supabase/controles/0177_canaux_reseaux.sql')
  T('J5 contrôle : colonne, contrainte, index, type telegram, fonction (canaux, security definer, droits), RLS des trois tables', ['leads_origine_connue', 'leads_artisan_contact_idx', "like '%telegram%'", 'prosecdef', "has_function_privilege('anon'", 'relrowsecurity'].every((x) => ctl.includes(x)))
  // Comme scripts/migrations-jumelles-e2e.mjs : commentaires retirés par le MÊME découpeur (sql-nu.mjs), bloc de contrôle final
  // (MARQUE_CONTROLE, lecture seule) mis à part.
  const { sansCommentaires: sqlSans, MARQUE_CONTROLE } = await imp('scripts/sql-nu.mjs')
  const lignesSql = (s) => sqlSans(s).split('\n').map((x) => x.replace(/\s+$/, '')).filter((x) => x.trim())
  const jumeau = lire('supabase/migrations/_A_COLLER_sql_editor_0177_NU.sql')
  const avantControle = jumeau.includes(MARQUE_CONTROLE) ? jumeau.slice(0, jumeau.indexOf(MARQUE_CONTROLE)) : jumeau
  const a = lignesSql(m), b = lignesSql(avantControle)
  T('J6 jumeau _A_COLLER_sql_editor_0177_NU.sql : exactement le SQL de la migration, puis le contrôle de 0177 (pas celui, figé, du mode support)', a.length > 50 && a.join('\n') === b.join('\n') && jumeau.includes(ctl.trimEnd()),`${a.length} / ${b.length} lignes`)
}

// ═══════════════════════ L. DKIM vérifié par nous (lib/canaux/dkim.ts) ═══════════════════════
{
  // RFC 6376 §3.4.5 — l'exemple de canonisation de la norme.
  const ex = DKIM.couperEmail('A: X\r\nB : Y\t\r\n\tZ  \r\n\r\n C \r\nD \t E\r\n\r\n\r\n')
  T('L1 canonisation : l’exemple de la RFC 6376 §3.4.5 (en-têtes relaxed « a:X » « b:Y Z », corps relaxed « C / D E », corps simple inchangé)',
    ex.champs.map((c) => DKIM.canonEntete(c, 'relaxed')).join('|') === 'a:X|b:Y Z' && DKIM.canonCorps(ex.corps, 'relaxed') === ' C\r\nD E\r\n' && DKIM.canonCorps(ex.corps, 'simple') === ' C \r\nD \t E\r\n'
    && DKIM.canonCorps('', 'simple') === '\r\n' && DKIM.canonCorps('', 'relaxed') === '')
  const base = brutDe('linkedin-message.eml')
  const ok = await DKIM.signaturesDkimValides(signer(base, { d: 'linkedin.com', cle: cleDeTest('linkedin.com') }), resoudreDeTest)
  const okSimple = await DKIM.signaturesDkimValides(signer(base, { d: 'linkedin.com', c: 'simple/simple', cle: cleDeTest('linkedin.com') }), resoudreDeTest)
  cleDeTest('linkedin.com', 'ed', 'ed25519')
  const okEd = await DKIM.signaturesDkimValides(signer(base, { d: 'linkedin.com', s: 'ed', algo: 'ed25519-sha256', cle: CLES['ed._domainkey.linkedin.com'] }), resoudreDeTest)
  T('L2 signatures VALIDES reconnues : rsa-sha256 (relaxed et simple) et ed25519-sha256', ok.join() === 'linkedin.com' && okSimple.join() === 'linkedin.com' && okEd.join() === 'linkedin.com', `${ok}|${okSimple}|${okEd}`)
  const signe = signer(base, { d: 'linkedin.com', cle: cleDeTest('linkedin.com') })
  const corpsTouche = signe.replace(/\r\n\r\n([A-Za-z0-9+/])/, '\r\n\r\nQUFB$1')
  const fromTouche = signe.replace('From: ', 'From: =?UTF-8?B?QXR0YXF1YW50?= <attaquant@linkedin.com>\r\nX-Old-From: ')
  const ajoutEnBas = signe.replace(/\r\n\r\n/, '\r\nSubject: Autre objet\r\n\r\n')
  T('L3 falsifications REFUSÉES : corps modifié, From remplacé, en-tête signé ajouté plus bas (pris du bas vers le haut)',
    (await DKIM.signaturesDkimValides(corpsTouche, resoudreDeTest)).length === 0 && (await DKIM.signaturesDkimValides(fromTouche, resoudreDeTest)).length === 0
    && (await DKIM.signaturesDkimValides(ajoutEnBas, resoudreDeTest)).length === 0)
  T('L4 refusés d’office : l= (corps signé en partie), x= expirée, « from » non signé, clé révoquée (p= vide), DNS muet, rsa-sha1',
    (await DKIM.signaturesDkimValides(signer(base, { d: 'linkedin.com', cle: cleDeTest('linkedin.com'), extra: ' l=10;' }), resoudreDeTest)).length === 0
    && (await DKIM.signaturesDkimValides(signer(base, { d: 'linkedin.com', cle: cleDeTest('linkedin.com'), extra: ' x=1000;' }), resoudreDeTest)).length === 0
    && (await DKIM.signaturesDkimValides(signer(base, { d: 'linkedin.com', cle: cleDeTest('linkedin.com'), h: ['subject', 'date'] }), resoudreDeTest)).length === 0
    && (await DKIM.signaturesDkimValides(signe, async (n) => (n === 'fixture._domainkey.linkedin.com' ? [['v=DKIM1; k=rsa; p=']] : []))).length === 0
    && (await DKIM.signaturesDkimValides(signe, async () => [])).length === 0
    && (await DKIM.signaturesDkimValides(signe.replace('a=rsa-sha256', 'a=rsa-sha1'), resoudreDeTest)).length === 0)
  T('L5 jamais d’exception : e-mail vide, illisible, signature tronquée', (await DKIM.signaturesDkimValides('', resoudreDeTest)).length === 0 && (await DKIM.signaturesDkimValides('DKIM-Signature: v=1; a=rsa-sha256; b=\r\n\r\nx', resoudreDeTest)).length === 0)
}

// ═══════════════════════ M. Plafonds (E2, M1, M2), notification de l'artisan, purge (M3) ═══════════════════════
{
  const w = src.webhook
  T('M1 E2/M2 webhook : plafonds par bot (heure), par conversation (heure ET jour), de NOUVELLES conversations par bot (jour) — fail-closed, AVANT le rangement ; au-delà 200 sans rien ranger',
    /consommerLimiteStricte\(`canaux:tg:bot:\$\{canal\}`, TG_PAR_BOT_HEURE, 3_600\)/.test(w) && /`canaux:tg:fil:\$\{canal\}:\$\{e\.chat_id\}`, TG_PAR_FIL_HEURE, 3_600/.test(w)
    && /`canaux:tg:fil-jour:\$\{canal\}:\$\{e\.chat_id\}`, TG_PAR_FIL_JOUR, 86_400/.test(w) && /filTelegramExiste\(liaison\.artisan_id, personne\)\)\s*&& !\(await consommerLimiteStricte\(`canaux:tg:nouveaux:\$\{canal\}`, TG_NOUVEAUX_FILS_JOUR, 86_400\)\)\) return Response\.json\(\{ ok: true \}\)/.test(w)
    && w.indexOf('canaux:tg:bot:') < w.indexOf('rangerEntrantTelegram(e, liaison, magasinCanaux)') && /const TG_PAR_BOT_HEURE = 300/.test(w) && !/export const TG_/.test(w))
  const s = src.serveur
  T('M2 M1 crédits IA : 3 réponses préparées au plus par conversation et par jour, 20 nouvelles conversations servies par artisan et par jour (fail-closed)',
    /&& await consommerLimiteStricte\(`canaux:ia:fil:\$\{lead\.id\}`, IA_PAR_FIL, 86_400\)/.test(s) && /&& \(!p\.nouveau \|\| await consommerLimiteStricte\(`canaux:ia:nouveaux:\$\{artisan\.id\}`, IA_NOUVEAUX_FILS, 86_400\)\)/.test(s)
    && /export const IA_PAR_FIL = 3/.test(s) && /export const IA_NOUVEAUX_FILS = 20/.test(s))
  T('M3 E2 notification de l’artisan REGROUPÉE (une par conversation toutes les 20 min, 30 par artisan et par jour), dans SA part du plafond (part: \'canaux\')',
    /const peutNotifier = await consommerLimiteStricte\(`canaux:notif:\$\{lead\.id\}`, 1, NOTIF_FIL_S\)\s*&& await consommerLimiteStricte\(`canaux:notif:artisan:\$\{artisan\.id\}`, NOTIF_ARTISAN_JOUR, 86_400\)/.test(s)
    && /if \(!peutNotifier\) return \{ proposee, notifie: false \}/.test(s) && /part: 'canaux',/.test(s) && /export const NOTIF_FIL_S = 20 \* 60/.test(s))
  const em = sansCommentaires(lire('lib/email.ts'))
  T('M4 E2 lib/email.ts : la part « canaux » a sa propre clé (emails:canaux:jour, 40 par défaut) — elle ne puise plus dans emails:produit:jour (devis, factures)',
    /opts\.part === 'canaux'\s*\? \['emails:canaux:jour', Number\(process\.env\.EMAILS_CANAUX_PAR_JOUR\) \|\| 40\]/.test(em) && /\['emails:produit:jour', Number\(process\.env\.EMAILS_PRODUIT_PAR_JOUR\) \|\| 80\]/.test(em))
  T('M5 E1 aucun lien d’un tiers dans l’e-mail envoyé à l’artisan (seulement le domaine) ; le nom donné par l’expéditeur hors de l’OBJET',
    LIB.sansLiens('Voici https://evil.example/x?a=1 et www.piege.example/y, merci', 200) === 'Voici [lien : evil.example] et [lien : www.piege.example], merci'
    && /const extrait = sansLiens\(dernierTexte \|\| 'non précisé', 1500\)/.test(s) && /const qui = sansLiens\(nom \|\| 'un client', 80\)/.test(s)
    && /subject: proposee \? `Réponse proposée — à valider — \$\{libelle\}` : `Nouveau message \$\{libelle\}`,/.test(s) && !/Son message : \$\{dernierTexte/.test(s))
  T('M6 Telegram : le fil appartient au bot (<bot>:<chat>) — l’envoi refuse un fil d’un autre bot ; la mention de l’assistant compte dans les 4 096 signes',
    /if \(!c\.externe_id \|\| botDuFil !== c\.externe_id \|\| !chatId\)/.test(s) && /lead\.canal === 'telegram' && \[\.\.\.avec\]\.length > LONGUEUR_MAX_TELEGRAM \? null : avec/.test(src.envois)
    && (src.envois.match(/=== null\) return rep\(409, \{ error: 'Trop long pour partir seul avec la mention de l’assistant : à valider à la main\.' \}\)/g) ?? []).length === 2)
  const tg = sansCommentaires(lire('lib/canaux/telegram.ts'))
  const brutHmac = crypto.createHmac('sha256', Buffer.from(CLE, 'base64')).update(`presti:telegram-webhook:v1:${ID_A}`).digest('base64url')
  T('M7 sous-clé HKDF pour le secret du webhook (CANAUX_KEY n’est pas utilisée telle quelle à deux fins) ; le chiffrement AES garde la clé (mots de passe IMAP déjà chiffrés)',
    /crypto\.hkdfSync\('sha256', cle, Buffer\.alloc\(0\), 'presti:canaux:telegram-webhook:v1', 32\)/.test(tg) && TG.secretWebhookTelegram(CLE, ID_A) !== brutHmac
    && /const b64 = process\.env\.CANAUX_KEY/.test(lire('lib/secretBox.ts')))
  // M3 — la purge des importés jamais contactés, jouée sur une base en mémoire (même chaîne d'appels que PostgREST).
  const P = await imp('lib/purgesRgpd.ts')
  const T0 = '2026-10-21T00:00:00.000Z'
  const lignes = {
    leads: [
      { id: 'i-vieux', canal: 'import', statut: 'nouveau', created_at: '2026-01-01T00:00:00Z' },
      { id: 'i-contacte', canal: 'import', statut: 'nouveau', created_at: '2026-01-01T00:00:00Z' },
      { id: 'i-devis', canal: 'import', statut: 'nouveau', created_at: '2026-01-01T00:00:00Z' },
      { id: 'i-traite', canal: 'import', statut: 'perdu', created_at: '2026-01-01T00:00:00Z' },
      { id: 'i-recent', canal: 'import', statut: 'nouveau', created_at: '2026-09-01T00:00:00Z' },
      { id: 'f-vieux', canal: 'formulaire', statut: 'nouveau', created_at: '2026-01-01T00:00:00Z' },
    ],
    messages: [{ lead_id: 'i-contacte', sens: 'out' }, { lead_id: 'i-vieux', sens: 'in' }],
    devis: [{ lead_id: 'i-devis' }],
  }
  const supprimes = []
  const db = {
    from(table) {
      const filtres = []
      let suppression = false
      const q = {
        select() { return q }, order() { return q }, limit() { return q },
        delete() { suppression = true; return q },
        eq(c, v) { filtres.push((r) => r[c] === v); return q }, lt(c, v) { filtres.push((r) => r[c] < v); return q }, in(c, v) { filtres.push((r) => v.includes(r[c])); return q },
        then(ok) {
          const choisis = (lignes[table] ?? []).filter((r) => filtres.every((f) => f(r)))
          if (suppression) { supprimes.push(...choisis.map((r) => r.id)); lignes[table] = lignes[table].filter((r) => !choisis.includes(r)) }
          return Promise.resolve({ data: suppression ? null : choisis, error: null }).then(ok)
        },
      }
      return q
    },
  }
  const res = await P.purgerImportsSansContact(P.seuilMois(P.MOIS_IMPORT_SANS_CONTACT, new Date(T0)), 100, db)
  T('M8 M3 purge : un importé JAMAIS contacté de plus de 6 mois est effacé ; contacté (message parti), avec devis, traité (statut), récent, ou non importé : gardé',
    P.MOIS_IMPORT_SANS_CONTACT === 6 && res.n === 1 && supprimes.join() === 'i-vieux' && /bilan\.imports = noter\(await purgerImportsSansContact\(seuilMois\(MOIS_IMPORT_SANS_CONTACT, maintenant\), PLAFOND_CONVERSATIONS\)\)/.test(lire('lib/purgesRgpd.ts').replace(/\r\n/g, '\n')), JSON.stringify(res) + ' ' + supprimes.join())
}

// ═══════════════════════ K. Fichiers propres ; /messages sans session ═══════════════════════
{
  const fichiers = [
    'lib/canaux/telegram.ts', 'lib/canaux/notifications.ts', 'lib/canaux/dkim.ts', 'lib/canaux/leboncoin.ts', 'lib/mailLite.ts', 'lib/email.ts', 'lib/purgesRgpd.ts', 'lib/envoisServeur.ts', 'scripts/leboncoin-e2e.mjs', 'lib/canaux/reseaux.ts', 'lib/canaux/importProspects.ts', 'lib/canaux/libelles.ts', 'lib/canaux/regles.ts',
    'lib/canaux/rangement.ts', 'lib/canaux/serveur.ts', 'lib/qr.ts', 'app/api/canaux/telegram/route.ts', 'app/api/canaux/telegram/webhook/[canal]/route.ts',
    'app/api/demandes/import/route.ts', 'app/messages/canaux/VosReseaux.tsx', 'app/messages/canaux/CanauxTelegram.tsx', 'app/messages/canaux/ImportProspects.tsx',
    'app/messages/canaux/page.tsx', 'app/messages/page.tsx', 'supabase/migrations/0177_canaux_reseaux.sql', 'supabase/controles/0177_canaux_reseaux.sql', 'scripts/canaux-reseaux-qa.mjs',
  ]
  const sales = fichiers.filter((f) => [...fs.readFileSync(path.join(RACINE, f))].some((o) => o < 0x20 && o !== 0x09 && o !== 0x0a && o !== 0x0d))
  T(`K1 aucun octet de contrôle (< 0x20 hors tabulation et fins de ligne) dans les ${fichiers.length} fichiers du chantier`, sales.length === 0, sales.join(', '))
  const msg = sansCommentaires(lire('app/messages/page.tsx'))
  T('K2 /messages sans session → /login (plus l’écran « Réservé à l’offre Studio »), avant toute lecture de l’offre',
    /if \(!uid\) \{ router\.replace\('\/login'\); return \}/.test(msg) && msg.indexOf("router.replace('/login')") < msg.indexOf(".from('artisans')"))
}

console.log(`\n${verts} vert(s), ${rouges.length} rouge(s)`)
if (rouges.length) { console.log('ROUGES : ' + rouges.join(' · ')); process.exit(1) }
