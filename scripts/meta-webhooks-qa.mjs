#!/usr/bin/env node
// scripts/meta-webhooks-qa.mjs — juge hors ligne d'A6 (lot 6 de juges-026-acquisition-preuve.mjs), les webhooks Meta
// (fiche 026-090), écrit par Claude Code (fiche 026-081) AVANT le module et la route qu'il juge : lib/agents/acquisition/
// metaWebhooks.ts et app/api/webhooks/meta/route.ts. L'exécutant qui les écrit ne touche jamais ce fichier.
//
//   node --import ./scripts/ts-loader.mjs scripts/meta-webhooks-qa.mjs [--racine=<dossier>] [--auto-controle]
//
// Les critères MW de 026-090.md. Le juge sert les corps signés (HMAC-SHA256, secret SECRET-META-TEMOIN-4b8e) de
// scripts/fixtures/026-acquisition/meta-webhooks/, appelle les fonctions pures du module directement (verifierSignature,
// normaliserEntrees, estAimant, traiterEvenements avec le magasin en mémoire de 026-016 et un lireProfil factice,
// creerLecteurProfil), puis exécute app/api/webhooks/meta/route.ts par ts-loader avec une doublure de magasinSupabase
// (compte ses appels ; JAMAIS le vrai Supabase). Console capturée.
//
//   --racine=<d>     importe <d>/lib/agents/acquisition/metaWebhooks.ts et <d>/app/api/webhooks/meta/route.ts (défaut : le
//                    dépôt).
//   --auto-controle  AC-1 les corps d'essai se lisent (chaque signature recalculée par le juge, indépendamment du module,
//                    est juste sur son corps et fausse sur le corps modifié d'un octet) ; AC-2 le magasin factice applique
//                    ses règles sur son propre scénario ; AC-3 chaque contrôle MW-2 à MW-9 repère son échantillon fautif et
//                    laisse passer son échantillon conforme.
//
// Sortie : une ligne par critère, puis « meta-webhooks-qa : PASS|FAIL — … ». Code 0 seulement si tout est vert ; 1 sinon ;
// 2 si l'appel est invalide. Module ou route absent(e) : MW-1 en échec, les suivants « non jugés ». Hors ligne (piège
// réseau, DNS compris — la route est appelée en mémoire, jamais par un vrai socket), fuseau UTC. N'écrit que sous
// .orchestre/travail/meta-webhooks-qa/.
//
// Choix du juge (026-090 §Contexte dit « à vérifier le jour de R6 ») : le format des corps Meta (comments, feed,
// messaging) est celui de scripts/fixtures/026-acquisition/meta-webhooks/index.mjs — il fait foi tant que R6 n'a pas eu
// lieu. deps.maintenant est un horodatage (ms epoch), pas un objet horloge. L'idempotence de MW-6/MW-7 est jugée sur
// l'ÉTAT final du magasin (une conversation par commentaire_id/meta_id, un id_externe déduplique reponseRecue), jamais sur
// un compte d'appels à une hypothétique fonction d'enregistrement brut : le contrat (contrat.ts) n'en expose aucune, et le
// Magasin factice (magasin-memoire.mjs, hors périmètre de cette fiche) implémente déjà cette idempotence par construction
// (Map.set par id, reponseRecue dédupliquée par id_externe).
process.env.TZ = 'UTC'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { register } from 'node:module'
import { pathToFileURL, fileURLToPath } from 'node:url'
import {
  R, LOADER, lireOptions, creerSortie, importerDepuis, typecheck, piegerReseau, sansCommentaires, corpsDeFonction, court,
  premiereLigne, capturerConsole,
} from './fixtures/026-acquisition/commun.mjs'
import { creerMagasin, scenario as scenarioMagasin, REGLES_JP6 } from './fixtures/026-acquisition/magasin-memoire.mjs'
import { creerHorloge } from './fixtures/026-acquisition/horloge-factice.mjs'
import { SECRET, VERIF_TOKEN, CORPS, CORPS_MODIFIE, CORPS_300KO, PROFIL_OK, PROFIL_ERREUR_CONSENTEMENT, TOUS_SIGNES } from './fixtures/026-acquisition/meta-webhooks/index.mjs'

const JUGE = 'meta-webhooks-qa'
const o = lireOptions(process.argv.slice(2))
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (!fs.existsSync(o.racine) || !fs.statSync(o.racine).isDirectory()) refuser(`--racine : ${o.racine} n'est pas un dossier`)
if (!process.execArgv.some((a) => /ts-loader/.test(a)) && !String(process.env.NODE_OPTIONS ?? '').includes('ts-loader')) await import(pathToFileURL(LOADER).href)

