// scripts/station-claw3d-qa.mjs — le juge de la carte Claw3D de la station (fiche 026-170, K0), écrit par Claude Code AVANT
// le moteur qu'il juge (026-179 à 026-186). L'exécutant qui le lance n'y touche jamais (CLAUDE.md:23).
//
//   node scripts/station-claw3d-qa.mjs [--partie=<liste>] [--racine=<arbre>] [--temoin] [--base=<commit>]
//
//   --partie=<p1,p2,…>  parmi provenance, verite, repos, garde, csp, poids, pixel, contexte, grille, hygiene (défaut : toutes) ;
//   --racine=<arbre>    juge cet arbre (référence, témoin, sabotage de la preuve 026-012) au lieu du dépôt ;
//   --temoin            juge le TÉMOIN du lot k (scripts/fixtures/026-pilotage/k/temoin/) posé sur les fichiers de tête du
//                       commit --base (défaut : la référence du lot k) ;
//   --base=<commit>     le commit sur lequel --temoin se pose.
//
// Critères (le cahier de 026-170 ; chaque partie porte les siens) :
//   provenance CL-1 (licence MIT + PROVENANCE.md) · CL-2 (rien de retiré, aucun Tailwind) · CL-3 (imports interdits, un
//              fetch, phaser exact) · CL-4 (Carte.tsx : drapeau, next/dynamic, entree seulement)
//   verite     CL-6 (aucun hasard ni horloge dans moteur/) · CL-5 (déterminisme) · CL-7 (le piège de la pause) · CL-8 (décor
//              sans donnée)
//   grille     CL-15 (astar2D joint chaque salle et chaque poste, le tapis est continu, la salle réservée est fermée)
//   repos      CL-9 (à la vraie cadence : Phaser dort, le pont n'est pas appelé)
//   garde      CL-10 (sans session ni réponse 200 de vue=direct : ni Phaser, ni canevas, ni carte)
//   csp        CL-11 (zéro violation, chaque requête dans la liste)         [build de production]
//   poids      CL-12 (≤ 400 Kio, aucun Phaser ailleurs, écart ≤ 1 Kio)      [build de production]
//   pixel      CL-13 (canevas = grille × k entier, aux densités 1, 2, 2,625 et 3)
//   contexte   CL-14 (perte de contexte WebGL rattrapée)
//   hygiene    CL-16 (proxy.ts : station\/.* ; ts-loader avec un hôte d'artisan)
//
// ── Comment il juge ──────────────────────────────────────────────────────────────────────────────────────────────────────
// 1. D'abord ce qui se LIT (aucun serveur, aucun navigateur) : provenance, CL-6, CL-15 (le module de la grille du moteur, joué
//    par un enfant), CL-16 (proxy.ts, joué par un enfant). Un critère rouge ici suffit : le rendu n'est pas lancé, ses
//    critères sont « non jugés » (rouges, comme tout critère jamais évalué). Sans moteur (app/controle/station/moteur/entree.tsx
//    absent), chaque critère de rendu dit « moteur absent » sans rien lancer.
// 2. Puis ce qui se MESURE : une copie de l'arbre jugé sous .orchestre/travail/station-claw3d-qa/, les drapeaux `pilotage` ET
//    `stationCarte` levés dans la copie seulement, le jeu Phaser et le pont instrumentés dans la copie seulement, `next build`
//    (celui de `npm run build`) puis `next start` sur 127.0.0.1 — un cache de build indexé par le sha256 du contenu de la copie
//    fait que deux jugements du même contenu ne construisent qu'une fois — ; Chromium (Playwright) parle à ce serveur avec une
//    session Supabase SIMULÉE (aucun compte, aucune clé, aucun .env.local : session-simulee.mjs) ; toute requête hors de
//    127.0.0.1 est coupée. Le contrat de ce que le moteur expose est scripts/fixtures/026-pilotage/k/CONTRAT.md.
// 3. Où il tourne : la partie rendu veut Phaser (148 Mo), un build et un navigateur ; sur le PC elle tourne sur l'usine. Lancé
//    ailleurs que sur l'usine (os.hostname() ≠ presti-usine), SANS --racine ni --temoin, et si scripts/usine.mjs et la clé ssh
//    de l'usine existent, le juge se relance par `node scripts/usine.mjs executer --nom=claw3d -- node scripts/station-claw3d-qa.mjs …`
//    et rend sa sortie et son code tels quels (usine injoignable : code 2). PRESTI_JUGE_LOCAL=1 force le jugement sur place ;
//    sans usine.mjs ou sans clé (le cloud), il se fait sur place aussi. Avec --racine ou --temoin l'arbre n'existe que sur la
//    machine qui l'a fabriqué : il est jugé sur place. Aucun `verifier` ne lance donc scripts/usine.mjs (CV-2 de 026-001).
// Sortie : « ✅ CL-n … » ou « ❌ CL-n … » par critère, puis « station-claw3d-qa … : PASS|FAIL ». Code 0 seulement si tout est
// vert, 1 si un critère est rouge, 2 si un préalable manque (Phaser absent de node_modules, Chromium, next, usine injoignable).
// N'écrit que sous .orchestre/travail/station-claw3d-qa/ ; aucun réseau hors 127.0.0.1 ; ne lit ni .env.local ni aucune clé.
process.env.TZ = 'UTC'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { R, lireOptions, creerSortie, premiereLigne, court } from './fixtures/026-pilotage/a/commun.mjs'
import { reference as REFERENCE_LOT } from './fixtures/026-pilotage/k/lot.mjs'
import { cl1, cl2, cl3, cl4, cl6, cl16Source, configPhaser, ecransVides, moteurPresent, ENTREE } from './fixtures/026-pilotage/k/juge-lecture.mjs'
import { preparerCopie, construire, servir, chunksPhaser, arbreTemoin, TRAV } from './fixtures/026-pilotage/k/juge-arbre.mjs'

