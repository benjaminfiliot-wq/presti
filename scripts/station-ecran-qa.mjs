// scripts/station-ecran-qa.mjs — le juge d'écran de la station Claw3D (fiche 026-172, N1c), écrit par Claude Code AVANT le moteur qu'il juge
// (026-181 à 026-189). L'exécutant qui le lance n'y touche jamais (CLAUDE.md:23).
//
//   node scripts/station-ecran-qa.mjs --partie=<liste> [--lot=a|b] [--critere=<liste>] [--racine=<arbre>] [--temoin] [--base=<commit>]
//
//   --partie=<p1,p2,…>  parmi verite, camera, acteurs, calque, themes, reglages, salles2, webkit (défaut : toutes) ;
//   --lot=a|b           pour salles2 seulement : a = CE-21 (le Commandement, 026-188), b = CE-22 (les six autres salles, 026-189) ; CE-23 pour les deux ;
//   --critere=<liste>   ne juge que ces critères CE de la partie (CE-1 est toujours jugé) : le banc d'un exécutant qui corrige un seul critère ;
//   --racine=<arbre>    juge cet arbre (référence, témoin, sabotage de la preuve 026-012) au lieu du dépôt ;
//   --temoin            juge le TÉMOIN du lot e (scripts/fixtures/026-pilotage/e/temoin/, suffixe .temoin ôté) posé sur le commit --base ;
//   --base=<commit>     le commit sur lequel --temoin se pose (défaut : la référence du lot e).
//
// Critères (le cahier de 026-172 ; les parties sont rendues dans l'ordre où elles sont demandées, CE-1 d'abord) :
//   (toutes)  CE-1  le moteur existe et Carte.tsx ne reste pas le cadre d'attente quand stationCarte est levé        [statique]
//   verite    CE-2 miroir · CE-3 immobilité · CE-4 événement injecté · CE-5 réunion · CE-6 pause et panne · CE-7 mouvement réduit · CE-8 cadence ·
//             CE-25 premier relevé · CE-26 antenne · CE-27 halo et nuit                                          (026-181)
//   camera    CE-9 échelle et zoom · CE-10 survol, hublot, teintes · CE-11 les vingt zones et la réservée          (026-182)
//   acteurs   CE-12 le tapis et ses « +1 » · CE-13 lignes, égaliseur, écran de l'Expérience, badges, rien dans le décor (026-183)
//   calque    CE-14 police pixel OFL · CE-15 miroir complet et clavier · CE-16 texte, jamais du HTML · CE-28 l'info-bulle (026-184)
//   themes    CE-17 chaque thème livré chargé, ses vingt emplacements et la réservée posés, captures                (026-185)
//   reglages  CE-18 le panneau · CE-19 aperçu, enregistrer, annuler, historique, 409 · CE-20 refus de disposition · CE-29 mise en page et palette (026-187)
//   salles2   CE-21 le Commandement (--lot=a) · CE-22 six salles (--lot=b) · CE-23 résumé, largeur, captures        (026-188, 026-189)
//   webkit    CE-24 WebKit à 390×844                                                                               (026-186)
//
// ── Comment il juge ──────────────────────────────────────────────────────────────────────────────────────────────────────
// 1. D'abord ce qui se LIT (CE-1) : sans moteur (app/controle/station/moteur/ absent) chaque critère de rendu dit « moteur absent » et rien n'est
//    construit ni lancé ; un CE-1 rouge pour une autre raison suffit aussi à ne pas lancer le rendu.
// 2. Puis ce qui se MESURE, DANS LE NAVIGATEUR (scripts/fixtures/026-pilotage/e/commun.mjs, CONTRAT.md) : une copie de l'arbre jugé sous
//    .orchestre/travail/station-ecran-qa/ (app/ élagué à la station et à ce qu'elle importe, drapeaux `pilotage` ET `stationCarte` levés dans la copie
//    seulement, `new Phaser.Game(` instrumenté dans la copie seulement), un seul `next build` (cache par contenu) puis `next start` sur 127.0.0.1 ;
//    Chromium (et WebKit pour CE-24) parlent à ce serveur avec la SESSION SIMULÉE de 026-170 (aucun compte, aucune clé, aucun .env.local) ; toute
//    requête hors de 127.0.0.1 est coupée. Les vues, la trésorerie, les réglages et le thème sont les jeux d'essai de s/ (validés par s/contrat-vues.mjs)
//    et de e/ ; les événements sont INJECTÉS par le juge (il modifie ce que ses interceptions servent à la lecture suivante).
// 3. Les captures (JPEG de 10 Ko à 1,5 Mo, non uniformes, mesurées sur les octets écrits) sont prises par page.screenshot( du juge : sur la racine réelle
//    dans .orchestre/preuves/<fiche jugée>/ (026-181 pour verite, 026-182 camera, 026-183 acteurs, 026-184 calque, 026-185 themes, 026-186 webkit,
//    026-187 reglages, 026-188 salles2), sinon sous .orchestre/travail/. Elles diffèrent d'une partie à l'autre.
// 4. Où il tourne : les parties de rendu veulent un build, un navigateur et Phaser ; sur le PC elles tournent sur l'usine. Lancé ailleurs que sur l'usine
//    (os.hostname() ≠ presti-usine), SANS --racine ni --temoin, et si scripts/usine.mjs et la clé ssh de l'usine existent, le juge se relance par
//    `node scripts/usine.mjs executer --nom=ecran --rapatrier=.orchestre/preuves/<fiche jugée>/ -- node scripts/station-ecran-qa.mjs …` et rend sa sortie et
//    son code tels quels (usine injoignable : code 2). PRESTI_JUGE_LOCAL=1 force le jugement sur place. Avec --racine ou --temoin l'arbre n'existe que sur la
//    machine qui l'a fabriqué : il est jugé sur place. Aucun `verifier` ne lance donc scripts/usine.mjs (CV-2 de 026-001).
// Sortie : « ✅ CE-n … » ou « ❌ CE-n … » par critère, puis « station-ecran-qa … : PASS|FAIL ». Code 0 seulement si tout est vert, 1 si un critère est
// rouge, 2 si un préalable manque (next, Chromium, WebKit, usine injoignable). N'écrit que sous .orchestre/travail/station-ecran-qa/ et, sur la racine
// réelle, les captures dans .orchestre/preuves/<fiche jugée>/ ; aucun réseau hors 127.0.0.1 ; ne lit ni .env.local ni aucune clé.
process.env.TZ = 'UTC'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { R, lireOptions, creerSortie, premiereLigne, court, lireOuNull, sansCommentaires, listerFichiers } from './fixtures/026-pilotage/a/commun.mjs'
import { analyserJpeg, defautsCapture, sha256 } from './fixtures/026-pilotage/c/commun.mjs'
import { reference as REFERENCE_LOT } from './fixtures/026-pilotage/e/lot.mjs'
import { PARTIES, CRITERES_DE, FICHE_DE, TRAV_E, posix } from './fixtures/026-pilotage/e/commun.mjs'

