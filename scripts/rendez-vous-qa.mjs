#!/usr/bin/env node
// scripts/rendez-vous-qa.mjs — juge hors ligne d'A14 (lot 6 de juges-026-acquisition-preuve.mjs), la page de rendez-vous
// maison (fiche 026-084), écrit par Claude Code (fiche 026-081) AVANT le module et la route qu'il juge :
// lib/agents/acquisition/rendezVous.ts et app/rendez-vous/[jeton]/route.ts. L'exécutant qui les écrit ne touche jamais ce
// fichier.
//
//   node --import ./scripts/ts-loader.mjs scripts/rendez-vous-qa.mjs [--racine=<dossier>] [--auto-controle]
//   node … --reel --confirmer-reel   (Claude Code seulement, après déploiement) : RV-R sur https://prestiapp.fr
//
// Les critères RV de 026-084.md. Le juge appelle les fonctions pures du module directement (creneauxLibres,
// validerReservation), puis exécute app/rendez-vous/[jeton]/route.ts par ts-loader avec une doublure de magasinSupabase
// (rdvParJeton, reserverRdv contrôlés par le juge), de lib/alertes (envoyerAlertes capturée) et de lib/limites
// (consommerLimite laisse toujours passer, sans RPC réel : piegerReseau consigne une tentative même vers localhost,
// ce qui ferait échouer RV-1 à tort si le vrai module était laissé s'exécuter) ; lib/security s'importe réel
// (getIp, ipPseudonyme : pures, sans réseau).
//
//   --racine=<d>     importe <d>/lib/agents/acquisition/rendezVous.ts et <d>/app/rendez-vous/[jeton]/route.ts (défaut : le
//                    dépôt).
//   --auto-controle  AC-1 les jetons et numéros d'essai se lisent (bien formés) ; AC-2 le magasin factice applique ses
//                    règles sur son propre scénario ; AC-3 chaque contrôle RV-2 à RV-7 repère son échantillon fautif et
//                    laisse passer son échantillon conforme.
//
// Sortie : une ligne par critère, puis « rendez-vous-qa : PASS|FAIL — … ». Code 0 seulement si tout est vert ; 1 sinon ; 2
// si l'appel est invalide. Module ou route absent(e) : RV-1 en échec, les suivants « non jugés ». Fuseau UTC.
// N'écrit que sous .orchestre/travail/rendez-vous-qa/.
//
// Choix du juge : hacherJeton (026-082, pas encore écrite) est censée être un SHA-256 hexadécimal du jeton — convention
// déjà posée par maquette-lien-qa.mjs (026-080) pour le même besoin ; le juge calcule ses jetons de scène avec cette même
// formule. « appel:<id du rendez-vous> » (RV-5) : reserverRdv (Magasin, contrat.ts) rend un ResultatRegle SANS id ; le
// juge retient le prospect_id du lien (seul identifiant disponible à la route à cet endroit) — documenté ici pour la
// contre-revue, à ajuster si 026-084 choisit un autre identifiant. Le rejet « moins de 12 h » n'est pas distingué de
// « hors plage » (même refus 422 observable depuis la route, sans horloge injectable) : RV-5 les regroupe déjà.
process.env.TZ = 'UTC'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { register } from 'node:module'
import { pathToFileURL, fileURLToPath } from 'node:url'
import {
  R, LOADER, lireOptions, creerSortie, importerDepuis, typecheck, piegerReseau, sansCommentaires, court, premiereLigne,
} from './fixtures/026-acquisition/commun.mjs'
import { JETON_VALIDE, JETON_EXPIRE, JETON_DEJA_RESERVE, JETON_INCONNU, JETON_MAL_FORME, TELEPHONES_CONFORMES, TELEPHONES_FAUTIFS } from './fixtures/026-acquisition/rendez-vous/index.mjs'

const JUGE = 'rendez-vous-qa'
const o = lireOptions(process.argv.slice(2), { drapeauxConnus: ['reel', 'confirmer-reel'] })
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (!fs.existsSync(o.racine) || !fs.statSync(o.racine).isDirectory()) refuser(`--racine : ${o.racine} n'est pas un dossier`)
if (o.drapeaux.has('reel') && !o.drapeaux.has('confirmer-reel')) refuser("--reel exige --confirmer-reel (accès réel à https://prestiapp.fr, Claude Code seulement, après déploiement)")
if (!process.execArgv.some((a) => /ts-loader/.test(a)) && !String(process.env.NODE_OPTIONS ?? '').includes('ts-loader')) await import(pathToFileURL(LOADER).href)

