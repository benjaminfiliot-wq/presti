// scripts/prospects-hors-depot.mjs — le juge du point 11 de la fiche 025-01 : aucun nom de prospect du suivi commercial dans un
// fichier suivi par Git. Écrit par Claude Code, qui le lance avant chaque push (plan SaaS/Produit/Ecosysteme-Plan-2026-09-24.md,
// tableau des signaux : « Nom de prospect dans un fichier suivi … 1 → aucun push »).
//
// Le suivi : <vault>/Prospection/phase0/suivi.csv, où <vault> est la clé « vault » de .orchestre/orchestre.json (« ../SaaS »),
// résolue depuis la racine qui porte ce fichier. Le vault est celui du poste : la configuration est lue dans le dépôt (R), même
// avec --racine (un arbre extrait sous .orchestre/travail/ n'a pas de vault à côté de lui). Suivi absent dans un vault présent :
// vert, avec la mention « aucun suivi » (fiche). Vault ou configuration introuvable : rouge (un vault mal indiqué rendrait le juge
// vert pour toujours, sans rien lire).
//
// Critères (une ligne chacun ; code 0 seulement si tous sont verts) :
//   PH-1  le suivi est lu, ou bien il est absent (« aucun suivi »). Lu = présent, non vide (0 octet : rouge), décodé (UTF-8 avec ou
//         sans BOM, windows-1252 d'Excel, UTF-16 avec BOM ; un caractère NUL : rouge), CSV valide (RFC 4180 : guillemets,
//         « "" », cellule sur plusieurs lignes ; séparateur « ; », « , » ou tabulation, le plus fréquent de l'en-tête ; guillemet
//         non fermé : rouge), avec une colonne « prospect » dans l'en-tête (« prospect », « prospect (…) » ou « nom du prospect »,
//         casse et accents ignorés ; sinon rouge : les noms ne peuvent pas être lus). Chaque nom : NFC, espaces resserrés ; moins
//         de 4 signes : ignoré et compté (fiche) ; doublons (casse ignorée) : cherchés une fois.
//   PH-2  aucun nom dans un fichier suivi : git grep -F -i -l (fiche), sans -I (un nom dans un fichier binaire compte), sur les
//         fichiers suivis de l'arbre de travail puis sur l'index (--cached : ce que le prochain commit emporte) ; et les chemins
//         suivis (git ls-files : un dossier nommé d'après un prospect partirait aussi sur GitHub). Chaque nom est cherché tel quel,
//         sans accents (« Elise Grandcoeur » : tapé sur un clavier sans accents ; relecture du 24/09) et sous sa forme slug
//         (minuscules sans accents, « - » entre les mots : le nom d'un dossier de site), chaque forme si elle diffère et fait 4
//         signes au moins. Sur un arbre qui n'est pas la racine d'un dépôt (arbre extrait, témoin) : git grep --no-index,
//         tous ses fichiers. Avant de conclure « aucun nom », le détecteur doit voir un canari planté dans
//         .orchestre/travail/prospects-hors-depot/p<pid>/canari/ (nom synthétique exact, en capitales accentuées, dans un fichier binaire ;
//         un quasi-homonyme ne doit pas sortir) : un git grep aveugle ne rend jamais vert. Un arbre sans fichier est rouge.
//   PH-3  (racine d'un dépôt seulement) aucun nom dans les commits à pousser : git rev-list HEAD --not --remotes (commits absents
//         de toutes les branches distantes connues), leurs arbres relus par git grep (contenus) et git ls-tree (chemins) : un nom
//         ajouté dans un commit puis retiré dans le suivant partirait quand même sur GitHub. Aucun commit à pousser : vert.
//
// Aucun nom n'est imprimé : une trouvaille est désignée par la ligne du suivi (« prospect ligne 13 (17 signes) ») et chaque segment
// de chemin qui contient un nom est masqué. La sortie finit dans des journaux suivis (.orchestre/preuves/…).
//
// Options : --racine=<dossier> (défaut : le dépôt) : l'arbre où l'on cherche ; le vault reste celui du poste.
//           --temoin (sans --racine) : le jeu d'essai scripts/fixtures/025/temoins/prospects-hors-depot/ (attendu.json dit ce
//           qu'il contient) est copié dans .orchestre/travail/prospects-hors-depot/p<pid>/temoin/ ; depot/ y est un faux dépôt (lu comme un
//           arbre extrait) dont .orchestre/orchestre.json pointe vers ../vault, et vault/Prospection/phase0/suivi.csv un faux
//           suivi. Le même code que pour le vrai poste (evaluer) les juge, avec la configuration du faux dépôt. Critères :
//     PH-1  le faux suivi est lu exactement comme attendu.json l'annonce (encodage, séparateur, colonne, enregistrements, lignes
//           et longueurs des noms, courts, vides, doublons) ;
//     PH-2  aucun nom dans le faux dépôt, qui ne porte que des quasi-homonymes et un nom de 3 signes (canari compris) ;
//     PH-T  témoins négatifs, chacun sur une copie de ce dossier dans .orchestre/travail/prospects-hors-depot/p<pid>/cas/<cas>/ :
//           sept fuites plantées doivent rendre PH-2 rouge avec la bonne ligne du suivi (nom exact dans un fichier imbriqué, en
//           capitales accentuées, tapé sans accents, dans un chemin, sous forme slug dans un chemin, dans un fichier binaire, suivi réencodé en
//           windows-1252) ; un suivi UTF-16 doit se lire pareil ; suivi de 0 octet, sans colonne « prospect », à guillemet non
//           fermé, à caractère NUL, ou remplacé par un dossier, et configuration sans vault, vers un vault absent ou absente,
//           doivent rendre PH-1 et PH-2 rouges ; suivi absent : PH-1 et PH-2 verts avec « aucun suivi » ; arbre vide : PH-2 rouge ;
//           dans aucun cas un nom n'apparaît dans la sortie. Enfin deux contrôles en lecture seule sur ce dépôt, puisque le faux
//           dépôt n'est pas un dépôt Git (aucune commande Git d'écriture, nulle part) : la recherche de PH-2 sur une racine de
//           dépôt voit la ligne "name" de package.json (arbre de travail et index) et le chemin package.json, et ne voit pas un
//           jeton aléatoire posé dans un fichier non suivi de .orchestre/travail/ ; le lecteur de commits de PH-3, à 1620723,
//           y voit la même ligne et le même chemin, et n'y voit ni la première ligne de ce fichier ni son chemin (absents de ce
//           commit), ni une sortie de git grep sans sha en tête.
//           --temoin ne dépend pas de l'état du dépôt au-delà de package.json et du commit figé 1620723.
//   --reel n'existe pas pour ce juge. Code 2 sur une option invalide.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  R, FIXTURES, REFERENCE_COMMIT, lireOptionsOuQuitter, creerSortie, estRacineGit, git, revParse, lsTree, blobGit, listerFichiers,
  lireOuNull, dossierTravail, exigerSousTravail, lireJson, TRAVAIL,
} from './fixtures/025/commun.mjs'

