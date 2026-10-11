#!/usr/bin/env node
// scripts/maquette-lien-qa.mjs — juge hors ligne d'A2, le lien privé d'une maquette (fiche 026-080), écrit par Claude Code
// AVANT le module qu'il juge (lib/agents/acquisition/maquettesLien.ts, fiche 026-082). L'exécutant qui écrit ce module ne
// touche jamais ce fichier.
//
//   node --import ./scripts/ts-loader.mjs scripts/maquette-lien-qa.mjs [--racine=<dossier>] [--auto-controle]
//   node … --reel --confirmer-reel   (Claude Code seulement, après déploiement) : ML-R sur https://prestiapp.fr
//
// Les critères ML de 026-082.md. Convention posée par ce juge (026-082 doit la suivre) : le `objet` d'une maquette
// (`creerLienMaquette(pid, objet, …)`) est le préfixe de ses fichiers dans le stockage : `${objet}/capture.jpg` et
// `${objet}/video.mp4`.
//
// Signatures attendues (026-082) : creerJeton() ; hacherJeton(jeton) ; expiration(maintenant) ; servirMaquette(jeton,
// fichier, deps, plage?), deps = { magasin, stockage } ; executerPurge(deps).
//
//   --racine=<d>     importe <d>/lib/agents/acquisition/maquettesLien.ts (défaut : le dépôt).
//   --auto-controle  AC-1 les jeux d'essai se lisent (les deux JPEG et le MP4 d'essai se décodent) ; AC-2 le magasin
//                    factice applique ses règles sur son propre scénario ; AC-3 chaque contrôle ML-2 à ML-9 repère son
//                    échantillon fautif et laisse passer son échantillon conforme.
//
// Sortie : une ligne par critère, puis « maquette-lien-qa : PASS|FAIL — … ». Code 0 seulement si tout est vert ; 1 sinon ;
// 2 si l'appel est invalide. Module absent : ML-1 en échec, les suivants « non jugés ». Hors ligne (sauf --reel), fuseau
// UTC. Écriture seulement sous .orchestre/travail/maquette-lien-qa/.
process.env.TZ = 'UTC'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import {
  R, LOADER, lireOptions, creerSortie, importerDepuis, typecheck, piegerReseau, sansCommentaires, court, premiereLigne,
} from './fixtures/026-acquisition/commun.mjs'
import { creerMagasin } from './fixtures/026-acquisition/magasin-memoire.mjs'
import { creerHorloge } from './fixtures/026-acquisition/horloge-factice.mjs'
import { creerStockageFactice } from './fixtures/026-acquisition/maquettes/stockage-factice.mjs'

const JUGE = 'maquette-lien-qa'
const FIX = path.join(R, 'scripts', 'fixtures', '026-acquisition', 'maquettes')
const o = lireOptions(process.argv.slice(2), { drapeauxConnus: ['reel', 'confirmer-reel'] })
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (!fs.existsSync(o.racine) || !fs.statSync(o.racine).isDirectory()) refuser(`--racine : ${o.racine} n'est pas un dossier`)
if (o.drapeaux.has('reel') && !o.drapeaux.has('confirmer-reel')) refuser('--reel exige --confirmer-reel (accès réel à https://prestiapp.fr, Claude Code seulement, après déploiement)')
if (!process.execArgv.some((a) => /ts-loader/.test(a)) && !String(process.env.NODE_OPTIONS ?? '').includes('ts-loader')) await import(pathToFileURL(LOADER).href)

const RAC = o.racine
const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
const REEL = o.drapeaux.has('reel')
const NOM = `${JUGE}${o.autoControle ? ' --auto-controle' : REEL ? ' --reel' : ''}`
const T0 = Date.parse('2026-10-14T08:00:00.000Z')
const J = 24 * 3600_000
const IDS = ['ML-1', 'ML-2', 'ML-3', 'ML-4', 'ML-5', 'ML-6', 'ML-7', 'ML-8', 'ML-9']
const EXPORTS_ML1 = ['creerJeton', 'hacherJeton', 'expiration', 'servirMaquette', 'executerPurge']
const json = (x) => { try { return JSON.stringify(x) ?? '' } catch { return String(x) } }
const piege = piegerReseau()

