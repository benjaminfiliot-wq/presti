// scripts/fixtures/026-pilotage/e/controles.mjs — les contrôles propres au lot e (fiche 026-172), lus par scripts/juges-026-pilotage-preuve.mjs --lot=e.
//   JA-3 (jeux d'essai)  controleJeux     les jeux JSON du dossier sont ceux que `fabriquer()` rend aujourd'hui ; chaque thème et chaque réponse servie respecte son
//                                         contrat (k/theme.schema.json, s/contrat-vues.mjs) ; le fil historique, la nuit, les modèles, les pièges et les salles hors périmètre sont ce
//                                         que les critères CE-25 à CE-28 et CE-16, CE-21, CE-22 attendent ; aucune clé réelle
//   JA-3 (témoin)        controleTemoin   le témoin est MINIMAL (moins de 300 lignes par fichier de code, ni Claw3D, ni Phaser, ni atlas, ni image) et ne peut pas servir de moteur ;
//                                         Carte.tsx et flags.ts du témoin sont ceux de la référence à leurs lignes ajoutées près ; chaque sélecteur que le juge lit est dans CONTRAT.md
//   JA-4                 controleSecrets  aucun juge du lot ne lit .env.local ni presti-secrets (lu dans le source, puis sous un piège des lectures) ; aucune adresse distante ; la
//                                         recette ne charge .env.local qu'après le choix d'un mode réel
//   JA-6                 controleCLI      les refus d'appel (code 2), JE-1 (sur la référence : CE-1 d'abord, « moteur absent », aucun navigateur, aucun build), RK-0 sur la référence,
//                                         `station-recette` sans option → RK-0 puis code 2, `--temoin` → code 0
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { E, TEMOIN_E, posix, jeuE, copie, listerFichiers, sansCommentaires, court, R, TRAVAIL } from './commun.mjs'
import { exigerSousTravail } from '../a/commun.mjs'
import { fabriquer, NOMS_JEUX, themeEssai, themeHublot, base, appliquerEvenement, photoPositions, tapisPlusUn, nuit, modeles, PIEGE_HTML, PIEGE_NOM } from './jeux.mjs'
import { validerTheme } from '../k/validateur.mjs'
import { validerVue, validerReglages } from '../s/contrat-vues.mjs'
import { jetonsDans, lecturesDeSecrets, RE_CHEMIN_SECRET } from '../a/jeux.mjs'

const K = path.join(E, '..', 'k')
const rel = (f) => posix(path.relative(R, f))
const lireTexte = (f) => fs.readFileSync(f, 'utf8')
const PARTIES_E = ['verite', 'camera', 'acteurs', 'calque', 'themes', 'reglages', 'salles2', 'webkit']