const JUGE = 'prospects-hors-depot'
const CONFIG = ['.orchestre', 'orchestre.json']
const SUIVI = ['Prospection', 'phase0', 'suivi.csv']
const MIN_SIGNES = 4
const MAX_COMMITS = 500
const COMMITS_PAR_APPEL = 20
const MAX_NOTES = 40
const TEMOIN = path.join(FIXTURES, 'temoins', JUGE)
const CE_FICHIER = fileURLToPath(import.meta.url)
// Fichiers de travail de ce passage : .orchestre/travail/prospects-hors-depot/p<pid>/ (deux passages simultanés ne se marchent
// pas dessus) ; effacés si tout est vert, gardés pour examen sinon.
const RUN = `p${process.pid}`
const DOSSIER_RUN = exigerSousTravail(path.join(TRAVAIL, JUGE, RUN))

// ── Petits outils ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const premiereLigne = (e) => String((e && e.message) || e).split('\n')[0].slice(0, 300)
const posix = (p) => p.split(path.sep).join('/')
const affiche = (p) => { const r = path.relative(R, p); return r && !r.startsWith('..') && !path.isAbsolute(r) ? posix(r) : posix(p) }
const signes = (s) => [...s].length
const bas = (s) => s.normalize('NFC').toLocaleLowerCase('fr')
const plier = (s) => s.normalize('NFD').replace(/\p{M}+/gu, '').replace(/œ/g, 'oe').replace(/Œ/g, 'OE').replace(/æ/g, 'ae').replace(/Æ/g, 'AE').replace(/ß/g, 'ss')
const slug = (s) => plier(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const NOM_SEPARATEUR = { ';': '« ; »', ',': '« , »', '\t': 'tabulation' }
const WINDOWS_1252 = new TextDecoder('windows-1252')

// ── Le suivi : où il est, et ce qu'il contient ────────────────────────────────────────────────────────────────────────────
/**
 * <racineConfig>/.orchestre/orchestre.json → clé « vault » → <vault>/Prospection/phase0/suivi.csv.
 * → { ok, defaut?, config, vault?, suivi?, present }
 */
function localiserSuivi(racineConfig) {
  const config = path.join(racineConfig, ...CONFIG)
  let brut
  try { brut = fs.readFileSync(config, 'utf8') } catch (e) { return { ok: false, config, defaut: `${affiche(config)} illisible (${e.code || premiereLigne(e)}) : chemin du vault inconnu` } }
  let cfg
  try { cfg = JSON.parse(brut.replace(/^\uFEFF/, '')) } catch (e) { return { ok: false, config, defaut: `${affiche(config)} : JSON invalide (${premiereLigne(e)})` } }
  if (!cfg || typeof cfg.vault !== 'string' || !cfg.vault.trim()) return { ok: false, config, defaut: `${affiche(config)} : clé « vault » absente ou vide` }
  const vault = path.resolve(racineConfig, cfg.vault.trim())
  let st = null
  try { st = fs.statSync(vault) } catch { /* absent */ }
  if (!st || !st.isDirectory()) return { ok: false, config, vault, defaut: `vault introuvable : ${posix(vault)} (« vault » : « ${cfg.vault} » dans ${affiche(config)}) — un vault absent n'est pas un suivi absent` }
  const suivi = path.join(vault, ...SUIVI)
  try {
    if (!fs.statSync(suivi).isFile()) return { ok: false, config, vault, suivi, defaut: `${posix(suivi)} n'est pas un fichier` }
  } catch (e) {
    if (e.code === 'ENOENT' || e.code === 'ENOTDIR') return { ok: true, config, vault, suivi, present: false }
    return { ok: false, config, vault, suivi, defaut: `${posix(suivi)} : ${e.code || premiereLigne(e)}` }
  }
  return { ok: true, config, vault, suivi, present: true }
}

/** Octets → texte : BOM UTF-16 ou UTF-8 d'abord, puis UTF-8 strict, sinon windows-1252 (le « CSV » d'Excel sous Windows). */
function decoder(buf) {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return { texte: new TextDecoder('utf-16le').decode(buf.subarray(2)), encodage: 'utf-16le avec BOM' }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) return { texte: new TextDecoder('utf-16be').decode(buf.subarray(2)), encodage: 'utf-16be avec BOM' }
  const bom = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf
  const corps = bom ? buf.subarray(3) : buf
  try { return { texte: new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(corps), encodage: bom ? 'utf-8 avec BOM' : 'utf-8' } } catch { /* pas de l'UTF-8 */ }
  return { texte: WINDOWS_1252.decode(corps), encodage: 'windows-1252' }
}

/**
 * CSV (RFC 4180, avec tolérance : un guillemet au milieu d'une cellule nue est un caractère). Le séparateur est le plus fréquent
 * de « ; », « , » et tabulation dans la première ligne non vide, hors guillemets. → { separateur, enregistrements: [{ ligne, cellules }] }
 * (ligne : numéro de la ligne physique où l'enregistrement commence). Lève une Error sur un guillemet non fermé.
 */
function lireCsv(texte) {
  const comptes = { ';': 0, ',': 0, '\t': 0 }
  {
    let q = false, vu = false
    for (const c of texte) {
      if (c === '"') q = !q
      else if (!q && (c === '\n' || c === '\r')) { if (vu) break; continue }
      else if (!q && c in comptes) comptes[c]++
      if (c.trim()) vu = true
    }
  }
  const [plusFrequent, nombre] = Object.entries(comptes).sort((a, b) => b[1] - a[1])[0]
  const sep = nombre > 0 ? plusFrequent : ','
  const enregistrements = []
  let cellule = '', cellules = [], q = false, ligne = 1, debut = 1, i = 0
  const finCellule = () => { cellules.push(cellule); cellule = '' }
  const finEnregistrement = () => { finCellule(); enregistrements.push({ ligne: debut, cellules }); cellules = [] }
  while (i < texte.length) {
    const c = texte[i]
    if (q) {
      if (c === '"') {
        if (texte[i + 1] === '"') { cellule += '"'; i += 2; continue }
        q = false; i++; continue
      }
      if (c === '\n') ligne++
      cellule += c; i++; continue
    }
    if (c === '"' && cellule === '') { q = true; i++; continue }
    if (c === sep) { finCellule(); i++; continue }
    if (c === '\r' || c === '\n') {
      finEnregistrement()
      i += c === '\r' && texte[i + 1] === '\n' ? 2 : 1
      ligne++; debut = ligne
      continue
    }
    cellule += c; i++
  }
  if (q) throw new Error(`guillemet non fermé (enregistrement commencé ligne ${debut})`)
  if (cellule !== '' || cellules.length) finEnregistrement()
  return { separateur: sep, enregistrements }
}

/**
 * Lit le suivi. → { ok, defauts[], encodage, separateur, colonnes[], enregistrements, noms: [{ nom, ligne, signes }], courts, vides,
 * doublons }. Aucun défaut ne cite une cellule : la première ligne d'un fichier sans en-tête serait un nom de prospect.
 */