const JPEG_TEL = fs.readFileSync(path.join(FIX, 'capture-telephone.jpg'))
const JPEG_ORDI = fs.readFileSync(path.join(FIX, 'capture-ordinateur.jpg'))
const MP4 = fs.readFileSync(path.join(FIX, 'video-essai.mp4'))
/** Un décodeur JPEG minimal, indépendant de tout module jugé : SOI/EOI, dimensions du premier segment SOFn. */
function decoderJpeg(buf) {
  if (!(buf[0] === 0xff && buf[1] === 0xd8)) return { ok: false, raison: 'SOI absent' }
  if (!(buf[buf.length - 2] === 0xff && buf[buf.length - 1] === 0xd9)) return { ok: false, raison: 'EOI absent' }
  let i = 2
  while (i < buf.length - 1) {
    if (buf[i] !== 0xff) { i++; continue }
    const marqueur = buf[i + 1]
    if (marqueur === 0xd8 || marqueur === 0xd9 || (marqueur >= 0xd0 && marqueur <= 0xd7) || marqueur === 0x01) { i += 2; continue }
    const taille = buf.readUInt16BE(i + 2)
    if (marqueur >= 0xc0 && marqueur <= 0xcf && marqueur !== 0xc4 && marqueur !== 0xc8 && marqueur !== 0xcc) {
      return { ok: true, hauteur: buf.readUInt16BE(i + 5), largeur: buf.readUInt16BE(i + 7) }
    }
    if (marqueur === 0xda) break
    i += 2 + taille
  }
  return { ok: false, raison: 'aucun segment SOF' }
}