// ═══ JA-3 : les jeux d'essai ═══════════════════════════════════════════════════════════════════════════════════════════════════
function validerReponses(r, etiquette) {
  const e = []
  const ajouter = (l, x) => { for (const m of x) e.push(`${etiquette} · ${l} : ${m}`) }
  ajouter('direct', validerVue(r.direct, { vue: 'direct' }))
  ajouter('fil', validerVue(r.fil, { vue: 'fil' }))
  ajouter('agent', validerVue(r.agent, { vue: 'agent', nom: 'repondeur' }))
  for (const [cle, rep] of Object.entries(r.salles)) ajouter(`salle ${cle}`, validerVue(rep, { vue: 'salle', salle: cle }))
  ajouter('reglages', validerReglages(r.reglages))
  return e
}
export async function controleJeux() {
  const e = [], notes = []
  // 1. Les fichiers du dossier sont ceux que fabriquer() rend aujourd'hui, octet pour octet ; rien d'autre en JSON.
  const fab = fabriquer()
  for (const [nom, contenu] of Object.entries(fab)) {
    const f = path.join(E, nom)
    if (!fs.existsSync(f)) { e.push(`${nom} absent (node scripts/fixtures/026-pilotage/e/fabriquer-jeux.mjs l'écrit)`); continue }
    if (lireTexte(f) !== `${JSON.stringify(contenu, null, 1)}\n`) e.push(`${nom} n'est plus ce que fabriquer() rend (relancer fabriquer-jeux.mjs, puis relire le diff)`)
  }
  for (const f of fs.readdirSync(E)) if (f.endsWith('.json') && !(f in fab)) e.push(`${f} : un JSON que fabriquer() ne rend pas`)
  notes.push(`${NOMS_JEUX.length} jeux JSON identiques à fabriquer()`)
  // 2. Les thèmes : le thème d'essai, celui au hublot, celui du témoin respectent le schéma ; le hublot est un polygone.
  const schema = JSON.parse(lireTexte(path.join(K, 'theme.schema.json')))
  const temoinTheme = JSON.parse(lireTexte(path.join(TEMOIN_E, 'public', 'station', 'themes', 'station', 'theme.json.temoin')))
  for (const [nom, t] of [['thème d\'essai de k/', themeEssai()], ['thème d\'essai au hublot', themeHublot()], ['thème Station du témoin', temoinTheme]]) for (const m of validerTheme(t, schema)) e.push(`${nom} : ${m}`)
  if (themeHublot().emplacements.find((x) => x.cle === 'reunion').forme.type !== 'polygone') e.push('le thème au hublot : la salle de réunion n\'est pas un polygone')
  if (temoinTheme.cle !== 'station' || temoinTheme.mise_en_page !== 'colonnes') e.push(`le thème du témoin : cle « ${temoinTheme.cle} », mise_en_page « ${temoinTheme.mise_en_page} » (station et colonnes attendus)`)
  if (temoinTheme.emplacements.length !== 21 || temoinTheme.emplacements.filter((x) => x.reservee).length !== 1) e.push('le thème du témoin : 21 emplacements dont un réservé attendus')
  notes.push('trois thèmes valides (schéma et contraintes hors schéma)')
  // 3. Les réponses servies : les réponses par défaut, puis chaque événement et chaque variante, restent conformes au contrat des vues.
  e.push(...validerReponses(base(), 'réponses par défaut'))
  const ev = jeuE('evenements.json')
  let n = 0
  for (const [nom, etape] of Object.entries(ev)) {
    if (nom === '_') continue
    const r = base(), photo = photoPositions(r)
    appliquerEvenement(r, etape, photo)
    e.push(...validerReponses(r, `événement ${nom}`)); n++
  }
  for (const nom of ['depart_porte', 'tache_prise', 'reunion_ouverte', 'reunion_close', 'pause', 'reprise', 'panne', 'radar', 'ailleurs']) if (!ev[nom]) e.push(`evenements.json : l'étape « ${nom} » manque`)
  {
    const tache = base(); appliquerEvenement(tache, ev.tache_prise)
    const a = tache.direct.valeur.equipage.valeur.agents.find((x) => x.nom === 'atelier_maquettes')
    if (a?.position?.salle !== 'atelier' || a?.position?.motif !== 'tache') e.push('l\'événement tache_prise ne met pas atelier_maquettes à atelier/tache')
    if (!tache.fil.valeur.bulles.some((b) => b.texte === 'Maquette plombier, Lyon' && b.agent === 'atelier_maquettes')) e.push('l\'événement tache_prise n\'ajoute pas la bulle « Maquette plombier, Lyon »')
    const reu = base(), photo = photoPositions(reu); appliquerEvenement(reu, ev.reunion_ouverte, photo)
    const enReunion = reu.direct.valeur.equipage.valeur.agents.filter((x) => x.position?.motif === 'reunion')
    if (!enReunion.length) e.push('reunion_ouverte ne met personne en reunion')
    appliquerEvenement(reu, ev.reunion_close, photo)
    if (reu.direct.valeur.equipage.valeur.agents.some((x) => x.position?.motif === 'reunion')) e.push('reunion_close laisse quelqu\'un en reunion')
  }
  {
    const r = tapisPlusUn(base(), 'contacte', 1), avant = base().direct.valeur.tapis.valeur.etapes.find((x) => x.cle === 'contacte').jour
    if (r.direct.valeur.tapis.valeur.etapes.find((x) => x.cle === 'contacte').jour !== avant + 1) e.push('tapisPlusUn ne monte pas le jour de l\'étape contacte de 1')
    e.push(...validerReponses(r, 'tapis +1'))
    e.push(...validerReponses(nuit(base(), true), 'nuit'))
    e.push(...validerReponses(modeles(base(), jeuE('equipage-modeles.json').modeles), 'modèles'))
  }
  notes.push(`${n} étapes d'événements rejouées sur les réponses, toutes conformes au contrat des vues (s/contrat-vues.mjs)`)
  // 4. Les jeux propres au lot e.
  const fil = jeuE('fil-historique.json'), bulles = fil.valeur?.bulles ?? []
  if (bulles.length !== 100) e.push(`fil-historique.json : ${bulles.length} bulles, 100 attendues`)
  if (bulles.filter((b) => ['recenseur', 'vigie_meta', 'veilleur'].includes(b.agent)).length !== 30) e.push('fil-historique.json : 30 bulles du Radar et du Veilleur attendues')
  if (bulles.some((b, i) => b.id !== i + 1)) e.push('fil-historique.json : les identifiants ne vont pas de 1 à 100 dans l\'ordre')
  if (fil.valeur?.dernier_id !== 100) e.push('fil-historique.json : dernier_id 100 attendu')
  const cn = jeuE('carte-nuit.json')
  if (cn.faux?.valeur !== false || cn.vrai?.valeur !== true) e.push('carte-nuit.json : { faux: false, vrai: true } attendu (carte.nuit)')
  const pg = jeuE('reglages-pieges.json')
  if (pg._piege !== PIEGE_HTML || pg.equipage?.facteur?.nom !== PIEGE_HTML || pg.salles?.radar?.plaque !== PIEGE_HTML || pg.bulle?.texte !== PIEGE_HTML) e.push('reglages-pieges.json : le texte piégé doit être le même dans un nom réglé, une plaque réglée et une bulle du fil')
  const sp = jeuE('salles-pieges.json')
  if (sp._piege !== PIEGE_NOM || !JSON.stringify(sp).includes('jean.temoin@')) e.push('salles-pieges.json : le piège « nom de personne » et son e-mail attendus')
  if (Object.keys(jeuE('salles-hors-perimetre.json')).filter((k) => k !== '_').length < 5) e.push('salles-hors-perimetre.json : cinq salles au moins attendues')
  if (jeuE('salles2-vingt.json').salles.length !== 20) e.push('salles2-vingt.json : vingt salles attendues')
  if ((jeuE('reglages-historique.json').versions ?? []).length !== 12) e.push('reglages-historique.json : douze versions attendues')
  const mod = jeuE('equipage-modeles.json').modeles
  if (!Object.values(mod).includes('sans IA')) e.push('equipage-modeles.json : « sans IA » attendu pour un agent sans modèle')
  const ex = jeuE('experience-sans-vente.json').experience
  if (ex?.valeur?.statut !== null) e.push('experience-sans-vente.json : statut null attendu (avant la première vente)')
  notes.push('fil historique de 100 bulles dont 30 du Radar, nuit, pièges, hors périmètre, modèles et douze versions conformes')
  // 5. Aucune clé réelle dans le dossier.
  for (const f of listerFichiers(E)) {
    if (!/\.(?:json|mjs|md)$/.test(f)) continue
    for (const j of jetonsDans(lireTexte(path.join(E, f)))) e.push(`e/${f}:${j.ligne} porte une clé réelle (${j.nom})`)
  }
  return { echecs: e, detail: notes.join(' ; ') }
}