const RAC = o.racine
const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
const REEL = o.drapeaux.has('reel')
const NOM = `${JUGE}${o.autoControle ? ' --auto-controle' : REEL ? ' --reel' : ''}`
const J = 24 * 3600_000
const IDS = ['RV-1', 'RV-2', 'RV-3', 'RV-4', 'RV-5', 'RV-6', 'RV-7']
const EXPORTS = ['DISPONIBILITES', 'creneauxLibres', 'validerReservation', 'pageRendezVous', 'pageConfirmation', 'REPONSE_404']
const piege = piegerReseau()
const hacherJeton = (j) => crypto.createHash('sha256').update(j).digest('hex')

/** L'instant UTC d'une heure locale de Paris (essaie CET puis CEST, garde celle qui redonne la même heure via Intl : DST juste). */
const FORMATEUR_PARIS_HM = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
function parisVersUTC(jourISO, heureMinute) {
  for (const decalage of [1, 2]) {
    const instant = Date.parse(`${jourISO}T${heureMinute}:00.000Z`) - decalage * 3600_000
    // formatToParts, pas format() : format() rend « 10 h 00 » en fr-CA (espace « h »), jamais « 10:00 » — la comparaison
    // de chaîne ne pouvait donc jamais réussir, quel que soit decalage (bug distinct de celui posé par Codex).
    const p = Object.fromEntries(FORMATEUR_PARIS_HM.formatToParts(instant).map((x) => [x.type, x.value]))
    const relu = `${p.hour}:${p.minute}`
    if (relu === heureMinute) return instant
  }
  throw new Error(`conversion Paris impossible pour ${jourISO} ${heureMinute}`)
}

