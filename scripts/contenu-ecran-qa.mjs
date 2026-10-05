#!/usr/bin/env node
// scripts/contenu-ecran-qa.mjs — le juge d'écran du suivi du contenu (fiche 026-216, C13 : « panneaux de suivi du contenu »).
// Écrit le 05/10/2026 par Claude Code (lot C-juges-perimes, décision D-0510-4) : la fiche 026-204, censée le livrer, ne l'avait pas
// fait ; `verifier` de 026-216 rendait « Cannot find module ». Le juge est écrit à partir du CONTRAT de la fiche (§ « Ce qu'il faut
// faire » et « Cahier de contrôle »), pas à partir de l'essai à blanc de l'exécutant : jeux de données, identifiants et dates sont les siens.
//
//   node scripts/contenu-ecran-qa.mjs [--racine=<copie>]       le juge (code 0 = tout vert) ; --racine juge une copie (sabotage)
//   node scripts/contenu-ecran-qa.mjs --sabotages              la preuve de sensibilité : une copie, une faute réelle à la fois,
//        le juge relancé sur chacune (code 1 attendu, critère nommé en échec), la copie remise à l'identique (sha256) après chaque
//        passage ; écrit .orchestre/preuves/026-216/sabotages.md. Code 0 si le témoin est vert et chaque faute prise.
//
// Ce qui est jugé : le MODÈLE de vue app/controle/contenu/suivi.ts (fonction pure construireSuivi) et son AFFICHAGE
// components/controle/contenu/SuiviContenu.tsx rendu en HTML statique (react-dom/server) sur cinq états : plein, vide, non servi,
// panne de Laya, attente R6 (plus l'absence totale de modèle). Ni réseau, ni base, ni navigateur, ni clé : personnes, dates et sources
// fictives (@presti-test.invalid, example.invalid). Le chargeur serveur et le montage dans la station ne sont pas jugés ici : ils ne sont
// pas livrés (voir .orchestre/preuves/026-216/a-brancher.md) ; une capture de navigateur à 375 px reste un contrôle humain ou celui du
// juge de la station une fois le panneau monté.
//
// Critères (le nom de l'objet jugé est dit dans chaque ligne) :
//   CE-1  contrat, pureté : exports, aucun réseau/horloge/hasard/environnement, entrée gelée non modifiée, deux appels identiques
//   CE-2  Tour du Crieur : lignes L1–L5, attente, file TikTok, refus avec motif, publications : séparés, aucun post en double
//   CE-3  R6 : un post Meta prêt attend (jamais « publié ») tant que le geste n'est pas ouvert ; inconnu = fermé
//   CE-4  preuve publique : une publication sans preuve est dite sans preuve ; avec preuve, la preuve est montrée
//   CE-5  texte exact : texte, légende, sous-titres, miniature, description montrés tels quels (échappés) ; un chiffre caché dans l'un
//         d'eux fait une carte de blocage
//   CE-6  mesures : « non mesuré » et « en attente » ne deviennent jamais 0 ; chaque valeur porte sa source et sa date ; échéance illisible = en attente
//   CE-7  ventes : estimation et fenêtre en heures, au modèle et à l'écran
//   CE-8  blocages jev noul : < 0,5, source absente, Laya indisponible, probabilité absente, chiffre sans affirmation jugée ; 0,5 passe
//   CE-9  Radar : score Laya avec sa provenance ; panne dite sans aucun score ; aucun score n'ouvre ni ne ferme rien
//   CE-10 non servi ≠ vide : une source absente est « non servie », une liste vide est « vide », jamais l'un pour l'autre ni un zéro
//   CE-11 écran, états : plein, vide, non servi, panne, attente R6, absence de modèle : tout se dit en mots (rôle alerte pour le grave)
//   CE-12 écran, aucune action : ni bouton, ni lien, ni formulaire, ni verbe d'envoi ; le modèle n'a aucun champ d'action
//   CE-13 écran, clavier et mobile : titres liés, tableaux légendés, régions défilantes focalisables, retours à la ligne, aucune largeur fixe
//   CE-14 aucune donnée de prospect : un champ étranger du jeu d'entrée n'apparaît ni dans le modèle ni à l'écran
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

const CE = fileURLToPath(import.meta.url)
const ROOT = path.resolve(path.dirname(CE), '..')
const NOM = 'contenu-ecran-qa'
const FICHE = '026-216'
const TRAVAIL = path.join(ROOT, '.orchestre', 'travail', NOM)
const PREUVES = path.join(ROOT, '.orchestre', 'preuves', FICHE)
const SUIVI = 'app/controle/contenu/suivi.ts'
const ECRAN = 'components/controle/contenu/SuiviContenu.tsx'
const IDS = ['CE-1', 'CE-2', 'CE-3', 'CE-4', 'CE-5', 'CE-6', 'CE-7', 'CE-8', 'CE-9', 'CE-10', 'CE-11', 'CE-12', 'CE-13', 'CE-14']