// ═══ JA-3 : le témoin ═════════════════════════════════════════════════════════════════════════════════════════════════════════
const INTERDITS_TEMOIN = /\b(?:OfficeSceneBridge|buildNavGrid2D|astar2D|StationPixelScene|roomFor|OfficeScene|AgentAvatar)\b|from\s+['"]phaser['"]|import\(\s*['"]phaser['"]\s*\)|require\(\s*['"]phaser['"]\s*\)/
const MAX_LIGNES = 300
export async function controleTemoin(ctx) {
  const e = [], notes = []
  const fichiers = [...listerFichiers(TEMOIN_E)].map(posix).sort()
  let code = 0
  for (const f of fichiers) {
    if (!f.endsWith('.temoin')) { e.push(`témoin : ${f} sans le suffixe .temoin`); continue }
    const chemin = f.slice(0, -'.temoin'.length)
    if (/\.(?:png|jpe?g|webp|gif|avif|svg|ico|woff2?|ttf|otf|atlas|bin)$/i.test(chemin)) { e.push(`témoin : ${chemin} est une image, une police ou un atlas : le témoin n'en porte aucun`); continue }
    const t = lireTexte(path.join(TEMOIN_E, f))
    if (!t.trim()) { e.push(`témoin : ${chemin} est vide`); continue }
    if (/\.(?:tsx?|jsx?|mjs)$/.test(chemin)) {
      code++
      const lignes = t.split(/\r?\n/).length
      if (lignes > MAX_LIGNES) e.push(`témoin : ${chemin} fait ${lignes} lignes, ${MAX_LIGNES} au plus (un témoin n'est pas un moteur)`)
      const m = INTERDITS_TEMOIN.exec(sansCommentaires(t))
      if (m) e.push(`témoin : ${chemin} porte « ${m[0]} » : ni code de Claw3D, ni Phaser (le témoin ne peut pas servir de moteur)`)
    }
  }
  for (const attendu of ['app/controle/station/Carte.tsx', 'app/controle/station/moteur/entree.tsx', 'app/controle/station/moteur/claw3d/LICENSE-claw3d.txt', 'lib/flags.ts', 'public/station/themes/station/theme.json', ...['index', 'coeur', 'camera', 'acteurs', 'calque', 'telephone', 'reglages', 'salles'].map((m) => `public/temoin-e/${m}.js`)]) {
    if (!fichiers.includes(`${attendu}.temoin`)) e.push(`témoin : ${attendu}.temoin manque`)
  }
  notes.push(`${fichiers.length} fichiers dont ${code} de code, chacun de ${MAX_LIGNES} lignes au plus, ni Claw3D, ni Phaser, ni image`)
  // Carte.tsx et flags.ts : ceux de la référence, à leurs lignes ajoutées près.
  if (ctx.reference) {
    const ref = (f) => lireTexte(path.join(ctx.reference, f))
    try {
      const fl = lireTexte(path.join(TEMOIN_E, 'lib', 'flags.ts.temoin')).replace(/\r\n/g, '\n').split('\n'), fr = ref('lib/flags.ts').replace(/\r\n/g, '\n').split('\n')
      const ajoutees = fl.filter((l) => !fr.includes(l))
      const manque = fr.filter((l) => !fl.includes(l))
      if (manque.length) e.push(`flags.ts du témoin : ${manque.length} ligne(s) de la référence ont disparu (${court(manque[0], 60)})`)
      if (!ajoutees.some((l) => /\bstationCarte\s*:\s*false\s*,/.test(l)) || ajoutees.length > 3) e.push(`flags.ts du témoin : ${ajoutees.length} ligne(s) ajoutée(s), le commentaire et « stationCarte: false, » seulement attendus`)
      const sansAjout = fl.filter((l) => fr.includes(l)).join('\n')
      if (sansAjout !== fr.join('\n').split('\n').filter((l) => fl.includes(l)).join('\n')) e.push('flags.ts du témoin : l\'ordre des lignes de la référence n\'est pas gardé')
      const props = (t) => (/export type CarteProps = \{[\s\S]*?\n\}/.exec(t) ?? [''])[0].replace(/\s+/g, ' ')
      if (!props(ref('app/controle/station/Carte.tsx')) || props(ref('app/controle/station/Carte.tsx')) !== props(lireTexte(path.join(TEMOIN_E, 'app', 'controle', 'station', 'Carte.tsx.temoin')))) e.push('Carte.tsx du témoin : le type CarteProps n\'est pas celui de la référence (les propriétés sont figées par 026-179)')
      const c = lireTexte(path.join(TEMOIN_E, 'app', 'controle', 'station', 'Carte.tsx.temoin'))
      for (const attendu of ['data-station-carte', 'data-liste-salles', 'SALLES.map']) if (!c.includes(attendu)) e.push(`Carte.tsx du témoin ne porte plus ${attendu} (la liste des salles reste sous la carte)`)
      notes.push('flags.ts et Carte.tsx du témoin : ceux de la référence, aux lignes ajoutées près')
    } catch (err) { e.push(`la référence ne se lit pas : ${String(err.message).split('\n')[0].slice(0, 120)}`) }
  } else e.push('arbre de référence indisponible : flags.ts et Carte.tsx du témoin ne sont pas comparés')
  // Chaque sélecteur que le juge lit est dans CONTRAT.md.
  const contrat = fs.existsSync(path.join(E, 'CONTRAT.md')) ? lireTexte(path.join(E, 'CONTRAT.md')) : null
  if (contrat === null) e.push('CONTRAT.md absent : le contrat des juges d\'écran n\'est pas écrit')
  else {
    const noms = new Set()
    for (const f of ['juge-verite', 'juge-carte', 'juge-acteurs', 'juge-calque', 'juge-reglages', 'juge-salles', 'captures', 'commun']) for (const m of lireTexte(path.join(E, `${f}.mjs`)).matchAll(/\bdata-[a-z][a-z0-9-]*/g)) noms.add(m[0])
    for (const m of lireTexte(path.join(R, 'scripts', 'station-ecran-qa.mjs')).matchAll(/\bdata-[a-z][a-z0-9-]*/g)) noms.add(m[0])
    const absents = [...noms].filter((n) => !new RegExp(`${n}(?![a-z0-9-])`).test(contrat))
    if (absents.length) e.push(`CONTRAT.md ne dit pas ${absents.slice(0, 6).join(', ')}${absents.length > 6 ? ` (+${absents.length - 6})` : ''} : le moteur ne saurait pas qu'il doit l'exposer`)
    notes.push(`${noms.size} attributs data-* lus par le juge, tous dans CONTRAT.md`)
  }
  return { echecs: e, detail: notes.join(' ; ') }
}