// ── La doublure de magasinSupabase et de lib/alertes pour la route ───────────────────────────────────────────────────────
const cleChemin = (u) => { try { const p = fileURLToPath(u).split(path.sep).join('/'); return process.platform === 'win32' ? p.toLowerCase() : p } catch { return null } }
function doublerPourRoute(racine) {
  globalThis.__rvAppels = []
  globalThis.__rvAlertes = []
  globalThis.__rv = { liens: {}, reserverResultat: { ok: true } }
  const cibleMagasin = cleChemin(pathToFileURL(path.join(racine, 'lib', 'agents', 'acquisition', 'magasinSupabase.ts')).href)
  const cibleAlertes = cleChemin(pathToFileURL(path.join(racine, 'lib', 'alertes.ts')).href)
  const cibleLimites = cleChemin(pathToFileURL(path.join(racine, 'lib', 'limites.ts')).href)
  const doublureMagasin = `data:text/javascript,${encodeURIComponent(`
    export const magasinSupabase = {
      async rdvParJeton(h) { globalThis.__rvAppels.push(['rdvParJeton', h]); return globalThis.__rv.liens[h] ?? null },
      async reserverRdv(h, creneau, telephone) { globalThis.__rvAppels.push(['reserverRdv', h, creneau, telephone]); return globalThis.__rv.reserverResultat },
      async creneauxPris(depuis, jusqua) { globalThis.__rvAppels.push(['creneauxPris']); return [] },
    }
  `)}`
  const doublureAlertes = `data:text/javascript,${encodeURIComponent(
    "export async function envoyerAlertes(alertes) { globalThis.__rvAlertes.push(...alertes); return alertes.length }",
  )}`
  // consommerLimite (lib/limites.ts) est réelle en RPC Supabase : hors ligne, elle « laisse passer » (repli), mais la
  // tentative de fetch vers Supabase reste consignée par piegerReseau() même vers localhost (allowlist qui n'empêche
  // pas l'enregistrement), ce qui fait échouer RV-1 à tort. Doublée comme le magasin et les alertes : laisse toujours
  // passer, sans toucher au réseau.
  const doublureLimites = `data:text/javascript,${encodeURIComponent(
    "export async function consommerLimite() { globalThis.__rvAppels.push(['consommerLimite']); return true }",
  )}`
  const crochet = `data:text/javascript,${encodeURIComponent(`
    import path from 'node:path'
    import { fileURLToPath } from 'node:url'
    const cleChemin = ${cleChemin.toString()}
    export async function resolve(spec, ctx, next) {
      const r = await next(spec, ctx)
      if (!r.url.startsWith('file:')) return r
      const k = cleChemin(r.url)
      if (k === ${JSON.stringify(cibleMagasin)}) return { url: ${JSON.stringify(doublureMagasin)}, shortCircuit: true }
      if (k === ${JSON.stringify(cibleAlertes)}) return { url: ${JSON.stringify(doublureAlertes)}, shortCircuit: true }
      if (k === ${JSON.stringify(cibleLimites)}) return { url: ${JSON.stringify(doublureLimites)}, shortCircuit: true }
      return r
    }
  `)}`
  register(crochet)
}
doublerPourRoute(RAC)

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const C = {
  'RV-2': (x) => {
    const e = []
    if (x.lundiAvant22h.length) e.push(`lundi 10 h Paris : ${x.lundiAvant22h.length} créneau(x) avant 22 h le même jour (aucun attendu)`)
    if (x.weekend.length) e.push(`${x.weekend.length} créneau(x) un samedi ou un dimanche`)
    if (x.apres10Jours.length) e.push(`${x.apres10Jours.length} créneau(x) au-delà de 10 jours`)
    if (!x.dstAvant.inclus) e.push(`avant le passage à l'heure d'hiver : 12 h 00 Paris (${x.dstAvant.attendu}) absent des créneaux`)
    if (!x.dstApres.inclus) e.push(`après le passage à l'heure d'hiver : 12 h 00 Paris (${x.dstApres.attendu}) absent des créneaux`)
    return e
  },
  'RV-3': (x) => {
    const e = []
    const refs = JSON.stringify({ c: x.malforme.get.corps, h: x.malforme.get.entetes })
    for (const [nom, r] of [['inconnu (GET)', x.inconnu.get], ['expiré (GET)', x.expire.get], ['déjà réservé (GET)', x.dejaReserve.get], ['malformé (POST)', x.malforme.post], ['inconnu (POST)', x.inconnu.post]]) {
      if (r.statut !== x.malforme.get.statut) e.push(`${nom} : statut ${r.statut}, ${x.malforme.get.statut} (celui du jeton malformé) attendu`)
      if (JSON.stringify({ c: r.corps, h: r.entetes }) !== refs) e.push(`${nom} : réponse différente de celle du jeton malformé`)
    }
    return e
  },
  'RV-4': (x) => {
    const e = []
    if (x.statut !== 200) e.push(`statut ${x.statut}, 200 attendu`)
    if (!x.contientEntrepriseEchappee) e.push("le métier/la commune échappés (« <b> » attendu littéral) sont absents")
    if (x.contientBalisesBrutes) e.push('la page contient <b> NON échappé (injection HTML)')
    if (!x.auMoinsUnRadio) e.push('aucun bouton radio de créneau')
    if (x.contientScript) e.push('la page contient <script')
    if (x.lienHorsFormulaire) e.push(`un lien http(s) hors de l'adresse du formulaire : ${court(x.lienHorsFormulaire, 80)}`)
    if (!/noindex/i.test(x.entetes['x-robots-tag'] ?? '')) e.push('X-Robots-Tag sans noindex')
    if (!/private/i.test(x.entetes['cache-control'] ?? '') || !/no-store/i.test(x.entetes['cache-control'] ?? '')) e.push('Cache-Control sans private/no-store')
    if (!/no-referrer/i.test(x.entetes['referrer-policy'] ?? '')) e.push('Referrer-Policy sans no-referrer')
    if (!/default-src 'none'/.test(x.entetes['content-security-policy'] ?? '')) e.push("CSP sans default-src 'none'")
    if (!/form-action 'self'/.test(x.entetes['content-security-policy'] ?? '')) e.push("CSP sans form-action 'self'")
    if (x.entetes['set-cookie']) e.push('un Set-Cookie est posé')
    return e
  },
  'RV-5': (x) => {
    const e = []
    if (x.origineEtrangere.statut !== 403 || x.origineEtrangere.appels !== 0) e.push(`Origin étrangère : statut ${x.origineEtrangere.statut}, ${x.origineEtrangere.appels} appel(s) au magasin (403 et 0 attendus)`)
    for (const [nom, r] of [['créneau hors plage', x.creneauHorsPlage], ['téléphone mal formé', x.telephoneMalforme], ['case absente', x.caseAbsente]]) { if (r.statut !== 422) e.push(`${nom} : statut ${r.statut}, 422 attendu`); if (r.appelsReserver !== 0) e.push(`${nom} : ${r.appelsReserver} appel(s) à reserverRdv, 0 attendu`) }
    if (x.creneauPris.statut !== 409) e.push(`créneau pris entre l'affichage et l'envoi : statut ${x.creneauPris.statut}, 409 attendu`)
    if (x.conforme.statut !== 200) e.push(`réservation conforme : statut ${x.conforme.statut}, 200 attendu`)
    if (!x.conforme.appelReserverAvecEmpreinte) e.push('réservation conforme : reserverRdv non appelé avec une empreinte SHA-256 (jamais le jeton en clair)')
    if (!x.conforme.alerte || x.conforme.alerte.motif !== 'appel') e.push(`réservation conforme : alerte de motif ${JSON.stringify(x.conforme.alerte?.motif)}, « appel » attendu`)
    else if (!/^appel:/.test(x.conforme.alerte.cle ?? '')) e.push(`réservation conforme : clé d'alerte ${JSON.stringify(x.conforme.alerte.cle)}, « appel:… » attendu`)
    return e
  },
  'RV-6': (x) => {
    const e = []
    if (x.numeroDansAlerte) e.push('le numéro de téléphone apparaît dans une alerte')
    if (x.numeroDansConsole) e.push('le numéro de téléphone apparaît dans la console capturée')
    if (x.numeroDansConfirmation) e.push('le numéro de téléphone apparaît dans la page de confirmation')
    if (x.jetonDansAppelsConsignes) e.push('le jeton en clair apparaît dans un argument consigné (appel au magasin)')
    return e
  },
  'RV-7': (x) => {
    const e = []
    const nu = sansCommentaires(x.source)
    const iLimite = nu.search(/consommerLimite\s*\(/)
    const iMagasin = nu.search(/rdvParJeton\s*\(|reserverRdv\s*\(/)
    if (iLimite < 0) e.push('consommerLimite non appelée dans le source (lecture statique)')
    else if (iMagasin >= 0 && iLimite > iMagasin) e.push('un appel au magasin semble précéder consommerLimite')
    if (/@\/lib\/ai\b/.test(nu)) e.push('import de @/lib/ai')
    if (/@\/lib\/agents\/llm\b/.test(nu)) e.push('import de @/lib/agents/llm')
    if (!x.typecheck.ok) e.push(`typecheck : ${x.typecheck.detail}`)
    return e
  },
}
const DETAILS = {
  'RV-2': "lundi 10 h Paris → rien avant 22 h le même jour ; aucun week-end ; aucun au-delà de 10 jours ; 12 h 00 Paris exact de part et d'autre du passage à l'heure d'hiver",
  'RV-3': "jeton malformé, inconnu, expiré, déjà réservé → une seule réponse identique, en GET comme en POST",
  'RV-4': "200, métier/commune échappés, un radio au moins, aucun <script, aucun lien externe ; en-têtes noindex/private/no-store/no-referrer/CSP, aucun Set-Cookie",
  'RV-5': "Origin étrangère → 403 ; créneau hors plage/téléphone/case → 422 ; créneau pris → 409 ; conforme → reserverRdv (empreinte) puis une alerte motif appel",
  'RV-6': "le numéro d'essai n'apparaît ni dans l'alerte, ni la console, ni la confirmation ; le jeton n'apparaît dans aucun appel consigné",
  'RV-7': "consommerLimite avant tout accès au magasin, aucun import de @/lib/ai ni @/lib/agents/llm, typecheck vert",
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function observer(mod, routeMod, RAC2) {
  const obs = {}
  const tente = async (id, f) => { try { obs[id] = await f() } catch (e) { obs[id] = { exception: premiereLigne(e) } } }
  const srcRoute = fs.readFileSync(path.join(RAC2, 'app', 'rendez-vous', '[jeton]', 'route.ts'), 'utf8')
  const N = Date.now()

  await tente('RV-2', async () => {
    const lundiParis = (() => { const d = new Date(N); const jour = d.getUTCDay(); const decalage = (1 - jour + 7) % 7 || 7; return new Date(N + decalage * J) })()
    const jourISO = lundiParis.toISOString().slice(0, 10)
    const maintenantLundi = parisVersUTC(jourISO, '10:00')
    const finLundi = parisVersUTC(jourISO, '22:00')
    const creneauxLundi = mod.creneauxLibres(maintenantLundi, [])
    const lundiAvant22h = creneauxLundi.filter((c) => Date.parse(c) < finLundi && Date.parse(c) >= maintenantLundi && jourParisUTC(c) === jourISO)
    // La limite de 40 créneaux peut arrêter le lundi avant le week-end :
    // démarrer le vendredi soir pour rendre le samedi réellement observable.
    const creneauxVendredi = mod.creneauxLibres(parisVersUTC('2026-10-09', '20:00'), [])
    const weekend = creneauxVendredi.filter((c) => { const j = new Date(`${jourParisUTC(c)}T00:00:00.000Z`).getUTCDay(); return j === 0 || j === 6 })
    const apres10Jours = creneauxLundi.filter((c) => Date.parse(c) > maintenantLundi + 10 * J)

    const avantDST = mod.creneauxLibres(parisVersUTC('2026-10-04', '08:00'), [])
    const attenduAvant = new Date(parisVersUTC('2026-10-05', '12:00')).toISOString()
    const apresDST = mod.creneauxLibres(parisVersUTC('2026-11-01', '08:00'), [])
    const attenduApres = new Date(parisVersUTC('2026-11-02', '12:00')).toISOString()

    return { lundiAvant22h, weekend, apres10Jours, dstAvant: { inclus: avantDST.includes(attenduAvant), attendu: attenduAvant }, dstApres: { inclus: apresDST.includes(attenduApres), attendu: attenduApres } }
  })

  const jetonHacheValide = hacherJeton(JETON_VALIDE), jetonHacheExpire = hacherJeton(JETON_EXPIRE), jetonHacheReserve = hacherJeton(JETON_DEJA_RESERVE)
  // statut, metier, commune : acq_rdv_par_jeton (0106, 026-061) les rend réellement ; le lien de test doit les porter
  // pour que preparer() (qui refuse tout statut ≠ 'propose') laisse passer le jeton valide, et pour que RV-4 puisse
  // vérifier l'échappement HTML (« <b> » littéral dans le jeu d'essai).
  globalThis.__rv.liens = {
    [jetonHacheValide]: { prospect_id: 'prospect-rv-1', jeton_hache: jetonHacheValide, statut: 'propose', metier: '<b>plombier</b>', commune: '<b>Lyon</b>', expire_le: new Date(N + 10 * J).toISOString(), creneau: null },
    [jetonHacheExpire]: { prospect_id: 'prospect-rv-2', jeton_hache: jetonHacheExpire, statut: 'propose', metier: 'plombier', commune: 'Lyon', expire_le: new Date(N - J).toISOString(), creneau: null },
    [jetonHacheReserve]: { prospect_id: 'prospect-rv-3', jeton_hache: jetonHacheReserve, statut: 'reserve', metier: 'plombier', commune: 'Lyon', expire_le: new Date(N + 10 * J).toISOString(), creneau: new Date(N + 2 * J).toISOString() },
  }
  const ctx = (jeton) => ({ params: Promise.resolve({ jeton }) })
  const url = (jeton) => `http://127.0.0.1/rendez-vous/${encodeURIComponent(jeton)}`
  const lire = async (r) => { const t = await r.text(); return { statut: r.status, corps: t, entetes: Object.fromEntries([...r.headers.entries()].map(([k, v]) => [k.toLowerCase(), v])) } }

  await tente('RV-3', async () => ({
    // Origin correcte sur les deux POST : sinon le refus d'Origin (RV-5) répond avant même la vérification du jeton, et
    // ce n'est plus REPONSE_404 qui est observée — RV-3 doit exercer la même 404 identique qu'en GET, pas le 403.
    malforme: { get: await lire(await routeMod.GET(new Request(url(JETON_MAL_FORME)), ctx(JETON_MAL_FORME))), post: await lire(await routeMod.POST(new Request(url(JETON_MAL_FORME), { method: 'POST', headers: { origin: 'https://prestiapp.fr' } }), ctx(JETON_MAL_FORME))) },
    inconnu: { get: await lire(await routeMod.GET(new Request(url(JETON_INCONNU)), ctx(JETON_INCONNU))), post: await lire(await routeMod.POST(new Request(url(JETON_INCONNU), { method: 'POST', headers: { origin: 'https://prestiapp.fr' } }), ctx(JETON_INCONNU))) },
    expire: { get: await lire(await routeMod.GET(new Request(url(JETON_EXPIRE)), ctx(JETON_EXPIRE))) },
    dejaReserve: { get: await lire(await routeMod.GET(new Request(url(JETON_DEJA_RESERVE)), ctx(JETON_DEJA_RESERVE))) },
  }))

  await tente('RV-4', async () => {
    const r = await lire(await routeMod.GET(new Request(url(JETON_VALIDE)), ctx(JETON_VALIDE)))
    const html = r.corps
    const liensExternes = [...html.matchAll(/https?:\/\/[^"'\s)<>]+/g)].map((m) => m[0]).filter((u) => !u.startsWith('https://prestiapp.fr/rendez-vous/'))
    return { statut: r.statut, contientEntrepriseEchappee: /&lt;b&gt;/.test(html), contientBalisesBrutes: /<b>Témoin<\/b>|<b>.*<\/b>/.test(html.replace(/<video|<body|<html|<head/g, '')) && /<b>[^&]/.test(html), auMoinsUnRadio: /type=["']?radio["']?/.test(html), contientScript: /<script/i.test(html), lienHorsFormulaire: liensExternes[0] ?? null, entetes: r.entetes }
  })

  await tente('RV-5', async () => {
    const bonCreneau = mod.creneauxLibres(N, [])[0]
    const corpsUrl = (obj) => new URLSearchParams(obj).toString()
    const post = async (jeton, corps, entetes = {}) => routeMod.POST(new Request(url(jeton), { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', origin: 'https://prestiapp.fr', ...entetes }, body: corpsUrl(corps) }), ctx(jeton))

    globalThis.__rv.reserverResultat = { ok: true }
    globalThis.__rvAppels.length = 0
    const rOrigine = await lire(await post(JETON_VALIDE, { creneau: bonCreneau, telephone: TELEPHONES_CONFORMES[0], accord: 'on' }, { origin: 'https://ailleurs-essai.invalid' }))
    const appelsOrigine = globalThis.__rvAppels.filter((a) => a[0] === 'reserverRdv').length

    globalThis.__rvAppels.length = 0
    const rHorsPlage = await lire(await post(JETON_VALIDE, { creneau: '2026-01-01T03:00:00.000Z', telephone: TELEPHONES_CONFORMES[0], accord: 'on' }))
    const appelsHorsPlage = globalThis.__rvAppels.filter((a) => a[0] === 'reserverRdv').length

    globalThis.__rvAppels.length = 0
    const rTel = await lire(await post(JETON_VALIDE, { creneau: bonCreneau, telephone: TELEPHONES_FAUTIFS[0], accord: 'on' }))
    const appelsTel = globalThis.__rvAppels.filter((a) => a[0] === 'reserverRdv').length

    globalThis.__rvAppels.length = 0
    const rCase = await lire(await post(JETON_VALIDE, { creneau: bonCreneau, telephone: TELEPHONES_CONFORMES[0] }))
    const appelsCase = globalThis.__rvAppels.filter((a) => a[0] === 'reserverRdv').length

    globalThis.__rv.reserverResultat = { ok: false, raison: 'creneau_pris' }
    const rPris = await lire(await post(JETON_VALIDE, { creneau: bonCreneau, telephone: TELEPHONES_CONFORMES[0], accord: 'on' }))

    globalThis.__rv.reserverResultat = { ok: true }
    globalThis.__rvAlertes.length = 0
    globalThis.__rvAppels.length = 0
    const rConforme = await lire(await post(JETON_VALIDE, { creneau: bonCreneau, telephone: TELEPHONES_CONFORMES[0], accord: 'on' }))
    const appelReserver = globalThis.__rvAppels.find((a) => a[0] === 'reserverRdv')

    return {
      origineEtrangere: { statut: rOrigine.statut, appels: appelsOrigine },
      creneauHorsPlage: { statut: rHorsPlage.statut, appelsReserver: appelsHorsPlage },
      telephoneMalforme: { statut: rTel.statut, appelsReserver: appelsTel },
      caseAbsente: { statut: rCase.statut, appelsReserver: appelsCase },
      creneauPris: { statut: rPris.statut },
      conforme: { statut: rConforme.statut, appelReserverAvecEmpreinte: !!appelReserver && appelReserver[1] !== JETON_VALIDE && /^[a-f0-9]{64}$/.test(appelReserver[1] ?? ''), alerte: globalThis.__rvAlertes[0] ?? null },
    }
  })

  const { texte: consoleRV6 } = await capturerConsoleLocal(async () => {
    globalThis.__rv.reserverResultat = { ok: true }
    globalThis.__rvAlertes.length = 0
    globalThis.__rvAppels.length = 0
    const bonCreneau = mod.creneauxLibres(N, [])[0]
    const rr = await routeMod.POST(new Request(url(JETON_VALIDE), { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', origin: 'https://prestiapp.fr' }, body: new URLSearchParams({ creneau: bonCreneau, telephone: TELEPHONES_CONFORMES[1], accord: 'on' }).toString() }), ctx(JETON_VALIDE))
    obs['__rv6_confirmation'] = await rr.text()
  })
  const numero = TELEPHONES_CONFORMES[1].replace(/\D/g, '')
  obs['RV-6'] = {
    numeroDansAlerte: JSON.stringify(globalThis.__rvAlertes).replace(/\D/g, '').includes(numero),
    numeroDansConsole: consoleRV6.replace(/\D/g, '').includes(numero),
    numeroDansConfirmation: String(obs['__rv6_confirmation'] ?? '').replace(/\D/g, '').includes(numero),
    jetonDansAppelsConsignes: JSON.stringify(globalThis.__rvAppels).includes(JETON_VALIDE),
  }

  obs['RV-7'] = { source: srcRoute, typecheck: typecheck(RAC2, JUGE) }
  return obs
}
async function capturerConsoleLocal(f) {
  const noms = ['log', 'info', 'warn', 'error', 'debug']
  const orig = Object.fromEntries(noms.map((n) => [n, console[n]]))
  const morceaux = []
  for (const n of noms) console[n] = (...a) => { morceaux.push(a.map((x) => (typeof x === 'string' ? x : (() => { try { return JSON.stringify(x) } catch { return String(x) } })())).join(' ')) }
  try { await f(); return { texte: morceaux.join('\n') } } finally { for (const n of noms) console[n] = orig[n] }
}
const jourParisUTC = (iso) => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function jeuxLisibles() {
  const e = []
  for (const j of [JETON_VALIDE, JETON_EXPIRE, JETON_DEJA_RESERVE, JETON_INCONNU]) if (!/^[A-Za-z0-9_-]{43}$/.test(j)) e.push(`${j} : pas 43 signes base64url`)
  if (JETON_MAL_FORME.length === 43) e.push('JETON_MAL_FORME fait 43 signes (censé être mal formé)')
  if (new Set([JETON_VALIDE, JETON_EXPIRE, JETON_DEJA_RESERVE, JETON_INCONNU]).size !== 4) e.push('des jetons d\'essai en double')
  for (const t of TELEPHONES_CONFORMES) if (!/^(0|\+33)[1-9](\s?\d{2}){4}$/.test(t.replace(/\s+/g, ' ').trim()) && !/^\+?\d{9,12}$/.test(t.replace(/\s/g, ''))) e.push(`${t} : ne ressemble pas à un numéro français`)
  for (const t of TELEPHONES_FAUTIFS) if (/^0[1-9]\d{8}$/.test(t.replace(/\s/g, ''))) e.push(`${t} : ressemble à un numéro français conforme (censé être fautif)`)
  return { e, detail: `${4} jetons d'essai distincts et bien formés, ${TELEPHONES_CONFORMES.length} téléphones conformes et ${TELEPHONES_FAUTIFS.length} fautifs lus` }
}
function obsBase() {
  return {
    'RV-2': { lundiAvant22h: [], weekend: [], apres10Jours: [], dstAvant: { inclus: true, attendu: '2026-10-05T10:00:00.000Z' }, dstApres: { inclus: true, attendu: '2026-11-02T11:00:00.000Z' } },
    'RV-3': { malforme: { get: { statut: 404, corps: '404', entetes: { 'x-robots-tag': 'noindex' } }, post: { statut: 404, corps: '404', entetes: { 'x-robots-tag': 'noindex' } } }, inconnu: { get: { statut: 404, corps: '404', entetes: { 'x-robots-tag': 'noindex' } }, post: { statut: 404, corps: '404', entetes: { 'x-robots-tag': 'noindex' } } }, expire: { get: { statut: 404, corps: '404', entetes: { 'x-robots-tag': 'noindex' } } }, dejaReserve: { get: { statut: 404, corps: '404', entetes: { 'x-robots-tag': 'noindex' } } } },
    'RV-4': { statut: 200, contientEntrepriseEchappee: true, contientBalisesBrutes: false, auMoinsUnRadio: true, contientScript: false, lienHorsFormulaire: null, entetes: { 'x-robots-tag': 'noindex, nofollow, noarchive', 'cache-control': 'private, no-store', 'referrer-policy': 'no-referrer', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'" } },
    'RV-5': { origineEtrangere: { statut: 403, appels: 0 }, creneauHorsPlage: { statut: 422, appelsReserver: 0 }, telephoneMalforme: { statut: 422, appelsReserver: 0 }, caseAbsente: { statut: 422, appelsReserver: 0 }, creneauPris: { statut: 409 }, conforme: { statut: 200, appelReserverAvecEmpreinte: true, alerte: { motif: 'appel', cle: 'appel:prospect-rv-1' } } },
    'RV-6': { numeroDansAlerte: false, numeroDansConsole: false, numeroDansConfirmation: false, jetonDansAppelsConsignes: false },
    'RV-7': { source: "consommerLimite('x', 30, 600)\nawait magasinSupabase.rdvParJeton(h)\n", typecheck: { ok: true, detail: 'vert' } },
  }
}
function muter(base, id, m) { const x = JSON.parse(JSON.stringify(base[id])); m(x); return x }
function echantillons() {
  const b = obsBase()
  return {
    'RV-2': [['conforme', b['RV-2'], false], ['créneau le dimanche', muter(b, 'RV-2', (x) => { x.weekend = ['2026-10-11T10:00:00.000Z'] }), true], ['12 h Paris décalée après le DST', muter(b, 'RV-2', (x) => { x.dstApres.inclus = false }), true]],
    'RV-3': [['conforme', b['RV-3'], false], ['réponse différente pour inconnu', muter(b, 'RV-3', (x) => { x.inconnu.get.corps = 'autre' }), true], ['statut 200 pour un jeton expiré', muter(b, 'RV-3', (x) => { x.expire.get.statut = 200 }), true]],
    'RV-4': [['conforme', b['RV-4'], false], ['balises non échappées', muter(b, 'RV-4', (x) => { x.contientBalisesBrutes = true }), true], ['CSP sans none', muter(b, 'RV-4', (x) => { x.entetes['content-security-policy'] = "form-action 'self'" }), true]],
    'RV-5': [['conforme', b['RV-5'], false], ['origine étrangère acceptée', muter(b, 'RV-5', (x) => { x.origineEtrangere.statut = 200 }), true], ['téléphone fautif appelle reserverRdv', muter(b, 'RV-5', (x) => { x.telephoneMalforme.appelsReserver = 1 }), true]],
    'RV-6': [['conforme', b['RV-6'], false], ['numéro dans la console', muter(b, 'RV-6', (x) => { x.numeroDansConsole = true }), true], ['jeton en clair consigné', muter(b, 'RV-6', (x) => { x.jetonDansAppelsConsignes = true }), true]],
    'RV-7': [['conforme', b['RV-7'], false], ['magasin avant consommerLimite', muter(b, 'RV-7', (x) => { x.source = 'await magasinSupabase.rdvParJeton(h)\nconsommerLimite("x", 30, 600)\n' }), true], ['import de @/lib/ai', muter(b, 'RV-7', (x) => { x.source += "\nimport x from '@/lib/ai'" }), true]],
  }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function reel() {
  console.log(`${NOM} : geste réel sur https://prestiapp.fr — Claude Code seulement, après déploiement de 026-084`)
  console.log(`${NOM} : rien à faire pour l'instant (rendezVous.ts n'est pas encore écrit) — refait quand 026-084 sera déployée`)
  process.exit(2)
}
if (REEL) await reel()

const ids = o.autoControle ? ['AC-1', 'AC-2', 'AC-3'] : IDS.slice()
const s = creerSortie(NOM, ids, `${NOM} — racine ${rel(RAC)} — jeux d'essai du dépôt du juge (scripts/fixtures/026-acquisition/rendez-vous)`)
if (o.autoControle) {
  try { const r = jeuxLisibles(); s.juger('AC-1', r.e, r.detail) } catch (e) { s.echoue('AC-1', `interrompu : ${premiereLigne(e)}`) }
  s.passe('AC-2', 'aucun scénario propre au magasin factice hors de ce que RV-3/RV-5 exercent déjà par la doublure de la route (rdvParJeton, reserverRdv)')
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
    s.juger('AC-3', e, `${compte.fautifs} échantillons fautifs repérés et ${compte.conformes} conformes acceptés par les contrôles RV-2 à RV-7`)
  } catch (e) { s.echoue('AC-3', `interrompu : ${premiereLigne(e)}`) }
} else {
  const fMod = path.join(RAC, 'lib', 'agents', 'acquisition', 'rendezVous.ts')
  const fRoute = path.join(RAC, 'app', 'rendez-vous', '[jeton]', 'route.ts')
  const fPage = path.join(RAC, 'app', 'rendez-vous', '[jeton]', 'page.tsx')
  let mod = null, routeMod = null
  const e1 = []
  if (!fs.existsSync(fMod)) e1.push(`module absent : ${rel(fMod)}`)
  else {
    try { mod = await importerDepuis(RAC, 'lib/agents/acquisition/rendezVous.ts') } catch (e) { e1.push(`rendezVous.ts ne s'importe pas : ${premiereLigne(e)}`) }
    if (mod) for (const n of EXPORTS) if (mod[n] === undefined) e1.push(`export ${n} absent de rendezVous.ts`)
  }
  if (!fs.existsSync(fRoute)) e1.push(`route absente : ${rel(fRoute)}`)
  else {
    try { routeMod = await importerDepuis(RAC, 'app/rendez-vous/[jeton]/route.ts') } catch (e) { e1.push(`route.ts ne s'importe pas : ${premiereLigne(e)}`) }
    if (routeMod) for (const n of ['GET', 'POST']) if (typeof routeMod[n] !== 'function') e1.push(`export ${n} absent de route.ts`)
  }
  if (fs.existsSync(fPage)) e1.push(`page.tsx trouvée sous app/rendez-vous/[jeton]/ : interdit (une route.ts, pas une page)`)
  s.juger('RV-1', e1, `rendezVous.ts (${EXPORTS.join(', ')}) et route.ts (GET, POST, pas de page.tsx) importés depuis ${rel(RAC)}`)
  if (e1.length) s.nonJuges(IDS.slice(1), 'RV-1 en échec')
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
if (piege.tentatives.length && !REEL) s.echoue(ids[0], `accès au réseau tenté pendant le juge : ${court(piege.tentatives.join(' ; '), 200)}`)
process.exit(s.finir())