function lireSuivi(fichier) {
  const refus = (d) => ({ ok: false, defauts: [d] })
  let buf
  try { buf = fs.readFileSync(fichier) } catch (e) { return refus(`suivi illisible (${e.code || premiereLigne(e)}) : ouvert et verrouillé par Excel ?`) }
  if (!buf.length) return refus('suivi.csv vide (0 octet) : même sans prospect, un suivi garde sa ligne d\'en-tête')
  const { texte, encodage } = decoder(buf)
  if (texte.includes('\u0000')) return refus(`caractère NUL dans le suivi (${encodage}) : fichier binaire, ou UTF-16 sans BOM`)
  let csv
  try { csv = lireCsv(texte) } catch (e) { return refus(`CSV invalide : ${premiereLigne(e)}`) }
  const pleins = csv.enregistrements.filter((r) => r.cellules.some((c) => c.trim()))
  if (!pleins.length) return refus('suivi sans ligne d\'en-tête (seulement des lignes vides)')
  const [tete, ...lignes] = pleins
  const normal = (h) => plier(h.replace(/\uFEFF/g, '')).toLowerCase().replace(/\s+/g, ' ').trim()
  const colonnes = tete.cellules.map((h, i) => [normal(h), i]).filter(([h]) => h === 'prospect' || h === 'prospects' || h === 'nom du prospect' || /^prospects?(?![\p{L}\p{N}])/u.test(h))
  if (!colonnes.length) return refus(`aucune colonne « prospect » dans l'en-tête (ligne ${tete.ligne}, ${tete.cellules.length} colonne(s), séparateur ${NOM_SEPARATEUR[csv.separateur]}, ${encodage}) : les noms ne peuvent pas être lus`)
  const vus = new Map()
  let courts = 0, vides = 0, doublons = 0
  for (const r of lignes) {
    for (const [, i] of colonnes) {
      const nom = String(r.cellules[i] ?? '').normalize('NFC').replace(/\s+/g, ' ').trim()
      if (!nom) { vides++; continue }
      if (signes(nom) < MIN_SIGNES) { courts++; continue }
      const cle = bas(nom)
      if (vus.has(cle)) { doublons++; continue }
      vus.set(cle, { nom, ligne: r.ligne, signes: signes(nom) })
    }
  }
  return { ok: true, defauts: [], encodage, separateur: csv.separateur, colonnes: colonnes.map(([h]) => h), enregistrements: lignes.length, noms: [...vus.values()], courts, vides, doublons }
}

// ── La recherche ──────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Les motifs cherchés : chaque nom tel quel, sa forme sans accents (« Elise Grandcoeur » pour « Élise Grandcœur », tapée sur un
 *  clavier sans accents) et sa forme slug, chacune si elle diffère et fait 4 signes au moins. */
function motifsDe(noms) {
  const m = []
  for (const n of noms) {
    m.push({ texte: n.nom, forme: 'nom', nom: n })
    const sa = plier(n.nom)
    if (signes(sa) >= MIN_SIGNES && bas(sa) !== bas(n.nom)) m.push({ texte: sa, forme: 'sans accents', nom: n })
    const s = slug(n.nom)
    if (signes(s) >= MIN_SIGNES && s !== bas(n.nom) && s !== bas(sa)) m.push({ texte: s, forme: 'slug', nom: n })
  }
  return m
}
const etiquette = (m) => `prospect ligne ${m.nom.ligne} (${m.nom.signes} signes${m.forme !== 'nom' ? `, forme ${m.forme}` : ''})`
const motifBas = (m) => (m.bas ??= bas(m.texte))
/** Les motifs présents dans un texte déjà passé par bas() (chemins : bas() une fois par chemin, pas une fois par motif). */
const motifsDans = (texteBas, motifs) => motifs.filter((m) => texteBas.includes(motifBas(m)))
const contient = (texte, m) => bas(texte).includes(motifBas(m))

/**
 * git grep -F -i -l -z -f - (motifs sur l'entrée standard : ni limite de ligne de commande, ni nom dans la liste des processus),
 * sans -I. noIndex : --no-index (tous les fichiers du dossier) ; cached : l'index ; revs : ces commits (sortie « <sha>:<chemin> »).
 * Code 0 = trouvé, 1 = rien ; tout autre code est une erreur (jamais lu comme « rien »). → les chemins (ou « sha:chemin »).
 */
function gitGrep(cwd, textes, { noIndex = false, cached = false, revs = [] } = {}) {
  const uniques = [...new Set(textes.map(bas))]
  if (!uniques.length || uniques.some((t) => !t.trim() || /[\r\n]/.test(t))) throw new Error('git grep : motif vide ou sur plusieurs lignes refusé (un motif vide trouve tout)')
  const args = ['grep', '-F', '-i', '-l', '-z']
  if (noIndex) args.push('--no-index')
  if (cached) args.push('--cached')
  args.push('-f', '-', ...revs)
  const r = spawnSync('git', args, { cwd, input: `${uniques.join('\n')}\n`, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }, maxBuffer: 256 * 1024 * 1024, windowsHide: true })
  if (r.error) throw new Error(`git grep : ${premiereLigne(r.error)}`)
  if (r.status !== 0 && r.status !== 1) throw new Error(`git grep en code ${r.status} : ${premiereLigne(r.stderr ? r.stderr.toString('utf8') : '')}`)
  return r.stdout.toString('utf8').split('\0').filter(Boolean)
}

/**
 * Plusieurs objets en un appel : git cat-file --batch (specs « <sha>:<chemin> », « :0:<chemin> » pour l'index ; la ligne entière
 * est le nom de l'objet). → Map(spec → Buffer | null) ; null : objet absent ou chemin à saut de ligne.
 */
function lireBlobs(racine, specs) {
  const out = new Map(specs.map((s) => [s, null]))
  const valides = [...new Set(specs)].filter((s) => !/[\r\n]/.test(s))
  if (!valides.length) return out
  const r = spawnSync('git', ['cat-file', '--batch'], { cwd: racine, input: `${valides.join('\n')}\n`, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }, maxBuffer: 1024 * 1024 * 1024, windowsHide: true })
  if (r.error || r.status !== 0) throw new Error(`git cat-file --batch : ${premiereLigne(r.error || (r.stderr && r.stderr.toString('utf8')) || `code ${r.status}`)}`)
  const b = r.stdout
  let pos = 0
  for (const s of valides) {
    const fin = b.indexOf(0x0a, pos)
    if (fin < 0) throw new Error('git cat-file --batch : sortie tronquée')
    const tete = /^([0-9a-f]{40,64}) (\S+) (\d+)$/.exec(b.subarray(pos, fin).toString('utf8'))
    pos = fin + 1
    if (!tete) continue // « <spec> missing » : pas de contenu à sauter
    const n = Number(tete[3])
    if (pos + n > b.length) throw new Error('git cat-file --batch : contenu tronqué')
    if (tete[2] === 'blob') out.set(s, b.subarray(pos, pos + n))
    pos += n + 1
  }
  return out
}