const JUGE = 'station-claw3d-qa'
const CE_SCRIPT = fileURLToPath(import.meta.url)
const K = path.join(path.dirname(CE_SCRIPT), 'fixtures', '026-pilotage', 'k')
const PARTIES = ['provenance', 'verite', 'repos', 'garde', 'csp', 'poids', 'pixel', 'contexte', 'grille', 'hygiene']
const o = lireOptions(process.argv.slice(2), { connues: ['partie', 'base'] })
const refuser = (m) => { console.log(`${JUGE} : appel refusé — ${m}`); process.exit(2) }
const demandees = (o.valeurs.partie ? o.valeurs.partie.split(',').map((x) => x.trim()).filter(Boolean) : PARTIES)
if (o.inconnues.length || o.positionnels.length) refuser(`option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (!demandees.length || demandees.some((p) => !PARTIES.includes(p)) || new Set(demandees).size !== demandees.length) refuser(`--partie=<liste> attendue parmi ${PARTIES.join(', ')} (reçu : ${o.valeurs.partie ?? 'rien'})`)
if (o.valeurs.base !== undefined && !/^[\w.^~/-]{1,80}$/.test(o.valeurs.base)) refuser(`--base « ${o.valeurs.base} » : un commit attendu`)

// ── Les critères de chaque partie, et l'ordre de leur jugement ───────────────────────────────────────────────────────────
const IDS_PARTIE = { provenance: ['CL-1', 'CL-2', 'CL-3', 'CL-4'], verite: ['CL-6', 'CL-5', 'CL-7', 'CL-8'], grille: ['CL-15'], repos: ['CL-9'], garde: ['CL-10'], csp: ['CL-11'], poids: ['CL-12'], pixel: ['CL-13'], contexte: ['CL-14'], hygiene: ['CL-16'] }
const LIRE = new Set(['CL-1', 'CL-2', 'CL-3', 'CL-4', 'CL-6', 'CL-15', 'CL-16']) // sans serveur ni navigateur
const idsDe = (ps) => ps.flatMap((p) => IDS_PARTIE[p])
const ids = [...idsDe(demandees).filter((i) => LIRE.has(i)), ...idsDe(demandees).filter((i) => !LIRE.has(i))]
const rendus = ids.filter((i) => !LIRE.has(i))
const NOM = `${JUGE}${o.valeurs.partie ? ` --partie=${o.valeurs.partie}` : ''}${o.temoin ? ' --temoin' : ''}`

// ── Où il tourne : la relance sur l'usine ────────────────────────────────────────────────────────────────────────────────
const SUR_USINE = process.platform === 'linux' && os.hostname() === 'presti-usine'
const CLE_USINE = path.join(os.homedir(), '.ssh', 'presti-usine')
if (rendus.length && !SUR_USINE && process.env.PRESTI_JUGE_LOCAL !== '1' && !o.valeurs.racine && !o.temoin && fs.existsSync(path.join(R, 'scripts', 'usine.mjs')) && fs.existsSync(CLE_USINE)) {
  console.log(`· ${JUGE} : ce poste (${os.hostname()}) n'est pas l'usine ; les parties de rendu (${rendus.join(', ')}) sont relancées par scripts/usine.mjs executer`)
  const r = spawnSync(process.execPath, [path.join(R, 'scripts', 'usine.mjs'), 'executer', '--nom=claw3d', '--', 'node', 'scripts/station-claw3d-qa.mjs', ...process.argv.slice(2)], { cwd: R, stdio: 'inherit', windowsHide: true })
  if (r.status === null) { console.log(`❌ ${rendus[0]} usine injoignable : ${r.error ? premiereLigne(r.error) : 'aucun verdict rendu'}`); process.exit(2) }
  process.exit(r.status)
}

// ── La racine jugée ──────────────────────────────────────────────────────────────────────────────────────────────────────
let racine = o.racine
let entete = `${NOM} — racine ${path.relative(R, racine) || '.'}`
if (o.temoin) {
  try {
    const base = o.valeurs.base ?? REFERENCE_LOT
    const a = arbreTemoin(base)
    racine = a.dest
    entete = `${NOM} — le témoin du lot k (${a.poses.length} fichiers de scripts/fixtures/026-pilotage/k/temoin/) posé sur ${base.slice(0, 7)}, sous ${path.relative(R, a.dest)}`
  } catch (e) { console.log(`${NOM} : préalable — le témoin ne se pose pas (${premiereLigne(e)})`); process.exit(2) }
}
const s = creerSortie(NOM, ids, entete)
let prealable = false
const rouge = (id, m) => s.echoue(id, m)
const preal = (idsRouges, m) => { prealable = true; for (const id of idsRouges) rouge(id, `préalable manquant : ${m}`) }

const aNettoyer = []
const nettoyer = async () => { for (const f of aNettoyer.splice(0).reverse()) { try { await f() } catch { /* déjà arrêté */ } } }
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { nettoyer().finally(() => process.exit(1)) })
process.on('exit', () => { for (const f of aNettoyer.splice(0)) { try { f() } catch { /* asynchrone : le groupe est tué par SIGKILL plus bas */ } } })

async function enfant(script, args) {
  const r = spawnSync(process.execPath, ['--no-warnings', '--experimental-strip-types', path.join(K, script), ...args], { cwd: R, encoding: 'utf8', timeout: 120_000, env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', NODE_OPTIONS: process.env.NODE_OPTIONS ?? '', PIEGE_RESEAU_JOURNAL: process.env.PIEGE_RESEAU_JOURNAL ?? '' } })
  const l = (r.stdout ?? '').split(/\r?\n/).find((x) => x.startsWith('@@'))
  if (!l) return { ok: false, erreur: `l'enfant ${script} n'a rien rendu (code ${r.status}${r.error ? `, ${premiereLigne(r.error)}` : ''}) : ${court(r.stderr, 160)}` }
  try { return JSON.parse(l.slice(l.indexOf(' ') + 1)) } catch { return { ok: false, erreur: `l'enfant ${script} a rendu une ligne illisible` } }
}