const JUGE = 'station-ecran-qa'
const T0 = Date.now()
// STATION_ECRAN_TRACE=1 : la durée de chaque étape sur la sortie d'erreur (le budget de 30 min de la preuve se règle dessus).
const trace = (m) => { if (process.env.STATION_ECRAN_TRACE) console.error(`[trace ${((Date.now() - T0) / 1000).toFixed(1)} s] ${m}`) }
const CE_SCRIPT = fileURLToPath(import.meta.url)
const o = lireOptions(process.argv.slice(2), { connues: ['partie', 'lot', 'critere', 'base'] })
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exitCode = 2; return null }
const MOTEUR = 'app/controle/station/moteur'
const CARTE = 'app/controle/station/Carte.tsx'

// ── Les options ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const demandees = o.valeurs.partie ? o.valeurs.partie.split(',').map((x) => x.trim()).filter(Boolean) : PARTIES
const LOT = o.valeurs.lot ?? null
const criteresVoulus = o.valeurs.critere ? o.valeurs.critere.split(',').map((x) => x.trim()).filter(Boolean) : null
const idsPartie = (p) => (p === 'salles2' ? (LOT === 'a' ? ['CE-21', 'CE-23'] : LOT === 'b' ? ['CE-22', 'CE-23'] : CRITERES_DE.salles2) : CRITERES_DE[p])
let erreurAppel = null
if (o.inconnues.length || o.positionnels.length) erreurAppel = `option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`
else if (!demandees.length || demandees.some((p) => !PARTIES.includes(p)) || new Set(demandees).size !== demandees.length) erreurAppel = `--partie=<liste> attendue parmi ${PARTIES.join(', ')} (reçu : ${o.valeurs.partie ?? 'rien'})`
else if (LOT !== null && !['a', 'b'].includes(LOT)) erreurAppel = `--lot=a|b attendu (reçu : ${LOT})`
else if (LOT !== null && !demandees.includes('salles2')) erreurAppel = '--lot ne se donne qu\'avec --partie=salles2'
else if (o.valeurs.base !== undefined && !/^[\w.^~/-]{1,80}$/.test(o.valeurs.base)) erreurAppel = `--base « ${o.valeurs.base} » : un commit attendu`
else if (criteresVoulus && criteresVoulus.some((c) => !demandees.some((p) => idsPartie(p).includes(c)))) erreurAppel = `--critere=<liste> : ${criteresVoulus.filter((c) => !demandees.some((p) => idsPartie(p).includes(c))).join(', ')} n'est pas un critère des parties demandées (${demandees.join(', ')})`
if (erreurAppel) { refuser(erreurAppel); process.exit(2) }