// ── Le magasin et le stockage d'essai, une maquette prête ────────────────────────────────────────────────────────────────
let compteurMaquette = 0
/** Ajoute une maquette prête, avec son lien, à un magasin et un stockage déjà créés. */
async function ajouterMaquette(M, S, H, { expireDansJours = EXPIRATION_MAQUETTE_JOURS_ESSAI, entreprise = 'Atelier Témoin', avecVideo = true, jeton } = {}) {
  compteurMaquette += 1
  const n = compteurMaquette
  const pid = M.inserer({ cle_dedup: `domaine:maquette-lien-${n}-temoin.invalid`, source: 'ademe_rge', cible: 'artisan', domaine: `maquette-lien-${n}-temoin.invalid`, entreprise, faits: [], canaux: [], froid: true, etape: 'verifie' })
  await M.enregistrerMaquettePrete(pid, { chemin: 'temoin', empreinte: crypto.createHash('sha256').update('temoin').digest('hex'), variante: 'B' })
  const j = jeton ?? String.fromCharCode(65 + (n % 26)).repeat(43)
  const jetonHache = crypto.createHash('sha256').update(j).digest('hex')
  const objet = `objets/${pid}`
  const expireLe = new Date(H.maintenant() + expireDansJours * J).toISOString()
  await M.creerLienMaquette(pid, objet, jetonHache, expireLe)
  S.poser(`${objet}/capture.jpg`, JPEG_TEL, 'image/jpeg')
  if (avecVideo) S.poser(`${objet}/video.mp4`, MP4, 'video/mp4')
  return { pid, jeton: j, jetonHache, objet, expireLe }
}
/** Un magasin et un stockage neufs, une seule maquette prête. */
async function scene({ horloge, expireDansJours = EXPIRATION_MAQUETTE_JOURS_ESSAI, purgee = false, entreprise = 'Atelier Témoin', avecVideo = true } = {}) {
  const H = horloge ?? creerHorloge(T0)
  const M = creerMagasin({ horloge: H })
  const S = creerStockageFactice()
  const { pid, jeton, jetonHache, objet, expireLe } = await ajouterMaquette(M, S, H, { expireDansJours, entreprise, avecVideo })
  if (purgee) { const mq = await M.maquetteDe(pid); await M.marquerMaquettePurgee(mq.id) }
  return { M, S, H, pid, jeton, jetonHache, objet, expireLe, entreprise }
}
const EXPIRATION_MAQUETTE_JOURS_ESSAI = 21

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const C = {
  'ML-2': (x) => {
    const e = []
    if (new Set(x.jetons).size !== x.jetons.length) e.push(`${x.jetons.length - new Set(x.jetons).size} jeton(s) en double sur ${x.jetons.length}`)
    if (x.jetons.some((j) => !/^[A-Za-z0-9_-]{43}$/.test(j))) e.push('un jeton hors de 43 signes base64url')
    if (!x.hachesOk) e.push('hacherJeton ne recalcule pas un SHA-256')
    if (x.joursExpiration !== 21) e.push(`expiration : ${x.joursExpiration} jour(s), 21 attendus`)
    return e
  },
  'ML-3': (x) => {
    const e = []
    const ref = json({ corps: x.malforme.corps, entetes: x.malforme.entetes })
    for (const [nom, r] of [['inconnu', x.inconnu], ['expire', x.expire], ['purgee', x.purgee], ['traversee', x.traversee], ['expiree_servie_par_le_magasin', x.expireeHostile], ['purgee_servie_par_le_magasin', x.purgeeHostile], ['purgee_le_servie_par_le_magasin', x.purgeeLeHostile], ['sans_expiration_servie_par_le_magasin', x.sansExpirationHostile]]) {
      if (!r) { e.push(`${nom} : observation absente`); continue }
      if (r.statut !== 404) e.push(`${nom} : statut ${r.statut}, 404 attendu`)
      if (json({ corps: r.corps, entetes: r.entetes }) !== ref) e.push(`${nom} : réponse différente du 404 du jeton malformé`)
    }
    return e
  },
  'ML-4': (x) => {
    const e = []
    if (!x.page.contientEntrepriseEchappee) e.push('la page ne contient pas le nom de l\'entreprise échappé (« <b> » attendu littéral, pas exécuté)')
    if (x.page.contientEntrepriseBrute) e.push('la page contient le nom de l\'entreprise NON échappé (injection HTML)')
    if (!x.page.contientRienPublie) e.push('« Rien n\'est publié » absent')
    if (!x.page.contientDateFin) e.push('la date de fin est absente')
    if (!x.page.video) e.push('aucune balise <video playsinline> pointant video.mp4')
    if (x.capture.type !== 'image/jpeg' || !x.capture.octetsIdentiques) e.push(`capture.jpg : type ${json(x.capture.type)}, octets identiques ${x.capture.octetsIdentiques}`)
    if (x.sansVideo.contientVideo) e.push('maquette sans vidéo : la page contient encore <video')
    if (x.sansVideo.statutVideoMp4 !== 404) e.push(`maquette sans vidéo, video.mp4 : statut ${x.sansVideo.statutVideoMp4}, 404 attendu`)
    return e
  },
  'ML-5': (x) => {
    const e = []
    for (const [nom, h] of Object.entries(x.entetes)) {
      if (!/noindex/i.test(h['x-robots-tag'] ?? '')) e.push(`${nom} : X-Robots-Tag sans noindex`)
      if (!/private/i.test(h['cache-control'] ?? '') || !/no-store/i.test(h['cache-control'] ?? '')) e.push(`${nom} : Cache-Control sans private/no-store`)
      if (!/no-referrer/i.test(h['referrer-policy'] ?? '')) e.push(`${nom} : Referrer-Policy sans no-referrer`)
    }
    if (!/default-src 'none'/.test(x.cspHtml)) e.push('CSP HTML sans default-src \'none\'')
    if (!/media-src 'self'/.test(x.cspHtml)) e.push('CSP HTML sans media-src \'self\'')
    if (/<script/i.test(x.html)) e.push('la page contient <script')
    if (/https?:\/\/(?!prestiapp\.fr\/maquette)/i.test(x.html.replace(/https?:\/\/prestiapp\.fr\/maquette\/[^"'\s]+/g, ''))) e.push('la page contient un lien hors d\'elle-même')
    return e
  },
  'ML-6': (x) => (x.ecrituresPendant !== 0 ? [`${x.ecrituresPendant} écriture(s) du magasin factice pendant ${x.consultations} consultations, zéro attendu`] : []),
  'ML-7': (x) => {
    const e = []
    if (x.retiresEtMarques !== x.expiresAttendus) e.push(`${x.retiresEtMarques} objet(s) retiré(s) et marqué(s), ${x.expiresAttendus} attendu(s) (les non expirés doivent rester)`)
    if (x.panne.marques !== 0) e.push(`en panne de stockage : ${x.panne.marques} ligne(s) marquée(s), zéro attendu`)
    return e
  },
  'ML-8': (x) => {
    const e = []
    if (!x.routeMaquette.estRoute) e.push('app/maquette/… n\'est pas un fichier route.ts')
    if (!x.routeMaquette.awaitParams) e.push('la route ne fait pas await ctx.params')
    if (!x.routeMaquette.consommerLimiteAvant) e.push('consommerLimite n\'est pas appelée avant servirMaquette')
    if (!x.routePurge.jetonPuisPause) e.push('la route de purge n\'a pas la garde du jeton avant pauseGenerale(')
    if (x.routePurge.appelleBattement) e.push('la route de purge appelle une fonction de battement (ops_battement) : interdit (ML-8, 026-082 §3)')
    if (x.routePurge.litPause) e.push('la route de purge lit PRESTI_PAUSE_AGENTS')
    if (x.fichiersHorsPublic === false) e.push('un fichier a été ajouté sous public/')
    if (!x.typecheck.ok) e.push(`typecheck : ${x.typecheck.detail}`)
    return e
  },
  'ML-9': (x) => {
    const e = []
    if (x.sansPlage.statut !== 200 || x.sansPlage.type !== 'video/mp4' || x.sansPlage.acceptRanges !== 'bytes' || !x.sansPlage.octetsIdentiques) e.push(`sans plage : statut ${x.sansPlage.statut}, type ${json(x.sansPlage.type)}, Accept-Ranges ${json(x.sansPlage.acceptRanges)}, octets identiques ${x.sansPlage.octetsIdentiques}`)
    if (x.avecPlage.statut !== 206 || x.avecPlage.contentRange !== x.avecPlage.contentRangeAttendu || !x.avecPlage.mille24Identiques) e.push(`Range 0-1023 : statut ${x.avecPlage.statut}, Content-Range ${json(x.avecPlage.contentRange)} (${json(x.avecPlage.contentRangeAttendu)} attendu), 1024 octets identiques ${x.avecPlage.mille24Identiques}`)
    if (x.horsFichier.statut !== 416) e.push(`Range hors du fichier : statut ${x.horsFichier.statut}, 416 attendu`)
    if (x.ecrituresPendant !== 0) e.push(`${x.ecrituresPendant} écriture(s) du magasin factice pendant les plages vidéo, zéro attendu`)
    return e
  },
}
const DETAILS = {
  'ML-2': '1000 jetons distincts de 43 signes base64url ; hacherJeton = SHA-256 recalculé ; expiration = 21 jours pile',
  'ML-3': 'jeton malformé, inconnu, expiré, purgé, fichier ../x, et ligne expirée / purgée / sans date de fin rendue telle quelle par un magasin hostile → des 404 identiques (corps et en-têtes)',
  'ML-4': "lien valide : entreprise échappée, « Rien n'est publié », date de fin, <video playsinline> ; capture.jpg exacte ; sans vidéo : page sans <video, video.mp4 → 404",
  'ML-5': "noindex, private/no-store, no-referrer sur chaque 200/206 ; CSP default-src 'none' + media-src 'self' ; aucun <script, aucun lien hors d'elle-même",
  'ML-6': 'zéro écriture du magasin factice pendant 20 consultations',
  'ML-7': 'seuls les objets expirés sont retirés et marqués ; stockage en panne → aucune ligne marquée',
  'ML-8': "route.ts (pas une page), await ctx.params, consommerLimite avant servirMaquette ; purge : jeton puis pauseGenerale(, aucun battement, aucune lecture de PRESTI_PAUSE_AGENTS ; rien sous public/ ; typecheck vert",
  'ML-9': 'sans plage → 200 + Accept-Ranges ; Range 0-1023 → 206 + Content-Range ; hors fichier → 416 ; zéro écriture',
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function observer(mod, RAC2) {
  const obs = {}
  const tente = async (id, f) => { try { obs[id] = await f() } catch (e) { obs[id] = { exception: premiereLigne(e) } } }
  const servir = async (deps, jeton, fichier, plage) => {
    const r = await mod.servirMaquette(jeton, fichier, deps, plage)
    return { statut: r.statut, entetes: Object.fromEntries(Object.entries(r.entetes ?? {}).map(([k, v]) => [k.toLowerCase(), v])), corps: r.corps }
  }

  await tente('ML-2', async () => {
    const jetons = Array.from({ length: 1000 }, () => mod.creerJeton())
    const hachesOk = jetons.slice(0, 20).every((j) => mod.hacherJeton(j) === crypto.createHash('sha256').update(j).digest('hex'))
    const t = mod.expiration(T0)
    const joursExpiration = Math.round((Date.parse(t) - T0) / J)
    return { jetons, hachesOk, joursExpiration }
  })

  await tente('ML-3', async () => {
    const { M, S, jeton } = await scene()
    const deps = { magasin: M, stockage: S }
    const malforme = await servir(deps, 'jeton-trop-court', undefined)
    // '0'.repeat(43) : jamais un jeton généré par ajouterMaquette (toujours une lettre A-Z répétée, jamais un
    // chiffre) — 'B'.repeat(43) collisionnait avec le jeton de la maquette que scene() vient de créer ci-dessus
    // (premier appel du fichier : n=1, 'B' = 65+1 en base ASCII), rendant ce jeton « connu », pas « inconnu »
    // (défaut trouvé en jugeant réellement le patch de 026-082).
    const inconnu = await servir(deps, '0'.repeat(43), undefined)
    const { M: M2, S: S2, jeton: j2 } = await scene({ expireDansJours: -1 })
    const expire = await servir({ magasin: M2, stockage: S2 }, j2, undefined)
    const { M: M3, S: S3, jeton: j3 } = await scene({ purgee: true })
    const purgee = await servir({ magasin: M3, stockage: S3 }, j3, undefined)
    const traversee = await servir(deps, jeton, '../x')
    // 05/10/2026 (D-0510-A3, trou de juge vu par 026-101) : le magasin factice (comme acq_maquette_par_jeton) écarte déjà l'expirée et la purgée AVANT le
    // module : sans lui, un module qui oublierait sa propre vérification d'expiration restait invisible. Un magasin HOSTILE rend ici la ligne telle quelle,
    // expirée (par l'horloge réelle, celle que le module lit), purgée, ou sans date de fin : le module doit répondre le même 404.
    const hostile = async (modifier) => {
      const sc = await scene()
      const brut = sc.M
      const magasin = { ...brut, maquetteParJeton: async (h) => { const r = await brut.maquetteParJeton(h); return r ? modifier(r) : r } }
      return servir({ magasin, stockage: sc.S }, sc.jeton, undefined)
    }
    const expireeHostile = await hostile((r) => ({ ...r, expire_le: new Date(Date.now() - J).toISOString() }))
    const purgeeHostile = await hostile((r) => ({ ...r, etat: 'purgee' }))
    const purgeeLeHostile = await hostile((r) => ({ ...r, purgee_le: new Date(Date.now() - J).toISOString() }))
    const sansExpirationHostile = await hostile((r) => ({ ...r, expire_le: null }))
    return { malforme, inconnu, expire, purgee, traversee, expireeHostile, purgeeHostile, purgeeLeHostile, sansExpirationHostile }
  })

  await tente('ML-4', async () => {
    const { M, S, jeton, expireLe } = await scene({ entreprise: 'Atelier <b>Témoin</b>' })
    const deps = { magasin: M, stockage: S }
    const page = await servir(deps, jeton, undefined)
    const html = String(page.corps)
    const capture = await servir(deps, jeton, 'capture.jpg')
    const dateFin = new Date(expireLe).toISOString().slice(0, 10)
    const { M: M2, S: S2, jeton: j2 } = await scene({ avecVideo: false })
    const sansVideoPage = await servir({ magasin: M2, stockage: S2 }, j2, undefined)
    const sansVideoMp4 = await servir({ magasin: M2, stockage: S2 }, j2, 'video.mp4')
    return {
      page: { contientEntrepriseEchappee: html.includes('&lt;b&gt;Témoin&lt;/b&gt;') || html.includes('<b>Témoin</b>') === false && html.includes('Atelier') && html.includes('&lt;b&gt;'), contientEntrepriseBrute: /Atelier <b>Témoin<\/b>/.test(html), contientRienPublie: /Rien n'est publié/.test(html), contientDateFin: html.includes(dateFin), video: /<video[^>]*playsinline[^>]*src="video\.mp4"|<video[^>]*src="video\.mp4"[^>]*playsinline/.test(html) },
      capture: { type: capture.entetes['content-type'], octetsIdentiques: Buffer.isBuffer(capture.corps) ? capture.corps.equals(JPEG_TEL) : Buffer.from(capture.corps, 'binary').equals(JPEG_TEL) },
      sansVideo: { contientVideo: /<video/.test(String(sansVideoPage.corps)), statutVideoMp4: sansVideoMp4.statut },
    }
  })

  await tente('ML-5', async () => {
    const { M, S, jeton } = await scene()
    const deps = { magasin: M, stockage: S }
    const page = await servir(deps, jeton, undefined)
    const capture = await servir(deps, jeton, 'capture.jpg')
    const video = await servir(deps, jeton, 'video.mp4')
    return { entetes: { page: page.entetes, capture: capture.entetes, video: video.entetes }, cspHtml: page.entetes['content-security-policy'] ?? '', html: String(page.corps) }
  })

  await tente('ML-6', async () => {
    const { M, S, jeton } = await scene()
    const deps = { magasin: M, stockage: S }
    const n0 = M.ecritures.length
    let n = 0
    for (const [f, p] of [[undefined, undefined], ['capture.jpg', undefined], ['video.mp4', undefined], ['x-inconnu', undefined], ['video.mp4', 'bytes=0-10']]) { await servir(deps, jeton, f, p); n++; if (n >= 20) break }
    while (n < 20) { await servir(deps, 'jeton-inconnu-essai-0000000000000000000000000', undefined); n++ }
    return { ecrituresPendant: M.ecritures.length - n0, consultations: n }
  })

  await tente('ML-7', async () => {
    const H = creerHorloge(T0)
    const M = creerMagasin({ horloge: H })
    const S = creerStockageFactice()
    await ajouterMaquette(M, S, H, { expireDansJours: 1 }) // expirera dans 1 jour
    const gardee = await ajouterMaquette(M, S, H, { expireDansJours: 60 }) // reste valide
    H.avancer(2 * J)
    await mod.executerPurge({ magasin: M, stockage: S })
    const purgees = M.etat().maquettes.filter((mq) => mq.etat === 'purgee')
    const retiresEtMarques = purgees.length
    const gardeeIntacte = (await M.maquetteDe(gardee.pid))?.etat !== 'purgee'
    const { M: M3, S: S3 } = await scene({ horloge: H, expireDansJours: -1 })
    S3.definirPanne(true)
    const avant3 = M3.etat().maquettes.filter((mq) => mq.etat === 'purgee').length
    try { await mod.executerPurge({ magasin: M3, stockage: S3 }) } catch { /* une panne peut lever : tolérée */ }
    const apres3 = M3.etat().maquettes.filter((mq) => mq.etat === 'purgee').length
    return { retiresEtMarques: gardeeIntacte ? retiresEtMarques : retiresEtMarques + 1, expiresAttendus: 1, panne: { marques: apres3 - avant3 } }
  })

  const routeMaquetteSrc = fs.readFileSync(path.join(RAC2, 'app', 'maquette', '[jeton]', '[[...fichier]]', 'route.ts'), 'utf8')
  const routePurgeSrc = fs.readFileSync(path.join(RAC2, 'app', 'api', 'cron', 'maquettes-purge', 'route.ts'), 'utf8')
  obs['ML-8'] = (() => {
    const nu1 = sansCommentaires(routeMaquetteSrc), nu3 = sansCommentaires(routePurgeSrc)
    const iJeton = /\bauthAgent\s*\(|jeton|CRON_SECRET/i.exec(nu3)?.index ?? -1
    const iPause = nu3.indexOf('pauseGenerale(')
    return {
      routeMaquette: { estRoute: /route\.ts$/.test('app/maquette/[jeton]/[[...fichier]]/route.ts'), awaitParams: /await\s+ctx\.params|await\s+params/.test(nu1), consommerLimiteAvant: (() => { const i = nu1.indexOf('consommerLimite'); const j = nu1.indexOf('servirMaquette'); return i >= 0 && j >= 0 && i < j })() },
      routePurge: { jetonPuisPause: iJeton >= 0 && iPause > iJeton, appelleBattement: /ops_battement|battement\s*\(/.test(nu3), litPause: /PRESTI_PAUSE_AGENTS/.test(nu3) },
      fichiersHorsPublic: !fs.existsSync(path.join(RAC2, 'public', 'maquette')),
      typecheck: typecheck(RAC2, JUGE),
    }
  })()

  await tente('ML-9', async () => {
    const { M, S, jeton } = await scene()
    const deps = { magasin: M, stockage: S }
    const sansPlage = await servir(deps, jeton, 'video.mp4')
    const avecPlage = await servir(deps, jeton, 'video.mp4', 'bytes=0-1023')
    const horsFichier = await servir(deps, jeton, 'video.mp4', `bytes=${MP4.length}-`)
    const n0 = M.ecritures.length
    await servir(deps, jeton, 'video.mp4', 'bytes=0-99'); await servir(deps, jeton, 'video.mp4', 'bytes=100-199')
    return {
      sansPlage: { statut: sansPlage.statut, type: sansPlage.entetes['content-type'], acceptRanges: sansPlage.entetes['accept-ranges'], octetsIdentiques: (Buffer.isBuffer(sansPlage.corps) ? sansPlage.corps : Buffer.from(sansPlage.corps, 'binary')).equals(MP4) },
      avecPlage: { statut: avecPlage.statut, contentRange: avecPlage.entetes['content-range'], contentRangeAttendu: `bytes 0-1023/${MP4.length}`, mille24Identiques: (Buffer.isBuffer(avecPlage.corps) ? avecPlage.corps : Buffer.from(avecPlage.corps, 'binary')).equals(MP4.subarray(0, 1024)) },
      horsFichier: { statut: horsFichier.statut },
      ecrituresPendant: M.ecritures.length - n0,
    }
  })

  return obs
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function jeuxLisibles() {
  const e = []
  const t = decoderJpeg(JPEG_TEL), o2 = decoderJpeg(JPEG_ORDI)
  if (!t.ok || t.largeur !== 390) e.push(`capture-telephone.jpg : ${t.ok ? `largeur ${t.largeur}` : t.raison}, 390 attendue`)
  if (!o2.ok || o2.largeur !== 1440) e.push(`capture-ordinateur.jpg : ${o2.ok ? `largeur ${o2.largeur}` : o2.raison}, 1440 attendue`)
  for (const [nom, buf] of [['capture-telephone.jpg', JPEG_TEL], ['capture-ordinateur.jpg', JPEG_ORDI]]) {
    if (buf.length >= 1024 * 1024) e.push(`${nom} : ${buf.length} octets, moins de 1 Mo attendu`)
    if (new Set(buf.subarray(200)).size < 64) e.push(`${nom} : moins de 64 valeurs d'octets distinctes (image uniforme)`)
  }
  if (!(MP4[4] === 0x66 && MP4[5] === 0x74 && MP4[6] === 0x79 && MP4[7] === 0x70)) e.push('video-essai.mp4 : « ftyp » absent à l\'octet 4')
  if (MP4.length >= 3 * 1024 * 1024) e.push(`video-essai.mp4 : ${MP4.length} octets, moins de 3 Mo attendu`)
  return { e, detail: `capture-telephone.jpg (${JPEG_TEL.length} o, ${t.largeur ?? '?'} de large), capture-ordinateur.jpg (${JPEG_ORDI.length} o, ${o2.largeur ?? '?'} de large), video-essai.mp4 (${MP4.length} o) décodés` }
}
async function scenarioMagasinLocal() {
  const { M } = await scene()
  return M.etat().maquettes.length === 1
}
function obsBase() {
  const entetesOk = { 'x-robots-tag': 'noindex, nofollow, noarchive', 'cache-control': 'private, no-store', 'referrer-policy': 'no-referrer' }
  return {
    'ML-2': { jetons: Array.from({ length: 50 }, () => crypto.randomBytes(32).toString('base64url')), hachesOk: true, joursExpiration: 21 },
    'ML-3': { malforme: { statut: 404, corps: '404', entetes: entetesOk }, inconnu: { statut: 404, corps: '404', entetes: entetesOk }, expire: { statut: 404, corps: '404', entetes: entetesOk }, purgee: { statut: 404, corps: '404', entetes: entetesOk }, traversee: { statut: 404, corps: '404', entetes: entetesOk }, expireeHostile: { statut: 404, corps: '404', entetes: entetesOk }, purgeeHostile: { statut: 404, corps: '404', entetes: entetesOk }, purgeeLeHostile: { statut: 404, corps: '404', entetes: entetesOk }, sansExpirationHostile: { statut: 404, corps: '404', entetes: entetesOk } },
    'ML-4': { page: { contientEntrepriseEchappee: true, contientEntrepriseBrute: false, contientRienPublie: true, contientDateFin: true, video: true }, capture: { type: 'image/jpeg', octetsIdentiques: true }, sansVideo: { contientVideo: false, statutVideoMp4: 404 } },
    'ML-5': { entetes: { page: entetesOk, capture: entetesOk, video: entetesOk }, cspHtml: "Content-Security-Policy: default-src 'none'; img-src 'self'; media-src 'self'", html: '<html><body>Maquette</body></html>' },
    'ML-6': { ecrituresPendant: 0, consultations: 20 },
    'ML-7': { retiresEtMarques: 1, expiresAttendus: 1, panne: { marques: 0, leve: true } },
    'ML-8': { routeMaquette: { estRoute: true, awaitParams: true, consommerLimiteAvant: true }, routePurge: { jetonPuisPause: true, appelleBattement: false, litPause: false }, fichiersHorsPublic: true, typecheck: { ok: true, detail: 'vert' } },
    'ML-9': { sansPlage: { statut: 200, type: 'video/mp4', acceptRanges: 'bytes', octetsIdentiques: true }, avecPlage: { statut: 206, contentRange: `bytes 0-1023/${MP4.length}`, contentRangeAttendu: `bytes 0-1023/${MP4.length}`, mille24Identiques: true }, horsFichier: { statut: 416 }, ecrituresPendant: 0 },
  }
}
function muter(base, id, m) { const x = JSON.parse(JSON.stringify(base[id])); m(x); return x }
function echantillons() {
  const b = obsBase()
  return {
    'ML-2': [['conforme', b['ML-2'], false], ['jetons en double', muter(b, 'ML-2', (x) => { x.jetons[1] = x.jetons[0] }), true], ['expiration à 20 jours', muter(b, 'ML-2', (x) => { x.joursExpiration = 20 }), true]],
    'ML-3': [['conforme', b['ML-3'], false], ['réponses différentes', muter(b, 'ML-3', (x) => { x.inconnu.corps = 'autre' }), true], ['statut 200 pour un jeton inconnu', muter(b, 'ML-3', (x) => { x.inconnu.statut = 200 }), true], ['expirée servie 410 par le module (magasin hostile)', muter(b, 'ML-3', (x) => { x.expireeHostile.statut = 410 }), true], ['purgée servie par le module (magasin hostile)', muter(b, 'ML-3', (x) => { x.purgeeHostile.statut = 200 }), true], ['sans date de fin servie (magasin hostile)', muter(b, 'ML-3', (x) => { x.sansExpirationHostile.statut = 200 }), true], ['observation hostile absente', muter(b, 'ML-3', (x) => { delete x.purgeeLeHostile }), true]],
    'ML-4': [['conforme', b['ML-4'], false], ['entreprise non échappée', muter(b, 'ML-4', (x) => { x.page.contientEntrepriseBrute = true }), true], ['<video encore présent sans vidéo', muter(b, 'ML-4', (x) => { x.sansVideo.contientVideo = true }), true]],
    'ML-5': [['conforme', b['ML-5'], false], ['<script présent', muter(b, 'ML-5', (x) => { x.html += '<script>1</script>' }), true], ['CSP sans none', muter(b, 'ML-5', (x) => { x.cspHtml = "media-src 'self'" }), true]],
    'ML-6': [['conforme', b['ML-6'], false], ['une écriture', muter(b, 'ML-6', (x) => { x.ecrituresPendant = 1 }), true]],
    'ML-7': [['conforme', b['ML-7'], false], ['tout retiré, y compris le non expiré', muter(b, 'ML-7', (x) => { x.retiresEtMarques = 2 }), true], ['marqué malgré la panne', muter(b, 'ML-7', (x) => { x.panne.marques = 1 }), true]],
    'ML-8': [['conforme', b['ML-8'], false], ['battement appelé', muter(b, 'ML-8', (x) => { x.routePurge.appelleBattement = true }), true], ['pause avant le jeton', muter(b, 'ML-8', (x) => { x.routePurge.jetonPuisPause = false }), true]],
    'ML-9': [['conforme', b['ML-9'], false], ['pas de 206', muter(b, 'ML-9', (x) => { x.avecPlage.statut = 200 }), true], ['une écriture pendant les plages', muter(b, 'ML-9', (x) => { x.ecrituresPendant = 1 }), true]],
  }
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function reel() {
  console.log(`${NOM} : geste réel sur https://prestiapp.fr — Claude Code seulement, après déploiement de 026-082`)
  // Dépose un JPEG et un MP4 d'essai, crée un lien marqué « essai-026-acq-… », lit la page et ses deux fichiers (avec une
  // plage), fait expirer le lien → 404 ; ménage dans un `finally`. N'est écrit qu'une fois 026-082 déployée (Supabase
  // réel via .env.local) : hors du périmètre de ce commit, le module n'existe pas encore.
  console.log(`${NOM} : rien à faire pour l'instant (maquettesLien.ts n'est pas encore écrit) — refait quand 026-082 sera déployée`)
  process.exit(2)
}
if (REEL) await reel()

const ids = o.autoControle ? ['AC-1', 'AC-2', 'AC-3'] : IDS.slice()
const s = creerSortie(NOM, ids, `${NOM} — racine ${rel(RAC)} — jeux d'essai du dépôt du juge (scripts/fixtures/026-acquisition/maquettes)`)
if (o.autoControle) {
  try { const r = jeuxLisibles(); s.juger('AC-1', r.e, r.detail) } catch (e) { s.echoue('AC-1', `interrompu : ${premiereLigne(e)}`) }
  try { const ok = await scenarioMagasinLocal(); s.juger('AC-2', ok ? [] : ['la scène ne pose pas une maquette prête'], 'magasin-memoire + stockage-factice : une scène de maquette prête, servie sans erreur') } catch (e) { s.echoue('AC-2', `interrompu : ${premiereLigne(e)}`) }
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
    s.juger('AC-3', e, `${compte.fautifs} échantillons fautifs repérés et ${compte.conformes} conformes acceptés par les contrôles ML-2 à ML-9`)
  } catch (e) { s.echoue('AC-3', `interrompu : ${premiereLigne(e)}`) }
} else {
  const f = path.join(RAC, 'lib', 'agents', 'acquisition', 'maquettesLien.ts')
  let mod = null
  const e1 = []
  if (!fs.existsSync(f)) e1.push(`module absent : ${rel(f)}`)
  else {
    try { mod = await importerDepuis(RAC, 'lib/agents/acquisition/maquettesLien.ts') } catch (e) { e1.push(`maquettesLien.ts ne s'importe pas : ${premiereLigne(e)}`) }
    if (mod) for (const n of EXPORTS_ML1) if (typeof mod[n] !== 'function') e1.push(`export ${n} absent de maquettesLien.ts (ou pas une fonction)`)
  }
  s.juger('ML-1', e1, `maquettesLien.ts importé depuis ${rel(RAC)} : ${EXPORTS_ML1.join(', ')}`)
  if (e1.length) s.nonJuges(IDS.slice(1), 'ML-1 en échec')
  else {
    let obs
    try { obs = await observer(mod, RAC) } catch (e) { s.nonJuges(IDS.slice(1), `observation interrompue : ${premiereLigne(e)}`) }
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