/** Quels motifs un contenu porte (relecture après git grep : UTF-8 et windows-1252, casse ignorée). */
function attribuer(buf, motifs) {
  if (!buf || !buf.length) return []
  const vues = [bas(buf.toString('utf8')), bas(WINDOWS_1252.decode(buf))]
  return motifs.filter((m) => vues.some((v) => v.includes(motifBas(m))))
}

/** Un chemin affichable : chaque segment qui contient un motif est masqué ; si un motif chevauche des segments, tout est masqué. */
function masquer(chemin, motifs) {
  const m = chemin.split('/').map((seg) => {
    const ms = motifs.filter((x) => contient(seg, x))
    return ms.length ? `[masqué : ${[...new Set(ms.map((x) => `ligne ${x.nom.ligne}`))].join(', ')}]` : seg
  }).join('/')
  return motifs.some((x) => contient(m, x)) ? '[chemin masqué]' : m
}

function collecteur() {
  const t = new Map()
  return {
    noter(chemin, dans, ou, ms) {
      const k = `${dans}\0${chemin}`
      if (!t.has(k)) t.set(k, { chemin, dans, ou: new Set(), motifs: new Set() })
      const e = t.get(k)
      e.ou.add(ou)
      for (const m of ms) e.motifs.add(m)
    },
    liste: () => [...t.values()],
  }
}
function decrire(t, motifs) {
  const ms = [...t.motifs]
  const qui = ms.length ? [...new Set(ms.map(etiquette))].join(', ') : 'nom non identifié (git grep l\'a trouvé, la relecture non)'
  return `${qui} dans ${t.dans === 'chemin' ? 'le chemin ' : ''}${masquer(t.chemin, motifs)} (${[...t.ou].join(', ')})`
}

/** PH-2 : contenus et chemins de l'arbre. depot : racine d'un dépôt (fichiers suivis, index) ; sinon tous les fichiers. */
function chercherArbre(racine, motifs, { depot }) {
  const textes = motifs.map((m) => m.texte)
  const c = collecteur()
  let chemins
  if (depot) {
    const lf = git(['ls-files', '-z'], { cwd: racine })
    if (lf.code !== 0) throw new Error(`git ls-files : ${premiereLigne(lf.stderr || lf.erreur)}`)
    chemins = lf.stdout.split('\0').filter(Boolean)
    for (const f of gitGrep(racine, textes)) c.noter(f, 'contenu', 'arbre de travail', attribuer(lireOuNull(path.join(racine, f)), motifs))
    const index = gitGrep(racine, textes, { cached: true })
    const blobs = lireBlobs(racine, index.map((f) => `:0:${f}`))
    for (const f of index) c.noter(f, 'contenu', 'index', attribuer(blobs.get(`:0:${f}`), motifs))
  } else {
    chemins = [...listerFichiers(racine)]
    for (const f of gitGrep(racine, textes, { noIndex: true })) c.noter(posix(f), 'contenu', 'arbre', attribuer(lireOuNull(path.join(racine, f)), motifs))
  }
  for (const ch of chemins) {
    const ms = motifsDans(bas(ch), motifs)
    if (ms.length) c.noter(ch, 'chemin', depot ? 'index' : 'arbre', ms)
  }
  return { trouvailles: c.liste(), fichiers: chemins.length }
}

/** PH-3 : les commits absents de toutes les branches distantes connues (lecture seule). */
function commitsAPousser(racine) {
  const r = git(['rev-list', 'HEAD', '--not', '--remotes'], { cwd: racine })
  if (r.code !== 0) throw new Error(`git rev-list HEAD --not --remotes : ${premiereLigne(r.stderr || r.erreur)}`)
  return r.stdout.split('\n').map((x) => x.trim()).filter(Boolean)
}
/** PH-3 : contenus (git grep sur les arbres) et chemins (git ls-tree) de ces commits. revs : shas complets. */
function chercherCommits(racine, revs, motifs) {
  const textes = motifs.map((m) => m.texte)
  const c = collecteur()
  let chemins = 0
  const vus = []
  for (let i = 0; i < revs.length; i += COMMITS_PAR_APPEL) {
    for (const e of gitGrep(racine, textes, { revs: revs.slice(i, i + COMMITS_PAR_APPEL) })) {
      const k = e.indexOf(':')
      const rev = e.slice(0, k), f = e.slice(k + 1)
      if (k < 0 || !revs.includes(rev)) throw new Error(`git grep : sortie inattendue (${e.length} signes sans sha demandé en tête)`)
      vus.push([rev, f])
    }
  }
  const blobs = lireBlobs(racine, vus.map(([rev, f]) => `${rev}:${f}`))
  for (const [rev, f] of vus) c.noter(f, 'contenu', `commit ${rev.slice(0, 7)}`, attribuer(blobs.get(`${rev}:${f}`), motifs))
  for (const rev of revs) {
    const lt = git(['ls-tree', '-r', '--name-only', '-z', rev], { cwd: racine })
    if (lt.code !== 0) throw new Error(`git ls-tree ${rev.slice(0, 7)} : ${premiereLigne(lt.stderr || lt.erreur)}`)
    const cs = lt.stdout.split('\0').filter(Boolean)
    chemins += cs.length
    for (const ch of cs) {
      const ms = motifsDans(bas(ch), motifs)
      if (ms.length) c.noter(ch, 'chemin', `commit ${rev.slice(0, 7)}`, ms)
    }
  }
  return { trouvailles: c.liste(), chemins }
}

/**
 * Le canari : un détecteur qui ne voit pas un nom planté (exact, en capitales accentuées, dans un binaire) ne conclut rien.
 * Évalué une fois par processus, dans .orchestre/travail/prospects-hors-depot/p<pid>/canari/.
 */
let canariMemo = null
function canari() {
  if (canariMemo) return canariMemo
  const d = dossierTravail(JUGE, RUN, 'canari')
  const nom = 'Élodie Canari-Œillet'
  const ecrire = (f, contenu) => { fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true }); fs.writeFileSync(path.join(d, f), contenu) }
  ecrire('exact.txt', `Relance de ${nom} jeudi.\n`)
  ecrire('capitales.md', `# ${nom.toLocaleUpperCase('fr')}\n`)
  ecrire('sous/binaire.bin', Buffer.concat([Buffer.from([0, 1, 2, 0xff]), Buffer.from(nom, 'utf8'), Buffer.from([0])]))
  ecrire('voisin.txt', 'Élodie Canari, quasi-homonyme.\n')
  const attendus = ['capitales.md', 'exact.txt', 'sous/binaire.bin']
  let vus
  try { vus = gitGrep(d, [nom], { noIndex: true }).map(posix).sort() } catch (e) { return (canariMemo = { ok: false, detail: `détecteur en erreur sur le canari : ${premiereLigne(e)}` }) }
  const ok = JSON.stringify(vus) === JSON.stringify(attendus)
  return (canariMemo = { ok, detail: ok ? 'canari vu (exact, capitales accentuées, binaire ; quasi-homonyme écarté)' : `détecteur aveugle : canari trouvé dans [${vus.join(', ')}], [${attendus.join(', ')}] attendus` })
}