const RAC = o.racine
const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
const NOM = `${JUGE}${o.autoControle ? ' --auto-controle' : ''}`
const T0 = Date.parse('2026-10-14T08:00:00.000Z')
const IDS = ['MW-1', 'MW-2', 'MW-3', 'MW-4', 'MW-5', 'MW-6', 'MW-7', 'MW-8', 'MW-9']
const EXPORTS = ['verifierSignature', 'normaliserEntrees', 'estAimant', 'traiterEvenements', 'creerLecteurProfil']
const piege = piegerReseau()

// ── La doublure de magasinSupabase pour la route (comptage des appels, jamais le vrai Supabase) ────────────────────────────
const cleChemin = (u) => { try { const p = fileURLToPath(u).split(path.sep).join('/'); return process.platform === 'win32' ? p.toLowerCase() : p } catch { return null } }
function doublerMagasinPourRoute(racine) {
  globalThis.__mwAppels = []
  const cible = cleChemin(pathToFileURL(path.join(racine, 'lib', 'agents', 'acquisition', 'magasinSupabase.ts')).href)
  const doublure = `data:text/javascript,${encodeURIComponent(
    "export const magasinSupabase = new Proxy({}, { get(_, prop) { return (...args) => { globalThis.__mwAppels.push(String(prop)); return Promise.resolve(undefined) } } })",
  )}`
  const crochet = `data:text/javascript,${encodeURIComponent(`
    export async function resolve(spec, ctx, next) {
      const r = await next(spec, ctx)
      if (r.url.startsWith('file:') && ${JSON.stringify(cible)} === (${cleChemin.toString()})(r.url)) return { url: ${JSON.stringify(doublure)}, shortCircuit: true }
      return r
    }
  `)}`
  register(crochet)
}
doublerMagasinPourRoute(RAC)

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const C = {
  'MW-2': (x) => {
    const e = []
    x.bonnes.forEach((v, i) => { if (v !== true) e.push(`corps signé n°${i + 1} : signature refusée à tort`) })
    if (x.modifie !== false) e.push("corps modifié d'un octet (ancienne signature) : accepté à tort")
    if (x.tronquee !== false) e.push('signature tronquée : acceptée à tort')
    if (x.sansPrefixe !== false) e.push('signature sans préfixe sha256= : acceptée à tort')
    if (x.absente !== false) e.push('en-tête absent (null) : accepté à tort')
    const corps = corpsDeFonction(sansCommentaires(x.source), 'verifierSignature').map(([d, f]) => x.source.slice(d, f)).join('\n')
    if (!corps) e.push('fonction verifierSignature introuvable dans le source (lecture statique)')
    else if (!/timingSafeEqual/.test(corps)) e.push('verifierSignature : timingSafeEqual absent (comparaison en temps constant attendue)')
    return e
  },
  'MW-3': (x) => {
    const e = []
    if (x.bonJeton.statut !== 200) e.push(`bon jeton : statut ${x.bonJeton.statut}, 200 attendu`)
    if (x.bonJeton.corps !== '123456') e.push(`bon jeton : corps ${JSON.stringify(court(x.bonJeton.corps, 40))}, le hub.challenge exact (« 123456 ») attendu`)
    for (const [nom, r] of [['mauvais jeton', x.mauvaisJeton], ['jeton absent', x.jetonAbsent], ['variable META_WEBHOOK_VERIFY_TOKEN absente', x.variableAbsente]]) if (r.statut !== 403) e.push(`${nom} : statut ${r.statut}, 403 attendu`)
    return e
  },
  'MW-4': (x) => {
    const e = []
    if (x.secretAbsent.statut !== 503 || x.secretAbsent.appels !== 0) e.push(`META_APP_SECRET absent : statut ${x.secretAbsent.statut}, ${x.secretAbsent.appels} appel(s) au magasin (503 et 0 attendus)`)
    if (x.signatureFausse.statut !== 401 || x.signatureFausse.appels !== 0) e.push(`signature fausse : statut ${x.signatureFausse.statut}, ${x.signatureFausse.appels} appel(s) au magasin (401 et 0 attendus)`)
    if (x.gros.statut !== 413) e.push(`corps de 300 Ko : statut ${x.gros.statut}, 413 attendu`)
    const nu = sansCommentaires(x.source)
    const iSig = nu.search(/verifierSignature\s*\(/), iParse = nu.indexOf('JSON.parse')
    if (iSig < 0) e.push('verifierSignature non appelée dans le source de la route (lecture statique)')
    else if (iParse >= 0 && iSig > iParse) e.push('JSON.parse semble précéder verifierSignature dans le source')
    if (/pauseGenerale\s*\(/.test(nu)) e.push('pauseGenerale( apparaît dans la route : interdit (026-090 §3)')
    return e
  },
  'MW-5': (x) => {
    const e = []
    for (const [texte, attendu] of [['SITE', true], ['site !', true], ['Site 🙂', true], ['Joli site, bravo', false], ['sites web pas chers', false]]) if (x[texte] !== attendu) e.push(`estAimant(${JSON.stringify(texte)}) = ${x[texte]}, ${attendu} attendu`)
    return e
  },
  'MW-6': (x) => {
    const e = []
    if (!x.conversationAimant || !x.conversationAimant.commentaire_id) e.push('commentaire aimant : aucune conversation avec commentaire_id')
    if (x.conversationsApresOrdinaire !== x.conversationsApresAimant) e.push(`commentaire ordinaire (non aimant) : ${x.conversationsApresOrdinaire - x.conversationsApresAimant} conversation(s) en plus (aucune attendue)`)
    if (x.conversationsApresRejeu !== x.conversationsApresOrdinaire) e.push(`commentaire aimant rejoué (même id) : ${x.conversationsApresRejeu - x.conversationsApresOrdinaire} conversation(s) en plus (idempotence attendue)`)
    return e
  },
  'MW-7': (x) => {
    const e = []
    if (!x.conversationMessage || !x.conversationMessage.dernier_message_recu_le) e.push('message reçu : dernier_message_recu_le absent de la conversation')
    if (!x.reponseRecue) e.push('message reçu : aucune reponseRecue enregistrée')
    else if (x.reponseRecue.source !== 'meta') e.push(`reponseRecue.source = ${JSON.stringify(x.reponseRecue.source)}, « meta » attendu`)
    if (x.appelsProfilPremier !== 1) e.push(`${x.appelsProfilPremier} appel(s) au profil pour le premier message de la conversation, 1 attendu`)
    if (x.appelsProfilSecond !== 0) e.push(`${x.appelsProfilSecond} appel(s) au profil pour un second message de la même conversation, 0 attendu (déjà lu)`)
    if (x.ecrituresApresEcho !== 0) e.push(`message écho : ${x.ecrituresApresEcho} écriture(s) supplémentaire(s), 0 attendue`)
    if (!x.oppositionStop) e.push('« STOP » : aucune opposition posée (meta_id attendu dans le même appel)')
    return e
  },
  'MW-8': (x) => {
    const e = []
    if (x.erreurConsentement !== null) e.push(`profil en erreur de consentement : ${court(JSON.stringify(x.erreurConsentement), 100)}, null attendu (aucune exception)`)
    const CONNUS = new Set(['id', 'plateforme', 'pseudo', 'suit_le_compte', 'fenetre_jusqua', 'commentaire_id', 'reponse_privee_jusqua', 'prospect_id', 'meta_id', 'dernier_message_recu_le', 'abonnes'])
    if (!x.conversation) e.push('conversation introuvable après un message reçu avec profil')
    else {
      if (x.conversation.pseudo !== PROFIL_OK.pseudo) e.push(`pseudo = ${JSON.stringify(x.conversation.pseudo)}, ${JSON.stringify(PROFIL_OK.pseudo)} attendu`)
      if (x.conversation.suit_le_compte !== PROFIL_OK.suit_le_compte) e.push(`suit_le_compte = ${JSON.stringify(x.conversation.suit_le_compte)}, ${JSON.stringify(PROFIL_OK.suit_le_compte)} attendu`)
      if (x.conversation.abonnes !== undefined && x.conversation.abonnes !== PROFIL_OK.abonnes) e.push(`abonnes = ${JSON.stringify(x.conversation.abonnes)}, ${JSON.stringify(PROFIL_OK.abonnes)} attendu`)
      for (const k of Object.keys(x.conversation)) if (!CONNUS.has(k)) e.push(`champ non attendu rangé dans la conversation (hors du profil pseudo/suit_le_compte/abonnes) : ${k}`)
    }
    if (x.appelsJaugePleine !== 0) e.push(`jauge instagram_api épuisée : ${x.appelsJaugePleine} appel(s) au profil quand même, 0 attendu`)
    return e
  },
  'MW-9': (x) => {
    const e = []
    for (const s of ['SITE', 'artisan_temoin', 'Bonjour, un devis', SECRET, VERIF_TOKEN]) if (String(x.console ?? '').includes(s)) e.push(`la console capturée contient une valeur d'essai (${JSON.stringify(s)})`)
    if (!x.typecheck.ok) e.push(`typecheck : ${x.typecheck.detail}`)
    return e
  },
}
const DETAILS = {
  'MW-2': `${TOUS_SIGNES.length} corps signés acceptés, corps modifié/signature tronquée/sans préfixe/absente refusés ; timingSafeEqual lu dans le source`,
  'MW-3': "bon jeton → 200 + hub.challenge exact ; mauvais jeton, jeton absent, variable absente → 403",
  'MW-4': "secret absent → 503, zéro appel ; signature fausse → 401, zéro appel ; 300 Ko → 413 ; signature avant JSON.parse, aucun pauseGenerale(",
  'MW-5': "« SITE », « site ! », « Site 🙂 » → vrai ; « Joli site, bravo », « sites web pas chers » → faux",
  'MW-6': "commentaire aimant → conversation avec commentaire_id ; ordinaire → aucune ; rejoué → idempotent",
  'MW-7': "message reçu → conversation + reponseRecue meta + un seul appel au profil ; écho → rien ; STOP → opposition",
  'MW-8': "erreur de consentement → null sans exception ; seuls pseudo/suit_le_compte/abonnes rangés ; jauge pleine → aucun appel",
  'MW-9': "aucune valeur d'essai (texte, pseudo, secret, jeton) dans la console capturée ; typecheck vert",
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function observer(mod, routeMod, RAC2) {
  const obs = {}
  const tente = async (id, f) => { try { obs[id] = await f() } catch (e) { obs[id] = { exception: premiereLigne(e) } } }
  const srcModule = fs.readFileSync(path.join(RAC2, 'lib', 'agents', 'acquisition', 'metaWebhooks.ts'), 'utf8')
  const srcRoute = fs.readFileSync(path.join(RAC2, 'app', 'api', 'webhooks', 'meta', 'route.ts'), 'utf8')

  await tente('MW-2', async () => ({
    bonnes: TOUS_SIGNES.map((c) => mod.verifierSignature(c.brut, c.signature, SECRET)),
    modifie: mod.verifierSignature(CORPS_MODIFIE.brut, CORPS_MODIFIE.signature, SECRET),
    tronquee: mod.verifierSignature(CORPS.message_recu.brut, CORPS.message_recu.signature.slice(0, -8), SECRET),
    sansPrefixe: mod.verifierSignature(CORPS.message_recu.brut, CORPS.message_recu.signature.replace('sha256=', ''), SECRET),
    absente: mod.verifierSignature(CORPS.message_recu.brut, null, SECRET),
    source: srcModule,
  }))

  const base = 'http://127.0.0.1/api/webhooks/meta'
  await tente('MW-3', async () => {
    const req = (jeton, avecJeton = true) => new Request(`${base}?${new URLSearchParams({ 'hub.mode': 'subscribe', ...(avecJeton ? { 'hub.verify_token': jeton } : {}), 'hub.challenge': '123456' })}`)
    process.env.META_WEBHOOK_VERIFY_TOKEN = VERIF_TOKEN
    const bon = await routeMod.GET(req(VERIF_TOKEN))
    const mauvais = await routeMod.GET(req('jeton-invalide-essai'))
    const absent = await routeMod.GET(req(null, false))
    delete process.env.META_WEBHOOK_VERIFY_TOKEN
    const variableAbsente = await routeMod.GET(req(VERIF_TOKEN))
    return { bonJeton: { statut: bon.status, corps: await bon.text() }, mauvaisJeton: { statut: mauvais.status }, jetonAbsent: { statut: absent.status }, variableAbsente: { statut: variableAbsente.status } }
  })

  await tente('MW-4', async () => {
    delete process.env.META_APP_SECRET
    globalThis.__mwAppels.length = 0
    const r1 = await routeMod.POST(new Request(base, { method: 'POST', headers: { 'x-hub-signature-256': CORPS.message_recu.signature }, body: CORPS.message_recu.brut }))
    const appels1 = globalThis.__mwAppels.length
    process.env.META_APP_SECRET = SECRET
    globalThis.__mwAppels.length = 0
    const r2 = await routeMod.POST(new Request(base, { method: 'POST', headers: { 'x-hub-signature-256': `sha256=${'0'.repeat(64)}` }, body: CORPS.message_recu.brut }))
    const appels2 = globalThis.__mwAppels.length
    const r3 = await routeMod.POST(new Request(base, { method: 'POST', headers: { 'x-hub-signature-256': CORPS_300KO.signature }, body: CORPS_300KO.brut }))
    delete process.env.META_APP_SECRET
    return { secretAbsent: { statut: r1.status, appels: appels1 }, signatureFausse: { statut: r2.status, appels: appels2 }, gros: { statut: r3.status }, source: srcRoute }
  })

  await tente('MW-5', async () => ({
    SITE: mod.estAimant('SITE'), 'site !': mod.estAimant('site !'), 'Site 🙂': mod.estAimant('Site 🙂'), 'Joli site, bravo': mod.estAimant('Joli site, bravo'), 'sites web pas chers': mod.estAimant('sites web pas chers'),
  }))

  const lireProfilInerte = async () => null
  const M6 = creerMagasin({ horloge: creerHorloge(T0) })
  await tente('MW-6', async () => {
    await mod.traiterEvenements(mod.normaliserEntrees(CORPS.commentaire_site_maj.objet), { magasin: M6, lireProfil: lireProfilInerte, maintenant: T0 })
    const conversationsApresAimant = M6.etat().conversations.length
    const conversationAimant = M6.etat().conversations.find((c) => c.commentaire_id === 'COM-TEMOIN-0001')
    await mod.traiterEvenements(mod.normaliserEntrees(CORPS.commentaire_pas_aimant.objet), { magasin: M6, lireProfil: lireProfilInerte, maintenant: T0 })
    const conversationsApresOrdinaire = M6.etat().conversations.length
    await mod.traiterEvenements(mod.normaliserEntrees(CORPS.commentaire_site_maj.objet), { magasin: M6, lireProfil: lireProfilInerte, maintenant: T0 })
    const conversationsApresRejeu = M6.etat().conversations.length
    return { conversationAimant, conversationsApresAimant, conversationsApresOrdinaire, conversationsApresRejeu }
  })

  await tente('MW-7', async () => {
    let appelsProfil = 0
    const lireProfil = async () => { appelsProfil++; return PROFIL_OK }
    const M7 = creerMagasin({ horloge: creerHorloge(T0) })
    await mod.traiterEvenements(mod.normaliserEntrees(CORPS.message_recu.objet), { magasin: M7, lireProfil, maintenant: T0 })
    const appelsProfilPremier = appelsProfil
    const conversationMessage = M7.etat().conversations.find((c) => c.meta_id === 'META-PERSONNE-0003')
    const reponseRecue = M7.etat().reponses.find((r) => r.id_externe === 'MSG-TEMOIN-0001')
    const n0 = M7.etat().evenements.length + M7.etat().conversations.length + M7.etat().reponses.length
    await mod.traiterEvenements(mod.normaliserEntrees(CORPS.message_echo.objet), { magasin: M7, lireProfil, maintenant: T0 })
    const ecrituresApresEcho = (M7.etat().evenements.length + M7.etat().conversations.length + M7.etat().reponses.length) - n0
    await mod.traiterEvenements(mod.normaliserEntrees({ ...CORPS.message_recu.objet, entry: [{ ...CORPS.message_recu.objet.entry[0], messaging: [{ ...CORPS.message_recu.objet.entry[0].messaging[0], message: { mid: 'MSG-TEMOIN-0001B', text: 'et une baignoire aussi' } }] }] }), { magasin: M7, lireProfil, maintenant: T0 })
    const appelsProfilSecond = appelsProfil - appelsProfilPremier
    const M8 = creerMagasin({ horloge: creerHorloge(T0) })
    await mod.traiterEvenements(mod.normaliserEntrees(CORPS.message_stop.objet), { magasin: M8, lireProfil, maintenant: T0 })
    const oppositionStop = M8.etat().oppositions.some((o) => o.cle_type === 'meta_id' && o.cle_valeur === 'META-PERSONNE-0005')
    return { conversationMessage, reponseRecue, appelsProfilPremier, appelsProfilSecond, ecrituresApresEcho, oppositionStop }
  })

  await tente('MW-8', async () => {
    const fetchErreur = async () => new Response(JSON.stringify(PROFIL_ERREUR_CONSENTEMENT), { status: 400 })
    const lireErreur = mod.creerLecteurProfil({ jeton: 'JETON-PAGE-TEMOIN', fetch: fetchErreur })
    let erreurConsentement = null
    try { erreurConsentement = await lireErreur('META-PERSONNE-0099') } catch (e) { erreurConsentement = { exception: premiereLigne(e) } }
    let appelsProfil = 0
    const lireProfil = async () => { appelsProfil++; return PROFIL_OK }
    const M9 = creerMagasin({ horloge: creerHorloge(T0) })
    await mod.traiterEvenements(mod.normaliserEntrees(CORPS.message_recu.objet), { magasin: M9, lireProfil, maintenant: T0 })
    const conversation = M9.etat().conversations.find((x) => x.meta_id === 'META-PERSONNE-0003')
    M9.poserEtat({ jauges: { instagram_api: 0 } })
    let appelsJaugePleine = 0
    const lireProfilCompte = async () => { appelsJaugePleine++; return PROFIL_OK }
    await mod.traiterEvenements(mod.normaliserEntrees({ ...CORPS.message_recu.objet, entry: [{ ...CORPS.message_recu.objet.entry[0], messaging: [{ ...CORPS.message_recu.objet.entry[0].messaging[0], sender: { id: 'META-PERSONNE-JAUGE' }, message: { mid: 'MSG-TEMOIN-JAUGE', text: 'un devis stp' } }] }] }), { magasin: M9, lireProfil: lireProfilCompte, maintenant: T0 })
    return { erreurConsentement: erreurConsentement === null ? null : erreurConsentement, conversation, appelsJaugePleine }
  })

  const { texte: consoleMW6et7 } = await capturerConsole(async () => {
    const Mp = creerMagasin({ horloge: creerHorloge(T0) })
    const lp = async () => PROFIL_OK
    await mod.traiterEvenements(mod.normaliserEntrees(CORPS.commentaire_site_maj.objet), { magasin: Mp, lireProfil: lp, maintenant: T0 })
    await mod.traiterEvenements(mod.normaliserEntrees(CORPS.message_recu.objet), { magasin: Mp, lireProfil: lp, maintenant: T0 })
    await mod.traiterEvenements(mod.normaliserEntrees(CORPS.message_stop.objet), { magasin: Mp, lireProfil: lp, maintenant: T0 })
  })
  obs['MW-9'] = { console: consoleMW6et7, typecheck: typecheck(RAC2, JUGE) }

  return obs
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function jeuxLisibles() {
  const e = []
  for (const [nom, c] of Object.entries(CORPS)) { const att = `sha256=${crypto.createHmac('sha256', SECRET).update(c.brut).digest('hex')}`; if (c.signature !== att) e.push(`${nom} : signature ${court(c.signature, 20)}, recalculée différente`) }
  if (CORPS_MODIFIE.brut.equals(CORPS.message_recu.brut)) e.push('CORPS_MODIFIE : identique au corps original (aucun octet changé)')
  if (CORPS_300KO.brut.length <= 256 * 1024) e.push(`CORPS_300KO : ${CORPS_300KO.brut.length} octets, plus de 256 Ko attendu`)
  return { e, detail: `${Object.keys(CORPS).length} corps + le corps de 300 Ko lus, chaque signature recalculée par le juge conforme` }
}
async function scenarioMagasinLocal() {
  const l = await scenarioMagasin()
  return { ok: REGLES_JP6.every((k) => l.find((x) => x.cle === k)?.ok), n: l.length }
}
function obsBase() {
  return {
    'MW-2': { bonnes: TOUS_SIGNES.map(() => true), modifie: false, tronquee: false, sansPrefixe: false, absente: false, source: 'export function verifierSignature(corpsBrut, entete, secret) {\n  if (!entete) return false\n  const attendu = `sha256=${crypto.createHmac("sha256", secret).update(corpsBrut).digest("hex")}`\n  const a = Buffer.from(entete), b = Buffer.from(attendu)\n  return a.length === b.length && crypto.timingSafeEqual(a, b)\n}' },
    'MW-3': { bonJeton: { statut: 200, corps: '123456' }, mauvaisJeton: { statut: 403 }, jetonAbsent: { statut: 403 }, variableAbsente: { statut: 403 } },
    'MW-4': { secretAbsent: { statut: 503, appels: 0 }, signatureFausse: { statut: 401, appels: 0 }, gros: { statut: 413 }, source: 'export async function POST(req) {\n  if (!process.env.META_APP_SECRET) return new Response(null, { status: 503 })\n  const brut = Buffer.from(await req.arrayBuffer())\n  if (brut.length > 256 * 1024) return new Response(null, { status: 413 })\n  if (!verifierSignature(brut, req.headers.get("x-hub-signature-256"), process.env.META_APP_SECRET)) return new Response(null, { status: 401 })\n  const corps = JSON.parse(brut.toString("utf8"))\n  await traiterEvenements(normaliserEntrees(corps), { magasin: magasinSupabase, lireProfil, maintenant: Date.now() })\n  return Response.json({ ok: true })\n}' },
    'MW-5': { SITE: true, 'site !': true, 'Site 🙂': true, 'Joli site, bravo': false, 'sites web pas chers': false },
    'MW-6': { conversationAimant: { commentaire_id: 'COM-TEMOIN-0001' }, conversationsApresAimant: 1, conversationsApresOrdinaire: 1, conversationsApresRejeu: 1 },
    'MW-7': { conversationMessage: { dernier_message_recu_le: '2026-10-14T08:00:00.000Z' }, reponseRecue: { source: 'meta' }, appelsProfilPremier: 1, appelsProfilSecond: 0, ecrituresApresEcho: 0, oppositionStop: true },
    'MW-8': { erreurConsentement: null, conversation: { pseudo: PROFIL_OK.pseudo, suit_le_compte: PROFIL_OK.suit_le_compte, abonnes: PROFIL_OK.abonnes }, appelsJaugePleine: 0 },
    'MW-9': { console: '', typecheck: { ok: true, detail: 'vert' } },
  }
}
function muter(base, id, m) { const x = JSON.parse(JSON.stringify(base[id])); m(x); return x }
function echantillons() {
  const b = obsBase()
  return {
    'MW-2': [['conforme', b['MW-2'], false], ['corps modifié accepté', muter(b, 'MW-2', (x) => { x.modifie = true }), true], ['timingSafeEqual absent du source', muter(b, 'MW-2', (x) => { x.source = x.source.replace('crypto.timingSafeEqual(a, b)', 'a.toString() === b.toString()') }), true]],
    'MW-3': [['conforme', b['MW-3'], false], ['mauvais jeton accepté', muter(b, 'MW-3', (x) => { x.mauvaisJeton.statut = 200 }), true], ['challenge tronqué', muter(b, 'MW-3', (x) => { x.bonJeton.corps = '1234' }), true]],
    'MW-4': [['conforme', b['MW-4'], false], ['secret absent : un appel au magasin', muter(b, 'MW-4', (x) => { x.secretAbsent.appels = 1 }), true], ['pauseGenerale( dans la route', muter(b, 'MW-4', (x) => { x.source += '\npauseGenerale()' }), true], ['JSON.parse avant verifierSignature', muter(b, 'MW-4', (x) => { x.source = 'JSON.parse(x)\n' + x.source }), true]],
    'MW-5': [['conforme', b['MW-5'], false], ['« Joli site, bravo » jugé aimant', muter(b, 'MW-5', (x) => { x['Joli site, bravo'] = true }), true]],
    'MW-6': [['conforme', b['MW-6'], false], ['commentaire ordinaire crée une conversation', muter(b, 'MW-6', (x) => { x.conversationsApresOrdinaire = 2 }), true], ['rejeu non idempotent', muter(b, 'MW-6', (x) => { x.conversationsApresRejeu = 2 }), true]],
    'MW-7': [['conforme', b['MW-7'], false], ['second appel au profil', muter(b, 'MW-7', (x) => { x.appelsProfilSecond = 1 }), true], ['STOP sans opposition', muter(b, 'MW-7', (x) => { x.oppositionStop = false }), true]],
    'MW-8': [['conforme', b['MW-8'], false], ['erreur de consentement propagée', muter(b, 'MW-8', (x) => { x.erreurConsentement = { exception: 'OAuthException' } }), true], ['champ en trop rangé', muter(b, 'MW-8', (x) => { x.conversation.jeton_page = 'fuite' }), true]],
    'MW-9': [['conforme', b['MW-9'], false], ['le secret dans la console', muter(b, 'MW-9', (x) => { x.console = `debug ${SECRET}` }), true], ['typecheck rouge', muter(b, 'MW-9', (x) => { x.typecheck = { ok: false, detail: 'TS2345' } }), true]],
  }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const ids = o.autoControle ? ['AC-1', 'AC-2', 'AC-3'] : IDS.slice()
const s = creerSortie(NOM, ids, `${NOM} — racine ${rel(RAC)} — jeux d'essai du dépôt du juge (scripts/fixtures/026-acquisition/meta-webhooks)`)
if (o.autoControle) {
  try { const r = jeuxLisibles(); s.juger('AC-1', r.e, r.detail) } catch (e) { s.echoue('AC-1', `interrompu : ${premiereLigne(e)}`) }
  try { const r = await scenarioMagasinLocal(); s.juger('AC-2', r.ok ? [] : [`magasin-memoire : une des ${REGLES_JP6.length} règles de JP-6 est rouge`], `magasin-memoire.mjs : ${r.n} règles jouées, les ${REGLES_JP6.length} de JP-6 vertes`) } catch (e) { s.echoue('AC-2', `interrompu : ${premiereLigne(e)}`) }
  try {
    const E = echantillons()
    const e = [], compte = { conformes: 0, fautifs: 0 }
    for (const id of IDS.slice(1)) {
      const liste = E[id]
      if (!liste || !liste.some(([, , rouge]) => rouge) || !liste.some(([, , rouge]) => !rouge)) { e.push(`${id} : pas d'échantillon conforme et fautif`); continue }
      for (const [nom, x, rouge] of liste) {
        let d
        try { d = C[id](x) } catch (err) { d = [`contrôle interrompu : ${premiereLigne(err)}`] }
        if (rouge && !d.length) e.push(`${id} : l'échantillon fautif « ${nom} » n'est pas repéré`)
        if (!rouge && d.length) e.push(`${id} : l'échantillon conforme « ${nom} » est refusé (${court(d[0], 100)})`)
        compte[rouge ? 'fautifs' : 'conformes']++
      }
    }
    s.juger('AC-3', e, `${compte.fautifs} échantillons fautifs repérés et ${compte.conformes} conformes acceptés par les contrôles MW-2 à MW-9`)
  } catch (e) { s.echoue('AC-3', `interrompu : ${premiereLigne(e)}`) }
} else {
  const fMod = path.join(RAC, 'lib', 'agents', 'acquisition', 'metaWebhooks.ts')
  const fRoute = path.join(RAC, 'app', 'api', 'webhooks', 'meta', 'route.ts')
  let mod = null, routeMod = null
  const e1 = []
  if (!fs.existsSync(fMod)) e1.push(`module absent : ${rel(fMod)}`)
  else {
    try { mod = await importerDepuis(RAC, 'lib/agents/acquisition/metaWebhooks.ts') } catch (e) { e1.push(`metaWebhooks.ts ne s'importe pas : ${premiereLigne(e)}`) }
    if (mod) for (const n of EXPORTS) if (typeof mod[n] !== 'function') e1.push(`export ${n} absent de metaWebhooks.ts (ou pas une fonction)`)
  }
  if (!fs.existsSync(fRoute)) e1.push(`route absente : ${rel(fRoute)}`)
  else {
    try { routeMod = await importerDepuis(RAC, 'app/api/webhooks/meta/route.ts') } catch (e) { e1.push(`route.ts ne s'importe pas : ${premiereLigne(e)}`) }
    if (routeMod) for (const n of ['GET', 'POST']) if (typeof routeMod[n] !== 'function') e1.push(`export ${n} absent de route.ts`)
  }
  s.juger('MW-1', e1, `metaWebhooks.ts (${EXPORTS.join(', ')}) et route.ts (GET, POST) importés depuis ${rel(RAC)}`)
  if (e1.length) s.nonJuges(IDS.slice(1), 'MW-1 en échec')
  else {
    let obs
    try { obs = await observer(mod, routeMod, RAC) } catch (e) { s.nonJuges(IDS.slice(1), `observation interrompue : ${premiereLigne(e)}`) }
    if (obs) for (const id of IDS.slice(1)) {
      const x = obs[id]
      if (!x) { s.echoue(id, 'non observé'); continue }
      if (x.exception && Object.keys(x).length === 1) { s.echoue(id, `interrompu : ${x.exception}`); continue }
      let d
      try { d = C[id](x) } catch (e) { d = [`contrôle interrompu : ${premiereLigne(e)}`] }
      s.juger(id, d, DETAILS[id] ?? 'conforme')
    }
  }
}
piege.retirer()
if (piege.tentatives.length) s.echoue(ids[0], `accès au réseau tenté pendant le juge : ${court(piege.tentatives.join(' ; '), 200)}`)
process.exit(s.finir())