const idsDe = (p) => idsPartie(p).filter((i) => !criteresVoulus || criteresVoulus.includes(i))
const parties = demandees.filter((p) => idsDe(p).length)
const rendus = parties.flatMap(idsDe)
const ids = ['CE-1', ...rendus]
const NOM = `${JUGE}${o.valeurs.partie ? ` --partie=${o.valeurs.partie}` : ''}${LOT ? ` --lot=${LOT}` : ''}${criteresVoulus ? ` --critere=${criteresVoulus.join(',')}` : ''}${o.temoin ? ' --temoin' : ''}`

// ── Où il tourne : la relance sur l'usine ────────────────────────────────────────────────────────────────────────────────
const SUR_USINE = process.platform === 'linux' && os.hostname() === 'presti-usine'
const CLE_USINE = path.join(os.homedir(), '.ssh', 'presti-usine')
if (rendus.length && !SUR_USINE && process.env.PRESTI_JUGE_LOCAL !== '1' && !o.valeurs.racine && !o.temoin && fs.existsSync(path.join(R, 'scripts', 'usine.mjs')) && fs.existsSync(CLE_USINE)) {
  console.log(`· ${JUGE} : ce poste (${os.hostname()}) n'est pas l'usine ; les parties de rendu (${parties.join(', ')}) sont relancées par scripts/usine.mjs executer`)
  const r = spawnSync(process.execPath, [path.join(R, 'scripts', 'usine.mjs'), 'executer', '--nom=ecran', `--rapatrier=.orchestre/preuves/${FICHE_DE[parties[0]]}/`, '--', 'node', 'scripts/station-ecran-qa.mjs', ...process.argv.slice(2)], { cwd: R, stdio: 'inherit', windowsHide: true })
  if (r.status === null) { console.log(`❌ ${ids[1] ?? 'CE-1'} usine injoignable : ${r.error ? premiereLigne(r.error) : 'aucun verdict rendu'}`); process.exitCode = 2 } else process.exitCode = r.status
  process.exit(process.exitCode)
}