// ── L'évaluation (la même pour le poste et pour le témoin) ─────────────────────────────────────────────────────────────────
/**
 * racineConfig : où lire .orchestre/orchestre.json ; racine : l'arbre où chercher ; commits : juger PH-3.
 * → { v: { 'PH-1': { ok, details[] }, 'PH-2': …, 'PH-3'?: … }, loc, lu, trouvailles: { 'PH-2': [], 'PH-3': [] }, motifs }
 */
function evaluer({ racineConfig, racine, commits = false }) {
  const ids = ['PH-1', 'PH-2', ...(commits ? ['PH-3'] : [])]
  const out = { v: {}, loc: null, lu: null, trouvailles: { 'PH-2': [], 'PH-3': [] }, motifs: [] }
  const suite = (ok, detail) => { for (const id of ids.slice(1)) out.v[id] = { ok, details: [detail] } }
  const loc = out.loc = localiserSuivi(racineConfig)
  if (!loc.ok) { out.v['PH-1'] = { ok: false, details: [loc.defaut] }; suite(false, 'recherche impossible : le suivi n\'est pas localisé (PH-1)'); return out }
  if (!loc.present) {
    out.v['PH-1'] = { ok: true, details: [`aucun suivi : ${posix(loc.suivi)} absent (vault ${posix(loc.vault)}, clé « vault » de ${affiche(loc.config)})`] }
    suite(true, 'aucun suivi : aucun nom à chercher')
    return out
  }
  const lu = out.lu = lireSuivi(loc.suivi)
  if (!lu.ok) { out.v['PH-1'] = { ok: false, details: lu.defauts.map((d) => `${posix(loc.suivi)} : ${d}`) }; suite(false, 'recherche impossible : le suivi n\'est pas lu (PH-1)'); return out }
  const extras = [lu.courts && `${lu.courts} plus court(s) que 4 signes ignoré(s)`, lu.vides && `${lu.vides} cellule(s) vide(s)`, lu.doublons && `${lu.doublons} doublon(s)`].filter(Boolean)
  out.v['PH-1'] = { ok: true, details: [`suivi lu : ${posix(loc.suivi)} (${lu.encodage}, séparateur ${NOM_SEPARATEUR[lu.separateur]}, colonne « ${lu.colonnes.join(' », « ')} ») : ${lu.enregistrements} enregistrement(s), ${lu.noms.length} nom(s) de 4 signes au moins${extras.length ? ` ; ${extras.join(', ')}` : ''}`] }
  if (!lu.noms.length) { suite(true, `aucun nom de 4 signes au moins dans le suivi (${lu.enregistrements} enregistrement(s)) : rien à chercher`); return out }
  const motifs = out.motifs = motifsDe(lu.noms)
  const c = canari()
  if (!c.ok) { suite(false, c.detail); return out }
  const depot = estRacineGit(racine)
  try {
    const a = chercherArbre(racine, motifs, { depot })
    out.trouvailles['PH-2'] = a.trouvailles
    if (!a.fichiers) out.v['PH-2'] = { ok: false, details: [`aucun fichier sous ${affiche(racine)} : rien n'a été lu`] }
    else if (a.trouvailles.length) out.v['PH-2'] = { ok: false, details: a.trouvailles.map((t) => decrire(t, motifs)) }
    else out.v['PH-2'] = { ok: true, details: [`${lu.noms.length} nom(s) (${motifs.length} motifs avec les formes sans accents et slug) absents des contenus et des chemins de ${a.fichiers} fichier(s) ${depot ? 'suivis (arbre de travail et index)' : `de ${affiche(racine)} (git grep --no-index)`} ; ${c.detail}`] }
  } catch (e) { out.v['PH-2'] = { ok: false, details: [`recherche interrompue : ${premiereLigne(e)}`] } }
  if (commits) {
    try {
      const revs = commitsAPousser(racine)
      if (!revs.length) out.v['PH-3'] = { ok: true, details: ['aucun commit à pousser (HEAD est sur une branche distante connue)'] }
      else if (revs.length > MAX_COMMITS) out.v['PH-3'] = { ok: false, details: [`${revs.length} commits à pousser, ${MAX_COMMITS} au plus relus : trop pour conclure`] }
      else {
        const h = chercherCommits(racine, revs, motifs)
        out.trouvailles['PH-3'] = h.trouvailles
        if (!h.chemins) out.v['PH-3'] = { ok: false, details: ['commits à pousser sans aucun fichier : rien n\'a été lu'] }
        else if (h.trouvailles.length) out.v['PH-3'] = { ok: false, details: h.trouvailles.map((t) => decrire(t, motifs)) }
        else out.v['PH-3'] = { ok: true, details: [`${revs.length} commit(s) à pousser (${revs.slice(0, 5).map((x) => x.slice(0, 7)).join(', ')}${revs.length > 5 ? ', …' : ''}) : ${h.chemins} fichier(s) relus, contenus et chemins, aucun nom`] }
      }
    } catch (e) { out.v['PH-3'] = { ok: false, details: [`recherche interrompue : ${premiereLigne(e)}`] } }
  }
  return out
}

/** Recopie une évaluation dans la sortie ; au-delà de 3 trouvailles par critère, la liste complète part en notes. */
function reporter(s, r, ids) {
  for (const id of ids) {
    const x = r.v[id]
    if (!x) { s.echoue(id, 'non évalué'); continue }
    if (x.ok) s.passe(id, x.details.join(' ; '))
    else {
      for (const d of x.details) s.echoue(id, d)
      if (x.details.length > 3) {
        for (const d of x.details.slice(0, MAX_NOTES)) s.note(`${id} : ${d}`)
        if (x.details.length > MAX_NOTES) s.note(`${id} : … et ${x.details.length - MAX_NOTES} autre(s) trouvaille(s) (${x.details.length} en tout)`)
      }
    }
  }
}