const args = process.argv.slice(2)
const option = (n) => { const a = args.find((x) => x === `--${n}` || x.startsWith(`--${n}=`)); return a === undefined ? undefined : a.includes('=') ? a.slice(a.indexOf('=') + 1) : true }
const connues = new Set(['racine', 'sabotages'])
for (const a of args) { const m = /^--([a-z-]+)(=.*)?$/.exec(a); if (!m || !connues.has(m[1])) { console.log(`${NOM} : appel refusé — argument inconnu : ${a}`); process.exit(2) } }
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex')
const court = (t, n = 160) => { const x = String(t ?? '').replace(/\s+/g, ' ').trim(); return x.length > n ? `${x.slice(0, n - 1)}…` : x }

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Mode --sabotages : la preuve de sensibilité du juge
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Une faute = un remplacement de texte exact (ancre unique) dans le modèle ou l'affichage, et le critère qui doit la prendre.
const SABOTAGES = [
  ['CE-1', SUIVI, "const r6Ferme = e.r6Ouvert !== true", "const r6Ferme = Date.now() > 0 && e.r6Ouvert !== true", 'le modèle lit l’horloge'],
  ['CE-2', SUIVI, "p.canal === 'tiktok' && p.statut === 'publiable'", "p.statut === 'publiable'", 'la file TikTok reçoit aussi les posts des autres canaux'],
  ['CE-2', SUIVI, "enAttente: posts.filter((p) => p.ligne_id === l.id && p.statut === 'en_attente').length", "enAttente: posts.filter((p) => p.ligne_id === l.id).length", 'le compteur « en attente » d’une ligne compte tous ses posts'],
  ['CE-3', SUIVI, "const r6Ferme = e.r6Ouvert !== true", "const r6Ferme = e.r6Ouvert === false", 'R6 inconnu est traité comme ouvert'],
  ['CE-4', SUIVI, "preuveManquante: !p.preuve_publique", "preuveManquante: false", 'une publication sans preuve publique ne le dit plus'],
  ['CE-5', SUIVI, "['miniature', p.miniature_texte], ", "", 'la miniature n’est plus montrée avec ce que le public verra'],
  ['CE-5', ECRAN, "<li key={i} style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{d}</li>", "<li key={i} style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }} dangerouslySetInnerHTML={{ __html: d }} />", 'le texte servi est injecté comme du HTML'],
  ['CE-6', SUIVI, "if (m.etat !== 'mesure' || typeof m.valeur !== 'number'", "if (typeof m.valeur !== 'number'", 'une mesure « non mesuré » qui porte la valeur 0 s’affiche 0'],
  ['CE-6', SUIVI, "texte: echue ? 'non mesuré' : 'en attente'", "texte: '0'", 'une mesure absente s’écrit 0'],
  ['CE-6', SUIVI, "return { metrique: metriqueDite, texte: m.etat === 'en_attente' ? 'en attente' : 'non mesuré', source: m.source, le: m.mesure_le,", "return { metrique: metriqueDite, texte: m.etat === 'en_attente' ? 'en attente' : 'non mesuré', source: null, le: null,", 'la source et la date d’une mesure non servie disparaissent'],
  ['CE-7', SUIVI, "libelle: libelleAttribution(a)", "libelle: `${a.total} ventes rattachées à ${a.ligne}`", 'la vente par ligne ne dit plus estimation ni sa fenêtre'],
  ['CE-7', SUIVI, "texte: estimation ? `${nombre} (estimation)` : nombre", "texte: nombre", 'la vente estimée s’écrit comme une mesure'],
  ['CE-7', ECRAN, "{c.estimation && c.fenetreH ? ` · fenêtre ${c.fenetreH} h` : ''}", "", 'la fenêtre d’attribution n’est plus écrite à l’écran'],
  ['CE-8', SUIVI, ": a.probabilite < SEUIL_BLOCAGE ? ", ": a.probabilite <= SEUIL_BLOCAGE ? ", 'une probabilité de 0,5 bloque (le seuil devient ≤)'],
  ['CE-8', SUIVI, "export const SEUIL_BLOCAGE = 0.5", "export const SEUIL_BLOCAGE = 0.4", 'le seuil de blocage descend à 0,4'],
  ['CE-8', SUIVI, ": a.verdict === 'indisponible' ?", ": false ?", 'Laya indisponible ne bloque plus'],
  ['CE-8', SUIVI, "const manque = !source ? ", "const manque = false ? ", 'une affirmation sans source ne bloque plus'],
  ['CE-8', SUIVI, ": typeof a.probabilite !== 'number' || !Number.isFinite(a.probabilite) ? ", ": false ? ", 'une probabilité absente devient une valeur flatteuse'],
  ['CE-8', SUIVI, "if (!p.chiffres_neutres && (", "if (false && (", 'un chiffre sans affirmation jugée ne bloque plus'],
  ['CE-9', SUIVI, "if (!e.jev || e.jev.disponible === false) {", "if (!e.jev) {", 'Laya en panne laisse les scores à l’écran'],
  ['CE-9', SUIVI, "niveau: r.scoreJev?.niveau ?? null", "niveau: r.scoreJev?.niveau ?? 3", 'un candidat sans score reçoit un 3 par défaut'],
  ['CE-10', SUIVI, "crieur.etat = 'non_servi'", "crieur.etat = 'vide'", 'une source absente du Crieur se dit « vide »'],
  ['CE-10', SUIVI, "if (!e.ventes) { recettes.etat = 'non_servi'", "if (!e.ventes) { recettes.etat = 'ok'", 'les ventes non servies ne le disent plus'],
  ['CE-11', ECRAN, "role={grave ? 'alert' : 'status'}", "role=\"status\"", 'un panneau non servi ou en panne n’est plus une alerte'],
  ['CE-11', ECRAN, '<p className="warn" role="alert">Le suivi du contenu n’est pas servi : rien n’est montré à sa place.</p>', '<p className="muted">Rien.</p>', 'sans modèle l’écran ne dit plus qu’il n’est pas servi'],
  ['CE-11', ECRAN, "{crieur.refuses.length > 0 ? (", "{false ? (", 'les accords refusés ne sont plus montrés'],
  ['CE-12', ECRAN, "<h3 style={{ fontSize: '1rem', margin: '.8rem 0 .3rem' }}>File TikTok</h3>", "<h3 style={{ fontSize: '1rem', margin: '.8rem 0 .3rem' }}>File TikTok <button>Publier</button></h3>", 'un bouton de publication apparaît dans la file TikTok'],
  ['CE-13', ECRAN, "role=\"region\" aria-label={`${p.ligne} ${p.canal} ${x.echeance}`} tabIndex={0}", "role=\"region\" aria-label={`${p.ligne} ${p.canal} ${x.echeance}`}", 'la région défilante des mesures n’est plus focalisable au clavier'],
  ['CE-13', ECRAN, "const ligneStyle = { minWidth: 0, padding: '.4rem 0', borderTop: '1px solid var(--border, rgba(127,127,127,.25))', overflowWrap: 'anywhere' } as const", "const ligneStyle = { minWidth: 0, padding: '.4rem 0', borderTop: '1px solid var(--border, rgba(127,127,127,.25))' } as const", 'les lignes longues ne se coupent plus (mobile)'],
  ['CE-14', SUIVI, "const vu = (p: PostBase): PostVu => ({ id: p.id,", "const vu = (p: PostBase): PostVu => ({ ...p, id: p.id,", 'les champs étrangers d’un post passent dans la sortie'],
]