// ── La racine jugée ──────────────────────────────────────────────────────────────────────────────────────────────────────
let racine = o.racine
const racineReelle = !o.temoin && o.racineParDefaut
let entete = `${NOM} — racine ${path.relative(R, racine) || '.'}`
if (o.temoin) {
  const { arbreTemoinE } = await import('./fixtures/026-pilotage/e/commun.mjs')
  try {
    const base = o.valeurs.base ?? REFERENCE_LOT
    const a = arbreTemoinE(base)
    racine = a.dest
    entete = `${NOM} — le témoin du lot e (${a.poses.length} fichiers de scripts/fixtures/026-pilotage/e/temoin/) posé sur ${base.slice(0, 7)}, sous ${path.relative(R, a.dest)}`
  } catch (e) { console.log(`${NOM} : préalable — le témoin ne se pose pas (${premiereLigne(e)})`); process.exit(2) }
}
const s = creerSortie(NOM, ids, entete)
let prealable = false
const rouge = (id, m) => s.echoue(id, m)
const preal = (idsRouges, m) => { prealable = true; for (const id of idsRouges) if (!s.evalue(id)) rouge(id, `préalable manquant : ${m}`) }

const aNettoyer = []
const nettoyer = async () => { for (const f of aNettoyer.splice(0).reverse()) { try { await f() } catch { /* déjà arrêté */ } } }
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { nettoyer().finally(() => process.exit(1)) })