// ── Le témoin ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
function ecartsAttendu(lu, a) {
  if (!lu || !lu.ok) return ['le faux suivi n\'a pas été lu']
  const e = []
  const pareil = (x, y) => JSON.stringify(x) === JSON.stringify(y)
  if (lu.encodage !== a.encodage) e.push(`encodage ${lu.encodage}, ${a.encodage} attendu`)
  if (lu.separateur !== a.separateur) e.push(`séparateur ${NOM_SEPARATEUR[lu.separateur]}, « ${a.separateur} » attendu`)
  if (lu.colonnes.join(', ') !== a.colonne) e.push(`colonne(s) « ${lu.colonnes.join(', ')} », « ${a.colonne} » attendue`)
  if (lu.enregistrements !== a.enregistrements) e.push(`${lu.enregistrements} enregistrement(s), ${a.enregistrements} attendus`)
  const lignes = lu.noms.map((n) => n.ligne), longueurs = lu.noms.map((n) => n.signes)
  if (!pareil(lignes, a.lignes_des_noms)) e.push(`noms lus aux lignes [${lignes.join(', ')}], [${a.lignes_des_noms.join(', ')}] attendues`)
  if (!pareil(longueurs, a.signes_des_noms)) e.push(`longueurs des noms [${longueurs.join(', ')}], [${a.signes_des_noms.join(', ')}] attendues (guillemets doublés ou « ; » entre guillemets mal lus ?)`)
  for (const k of ['courts', 'vides', 'doublons']) if (lu[k] !== a[k]) e.push(`${k} : ${lu[k]}, ${a[k]} attendu(s)`)
  return e
}

function enWindows1252(texte) {
  const table = new Map()
  for (let b = 0; b < 256; b++) { const c = WINDOWS_1252.decode(Uint8Array.of(b)); if (!table.has(c)) table.set(c, b) }
  return Buffer.from([...texte].map((c) => { const b = table.get(c); if (b === undefined) throw new Error(`caractère hors windows-1252 : U+${c.codePointAt(0).toString(16)}`); return b }))
}