// ═══ 1. Ce qui se lit ═════════════════════════════════════════════════════════════════════════════════════════════════════
const theme = JSON.parse(fs.readFileSync(path.join(K, 'themes', 'essai', 'theme.json'), 'utf8'))
const present = moteurPresent(racine)
const rendu = (id, r) => s.juger(id, r.echecs, r.detail)
const decrire = { 'CL-1': cl1, 'CL-2': cl2, 'CL-3': cl3, 'CL-4': cl4 }
for (const id of ids) {
  if (decrire[id]) { await s.critere(id, () => decrire[id](racine)); continue }
  if (id === 'CL-6') await s.critere(id, () => cl6(racine))
  else if (id === 'CL-15') {
    await s.critere(id, async () => {
      if (!present) return { echecs: [`moteur absent : ${ENTREE} n'existe pas sous ${court(racine, 60)}`], detail: '' }
      const g = await enfant('juge-grille-enfant.mjs', [racine, path.join(K, 'themes', 'essai', 'theme.json')])
      if (!g.ok) return { echecs: [`la grille du moteur (moteur/grille/grille.ts) ne se charge pas : ${g.erreur}`], detail: '' }
      const e = []
      if (g.impasses.length) e.push(`astar2D ne joint pas depuis le Commandement : ${g.impasses.slice(0, 5).join(', ')}${g.impasses.length > 5 ? ` (+${g.impasses.length - 5})` : ''}`)
      if (g.discontinus.length) e.push(`chemin discontinu ou qui n'arrive pas : ${g.discontinus.slice(0, 3).join(', ')}`)
      if (!g.tapis) e.push('tapisContinu(theme) rend faux : le tapis n\'est pas continu')
      if (g.atteintes.length) e.push(`la salle réservée est joignable : ${g.atteintes.join(', ')} (aucun chemin ne doit y mener)`)
      if (g.destReservee.length) e.push(`la salle réservée (${g.destReservee.join(', ')}) est une destination ou un poste (destinations())`)
      const attendus = theme.emplacements.filter((x) => !x.reservee).length
      if (g.sallesDest !== attendus || g.postesDest !== attendus) e.push(`destinations() rend ${g.sallesDest} portes et ${g.postesDest} postes, ${attendus} attendus (un par salle non réservée)`)
      return { echecs: e, detail: `astar2D joint depuis le Commandement la porte et le poste de chacune des ${attendus} salles (${g.joignables} chemins continus), le tapis est continu, l'emplacement réservé n'a ni poste ni destination et aucune de ses cases n'est joignable` }
    })
  } else if (id === 'CL-16') {
    await s.critere(id, async () => {
      const e = cl16Source(racine)
      const p = await enfant('juge-proxy-enfant.mjs', [racine])
      if (!p.ok) e.push(`proxy.ts ne s'exécute pas sous ts-loader : ${p.erreur}`)
      else {
        if (p.theme !== 'rewrite:/site/-/introuvable') e.push(`sur un hôte d'artisan, proxy() sert /station/themes/station/theme.json (« ${p.theme} », rewrite:/site/-/introuvable attendu) : les thèmes ne se servent jamais sur le domaine d'un artisan`)
        if (p.themeVaisseau !== 'rewrite:/site/-/introuvable') e.push(`sur un hôte d'artisan, proxy() sert /station/themes/vaisseau/theme.json (« ${p.themeVaisseau} »)`)
        if (p.ordinaire !== 'next') e.push(`proxy() ne laisse plus passer un chemin ordinaire d'artisan (/faq : « ${p.ordinaire} »)`)
        if (p.manifeste !== 'rewrite:/site/-/introuvable') e.push(`proxy() ne refuse plus /manifest.webmanifest sur un hôte d'artisan (« ${p.manifeste} »)`)
        if (p.maison !== 'next') e.push(`proxy() ne sert pas les thèmes sur l'hôte maison (« ${p.maison} », next attendu)`)
      }
      return { echecs: e, detail: 'CHEMINS_APP_PRESTI porte l\'alternative station\\/.* ; appelé par ts-loader avec un hôte d\'artisan factice, proxy() rewrite /station/themes/<clé>/theme.json vers la 404 neutre /site/-/introuvable, laisse passer /faq et l\'hôte maison' }
    })
  }
}