function lancerSabotages() {
  const t0 = Date.now()
  const copie = path.join(TRAVAIL, 'copie')
  fs.rmSync(TRAVAIL, { recursive: true, force: true })
  for (const c of ['lib', 'app/controle/contenu', 'components/controle/contenu', 'package.json', 'tsconfig.json']) {
    const src = path.join(ROOT, c)
    if (!fs.existsSync(src)) { console.log(`${NOM} : ${c} absent du dépôt`); return 2 }
    fs.mkdirSync(path.dirname(path.join(copie, c)), { recursive: true })
    fs.cpSync(src, path.join(copie, c), { recursive: true })
  }
  const juge = (racine) => {
    const r = spawnSync(process.execPath, [CE, `--racine=${racine}`], { cwd: ROOT, encoding: 'utf8', timeout: 300_000, maxBuffer: 1 << 26, windowsHide: true })
    return { code: r.status, sortie: `${r.stdout ?? ''}${r.stderr ?? ''}` }
  }
  const lignes = []
  const temoin = juge(copie)
  const temoinVert = temoin.code === 0
  console.log(`témoin (copie intacte) : code ${temoin.code}${temoinVert ? '' : ' — ROUGE'}`)
  lignes.push(`| témoin | copie intacte | 0 | ${temoin.code} | ${temoinVert ? 'vert' : 'ROUGE'} |`)
  let pris = 0
  const hashes = new Map()
  for (const [critere, fichier, de, vers, nom] of SABOTAGES) {
    const f = path.join(copie, fichier)
    const orig = fs.readFileSync(f, 'utf8')
    const h0 = sha(orig)
    hashes.set(fichier, h0)
    if (orig.split(de).length !== 2) { console.log(`✗ ${critere} « ${nom} » : ancre absente ou non unique dans ${fichier}`); lignes.push(`| ${critere} | ${nom} | ≠ 0 | ANCRE | non jouée |`); continue }
    fs.writeFileSync(f, orig.replace(de, () => vers))
    const r = juge(copie)
    fs.writeFileSync(f, orig)
    const restaure = sha(fs.readFileSync(f)) === h0
    const ligneEchec = r.sortie.split(/\r?\n/).find((l) => l.startsWith(`FAIL ${critere} `)) ?? ''
    const ok = r.code === 1 && !!ligneEchec && restaure
    if (ok) pris++
    console.log(`${ok ? '✅ prise' : '❌ NON PRISE'} ${critere} — ${nom} : code ${r.code}${restaure ? '' : ' — COPIE NON RESTAURÉE'}`)
    lignes.push(`| ${critere} | ${nom} | ≠ 0 et FAIL ${critere} | ${r.code} : ${court(ligneEchec.replace(/\|/g, '/'), 110) || 'aucune ligne FAIL de ce critère'} | ${ok ? 'prise' : 'NON PRISE'}${restaure ? ' ; sha256 restauré' : ' ; SHA256 DIFFÉRENT'} |`)
  }
  fs.rmSync(TRAVAIL, { recursive: true, force: true })
  const toutPris = pris === SABOTAGES.length && temoinVert
  const entete = `# 026-216 — sabotages de contenu-ecran-qa\n\nÉcrit par \`node scripts/contenu-ecran-qa.mjs --sabotages\` le ${new Date().toISOString()}. Une copie de app/controle/contenu, components/controle/contenu et lib/ ; une faute réelle à la fois (remplacement de texte exact) ; le juge relancé sur la copie avec \`--racine\` ; la copie remise à l'identique après chaque passage (sha256 comparé). Aucun fichier du dépôt n'est touché.\n\n**Bilan : ${toutPris ? 'PASS' : 'FAIL'}** — témoin ${temoinVert ? 'vert' : 'ROUGE'} ; ${pris}/${SABOTAGES.length} fautes prises par le critère attendu ; ${Math.round((Date.now() - t0) / 1000)} s.\n\n| critère | faute | attendu | observé | verdict |\n|---|---|---|---|---|\n`
  fs.mkdirSync(PREUVES, { recursive: true })
  fs.writeFileSync(path.join(PREUVES, 'sabotages.md'), entete + lignes.join('\n') + '\n')
  console.log(`${NOM} --sabotages : ${toutPris ? 'PASS' : 'FAIL'} — ${pris}/${SABOTAGES.length} fautes prises, témoin ${temoinVert ? 'vert' : 'ROUGE'}`)
  return toutPris ? 0 : 1
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Le juge
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
async function juger() {
  const RAC = path.resolve(typeof option('racine') === 'string' ? option('racine') : ROOT)
  const lire = (rel) => { try { return fs.readFileSync(path.join(RAC, ...rel.split('/')), 'utf8') } catch { return null } }
  const srcSuivi = lire(SUIVI), srcEcran = lire(ECRAN)
  if (srcSuivi === null || srcEcran === null) { console.log(`${NOM} : appel refusé — ${srcSuivi === null ? SUIVI : ECRAN} absent de ${RAC}`); process.exitCode = 2; return }

  const resultats = new Map()
  const critere = (id, f) => {
    const fautes = []
    const ok = (cond, msg) => { if (!cond) fautes.push(msg) }
    try { f(ok, fautes) } catch (e) { fautes.push(`exception : ${court(e?.stack?.split('\n').slice(0, 2).join(' ') ?? e, 220)}`) }
    resultats.set(id, fautes)
  }

  // ── le chargement : ts-loader (alias @/), le TSX transpilé par typescript, react-dom/server du dépôt ────────────────────
  await import(pathToFileURL(path.join(ROOT, 'scripts', 'ts-loader.mjs')).href)
  let suivi, Ecran, rendre
  try {
    suivi = await import(pathToFileURL(path.join(RAC, ...SUIVI.split('/'))).href)
    const requireRacine = createRequire(path.join(ROOT, 'package.json'))
    const ts = requireRacine('typescript'), React = requireRacine('react'), { renderToStaticMarkup } = requireRacine('react-dom/server')
    const js = ts.transpileModule(srcEcran, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
    fs.mkdirSync(TRAVAIL, { recursive: true })
    const tmp = path.join(TRAVAIL, `ecran-${process.pid}.mjs`)
    fs.writeFileSync(tmp, js)
    try { Ecran = (await import(pathToFileURL(tmp).href)).default } finally { fs.rmSync(tmp, { force: true }) }
    rendre = (s) => renderToStaticMarkup(React.createElement(Ecran, { suivi: s }))
  } catch (e) {
    console.log(`${NOM} : préalable manquant — ${court(e?.stack?.split('\n').slice(0, 3).join(' ') ?? e, 300)}`)
    process.exitCode = 2
    return
  }
  const { construireSuivi, blocagesDe, SEUIL_BLOCAGE } = suivi

  // ── les jeux d'essai (fictifs, figés) ───────────────────────────────────────────────────────────────────────────────────
  const H = 3_600_000
  const T0 = Date.parse('2026-11-03T09:00:00Z')
  const MAINT = T0 + 30 * H // H+1 et H+24 échues, J+7 en attente
  const post = (o) => ({ rendu_type: 'texte', affirmations: [], cree_le: '2026-11-03T07:00:00Z', chiffres_neutres: true, ...o })
  const lignes = [
    { id: 'L1', libelle: 'Vidéo verticale', canaux: ['tiktok', 'instagram'], approuvee_le: '2026-11-02T08:00:00Z' },
    { id: 'L2', libelle: 'Image et texte', canaux: ['instagram', 'facebook'], approuvee_le: null },
    { id: 'L3', libelle: 'Coulisses', canaux: ['tiktok'], approuvee_le: '2026-11-02T08:00:00Z', suspendue: true },
    { id: 'L4', libelle: 'Avant et après', canaux: ['facebook', 'instagram'], approuvee_le: '2026-11-02T08:00:00Z' },
    { id: 'L5', libelle: 'Texte visuel', canaux: ['instagram'], approuvee_le: '2026-11-02T08:00:00Z' },
  ]
  const HOSTILE = '<b onmouseover=x>gras</b>'
  const posts = [
    post({ id: 'pub-ok', ligne_id: 'L1', canal: 'tiktok', statut: 'publie', texte: 'Un devis en deux minutes', rendu_type: 'video', preuve_publique: 'https://example.invalid/v/ok-1', publie_le: new Date(T0).toISOString() }),
    post({ id: 'pub-sans-preuve', ligne_id: 'L1', canal: 'tiktok', statut: 'publie', texte: 'Sans preuve', rendu_type: 'video', preuve_publique: '', publie_le: new Date(T0 + H).toISOString() }),
    post({ id: 'att-video', ligne_id: 'L1', canal: 'tiktok', statut: 'en_attente', texte: HOSTILE, legende: 'Légende <i>vue</i>', sous_titres: 'Sous-titre incrusté', miniature_texte: 'Texte de miniature', description: 'Description du film', rendu_type: 'video', cree_le: '2026-11-03T08:00:00Z' }),
    post({ id: 'att-image', ligne_id: 'L2', canal: 'instagram', statut: 'en_attente', texte: 'Image en attente', rendu_type: 'image', cree_le: '2026-11-03T08:30:00Z' }),
    post({ id: 'file-tt', ligne_id: 'L1', canal: 'tiktok', statut: 'publiable', texte: 'Prêt pour la file', rendu_type: 'video' }),
    post({ id: 'file-ig', ligne_id: 'L2', canal: 'instagram', statut: 'publiable', texte: 'Meta prête, Instagram' }),
    post({ id: 'file-fb', ligne_id: 'L2', canal: 'facebook', statut: 'publiable', texte: 'Meta prête, Facebook' }),
    post({ id: 'refus-motif', ligne_id: 'L4', canal: 'facebook', statut: 'refuse', texte: 'Refusée', motif_refus: 'Benj : ton trop vendeur' }),
    post({ id: 'refus-nu', ligne_id: 'L4', canal: 'instagram', statut: 'refuse', texte: 'Refusée sans motif' }),
  ]
  const mes = (o) => ({ post_id: 'pub-ok', source: 'releve_main', certitude: 'mesure', fenetre_attribution_h: null, mesure_le: '2026-11-03T11:00:00Z', ...o })
  const mesures = [
    mes({ echeance: 'H+1', metrique: 'vues', etat: 'mesure', valeur: 120 }),
    mes({ echeance: 'H+1', metrique: 'j_aime', etat: 'mesure', valeur: 0 }),
    mes({ echeance: 'H+24', metrique: 'vues', etat: 'non_mesure', valeur: 0, source: 'api_officielle' }),
    mes({ echeance: 'H+24', metrique: 'partages', etat: 'en_attente', valeur: null }),
    mes({ echeance: 'H+24', metrique: 'commentaires', etat: 'mesure', valeur: Number.NaN }),
    mes({ echeance: 'H+24', metrique: 'enregistrements', etat: 'mesure', valeur: Number.POSITIVE_INFINITY }),
    mes({ echeance: 'H+24', metrique: 'ventes', etat: 'mesure', valeur: 2, source: 'base_presti', certitude: 'estimation', fenetre_attribution_h: 48, mesure_le: '2026-11-04T09:05:00Z' }),
  ]
  const ventes = [
    { ligne: 'L1', total: 3, ambigus: 1, certitude: 'estimation', fenetre_attribution_h: 48 },
    { ligne: 'L2', total: 1, ambigus: 0, certitude: 'estimation', fenetre_attribution_h: 72 },
  ]
  const reco = [
    { id: 'c-haut', statut: 'refaire', motif: 'vues élevées à H+24', signal: 'fort', scoreJev: { niveau: 4, distribution: {}, provenance: 'jev score --provider laya' } },
    { id: 'c-sans-score', statut: 'tendance', motif: 'fenêtre courte', signal: 'neutre', scoreJev: null },
  ]
  const aff = (o) => ({ texte: 'Affirmation à juger', source_ref: 'base:presti', verdict: 'pass', probabilite: 0.8, le: '2026-11-03', ...o })
  const brouillon = (id, o = {}) => post({ id, ligne_id: 'L5', canal: 'instagram', statut: 'brouillon', texte: 'Texte sans chiffre', ...o })
  const postsBlocages = [
    brouillon('bl-refus', { affirmations: [aff({ texte: 'Gagnez 40 % de temps', source_ref: 'etude:interne', verdict: 'refus', probabilite: 0.31 })] }),
    brouillon('bl-049', { affirmations: [aff({ texte: 'Affirmation 0,4999', probabilite: 0.4999 })] }),
    brouillon('bl-sans-source-vide', { affirmations: [aff({ texte: 'Trois artisans sur quatre', source_ref: '' })] }),
    brouillon('bl-sans-source-null', { affirmations: [aff({ texte: 'Douze clients', source_ref: null })] }),
    brouillon('bl-sans-source-blanche', { affirmations: [aff({ texte: 'Quinze devis', source_ref: '   ' })] }),
    brouillon('bl-indispo-nul', { affirmations: [aff({ texte: 'Vingt devis', verdict: 'indisponible', probabilite: null })] }),
    brouillon('bl-indispo-haut', { affirmations: [aff({ texte: 'Trente devis', verdict: 'indisponible', probabilite: 0.9 })] }),
    brouillon('bl-proba-absente', { affirmations: [aff({ texte: 'Quarante devis', probabilite: null })] }),
    brouillon('bl-proba-nan', { affirmations: [aff({ texte: 'Cinquante devis', probabilite: Number.NaN })] }),
    brouillon('bl-chiffre-nu', { texte: 'Économisez 300 € par mois', chiffres_neutres: false }),
    brouillon('bl-cache-miniature', { texte: 'Bonjour', chiffres_neutres: false, miniature_texte: 'Gagnez 3 heures par semaine' }),
    brouillon('bl-cache-sous-titres', { texte: 'Bonjour', chiffres_neutres: false, sous_titres: '5 devis par jour' }),
    brouillon('bl-cache-legende', { texte: 'Bonjour', chiffres_neutres: false, legende: 'Jusqu’à 70 % de gain' }),
    brouillon('bl-cache-description', { texte: 'Bonjour', chiffres_neutres: false, description: '100 artisans nous font confiance' }),
  ]
  const postsSains = [
    brouillon('ok-050', { affirmations: [aff({ texte: 'Affirmation 0,5', probabilite: 0.5 })] }),
    brouillon('ok-051', { affirmations: [aff({ texte: 'Affirmation 0,51', probabilite: 0.51 })] }),
    brouillon('ok-un', { affirmations: [aff({ texte: 'Affirmation 1', probabilite: 1 })] }),
    brouillon('ok-neutre', { texte: 'Ligne L4, étape 2', chiffres_neutres: true }),
    brouillon('ok-juge', { texte: 'Dix devis envoyés', chiffres_neutres: false, affirmations: [aff({ texte: 'Dix devis envoyés' })] }),
  ]
  const entree = (o = {}) => ({ maintenantMs: MAINT, lignes, posts, mesures, ventes, recommandations: reco, jev: { disponible: true }, r6Ouvert: false, ...o })
  const toutVide = { maintenantMs: MAINT, lignes: [], posts: [], mesures: [], ventes: [], recommandations: [], jev: { disponible: true }, r6Ouvert: false }
  const toutNul = { maintenantMs: MAINT, lignes: null, posts: null, mesures: null, ventes: null, recommandations: null, jev: null, r6Ouvert: null }
  const ids = (l) => (l ?? []).map((x) => x.id)
  const memes = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort())
  const gele = (o) => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o)) gele(v) } return o }
  const clone = (o) => structuredClone(o)

  const S = construireSuivi(entree())

  // ── CE-1 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  critere('CE-1', (ok) => {
    ok(typeof construireSuivi === 'function' && typeof blocagesDe === 'function', 'construireSuivi et blocagesDe doivent être des fonctions exportées')
    ok(SEUIL_BLOCAGE === 0.5, `SEUIL_BLOCAGE = ${SEUIL_BLOCAGE}, 0,5 attendu (la fiche : jev noul < 0,5 bloque)`)
    ok(typeof Ecran === 'function', 'SuiviContenu.tsx doit exporter par défaut un composant')
    const nu = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
    for (const [rel, src] of [[SUIVI, srcSuivi], [ECRAN, srcEcran]]) {
      const code = nu(src)
      for (const [motif, nom] of [[/\bfetch\s*\(/, 'fetch('], [/XMLHttpRequest|WebSocket|EventSource/, 'un client réseau'], [/Date\.now\s*\(/, 'Date.now('], [/new Date\s*\(\s*\)/, 'new Date()'], [/Math\.random/, 'Math.random'], [/process\.env/, 'process.env'], [/@supabase|node:(fs|child_process|net|http)/, 'une base ou un module système'], [/localStorage|sessionStorage|document\./, 'le navigateur']]) {
        ok(!motif.test(code), `${rel} contient ${nom} : le modèle et l'affichage sont purs`)
      }
    }
    ok(!/dangerouslySetInnerHTML|innerHTML|\beval\s*\(/.test(nu(srcEcran)), `${ECRAN} injecte du HTML (dangerouslySetInnerHTML / innerHTML / eval) : tout texte servi s'écrit tel quel`)
    const e = gele(clone(entree()))
    const avant = JSON.stringify(entree())
    let a, b
    try { a = JSON.stringify(construireSuivi(e)); b = JSON.stringify(construireSuivi(e)) } catch (x) { ok(false, `entrée gelée : ${court(x.message)} (le modèle modifie son entrée)`) }
    ok(a !== undefined && a === b, 'deux appels sur la même entrée donnent deux sorties différentes')
    ok(JSON.stringify(e) === avant || avant.length > 0 && JSON.stringify(clone(e)) === avant, 'l\'entrée a changé pendant l\'appel')
  })

  // ── CE-2 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  critere('CE-2', (ok) => {
    const c = S.crieur
    ok(c.etat === 'ok', `Crieur : état ${c.etat} sur des données complètes, « ok » attendu`)
    ok(c.lignes.length === 5 && memes(ids(c.lignes), ['L1', 'L2', 'L3', 'L4', 'L5']), `lignes : ${ids(c.lignes).join(',')} ; L1 à L5 attendues`)
    const l = (id) => c.lignes.find((x) => x.id === id) ?? {}
    ok(l('L1').publies === 2 && l('L1').enAttente === 1, `L1 : ${l('L1').publies} publiée(s) et ${l('L1').enAttente} en attente ; 2 et 1 attendues (seuls les statuts publie et en_attente comptent)`)
    ok(l('L2').enAttente === 1 && l('L2').publies === 0, `L2 : ${l('L2').enAttente} en attente et ${l('L2').publies} publiée(s) ; 1 et 0 attendues (les prêtes ne sont pas « en attente »)`)
    ok(l('L3').suspendue === true && l('L1').suspendue === false, 'L3 doit être dite suspendue, L1 non')
    ok(l('L1').approuvee === true && l('L2').approuvee === false, 'L1 approuvée et L2 non approuvée (approuvee_le null)')
    ok(memes(ids(c.enAttente), ['att-video', 'att-image']), `en attente : ${ids(c.enAttente)} ; att-video et att-image seulement`)
    ok(memes(ids(c.fileTiktok), ['file-tt']), `file TikTok : ${ids(c.fileTiktok)} ; file-tt seulement (ni les posts Instagram/Facebook prêts, ni les publiés)`)
    ok(memes(ids(c.refuses), ['refus-motif', 'refus-nu']), `refusés : ${ids(c.refuses)}`)
    ok(c.refuses.find((r) => r.id === 'refus-motif')?.motif === 'Benj : ton trop vendeur', 'le motif servi du refus doit être affiché tel quel')
    ok(typeof c.refuses.find((r) => r.id === 'refus-nu')?.motif === 'string' && c.refuses.find((r) => r.id === 'refus-nu').motif.trim() !== '', 'un refus sans motif servi doit le dire en mots, jamais une chaîne vide')
    ok(memes(ids(c.publications), ['pub-ok', 'pub-sans-preuve']), `publications : ${ids(c.publications)} ; les seuls posts « publie »`)
    const listes = { enAttente: ids(c.enAttente), fileTiktok: ids(c.fileTiktok), attenteR6: ids(c.attenteR6), publications: ids(c.publications), refuses: ids(c.refuses) }
    const vus = Object.values(listes).flat()
    ok(new Set(vus).size === vus.length, `un post figure dans deux listes à la fois : ${JSON.stringify(listes)}`)
    ok(memes(ids(S.studio.enAttente), ['att-video']), `Studio : ${ids(S.studio.enAttente)} ; la seule vidéo en attente (att-video, pas l'image)`)
  })

  // ── CE-3 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  critere('CE-3', (ok) => {
    for (const [r6, nom] of [[false, 'fermé'], [null, 'inconnu']]) {
      const s = construireSuivi(entree({ r6Ouvert: r6 }))
      ok(memes(ids(s.crieur.attenteR6), ['file-ig', 'file-fb']), `R6 ${nom} : en attente R6 = ${ids(s.crieur.attenteR6)} ; les deux posts Meta prêts attendus (inconnu = fermé)`)
      ok(!ids(s.crieur.publications).some((i) => i.startsWith('file-')), `R6 ${nom} : un post Meta prêt est devenu « publié »`)
      ok(!ids(s.crieur.attenteR6).includes('file-tt'), `R6 ${nom} : le post TikTok n'a pas à attendre R6`)
    }
    const ouvert = construireSuivi(entree({ r6Ouvert: true }))
    ok(ouvert.crieur.attenteR6.length === 0, `R6 ouvert : ${ouvert.crieur.attenteR6.length} post(s) encore en attente R6`)
    const seulMeta = [post({ id: 'm1', ligne_id: 'L2', canal: 'instagram', statut: 'publiable', texte: 'Prête' })]
    const ferme = construireSuivi({ ...entree({ posts: seulMeta }), r6Ouvert: false })
    ok(ferme.crieur.etat === 'attente_r6' && !!ferme.crieur.message, `seuls des posts Meta prêts, R6 fermé : état ${ferme.crieur.etat}, « attente_r6 » et un message attendus`)
    const ouv = construireSuivi({ ...entree({ posts: seulMeta }), r6Ouvert: true })
    ok(ouv.crieur.etat !== 'attente_r6', 'R6 ouvert : l\'état ne doit plus être attente_r6')
  })

  // ── CE-4 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  critere('CE-4', (ok) => {
    const p = (id) => S.crieur.publications.find((x) => x.id === id) ?? {}
    ok(p('pub-ok').preuveManquante === false && p('pub-ok').preuve === 'https://example.invalid/v/ok-1', 'une publication avec preuve : preuve rendue, preuveManquante faux')
    ok(p('pub-sans-preuve').preuveManquante === true && !p('pub-sans-preuve').preuve, 'une publication à preuve vide : preuveManquante vrai, aucune preuve inventée')
    const sansDate = construireSuivi(entree({ posts: [post({ id: 'sd', ligne_id: 'L1', canal: 'tiktok', statut: 'publie', texte: 'x', preuve_publique: null, publie_le: null })] }))
    ok(sansDate.crieur.publications[0]?.preuveManquante === true, 'une preuve null doit être dite manquante')
    const h = rendre(S)
    const bloc = (id) => (new RegExp(`<li[^>]*data-publication="${id}"[^>]*>([\\s\\S]*?)</li>`).exec(h) ?? [])[1] ?? ''
    ok(bloc('pub-ok').includes('https://example.invalid/v/ok-1'), 'l\'écran ne montre pas la preuve publique de pub-ok')
    ok(/manquante/i.test(bloc('pub-sans-preuve')) && !bloc('pub-sans-preuve').includes('example.invalid'), 'l\'écran ne dit pas « preuve manquante » pour pub-sans-preuve')
  })

  // ── CE-5 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  critere('CE-5', (ok) => {
    const v = S.crieur.enAttente.find((x) => x.id === 'att-video')
    ok(!!v && v.texteExact === HOSTILE, `texteExact = ${JSON.stringify(v?.texteExact)} ; le texte exact, sans retouche, attendu`)
    const dit = (v?.dit ?? []).join('\n')
    for (const t of [HOSTILE, 'Légende <i>vue</i>', 'Sous-titre incrusté', 'Texte de miniature', 'Description du film']) ok(dit.includes(t), `« ${t} » n'est pas montré avec ce que le public verra (texte, légende, sous-titres, miniature, description)`)
    const h = rendre(S)
    ok(h.includes('&lt;b onmouseover=x&gt;gras&lt;/b&gt;') && !h.includes('<b onmouseover'), 'le texte hostile doit être écrit échappé, jamais interprété')
    ok(!h.includes('<i>vue</i>'), 'la légende hostile doit être échappée')
    for (const t of ['Sous-titre incrusté', 'Texte de miniature', 'Description du film']) ok(h.includes(t), `l'écran ne montre pas « ${t} »`)
    const b = blocagesDe(postsBlocages)
    for (const [id, exact] of [['bl-cache-miniature', 'Gagnez 3 heures par semaine'], ['bl-cache-sous-titres', '5 devis par jour'], ['bl-cache-legende', 'Jusqu’à 70 % de gain'], ['bl-cache-description', '100 artisans nous font confiance']]) {
      const c = b.find((x) => x.postId === id)
      ok(!!c && c.texteExact === exact, `une promesse chiffrée cachée dans ${id.replace('bl-cache-', '')} doit faire une carte de blocage avec son texte exact (${c ? JSON.stringify(c.texteExact) : 'aucune carte'})`)
    }
  })

  // ── CE-6 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  critere('CE-6', (ok) => {
    const a = S.audience
    ok(a.etat === 'ok' && memes(a.publications.map((p) => p.postId), ['pub-ok', 'pub-sans-preuve']), `Audience : ${a.publications.map((p) => p.postId)} ; une ligne par publication publiée`)
    const p = a.publications.find((x) => x.postId === 'pub-ok')
    ok(JSON.stringify(p?.echeances?.map((x) => x.echeance)) === JSON.stringify(['H+1', 'H+24', 'J+7']), 'les échéances doivent être H+1, H+24, J+7 dans cet ordre')
    const ech = (e) => p?.echeances?.find((x) => x.echeance === e)
    ok(ech('H+1')?.statut === 'echue' && ech('H+24')?.statut === 'echue' && ech('J+7')?.statut === 'en_attente', `statuts ${p?.echeances?.map((x) => `${x.echeance}:${x.statut}`)} ; échue, échue, en attente à 30 h de la publication`)
    const cel = (e, m) => ech(e)?.cellules?.find((c) => c.metrique === m)
    ok(cel('H+1', 'vues')?.texte === '120' && cel('H+1', 'vues')?.disponible === true, `vues H+1 : ${JSON.stringify(cel('H+1', 'vues')?.texte)} ; « 120 » attendu`)
    ok(cel('H+1', 'j’aime')?.texte === '0' && cel('H+1', 'j’aime')?.disponible === true, 'un zéro MESURÉ doit rester « 0 » (jamais caché)')
    ok(cel('H+24', 'vues')?.texte === 'non mesuré' && cel('H+24', 'vues')?.disponible === false, `vues H+24 (etat non_mesure, valeur 0) : ${JSON.stringify(cel('H+24', 'vues')?.texte)} ; « non mesuré » attendu, jamais 0`)
    ok(cel('H+24', 'partages')?.texte === 'en attente' && cel('H+24', 'partages')?.disponible === false, `partages H+24 (en_attente) : ${JSON.stringify(cel('H+24', 'partages')?.texte)} ; « en attente » attendu`)
    ok(cel('H+24', 'commentaires')?.disponible === false && /^non mesuré$/.test(cel('H+24', 'commentaires')?.texte ?? ''), `valeur NaN : ${JSON.stringify(cel('H+24', 'commentaires')?.texte)} ; « non mesuré » attendu`)
    ok(cel('H+24', 'enregistrements')?.disponible === false && /^non mesuré$/.test(cel('H+24', 'enregistrements')?.texte ?? ''), `valeur infinie : ${JSON.stringify(cel('H+24', 'enregistrements')?.texte)} ; « non mesuré » attendu`)
    ok(cel('H+24', 'lectures complètes')?.texte === 'non mesuré', `mesure absente d'une échéance échue : ${JSON.stringify(cel('H+24', 'lectures complètes')?.texte)} ; « non mesuré » attendu`)
    ok(Array.isArray(ech('J+7')?.cellules) && ech('J+7').cellules.length === 0, 'J+7 pas échue : aucune cellule (rien à montrer, aucun zéro)')
    for (const x of p?.echeances ?? []) for (const c of x.cellules) {
      if (!c.disponible) ok(c.texte === 'non mesuré' || c.texte === 'en attente', `${x.echeance} ${c.metrique} : « ${c.texte} » (« non mesuré » ou « en attente » seulement)`)
      if (c.disponible) ok(!!c.source && !!c.le, `${x.echeance} ${c.metrique} : une valeur servie doit porter sa source et sa date`)
    }
    ok(ech('H+24')?.cellules?.find((c) => c.metrique === 'vues')?.source === 'api_officielle' && !!cel('H+24', 'vues')?.le, 'une mesure non servie garde sa source et sa date de relevé')
    const sansDate = construireSuivi(entree({ mesures: [], posts: [post({ id: 'sd', ligne_id: 'L1', canal: 'tiktok', statut: 'publie', texte: 'x', publie_le: null, preuve_publique: 'https://example.invalid/sd' })] }))
    ok(sansDate.audience.publications[0]?.echeances.every((x) => x.statut === 'en_attente' && x.cellules.length === 0), 'une date de publication illisible : aucune échéance échue, aucune cellule')
    const horloge = construireSuivi(entree({ mesures: [], maintenantMs: Number.NaN }))
    ok(horloge.audience.publications.every((q) => q.echeances.every((x) => x.statut === 'en_attente' && x.cellules.length === 0)), 'une horloge illisible : aucune échéance échue')
  })

  // ── CE-7 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  critere('CE-7', (ok) => {
    const r = S.recettes
    ok(r.etat === 'ok' && r.lignes.length === 2, `Recettes : état ${r.etat}, ${r.lignes.length} ligne(s) ; ok et 2 attendus`)
    for (const [ligne, h] of [['L1', 48], ['L2', 72]]) {
      const x = r.lignes.find((y) => y.ligne === ligne)
      ok(!!x && /estimation/i.test(x.libelle) && new RegExp(`\\b${h} h\\b`).test(x.libelle), `${ligne} : « ${x?.libelle} » ; « estimation » et « ${h} h » attendus`)
      ok(x?.certitude === 'estimation' && x?.fenetreH === h, `${ligne} : certitude ${x?.certitude}, fenêtre ${x?.fenetreH} ; estimation et ${h} attendues`)
    }
    const v = S.audience.publications.find((p) => p.postId === 'pub-ok')?.echeances.find((e) => e.echeance === 'H+24')?.cellules.find((c) => c.metrique === 'ventes')
    ok(v?.estimation === true && v?.fenetreH === 48 && /estimation/i.test(v?.texte ?? ''), `la vente de l'Audience : ${JSON.stringify(v && { texte: v.texte, estimation: v.estimation, fenetreH: v.fenetreH })} ; estimation, 48 h, « estimation » dans le texte`)
    const h = rendre(S)
    const vente = (id) => (new RegExp(`<li[^>]*data-vente-ligne="${id}"[^>]*>([\\s\\S]*?)</li>`).exec(h) ?? [])[1] ?? ''
    ok(/estimation/i.test(vente('L1')) && /48 h/.test(vente('L1')), `l'écran de Recettes (L1) ne dit pas estimation et 48 h : « ${court(vente('L1'), 100)} »`)
    const m = /data-mesure="ventes"[^>]*>([\s\S]*?)<\/tr>/.exec(h)
    ok(!!m && /estimation/i.test(m[1]) && /fenêtre 48 h/.test(m[1]), `la ligne « ventes » de l'Audience ne dit pas estimation et fenêtre 48 h à l'écran : « ${court(m?.[1] ?? 'ligne absente', 120)} »`)
  })

  // ── CE-8 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  critere('CE-8', (ok) => {
    const b = blocagesDe([...postsBlocages, ...postsSains])
    const carte = (id) => b.filter((x) => x.postId === id)
    const exact = { 'bl-refus': 'Gagnez 40 % de temps', 'bl-049': 'Affirmation 0,4999', 'bl-sans-source-vide': 'Trois artisans sur quatre', 'bl-sans-source-null': 'Douze clients', 'bl-sans-source-blanche': 'Quinze devis', 'bl-indispo-nul': 'Vingt devis', 'bl-indispo-haut': 'Trente devis', 'bl-proba-absente': 'Quarante devis', 'bl-proba-nan': 'Cinquante devis', 'bl-chiffre-nu': 'Économisez 300 € par mois' }
    for (const [id, texte] of Object.entries(exact)) {
      const c = carte(id)
      ok(c.length === 1, `${id} : ${c.length} carte(s) de blocage, 1 attendue`)
      ok(c[0]?.texteExact === texte, `${id} : texte exact ${JSON.stringify(c[0]?.texteExact)} ; ${JSON.stringify(texte)} attendu`)
      ok(typeof c[0]?.manque === 'string' && c[0].manque.trim().length >= 8, `${id} : la carte doit dire ce qui manque`)
    }
    for (const id of ['bl-sans-source-vide', 'bl-sans-source-null', 'bl-sans-source-blanche', 'bl-chiffre-nu']) ok(/preuve/i.test(carte(id)[0]?.manque ?? ''), `${id} : « preuve » attendu dans ce qui manque (« ${court(carte(id)[0]?.manque, 80)} »)`)
    for (const id of ['bl-indispo-nul', 'bl-indispo-haut']) ok(/laya|indisponible/i.test(carte(id)[0]?.manque ?? ''), `${id} : Laya indisponible doit être dit (« ${court(carte(id)[0]?.manque, 80)} »)`)
    ok(carte('bl-refus')[0]?.probabilite === 0.31 && carte('bl-refus')[0]?.source === 'etude:interne', 'la carte garde la probabilité et la source de l\'affirmation refusée')
    for (const id of ['ok-050', 'ok-051', 'ok-un', 'ok-neutre', 'ok-juge']) ok(carte(id).length === 0, `${id} : bloqué à tort (p ≥ 0,5, source, chiffres neutres ou affirmation jugée)`)
    const cles = new Set(['postId', 'ligne', 'canal', 'texteExact', 'source', 'probabilite', 'verdict', 'manque'])
    for (const c of b) ok(Object.keys(c).every((k) => cles.has(k)), `carte ${c.postId} : clés ${Object.keys(c).filter((k) => !cles.has(k))} hors liste`)
    const S2 = construireSuivi(entree({ posts: [...postsBlocages, ...postsSains] }))
    ok(S2.blocages.length === b.length, 'construireSuivi et blocagesDe ne donnent pas les mêmes cartes')
    ok(S2.crieur.publications.length === 0 && S2.crieur.fileTiktok.length === 0, 'un brouillon bloqué ne doit jamais apparaître comme prêt ou publié')
    const h = rendre(S2)
    const carteHtml = (id) => (new RegExp(`<li[^>]*data-blocage="${id}"[^>]*>([\\s\\S]*?)</li>`).exec(h) ?? [])[1] ?? ''
    ok(carteHtml('bl-refus').includes('Gagnez 40 % de temps') && /0,31|0\.31/.test(carteHtml('bl-refus')), 'la carte de blocage rendue montre le texte exact et la probabilité')
    ok(/preuve/i.test(carteHtml('bl-sans-source-vide')), 'la carte rendue d\'une affirmation sans source dit « preuve »')
  })

  // ── CE-9 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  critere('CE-9', (ok) => {
    const R = S.radar
    ok(R.etat === 'ok' && R.candidats.length === 2, `Radar : état ${R.etat}, ${R.candidats.length} candidat(s) ; ok et 2 attendus`)
    const haut = R.candidats.find((c) => c.id === 'c-haut'), sans = R.candidats.find((c) => c.id === 'c-sans-score')
    ok(haut?.niveau === 4 && haut?.provenance === 'jev score --provider laya', `c-haut : niveau ${haut?.niveau}, provenance ${JSON.stringify(haut?.provenance)} ; 4 et « jev score --provider laya »`)
    ok(sans?.niveau === null && sans?.provenance === null, `c-sans-score : niveau ${sans?.niveau} ; null attendu (aucun score par défaut)`)
    const cles = new Set(['id', 'statut', 'motif', 'niveau', 'provenance', 'signal'])
    for (const c of R.candidats) ok(Object.keys(c).every((k) => cles.has(k)), `candidat ${c.id} : un champ d'action ou étranger (${Object.keys(c).filter((k) => !cles.has(k))})`)
    for (const [jev, nom] of [[{ disponible: false, erreur: 'jev absent du poste' }, 'disponible faux'], [null, 'jev null'], [undefined, 'jev absent']]) {
      const p = construireSuivi(entree({ jev })).radar
      ok(p.etat === 'panne' && p.candidats.length === 0, `Laya en panne (${nom}) : état ${p.etat}, ${p.candidats.length} candidat(s) ; panne et aucun score attendus`)
      ok(typeof p.message === 'string' && p.message.length > 10, `Laya en panne (${nom}) : un message est attendu`)
      if (jev?.erreur) ok(p.message.includes(jev.erreur), 'la panne de Laya doit dire son motif tel quel')
    }
    ok(construireSuivi(entree({ recommandations: null })).radar.etat === 'non_servi', 'classement non servi : « non_servi » attendu (Laya répond)')
    ok(construireSuivi(entree({ recommandations: [] })).radar.etat === 'vide', 'aucun candidat : « vide » attendu')
    const avec = JSON.stringify(construireSuivi(entree({ recommandations: [{ ...reco[0], scoreJev: { niveau: 5, distribution: {}, provenance: 'jev score --provider laya' } }] })).crieur)
    const sansLaya = JSON.stringify(construireSuivi(entree({ jev: { disponible: false, erreur: 'x' }, recommandations: [] })).crieur)
    ok(avec === sansLaya && avec === JSON.stringify(S.crieur), 'le score (ou la panne) de Laya ne doit rien changer à l\'état des publications : il aide au choix, il n\'ouvre ni ne ferme rien')
    const hp = rendre(construireSuivi(entree({ jev: { disponible: false, erreur: 'jev absent du poste' } })))
    ok(!/score Laya\s*\d/i.test(hp) && hp.includes('jev absent du poste'), 'à l\'écran, la panne de Laya est dite avec son motif et aucun score n\'apparaît')
    const h = rendre(S)
    ok(/score Laya\s*4\/5/.test(h) && h.includes('jev score --provider laya'), 'à l\'écran, le score 4/5 est écrit avec sa provenance')
    ok(/score Laya indisponible/.test(h), 'à l\'écran, un candidat sans score dit « score Laya indisponible »')
  })

  // ── CE-10 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  critere('CE-10', (ok) => {
    const non = (s, k) => ok(s.etat === 'non_servi' && typeof s.message === 'string' && /servi/i.test(s.message), `${k} : état ${s.etat}, message ${JSON.stringify(s.message)} ; « non_servi » et un message qui le dit`)
    const sp = construireSuivi(entree({ posts: null }))
    non(sp.crieur, 'posts null → Crieur'); non(sp.audience, 'posts null → Audience'); non(sp.studio, 'posts null → Studio')
    ok(sp.blocages.length === 0, 'posts null : aucune carte de blocage inventée')
    non(construireSuivi(entree({ lignes: null })).crieur, 'lignes null → Crieur')
    non(construireSuivi(entree({ mesures: null })).audience, 'mesures null → Audience')
    non(construireSuivi(entree({ ventes: null })).recettes, 'ventes null → Recettes')
    non(construireSuivi(entree({ recommandations: null })).radar, 'recommandations null → Radar')
    const v = construireSuivi(toutVide)
    for (const k of ['crieur', 'audience', 'recettes', 'radar', 'studio']) {
      ok(v[k].etat === 'vide' && typeof v[k].message === 'string' && v[k].message.length > 10, `${k} : listes vides → état ${v[k].etat}, « vide » et un message attendus (jamais « ok », jamais un zéro)`)
    }
    ok(v.blocages.length === 0 && v.recettes.lignes.length === 0 && v.audience.publications.length === 0, 'listes vides : rien n\'est inventé')
    const n = construireSuivi(toutNul)
    for (const k of ['crieur', 'audience', 'recettes', 'studio']) ok(n[k].etat === 'non_servi', `tout non servi : ${k} est ${n[k].etat}, « non_servi » attendu`)
    ok(n.radar.etat === 'panne', `Laya et classement absents : Radar ${n.radar.etat}, « panne » attendu (Laya ne répond pas)`)
    ok(JSON.stringify(n).indexOf('"0"') < 0 && !/"(valeur|total|nombre)":0/.test(JSON.stringify(n)), 'tout non servi : aucun zéro ne doit apparaître dans le modèle')
  })

  // ── CE-11 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const decoder = (h) => h.replace(/<[^>]*>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
  const rendus = {
    plein: construireSuivi(entree({ posts: [...posts, ...postsBlocages.slice(0, 3)] })),
    vide: construireSuivi(toutVide),
    nonServi: construireSuivi(toutNul),
    panne: construireSuivi(entree({ jev: { disponible: false, erreur: 'jev absent du poste' } })),
    r6: construireSuivi({ ...entree({ posts: [post({ id: 'm1', ligne_id: 'L2', canal: 'instagram', statut: 'publiable', texte: 'Prête' })], mesures: [] }), r6Ouvert: false }),
  }
  const rendreSur = (s) => { try { return rendre(s) } catch (e) { return `__ERREUR_DE_RENDU__ ${court(e?.message, 120)}` } }
  const HTML = Object.fromEntries(Object.entries(rendus).map(([k, s]) => [k, rendreSur(s)]))
  const TEXTE = Object.fromEntries(Object.entries(HTML).map(([k, h]) => [k, decoder(h)]))
  const HTML_NULL = rendreSur(null), HTML_UNDEF = rendreSur(undefined)
  critere('CE-11', (ok) => {
    for (const [nom, hh] of Object.entries({ ...HTML, null: HTML_NULL, undefined: HTML_UNDEF })) ok(!hh.startsWith('__ERREUR_DE_RENDU__'), `écran « ${nom} » : le rendu lève une exception (${hh.slice(19, 140)})`)
    const h = HTML.plein
    for (const k of ['crieur', 'audience', 'recettes', 'radar', 'studio']) ok(h.includes(`data-suivi-panneau="${k}"`), `panneau ${k} absent de l'écran plein`)
    for (const [nom, s] of Object.entries(rendus)) {
      for (const k of ['crieur', 'audience', 'recettes', 'radar', 'studio']) {
        ok(HTML[nom].includes(`data-suivi-panneau="${k}"`) && new RegExp(`data-suivi-panneau="${k}"[^>]*data-etat="${s[k].etat}"|data-etat="${s[k].etat}"[^>]*data-suivi-panneau="${k}"`).test(HTML[nom]), `écran « ${nom} » : le panneau ${k} doit porter son état « ${s[k].etat} »`)
        if (s[k].message) ok(TEXTE[nom].includes(s[k].message), `écran « ${nom} » : le message du panneau ${k} n'est pas écrit (« ${court(s[k].message, 70)} »)`)
      }
    }
    ok((HTML.plein.match(/data-blocage="/g) ?? []).length === rendus.plein.blocages.length && rendus.plein.blocages.length >= 3, 'une carte de blocage rendue par blocage')
    ok(/data-refuse="refus-motif"[^>]*>[\s\S]*?Benj : ton trop vendeur/.test(h), 'l\'accord refusé est montré avec son motif')
    ok(/data-attente-r6/.test(HTML.r6) && !/data-attente-r6/.test(construireSuivi({ ...entree({ posts: [post({ id: 'm1', ligne_id: 'L2', canal: 'instagram', statut: 'publiable', texte: 'Prête' })], mesures: [] }), r6Ouvert: true }) && HTML.vide), 'l\'attente R6 se dit à l\'écran (et seulement quand R6 est fermé)')
    const graves = (HTML.nonServi.match(/role="alert"/g) ?? []).length
    ok(graves >= 4, `tout non servi : ${graves} alerte(s) (role="alert") ; au moins une par panneau non servi ou en panne`)
    ok(/role="alert"/.test(HTML.panne) && TEXTE.panne.includes('jev absent du poste'), 'panne de Laya : une alerte avec le motif')
    for (const k of ['vide', 'nonServi']) ok(!/(^|[^\d.,])0([^\d.,]|$)/.test(TEXTE[k]), `écran « ${k} » : un « 0 » décoratif est affiché (« ${(/.{20}(^|[^\d.,])0([^\d.,]|$).{20}/.exec(TEXTE[k]) ?? [''])[0]} »)`)
    for (const [nom, hh] of [['null', HTML_NULL], ['undefined', HTML_UNDEF]]) ok(/servi/i.test(decoder(hh)) && /role="alert"/.test(hh), `sans modèle (${nom}) : l'écran doit dire « n'est pas servi » dans une alerte`)
    const nonMesure = [...h.matchAll(/data-disponible="non"[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => decoder(m[1]))
    ok(nonMesure.length >= 3 && nonMesure.every((t) => /non mesuré|en attente/.test(t) && !/(^|\s)0(\s|$)/.test(t.split(/non mesuré|en attente/)[0])), `les cellules non servies doivent dire « non mesuré » ou « en attente », jamais un nombre (${nonMesure.length} vues)`)
  })

  // ── CE-12 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  critere('CE-12', (ok) => {
    const tout = { ...HTML, null: HTML_NULL, undef: HTML_UNDEF }
    for (const [nom, h] of Object.entries(tout)) {
      ok(!/<(button|a|form|input|select|textarea|iframe|script|img|video)\b/i.test(h), `écran « ${nom} » : un élément interactif ou externe (${(/<(button|a|form|input|select|textarea|iframe|script|img|video)\b/i.exec(h) ?? [])[1]})`)
      ok(!/<[^>]*\s(href|src|action|formaction)=/i.test(h), `écran « ${nom} » : un lien ou une source (href, src, action)`)
      ok(!/<[^>]*\son[a-z]+=/i.test(h), `écran « ${nom} » : un gestionnaire d'événement en ligne`)
      ok(!/role="(button|link|menuitem|switch)"/.test(h), `écran « ${nom} » : un rôle d'action`)
      const t = decoder(h)
      const verbe = /\b(Publier|Envoyer|Approuver|Valider|Copier|Poster|Lancer|Accepter|Refuser|Programmer)\b/.exec(t)
      ok(!verbe, `écran « ${nom} » : le verbe d'action « ${verbe?.[1]} » (l'écran se lit, il ne commande rien)`)
    }
    const actions = []
    const cherche = (o, chemin) => { if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (/^(action|actions|bouton|boutons|publier|envoyer|approuver|valider|autoriser|geste|lien|url|href)$/i.test(k)) actions.push(`${chemin}.${k}`); cherche(v, `${chemin}.${k}`) } }
    for (const [nom, s] of Object.entries(rendus)) cherche(s, nom)
    ok(actions.length === 0, `le modèle porte des champs d'action : ${actions.slice(0, 4).join(', ')}`)
  })

  // ── CE-13 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  critere('CE-13', (ok) => {
    const h = HTML.plein
    const sections = [...h.matchAll(/<section\b[^>]*aria-labelledby="([^"]+)"/g)].map((m) => m[1])
    ok(sections.length >= 6, `${sections.length} section(s) liée(s) à un titre ; 6 attendues (blocages et les cinq panneaux)`)
    for (const id of sections) ok(new RegExp(`<h2[^>]*id="${id}"[^>]*>[\\s\\S]+?</h2>`).test(h), `la section aria-labelledby="${id}" n'a pas son titre h2 portant cet id`)
    const tables = h.match(/<table\b/g)?.length ?? 0
    ok(tables > 0 && (h.match(/<caption\b/g)?.length ?? 0) === tables, `${tables} tableau(x), ${h.match(/<caption\b/g)?.length ?? 0} légende(s) ; chaque tableau doit avoir une caption`)
    ok((h.match(/<thead\b/g)?.length ?? 0) === tables && /<th scope="col"/.test(h) && /<th scope="row"/.test(h), 'chaque tableau doit avoir un thead à colonnes scope="col" et des lignes scope="row"')
    const regions = [...h.matchAll(/<div\b[^>]*role="region"[^>]*>/g)].map((m) => m[0])
    ok(regions.length === tables && regions.every((r) => /tabindex="0"/.test(r) && /aria-label="[^"]+"/.test(r) && /overflow-x:auto/.test(r) && /max-width:100%/.test(r)), `chaque tableau doit être dans une région défilante focalisable au clavier, nommée (aria-label, tabindex 0, overflow-x:auto, max-width:100%) : ${regions.length} région(s) pour ${tables} tableau(x)`)
    for (const [attr, nom] of [['data-publication', 'une publication'], ['data-blocage', 'une carte de blocage'], ['data-refuse', 'un accord refusé'], ['data-ligne', 'une ligne L1–L5'], ['data-vente-ligne', 'une vente par ligne'], ['data-candidat', 'un candidat']]) {
      const lis = [...h.matchAll(new RegExp(`<li\\b[^>]*${attr}="[^"]*"[^>]*>`, 'g'))].map((m) => m[0])
      ok(lis.length > 0 && lis.every((l) => /overflow-wrap:anywhere/.test(l) && /min-width:0/.test(l)), `${nom} : ${lis.filter((l) => !/overflow-wrap:anywhere/.test(l) || !/min-width:0/.test(l)).length}/${lis.length} sans retour à la ligne forcé (overflow-wrap:anywhere) ni min-width:0 (téléphone)`)
    }
    ok(/<li\b[^>]*style="[^"]*white-space:pre-wrap/.test(h) || /white-space:pre-wrap/.test(h), 'le texte exact servi doit garder ses retours à la ligne (white-space:pre-wrap)')
    for (const m of h.matchAll(/(?:min-|max-)?width:\s*(\d+)px/g)) ok(Number(m[1]) <= 320, `une largeur fixe de ${m[1]} px (le téléphone fait 320 px ou plus)`)
    ok(/<details\b/.test(h) && /<summary\b/.test(h), 'les versions exactes se déplient au clavier (details/summary natifs)')
    const titres = [...h.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]))
    ok(titres.length > 0 && titres.every((n, i) => i === 0 ? n === 2 : n >= 2 && n <= titres[i - 1] + 1), `la hiérarchie des titres saute un niveau : ${titres.join(',')}`)
  })

  // ── CE-14 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  critere('CE-14', (ok) => {
    const ETRANGERS = ['dupont@presti-test.invalid', '06 12 34 56 78', 'Jean Test', 'Dupont Menuiserie']
    const sale = (o) => ({ ...o, prospect_email: ETRANGERS[0], telephone: ETRANGERS[1], prospect: { nom: ETRANGERS[2], societe: ETRANGERS[3] } })
    const e = entree({
      lignes: lignes.map(sale),
      posts: [...posts, ...postsBlocages.slice(0, 6)].map((p) => ({ ...sale(p), affirmations: p.affirmations.map(sale) })),
      mesures: mesures.map(sale), ventes: ventes.map(sale), recommandations: reco.map(sale),
    })
    const s = construireSuivi(e)
    const json = JSON.stringify(s), html = rendre(s)
    for (const x of ETRANGERS) {
      ok(!json.includes(x), `« ${x} » (champ étranger du jeu d'entrée) est passé dans le modèle`)
      ok(!html.includes(x), `« ${x} » (champ étranger du jeu d'entrée) est passé à l'écran`)
    }
    const clesPost = new Set(['id', 'ligne', 'canal', 'rendu', 'texteExact', 'dit'])
    const vus = [...s.crieur.enAttente, ...s.crieur.fileTiktok, ...s.crieur.attenteR6, ...s.studio.enAttente]
    ok(vus.length > 0 && vus.every((p) => Object.keys(p).every((k) => clesPost.has(k))), `un post montré porte des clés hors liste : ${[...new Set(vus.flatMap((p) => Object.keys(p)).filter((k) => !clesPost.has(k)))]}`)
    const clesPub = new Set(['id', 'ligne', 'canal', 'publieLe', 'preuve', 'preuveManquante'])
    ok(s.crieur.publications.every((p) => Object.keys(p).every((k) => clesPub.has(k))), 'une publication porte des clés hors liste')
    ok(s.blocages.length > 0 && s.blocages.every((b) => Object.keys(b).every((k) => ['postId', 'ligne', 'canal', 'texteExact', 'source', 'probabilite', 'verdict', 'manque'].includes(k))), 'une carte de blocage porte des clés hors liste (donnée de prospect possible)')
    const e2 = JSON.stringify(construireSuivi(entree()))
    ok(!/@[a-z0-9.-]+\.[a-z]{2,}/i.test(e2.replace(/example\.invalid/g, '')) && !/\b0[1-9]([ .]?\d{2}){4}\b/.test(e2), 'le modèle d\'un jeu sans donnée de prospect ne doit contenir ni e-mail ni téléphone')
  })

  // ── le bilan ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
  console.log(`${NOM} (fiche ${FICHE}) — racine ${RAC}`)
  const rouges = []
  for (const id of IDS) {
    const f = resultats.get(id) ?? ['critère non évalué']
    if (f.length === 0) console.log(`PASS ${id} — ${RESUME[id]}`)
    else { rouges.push(id); console.log(`FAIL ${id} — ${f[0]}`); for (const x of f.slice(1, 8)) console.log(`  ✗ ${x}`); if (f.length > 8) console.log(`  … ${f.length - 8} autre(s)`) }
  }
  console.log(`${NOM} : ${rouges.length ? `FAIL — ${rouges.join(', ')}` : `PASS — ${IDS.length} critères verts`}`)
  process.exitCode = rouges.length ? 1 : 0
}