/** PH-T : les témoins négatifs (voir l'en-tête). base : la copie du jeu d'essai. → { ok, echecs[], resume } */
function temoinsNegatifs(base, attendu) {
  const echecs = [], faits = []
  const fichierSuivi = (d) => path.join(d, 'vault', ...SUIVI)
  const lu0 = lireSuivi(fichierSuivi(base))
  if (!lu0.ok) return { ok: false, echecs: [`faux suivi illisible (${lu0.defauts[0]}) : témoins négatifs impossibles`], resume: '' }
  const motifs0 = motifsDe(lu0.noms)
  const masq = (ch) => masquer(ch, motifs0)
  const nomLigne = (l) => { const n = lu0.noms.find((x) => x.ligne === l); if (!n) throw new Error(`attendu.json : aucun nom à la ligne ${l} du faux suivi`); return n.nom }
  const F = attendu.fuites || {}
  const texteSuivi = decoder(fs.readFileSync(fichierSuivi(base))).texte
  const ecrire = (f, contenu) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, contenu) }
  const ecrireConfig = (depot, objet) => ecrire(path.join(depot, ...CONFIG), `${JSON.stringify(objet, null, 2)}\n`)

  const attendreFuite = (ligne, chemin, dans, forme = 'nom') => (r) => {
    const pb = []
    if (!r.v['PH-1']?.ok) pb.push(`PH-1 rouge (${r.v['PH-1']?.details[0]})`)
    if (r.v['PH-2']?.ok !== false) pb.push('PH-2 vert : la fuite n\'est pas vue')
    const t = r.trouvailles['PH-2'].find((x) => x.chemin === chemin && x.dans === dans)
    if (!t) pb.push(`rien sur ${masq(chemin)} (${dans}) ; ${r.trouvailles['PH-2'].length} trouvaille(s) ailleurs`)
    else if (![...t.motifs].some((m) => m.nom.ligne === ligne && m.forme === forme)) pb.push(`${masq(chemin)} trouvé sans le prospect ligne ${ligne} (forme ${forme})`)
    return pb
  }
  const attendreRefus = (motif) => (r) => {
    const pb = []
    if (r.v['PH-1']?.ok !== false) pb.push('PH-1 vert : suivi ou configuration abîmé accepté')
    else if (!motif.test(r.v['PH-1'].details.join(' '))) pb.push(`PH-1 rouge pour une autre raison : ${r.v['PH-1'].details[0]}`)
    if (r.v['PH-2']?.ok !== false) pb.push('PH-2 vert alors que le suivi n\'est pas lu')
    return pb
  }
  const attendreLecture = (encodage) => (r) => {
    const pb = []
    if (!r.v['PH-1']?.ok) pb.push(`PH-1 rouge (${r.v['PH-1']?.details[0]})`)
    for (const e of ecartsAttendu(r.lu, { ...attendu, encodage })) pb.push(e)
    return pb
  }

  const nomAccentue = nomLigne(F.accentue), nomChemin = nomLigne(F.chemin)
  const cas = [
    { id: 'fuite-exacte', quoi: 'nom exact dans un fichier imbriqué',
      preparer: (d, depot) => ecrire(path.join(depot, 'docs', 'notes', '2026', 'relances.md'), `# Relances\n\nRelancer ${nomLigne(F.separateur)} lundi.\n`),
      attendu: attendreFuite(F.separateur, 'docs/notes/2026/relances.md', 'contenu') },
    { id: 'fuite-capitales', quoi: 'nom en capitales accentuées',
      preparer: (d, depot) => fs.appendFileSync(path.join(depot, 'site', 'index.html'), `<p>${nomAccentue.toLocaleUpperCase('fr')}</p>\n`),
      attendu: attendreFuite(F.accentue, 'site/index.html', 'contenu') },
    { id: 'fuite-chemin', quoi: 'nom dans un chemin',
      preparer: (d, depot) => ecrire(path.join(depot, 'maquettes', nomChemin, 'index.html'), '<p>maquette</p>\n'),
      attendu: attendreFuite(F.chemin, `maquettes/${nomChemin}/index.html`, 'chemin') },
    { id: 'fuite-sans-accents', quoi: 'nom tapé sans accents',
      preparer: (d, depot) => ecrire(path.join(depot, 'docs', 'appel.txt'), `Rappeler ${plier(nomAccentue)} demain.\n`),
      attendu: attendreFuite(F.accentue, 'docs/appel.txt', 'contenu', 'sans accents') },
    { id: 'fuite-slug', quoi: 'forme slug dans un chemin',
      preparer: (d, depot) => ecrire(path.join(depot, 'public', 'sites-demo', slug(nomAccentue), 'site.json'), '{}\n'),
      attendu: attendreFuite(F.accentue, `public/sites-demo/${slug(nomAccentue)}/site.json`, 'chemin', 'slug') },
    { id: 'fuite-binaire', quoi: 'nom dans un fichier binaire',
      preparer: (d, depot) => ecrire(path.join(depot, 'public', 'photo.bin'), Buffer.concat([Buffer.from([0, 0xff, 0xd8, 0]), Buffer.from(nomLigne(F.guillemets), 'utf8'), Buffer.from([0, 0])])),
      attendu: attendreFuite(F.guillemets, 'public/photo.bin', 'contenu') },
    { id: 'suivi-windows-1252', quoi: 'suivi réencodé en windows-1252 et nom accentué dans le dépôt',
      preparer: (d, depot) => { fs.writeFileSync(fichierSuivi(d), enWindows1252(texteSuivi)); ecrire(path.join(depot, 'site', 'contact.html'), `<p>${nomAccentue}</p>\n`) },
      attendu: (r) => [...attendreLecture('windows-1252')(r), ...attendreFuite(F.accentue, 'site/contact.html', 'contenu')(r)] },
    { id: 'suivi-utf16', quoi: 'suivi en UTF-16 avec BOM',
      preparer: (d) => fs.writeFileSync(fichierSuivi(d), Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(texteSuivi, 'utf16le')])),
      attendu: (r) => [...attendreLecture('utf-16le avec BOM')(r), ...(r.v['PH-2']?.ok ? [] : [`PH-2 rouge sans fuite (${r.v['PH-2']?.details[0]})`])] },
    { id: 'suivi-vide', quoi: 'suivi de 0 octet', preparer: (d) => fs.writeFileSync(fichierSuivi(d), ''), attendu: attendreRefus(/0 octet/) },
    { id: 'suivi-sans-colonne', quoi: 'en-tête sans colonne « prospect »',
      preparer: (d) => fs.writeFileSync(fichierSuivi(d), texteSuivi.replace(';prospect;', ';client;')),
      attendu: attendreRefus(/aucune colonne « prospect »/) },
    { id: 'suivi-guillemet', quoi: 'guillemet non fermé',
      preparer: (d) => fs.writeFileSync(fichierSuivi(d), `${texteSuivi}2026-09-29;instagram;Benj;"Atelier ouvert;froid;;A;;non;;;;;\r\n`),
      attendu: attendreRefus(/guillemet non fermé/) },
    { id: 'suivi-nul', quoi: 'suivi en UTF-16 sans BOM (caractères NUL)',
      preparer: (d) => fs.writeFileSync(fichierSuivi(d), Buffer.from(texteSuivi, 'utf16le')), attendu: attendreRefus(/NUL/) },
    { id: 'suivi-dossier', quoi: 'suivi.csv remplacé par un dossier',
      preparer: (d) => { fs.rmSync(fichierSuivi(d)); fs.mkdirSync(fichierSuivi(d)) }, attendu: attendreRefus(/n'est pas un fichier/) },
    { id: 'vault-introuvable', quoi: 'clé « vault » vers un dossier absent',
      preparer: (d, depot) => ecrireConfig(depot, { vault: '../nulle-part' }), attendu: attendreRefus(/vault introuvable/) },
    { id: 'config-sans-vault', quoi: 'orchestre.json sans clé « vault »',
      preparer: (d, depot) => ecrireConfig(depot, { projet: 'sans-vault' }), attendu: attendreRefus(/clé « vault » absente/) },
    { id: 'config-absente', quoi: 'orchestre.json absent',
      preparer: (d, depot) => fs.rmSync(path.join(depot, ...CONFIG)), attendu: attendreRefus(/orchestre\.json illisible/) },
    { id: 'suivi-absent', quoi: 'suivi absent, vault présent',
      preparer: (d) => fs.rmSync(fichierSuivi(d)),
      attendu: (r) => ['PH-1', 'PH-2'].filter((id) => !r.v[id]?.ok || !/aucun suivi/.test(r.v[id].details.join(' '))).map((id) => `${id} : « aucun suivi » vert attendu, obtenu ${r.v[id]?.ok ? 'vert' : 'rouge'} (${r.v[id]?.details[0]})`) },
    { id: 'arbre-vide', quoi: 'arbre sans fichier',
      preparer: (d) => fs.mkdirSync(path.join(d, 'vide')), racine: (d) => path.join(d, 'vide'),
      attendu: (r) => [...(r.v['PH-1']?.ok ? [] : ['PH-1 rouge']), ...(r.v['PH-2']?.ok === false && /aucun fichier/.test(r.v['PH-2'].details[0]) ? [] : [`PH-2 : « aucun fichier » rouge attendu (${r.v['PH-2']?.details[0]})`])] },
  ]

  for (const c of cas) {
    try {
      const d = dossierTravail(JUGE, RUN, 'cas', c.id)
      fs.cpSync(base, d, { recursive: true })
      const depot = path.join(d, 'depot')
      c.preparer(d, depot)
      const r = evaluer({ racineConfig: depot, racine: c.racine ? c.racine(d) : depot })
      const pb = c.attendu(r)
      const sortie = bas(Object.values(r.v).flatMap((x) => x.details).join('\n'))
      const imprimes = motifsDans(sortie, motifs0)
      if (imprimes.length) pb.push(`la sortie imprime en clair ${imprimes.length} motif(s) du suivi (lignes ${[...new Set(imprimes.map((m) => m.nom.ligne))].join(', ')})`)
      if (pb.length) echecs.push(`cas ${c.id} (${c.quoi}) : ${pb.join(' ; ')}`)
      else faits.push(c.id)
    } catch (e) { echecs.push(`cas ${c.id} (${c.quoi}) : interrompu : ${premiereLigne(e)}`) }
  }

  // Le lecteur de commits de PH-3, en lecture seule sur ce dépôt à la référence 1620723.
  try {
    const sha = revParse(REFERENCE_COMMIT)
    const moi = posix(path.relative(R, CE_FICHIER))
    const arbre = lsTree(R, sha)
    const pb = []
    if (arbre.has(moi)) pb.push(`${moi} existe déjà à ${REFERENCE_COMMIT} : le contrôle ne prouve plus rien`)
    const pkg = (blobGit(R, sha, 'package.json') || Buffer.alloc(0)).toString('utf8').split('\n').map((l) => l.trim()).find((l) => /^"name"\s*:/.test(l))
    const premiere = fs.readFileSync(CE_FICHIER, 'utf8').split('\n')[0].trim()
    if (!pkg || signes(pkg) < MIN_SIGNES) pb.push(`package.json sans ligne "name" à ${REFERENCE_COMMIT}`)
    if (!premiere.includes(JUGE)) pb.push('première ligne de ce fichier inattendue')
    if (!pb.length) {
      const faux = (texte, ligne) => ({ texte, forme: 'nom', nom: { nom: texte, ligne, signes: signes(texte) } })
      const mPkg = faux(pkg, 1), mMoi = faux(premiere, 2), mChemin = faux('package.json', 3), mMonChemin = faux(moi, 4)
      const h = chercherCommits(R, [sha], [mPkg, mMoi, mChemin, mMonChemin])
      const a = (chemin, dans, m) => h.trouvailles.some((t) => t.chemin === chemin && t.dans === dans && t.motifs.has(m))
      if (!a('package.json', 'contenu', mPkg)) pb.push('la ligne "name" de package.json n\'est pas vue dans le commit')
      if (!a('package.json', 'chemin', mChemin)) pb.push('le chemin package.json n\'est pas vu dans le commit')
      if (h.trouvailles.some((t) => t.motifs.has(mMoi))) pb.push('la première ligne de ce fichier est « vue » dans un commit qui ne le contient pas : l\'arbre de travail est lu')
      if (h.trouvailles.some((t) => t.dans === 'chemin' && t.motifs.has(mMonChemin))) pb.push(`le chemin ${moi} est « vu » dans un commit qui ne le contient pas`)
      if (h.chemins !== arbre.size) pb.push(`${h.chemins} chemins relus, ${arbre.size} dans l'arbre du commit`)
    }
    if (pb.length) echecs.push(`historique (${REFERENCE_COMMIT}) : ${pb.join(' ; ')}`)
    else faits.push('historique')
  } catch (e) { echecs.push(`historique (${REFERENCE_COMMIT}) : interrompu : ${premiereLigne(e)}`) }

  // La recherche de PH-2 sur une racine de dépôt (fichiers suivis, index, chemins), en lecture seule sur ce dépôt : elle voit la
  // ligne "name" de package.json et le chemin package.json, et ne voit pas un jeton aléatoire posé dans un fichier non suivi.
  try {
    const pb = []
    const ligneNom = (buf) => (buf || Buffer.alloc(0)).toString('utf8').split('\n').map((l) => l.trim()).find((l) => /^"name"\s*:/.test(l))
    const pkg = ligneNom(blobGit(R, '', 'package.json'))
    const jeton = `jeton-${crypto.randomUUID()}`
    const dJeton = dossierTravail(JUGE, RUN, 'non-suivi')
    const fJeton = path.join(dJeton, `${jeton}.txt`)
    fs.writeFileSync(fJeton, `${jeton}\n`)
    if (git(['ls-files', '--error-unmatch', '--', posix(path.relative(R, fJeton))], { cwd: R }).code === 0) pb.push('le fichier jeton est suivi : contrôle impossible')
    if (gitGrep(dJeton, [jeton], { noIndex: true }).length !== 1) pb.push('jeton invisible même en --no-index')
    if (!pkg) pb.push('package.json sans ligne "name" dans l\'index')
    if (!pb.length) {
      const faux = (texte, ligne) => ({ texte, forme: 'nom', nom: { nom: texte, ligne, signes: signes(texte) } })
      const mPkg = faux(pkg, 1), mJeton = faux(jeton, 2), mChemin = faux('package.json', 3)
      const a = chercherArbre(R, [mPkg, mJeton, mChemin], { depot: true })
      const t = a.trouvailles.find((x) => x.chemin === 'package.json' && x.dans === 'contenu')
      const dansTravail = ligneNom(lireOuNull(path.join(R, 'package.json'))) === pkg
      if (!t || !t.motifs.has(mPkg) || !t.ou.has('index') || (dansTravail && !t.ou.has('arbre de travail'))) pb.push(`la ligne "name" de package.json n'est pas vue (${t ? [...t.ou].join(', ') : 'aucune trouvaille'})`)
      if (!a.trouvailles.some((x) => x.chemin === 'package.json' && x.dans === 'chemin' && x.motifs.has(mChemin))) pb.push('le chemin package.json n\'est pas vu')
      if (a.trouvailles.some((x) => x.motifs.has(mJeton))) pb.push('un fichier non suivi est lu')
      if (!a.fichiers) pb.push('aucun fichier suivi compté')
    }
    fs.rmSync(dJeton, { recursive: true, force: true })
    if (pb.length) echecs.push(`dépôt Git (lecture seule) : ${pb.join(' ; ')}`)
    else faits.push('depot-git')
  } catch (e) { echecs.push(`dépôt Git (lecture seule) : interrompu : ${premiereLigne(e)}`) }

  return {
    ok: !echecs.length && faits.length === cas.length + 2,
    echecs,
    resume: `${faits.length} cas conformes : sept fuites vues avec leur ligne du suivi (exacte imbriquée, capitales accentuées, sans accents, chemin, slug, binaire, suivi windows-1252) ; UTF-16 avec BOM lu pareil ; suivis refusés (0 octet, sans colonne, guillemet non fermé, NUL, dossier) et configurations refusées (vault introuvable, sans clé, absente) ; suivi absent → « aucun suivi » ; arbre vide refusé ; sur ce dépôt en lecture seule, fichiers suivis et index lus sans les non-suivis, commits relus à ${REFERENCE_COMMIT} sans l'arbre de travail ; aucun nom imprimé`,
  }
}