// ═══ 1. Ce qui se lit : CE-1 ═════════════════════════════════════════════════════════════════════════════════════════════
const fichiersSous = (dossier) => { try { return [...listerFichiers(dossier)].map(posix) } catch { return [] } }
function ce1(rac) {
  const e = []
  const dm = path.join(rac, MOTEUR)
  const sources = fs.existsSync(dm) && fs.statSync(dm).isDirectory() ? fichiersSous(dm).filter((f) => /\.(?:tsx?|jsx?|mjs)$/.test(f)) : null
  if (sources === null) e.push(`${MOTEUR}/ n'existe pas sous ${court(rac, 70)} : la carte n'a pas de moteur (026-179 à 026-186)`)
  else if (!sources.length) e.push(`${MOTEUR}/ ne porte aucun source (.ts, .tsx)`)
  else if (!fs.existsSync(path.join(dm, 'entree.tsx'))) e.push(`${MOTEUR}/entree.tsx absent : c'est le seul module que Carte.tsx charge`)
  const carte = lireOuNull(path.join(rac, CARTE))
  if (carte === null) e.push(`${CARTE} absent`)
  else {
    const code = sansCommentaires(carte)
    if (!/\bactif\(\s*['"]stationCarte['"]\s*\)/.test(code)) e.push(`${CARTE} ne lit pas actif('stationCarte') : le drapeau ne décide de rien`)
    if (!/['"]\.\/moteur\/[\w./-]+['"]/.test(code)) e.push(`${CARTE} ne charge rien de ./moteur/ : avec stationCarte levé dans la copie il reste le cadre d'attente (« La carte de la station arrive avec sa fiche. »)`)
  }
  const flags = lireOuNull(path.join(rac, 'lib', 'flags.ts'))
  if (flags === null) e.push('lib/flags.ts absent : le juge ne peut pas lever pilotage et stationCarte dans la copie')
  return { echecs: e, detail: `${MOTEUR}/ porte ${sources?.length ?? 0} source(s) dont entree.tsx ; Carte.tsx lit actif('stationCarte') et charge ./moteur/ ; lib/flags.ts présent (le juge lève pilotage et stationCarte dans une COPIE)`, moteur: !!sources }
}
const lu = ce1(racine)
await s.critere('CE-1', async () => ({ echecs: lu.echecs, detail: lu.detail }))
const moteurAbsent = !lu.moteur

// ═══ 2. Ce qui se mesure ═════════════════════════════════════════════════════════════════════════════════════════════════
const dossierCaptures = (partie) => (racineReelle
  ? path.join(R, '.orchestre', 'preuves', FICHE_DE[partie])
  : path.join(TRAV_E, 'captures', crypto.createHash('sha256').update(path.resolve(racine).toLowerCase()).digest('hex').slice(0, 12), partie))
const captures = [] // { partie, nom, empreinte }
// Les captures se prennent sur la racine réelle et avec --temoin ; sur un arbre donné par --racine (la preuve 026-012 : le témoin vert et ses sabotages, JA-7 et JA-8) seuls
// comptent les critères, ce qui tient la preuve du lot e dans ses 30 minutes.
const FAIRE_CAPTURES = racineReelle || o.temoin
/** La capture JPEG prise par le juge (page.screenshot( ; l'image déjà présente au même chemin est effacée AVANT ; la taille est celle de la page en pixels CSS, même sous WebKit à la densité 3) et mesurée sur les octets écrits. */
async function prendre(page, fichier) {
  fs.mkdirSync(path.dirname(fichier), { recursive: true })
  fs.rmSync(fichier, { force: true })
  await page.screenshot({ path: fichier, type: 'jpeg', quality: 92, scale: 'css', fullPage: false })
  const buf = fs.readFileSync(fichier)
  return { fichier, octets: buf.length, empreinte: sha256(buf), ...analyserJpeg(buf) }
}

async function mesurer() {
  if (moteurAbsent) { for (const id of rendus) rouge(id, `moteur absent : ${MOTEUR}/ n'existe pas sous ${court(racine, 60)} (rien n'est construit ni lancé)`); return }
  if (s.enEchec('CE-1')) { for (const id of rendus) rouge(id, 'non jugé : CE-1 est rouge (ce qui se lit se corrige d\'abord ; le rendu n\'est pas lancé)'); return }
  if (!fs.existsSync(path.join(R, 'node_modules', 'next', 'dist', 'bin', 'next'))) return preal(rendus, 'next est absent de node_modules')
  if (!fs.existsSync(path.join(R, 'node_modules', 'playwright', 'package.json'))) return preal(rendus, 'playwright est absent de node_modules')
  const { servirCopie, lancerChromium, TRAV_CLAW3D } = await import('./fixtures/026-pilotage/e/commun.mjs')
  void TRAV_CLAW3D
  const { themeHublot } = await import('./fixtures/026-pilotage/e/jeux.mjs')
  const toutRouge = (m) => { for (const id of rendus) if (!s.evalue(id)) rouge(id, m) }
  let serveur
  trace('copie, build et serveur')
  try { serveur = await servirCopie(racine) } catch (e) {
    if (e.prealable) return preal(rendus, premiereLigne(e))
    return toutRouge(`la copie ne se construit pas ou ne se sert pas : ${premiereLigne(e)}`)
  }
  trace(`serveur ${serveur.base} (build ${serveur.cache ? 'repris du cache' : `fait en ${Math.round(serveur.duree)} s`})`)
  aNettoyer.push(() => serveur.arreter())
  let nav
  try { nav = await lancerChromium() } catch (e) { return preal(rendus, premiereLigne(e)) }
  aNettoyer.push(() => nav.close())
  const themesLus = {}, themesDefauts = []
  for (const cle of serveur.themes.filter((c) => c !== 'essai')) {
    try { themesLus[cle] = JSON.parse(fs.readFileSync(path.join(racine, 'public', 'station', 'themes', cle, 'theme.json'), 'utf8')) } catch (e) { themesDefauts.push(`thème ${cle} : theme.json illisible (${premiereLigne(e)})`) }
  }
  const ctxBase = { nav, base: serveur.base, theme: themeHublot(), themes: Object.keys(themesLus), themesLus, racine }
  const ctxDe = (partie) => ({
    ...ctxBase,
    captures: !FAIRE_CAPTURES ? null : async (page, nom, dims) => {
      const c = await prendre(page, path.join(dossierCaptures(partie), nom))
      captures.push({ partie, nom, empreinte: c.empreinte })
      return { fichier: c.fichier, echecs: defautsCapture(c, dims), empreinte: c.empreinte }
    },
  })
  const J = {
    verite: async (c, d) => (await import('./fixtures/026-pilotage/e/juge-verite.mjs')).critereVerite(c, d),
    camera: async (c, d) => (await import('./fixtures/026-pilotage/e/juge-carte.mjs')).critereCarte(c, d),
    themes: async (c) => (await import('./fixtures/026-pilotage/e/juge-carte.mjs')).critereThemes(c),
    webkit: async (c) => (await import('./fixtures/026-pilotage/e/juge-carte.mjs')).critereWebkit(c),
    acteurs: async (c, d) => (await import('./fixtures/026-pilotage/e/juge-acteurs.mjs')).critereActeurs(c, d),
    calque: async (c, d) => (await import('./fixtures/026-pilotage/e/juge-calque.mjs')).critereCalque(c, d),
    reglages: async (c, d) => (await import('./fixtures/026-pilotage/e/juge-reglages.mjs')).critereReglages(c, d),
    salles2: async (c, d) => {
      const { critereSalles } = await import('./fixtures/026-pilotage/e/juge-salles.mjs')
      const lots = LOT ? [LOT] : ['a', 'b']
      const sortie = {}
      for (const l of lots) {
        const r = await critereSalles(c, d.filter((i) => i === 'CE-23' || i === (l === 'a' ? 'CE-21' : 'CE-22')), l)
        for (const [id, x] of Object.entries(r)) sortie[id] = sortie[id] ? { echecs: [...sortie[id].echecs, ...x.echecs], detail: `${sortie[id].detail} ; ${x.detail}` } : x
      }
      return sortie
    },
  }
  try {
    for (const p of parties) {
      const demandes = idsDe(p)
      let r
      trace(`partie ${p} : ${demandes.join(', ')}`)
      try { r = await J[p](ctxDe(p), demandes) } catch (e) {
        if (e.prealable) { preal(demandes, premiereLigne(e)); continue }
        for (const id of demandes) rouge(id, `interrompu : ${premiereLigne(e)}`)
        continue
      }
      for (const id of demandes) {
        const x = r?.[id]
        if (!x) { rouge(id, 'non jugé : la partie n\'a rendu aucun verdict pour ce critère'); continue }
        const echecs = id === 'CE-17' ? [...x.echecs, ...themesDefauts] : x.echecs
        s.juger(id, echecs, x.detail)
      }
      trace(`partie ${p} jugée`)
      // bureau.jpg et telephone.jpg des parties qui n'ont pas de captures propres (themes, salles2 et webkit nomment les leurs).
      if (FAIRE_CAPTURES && ['verite', 'camera', 'acteurs', 'calque', 'reglages'].includes(p)) {
        const { capturesGenerales } = await import('./fixtures/026-pilotage/e/captures.mjs')
        try {
          const cs = await capturesGenerales(ctxDe(p), p)
          for (const defaut of cs.echecs) s.echoue(demandes[0], defaut)
        } catch (e) { s.echoue(demandes[0], `captures de la partie ${p} impossibles : ${premiereLigne(e)}`) }
      }
    }
  } finally { await nettoyer() }
  // Les captures d'une partie diffèrent de celles des autres parties.
  const vus = new Map()
  for (const c of captures) {
    const autre = vus.get(c.empreinte)
    if (autre && autre.partie !== c.partie) s.echoue(idsDe(c.partie)[0] ?? 'CE-1', `${c.nom} (partie ${c.partie}) est identique à ${autre.nom} de la partie ${autre.partie}`)
    else vus.set(c.empreinte, c)
  }
}

try { await mesurer() } catch (e) { for (const id of rendus) if (!s.evalue(id)) rouge(id, `interrompu : ${premiereLigne(e)}`) } finally { await nettoyer() }
const code = s.finir()
process.exitCode = code === 0 ? 0 : prealable ? 2 : 1
setTimeout(() => process.exit(process.exitCode), 4000).unref()