const RESUME = {
  'CE-1': 'exports, modèle et affichage purs (ni réseau, ni horloge, ni hasard, ni HTML injecté), entrée gelée intacte, sorties identiques',
  'CE-2': 'lignes L1 à L5, attente, file TikTok, refus avec motif, publications : séparés, aucun post en double',
  'CE-3': 'un post Meta prêt attend R6 (fermé ou inconnu), jamais « publié » ; ouvert : plus d\'attente',
  'CE-4': 'preuve publique montrée, preuve manquante dite',
  'CE-5': 'texte, légende, sous-titres, miniature, description montrés tels quels et échappés ; un chiffre caché fait une carte',
  'CE-6': 'non mesuré et en attente jamais 0, NaN et infini non servis, source et date, échéances et horloge illisibles',
  'CE-7': 'vente par ligne et à l\'Audience : estimation et fenêtre, au modèle et à l\'écran',
  'CE-8': 'blocages : < 0,5, sans source, Laya indisponible, probabilité absente, chiffre sans affirmation jugée ; 0,5 passe ; carte rendue',
  'CE-9': 'score Laya avec provenance, panne dite sans score, aucun effet sur les publications',
  'CE-10': 'non servi, vide et panne distincts, jamais un zéro',
  'CE-11': 'cinq états rendus : tout se dit en mots, alertes pour le grave, aucun zéro décoratif, absence de modèle dite',
  'CE-12': 'ni bouton, ni lien, ni formulaire, ni verbe d\'envoi ; aucun champ d\'action au modèle',
  'CE-13': 'titres liés, tableaux légendés, régions focalisables, retours à la ligne, aucune largeur fixe, hiérarchie des titres',
  'CE-14': 'aucun champ étranger (e-mail, téléphone, nom) dans le modèle ni à l\'écran, clés fermées',
}

if (option('sabotages')) process.exitCode = lancerSabotages()
else await juger()