// ── Principal ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const o = lireOptionsOuQuitter(process.argv.slice(2), {})
const refuser = (m) => { console.error(`✗ ${m}`); process.exit(2) }
if (o.reel) refuser('--reel n\'existe pas pour ce juge')
if (o.positionnels.length) refuser(`argument(s) inattendu(s) : ${o.positionnels.join(' ')}`)
if (o.temoin && !o.racineParDefaut) refuser('--temoin se lance sans --racine : le témoin apporte son faux dépôt et son faux vault')

const ecrit = () => fs.existsSync(DOSSIER_RUN) ? ` ; fichiers de travail : ${affiche(DOSSIER_RUN)} (effacés si tout est vert)` : ''
let code
if (!o.temoin) {
  const commits = estRacineGit(o.racine)
  const ids = ['PH-1', 'PH-2', ...(commits ? ['PH-3'] : [])]
  const s = creerSortie(JUGE, ids, { racine: o.racine })
  code = await s.executer(async () => {
    if (!commits) s.note(`${affiche(o.racine)} n'est pas la racine d'un dépôt Git : PH-2 lit tous ses fichiers (git grep --no-index) ; PH-3 (commits à pousser) sans objet`)
    const r = evaluer({ racineConfig: R, racine: o.racine, commits })
    s.note(`configuration du poste : ${affiche(path.join(R, ...CONFIG))}${ecrit()}`)
    reporter(s, r, ids)
  })
} else {
  const ids = ['PH-1', 'PH-2', 'PH-T']
  const s = creerSortie(JUGE, ids, { racine: TEMOIN, temoin: true })
  code = await s.executer(async () => {
    if (!fs.existsSync(path.join(TEMOIN, 'attendu.json'))) throw new Error(`jeu d'essai absent : ${affiche(TEMOIN)}/attendu.json`)
    const base = dossierTravail(JUGE, RUN, 'temoin')
    fs.cpSync(TEMOIN, base, { recursive: true })
    const attendu = lireJson(path.join(base, 'attendu.json'))
    const depot = path.join(base, 'depot')
    s.note(`jeu d'essai ${affiche(TEMOIN)} copié dans ${affiche(base)} : faux dépôt depot/, faux vault vault/${ecrit()}`)
    const r = evaluer({ racineConfig: depot, racine: depot })
    const ecarts = ecartsAttendu(r.lu, attendu)
    if (r.v['PH-1'].ok && !ecarts.length) s.passe('PH-1', `${r.v['PH-1'].details[0]} — conforme à attendu.json`)
    else { if (!r.v['PH-1'].ok) for (const d of r.v['PH-1'].details) s.echoue('PH-1', d); for (const e of ecarts) s.echoue('PH-1', e) }
    reporter(s, r, ['PH-2'])
    s.resultat('PH-T', temoinsNegatifs(base, attendu))
  })
}
if (code === 0) fs.rmSync(DOSSIER_RUN, { recursive: true, force: true })