// ═══ JA-4 : aucun secret, aucune adresse distante ═════════════════════════════════════════════════════════════════════════════════
const SOURCES = () => {
  const out = [path.join(R, 'scripts', 'station-ecran-qa.mjs')]
  for (const f of fs.readdirSync(E)) if (/^(?:juge-.*|captures|commun|jeux|controles|fabriquer-jeux|lot)\.mjs$/.test(f)) out.push(path.join(E, f))
  return out
}
const HOTES_PERMIS = /^(?:127\.0\.0\.1|localhost|exemple\.invalid|.*\.exemple\.invalid|phaser\.io|fonts\.gstatic\.com|fonts\.googleapis\.com|prestiapp\.fr)$/
const PIEGE_LECTURES = (journal) => String.raw`// Piège des lectures du lot e (JA-4 de 026-172), écrit par scripts/fixtures/026-pilotage/e/controles.mjs.
import fs from 'node:fs'
import fsp from 'node:fs/promises'
const RE = ${RE_CHEMIN_SECRET.toString()}
const J = ${JSON.stringify(journal)}
const vise = (p) => { try { return RE.test(String(p instanceof URL ? p.pathname : p).replace(/\\/g, '/')) } catch { return false } }
const noter = (quoi, p) => { try { fs.appendFileSync(J, process.pid + ' ' + quoi + ' ' + String(p) + '\n') } catch {} }
for (const [o, noms] of [[fs, ['readFileSync', 'openSync', 'existsSync', 'statSync', 'readFile', 'open', 'createReadStream']], [fsp, ['readFile', 'open']]]) {
  for (const n of noms) {
    const f = o[n]
    if (typeof f !== 'function') continue
    o[n] = function (p, ...a) {
      if (vise(p)) { noter(n, p); if (n === 'existsSync') return false; throw new Error('lecture refusée par le piège du lot e : ' + p) }
      return f.call(this, p, ...a)
    }
  }
}
if (typeof process.loadEnvFile === 'function') { process.loadEnvFile = function (p) { noter('loadEnvFile', p ?? '.env'); throw new Error('loadEnvFile refusé par le piège du lot e') } }
`
export async function controleSecrets(ctx) {
  const e = []
  const sources = SOURCES()
  for (const f of sources) {
    const src = lireTexte(f)
    for (const l of lecturesDeSecrets(src)) e.push(`${rel(f)}${l.ligne ? `:${l.ligne}` : ''} lit un secret : ${l.quoi}`)
    for (const j of jetonsDans(src)) e.push(`${rel(f)}:${j.ligne} porte une clé réelle (${j.nom})`)
    const chaines = []
    sansCommentaires(src, chaines)
    for (const { texte } of chaines) for (const m of texte.matchAll(/\bhttps?:\/\/([^/\s:'"`$]+)/g)) if (!HOTES_PERMIS.test(m[1])) e.push(`${rel(f)} : l'adresse distante « ${m[0]} » (hors de 127.0.0.1)`)
  }
  // La recette : .env.local n'est chargé qu'APRÈS le choix d'un mode réel (la ligne chargerEnv( vient après les modes statiques et --temoin).
  const recette = lireTexte(path.join(R, 'scripts', 'station-recette.mjs'))
  const iCharge = recette.search(/\bchargerEnv\s*\(\s*R\s*\)/), iModes = recette.indexOf('// ═══ Les modes réels'), iTemoin = recette.indexOf('if (o.temoin) {'), iStat = recette.indexOf('if (!MODE) {')
  if (iCharge < 0 || iModes < 0 || iTemoin < 0 || iStat < 0) e.push('station-recette.mjs : le chargement de .env.local, les modes réels ou les branches statiques sont introuvables')
  else if (!(iCharge > iModes && iModes > iStat && iStat > iTemoin)) e.push('station-recette.mjs : .env.local est chargé avant le choix d\'un mode réel (ni --temoin, ni --racine, ni sans option ne le lisent)')
  const nCharge = (recette.match(/\bchargerEnv\s*\(/g) ?? []).length
  if (nCharge !== 1) e.push(`station-recette.mjs : ${nCharge} appel(s) de chargerEnv(, un seul attendu`)
  // À l'exécution, sous le piège des lectures : le juge (référence) et la recette (référence, témoin, sans option) ne lisent aucun secret.
  const d = exigerSousTravail(path.join(TRAVAIL, 'juges-026-pilotage', `lectures-${ctx.lot}`))
  fs.rmSync(d, { recursive: true, force: true })
  fs.mkdirSync(path.join(d, 'leurres'), { recursive: true })
  const leurre = path.join(d, 'leurres', ['', 'env', 'local'].join('.'))
  fs.writeFileSync(leurre, 'LEURRE_TEMOIN=1\n')
  const journal = path.join(d, 'journal.log'), piege = path.join(d, 'piege-lectures.mjs')
  fs.writeFileSync(piege, PIEGE_LECTURES(journal))
  const env = { NODE_OPTIONS: `--import=${pathToFileURL(piege).href}` }
  const lu = () => { try { return lireTexte(journal).trim() } catch { return '' } }
  const t = ctx.lancerNode(['-e', `const fs = require('node:fs'); let a = 'lu', b = 'lu'; try { fs.readFileSync(${JSON.stringify(leurre)}) } catch { a = 'refuse' } try { fs.readFileSync(${JSON.stringify(path.join(E, 'lot.mjs'))}) } catch { b = 'refuse' } console.log(a + ' ' + b)`], { nom: 'piege-lectures-temoin', env, timeout: 60_000 })
  if (t.stdout.trim().split(/\r?\n/).pop() !== 'refuse lu') e.push(`le piège des lectures ne refuse pas le leurre ou gêne une lecture ordinaire (« ${court(t.sortie, 80)} »)`)
  if (!lu().includes(leurre)) e.push('le piège des lectures ne consigne pas le leurre')
  fs.rmSync(journal, { force: true })
  const lancements = [
    ['station-ecran-qa sur la référence', ['scripts/station-ecran-qa.mjs', `--racine=${ctx.reference}`, '--partie=verite,camera,acteurs,calque,themes,reglages,salles2,webkit'], [1, 2]],
    ['station-recette sur la référence', ['scripts/station-recette.mjs', `--racine=${ctx.reference}`], [1]],
    ['station-recette --temoin', ['scripts/station-recette.mjs', '--temoin'], [0]],
    ['station-recette sans option', ['scripts/station-recette.mjs'], [2]],
  ]
  for (const [nom, args, codes] of lancements) {
    const x = ctx.lancerNode(args, { nom: `lectures-${nom.replace(/\W+/g, '-')}`, env, timeout: 300_000 })
    if (!codes.includes(x.code)) e.push(`${nom} sous le piège des lectures : code ${x.code}, ${codes.join(' ou ')} attendu (« ${court(x.sortie.trim().split(/\r?\n/).slice(-2).join(' '), 120)} »)`)
  }
  const jl = lu()
  if (jl) e.push(`lecture de secret consignée sous le piège : ${court(jl.split('\n')[0], 120)}`)
  return { echecs: e, detail: `${sources.length} sources lus (station-ecran-qa, juge-*, captures, commun, jeux, controles, lot) : aucune lecture de .env.local ni de presti-secrets, aucune clé réelle, aucune adresse distante hors 127.0.0.1 ; station-recette ne charge .env.local qu'après le choix d'un mode réel ; le juge et la recette (référence, témoin, sans option) tournent sous un piège des lectures sans le toucher` }
}

// ═══ JA-6 : les refus d'appel, JE-1, et la recette ═══════════════════════════════════════════════════════════════════════════
const premiereLigneCritere = (sortie) => sortie.split(/\r?\n/).map((l) => l.trim()).find((l) => /^(?:✅|❌) [A-Z0-9]{1,5}-[A-Z0-9-]+\b/.test(l)) ?? null
export async function controleCLI(ctx) {
  const e = [], notes = []
  const lancer = (args, nom, env = {}) => ctx.lancerNode(args, { nom, env, timeout: 300_000 })
  const refus = [
    ['--partie=inconnue', ['--partie=inconnue']],
    ['--lot=a sans salles2', ['--partie=verite', '--lot=a']],
    ['--lot=c', ['--partie=salles2', '--lot=c']],
    ['--critere d\'une autre partie', ['--partie=verite', '--critere=CE-9']],
    ['une option inconnue', ['--partie=verite', '--bizarre']],
  ]
  for (const [nom, args] of refus) {
    const r = lancer(['scripts/station-ecran-qa.mjs', ...args], `refus-${nom.replace(/\W+/g, '-')}`)
    if (r.code !== 2 || !/appel refusé/.test(r.sortie)) e.push(`station-ecran-qa ${args.join(' ')} : code ${r.code}, « appel refusé » et code 2 attendus (« ${court(r.sortie, 90)} »)`)
  }
  notes.push(`${refus.length} appels refusés en code 2 (partie inconnue, --lot hors salles2 ou autre que a|b, critère d'une autre partie, option inconnue)`)
  // JE-1 : sur la référence, chaque partie sort en code ≠ 0, CE-1 d'abord, sans navigateur ni build.
  if (!ctx.reference) e.push('arbre de référence indisponible : JE-1 ne se joue pas')
  else {
    for (const p of PARTIES_E) {
      const r = lancer(['scripts/station-ecran-qa.mjs', `--racine=${ctx.reference}`, `--partie=${p}`], `reference-${p}`, { STATION_ECRAN_TRACE: '1' })
      const premiere = premiereLigneCritere(r.sortie)
      if (r.code !== 1 && r.code !== 2) e.push(`--partie=${p} sur la référence : code ${r.code}, 1 ou 2 attendu`)
      if (!premiere?.startsWith('❌ CE-1 ')) e.push(`--partie=${p} sur la référence : premier critère « ${court(premiere ?? 'aucun', 80)} », « ❌ CE-1 » attendu`)
      if (!/moteur absent/.test(r.sortie)) e.push(`--partie=${p} sur la référence : « moteur absent » n'est pas dit pour les critères de rendu`)
      if (/\[trace[^\]]*\] copie, build et serveur/.test(r.sortie)) e.push(`--partie=${p} sur la référence : un build ou un navigateur a été lancé (rien ne doit l'être sans moteur)`)
    }
    notes.push(`sur la référence : chacune des ${PARTIES_E.length} parties sort en 1 ou 2 avec ❌ CE-1 en premier et « moteur absent » pour les critères de rendu, sans build ni navigateur (JE-1)`)
    // La recette : RK-0 sur la référence, sans option → code 2, --temoin → 0.
    const rr = lancer(['scripts/station-recette.mjs', `--racine=${ctx.reference}`], 'recette-reference')
    if (rr.code !== 1 || !premiereLigneCritere(rr.sortie)?.startsWith('❌ RK-0 ')) e.push(`station-recette --racine=<référence> : code ${rr.code}, « ${court(premiereLigneCritere(rr.sortie) ?? rr.sortie, 80)} » (code 1 et ❌ RK-0 en premier attendus)`)
    if (/\[(?:avant|reel|constat)\]|fetch/.test(rr.sortie)) e.push('station-recette --racine=<référence> a lancé un mode réel')
    const rs = lancer(['scripts/station-recette.mjs'], 'recette-sans-option')
    if (rs.code !== 2 || !/^(?:✅|❌) RK-0 /.test(premiereLigneCritere(rs.sortie) ?? '') || !/préalable/.test(rs.sortie)) e.push(`station-recette sans option : code ${rs.code}, RK-0 puis « préalable » et code 2 attendus (« ${court(rs.sortie.trim().split(/\r?\n/).slice(-1)[0], 90)} »)`)
    const rt = lancer(['scripts/station-recette.mjs', '--temoin'], 'recette-temoin')
    const verts = rt.sortie.split(/\r?\n/).filter((l) => l.startsWith('✅ RK-')).length
    if (rt.code !== 0 || verts < 4) e.push(`station-recette --temoin : code ${rt.code}, ${verts} critère(s) vert(s), 0 et quatre RK-0 attendus`)
    for (const [nom, args] of [['--avant avec --racine', ['--avant', `--racine=${ctx.reference}`]], ['deux modes', ['--avant', '--reel']], ['--constat=autre', ['--constat=autre']], ['--base non https', ['--avant', '--base=http://exemple.invalid']], ['--temoin avec --racine', ['--temoin', `--racine=${ctx.reference}`]]]) {
      const r = lancer(['scripts/station-recette.mjs', ...args], `recette-refus-${nom.replace(/\W+/g, '-')}`)
      if (r.code !== 2 || !/appel refusé/.test(r.sortie)) e.push(`station-recette ${args.join(' ')} : code ${r.code}, « appel refusé » et code 2 attendus (« ${court(r.sortie, 90)} »)`)
    }
    notes.push('station-recette : ❌ RK-0 en premier sur la référence (code 1), sans option RK-0 puis « préalable » (code 2), --temoin quatre critères verts (code 0), cinq appels refusés (code 2)')
  }
  // JE-3 : chaque image écrite sort d'un page.screenshot( du juge, l'image d'avant effacée au même chemin ; aucun autre module n'écrit un JPEG ou un PNG.
  const main = lireTexte(path.join(R, 'scripts', 'station-ecran-qa.mjs'))
  const prendre = /async function prendre\(page, fichier\) \{([\s\S]*?)\n\}/.exec(main)
  if (!prendre) e.push('station-ecran-qa.mjs : prendre(page, fichier) introuvable')
  else {
    const iRm = prendre[1].indexOf('fs.rmSync(fichier'), iShot = prendre[1].indexOf('page.screenshot({ path: fichier')
    if (iRm < 0 || iShot < 0 || iRm > iShot) e.push('prendre : l\'image d\'avant n\'est pas effacée avant page.screenshot( au même chemin')
  }
  let ecrits = 0
  for (const f of [path.join(R, 'scripts', 'station-ecran-qa.mjs'), ...fs.readdirSync(E).filter((x) => /^(?:juge-.*|captures|commun|jeux)\.mjs$/.test(x)).map((x) => path.join(E, x))]) {
    for (const [i, l] of sansCommentaires(lireTexte(f)).split('\n').entries()) {
      if (/\b(?:writeFileSync|copyFileSync|createWriteStream|writeFile)\s*\(/.test(l) && /\.(?:jpe?g|png|webp)\b/i.test(l)) e.push(`${rel(f)}:${i + 1} : une image écrite hors de page.screenshot( (« ${court(l.trim(), 80)} »)`)
      if (/\.screenshot\s*\(/.test(l) && /\{\s*path\s*:/.test(l)) ecrits++
    }
  }
  if (ecrits !== 1) e.push(`${ecrits} appel(s) de page.screenshot({ path: … }) dans le juge, un seul (prendre) attendu`)
  notes.push('chaque image écrite sort du seul page.screenshot({ path }) de prendre(), l\'image d\'avant effacée au même chemin (JE-3)')
  void copie
  return { echecs: e, detail: notes.join(' ; ') }
}