// ═══ 2. Ce qui se mesure ══════════════════════════════════════════════════════════════════════════════════════════════════
if (rendus.length) {
  const dejaRouge = ids.filter((i) => LIRE.has(i) && s.enEchec(i))
  if (!present) for (const id of rendus) rouge(id, `moteur absent : ${ENTREE} n'existe pas sous ${court(racine, 60)} (rien n'est construit ni lancé)`)
  else if (dejaRouge.length) for (const id of rendus) rouge(id, `non jugé : ${dejaRouge.join(', ')} est déjà rouge (ce qui se lit se corrige d'abord ; le rendu n'est pas lancé)`)
  else if (!fs.existsSync(path.join(R, 'node_modules', 'phaser', 'package.json'))) preal(rendus, 'phaser est absent de node_modules (installé par le préalable de l\'usine, jamais par npm install ici)')
  else if (!fs.existsSync(path.join(R, 'node_modules', 'next', 'dist', 'bin', 'next'))) preal(rendus, 'next est absent de node_modules')
  else {
    const {
      critereVerite, critereRepos, critereGarde, critereCsp, criterePoids, criterePixel, critereContexte, lancerNavigateur,
    } = await import('./fixtures/026-pilotage/k/juge-rendu.mjs')
    const { suiteEvenements } = await import('./fixtures/026-pilotage/k/session-simulee.mjs')
    const toutRouge = (m) => { for (const id of rendus) rouge(id, m) }
    try {
      const copie = preparerCopie(racine, { nom: 'jugee', variante: 'jugee' })
      if (copie.erreurs.length) { toutRouge(`la copie ne se prépare pas : ${copie.erreurs.join(' ; ')}`); throw new Error('fini') }
      if (!copie.jeux) { toutRouge('aucun « new Phaser.Game(… » sous moteur/ : le juge ne peut pas lire le jeu en marche (CONTRAT.md §2 : le moteur construit son jeu par new Phaser.Game(config))'); throw new Error('fini') }
      const b = await construire(copie, 'jugee')
      if (b.prealable) { preal(rendus, b.log); throw new Error('fini') }
      if (!b.ok) { toutRouge(b.log); throw new Error('fini') }
      const chunks = chunksPhaser(b.arbre)
      if (!chunks.size) { toutRouge('aucun morceau de Phaser dans le build de production : le moteur ne charge pas Phaser (import("phaser") attendu sous moteur/)'); throw new Error('fini') }
      const serveur = await servir(b.arbre)
      aNettoyer.push(() => serveur.arreter())
      let ref = null
      const buildReference = async () => {
        if (ref) return ref
        try {
          const c = preparerCopie(racine, { nom: 'ref', variante: 'reference' })
          if (c.erreurs.length) return (ref = { erreur: c.erreurs.join(' ; ') })
          const r = await construire(c, 'reference')
          if (!r.ok) return (ref = { erreur: r.log })
          const sv = await servir(r.arbre)
          aNettoyer.push(() => sv.arreter())
          return (ref = { base: sv.base })
        } catch (e) { return (ref = { erreur: premiereLigne(e) }) }
      }
      let nav
      try { nav = await lancerNavigateur() } catch (e) { preal(rendus, premiereLigne(e)); throw new Error('fini') }
      aNettoyer.push(() => nav.close())
      const ctx = { nav, base: serveur.base, chunks, theme, suite: suiteEvenements(), buildReference, arbre: b.arbre }
      const lancer = async (id, f) => s.critere(id, async () => { const r = await f(); return r })
      // La vérité se joue en trois critères qui partagent leurs pages.
      const veriteDemandee = ['CL-5', 'CL-7', 'CL-8'].some((i) => ids.includes(i))
      if (veriteDemandee) {
        let v = null
        try { v = await critereVerite(ctx) } catch (e) { for (const i of ['CL-5', 'CL-7', 'CL-8']) if (ids.includes(i)) rouge(i, `interrompu : ${premiereLigne(e)}`) }
        if (v) {
          if (ids.includes('CL-5')) rendu('CL-5', v.cl5)
          if (ids.includes('CL-7')) rendu('CL-7', v.cl7)
          if (ids.includes('CL-8')) { const e = [...v.cl8.echecs, ...ecransVides(racine)]; s.juger('CL-8', e, v.cl8.detail) }
        }
      }
      const suite = [['CL-9', critereRepos], ['CL-10', critereGarde], ['CL-11', critereCsp], ['CL-12', criterePoids], ['CL-13', criterePixel], ['CL-14', critereContexte]]
      for (const [id, f] of suite) {
        if (!ids.includes(id)) continue
        if (id === 'CL-13') await lancer(id, async () => { const r = await f(ctx); return { echecs: [...r.echecs, ...configPhaser(racine)], detail: r.detail } })
        else await lancer(id, () => f(ctx))
      }
    } catch (e) {
      if (e.message !== 'fini') for (const id of rendus) if (!s.evalue(id)) rouge(id, `interrompu : ${premiereLigne(e)}`)
    } finally { await nettoyer() }
  }
}
void TRAV
const code = s.finir()
process.exit(code === 0 ? 0 : prealable ? 2 : 1)
